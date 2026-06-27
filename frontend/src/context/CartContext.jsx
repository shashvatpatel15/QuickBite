import { createContext, useState, useEffect, useContext } from "react";
import API from "../api";
import { AuthContext } from "./AuthContext";

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch cart items from Django backend
  const fetchCart = async () => {
    if (!user || user.role !== "customer") {
      setCartItems([]);
      return;
    }
    setLoading(true);
    try {
      const response = await API.get("/api/cart/items/");
      setCartItems(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching cart:", err);
      setError("Failed to fetch cart items.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch cart on user status change
  useEffect(() => {
    if (user && user.role === "customer") {
      fetchCart();
    } else {
      setCartItems([]);
    }
  }, [user]);

  // Add item to cart
  const addToCart = async (menuId, quantity = 1) => {
    try {
      await API.post("/api/cart/items/", {
        menu: menuId,
        quantity,
      });
      // Refresh cart items to ensure database parity
      await fetchCart();
      return { success: true };
    } catch (err) {
      console.error("Error adding to cart:", err);
      const msg = err.response?.data?.[0] || err.response?.data?.detail || "Could not add item to cart.";
      return { success: false, error: msg };
    }
  };

  // Update item quantity
  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      return removeFromCart(itemId);
    }
    try {
      await API.patch(`/api/cart/items/${itemId}/`, {
        quantity: newQuantity,
      });
      // Update locally first for responsiveness, then sync
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
      await fetchCart();
      return { success: true };
    } catch (err) {
      console.error("Error updating quantity:", err);
      return { success: false, error: "Failed to update item quantity." };
    }
  };

  // Remove item from cart
  const removeFromCart = async (itemId) => {
    try {
      await API.delete(`/api/cart/items/${itemId}/`);
      setCartItems((prev) => prev.filter((item) => item.id !== itemId));
      return { success: true };
    } catch (err) {
      console.error("Error removing from cart:", err);
      return { success: false, error: "Failed to remove item from cart." };
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      await API.delete("/api/cart/items/clear/");
      setCartItems([]);
      return { success: true };
    } catch (err) {
      console.error("Error clearing cart:", err);
      return { success: false, error: "Failed to clear cart." };
    }
  };

  // Computed values
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  
  const cartSubtotal = cartItems.reduce((acc, item) => {
    const price = parseFloat(item.menu_details?.price || 0);
    return acc + price * item.quantity;
  }, 0);

  const restaurantId = cartItems[0]?.menu_details?.restaurant || null;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        error,
        cartCount,
        cartSubtotal,
        restaurantId,
        fetchCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
