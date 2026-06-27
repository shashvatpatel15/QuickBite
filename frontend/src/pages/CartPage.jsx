import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import API from "../api";

const CartPage = () => {
  const { cartItems, cartSubtotal, updateQuantity, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  
  // Address creation form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    address_type: "home",
    house_no: "",
    building_name: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [orderNotes, setOrderNotes] = useState("");

  // Fetch saved addresses
  const fetchAddresses = async () => {
    try {
      const response = await API.get("/api/customer/addresses/");
      setAddresses(response.data);
      if (response.data.length > 0) {
        // Select default address if exists, otherwise first
        const def = response.data.find((a) => a.is_default);
        setSelectedAddressId(def ? def.id : response.data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleAddressChange = (e) => {
    setAddressForm({ ...addressForm, [e.target.name]: e.target.value });
  };

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    const { house_no, address_line_1, city, state, pincode } = addressForm;
    if (!house_no || !address_line_1 || !city || !state || !pincode) {
      setError("Please fill in all required address fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await API.post("/api/customer/addresses/", addressForm);
      setSuccess("Address saved successfully!");
      setAddressForm({
        address_type: "home",
        house_no: "",
        building_name: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        state: "",
        pincode: "",
      });
      setShowAddressForm(false);
      
      // Reload addresses list and select the new one
      await fetchAddresses();
      setSelectedAddressId(response.data.id);
    } catch (err) {
      console.error(err);
      setError("Failed to save address.");
    } finally {
      setLoading(false);
    }
  };

  // Load Razorpay SDK dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    setError("");
    setSuccess("");

    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!selectedAddressId) {
      setError("Please select a delivery address.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create a payment on the backend to get the Razorpay order ID
      const paymentResponse = await API.post("/api/payments/create/", {
        address_id: selectedAddressId,
        notes: orderNotes,
      });

      const { key, amount, razorpay_order_id } = paymentResponse.data;

      // Check if we are running in mock mode (due to dummy key or failing client creation)
      if (razorpay_order_id?.startsWith("order_mock_") || key?.startsWith("rzp_test_dummy")) {
        setSuccess("Mock mode detected. Simulating successful Razorpay payment...");
        setTimeout(async () => {
          try {
            // Verify payment on backend with mock params
            const verifyResponse = await API.post("/api/payments/verify/", {
              razorpay_order_id: razorpay_order_id,
              razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(2, 11)}`,
              razorpay_signature: "mock_signature_value",
            });

            setSuccess("Payment successful (Mock)! Redirecting to tracking...");
            clearCart();
            setTimeout(() => {
              navigate(`/track-order/${verifyResponse.data.order_id}`);
            }, 1500);
          } catch (verifyErr) {
            console.error(verifyErr);
            const msg = verifyErr.response?.data?.detail || "Payment verification failed. Please contact support.";
            setError(msg);
            setLoading(false);
          }
        }, 1500);
        return;
      }

      // 2. Load the Razorpay Checkout script dynamically
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setError("Failed to load Razorpay SDK. Please check your internet connection.");
        setLoading(false);
        return;
      }

      // 3. Configure Razorpay checkout options
      const options = {
        key: key,
        amount: amount,
        currency: "INR",
        name: "Gourmet Kitchen",
        description: "Payment for your order",
        order_id: razorpay_order_id,
        handler: async (response) => {
          setLoading(true);
          try {
            // 4. Verify payment on backend
            const verifyResponse = await API.post("/api/payments/verify/", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setSuccess("Payment successful! Redirecting to tracking...");
            clearCart();
            setTimeout(() => {
              navigate(`/track-order/${verifyResponse.data.order_id}`);
            }, 1500);
          } catch (verifyErr) {
            console.error(verifyErr);
            const msg = verifyErr.response?.data?.detail || "Payment verification failed. Please contact support.";
            setError(msg);
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          email: user?.email || "",
          contact: user?.phone_number || "",
        },
        theme: {
          color: "#FF5252",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError("Payment was cancelled.");
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || err.response?.data?.detail || "Failed to initiate payment.";
      setError(msg);
      setLoading(false);
    }
  };

  // Fixed fees mapping to Django backend logic
  const deliveryFee = 40.0;
  const tax = cartSubtotal * 0.05;
  const totalAmount = cartSubtotal > 0 ? Math.max(cartSubtotal + deliveryFee + tax, 0) : 0;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center px-6 pt-24">
        <div className="text-center space-y-6">
          <span className="material-symbols-outlined text-5xl text-secondary/40">shopping_bag</span>
          <h2 className="font-display text-xl font-bold text-on-surface">Your basket is empty</h2>
          <p className="text-secondary text-sm font-light max-w-sm">
            You haven't added any items to your basket yet. Go back to browse and add dishes!
          </p>
          <Link
            to="/dashboard"
            className="inline-block px-8 py-3.5 bg-primary-orange text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:bg-primary transition-all"
          >
            Find food
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pt-32 pb-24 px-6">
      <div className="container mx-auto max-w-5xl space-y-8">
        <h1 className="font-display text-2xl lg:text-3xl font-extrabold text-on-surface">Your Gourmet Basket</h1>

        {error && (
          <div className="p-4 bg-error-container text-error rounded-xl text-xs font-semibold border border-error/10">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-tertiary-container/10 text-tertiary text-xs font-semibold rounded-xl border border-tertiary/10">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Items and Address */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Basket Items List */}
            <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="font-display text-base font-bold text-on-surface pb-3 border-b border-outline-variant/10">Items Summary</h2>
              
              <div className="divide-y divide-outline-variant/10">
                {cartItems.map((item) => (
                  <div key={item.id} className="py-4 flex justify-between items-center gap-4">
                    {/* Item details */}
                    <div className="flex-grow">
                      <p className="font-bold text-sm text-on-surface">{item.menu_details?.name}</p>
                      <p className="text-secondary text-xs mt-1 font-light">
                        {item.menu_details?.category} • {item.menu_details?.food_type}
                      </p>
                    </div>
                    
                    {/* Stepper + Price */}
                    <div className="flex items-center gap-6">
                      <div className="bg-surface-container border border-outline-variant/20 rounded-lg flex items-center justify-between py-1 px-3 font-bold text-xs w-24">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="hover:scale-125 transition-transform text-secondary text-sm font-bold"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="hover:scale-125 transition-transform text-primary text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                      
                      <div className="font-display font-bold text-sm text-on-surface w-16 text-right">
                        ₹{(parseFloat(item.menu_details?.price || 0) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Instructions / Notes */}
            <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/10">
                <span className="material-symbols-outlined text-primary-orange text-lg">event_note</span>
                <h2 className="font-display text-base font-bold text-on-surface">Cooking / Delivery Instructions</h2>
              </div>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Make it extra spicy, No onions, Ring doorbell, Leave at door..."
                rows="2"
                className="w-full bg-surface border border-outline-variant/20 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface placeholder:text-secondary/40 font-light resize-none"
              />
            </div>

            {/* Address Selector */}
            <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant/10">
                <h2 className="font-display text-base font-bold text-on-surface">Delivery Address</h2>
                {!showAddressForm && (
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="text-primary-orange hover:underline text-xs font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Address
                  </button>
                )}
              </div>

              {/* Address Form */}
              {showAddressForm && (
                <form onSubmit={handleCreateAddress} className="space-y-4 p-4 border border-outline-variant/20 rounded-2xl bg-surface-container-low">
                  <h3 className="font-display text-xs font-bold text-secondary uppercase tracking-wider">New Address Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Address Type</label>
                      <select
                        name="address_type"
                        value={addressForm.address_type}
                        onChange={handleAddressChange}
                        className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                      >
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">House / Flat No*</label>
                      <input
                        type="text"
                        name="house_no"
                        placeholder="e.g. Flat 101, Ground Floor"
                        value={addressForm.house_no}
                        onChange={handleAddressChange}
                        required
                        className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Building Name (Optional)</label>
                      <input
                        type="text"
                        name="building_name"
                        placeholder="e.g. Windsor Heights"
                        value={addressForm.building_name}
                        onChange={handleAddressChange}
                        className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Address Line 1*</label>
                      <input
                        type="text"
                        name="address_line_1"
                        placeholder="Street, Sector, Area"
                        value={addressForm.address_line_1}
                        onChange={handleAddressChange}
                        required
                        className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Address Line 2 (Optional)</label>
                      <input
                        type="text"
                        name="address_line_2"
                        placeholder="Landmark, Near..."
                        value={addressForm.address_line_2}
                        onChange={handleAddressChange}
                        className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">City*</label>
                      <input
                        type="text"
                        name="city"
                        placeholder="City"
                        value={addressForm.city}
                        onChange={handleAddressChange}
                        required
                        className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">State*</label>
                      <input
                        type="text"
                        name="state"
                        placeholder="State"
                        value={addressForm.state}
                        onChange={handleAddressChange}
                        required
                        className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Pincode*</label>
                      <input
                        type="text"
                        name="pincode"
                        placeholder="6-digit Pincode"
                        value={addressForm.pincode}
                        onChange={handleAddressChange}
                        required
                        className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="px-4 py-2 border border-outline-variant/30 text-secondary hover:bg-surface-container rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-primary text-white hover:opacity-90 rounded-xl text-xs font-bold"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              )}

              {/* Addresses List */}
              {addresses.length === 0 ? (
                <p className="text-secondary text-xs font-light">No saved addresses found. Please add a new delivery address.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`p-4 border rounded-2xl flex items-start gap-3 cursor-pointer transition-all ${
                        selectedAddressId === address.id
                          ? "border-primary-orange bg-primary/5"
                          : "border-outline-variant/20 hover:bg-surface-container-low"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address_select"
                        checked={selectedAddressId === address.id}
                        onChange={() => setSelectedAddressId(address.id)}
                        className="mt-1 text-primary-orange focus:ring-primary-orange"
                      />
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-white border border-outline-variant/20 px-2 py-0.5 rounded">
                          {address.address_type}
                        </span>
                        <p className="text-xs font-semibold text-on-surface mt-2">
                          {address.house_no}{address.building_name ? `, ${address.building_name}` : ""}
                        </p>
                        <p className="text-xs text-secondary font-light">{address.address_line_1}</p>
                        {address.address_line_2 && <p className="text-xs text-secondary font-light">{address.address_line_2}</p>}
                        <p className="text-[10px] text-secondary font-medium">
                          {address.city}, {address.state} - {address.pincode}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Panel: Checkout / Bill Details */}
          <div className="lg:col-span-4 space-y-6">

            {/* Bill Details */}
            <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 shadow-sm space-y-6">
              <h2 className="font-display text-base font-bold text-on-surface pb-3 border-b border-outline-variant/10">Order Summary</h2>
              
              <div className="space-y-4 text-xs font-medium text-secondary">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-on-surface font-semibold">₹{cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="text-on-surface font-semibold">₹{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax & Restaurant Charges</span>
                  <span className="text-on-surface font-semibold">₹{tax.toFixed(2)}</span>
                </div>
                
                <div className="pt-4 border-t border-outline-variant/10 flex justify-between font-display text-base font-extrabold text-on-surface">
                  <span>Total Amount</span>
                  <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || cartItems.length === 0 || !selectedAddressId}
                className="w-full py-4 bg-primary-orange text-white font-bold rounded-2xl shadow-md hover:bg-primary transition-all active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">shopping_cart_checkout</span>
                {loading ? "Placing Order..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CartPage;

