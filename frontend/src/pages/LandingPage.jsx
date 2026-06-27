import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import API from "../api";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, updateDeliveryLocation } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === "restaurant_owner") {
        navigate("/owner/dashboard");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await API.get("/api/categories/");
        setCategories(response.data.slice(0, 6)); // Display only 6 categories on landing page
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      updateDeliveryLocation(searchQuery.trim());
      navigate("/dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  const handleCuisineClick = (cuisineName) => {
    navigate(`/dashboard?category=${encodeURIComponent(cuisineName)}`);
  };

  const detectLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Reverse geocoding using open database or fallback
            const { latitude, longitude } = position.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await res.json();
            const locationName = data.address.city || data.address.state_district || data.address.state || "My Location";
            setSearchQuery(locationName);
          } catch (err) {
            setSearchQuery("New Delhi");
          } finally {
            setIsLocating(false);
          }
        },
        (error) => {
          console.error("Error detecting location", error);
          setSearchQuery("New Delhi");
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  return (
    <div className="bg-surface min-h-screen text-on-surface font-sans antialiased">
      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center pt-32 pb-20 overflow-hidden bg-gradient-to-b from-surface-container-lowest via-surface-container-lowest to-surface">
        {/* Subtle decorative background gradients */}
        <div className="absolute -left-20 top-20 w-96 h-96 bg-primary-orange/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute -right-20 bottom-20 w-[450px] h-[450px] bg-primary/5 rounded-full blur-3xl -z-10"></div>

        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            {/* Left Col */}
            <div className="lg:col-span-7 space-y-8 text-left">

              <h1 className="font-display text-4xl lg:text-7xl font-extrabold text-on-surface leading-[1.05] tracking-tight">
                Delicious food <br />
                <span className="text-primary-orange italic font-serif font-normal">delivered</span> <br />
                in real-time.
              </h1>
              
              <p className="text-secondary text-base lg:text-lg max-w-xl leading-relaxed font-light">
                QuickBite is a simple food ordering and delivery system with secure payments and live rider location tracking.
              </p>
              
              {/* Address Search Bar */}
              <form
                onSubmit={handleSearch}
                className="bg-white rounded-2xl md:rounded-full p-2 border border-outline-variant/35 shadow-lg max-w-xl flex flex-col md:flex-row items-stretch md:items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-primary-orange/20 focus-within:border-primary-orange group"
              >
                <div className="flex flex-1 items-center px-4 gap-3">
                  <span className="material-symbols-outlined text-primary-orange text-lg">location_on</span>
                  <input
                    type="text"
                    placeholder="Enter your location (e.g. Delhi, Noida)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm outline-none text-on-surface placeholder:text-secondary/40 font-light"
                  />
                  <button
                    type="button"
                    onClick={detectLocation}
                    className="p-1 hover:bg-surface-container rounded-full text-secondary hover:text-primary-orange transition-colors flex items-center justify-center cursor-pointer"
                    title="Detect Current Location"
                  >
                    <span className={`material-symbols-outlined text-base ${isLocating ? "animate-spin text-primary-orange" : ""}`}>
                      my_location
                    </span>
                  </button>
                </div>
                
                <button
                  type="submit"
                  className="bg-primary-orange hover:bg-primary text-white font-bold px-8 py-3.5 rounded-xl md:rounded-full transition-all active:scale-[0.97] text-xs uppercase tracking-wider whitespace-nowrap shadow-md cursor-pointer"
                >
                  Find Restaurants
                </button>
              </form>

              {/* Startup Metrics */}
              <div className="grid grid-cols-3 gap-6 pt-6 max-w-lg border-t border-outline-variant/15">
                <div>
                  <h4 className="text-2xl font-black text-on-surface font-display">&lt; 30m</h4>
                  <p className="text-[10px] text-secondary uppercase font-semibold tracking-wider mt-1">Average Delivery Time</p>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-on-surface font-display">100%</h4>
                  <p className="text-[10px] text-secondary uppercase font-semibold tracking-wider mt-1">WebSocket Live Map</p>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-on-surface font-display">Secured</h4>
                  <p className="text-[10px] text-secondary uppercase font-semibold tracking-wider mt-1">Razorpay Verified</p>
                </div>
              </div>
            </div>
            
            {/* Right Col (Visual Mockups) */}
            <div className="lg:col-span-5 relative w-full h-[450px] lg:h-[520px]">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-surface-container-low rounded-[3rem] -z-10 border border-outline-variant/15"></div>
              
              {/* Main Image */}
              <div className="absolute top-6 right-0 w-[85%] h-[60%] rounded-3xl overflow-hidden shadow-2xl z-20 border border-outline-variant/20 hover:scale-[1.02] transition-transform duration-500">
                <img
                  src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80"
                  alt="Premium Gourmet Pizza"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
                  <span className="text-xs font-bold text-white bg-primary-orange px-2.5 py-1 rounded-md uppercase tracking-wider">Trending Food</span>
                </div>
              </div>
              
              {/* Secondary Floating Card */}
              <div className="absolute bottom-6 left-0 w-[65%] h-[40%] rounded-3xl overflow-hidden shadow-xl z-30 border-8 border-surface-container-lowest hover:scale-[1.03] transition-transform duration-500">
                <img
                  src="https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=400&q=80"
                  alt="Artisanal Ice Cream"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Mini tech badges floating */}
              <div className="absolute top-1/2 left-4 bg-white/95 backdrop-blur-md border border-outline-variant/25 px-4 py-2.5 rounded-2xl shadow-lg z-40 flex items-center gap-2 hover:scale-105 transition-transform duration-300">
                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                <span className="text-[10px] font-bold text-on-surface tracking-wide">React 19 + Django REST</span>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Cuisines Section */}
      <section className="py-24 bg-white border-y border-outline-variant/15">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4 text-left">
            <div>
              <span className="text-primary-orange font-semibold text-xs uppercase tracking-widest mb-3 block">Top Selections</span>
              <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-on-surface">Browse Premium Categories</h2>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-on-surface hover:text-primary-orange transition-colors text-xs font-bold flex items-center gap-2 border-b border-on-surface/20 hover:border-primary-orange pb-1 uppercase tracking-wider cursor-pointer"
            >
              Explore All Menus <span className="material-symbols-outlined text-[18px]">arrow_right_alt</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
            {categories.map((cuisine) => (
              <button
                key={cuisine.id}
                onClick={() => handleCuisineClick(cuisine.name)}
                className="group flex flex-col items-center gap-4 text-center cursor-pointer"
              >
                <div className="w-full aspect-square rounded-full overflow-hidden bg-surface-container p-1 border border-outline-variant/15 group-hover:border-primary-orange group-hover:shadow-md transition-all duration-300">
                  <img
                    src={cuisine.image || "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=300&q=80"}
                    alt={cuisine.name}
                    className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <span className="text-xs font-extrabold text-secondary group-hover:text-primary-orange transition-colors uppercase tracking-wider">
                  {cuisine.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Application Features */}
      <section className="py-24 bg-surface-container-lowest">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-20 max-w-3xl mx-auto space-y-4">
            <span className="text-primary-orange font-bold text-xs uppercase tracking-widest block">Features</span>
            <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-on-surface">Key Features</h2>
            <p className="text-secondary text-sm font-light leading-relaxed">
              Below are the key features built into this application.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* System 1 */}
            <div className="p-8 bg-white rounded-3xl border border-outline-variant/15 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left group">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-primary-orange/10 rounded-2xl flex items-center justify-center text-primary-orange group-hover:bg-primary-orange group-hover:text-white transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">sync_alt</span>
                </div>
                <h3 className="font-display font-extrabold text-lg text-on-surface">Real-Time WebSockets</h3>
                <p className="text-secondary text-xs font-light leading-relaxed">
                  Powered by **Django Channels** and **ASGI server (Daphne)** for asynchronous client-server communication. Supports live rider GPS updates on Leaflet map during delivery.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-outline-variant/10 text-[10px] font-mono text-primary-orange uppercase tracking-wider font-semibold">
                Django Channels + Daphne
              </div>
            </div>

            {/* System 2 */}
            <div className="p-8 bg-white rounded-3xl border border-outline-variant/15 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left group">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-primary-orange/10 rounded-2xl flex items-center justify-center text-primary-orange group-hover:bg-primary-orange group-hover:text-white transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">shield</span>
                </div>
                <h3 className="font-display font-extrabold text-lg text-on-surface">Secure Payment Flows</h3>
                <p className="text-secondary text-xs font-light leading-relaxed">
                  Integrating **Razorpay API** SDK on the backend. Transactions are verified cryptographically using SHA256 signature validation before order finalization.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-outline-variant/10 text-[10px] font-mono text-primary-orange uppercase tracking-wider font-semibold">
                Razorpay Checkout SDK
              </div>
            </div>

            {/* System 3 */}
            <div className="p-8 bg-white rounded-3xl border border-outline-variant/15 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left group">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-primary-orange/10 rounded-2xl flex items-center justify-center text-primary-orange group-hover:bg-primary-orange group-hover:text-white transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                </div>
                <h3 className="font-display font-extrabold text-lg text-on-surface">PDF Invoice Generator</h3>
                <p className="text-secondary text-xs font-light leading-relaxed">
                  Constructs commercial invoices dynamically on order completion using Python's **ReportLab** library. Generates clean styling, layout, and exact cost calculations.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-outline-variant/10 text-[10px] font-mono text-primary-orange uppercase tracking-wider font-semibold">
                Python ReportLab Engine
              </div>
            </div>

            {/* System 4 */}
            <div className="p-8 bg-white rounded-3xl border border-outline-variant/15 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left group">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-primary-orange/10 rounded-2xl flex items-center justify-center text-primary-orange group-hover:bg-primary-orange group-hover:text-white transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                </div>
                <h3 className="font-display font-extrabold text-lg text-on-surface">CDN Storage Integration</h3>
                <p className="text-secondary text-xs font-light leading-relaxed">
                  Allows restaurant owners to upload banner images and menu photos. Images are uploaded asynchronously via multi-part data formats and stored securely on **Cloudinary CDN**.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-outline-variant/10 text-[10px] font-mono text-primary-orange uppercase tracking-wider font-semibold">
                Cloudinary CDN Storage
              </div>
            </div>

            {/* System 5 */}
            <div className="p-8 bg-white rounded-3xl border border-outline-variant/15 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left group">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-primary-orange/10 rounded-2xl flex items-center justify-center text-primary-orange group-hover:bg-primary-orange group-hover:text-white transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">key</span>
                </div>
                <h3 className="font-display font-extrabold text-lg text-on-surface">JWT Authentication</h3>
                <p className="text-secondary text-xs font-light leading-relaxed">
                  Stateless secure access using **SimpleJWT** with automated token refreshing. Verification codes (OTP) are emailed via Django's core mail module for high security.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-outline-variant/10 text-[10px] font-mono text-primary-orange uppercase tracking-wider font-semibold">
                OAuth2 / JWT / Email SMTP
              </div>
            </div>

            {/* System 6 */}
            <div className="p-8 bg-white rounded-3xl border border-outline-variant/15 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left group">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-primary-orange/10 rounded-2xl flex items-center justify-center text-primary-orange group-hover:bg-primary-orange group-hover:text-white transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">map</span>
                </div>
                <h3 className="font-display font-extrabold text-lg text-on-surface">Leaflet GPS Maps</h3>
                <p className="text-secondary text-xs font-light leading-relaxed">
                  Interactive UI components built with **React Leaflet**. Features a live Rider Location Simulator that transmits updates to simulate active shipping states.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-outline-variant/10 text-[10px] font-mono text-primary-orange uppercase tracking-wider font-semibold">
                React Leaflet + Websockets
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Bento Portal Options */}
      <section className="py-24 bg-surface border-t border-outline-variant/15 relative">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16 max-w-2xl mx-auto space-y-4">
            <span className="text-primary-orange font-bold text-xs uppercase tracking-widest block">Role-Based Gateways</span>
            <h2 className="font-display text-3xl font-extrabold text-on-surface">Dedicated Interfaces</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Customer portal */}
            <div className="p-8 bg-surface-container-low rounded-3xl border border-outline-variant/15 subtle-shadow hover:-translate-y-1 transition-all text-left flex flex-col justify-between h-64">
              <div>
                <span className="material-symbols-outlined text-primary-orange text-3xl mb-4">local_mall</span>
                <h3 className="font-display font-extrabold text-base text-on-surface mb-2">Customer Dashboard</h3>
                <p className="text-secondary text-xs font-light leading-relaxed">
                  Browse menus, manage your basket, pay securely, and monitor your delivery rider's live route on an interactive map.
                </p>
              </div>
              <button
                onClick={() => navigate("/register")}
                className="text-primary-orange hover:text-primary text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 pt-4 border-t border-outline-variant/10 mt-4 cursor-pointer"
              >
                Sign Up as Customer <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
              </button>
            </div>
            
            {/* Restaurant Owner portal */}
            <div className="p-8 bg-surface-container-low rounded-3xl border border-outline-variant/15 subtle-shadow hover:-translate-y-1 transition-all text-left flex flex-col justify-between h-64">
              <div>
                <span className="material-symbols-outlined text-primary-orange text-3xl mb-4">storefront</span>
                <h3 className="font-display font-extrabold text-base text-on-surface mb-2">Restaurant Dashboard</h3>
                <p className="text-secondary text-xs font-light leading-relaxed">
                  Register kitchens, upload dish images, edit pricing, manage order queues, and hand off dishes to available delivery riders.
                </p>
              </div>
              <button
                onClick={() => navigate("/register")}
                className="text-primary-orange hover:text-primary text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 pt-4 border-t border-outline-variant/10 mt-4 cursor-pointer"
              >
                Become a Partner <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
              </button>
            </div>
            
            {/* Rider portal */}
            <div className="p-8 bg-surface-container-low rounded-3xl border border-outline-variant/15 subtle-shadow hover:-translate-y-1 transition-all text-left flex flex-col justify-between h-64">
              <div>
                <span className="material-symbols-outlined text-primary-orange text-3xl mb-4">motorcycle</span>
                <h3 className="font-display font-extrabold text-base text-on-surface mb-2">Rider Dashboard</h3>
                <p className="text-secondary text-xs font-light leading-relaxed">
                  Accept active delivery jobs, simulate active GPS routes, transmit real-time location packets to customers and restaurant owners.
                </p>
              </div>
              <button
                onClick={() => navigate("/register")}
                className="text-primary-orange hover:text-primary text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 pt-4 border-t border-outline-variant/10 mt-4 cursor-pointer"
              >
                Join as a Rider <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
