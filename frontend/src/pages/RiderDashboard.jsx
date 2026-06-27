import { useState, useEffect, useContext, useRef } from "react";
import API from "../api";
import { AuthContext } from "../context/AuthContext";
import L from "leaflet";

const RiderDashboard = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [viewMode, setViewMode] = useState("active"); // "active" or "history"
  const [vehicleInput, setVehicleInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Journey Simulation State
  const [simulatingOrderId, setSimulatingOrderId] = useState(null);
  const [simulationProgress, setSimulationProgress] = useState(0); // 0 to 100
  const simIntervalRef = useRef(null);
  const simSocketRef = useRef(null);

  // Persistent Location Tracking Refs (for when rider is online)
  const locationWsRef = useRef(null);
  const geoWatchIdRef = useRef(null);

  // Leaflet Map Refs
  const mapRef = useRef(null);
  const mapContainerId = "rider-route-map";
  const riderMarkerRef = useRef(null);

  // Fetch Rider Profile and Orders
  const fetchData = async () => {
    try {
      setError("");
      // 1. Fetch Profile
      const profileRes = await API.get("/api/delivery/profile/");
      if (profileRes.data && profileRes.data.length > 0) {
        const p = profileRes.data[0];
        setProfile(p);
        setVehicleInput(p.vehicle_number || "");
      } else {
        setError("Delivery profile details not found. Please contact administration.");
      }

      // 2. Fetch Orders
      const ordersRes = await API.get("/api/delivery/orders/");
      const allOrders = ordersRes.data || [];
      
      const active = allOrders.filter(o => o.status !== "delivered" && o.status !== "cancelled");
      const completed = allOrders.filter(o => o.status === "delivered" || o.status === "cancelled");
      
      setActiveOrders(active);
      setCompletedOrders(completed);
    } catch (err) {
      console.error("Rider dashboard fetch error:", err);
      setError("Failed to fetch dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stopSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (simSocketRef.current) {
      simSocketRef.current.close();
      simSocketRef.current = null;
    }
    setSimulatingOrderId(null);
    setSimulationProgress(0);
  };

  useEffect(() => {
    fetchData();
    return () => {
      stopSimulation();
    };
  }, []);

  // Update vehicle number or online status
  const handleUpdateProfile = async (updates) => {
    if (!profile) return;
    setUpdatingProfile(true);
    setError("");
    setSuccess("");
    try {
      const response = await API.patch(`/api/delivery/profile/${profile.id}/`, updates);
      setProfile(response.data);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Profile update error:", err);
      setError("Failed to update profile details.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const toggleOnlineStatus = () => {
    if (!profile) return;

    if (!profile.is_online) {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser.");
        return;
      }

      setUpdatingProfile(true);
      setError("");
      setSuccess("Locating device GPS position...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          handleUpdateProfile({
            is_online: true,
            current_latitude: parseFloat(lat.toFixed(6)),
            current_longitude: parseFloat(lng.toFixed(6))
          });
        },
        (err) => {
          console.error("Geolocation error:", err);
          let errMsg = "Failed to retrieve location. Please enable GPS permissions to go online.";
          if (err.code === err.PERMISSION_DENIED) {
            errMsg = "Location access denied. You must grant location permission to go online.";
          }
          setError(errMsg);
          setSuccess("");
          setUpdatingProfile(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      handleUpdateProfile({ is_online: false });
    }
  };

  // Auto-polling for new tasks when online
  useEffect(() => {
    if (!profile || !profile.is_online) return;

    const interval = setInterval(() => {
      fetchData();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [profile?.is_online]);

  // Persistent location tracking: WebSocket + watchPosition while rider is online
  useEffect(() => {
    if (!profile || !profile.is_online) {
      // Cleanup if rider goes offline
      if (locationWsRef.current) {
        locationWsRef.current.close();
        locationWsRef.current = null;
      }
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
      return;
    }

    // Don't open if already connected
    if (locationWsRef.current && locationWsRef.current.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      return;
    }

    const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const wsProtocol = apiBaseURL.startsWith("https") ? "wss" : "ws";
    const wsHost = apiBaseURL.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}://${wsHost}/ws/delivery-tracking/?token=${token}`;

    const ws = new WebSocket(wsUrl);
    locationWsRef.current = ws;

    ws.onopen = () => {

      // Start continuous GPS tracking
      if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const lat = parseFloat(position.coords.latitude.toFixed(6));
            const lng = parseFloat(position.coords.longitude.toFixed(6));

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ latitude: lat, longitude: lng }));
            }
          },
          (err) => {
            console.error("GPS watchPosition error:", err);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
        geoWatchIdRef.current = watchId;
      }
    };

    ws.onerror = (err) => {
      console.error("Location tracking WebSocket error:", err);
    };

    ws.onclose = () => {
      locationWsRef.current = null;
    };

    // Cleanup on unmount or when rider goes offline
    return () => {
      if (locationWsRef.current) {
        locationWsRef.current.close();
        locationWsRef.current = null;
      }
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
    };
  }, [profile?.is_online]);

  // Update order status (Pick Up or Deliver)
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderStatus(prev => ({ ...prev, [orderId]: true }));
    setError("");
    setSuccess("");
    
    // If marking as delivered, stop simulation if running
    if (newStatus === "delivered" && simulatingOrderId === orderId) {
      stopSimulation();
    }

    try {
      await API.patch(`/api/delivery/orders/${orderId}/`, { status: newStatus });
      setSuccess(`Order status updated to: ${newStatus.replace(/_/g, " ")}`);
      setTimeout(() => setSuccess(""), 3000);
      await fetchData();
    } catch (err) {
      console.error("Order status update error:", err);
      setError("Failed to update order status. Please try again.");
    } finally {
      setUpdatingOrderStatus(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleAcceptDelivery = async (orderId) => {
    setUpdatingOrderStatus(prev => ({ ...prev, [orderId]: true }));
    setError("");
    setSuccess("");
    try {
      await API.post(`/api/delivery/orders/${orderId}/accept/`);
      setSuccess("Delivery request accepted! You can now start the journey.");
      setTimeout(() => setSuccess(""), 3000);
      await fetchData();
    } catch (err) {
      console.error("Accept delivery error:", err);
      setError("Failed to accept delivery request.");
    } finally {
      setUpdatingOrderStatus(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleRejectDelivery = async (orderId) => {
    setUpdatingOrderStatus(prev => ({ ...prev, [orderId]: true }));
    setError("");
    setSuccess("");
    try {
      await API.post(`/api/delivery/orders/${orderId}/reject/`);
      setSuccess("Delivery request declined.");
      setTimeout(() => setSuccess(""), 3000);
      await fetchData();
    } catch (err) {
      console.error("Reject delivery error:", err);
      setError("Failed to decline delivery request.");
    } finally {
      setUpdatingOrderStatus(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Render Leaflet Map for the active order
  const initMap = (order) => {
    if (!order) return;
    
    // Get coordinates with fallbacks
    const restLat = parseFloat(order.restaurant_latitude) || 28.6139;
    const restLng = parseFloat(order.restaurant_longitude) || 77.2090;
    const destLat = parseFloat(order.customer_latitude) || 28.6250;
    const destLng = parseFloat(order.customer_longitude) || 77.2200;

    // Wait for DOM to render
    setTimeout(() => {
      const container = document.getElementById(mapContainerId);
      if (!container) return;

      // Clean up previous map if exists
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Initialize map
      const map = L.map(mapContainerId).setView([restLat, restLng], 14);
      mapRef.current = map;

      // Add Tile Layer (OSM)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Custom markers
      const restaurantIcon = L.divIcon({
        html: '<div style="background-color: #a83300; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 18px;">storefront</span></div>',
        className: 'custom-leaflet-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const customerIcon = L.divIcon({
        html: '<div style="background-color: #ff5200; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><span class="material-symbols-outlined" style="font-size: 18px;">home</span></div>',
        className: 'custom-leaflet-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const riderIcon = L.divIcon({
        html: '<div style="background-color: #196b00; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4);"><span class="material-symbols-outlined" style="font-size: 20px;">motorcycle</span></div>',
        className: 'custom-leaflet-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      // Plot restaurant & customer markers
      L.marker([restLat, restLng], { icon: restaurantIcon }).addTo(map).bindPopup("<b>Restaurant Pickup:</b> " + order.restaurant_name);
      L.marker([destLat, destLng], { icon: customerIcon }).addTo(map).bindPopup("<b>Customer Dropoff:</b> " + order.delivery_address);

      // Plot rider marker at current simulation position
      const riderMarker = L.marker([restLat, restLng], { icon: riderIcon }).addTo(map).bindPopup("<b>Your Current Position</b>");
      riderMarkerRef.current = riderMarker;

      // Draw polyline connecting them
      const routeLine = L.polyline([[restLat, restLng], [destLat, destLng]], {
        color: '#ff5200',
        weight: 4,
        opacity: 0.6,
        dashArray: '10, 10'
      }).addTo(map);

      // Fit bounds
      map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
    }, 100);
  };

  // Trigger map load when active order transitions to out_for_delivery
  useEffect(() => {
    const deliveryOrder = activeOrders.find(o => o.status === "out_for_delivery");
    if (deliveryOrder && viewMode === "active") {
      initMap(deliveryOrder);
    } else {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    }
  }, [activeOrders, viewMode]);

  // Start WebSocket Location Updates Simulator
  const startSimulation = (order) => {
    if (!order) return;
    stopSimulation(); // Clean up previous simulation if any

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Websocket authentication failed. Access token missing.");
      return;
    }

    const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const wsProtocol = apiBaseURL.startsWith("https") ? "wss" : "ws";
    const wsHost = apiBaseURL.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}://${wsHost}/ws/delivery-tracking/?token=${token}`;

    const socket = new WebSocket(wsUrl);
    simSocketRef.current = socket;

    const restLat = parseFloat(order.restaurant_latitude) || 28.6139;
    const restLng = parseFloat(order.restaurant_longitude) || 77.2090;
    const destLat = parseFloat(order.customer_latitude) || 28.6250;
    const destLng = parseFloat(order.customer_longitude) || 77.2200;

    let progress = 0;
    setSimulatingOrderId(order.id);
    setSimulationProgress(0);

    socket.onopen = () => {
      
      // Start walking coordinates
      simIntervalRef.current = setInterval(() => {
        progress += 4; // Move 4% every 2 seconds
        if (progress > 100) progress = 100;
        
        setSimulationProgress(progress);

        // Interpolate coordinate
        const currentLat = restLat + (destLat - restLat) * (progress / 100);
        const currentLng = restLng + (destLng - restLng) * (progress / 100);

        // Send via WebSocket
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            latitude: parseFloat(currentLat.toFixed(6)),
            longitude: parseFloat(currentLng.toFixed(6))
          }));
        }

        // Update local map marker
        if (riderMarkerRef.current && mapRef.current) {
          const latLng = new L.LatLng(currentLat, currentLng);
          riderMarkerRef.current.setLatLng(latLng);
          mapRef.current.panTo(latLng);
        }

        if (progress >= 100) {
          stopSimulation();
          setSuccess("Journey complete! You have arrived at the customer location.");
        }
      }, 2000);
    };

    socket.onerror = (err) => {
      console.error("Rider WS Connection error:", err);
      setError("WebSocket connection error. Location updates may fail.");
    };

    socket.onclose = () => {
    };
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-secondary text-sm mt-4">Loading Rider Portal...</span>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-surface pt-24 sm:pt-32 pb-16 sm:pb-24 px-3 sm:px-6 overflow-x-hidden">
      <div className="container mx-auto max-w-5xl space-y-6 sm:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/10 pb-6">
          <div>
            <span className="text-primary font-semibold text-xs uppercase tracking-widest block">Rider Companion Portal</span>
            <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold text-on-surface">Delivery Console</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="p-3 border border-outline-variant/20 hover:bg-surface-container text-secondary rounded-2xl transition-all cursor-pointer flex items-center justify-center active:scale-95 bg-white"
              title="Refresh console data"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-4 bg-surface-container-lowest border border-outline-variant/20 px-3 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">Status:</span>
              {profile && (
                <button
                  onClick={toggleOnlineStatus}
                  disabled={updatingProfile}
                  className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                    profile.is_online
                      ? "bg-tertiary/10 text-tertiary border border-tertiary/30 hover:bg-tertiary/20"
                      : "bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25"
                  }`}
                >
                  {updatingProfile ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span className={`w-2.5 h-2.5 rounded-full ${profile.is_online ? "bg-tertiary animate-pulse" : "bg-secondary"}`}></span>
                      <span>{profile.is_online ? "Online" : "Offline"}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* Left panel: Active Deliveries or History */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* View Mode Switcher */}
            <div className="flex gap-4 border-b border-outline-variant/15 pb-2">
              <button
                onClick={() => setViewMode("active")}
                className={`pb-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider relative cursor-pointer ${
                  viewMode === "active" ? "text-primary border-b-2 border-primary" : "text-secondary hover:text-on-surface"
                }`}
              >
                Active Tasks ({activeOrders.length})
              </button>
              <button
                onClick={() => setViewMode("history")}
                className={`pb-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider relative cursor-pointer ${
                  viewMode === "history" ? "text-primary border-b-2 border-primary" : "text-secondary hover:text-on-surface"
                }`}
              >
                Delivery History ({completedOrders.length})
              </button>
            </div>

            {/* Active Tasks List */}
            {viewMode === "active" && (
              <div className="space-y-6">
                {activeOrders.length === 0 ? (
                  <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-10 text-center space-y-4">
                    <span className="material-symbols-outlined text-4xl text-secondary/35">motorcycle</span>
                    <h3 className="font-display font-bold text-on-surface">No Assigned Deliveries</h3>
                    <p className="text-secondary text-xs font-light max-w-sm mx-auto">
                      {profile?.is_online
                        ? "You are currently online. Waiting for restaurants to mark orders as Ready to assign them to you."
                        : "Go online from the status toggle at the top right to start receiving order delivery tasks."}
                    </p>
                  </div>
                ) : (
                  activeOrders.map((order) => (
                    <div key={order.id} className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6 relative overflow-hidden">
                      {order.status === "out_for_delivery" && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary-orange"></div>
                      )}

                      {/* Header info */}
                      <div className="flex justify-between items-start gap-4 pb-4 border-b border-outline-variant/10">
                        <div>
                          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Order ID</span>
                          <span className="font-display font-extrabold text-base text-on-surface">#{order.id}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Payment</span>
                          <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Paid (₹{parseFloat(order.total_amount).toFixed(2)})</span>
                        </div>
                      </div>

                      {/* Timeline Detail Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-xs font-light">
                        {/* Restaurant Location */}
                        <div className="space-y-2 md:border-r border-outline-variant/10 md:pr-2 pb-4 md:pb-0 border-b md:border-b-0">
                          <div className="flex items-center gap-1.5 text-primary font-bold">
                            <span className="material-symbols-outlined text-base">storefront</span>
                            Restaurant Pickup
                          </div>
                          <div>
                            <p className="font-bold text-on-surface text-sm">{order.restaurant_name}</p>
                            <p className="text-secondary mt-1">{order.restaurant_address || "Restaurant Address Details"}</p>
                          </div>
                        </div>

                        {/* Customer Delivery address */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-primary-orange font-bold">
                            <span className="material-symbols-outlined text-base">home</span>
                            Customer Dropoff
                          </div>
                          <div>
                            <p className="font-bold text-on-surface text-sm">{order.customer_email?.split("@")[0]}</p>
                            <p className="text-secondary mt-1">{order.delivery_address}</p>
                          </div>
                        </div>
                      </div>

                      {/* Cooking / Delivery Instructions */}
                      {order.notes && (
                        <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/15 text-xs text-on-surface font-light">
                          <strong className="font-bold text-[10px] text-secondary uppercase tracking-wider block mb-1">Notes / Instructions:</strong>
                          "{order.notes}"
                        </div>
                      )}

                      {/* Map Container - Only visible if Out For Delivery */}
                      {order.status === "out_for_delivery" && (
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">map</span>
                            Live Delivery Route Map
                          </label>
                          <div
                            id={mapContainerId}
                            className="w-full h-64 rounded-2xl border border-outline-variant/20 shadow-xs relative z-10"
                          ></div>
                        </div>
                      )}

                      {/* Simulation journey controls */}
                      {order.status === "out_for_delivery" && (
                        <div className="bg-primary/5 border border-dashed border-primary-orange/30 p-4 rounded-2xl space-y-3.5">
                          <div className="flex justify-between items-center text-xs font-bold text-on-surface">
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-primary-orange text-base animate-pulse">radar</span>
                              GPS Journey Simulator
                            </span>
                            <span className="font-mono text-primary">{simulationProgress}% Complete</span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-outline-variant/20 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-primary-orange h-full rounded-full transition-all duration-300"
                              style={{ width: `${simulationProgress}%` }}
                            ></div>
                          </div>

                          <div className="flex gap-2">
                            {simulatingOrderId !== order.id ? (
                              <button
                                onClick={() => startSimulation(order)}
                                className="px-4 py-2 bg-on-surface text-white hover:bg-primary-orange text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs"
                              >
                                Start Journey Simulation
                              </button>
                            ) : (
                              <button
                                onClick={stopSimulation}
                                className="px-4 py-2 bg-error text-white hover:bg-error/90 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs"
                              >
                                Stop Simulation
                              </button>
                            )}
                            <p className="text-[10px] text-secondary font-light mt-2.5 leading-tight">
                              Simulates coordinates flowing to customer's live tracking view.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
                        {order.status === "assigned" && !order.rider_accepted ? (
                          <div className="flex flex-col sm:flex-row gap-3 w-full justify-between items-start sm:items-center bg-amber-500/5 border border-amber-500/10 p-3 sm:p-4 rounded-2xl">
                            <span className="text-[11px] text-amber-800 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                              <span className="material-symbols-outlined text-[18px] animate-pulse">pending</span>
                              Pending Delivery Request
                            </span>
                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                              <button
                                onClick={() => handleRejectDelivery(order.id)}
                                disabled={updatingOrderStatus[order.id]}
                                className="flex-1 sm:flex-initial px-4 py-2 border border-error/20 text-error hover:bg-error-container text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleAcceptDelivery(order.id)}
                                disabled={updatingOrderStatus[order.id]}
                                className="flex-1 sm:flex-initial px-4 py-2 bg-tertiary hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
                              >
                                Accept
                              </button>
                            </div>
                          </div>
                        ) : order.status === "assigned" && order.rider_accepted ? (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, "out_for_delivery")}
                            disabled={updatingOrderStatus[order.id]}
                            className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-primary-orange hover:bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm font-bold">directions_run</span>
                            {updatingOrderStatus[order.id] ? "Updating..." : "Pick Up Order / Start Journey"}
                          </button>
                        ) : null}
                        {order.status === "out_for_delivery" && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, "delivered")}
                            disabled={updatingOrderStatus[order.id]}
                            className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-tertiary hover:bg-tertiary-container text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm font-bold">done_all</span>
                            {updatingOrderStatus[order.id] ? "Updating..." : "Mark as Delivered"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Delivery History List */}
            {viewMode === "history" && (
              <div className="space-y-4">
                {completedOrders.length === 0 ? (
                  <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-10 text-center space-y-4">
                    <span className="material-symbols-outlined text-4xl text-secondary/35">receipt_long</span>
                    <h3 className="font-display font-bold text-on-surface">No Completed Deliveries</h3>
                    <p className="text-secondary text-xs font-light max-w-sm mx-auto">
                      Completed tasks will appear here after you mark orders as delivered to customers.
                    </p>
                  </div>
                ) : (
                  completedOrders.map((order) => (
                    <div key={order.id} className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-5 shadow-xs flex justify-between items-center gap-4 text-xs font-light">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface">Order #{order.id}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-tertiary/10 text-tertiary">
                            {order.status}
                          </span>
                        </div>
                        <p className="text-secondary mt-1 font-semibold">{order.restaurant_name}</p>
                        <p className="text-secondary/60 mt-0.5">{order.delivery_address?.substring(0, 45)}...</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-on-surface text-sm">₹{parseFloat(order.total_amount).toFixed(2)}</p>
                        <p className="text-secondary/50 text-[10px] mt-1">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>

          {/* Right panel: Rider Profile Info Card */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 shadow-sm space-y-6">
              <h2 className="font-display text-base font-bold text-on-surface pb-3 border-b border-outline-variant/10">Rider Profile</h2>
              
              {profile ? (
                <div className="space-y-5 text-xs font-medium text-secondary">
                  
                  {/* Avatar/Details */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl font-bold">sports_motorsports</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface leading-tight">{user?.email?.split("@")[0]}</h4>
                      <p className="text-secondary/60 font-light mt-0.5">{user?.email}</p>
                    </div>
                  </div>

                  {/* Details info fields */}
                  <div className="space-y-3.5 pt-3 border-t border-outline-variant/10">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60 block mb-1">Phone Number</span>
                      <span className="text-on-surface font-semibold">{user?.phone_number}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60 block mb-1">Vehicle License Plate</span>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          placeholder="e.g. DL-3S-AQ-4210"
                          value={vehicleInput}
                          onChange={(e) => setVehicleInput(e.target.value)}
                          className="w-full bg-surface border border-outline-variant/20 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-orange/50 text-on-surface"
                        />
                        <button
                          onClick={() => handleUpdateProfile({ vehicle_number: vehicleInput })}
                          disabled={updatingProfile}
                          className="px-3 bg-on-surface hover:bg-primary-orange text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60 block mb-1">Total Completed Trips</span>
                      <span className="text-on-surface font-bold text-sm">{completedOrders.length} Trips</span>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-4 text-secondary/60 text-xs">No profile details available.</div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default RiderDashboard;
