import { useEffect, useState, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api";
import DishCard from "../components/DishCard";
import { CartContext } from "../context/CartContext";

const RestaurantMenu = () => {
  const { restaurantId } = useParams();
  const { cartCount, cartSubtotal, clearCart, addToCart } = useContext(CartContext);
  
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Cart adding error overlay
  const [cartError, setCartError] = useState("");
  
  // Cart conflict replace states
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const [replacing, setReplacing] = useState(false);

  // Filter and Pagination States
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [foodTypeFilter, setFoodTypeFilter] = useState("All"); // All, Veg, Non-Veg
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const [categoriesLookup, setCategoriesLookup] = useState([]);
  const [foodTypesLookup, setFoodTypesLookup] = useState([]);
  const [availableCategories, setAvailableCategories] = useState(["All"]);

  // Fetch static lookup data and available categories for this restaurant on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch restaurant details
        const resResponse = await API.get(`/api/restaurants/${restaurantId}/`);
        setRestaurant(resResponse.data);

        // Fetch lookups and full menu once to extract categories
        const [catRes, ftRes, menuFullRes] = await Promise.all([
          API.get("/api/categories/"),
          API.get("/api/food-types/"),
          API.get(`/api/restaurants/${restaurantId}/menu/`, { params: { page_size: 100 } }).catch(() => ({ data: { results: [] } }))
        ]);

        setCategoriesLookup(catRes.data || []);
        setFoodTypesLookup(ftRes.data || []);

        const rawItems = menuFullRes.data.results || [];
        const uniqueCats = ["All", ...new Set(rawItems.map((item) => getDisplayValue(item.category)).filter(Boolean))];
        setAvailableCategories(uniqueCats);
        setError(null);
      } catch (err) {
        console.error("Failed to load initial restaurant details:", err);
        setError("Could not load restaurant menu details.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [restaurantId]);

  // Fetch paginated menu items dynamically
  useEffect(() => {
    const fetchMenu = async () => {
      // Don't show global full screen spinner when paging, but set loading if it's initial
      try {
        let categoryId = "";
        if (selectedCategory !== "All") {
          const match = categoriesLookup.find((c) => c.name === selectedCategory);
          if (match) categoryId = match.id;
        }

        let foodTypeId = "";
        if (foodTypeFilter !== "All") {
          const match = foodTypesLookup.find(
            (f) =>
              f.name.toLowerCase() === foodTypeFilter.toLowerCase() ||
              (foodTypeFilter === "Veg" && f.name.toLowerCase() === "veg") ||
              (foodTypeFilter === "Non-Veg" && f.name.toLowerCase() === "non-veg")
          );
          if (match) foodTypeId = match.id;
        }

        const params = {
          page,
          page_size: pageSize,
          ordering: sortBy,
        };
        if (categoryId) params.category = categoryId;
        if (foodTypeId) params.food_type = foodTypeId;
        if (searchQuery) params.search = searchQuery;

        const menuResponse = await API.get(`/api/restaurants/${restaurantId}/menu/`, { params });
        setMenuItems(menuResponse.data.results || []);
        setTotalCount(menuResponse.data.count || 0);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch menu items:", err);
        setError("Could not load menu items.");
      }
    };

    if (categoriesLookup.length > 0 && foodTypesLookup.length > 0) {
      fetchMenu();
    }
  }, [page, pageSize, selectedCategory, foodTypeFilter, searchQuery, sortBy, categoriesLookup, foodTypesLookup, restaurantId]);

  // Reset page to 1 on filter/search change
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, foodTypeFilter, searchQuery, sortBy]);

  const getDisplayValue = (value) => {
    if (value && typeof value === "object") {
      return value.name || String(value.id || "");
    }
    return String(value || "");
  };

  // Pre-computed categories
  const categories = availableCategories;

  // Items are already filtered on server
  const filteredItems = menuItems;

  const handleAddToCartError = (msg, itemDetails) => {
    if (msg.toLowerCase().includes("one restaurant")) {
      setPendingItem(itemDetails);
      setShowConflictModal(true);
    } else {
      setCartError(msg);
      setTimeout(() => {
        setCartError("");
      }, 4000);
    }
  };

  const handleConfirmReplace = async () => {
    if (!pendingItem) return;
    setReplacing(true);
    try {
      await clearCart();
      const result = await addToCart(pendingItem.id, 1);
      if (result.success) {
        setCartError(`Cart replaced! Added ${pendingItem.name}.`);
        setTimeout(() => setCartError(""), 3000);
      } else {
        setCartError(result.error);
        setTimeout(() => setCartError(""), 4000);
      }
    } catch (err) {
      console.error(err);
      setCartError("Failed to replace cart.");
      setTimeout(() => setCartError(""), 4000);
    } finally {
      setReplacing(false);
      setShowConflictModal(false);
      setPendingItem(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-secondary text-sm mt-4">Loading menu...</span>
        </div>
        <Link
          to="/dashboard"
          className="px-5 py-2.5 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-secondary hover:text-on-surface text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
        >
          Cancel & Exit
        </Link>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center px-6">
        <span className="material-symbols-outlined text-4xl text-error mb-4">error</span>
        <p className="text-on-surface font-semibold text-center">{error || "Restaurant not found."}</p>
        <Link
          to="/dashboard"
          className="mt-6 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider"
        >
          Back to Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pt-32 pb-32 relative">
      {/* Toast Cart Error */}
      {cartError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-4 bg-error text-white text-xs font-bold rounded-2xl shadow-2xl border border-white/10 animate-bounce max-w-sm text-center">
          {cartError}
        </div>
      )}

      {/* Cart Conflict Modal */}
      {showConflictModal && pendingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* Backdrop */}
          <div
            onClick={() => !replacing && setShowConflictModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          ></div>
          
          {/* Modal box */}
          <div className="relative bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-outline-variant/20 z-10 space-y-6 text-center animate-[slideIn_0.2s_ease-out]">
            <div className="w-16 h-16 bg-primary-orange/10 text-primary-orange rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">shopping_cart_checkout</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-lg text-on-surface">Replace cart items?</h3>
              <p className="text-secondary text-xs font-light leading-relaxed">
                Your cart contains dishes from another restaurant. Would you like to discard those dishes and start a fresh order from <strong>{restaurant?.name}</strong>?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                disabled={replacing}
                onClick={() => setShowConflictModal(false)}
                className="flex-1 py-3 border border-outline-variant/30 text-secondary hover:bg-surface-container rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                No
              </button>
              <button
                disabled={replacing}
                onClick={handleConfirmReplace}
                className="flex-1 py-3 bg-primary-orange text-white hover:bg-primary rounded-xl text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {replacing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Replacing...
                  </>
                ) : (
                  "Yes, Discard & Add"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant Header banner */}
      <div className="container mx-auto px-6 max-w-6xl mb-12">
        <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-3xl p-8 shadow-xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary-orange/5 rounded-full blur-2xl"></div>
          
          {/* Restaurant Image */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-surface-container flex-shrink-0">
            <img
              src={restaurant.image || "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80"}
              alt={restaurant.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Restaurant Info */}
          <div className="space-y-4 text-center md:text-left flex-grow">
            <div className="space-y-2">
              <h1 className="font-display text-2xl lg:text-3xl font-extrabold text-on-surface">{restaurant.name}</h1>
              <p className="text-secondary text-sm font-light leading-relaxed max-w-xl">
                {restaurant.description || "Indulge in our exquisite gourmet menu prepared by master culinary craftsmen."}
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-y-2 gap-x-6 text-xs text-secondary font-medium">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                {restaurant.address}, {restaurant.city}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">call</span>
                {restaurant.phone_number}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Menu items section */}
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel: category filters */}
          <aside className="lg:col-span-3 space-y-6">
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-secondary mb-4">Categories</h2>
              <div className="flex flex-wrap lg:flex-col gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-3 rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between border ${
                      selectedCategory === cat
                        ? "bg-primary text-on-primary border-primary shadow-sm"
                        : "bg-white text-secondary border-outline-variant/15 hover:bg-surface-container-low"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="material-symbols-outlined text-[16px] opacity-75">chevron_right</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Food Type Toggles */}
            <div className="pt-6 border-t border-outline-variant/10">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-secondary mb-4">Dietary Preference</h2>
              <div className="grid grid-cols-3 gap-2 bg-surface-container p-1 rounded-xl">
                {["All", "Veg", "Non-Veg"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFoodTypeFilter(type)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      foodTypeFilter === type
                        ? "bg-white text-on-surface shadow-sm"
                        : "text-secondary hover:text-on-surface"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Right panel: dishes list */}
          <main className="lg:col-span-9 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/15">
              <h2 className="font-display text-lg font-bold text-on-surface">
                {selectedCategory} Items ({totalCount})
              </h2>
              
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Menu Search Box */}
                <div className="flex items-center bg-surface-container rounded-xl px-3 py-1 border border-outline-variant/15 focus-within:border-primary-orange transition-all text-xs w-full sm:max-w-xs">
                  <span className="material-symbols-outlined text-secondary text-base">search</span>
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none py-1.5 px-2 focus:ring-0 outline-none text-on-surface"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-secondary hover:text-on-surface">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center bg-surface-container rounded-xl px-3 py-1.5 border border-outline-variant/15 focus-within:border-primary-orange text-xs w-full sm:w-auto">
                  <span className="material-symbols-outlined text-secondary text-sm mr-1">sort</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent border-none py-0.5 px-1 focus:ring-0 text-xs outline-none text-on-surface font-semibold cursor-pointer"
                  >
                    <option value="name">Name: A to Z</option>
                    <option value="-name">Name: Z to A</option>
                    <option value="price">Price: Low to High</option>
                    <option value="-price">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>
            
            {filteredItems.length === 0 ? (
              <div className="text-center py-20 bg-white border border-outline-variant/15 rounded-3xl p-8">
                <span className="material-symbols-outlined text-4xl text-secondary/40 mb-4">lunch_dining</span>
                <p className="text-on-surface font-semibold">No dishes available matching your preference.</p>
                <p className="text-secondary text-xs mt-2 font-light">Try picking a different category or dietary preference.</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredItems.map((dish) => (
                    <DishCard
                      key={dish.id}
                      dish={dish}
                      onAddToCartError={handleAddToCartError}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {Math.ceil(totalCount / pageSize) > 1 && (
                  <div className="flex justify-center items-center gap-4 bg-white p-3 rounded-2xl border border-outline-variant/10 shadow-xs max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                      className="p-1.5 bg-surface hover:bg-surface-container rounded-xl text-secondary hover:text-on-surface disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
                    >
                      <span className="material-symbols-outlined text-base">chevron_left</span>
                    </button>
                    <span className="text-xs font-bold text-on-surface">
                      Page {page} of {Math.ceil(totalCount / pageSize)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.min(prev + 1, Math.ceil(totalCount / pageSize)))}
                      disabled={page === Math.ceil(totalCount / pageSize)}
                      className="p-1.5 bg-surface hover:bg-surface-container rounded-xl text-secondary hover:text-on-surface disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
                    >
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>

        </div>
      </div>

      {/* Floating Cart checkout preview bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-6 max-w-lg mx-auto">
          <Link
            to="/cart"
            className="flex justify-between items-center bg-on-surface text-white px-8 py-5 rounded-2xl shadow-2xl hover:bg-primary transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Gourmet Basket</p>
                <p className="text-sm font-bold mt-0.5">{cartCount} items • ₹{cartSubtotal.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 font-bold text-sm uppercase tracking-wider">
              View Cart
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </div>
          </Link>
        </div>
      )}

    </div>
  );
};

export default RestaurantMenu;


