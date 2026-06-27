import React, { useContext, useState } from "react";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";

const DishCard = ({ dish, onAddToCartError }) => {
  const { user } = useContext(AuthContext);
  const { cartItems, addToCart, updateQuantity } = useContext(CartContext);
  const [adding, setAdding] = useState(false);

  const { id, name, description, price, image, category, food_type, is_available } = dish;

  // Find if this dish is in the cart
  const cartItem = cartItems.find((item) => item.menu === id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAdd = async () => {
    if (!user) {
      onAddToCartError("Please login to add items to your cart.");
      return;
    }
    if (user.role !== "customer") {
      onAddToCartError("Only customers can add items to their cart.");
      return;
    }
    setAdding(true);
    const result = await addToCart(id, 1);
    if (!result.success) {
      onAddToCartError(result.error, { id, name, price });
    }
    setAdding(false);
  };

  const handleIncrement = () => {
    updateQuantity(cartItem.id, quantity + 1);
  };

  const handleDecrement = () => {
    updateQuantity(cartItem.id, quantity - 1);
  };

  const foodTypeName = food_type && typeof food_type === "object" ? food_type.name || String(food_type.id || "") : String(food_type || "");
  const categoryName = category && typeof category === "object" ? category.name || String(category.id || "") : String(category || "");
  const isVeg = foodTypeName.toLowerCase() === "veg";

  // Fallback image
  const imageUrl = image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80";

  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl subtle-shadow border border-outline-variant/10 flex items-center justify-between gap-6 hover:shadow-md transition-all duration-300">
      
      {/* Left Column: Details */}
      <div className="flex-grow space-y-4 max-w-[70%]">
        <div className="flex items-center gap-3">
          {/* Veg/Non-Veg Badge */}
          {foodTypeName && (
            <span
              className={`w-5 h-5 flex items-center justify-center border-2 rounded ${
                isVeg ? "border-green-600" : "border-red-600"
              }`}
              title={foodTypeName}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isVeg ? "bg-green-600" : "bg-red-600"
                }`}
              ></span>
            </span>
          )}
          {categoryName && (
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest bg-surface-container-low px-2 py-0.5 rounded">
              {categoryName}
            </span>
          )}
        </div>

        <div>
          <h3 className="font-display font-bold text-base text-on-surface line-clamp-1">{name}</h3>
          <p className="text-secondary text-xs leading-relaxed font-light line-clamp-2 mt-1">
            {description || "A delicious gourmet dish curated by our master chefs using fresh, premium ingredients."}
          </p>
        </div>

        <div className="font-display font-bold text-base text-primary">
          ₹{parseFloat(price).toFixed(2)}
        </div>
      </div>

      {/* Right Column: Image and Add Button */}
      <div className="relative flex-shrink-0 w-28 h-28 bg-surface-container rounded-xl overflow-visible">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover rounded-xl"
          loading="lazy"
        />
        
        {/* Absolute add buttons */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[80%] z-10">
          {quantity > 0 ? (
            <div className="bg-white text-primary border border-outline-variant/40 rounded-lg flex items-center justify-between py-1 px-3 shadow-md font-bold text-sm">
              <button
                onClick={handleDecrement}
                className="hover:scale-125 transition-transform text-secondary text-base font-bold"
              >
                -
              </button>
              <span>{quantity}</span>
              <button
                onClick={handleIncrement}
                className="hover:scale-125 transition-transform text-primary text-base font-bold"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={adding || !is_available}
              className={`w-full py-1.5 bg-white text-[#ff5200] border border-[#ff5200] hover:bg-[#ff5200]/5 transition-all text-xs font-bold rounded-lg shadow-md uppercase tracking-wider active:scale-95 ${
                !is_available && "opacity-50 cursor-not-allowed"
              }`}
            >
              {!is_available ? "Sold Out" : adding ? "Adding..." : "Add"}
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default DishCard;




