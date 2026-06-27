import React from "react";
import { Link } from "react-router-dom";

const RestaurantCard = ({ restaurant }) => {
  const { id, name, description, image, city, is_open, rating, deliveryTime, averageCost, isVeg, offers } = restaurant;

  // Use a fallback gourmet food image if no image is uploaded
  const imageUrl = image || "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80";

  return (
    <Link
      to={`/restaurant/${id}`}
      className="group bg-surface-container-lowest rounded-2xl overflow-hidden subtle-shadow border border-outline-variant/20 hover-lift flex flex-row sm:flex-col h-auto sm:h-full cursor-pointer p-3 sm:p-0 gap-4 sm:gap-0"
    >
      {/* Aspect Ratio Image Container */}
      <div className="relative w-28 h-28 sm:w-full sm:h-auto sm:aspect-[4/3] img-zoom-container bg-surface-container rounded-xl sm:rounded-none overflow-hidden flex-shrink-0">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover img-zoom"
          loading="lazy"
        />
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
          <span
            className={`px-2 py-0.5 sm:px-3 sm:py-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider rounded-full ${
              is_open
                ? "bg-tertiary-container text-on-tertiary-container border border-tertiary/20"
                : "bg-error-container text-on-error-container border border-error/20"
            }`}
          >
            {is_open ? "Open" : "Closed"}
          </span>
        </div>

        {/* Swiggy-style discount overlay banner (Desktop only) */}
        {offers && (
          <div className="hidden sm:block absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-10 z-10">
            <span className="text-white font-display font-extrabold text-sm tracking-tight uppercase block">
              {offers}
            </span>
          </div>
        )}
      </div>

      {/* Details Container */}
      <div className="p-1 sm:p-5 flex flex-col flex-grow justify-between min-w-0 gap-2 sm:gap-4">
        <div className="space-y-1 sm:space-y-1.5">
          {/* Mobile offers label */}
          {offers && (
            <span className="sm:hidden text-primary-orange font-bold text-[10px] uppercase tracking-wider block">
              {offers}
            </span>
          )}

          <h3 className="font-display font-bold text-sm sm:text-base text-on-surface group-hover:text-primary transition-colors line-clamp-1">
            {name}
          </h3>
          
          {/* Rating, Delivery time, Cost row */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-secondary font-medium">
            <span className="flex items-center gap-0.5 bg-tertiary text-white px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold">
              <span className="material-symbols-outlined text-[9px] sm:text-[10px] font-semibold fill-current">star</span>
              {rating || "4.2"}
            </span>
            <span className="text-secondary/35">•</span>
            <span className="text-on-surface font-semibold">{deliveryTime || "25"} mins</span>
            <span className="text-secondary/35">•</span>
            <span className="text-secondary font-semibold">₹{averageCost || "300"} for two</span>
          </div>

          <p className="text-secondary text-[11px] sm:text-xs leading-relaxed font-light line-clamp-2 pt-0.5 sm:pt-1">
            {description || "Experience unique chef-curated culinary masterpieces crafted for delivery excellence."}
          </p>
        </div>

        {/* Location & Veg Dot / View Menu Button */}
        <div className="pt-2 sm:pt-3 border-t border-outline-variant/10 flex items-center justify-between text-[11px] sm:text-xs text-secondary font-semibold min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Veg indicator badge */}
            <span className={`w-3 h-3 sm:w-3.5 sm:h-3.5 border flex items-center justify-center rounded-xs flex-shrink-0 ${isVeg ? "border-tertiary" : "border-error"}`}>
              <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isVeg ? "bg-tertiary" : "bg-error"}`}></span>
            </span>
            <span className="flex items-center gap-0.5 truncate">
              <span className="material-symbols-outlined text-[13px] sm:text-[15px] text-primary flex-shrink-0">location_on</span>
              {city}
            </span>
          </div>
          <span className="text-primary font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform flex-shrink-0">
            View Menu
            <span className="material-symbols-outlined text-[12px] sm:text-[14px]">arrow_forward</span>
          </span>
        </div>
      </div>
    </Link>
  );
};

export default RestaurantCard;
