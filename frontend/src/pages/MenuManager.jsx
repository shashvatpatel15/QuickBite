import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api";

const MenuManager = () => {
  const { restaurantId } = useParams();
  
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Forms states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // holds dish object if editing
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    food_type: "",
    image: null,
    existingImage: null,
  });

  const [categories, setCategories] = useState([]);
  const [foodTypes, setFoodTypes] = useState([]);

  const getLookupName = (value, lookup) => {
    if (!lookup || lookup.length === 0) return String(value || "");
    if (value && typeof value === "object") {
      return value.name || lookup.find((item) => item.id === value.id)?.name || "";
    }

    return lookup.find((item) => String(item.id) === String(value))?.name || String(value || "");
  };

  const getLookupId = (value, lookup) => {
    if (!lookup || lookup.length === 0) return 1;
    if (value && typeof value === "object") {
      return value.id || lookup.find((item) => item.name.toLowerCase() === String(value.name || "").toLowerCase())?.id || 1;
    }

    return lookup.find((item) => item.name.toLowerCase() === String(value || "").toLowerCase())?.id || Number(value) || 1;
  };

  const fetchMenuData = async () => {
    setLoading(true);
    try {
      // Restaurant details
      const resResponse = await API.get(`/api/restaurants/${restaurantId}/`);
      setRestaurant(resResponse.data);

      // Owner menu items
      const menuResponse = await API.get(`/api/menu/owner/restaurants/${restaurantId}/`);
      setMenuItems(menuResponse.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch menu items:", err);
      setError("Could not load restaurant menu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
    
    // Fetch categories and food types dynamically
    const fetchLookups = async () => {
      try {
        const [catResponse, ftResponse] = await Promise.all([
          API.get("/api/categories/"),
          API.get("/api/food-types/")
        ]);
        setCategories(catResponse.data);
        setFoodTypes(ftResponse.data);
        
        // Initialize default category and food type in form
        if (catResponse.data.length > 0 && ftResponse.data.length > 0) {
          setFormData((prev) => ({
            ...prev,
            category: String(catResponse.data[0].id),
            food_type: String(ftResponse.data[0].id),
          }));
        }
      } catch (err) {
        console.error("Failed to fetch categories or food types:", err);
      }
    };
    fetchLookups();
  }, [restaurantId]);

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category: categories.length > 0 ? String(categories[0].id) : "",
      food_type: foodTypes.length > 0 ? String(foodTypes[0].id) : "",
      image: null,
      existingImage: null,
    });
    setShowAddForm(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenEdit = (item) => {
    const cat = getLookupId(item.category, categories);
    const ft = getLookupId(item.food_type, foodTypes);
    
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      category: String(cat),
      food_type: String(ft),
      image: null,
      existingImage: item.image,
    });
    setEditingItem(item);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingItem(null);
    setFormError("");
    setFormData({
      name: "",
      description: "",
      price: "",
      category: categories.length > 0 ? String(categories[0].id) : "",
      food_type: foodTypes.length > 0 ? String(foodTypes[0].id) : "",
      image: null,
      existingImage: null,
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const { name, price, category, food_type, description, image } = formData;
    if (!name || !price || !category || !food_type) {
      setFormError("Please fill in all required fields.");
      return;
    }

    const data = new FormData();
    data.append("name", name);
    data.append("description", description || "");
    data.append("price", parseFloat(price));
    data.append("category", parseInt(category));
    data.append("food_type", parseInt(food_type));
    
    // Handle image: send new file if uploaded, or clear if deleted (and was existing)
    if (image) {
      data.append("image", image);
    } else if (editingItem && !formData.existingImage) {
      // User explicitly cleared the existing image
      data.append("image", "");
    }

    try {
      if (editingItem) {
        // Edit dish
        await API.patch(`/api/menu/owner/restaurants/${restaurantId}/${editingItem.id}/`, data);
      } else {
        // Create new dish
        await API.post(`/api/menu/owner/restaurants/${restaurantId}/`, data);
      }
      handleCloseForm();
      fetchMenuData();
    } catch (err) {
      console.error(err);
      setFormError("Failed to save menu dish. Please check database inputs.");
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await API.patch(`/api/menu/owner/restaurants/${restaurantId}/${item.id}/`, {
        is_available: !item.is_available,
      });
      // Toggle locally first
      setMenuItems((prev) =>
        prev.map((m) =>
          m.id === item.id ? { ...m, is_available: !m.is_available } : m
        )
      );
    } catch (err) {
      console.error("Failed to toggle availability:", err);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this menu dish?")) return;
    try {
      await API.delete(`/api/menu/owner/restaurants/${restaurantId}/${itemId}/`);
      setMenuItems((prev) => prev.filter((m) => m.id !== itemId));
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  if (loading && menuItems.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-secondary text-sm mt-4">Loading menu manager...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pt-32 pb-24 px-6">
      <div className="container mx-auto max-w-5xl space-y-8">
        
        {/* Title Block */}
        <div className="flex justify-between items-center pb-4 border-b border-outline-variant/10">
          <div>
            <Link
              to="/owner/dashboard"
              className="text-xs font-bold uppercase tracking-wider text-primary-orange hover:underline flex items-center gap-1 mb-2"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Partner Dashboard
            </Link>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold text-on-surface">
              {restaurant?.name} — Menu Manager
            </h1>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-6 py-3 bg-primary-orange text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:bg-primary transition-all flex items-center gap-1 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Dish
          </button>
        </div>

        {error && (
          <div className="p-4 bg-error-container text-error rounded-xl text-xs font-semibold border border-error/10">
            {error}
          </div>
        )}

        {/* Add / Edit Dish Form Modal */}
        {showAddForm && (
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-8 shadow-xl space-y-6 max-w-2xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-outline-variant/10">
              <h2 className="font-display text-lg font-bold text-on-surface">
                {editingItem ? "Edit Dish Details" : "Add New Menu Dish"}
              </h2>
              <button
                onClick={handleCloseForm}
                className="text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {formError && (
              <div className="p-4 bg-error-container text-error rounded-xl text-xs font-semibold border border-error/10">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Dish Name*</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Classic Margherita"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Price (₹)*</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    placeholder="12.99"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Category*</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Dietary Preference*</label>
                  <select
                    name="food_type"
                    value={formData.food_type}
                    onChange={handleChange}
                    required
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                  >
                    {foodTypes.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Dish Image</label>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <label className="flex flex-col items-center justify-center w-full sm:w-1/2 h-28 border-2 border-dashed border-outline-variant/35 hover:border-primary-orange/50 rounded-2xl cursor-pointer bg-surface-container hover:bg-surface-container-high transition-colors">
                    <div className="flex flex-col items-center justify-center pt-4 pb-4">
                      <span className="material-symbols-outlined text-secondary text-2xl mb-1">upload_file</span>
                      <p className="text-[11px] text-secondary font-medium">Click to upload image</p>
                      <p className="text-[9px] text-secondary/70">PNG, JPG, WEBP up to 5MB</p>
                    </div>
                    <input
                      type="file"
                      name="image"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setFormData({ ...formData, image: e.target.files[0] });
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  
                  {(formData.image || formData.existingImage) && (
                    <div className="w-28 h-28 bg-surface-container rounded-2xl overflow-hidden relative border border-outline-variant/20 shadow-sm flex-shrink-0 animate-fade-in">
                      <img
                        src={formData.image ? URL.createObjectURL(formData.image) : formData.existingImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: null, existingImage: null })}
                        className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Description</label>
                <textarea
                  name="description"
                  placeholder="Tell customers about this dish's ingredients, size, prep notes..."
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-5 py-2.5 border border-outline-variant/30 text-secondary hover:bg-surface-container rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-white hover:opacity-90 rounded-xl text-xs font-bold"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Menu list */}
        {menuItems.length === 0 ? (
          <div className="text-center py-20 bg-white border border-outline-variant/15 rounded-3xl p-8 space-y-4">
            <span className="material-symbols-outlined text-5xl text-secondary/30">lunch_dining</span>
            <p className="text-on-surface font-semibold text-lg">No dishes in menu yet</p>
            <p className="text-secondary text-sm font-light max-w-sm mx-auto">
              Add delicious gourmet dishes to your menu so customers can browse and order from your kitchen!
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-8 py-3.5 bg-primary-orange text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:bg-primary transition-all"
            >
              Add First Dish
            </button>
          </div>
        ) : (
          /* Dish management grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {menuItems.map((item) => {
              const categoryName = getLookupName(item.category, categories);
              const foodTypeName = getLookupName(item.food_type, foodTypes);
              const foodTypeKey = foodTypeName.toLowerCase();

              return (
                <div
                  key={item.id}
                  className="bg-white border border-outline-variant/15 rounded-3xl p-6 shadow-sm flex items-center justify-between gap-6 hover:shadow-md transition-shadow duration-300"
                >
                {/* Dish Image */}
                <div className="w-20 h-20 bg-surface-container rounded-xl overflow-hidden flex-shrink-0 border border-outline-variant/10">
                  <img
                    src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80"}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-grow space-y-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider rounded ${
                        foodTypeKey === "veg"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {foodTypeName}
                    </span>
                    <span className="text-[9px] font-bold text-secondary uppercase tracking-widest bg-surface-container px-2 py-0.5 rounded">
                      {categoryName}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-sm text-on-surface line-clamp-1">{item.name}</h3>
                    <p className="text-secondary text-xs font-light line-clamp-2 mt-1 leading-relaxed">{item.description || "Gourmet dish."}</p>
                  </div>

                  <div className="font-display font-bold text-sm text-primary">
                    ₹{parseFloat(item.price).toFixed(2)}
                  </div>
                </div>

                {/* Steppers / Controls */}
                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                  {/* Availability toggle switch */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                      {item.is_available ? "In Stock" : "Sold Out"}
                    </span>
                    <input
                      type="checkbox"
                      checked={item.is_available}
                      onChange={() => handleToggleAvailability(item)}
                      className="rounded text-primary-orange focus:ring-primary-orange h-4 w-4"
                    />
                  </label>
                  
                  {/* Edit/Delete Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 border border-outline-variant/30 hover:bg-surface-container rounded-lg text-secondary hover:text-on-surface transition-colors"
                      title="Edit Dish"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 border border-error/20 hover:bg-error-container rounded-lg text-error transition-colors"
                      title="Delete Dish"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default MenuManager;


