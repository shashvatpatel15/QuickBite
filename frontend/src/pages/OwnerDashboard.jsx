import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

const OwnerDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Create Restaurant modal state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "",
    phone_number: "",
    address: "",
    city: "",
    image: null,
  });

  const handleCloseForm = () => {
    setShowAddForm(false);
    setFormData({
      name: "",
      description: "",
      email: "",
      phone_number: "",
      address: "",
      city: "",
      image: null,
    });
    setFormError("");
    setSubmitting(false);
  };

  const fetchMyRestaurants = async () => {
    setLoading(true);
    try {
      const response = await API.get("/api/restaurants/my-restaurants/");
      setRestaurants(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load owner restaurants:", err);
      setError("Could not load your restaurants list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRestaurants();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const { name, email, phone_number, address, city, description, image } = formData;
    if (!name || !email || !phone_number || !address || !city) {
      setFormError("Please fill in all required fields.");
      setSubmitting(false);
      return;
    }

    const data = new FormData();
    data.append("name", name);
    data.append("email", email);
    data.append("phone_number", phone_number);
    data.append("address", address);
    data.append("city", city);
    data.append("description", description);
    if (image) {
      data.append("image", image);
    }

    const submitData = async (latitude = null, longitude = null) => {
      if (latitude !== null) {
        data.append("latitude", latitude);
      }
      if (longitude !== null) {
        data.append("longitude", longitude);
      }
      try {
        await API.post("/api/restaurants/", data);
        handleCloseForm();
        fetchMyRestaurants();
      } catch (err) {
        console.error(err);
        const msg = err.response?.data?.email?.[0] || err.response?.data?.phone_number?.[0] || "Failed to create restaurant.";
        setFormError(msg);
        setSubmitting(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude ? parseFloat(position.coords.latitude.toFixed(6)) : null;
          const lng = position.coords.longitude ? parseFloat(position.coords.longitude.toFixed(6)) : null;
          submitData(lat, lng);
        },
        (error) => {
          console.error("Error getting location: ", error);
          submitData();
        },
        { timeout: 5000 }
      );
    } else {
      submitData();
    }
  };

  return (
    <div className="min-h-screen bg-surface pt-32 pb-24 px-6">
      <div className="container mx-auto max-w-5xl space-y-8">
        
        {/* Title and Controls */}
        <div className="flex justify-between items-center pb-4 border-b border-outline-variant/10">
          <div>
            <span className="text-primary font-semibold text-xs uppercase tracking-widest block">Restaurant Partner Portal</span>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold text-on-surface mt-1">My Restaurants</h1>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-primary-orange text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:bg-primary transition-all flex items-center gap-1 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Register Restaurant
          </button>
        </div>

        {error && (
          <div className="p-4 bg-error-container text-error rounded-xl text-xs font-semibold border border-error/10">
            {error}
          </div>
        )}

        {/* Create Restaurant Modal Form */}
        {showAddForm && (
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-8 shadow-xl space-y-6 max-w-2xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-outline-variant/10">
              <h2 className="font-display text-lg font-bold text-on-surface">Register New Restaurant</h2>
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
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Restaurant Name*</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Gourmet Kitchen"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Business Email*</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="contact@gourmet.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Phone Number*</label>
                  <input
                    type="text"
                    name="phone_number"
                    placeholder="+15559876543"
                    value={formData.phone_number}
                    onChange={handleChange}
                    required
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">City*</label>
                  <input
                    type="text"
                    name="city"
                    placeholder="Noida"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Restaurant Banner Image</label>
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
                  
                  {formData.image && (
                    <div className="w-28 h-28 bg-surface-container rounded-2xl overflow-hidden relative border border-outline-variant/20 shadow-sm flex-shrink-0 animate-fade-in">
                      <img
                        src={URL.createObjectURL(formData.image)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: null })}
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
                  placeholder="Tell customers about your kitchen's unique flavors..."
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                ></textarea>
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Full Address*</label>
                <input
                  type="text"
                  name="address"
                  placeholder="Plot 12, Sector 62"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={submitting}
                  className="px-5 py-2.5 border border-outline-variant/30 text-secondary hover:bg-surface-container rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-primary text-white hover:opacity-90 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Restaurant"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading / List */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-secondary text-sm">Loading your restaurants...</span>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-20 bg-white border border-outline-variant/15 rounded-3xl p-8 space-y-4">
            <span className="material-symbols-outlined text-5xl text-secondary/30">storefront</span>
            <p className="text-on-surface font-semibold text-lg">No restaurants registered yet</p>
            <p className="text-secondary text-sm font-light max-w-sm mx-auto">
              Register your first kitchen to start adding menu dishes and accepting incoming customer orders.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-8 py-3.5 bg-primary-orange text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:bg-primary transition-all"
            >
              Get Started
            </button>
          </div>
        ) : (
          /* Restaurants List */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {restaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="bg-white border border-outline-variant/15 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-300 gap-6"
              >
                <div className="flex gap-4">
                  {/* Small restaurant thumbnail */}
                  <div className="w-20 h-20 bg-surface-container rounded-xl overflow-hidden flex-shrink-0">
                    <img
                      src={restaurant.image || "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=300&q=80"}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Meta details */}
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-base text-on-surface line-clamp-1">{restaurant.name}</h3>
                    <p className="text-secondary text-xs font-light line-clamp-2 leading-relaxed">{restaurant.description || "Gourmet food kitchen."}</p>
                    <p className="text-[10px] text-secondary font-medium uppercase tracking-wider">{restaurant.city}</p>
                  </div>
                </div>

                {/* Dashboard Operations Links */}
                <div className="grid grid-cols-2 gap-4 border-t border-outline-variant/10 pt-4">
                  <Link
                    to={`/owner/restaurant/${restaurant.id}/menu`}
                    className="flex items-center justify-center gap-2 py-3 border border-outline-variant/20 hover:bg-surface-container rounded-xl text-xs font-bold text-secondary transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">menu_book</span>
                    Edit Menu
                  </Link>
                  <Link
                    to={`/owner/restaurant/${restaurant.id}/orders`}
                    className="flex items-center justify-center gap-2 py-3 bg-on-surface text-white hover:bg-primary rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">list_alt</span>
                    Manage Orders
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default OwnerDashboard;
