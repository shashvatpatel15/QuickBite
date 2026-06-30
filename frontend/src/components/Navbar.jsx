import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import API from "../api";

const Navbar = () => {
  const { user, logout, deliveryLocation, updateDeliveryLocation } = useContext(AuthContext);
  const { cartCount } = useContext(CartContext);
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  // Location Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressSearch, setAddressSearch] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Autocomplete Suggestions states
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  // Popular locations
  const popularLocations = [
    { label: "Noida - 201301", city: "Noida" },
    { label: "Delhi - 110001", city: "Delhi" },
    { label: "Gurgaon - 122001", city: "Gurgaon" },
    { label: "Mumbai - 400001", city: "Mumbai" },
    { label: "Bangalore - 560001", city: "Bangalore" },
  ];

  // Scroll handler for floating navbar styling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch saved addresses from backend when drawer opens
  useEffect(() => {
    if (isDrawerOpen && user && user.role === "customer") {
      const fetchAddresses = async () => {
        try {
          const response = await API.get("/api/customer/addresses/");
          setSavedAddresses(response.data);
        } catch (error) {
          console.error("Failed to fetch saved addresses:", error);
        }
      };
      fetchAddresses();
    }
  }, [isDrawerOpen, user]);

  // Autocomplete Suggestion Fetch using Photon (Free & Keyless) with Debounce
  useEffect(() => {
    if (!addressSearch.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSuggestionLoading(true);
      try {
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(addressSearch.trim())}&limit=5`
        );
        const data = await response.json();
        
        const formatted = (data.features || []).map((f) => {
          const { name, city, postcode, state } = f.properties;
          const labelParts = [];
          if (name) labelParts.push(name);
          if (city && city !== name) labelParts.push(city);
          if (state) labelParts.push(state);
          if (postcode) labelParts.push(postcode);
          
          return {
            label: labelParts.join(", "),
            city: city || name || "",
            pincode: postcode || ""
          };
        });

        setSuggestions(formatted);
      } catch (err) {
        console.error("Photon autocomplete suggestions fetch failed:", err);
      } finally {
        setSuggestionLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [addressSearch]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Real GPS Geolocation + Reverse Geocoding with OpenStreetMap Nominatim API
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setGpsLoading(true);

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
          setIsDrawerOpen(false);
          navigate("/dashboard");
        } catch (err) {
          console.error("Nominatim Reverse Geocoding failed:", err);
          // Fallback
          updateDeliveryLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setIsDrawerOpen(false);
          navigate("/dashboard");
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        console.error("GPS Geolocation error:", error);
        alert("Unable to detect GPS position. Please select an area manually.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSelectLocation = (loc) => {
    updateDeliveryLocation(loc);
    setIsDrawerOpen(false);
    navigate("/dashboard");
  };

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-40 transition-all duration-300 px-3 sm:px-6 lg:px-16 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm py-4"
            : "bg-transparent py-6"
        }`}
      >
        <div className="container mx-auto max-w-6xl flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-6 min-w-0">
            <Link
              to={user ? (user.role === "restaurant_owner" ? "/owner/dashboard" : user.role === "delivery_partner" ? "/delivery/dashboard" : "/dashboard") : "/"}
              className="font-display text-xl sm:text-2xl font-extrabold text-primary tracking-tight flex-shrink-0"
            >
              QuickBite
            </Link>
            
            {/* Pincode / Location Selector */}
            {user && user.role === "customer" && (
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="flex items-center gap-1 border-l border-outline-variant/35 pl-2 sm:pl-6 text-xs h-6 hover:text-primary transition-colors cursor-pointer text-left focus:outline-none min-w-0"
              >
                <span className="material-symbols-outlined text-primary text-base font-semibold flex-shrink-0">location_on</span>
                <span className="font-bold text-on-surface line-clamp-1 max-w-[70px] sm:max-w-[150px] truncate">
                  {deliveryLocation || "Select Location..."}
                </span>
                <span className="material-symbols-outlined text-secondary text-xs flex-shrink-0">expand_more</span>
              </button>
            )}
            
            {user && (
              <div className="hidden md:flex gap-8 items-center font-sans text-sm font-medium text-secondary">
                {user.role === "customer" ? (
                  <>
                    <Link to="/dashboard" className="hover:text-primary transition-colors">
                      Browse Restaurants
                    </Link>
                    <Link to="/orders" className="hover:text-primary transition-colors">
                      Order History
                    </Link>
                  </>
                ) : user.role === "delivery_partner" ? (
                  <>
                    <Link to="/delivery/dashboard" className="hover:text-primary transition-colors">
                      Rider Dashboard
                    </Link>
                    <span className="px-3 py-1 bg-tertiary/10 text-tertiary text-xs font-semibold rounded-full uppercase tracking-wider">
                      Delivery Partner
                    </span>
                  </>
                ) : (
                  <>
                    <Link to="/owner/dashboard" className="hover:text-primary transition-colors">
                      My Restaurants
                    </Link>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full uppercase tracking-wider">
                      Restaurant Dashboard
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-6">
                {user.role === "customer" && (
                  <Link
                    to="/cart"
                    className="relative p-2 text-on-surface hover:text-primary transition-colors flex items-center"
                  >
                    <span className="material-symbols-outlined text-2xl">shopping_bag</span>
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary-orange text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                )}
                
                {/* Desktop profile and logout */}
                <div className="hidden md:flex items-center gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    Hi, {user.email.split("@")[0]}
                  </span>
                  
                  <button
                    onClick={handleLogout}
                    className="px-5 py-2 bg-on-surface text-white hover:bg-primary transition-all text-xs font-semibold rounded-full hover:shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    title="Log Out"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    <span>Log Out</span>
                  </button>
                </div>

                {/* Mobile hamburger menu trigger */}
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden p-2 text-on-surface hover:text-primary transition-colors flex items-center cursor-pointer"
                  title="Menu"
                >
                  <span className="material-symbols-outlined text-2xl">menu</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4">
                <Link
                  to="/login"
                  className="text-xs sm:text-sm font-semibold text-on-surface hover:text-primary transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 sm:px-6 sm:py-2.5 bg-on-surface text-white rounded-full text-xs sm:text-sm font-medium transition-all hover:bg-primary hover:shadow-md active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Location Drawer Slide-over Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex overflow-hidden">
          {/* Backdrop with transition effect */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
          ></div>

          {/* Drawer Panel Container */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-50 animate-[slideIn_0.3s_ease-out]">
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">location_on</span>
                <h3 className="font-display font-extrabold text-base text-on-surface">Select Delivery Location</h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 hover:bg-surface-container rounded-full text-secondary hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
              {/* Search Pincode / Area */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                  Search Location or Pincode
                </label>
                <div className="flex items-center bg-surface-container rounded-2xl px-4 py-1.5 border border-outline-variant/15 focus-within:border-primary-orange transition-all">
                  <span className="material-symbols-outlined text-secondary text-lg">search</span>
                  <input
                    type="text"
                    placeholder="Enter pincode, city, or area..."
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    className="w-full bg-transparent border-none py-2 px-3 focus:ring-0 text-sm outline-none text-on-surface"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && addressSearch.trim()) {
                        handleSelectLocation(addressSearch.trim());
                      }
                    }}
                  />
                  {addressSearch && (
                    <button
                      onClick={() => setAddressSearch("")}
                      className="p-1 text-secondary hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>

                {/* Suggestions Autocomplete List */}
                {suggestionLoading && (
                  <div className="flex items-center gap-2 p-3 text-xs text-secondary">
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    Searching addresses...
                  </div>
                )}

                {!suggestionLoading && suggestions.length > 0 && (
                  <div className="space-y-1 max-h-64 overflow-y-auto mt-2 border border-outline-variant/15 rounded-2xl p-2 bg-surface">
                    {suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectLocation(sug.label)}
                        className="w-full flex items-start gap-2.5 p-2.5 hover:bg-surface-container rounded-xl text-left transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-secondary mt-0.5 text-base">location_on</span>
                        <span className="text-xs font-semibold text-on-surface line-clamp-2 leading-relaxed">
                          {sug.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* GPS button */}
              <button
                onClick={handleUseCurrentLocation}
                disabled={gpsLoading}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-on-surface text-white hover:bg-primary-orange disabled:bg-secondary rounded-2xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-md cursor-pointer"
              >
                {gpsLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Locating via GPS...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">my_location</span>
                    Use Current Location (GPS)
                  </>
                )}
              </button>

              {/* Saved Addresses list */}
              {user && user.role === "customer" && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">home_pin</span>
                    Saved Addresses
                  </h4>
                  {savedAddresses.length === 0 ? (
                    <p className="text-xs text-secondary/60 font-light italic pl-1">
                      No saved addresses. You can add one during checkout.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {savedAddresses.map((addr) => {
                        const icon =
                          addr.address_type === "home"
                            ? "home"
                            : addr.address_type === "work"
                            ? "work"
                            : "location_on";
                        const displayString = `${addr.house_no ? addr.house_no + ', ' : ''}${addr.address_line_1}, ${addr.city} - ${addr.pincode}`;
                        return (
                          <button
                            key={addr.id}
                            onClick={() => handleSelectLocation(displayString)}
                            className="w-full flex items-start gap-3 p-3.5 bg-surface hover:bg-surface-container rounded-2xl border border-outline-variant/10 text-left transition-all active:scale-[0.98] cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-secondary mt-0.5 text-lg">{icon}</span>
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold uppercase tracking-wider text-on-surface">
                                {addr.address_type}
                              </div>
                              <p className="text-xs text-secondary font-light line-clamp-2 leading-relaxed">
                                {displayString}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Popular Area Grid */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs">explore</span>
                  Popular Areas
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {popularLocations.map((loc) => (
                    <button
                      key={loc.label}
                      onClick={() => handleSelectLocation(loc.label)}
                      className="flex items-center gap-2 p-3 bg-surface hover:bg-surface-container border border-outline-variant/10 rounded-xl text-left transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-primary text-sm">location_city</span>
                      <span className="text-xs font-bold text-on-surface">{loc.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Drawer Slide-over Overlay */}
      {isMobileMenuOpen && user && (
        <div className="fixed inset-0 z-50 flex overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
          ></div>

          {/* Drawer Panel Container (Slides in from right) */}
          <div className="absolute right-0 top-0 w-full max-w-xs bg-white h-full shadow-2xl flex flex-col z-50 animate-[slideInRight_0.3s_ease-out]">
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-orange">person</span>
                <span className="font-display font-extrabold text-sm text-on-surface truncate max-w-[150px]">
                  Hi, {user.email.split("@")[0]}
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 hover:bg-surface-container rounded-full text-secondary hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Navigation Links based on role */}
              <div className="flex flex-col gap-4 font-sans text-sm font-medium text-secondary">
                {user.role === "customer" ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 bg-surface hover:bg-surface-container rounded-xl text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-primary">storefront</span>
                      Browse Restaurants
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 bg-surface hover:bg-surface-container rounded-xl text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-primary">receipt_long</span>
                      Order History
                    </Link>
                    <Link
                      to="/cart"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 bg-surface hover:bg-surface-container rounded-xl text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-primary">shopping_bag</span>
                      My Cart
                    </Link>
                  </>
                ) : user.role === "restaurant_owner" ? (
                  <>
                    <Link
                      to="/owner/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 bg-surface hover:bg-surface-container rounded-xl text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-primary">storefront</span>
                      My Restaurants
                    </Link>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full uppercase tracking-wider text-center block">
                      Restaurant Dashboard
                    </span>
                  </>
                ) : (
                  <>
                    <Link
                      to="/delivery/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 bg-surface hover:bg-surface-container rounded-xl text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-primary">motorcycle</span>
                      Rider Dashboard
                    </Link>
                    <span className="px-3 py-1 bg-tertiary/10 text-tertiary text-xs font-semibold rounded-full uppercase tracking-wider text-center block">
                      Delivery Partner
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Logout Button in Footer of Drawer */}
            <div className="p-6 border-t border-outline-variant/20">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-error text-white hover:bg-error-container hover:text-on-error-container rounded-2xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
