import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Success/error messages for cancellations
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success, error

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await API.get("/api/orders/");
      // Sort orders by id desc to show newest first
      const sorted = response.data.sort((a, b) => b.id - a.id);
      setOrders(sorted);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch order history:", err);
      setError("Could not load your order history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId) => {
    setMessage("");
    try {
      await API.patch(`/api/orders/${orderId}/`, {
        status: "cancelled",
      });
      setMessageType("success");
      setMessage("Order cancelled successfully.");
      // Refresh list
      fetchOrders();
    } catch (err) {
      console.error(err);
      setMessageType("error");
      const msg = err.response?.data?.[0] || err.response?.data?.detail || "Failed to cancel order.";
      setMessage(msg);
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "preparing":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "ready":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "assigned":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "out_for_delivery":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const formatStatusText = (status) => {
    if (!status) return "";
    return status.replace(/_/g, " ").toUpperCase();
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-secondary text-sm mt-4">Loading your order history...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pt-32 pb-24 px-6">
      <div className="container mx-auto max-w-4xl space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold text-on-surface">Order History</h1>
          <Link
            to="/dashboard"
            className="text-xs font-bold uppercase tracking-wider text-primary-orange hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to browse
          </Link>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold border ${
              messageType === "success"
                ? "bg-tertiary-container/10 text-tertiary border-tertiary/10"
                : "bg-error-container text-error border-error/10"
            }`}
          >
            {message}
          </div>
        )}

        {error ? (
          <div className="text-center py-20 bg-white border border-outline-variant/15 rounded-3xl p-8">
            <span className="material-symbols-outlined text-4xl text-error mb-4">error</span>
            <p className="text-on-surface font-semibold">{error}</p>
            <button
              onClick={fetchOrders}
              className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white border border-outline-variant/15 rounded-3xl p-8 space-y-4">
            <span className="material-symbols-outlined text-5xl text-secondary/30">receipt_long</span>
            <p className="text-on-surface font-semibold text-lg">No orders placed yet</p>
            <p className="text-secondary text-sm font-light max-w-sm mx-auto">
              You haven't placed any gourmet orders yet. Browse our top kitchens and make your first order!
            </p>
            <Link
              to="/dashboard"
              className="inline-block px-8 py-3.5 bg-primary-orange text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:bg-primary transition-all"
            >
              Order Now
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-outline-variant/15 rounded-3xl p-6 shadow-sm space-y-6 hover:shadow-md transition-shadow duration-300"
              >
                {/* Order Meta bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant/10">
                  <div>
                    <h3 className="font-display font-bold text-base text-on-surface">
                      Order #{order.id}
                    </h3>
                    <p className="text-[10px] text-secondary font-medium uppercase tracking-wider mt-1">
                      Placed on {new Date(order.created_at).toLocaleDateString()} at{" "}
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 border text-[10px] font-bold uppercase tracking-wider rounded-full ${getStatusStyle(
                        order.status
                      )}`}
                    >
                      {formatStatusText(order.status)}
                    </span>
                    {order.invoice_url && (
                      <a
                        href={order.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-1.5 border border-outline-variant/35 text-secondary hover:bg-surface-container transition-all text-[10px] font-bold uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1 cursor-pointer"
                        title="Download Invoice PDF"
                      >
                        <span className="material-symbols-outlined text-[13px]">download</span>
                        Bill
                      </a>
                    )}
                    <Link
                      to={`/track-order/${order.id}`}
                      className="px-4 py-1.5 bg-on-surface text-white hover:bg-primary transition-all text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm"
                    >
                      Track
                    </Link>
                  </div>
                </div>

                {/* Items and Details */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Items list */}
                  <div className="md:col-span-8 space-y-2">
                    <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Items</h4>
                    <div className="space-y-2">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm font-light text-on-surface">
                          <span>
                            {item.item_name} <strong className="font-semibold ml-1">x {item.quantity}</strong>
                          </span>
                          <span className="font-medium">₹{parseFloat(item.total_price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Summary */}
                  <div className="md:col-span-4 bg-surface-container-low rounded-2xl p-4 space-y-2 text-xs font-medium text-secondary">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-on-surface font-semibold">₹{parseFloat(order.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="text-on-surface font-semibold">₹{parseFloat(order.delivery_fee).toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-outline-variant/10 flex justify-between font-display text-sm font-extrabold text-on-surface">
                      <span>Total Paid</span>
                      <span className="text-primary">₹{parseFloat(order.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Address and actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-outline-variant/10 text-xs">
                  <div className="text-secondary leading-relaxed font-light">
                    <strong>Delivery Address:</strong> {order.delivery_address}
                  </div>
                  
                  {order.status === "pending" && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="px-5 py-2.5 bg-error-container text-error hover:bg-error hover:text-white border border-error/10 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default OrderHistory;

