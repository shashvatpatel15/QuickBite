import React, { useEffect, useState, useContext } from "react";
import { useSearchParams, Link } from "react-router-dom";
import API from "../api";
import RestaurantCard from "../components/RestaurantCard";
import { AuthContext } from "../context/AuthContext";

const CustomerDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { deliveryLocation, updateDeliveryLocation } = useContext(AuthContext);
  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [vegOnly, setVegOnly] = useState(false);
  const [ratingAboveFour, setRatingAboveFour] = useState(false);
  const [hasOffersFilter, setHasOffersFilter] = useState(false);
  const [costBracket, setCostBracket] = useState(""); // "", "under300", "300to500", "above500"
  const [sortBy, setSortBy] = useState("relevance"); // "relevance", "rating", "costAsc", "costDesc", "deliveryTime"

  const [localLocInput, setLocalLocInput] = useState("");
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [bypassLocation, setBypassLocation] = useState(false);

  const handleSetLocation = () => {
    if (localLocInput.trim()) {
      updateDeliveryLocation(localLocInput.trim());
      setBypassLocation(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`,
            {
              headers: {
                "User-Agent": "QuickBiteFoodOrderingApp/1.0"
              }
            }
          );
          const data = await response.json();
          const addr = data.address || {};

          // Build a precise location string using the most specific fields available
          const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || "";
          const city = addr.city || addr.state_district || addr.town || addr.county || "";
          const postcode = addr.postcode || "";

          let locationString = "";
          if (area && city && area !== city) {
            locationString = `${area}, ${city}`;
          } else if (city) {
            locationString = city;
          } else if (area) {
            locationString = area;
          } else {
            locationString = "Unknown Location";
          }
          if (postcode) locationString += ` - ${postcode}`;

          updateDeliveryLocation(locationString);
          setBypassLocation(false);
        } catch (err) {
          console.error(err);
          updateDeliveryLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setBypassLocation(false);
        } finally {
          setDetectingLoc(false);
        }
      },
      (error) => {
        console.error(error);
        alert("Unable to detect GPS position. Please enter location manually.");
        setDetectingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resResponse, catResponse, ordersResponse] = await Promise.all([
          API.get("/api/restaurants/"),
          API.get("/api/categories/"),
          API.get("/api/orders/").catch(() => ({ data: [] }))
        ]);

        const active = (ordersResponse.data || []).filter(
          (o) => o.status !== "delivered" && o.status !== "cancelled"
        );
        setActiveOrders(active);

        // Inject simulated premium fields to mimic Swiggy/Zomato dynamic data
        const processed = resResponse.data.map((res) => {
          // Dynamic yet deterministic variables based on name / ID
          const rating = ((res.id * 7) % 9) * 0.1 + 4.0; // 4.0 to 4.8
          const deliveryTime = ((res.id * 13) % 6) * 5 + 20; // 20 to 45 mins
          const averageCost = ((res.id * 3) % 5) * 100 + 200; // 200 to 600
          const isVeg = (res.id % 3) === 0 || res.name.toLowerCase().includes("veg");
          const hasOffer = (res.id % 4) !== 0; // 75% of restaurants have offers
          const offers = hasOffer
            ? res.id % 2 === 0
              ? "50% OFF up to ₹100"
              : res.id % 3 === 0
                ? "Buy 1 Get 1 Free"
                : "Free Delivery on orders above ₹199"
            : null;

          return {
            ...res,
            rating: parseFloat(rating.toFixed(1)),
            deliveryTime,
            averageCost,
            isVeg,
            offers,
          };
        });

        setRestaurants(processed);
        setCategories(catResponse.data);
        setError(null);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError("Could not load restaurants list.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);


  // Sync state variables back to SearchParams for URL sharing
  useEffect(() => {
    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (selectedCategory) params.category = selectedCategory;
    setSearchParams(params);
  }, [searchQuery, selectedCategory]);

  // Handle category chip toggle
  const handleCategoryToggle = (categoryName) => {
    if (selectedCategory === categoryName) {
      setSelectedCategory("");
    } else {
      setSelectedCategory(categoryName);
    }
  };

  // Filter restaurants locally
  const filteredRestaurants = restaurants.filter((restaurant) => {
    // 1. Keyword search (Name, Description, City)
    const matchesSearch = searchQuery
      ? (restaurant.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (restaurant.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (restaurant.city || "").toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    // 2. Swiggy/Zomato style Pincode/Location matching
    const matchesLocation = (() => {
      if (bypassLocation) return true;
      if (!deliveryLocation) return true;

      const locClean = deliveryLocation.toLowerCase().trim();
      const resAddress = (restaurant.address || "").toLowerCase();
      const resCity = (restaurant.city || "").toLowerCase();

      // 1. Try to extract Indian pincodes (6-digit numbers)
      const pincodeRegex = /\b\d{6}\b/;
      const locPincodeMatch = locClean.match(pincodeRegex);
      if (locPincodeMatch) {
        const pincode = locPincodeMatch[0];
        if (resAddress.includes(pincode)) return true;
      }

      // 2. Direct inclusion checks
      if (resAddress.includes(locClean) || locClean.includes(resAddress)) return true;
      if (resCity.includes(locClean) || locClean.includes(resCity)) return true;

      // 3. Keyword matching: check if any significant token matches
      // Split by spaces, commas, hyphens, etc. and remove generic terms
      const tokens = locClean
        .split(/[\s,.-]+/)
        .filter((t) => t.length > 2 && !["india", "pradesh", "uttar", "delhi", "noida"].includes(t));

      if (tokens.length > 0 && tokens.some((token) => resCity.includes(token) || resAddress.includes(token))) {
        return true;
      }

      // Fallback: check city directly
      if (locClean.includes(resCity) || resCity.includes(locClean)) return true;

      return false;
    })();

    // 3. Category/Cuisine Carousel Selection
    // Since backend does not return menu categories in the restaurant object directly,
    // we match category filter against the restaurant's name, description, or cuisine list.
    const matchesCategory = selectedCategory
      ? (restaurant.description || "").toLowerCase().includes(selectedCategory.toLowerCase()) ||
      (restaurant.name || "").toLowerCase().includes(selectedCategory.toLowerCase())
      : true;

    // 4. Veg Only
    const matchesVeg = vegOnly ? restaurant.isVeg : true;

    // 5. Rating 4.0+
    const matchesRating = ratingAboveFour ? restaurant.rating >= 4.4 : true;

    // 6. Offers Filter
    const matchesOffers = hasOffersFilter ? restaurant.offers !== null : true;

    // 7. Cost Bracket Filter
    let matchesCost = true;
    if (costBracket === "under300") {
      matchesCost = restaurant.averageCost <= 300;
    } else if (costBracket === "300to500") {
      matchesCost = restaurant.averageCost > 300 && restaurant.averageCost <= 500;
    } else if (costBracket === "above500") {
      matchesCost = restaurant.averageCost > 500;
    }

    return matchesSearch && matchesLocation && matchesCategory && matchesVeg && matchesRating && matchesOffers && matchesCost;
  });

  // Sort filtered restaurants
  const sortedRestaurants = [...filteredRestaurants].sort((a, b) => {
    if (sortBy === "rating") {
      return b.rating - a.rating;
    }
    if (sortBy === "costAsc") {
      return a.averageCost - b.averageCost;
    }
    if (sortBy === "costDesc") {
      return b.averageCost - a.averageCost;
    }
    if (sortBy === "deliveryTime") {
      return a.deliveryTime - b.deliveryTime;
    }
    return 0; // Default: Relevance (from DB)
  });

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setVegOnly(false);
    setRatingAboveFour(false);
    setHasOffersFilter(false);
    setCostBracket("");
    setSortBy("relevance");
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (vegOnly) count++;
    if (ratingAboveFour) count++;
    if (hasOffersFilter) count++;
    if (costBracket) count++;
    if (sortBy !== "relevance") count++;
    return count;
  };

  return (
    <div className="min-h-screen bg-surface pt-24 sm:pt-32 pb-20 sm:pb-24 px-2 sm:px-6 lg:px-16 overflow-x-hidden md:overflow-x-auto">
      <div className="container mx-auto max-w-6xl space-y-6 sm:space-y-10">

        {/* Dynamic Location Selection/Bypass Banner */}
        {!deliveryLocation && !bypassLocation ? (
          <div className="bg-surface-container-low border border-outline-variant/15 rounded-3xl p-6 shadow-sm space-y-4 max-w-2xl animate-[slideIn_0.3s_ease-out]">
            <div className="flex items-center gap-3 text-left">
              <span className="material-symbols-outlined text-primary-orange text-2xl">explore</span>
              <div>
                <h3 className="font-display font-extrabold text-sm text-on-surface">Set your delivery address</h3>
                <p className="text-secondary text-[11px] font-light mt-0.5">Please provide your location to see kitchens delivering to you.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingLoc}
                className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 transition-all flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[15px]">{detectingLoc ? "sync" : "my_location"}</span>
                {detectingLoc ? "Detecting..." : "Detect Location"}
              </button>
              <div className="flex-grow flex border border-outline-variant/30 rounded-xl overflow-hidden bg-white focus-within:ring-1 focus-within:ring-primary-orange/50">
                <input
                  type="text"
                  placeholder="Or enter city/pincode (e.g. Noida, Delhi)..."
                  value={localLocInput}
                  onChange={(e) => setLocalLocInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSetLocation()}
                  className="flex-grow bg-transparent px-3 text-xs outline-none text-on-surface placeholder:text-secondary/40 font-light"
                />
                <button
                  type="button"
                  onClick={handleSetLocation}
                  className="px-5 bg-primary-orange text-white text-xs font-bold hover:bg-primary transition-colors cursor-pointer"
                >
                  Set
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBypassLocation(true)}
              className="text-primary-orange text-xs font-bold hover:underline cursor-pointer bg-transparent border-none p-0 self-start flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              Skip, browse all restaurants
            </button>
          </div>
        ) : (
          /* Filter banner when location is set */
          <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-xs animate-[fadeIn_0.3s_ease-out]">
            <div className="flex items-center gap-2 text-left">
              <span className="material-symbols-outlined text-primary text-base">location_on</span>
              <span className="text-secondary font-medium">
                {bypassLocation ? (
                  <>Showing all restaurants.{deliveryLocation && <> <button type="button" onClick={() => setBypassLocation(false)} className="text-primary-orange font-extrabold hover:underline cursor-pointer bg-transparent border-none p-0 inline">Filter by location ({deliveryLocation})</button></>}</>
                ) : (
                  <>Showing restaurants delivering to <strong className="text-on-surface font-extrabold">{deliveryLocation}</strong>. <button type="button" onClick={() => setBypassLocation(true)} className="text-primary-orange font-extrabold hover:underline cursor-pointer bg-transparent border-none p-0 inline">See all restaurants</button></>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Active Order Live Tracker Banner */}
        {activeOrders.length > 0 && (
          <div className="bg-primary-orange text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row justify-between items-center gap-4 animate-[slideIn_0.3s_ease-out]">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
                <span className="material-symbols-outlined text-white text-2xl font-bold">motorcycle</span>
              </div>
              <div>
                <h3 className="font-display font-extrabold text-xs uppercase tracking-wider">Active Order in Progress</h3>
                <p className="text-xs font-light mt-1">
                  Your order from <strong>{activeOrders[0].restaurant_name}</strong> is currently <strong>{activeOrders[0].status?.replace(/_/g, " ")}</strong>.
                </p>
              </div>
            </div>
            <Link
              to={`/track-order/${activeOrders[0].id}`}
              className="px-6 py-3 bg-white text-primary-orange hover:bg-surface-container-low transition-all font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm font-bold animate-pulse">radar</span>
              Track Live on Map
            </Link>
          </div>
        )}

        {/* What's on your mind? Cuisine Circular Carousel */}
        <div className="space-y-4">
          <h2 className="font-display text-xl lg:text-2xl font-extrabold text-on-surface tracking-tight">
            What's on your mind?
          </h2>
          <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x">
            {categories.map((cuisine) => {
              const isActive = selectedCategory === cuisine.name;
              return (
                <button
                  key={cuisine.id}
                  onClick={() => handleCategoryToggle(cuisine.name)}
                  className="group flex flex-col items-center gap-2 text-center snap-start flex-shrink-0 cursor-pointer"
                >
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden p-1 border-2 transition-all duration-300 ${isActive
                        ? "border-primary-orange shadow-md scale-105"
                        : "border-outline-variant/15 group-hover:border-primary-orange/50"
                      }`}
                  >
                    <img
                      src={cuisine.image || "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=300&q=80"}
                      alt={cuisine.name}
                      className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <span
                    className={`text-xs font-bold transition-colors ${isActive ? "text-primary-orange font-extrabold" : "text-secondary group-hover:text-on-surface"
                      }`}
                  >
                    {cuisine.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <hr className="border-outline-variant/15" />

        {/* Swiggy/Zomato style Filtering & Sorting Controls Panel */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="font-display text-xl lg:text-2xl font-extrabold text-on-surface tracking-tight">
              {deliveryLocation ? `Kitchens delivering to "${deliveryLocation}"` : "All Premium Kitchens"}
              <span className="text-secondary text-sm font-normal ml-3">
                ({sortedRestaurants.length} options)
              </span>
            </h2>

            {/* Search Input Box */}
            <div className="flex items-center bg-surface-container rounded-2xl px-4 py-1 border border-outline-variant/15 focus-within:border-primary-orange transition-all w-full md:max-w-xs">
              <span className="material-symbols-outlined text-secondary text-base">search</span>
              <input
                type="text"
                placeholder="Search restaurants or cuisines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none py-2 px-2.5 focus:ring-0 text-xs outline-none text-on-surface"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-secondary hover:text-on-surface">
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto whitespace-nowrap scrollbar-none snap-x pb-2 sm:pb-0 sm:flex-wrap bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-outline-variant/10 shadow-xs">
            {/* Sort Dropdown */}
            <div className="flex-shrink-0 snap-start flex items-center bg-surface-container rounded-2xl px-3 py-1.5 border border-outline-variant/15 focus-within:border-primary-orange">
              <span className="material-symbols-outlined text-secondary text-sm mr-1">sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none py-0.5 px-1 focus:ring-0 text-xs outline-none text-on-surface font-semibold cursor-pointer"
              >
                <option value="relevance">Relevance</option>
                <option value="rating">Rating: High to Low</option>
                <option value="costAsc">Cost: Low to High</option>
                <option value="costDesc">Cost: High to Low</option>
                <option value="deliveryTime">Delivery Time: Fastest</option>
              </select>
            </div>

            {/* Veg Only Toggle */}
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex-shrink-0 snap-start flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${vegOnly
                  ? "bg-tertiary/10 border-tertiary text-tertiary font-extrabold"
                  : "bg-surface border-outline-variant/15 text-secondary hover:bg-surface-container"
                }`}
            >
              <span className="w-3 h-3 flex items-center justify-center border border-tertiary rounded-xs">
                <span className="w-1.5 h-1.5 bg-tertiary rounded-full"></span>
              </span>
              Veg Only
            </button>

            {/* Rating 4.0+ Toggle */}
            <button
              onClick={() => setRatingAboveFour(!ratingAboveFour)}
              className={`flex-shrink-0 snap-start px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${ratingAboveFour
                  ? "bg-primary-orange/10 border-primary-orange text-primary-orange font-extrabold"
                  : "bg-surface border-outline-variant/15 text-secondary hover:bg-surface-container"
                }`}
            >
              Rating 4.4+
            </button>

            {/* Offers Toggle */}
            <button
              onClick={() => setHasOffersFilter(!hasOffersFilter)}
              className={`flex-shrink-0 snap-start px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${hasOffersFilter
                  ? "bg-primary-orange/10 border-primary-orange text-primary-orange font-extrabold"
                  : "bg-surface border-outline-variant/15 text-secondary hover:bg-surface-container"
                }`}
            >
              Offers
            </button>

            {/* Cost Bracket Toggle */}
            <div className="flex-shrink-0 snap-start flex bg-surface-container rounded-full p-0.5 border border-outline-variant/15">
              <button
                onClick={() => setCostBracket(costBracket === "under300" ? "" : "under300")}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${costBracket === "under300" ? "bg-on-surface text-white" : "text-secondary hover:text-on-surface"
                  }`}
              >
                &lt; ₹300
              </button>
              <button
                onClick={() => setCostBracket(costBracket === "300to500" ? "" : "300to500")}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${costBracket === "300to500" ? "bg-on-surface text-white" : "text-secondary hover:text-on-surface"
                  }`}
              >
                ₹300 - 500
              </button>
              <button
                onClick={() => setCostBracket(costBracket === "above500" ? "" : "above500")}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${costBracket === "above500" ? "bg-on-surface text-white" : "text-secondary hover:text-on-surface"
                  }`}
              >
                ₹500+
              </button>
            </div>

            {/* Clear All Button */}
            {getActiveFilterCount() > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex-shrink-0 snap-start sm:ml-auto px-4 py-2 border border-error/20 hover:bg-error/5 text-error rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                Clear ({getActiveFilterCount()})
              </button>
            )}
          </div>
        </div>

        {/* Loading & Error States */}
        {loading ? (
          <div className="flex flex-col items-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-secondary text-sm">Searching for kitchens...</span>
          </div>
        ) : error ? (
          <div className="text-center py-24 bg-white border border-outline-variant/15 rounded-3xl p-8 shadow-xs">
            <span className="material-symbols-outlined text-4xl text-error mb-4">error</span>
            <p className="text-on-surface font-semibold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : sortedRestaurants.length === 0 ? (
          <div className="text-center py-24 bg-white border border-outline-variant/15 rounded-3xl p-8 shadow-xs">
            <span className="material-symbols-outlined text-4xl text-secondary/40 mb-4">search_off</span>
            <p className="text-on-surface font-semibold text-lg">No kitchens match your preferences.</p>
            <p className="text-secondary text-xs mt-2 font-light">
              Try adjusting your filters or changing your delivery location.
            </p>
            <button
              onClick={clearAllFilters}
              className="mt-6 px-6 py-2.5 bg-on-surface text-white hover:bg-primary rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Restaurants Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default CustomerDashboard;
