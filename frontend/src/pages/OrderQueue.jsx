import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api";

const OrderQueue = () => {
  const { restaurantId } = useParams();
  
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Success/error alert message
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success, error

  // State for Rider Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [nearbyRiders, setNearbyRiders] = useState([]);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [riderError, setRiderError] = useState(null);
  const [assigningRiderId, setAssigningRiderId] = useState(null);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("All");
  const [riderAcceptedFilter, setRiderAcceptedFilter] = useState("All"); // "All", "Accepted", "Pending"
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("-created_at");
  const [createdAfter, setCreatedAfter] = useState("");
  const [createdBefore, setCreatedBefore] = useState("");

  const [activeTab, setActiveTab] = useState("active"); // active, history

  const fetchOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Restaurant details
      const resResponse = await API.get(`/api/restaurants/${restaurantId}/`);
      setRestaurant(resResponse.data);

      // Build backend params
      const params = {
        page,
        page_size: pageSize,
        ordering: sortBy,
      };

      if (statusFilter && statusFilter !== "All") {
        params.status = statusFilter;
      }
      if (riderAcceptedFilter === "Accepted") {
        params.rider_accepted = "true";
      } else if (riderAcceptedFilter === "Pending") {
        params.rider_accepted = "false";
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      if (createdAfter) {
        params.created_after = createdAfter;
      }
      if (createdBefore) {
        params.created_before = createdBefore;
      }

      const response = await API.get(`/api/orders/restaurants/${restaurantId}/`, { params });
      setOrders(response.data.results || []);
      setTotalCount(response.data.count || 0);
      setError(null);
    } catch (err) {
      console.error("Failed to load restaurant orders queue:", err);
      setError("Could not load restaurant orders queue.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Trigger fetch when pagination or filters change
  useEffect(() => {
    fetchOrders(true);
  }, [page, pageSize, statusFilter, riderAcceptedFilter, searchQuery, sortBy, createdAfter, createdBefore, restaurantId]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, riderAcceptedFilter, searchQuery, sortBy, createdAfter, createdBefore]);
  // Store latest fetchOrders in a ref to avoid stale closures in event handlers
  const fetchOrdersRef = useRef();
  fetchOrdersRef.current = fetchOrders;

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      return;
    }

    const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const wsProtocol = apiBaseURL.startsWith("https") ? "wss" : "ws";
    const wsHost = apiBaseURL.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}://${wsHost}/ws/restaurants/${restaurantId}/?token=${token}`;

    let socket = null;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_order") {
            setMessageType("success");
            setMessage(`New order #${data.order_id} received for ₹${parseFloat(data.total).toFixed(2)}!`);
            if (fetchOrdersRef.current) fetchOrdersRef.current(false);

            // Play notification chime
            try {
              const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav");
              audio.volume = 0.4;
              audio.play();
            } catch (soundErr) {
              // Audio notification blocked by browser
            }

            // Auto-clear message after 8 seconds
            setTimeout(() => {
              setMessage(prev => prev.includes(`#${data.order_id}`) ? "" : prev);
            }, 8000);
          } else if (data.type === "order_update") {
            setMessageType("success");
            setMessage(`Order #${data.order_id} status updated to ${data.status.replace(/_/g, " ").toUpperCase()}.`);
            if (fetchOrdersRef.current) fetchOrdersRef.current(false);

            // Auto-clear status updates after 5 seconds
            setTimeout(() => {
              setMessage(prev => prev.includes(`#${data.order_id}`) ? "" : prev);
            }, 5000);
          }
        } catch (err) {
          console.error("Error parsing WS message:", err);
        }
      };

      socket.onclose = (event) => {
        if (event.code === 4001) {
          console.error("WebSocket connection unauthorized (4001). Reconnect disabled.");
        } else {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      };

      socket.onerror = (error) => {
        console.error("Restaurant WS error:", error);
      };
    };

    connectWebSocket();

    // Fallback polling every 30 seconds
    const interval = setInterval(() => {
      if (fetchOrdersRef.current) fetchOrdersRef.current(false);
    }, 30000);

    return () => {
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(interval);
    };
  }, [restaurantId]);

  const handleStatusTransition = async (orderId, newStatus) => {
    setMessage("");
    try {
      await API.patch(`/api/orders/restaurants/${restaurantId}/${orderId}/`, {
        status: newStatus,
      });
      setMessageType("success");
      setMessage(`Order status updated to ${newStatus.replace(/_/g, " ").toUpperCase()} successfully.`);
      fetchOrders(false);
    } catch (err) {
      console.error(err);
      setMessageType("error");
      const msg = err.response?.data?.error || err.response?.data?.[0] || "Failed to update order status.";
      setMessage(msg);
    }
  };

  const openAssignModal = async (order) => {
    setSelectedOrder(order);
    setIsAssignModalOpen(true);
    setLoadingRiders(true);
    setRiderError(null);
    setNearbyRiders([]);
    try {
      const response = await API.get(`/api/orders/restaurants/${restaurantId}/${order.id}/nearby-riders/`);
      setNearbyRiders(response.data);
    } catch (err) {
      console.error("Failed to load nearby riders:", err);
      setRiderError("Failed to fetch nearby available riders.");
    } finally {
      setLoadingRiders(false);
    }
  };

  const handleAssignRider = async (orderId, riderId, autoAssign = false) => {
    setAssigningRiderId(autoAssign ? "auto" : riderId);
    setMessage("");
    try {
      const payload = autoAssign ? { auto_assign: true } : { rider_id: riderId };
      await API.post(`/api/orders/restaurants/${restaurantId}/${orderId}/assign-rider/`, payload);
      setMessageType("success");
      setMessage(autoAssign ? "Rider auto-assigned successfully." : "Rider assigned successfully.");
      setIsAssignModalOpen(false);
      fetchOrders(false);
    } catch (err) {
      console.error(err);
      setMessageType("error");
      const msg = err.response?.data?.error || err.response?.data?.[0] || "Failed to assign rider.";
      setMessage(msg);
    } finally {
      setAssigningRiderId(null);
    }
  };

  const getStatusStyle = (order) => {
    const status = order?.status?.toLowerCase();
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "preparing":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "ready":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "assigned":
        return order.rider_accepted
          ? "bg-teal-100 text-teal-800 border-teal-200"
          : "bg-amber-100 text-amber-800 border-amber-200 animate-pulse";
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

  const formatStatusText = (order) => {
    if (!order || !order.status) return "";
    if (order.status.toLowerCase() === "assigned") {
      return order.rider_accepted ? "ASSIGNED (ACCEPTED)" : "ASSIGNED (AWAITING RIDER)";
    }
    return order.status.replace(/_/g, " ").toUpperCase();
  };

  // Group active vs finished orders
  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status.toLowerCase()));
  const pastOrders = orders.filter((o) => ["delivered", "cancelled"].includes(o.status.toLowerCase()));

  const displayedOrders = activeTab === "active" ? activeOrders : pastOrders;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    if (tab === "history") {
      setStatusFilter("delivered");
    } else {
      setStatusFilter("All");
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-secondary text-sm mt-4">Retrieving orders queue...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pt-24 sm:pt-32 pb-16 sm:pb-24 px-3 sm:px-6 overflow-x-hidden">
      <div className="container mx-auto max-w-4xl space-y-6 sm:space-y-8">
        
        {/* Header block */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant/10">
          <div>
            <Link
              to="/owner/dashboard"
              className="text-xs font-bold uppercase tracking-wider text-primary-orange hover:underline flex items-center gap-1 mb-2"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Partner Dashboard
            </Link>
            <h1 className="font-display text-lg sm:text-2xl lg:text-3xl font-extrabold text-on-surface">
              {restaurant?.name} <span className="hidden sm:inline">—</span><br className="sm:hidden" /> Orders Queue
            </h1>
          </div>
          
          <button
            onClick={() => fetchOrders(false)}
            className="px-5 py-2.5 border border-outline-variant/30 text-secondary hover:bg-surface-container rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh Queue
          </button>
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

        {/* Tab Selection */}
        <div className="flex border-b border-outline-variant/10">
          <button
            onClick={() => handleTabChange("active")}
            className={`py-3 px-6 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "active"
                ? "border-primary text-primary"
                : "border-transparent text-secondary/60 hover:text-on-surface"
            }`}
          >
            Active Orders {activeTab === "active" ? `(${totalCount})` : ""}
          </button>
          <button
            onClick={() => handleTabChange("history")}
            className={`py-3 px-6 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-secondary/60 hover:text-on-surface"
            }`}
          >
            Past History {activeTab === "history" ? `(${totalCount})` : ""}
          </button>
        </div>

        {/* Advanced Filters Panel */}
        <div className="bg-white p-4 rounded-2xl border border-outline-variant/15 shadow-xs space-y-4 text-xs animate-[fadeIn_0.3s_ease-out]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Customer */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-secondary uppercase tracking-wider text-[10px]">Search Customer</label>
              <div className="flex items-center bg-surface-container rounded-xl px-3 py-1.5 border border-outline-variant/15 focus-within:border-primary-orange">
                <span className="material-symbols-outlined text-secondary text-sm mr-1">search</span>
                <input
                  type="text"
                  placeholder="Name/Email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none p-0 outline-none text-on-surface w-full"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-secondary uppercase tracking-wider text-[10px]">Filter Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-container rounded-xl border border-outline-variant/15 px-3 py-2 outline-none text-on-surface font-semibold cursor-pointer w-full"
              >
                <option value="All">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="assigned">Assigned</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Rider Accepted */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-secondary uppercase tracking-wider text-[10px]">Rider Accepted</label>
              <select
                value={riderAcceptedFilter}
                onChange={(e) => setRiderAcceptedFilter(e.target.value)}
                className="bg-surface-container rounded-xl border border-outline-variant/15 px-3 py-2 outline-none text-on-surface font-semibold cursor-pointer w-full"
              >
                <option value="All">All</option>
                <option value="Accepted">Yes</option>
                <option value="Pending">No</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-secondary uppercase tracking-wider text-[10px]">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-surface-container rounded-xl border border-outline-variant/15 px-3 py-2 outline-none text-on-surface font-semibold cursor-pointer w-full"
              >
                <option value="-created_at">Date: Newest First</option>
                <option value="created_at">Date: Oldest First</option>
                <option value="-total_amount">Total: High to Low</option>
                <option value="total_amount">Total: Low to High</option>
              </select>
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-outline-variant/10">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="font-bold text-secondary uppercase tracking-wider text-[10px] whitespace-nowrap">From:</label>
              <input
                type="date"
                value={createdAfter}
                onChange={(e) => setCreatedAfter(e.target.value)}
                className="bg-surface-container rounded-xl border border-outline-variant/15 px-3 py-1 outline-none text-on-surface text-xs cursor-pointer w-full"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="font-bold text-secondary uppercase tracking-wider text-[10px] whitespace-nowrap">To:</label>
              <input
                type="date"
                value={createdBefore}
                onChange={(e) => setCreatedBefore(e.target.value)}
                className="bg-surface-container rounded-xl border border-outline-variant/15 px-3 py-1 outline-none text-on-surface text-xs cursor-pointer w-full"
              />
            </div>

            {/* Reset Button */}
            {(statusFilter !== "All" || riderAcceptedFilter !== "All" || searchQuery || createdAfter || createdBefore || sortBy !== "-created_at") && (
              <button
                onClick={() => {
                  setStatusFilter("All");
                  setRiderAcceptedFilter("All");
                  setSearchQuery("");
                  setCreatedAfter("");
                  setCreatedBefore("");
                  setSortBy("-created_at");
                }}
                className="sm:ml-auto text-error hover:underline font-bold text-[10px] uppercase tracking-wider cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {error ? (
          <div className="text-center py-20 bg-white border border-outline-variant/15 rounded-3xl p-8">
            <span className="material-symbols-outlined text-4xl text-error mb-4">error</span>
            <p className="text-on-surface font-semibold">{error}</p>
            <button
              onClick={() => fetchOrders(true)}
              className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              Retry
            </button>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="text-center py-20 bg-white border border-outline-variant/15 rounded-3xl p-8 space-y-4">
            <span className="material-symbols-outlined text-5xl text-secondary/30">list_alt</span>
            <p className="text-on-surface font-semibold text-lg">No orders in this section</p>
            <p className="text-secondary text-sm font-light max-w-sm mx-auto">
              {activeTab === "active"
                ? "Any incoming customer orders will show up here. Keep this tab open to monitor real-time requests!"
                : "No past delivered or cancelled orders recorded for this kitchen yet."}
            </p>
          </div>
        ) : (
          /* Orders list */
          <div className="space-y-6">
            {displayedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-outline-variant/15 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6 hover:shadow-md transition-shadow duration-300"
              >
                {/* Meta details */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant/10">
                  <div>
                    <h3 className="font-display font-bold text-base text-on-surface">Order #{order.id}</h3>
                    <p className="text-[10px] text-secondary font-medium uppercase tracking-wider mt-1">
                      Received {new Date(order.created_at).toLocaleDateString()} at{" "}
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  <span
                    className={`px-3 py-1 border text-[10px] font-bold uppercase tracking-wider rounded-full ${getStatusStyle(
                      order
                    )}`}
                  >
                    {formatStatusText(order)}
                  </span>
                </div>

                {/* Items & Address details */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
                  {/* Items list */}
                  <div className="md:col-span-7 space-y-2">
                    <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Items</h4>
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

                  {/* Customer Meta & Total */}
                  <div className="md:col-span-5 bg-surface-container-low rounded-2xl p-4 space-y-3 text-xs font-medium text-secondary flex flex-col justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Customer Profile</p>
                      <p className="font-semibold text-on-surface">{order.customer?.email}</p>
                      <p className="font-light">{order.customer?.phone_number || "No phone listed"}</p>
                    </div>
                    <div className="pt-2 border-t border-outline-variant/10 flex justify-between font-display text-sm font-extrabold text-on-surface">
                      <span>Total Revenue</span>
                      <span className="text-primary">₹{parseFloat(order.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Address block */}
                <div className="text-xs text-secondary leading-relaxed font-light">
                  <strong>Delivery Address:</strong> {order.delivery_address}
                </div>

                {order.notes && (
                  <div className="text-xs bg-amber-50/70 border border-amber-200/50 p-3.5 rounded-2xl text-amber-900 font-light space-y-1">
                    <p className="font-bold text-[10px] uppercase tracking-wider text-amber-800">Special Instructions / Cooking Notes</p>
                    <p className="italic">"{order.notes}"</p>
                  </div>
                )}

                {/* Status Transition Action Buttons */}
                {activeTab === "active" && (
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-outline-variant/10 justify-end">
                    
                    {order.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleStatusTransition(order.id, "cancelled")}
                          className="px-5 py-2.5 border border-error/20 hover:bg-error-container text-error text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                        >
                          Reject / Cancel
                        </button>
                        <button
                          onClick={() => handleStatusTransition(order.id, "confirmed")}
                          className="px-6 py-2.5 bg-primary text-white hover:opacity-90 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all active:scale-95"
                        >
                          Accept & Confirm
                        </button>
                      </>
                    )}

                    {order.status === "confirmed" && (
                      <button
                        onClick={() => handleStatusTransition(order.id, "preparing")}
                        className="px-6 py-2.5 bg-purple-600 text-white hover:bg-purple-700 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all active:scale-95"
                      >
                        Start Preparing Meal
                      </button>
                    )}

                    {order.status === "preparing" && (
                      <button
                        onClick={() => handleStatusTransition(order.id, "ready")}
                        className="px-6 py-2.5 bg-cyan-600 text-white hover:bg-cyan-700 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all active:scale-95"
                      >
                        Mark as Ready
                      </button>
                    )}

                    {order.status === "ready" && (
                      <button
                        onClick={() => openAssignModal(order)}
                        className="px-5 py-2.5 bg-primary text-white hover:bg-primary/90 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">motorcycle</span>
                        Assign Rider
                      </button>
                    )}

                    {order.status === "assigned" && (
                      <div className="w-full bg-surface-container-low border border-outline-variant/15 rounded-2xl p-4 space-y-2">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[18px]">motorcycle</span>
                            <div>
                              <span className="text-xs font-bold text-on-surface">
                                {order.delivery_partner
                                  ? (order.delivery_partner.name || "Rider")
                                  : "Rider Assigned"}
                              </span>
                              {order.delivery_partner?.phone_number && (
                                <p className="text-[10px] text-secondary font-light">{order.delivery_partner.phone_number}</p>
                              )}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                            order.rider_accepted
                              ? "bg-tertiary/10 text-tertiary border-tertiary/20"
                              : "bg-amber-100 text-amber-800 border-amber-200 animate-pulse"
                          }`}>
                            {order.rider_accepted ? "Rider Accepted" : "Awaiting Rider Response"}
                          </span>
                        </div>
                      </div>
                    )}

                    {order.status === "out_for_delivery" && (
                      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary-orange text-[18px]">local_shipping</span>
                          <span className="text-xs font-bold text-on-surface">
                            Rider en route to customer
                          </span>
                        </div>
                        <button
                          onClick={() => handleStatusTransition(order.id, "delivered")}
                          className="px-5 py-2.5 bg-green-600 text-white hover:bg-green-700 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all active:scale-95"
                        >
                          Mark as Delivered
                        </button>
                      </div>
                    )}

                  </div>
                )}

              </div>
            ))}

            {/* Pagination Controls */}
            {Math.ceil(totalCount / pageSize) > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 bg-white p-3 rounded-2xl border border-outline-variant/10 shadow-xs max-w-xs mx-auto animate-[fadeIn_0.3s_ease-out]">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="p-1.5 bg-surface hover:bg-surface-container rounded-xl text-secondary hover:text-on-surface disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
                <span className="text-xs font-bold text-on-surface">
                  Page {page} of {Math.ceil(totalCount / pageSize)}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(prev + 1, Math.ceil(totalCount / pageSize)))}
                  disabled={page === Math.ceil(totalCount / pageSize)}
                  className="p-1.5 bg-surface hover:bg-surface-container rounded-xl text-secondary hover:text-on-surface disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Rider Assignment Modal */}
      {isAssignModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white border border-outline-variant/15 w-full sm:max-w-md rounded-t-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[85vh] sm:max-h-[80vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low">
              <div>
                <h3 className="font-display font-extrabold text-lg text-on-surface">Assign Delivery Partner</h3>
                <p className="text-[10px] text-secondary font-medium uppercase tracking-wider mt-0.5">
                  Order #{selectedOrder.id} • Value ₹{parseFloat(selectedOrder.total_amount).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="w-8 h-8 rounded-full border border-outline-variant/30 text-secondary hover:bg-surface-container flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Auto Assign Fallback Option */}
              <div className="bg-primary/5 border border-primary/15 p-4 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Quick Match</h4>
                  <p className="text-[11px] text-secondary font-light">Automatically assign the nearest online and available partner.</p>
                </div>
                <button
                  onClick={() => handleAssignRider(selectedOrder.id, null, true)}
                  disabled={assigningRiderId !== null}
                  className="px-4 py-2 bg-primary text-white hover:opacity-95 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  {assigningRiderId === "auto" ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">bolt</span>
                  )}
                  Auto Assign
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Nearby Active Riders</h4>

                {loadingRiders ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-2">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-secondary font-light">Locating riders...</span>
                  </div>
                ) : riderError ? (
                  <div className="p-4 bg-error-container text-error rounded-xl text-xs font-semibold border border-error/15">
                    {riderError}
                  </div>
                ) : nearbyRiders.length === 0 ? (
                  <div className="p-6 bg-surface-container rounded-2xl text-center space-y-2.5 border border-outline-variant/10">
                    <span className="material-symbols-outlined text-3xl text-secondary/35">motorcycle</span>
                    <p className="text-on-surface font-semibold text-xs">No Riders Online Nearby</p>
                    <p className="text-secondary text-[11px] font-light leading-relaxed">
                      Make sure your delivery partners are online, within range, and have shared their GPS coordinates.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
                    {nearbyRiders.map((rider) => (
                      <div
                        key={rider.id}
                        className="p-4 border border-outline-variant/15 rounded-2xl hover:border-outline-variant/30 transition-all flex justify-between items-center gap-4 bg-white"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[18px]">motorcycle</span>
                            <span className="font-bold text-xs text-on-surface">{rider.name}</span>
                          </div>
                          <div className="text-[11px] text-secondary font-light space-y-0.5">
                            <p>Phone: {rider.phone_number}</p>
                            <p>Vehicle: {rider.vehicle_number || "N/A"}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2.5">
                          <span className="text-[10px] font-bold text-tertiary bg-tertiary/10 border border-tertiary/20 px-2 py-0.5 rounded-full">
                            {rider.distance} km away
                          </span>
                          <button
                            onClick={() => handleAssignRider(selectedOrder.id, rider.id, false)}
                            disabled={assigningRiderId !== null}
                            className="px-3.5 py-1.5 bg-on-surface text-surface hover:bg-on-surface/90 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                          >
                            {assigningRiderId === rider.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              "Assign"
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-outline-variant/10 bg-surface-container-lowest flex justify-end">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-5 py-2.5 border border-outline-variant/30 text-secondary hover:bg-surface-container rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default OrderQueue;

