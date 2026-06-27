import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api";
import L from "leaflet";

const TrackOrder = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Rider Live Coordinates
  const [riderCoords, setRiderCoords] = useState(null);

  // Call simulator state
  const [callingDriver, setCallingDriver] = useState(false);

  // Leaflet Map Refs
  const mapRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const mapContainerId = "customer-track-map";

  const fetchOrderStatus = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await API.get(`/api/orders/${orderId}/`);
      const orderData = response.data;
      setOrder(orderData);
      
      // Seed initial rider coordinates if available
      if (orderData.delivery_partner?.current_latitude && orderData.delivery_partner?.current_longitude && !riderCoords) {
        setRiderCoords({
          lat: parseFloat(orderData.delivery_partner.current_latitude),
          lng: parseFloat(orderData.delivery_partner.current_longitude)
        });
      }
      
      setError(null);
    } catch (err) {
      console.error("Failed to fetch order status:", err);
      setError("Could not retrieve tracking details.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderStatus(true);
    
    const token = localStorage.getItem("accessToken");
    if (!token) {
      return;
    }

    const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const wsProtocol = apiBaseURL.startsWith("https") ? "wss" : "ws";
    const wsHost = apiBaseURL.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}://${wsHost}/ws/orders/${orderId}/?token=${token}`;

    let socket = null;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === "LOCATION_UPDATE") {
            // Live Rider Coordinate Update
            const riderLat = parseFloat(data.latitude);
            const riderLng = parseFloat(data.longitude);
            if (!isNaN(riderLat) && !isNaN(riderLng)) {
              setRiderCoords({ lat: riderLat, lng: riderLng });
            }
          } else {
            // Re-fetch order status for state changes (e.g., pending -> confirmed -> preparing, etc.)
            fetchOrderStatus(false);
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
        console.error("Customer WS error:", error);
      };
    };

    connectWebSocket();

    // Fallback polling every 30 seconds
    const interval = setInterval(() => {
      fetchOrderStatus(false);
    }, 30000);

    return () => {
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(interval);
    };
  }, [orderId]);

  // Leaflet Route Map initialization & update
  useEffect(() => {
    const isMapActive = order && (order.status === "ready" || order.status === "assigned" || order.status === "out_for_delivery");
    
    if (!isMapActive) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      riderMarkerRef.current = null;
      return;
    }

    const restLat = parseFloat(order.restaurant_latitude) || 28.6139;
    const restLng = parseFloat(order.restaurant_longitude) || 77.2090;
    const destLat = parseFloat(order.customer_latitude) || 28.6250;
    const destLng = parseFloat(order.customer_longitude) || 77.2200;

    // Current rider coordinates
    const hasRider = order.status === "assigned" || order.status === "out_for_delivery";
    const rLat = hasRider ? (riderCoords?.lat || parseFloat(order.delivery_partner?.current_latitude) || restLat) : restLat;
    const rLng = hasRider ? (riderCoords?.lng || parseFloat(order.delivery_partner?.current_longitude) || restLng) : restLng;

    setTimeout(() => {
      const container = document.getElementById(mapContainerId);
      if (!container) return;

      const riderIcon = L.divIcon({
        html: '<div style="background-color: #196b00; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4);"><span class="material-symbols-outlined" style="font-size: 20px;">motorcycle</span></div>',
        className: 'custom-leaflet-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      if (!mapRef.current) {
        // Initialize Map
        const map = L.map(mapContainerId).setView([restLat, restLng], 14);
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Icons
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

        // Markers
        L.marker([restLat, restLng], { icon: restaurantIcon }).addTo(map).bindPopup("<b>Restaurant:</b> " + order.restaurant_name);
        L.marker([destLat, destLng], { icon: customerIcon }).addTo(map).bindPopup("<b>Delivery Location</b>");
        
        if (hasRider) {
          const rMarker = L.marker([rLat, rLng], { icon: riderIcon }).addTo(map).bindPopup("<b>Rider Position</b>");
          riderMarkerRef.current = rMarker;
        }

        // Path
        const routeLine = L.polyline([[restLat, restLng], [destLat, destLng]], {
          color: '#ff5200',
          weight: 4,
          opacity: 0.6,
          dashArray: '10, 10'
        }).addTo(map);

        map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
      } else {
        // Map initialized, update rider marker position
        if (riderMarkerRef.current) {
          const latLng = new L.LatLng(rLat, rLng);
          riderMarkerRef.current.setLatLng(latLng);
          
          if (!mapRef.current.getBounds().contains(latLng)) {
            mapRef.current.panTo(latLng);
          }
        } else if (hasRider && mapRef.current) {
          const rMarker = L.marker([rLat, rLng], { icon: riderIcon }).addTo(mapRef.current).bindPopup("<b>Rider Position</b>");
          riderMarkerRef.current = rMarker;
        }
      }
    }, 100);
  }, [order, riderCoords]);

  const steps = [
    { key: "pending", label: "Order Placed", desc: "Waiting for restaurant approval." },
    { key: "confirmed", label: "Confirmed", desc: "Restaurant accepted your order." },
    { key: "preparing", label: "Preparing", desc: "Our chefs are cooking your meal." },
    { key: "out_for_delivery", label: "Out for Delivery", desc: "Rider has picked up your food." },
    { key: "delivered", label: "Delivered", desc: "Enjoy your fresh meal!" },
  ];

  const getStepIndex = (status) => {
    switch (status?.toLowerCase()) {
      case "pending": return 0;
      case "confirmed": return 1;
      case "preparing": return 2;
      case "ready": return 2; // Prepared, waiting for rider
      case "assigned": return 2; // Rider assigned, picking up
      case "out_for_delivery": return 3;
      case "delivered": return 4;
      default: return -1;
    }
  };

  const currentStepIndex = getStepIndex(order?.status);
  const isCancelled = order?.status === "cancelled";

  const getStatusBannerMessage = () => {
    switch (order?.status?.toLowerCase()) {
      case "pending":
        return "Waiting for restaurant to confirm your order...";
      case "confirmed":
        return "Order confirmed! The kitchen will start preparing it soon.";
      case "preparing":
        return "Your food is being prepared in the kitchen.";
      case "ready":
        return "Your order is prepared! The kitchen is assigning a delivery partner...";
      case "assigned":
        return `Delivery partner ${order.delivery_partner?.name || ""} is assigned and heading to pick up your order.`;
      case "out_for_delivery":
        return "Out for delivery! Your rider is bringing your fresh meal.";
      case "delivered":
        return "Delivered! Enjoy your meal.";
      default:
        return "Tracking order progress...";
    }
  };

  const getStatusBannerStyle = () => {
    switch (order?.status?.toLowerCase()) {
      case "pending":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "confirmed":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "preparing":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "ready":
        return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 animate-pulse";
      case "assigned":
        return "bg-teal-500/10 text-teal-600 border-teal-500/20";
      case "out_for_delivery":
        return "bg-primary/10 text-primary border-primary/20";
      case "delivered":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  const handleCallDriver = () => {
    if (order?.delivery_partner) {
      setCallingDriver(true);
    }
  };

  // Get dynamic ETA based on step
  const getETA = () => {
    if (order?.status === "delivered") return "Delivered!";
    if (order?.status === "cancelled") return "Cancelled";
    switch (order?.status?.toLowerCase()) {
      case "pending": return "35 mins";
      case "confirmed": return "30 mins";
      case "preparing": return "25 mins";
      case "ready": return "20 mins";
      case "assigned": return "15 mins";
      case "out_for_delivery": return "10 mins";
      default: return "30-45 minutes";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-secondary text-sm mt-4">Retrieving tracking timeline...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center items-center px-6">
        <span className="material-symbols-outlined text-4xl text-error mb-4">error</span>
        <p className="text-on-surface font-semibold text-center">{error || "Order not found."}</p>
        <Link
          to="/orders"
          className="mt-6 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider"
        >
          View Order History
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pt-32 pb-24 px-6">
      <div className="container mx-auto max-w-3xl space-y-8">
        
        {/* VoIP Call Simulator Overlay */}
        {callingDriver && order.delivery_partner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xs">
            <div className="bg-surface-container-lowest max-w-xs w-full rounded-3xl p-8 text-center space-y-6 shadow-2xl border border-outline-variant/10 animate-[slideIn_0.2s_ease-out]">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto relative">
                <span className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></span>
                <span className="material-symbols-outlined text-4xl">call</span>
              </div>
              
              <div className="space-y-1">
                <h3 className="font-display font-extrabold text-lg text-on-surface">Calling...</h3>
                <p className="text-secondary font-display font-bold text-sm">{order.delivery_partner.name}</p>
                <p className="text-xs text-secondary/60 font-light mt-1">Connecting securely via VoIP</p>
              </div>

              {/* Sound wave bounce visual */}
              <div className="flex justify-center items-center gap-1.5 h-6">
                <span className="w-1.5 h-3 bg-primary rounded-full animate-bounce"></span>
                <span className="w-1.5 h-4 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>

              <button
                onClick={() => setCallingDriver(false)}
                className="w-full py-4 bg-error text-white hover:bg-error/90 transition-all text-xs font-bold uppercase tracking-widest rounded-2xl shadow-md cursor-pointer active:scale-95"
              >
                Hang Up
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-primary font-semibold text-xs uppercase tracking-widest block">Live tracking</span>
            <h1 className="font-display text-2xl lg:text-3xl font-extrabold text-on-surface">Order #{order.id}</h1>
          </div>
          <div className="flex gap-3 flex-wrap">
            {order.invoice_url && (
              <a
                href={order.invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 border border-[#ff5200] text-[#ff5200] hover:bg-[#ff5200]/5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm text-center cursor-pointer"
                title="Download invoice PDF"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Download Bill
              </a>
            )}
            <button
              onClick={() => fetchOrderStatus(false)}
              className="px-5 py-2.5 border border-outline-variant/30 text-secondary hover:bg-surface-container rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Refresh Status
            </button>
            <Link
              to="/orders"
              className="px-5 py-2.5 bg-on-surface text-white hover:bg-primary transition-all text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm text-center"
            >
              Order History
            </Link>
          </div>
        </div>

        {/* Status Banner */}
        {!isCancelled && (
          <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition-all shadow-xs ${getStatusBannerStyle()}`}>
            <span className="material-symbols-outlined text-base animate-bounce">info</span>
            <span>{getStatusBannerMessage()}</span>
          </div>
        )}

        {/* Cancelled Alert */}
        {isCancelled ? (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center space-y-3">
            <span className="material-symbols-outlined text-red-600 text-5xl">cancel</span>
            <h2 className="text-lg font-bold text-red-950 font-display">Order Cancelled</h2>
            <p className="text-red-800 text-sm font-light max-w-sm mx-auto">
              This order has been cancelled. If you did not initiate this, please check with the restaurant or support.
            </p>
          </div>
        ) : (
          /* Live Progress Timeline */
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-8 shadow-sm space-y-12">
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              
              {/* Desktop Connecting Line */}
              <div className="absolute left-6 right-6 top-8 h-[2px] bg-outline-variant/20 -z-10 hidden md:block"></div>
              
              {/* Mobile Connecting Line */}
              <div className="absolute left-6 top-8 bottom-8 w-[2px] bg-outline-variant/20 -z-10 block md:hidden"></div>
              
              {steps.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isActive = idx === currentStepIndex;
                
                return (
                  <div key={step.key} className="flex md:flex-col items-center gap-4 md:gap-3 flex-1 w-full text-left md:text-center">
                    
                    {/* Circle Node */}
                    <div
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                        isCompleted
                          ? "bg-primary border-primary text-white"
                          : "bg-white border-outline-variant/30 text-secondary"
                      } ${isActive ? "ring-4 ring-primary-orange/20 animate-pulse" : ""}`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {idx === 0 && "shopping_bag"}
                        {idx === 1 && "thumb_up"}
                        {idx === 2 && "restaurant"}
                        {idx === 3 && "motorcycle"}
                        {idx === 4 && "home"}
                      </span>
                    </div>

                    {/* Step Content */}
                    <div className="space-y-1">
                      <p
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isCompleted ? "text-on-surface" : "text-secondary/50"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[10px] text-secondary font-light max-w-[150px] leading-tight">
                        {step.desc}
                      </p>
                    </div>

                  </div>
                );
              })}

            </div>
          </div>
        )}

        {/* Live Route Map for ready/assigned/out_for_delivery status */}
        {!isCancelled && (order.status === "ready" || order.status === "assigned" || order.status === "out_for_delivery") && (
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display text-sm font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary-orange animate-pulse">radar</span>
              {order.status === "ready" ? "Locating Delivery Rider..." : "Live Delivery Route Map"}
            </h3>
            <div
              id={mapContainerId}
              className="w-full h-80 rounded-2xl border border-outline-variant/20 shadow-xs relative z-10"
            ></div>
          </div>
        )}

        {/* Real Delivery Partner Details Card */}
        {!isCancelled && order.delivery_partner && (
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-primary/5 to-transparent"></div>
            
            <div className="flex items-center gap-4 z-10 w-full sm:w-auto">
              <div className="w-16 h-16 rounded-full bg-surface-container border border-outline-variant/35 flex-shrink-0 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-3xl">sports_motorsports</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-tertiary/15 text-tertiary text-[10px] font-bold uppercase rounded-full tracking-wider">
                    Rider Assigned
                  </span>
                </div>
                <h3 className="font-display font-extrabold text-base text-on-surface">{order.delivery_partner.name}</h3>
                <p className="text-secondary text-xs font-light">Vehicle: {order.delivery_partner.vehicle_number || "Motorbike"}</p>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-secondary">
                  <span className="flex items-center gap-0.5 text-primary-orange">
                    <span className="material-symbols-outlined text-[11px] fill-current">star</span>
                    4.9
                  </span>
                  <span>•</span>
                  <span>Active Delivery Partner</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end z-10 border-t sm:border-t-0 pt-4 sm:pt-0">
              <button
                onClick={handleCallDriver}
                className="flex items-center gap-2 px-5 py-3 bg-on-surface text-white hover:bg-primary-orange hover:shadow-md transition-all text-xs font-bold uppercase tracking-wider rounded-2xl shadow-xs cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">call</span>
                Call Partner
              </button>
            </div>
          </div>
        )}

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Items card */}
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display text-sm font-bold text-on-surface pb-3 border-b border-outline-variant/10">Ordered Items</h3>
            <div className="space-y-3">
              {order.items?.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm font-light text-on-surface">
                  <span>
                    {item.item_name} <strong className="font-semibold ml-1">x {item.quantity}</strong>
                  </span>
                  <span className="font-medium">₹{parseFloat(item.total_price).toFixed(2)}</span>
                </div>
              ))}
              
              <div className="pt-3 border-t border-outline-variant/10 flex justify-between font-display text-base font-extrabold text-on-surface">
                <span>Total Amount</span>
                <span className="text-primary">₹{parseFloat(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Delivery Details card */}
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display text-sm font-bold text-on-surface pb-3 border-b border-outline-variant/10">Delivery Details</h3>
            
            <div className="space-y-4">
              <div className="space-y-1 text-xs">
                <p className="font-bold text-secondary uppercase tracking-wider">Restaurant</p>
                <p className="font-semibold text-on-surface">{order.restaurant_name}</p>
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-bold text-secondary uppercase tracking-wider">Address</p>
                <p className="font-light text-on-surface leading-relaxed">{order.delivery_address}</p>
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-bold text-secondary uppercase tracking-wider">Estimated Delivery</p>
                <div className="flex items-center gap-1.5 text-on-surface font-semibold">
                  <span className="material-symbols-outlined text-primary text-base font-bold animate-pulse">schedule</span>
                  <span>{getETA()}</span>
                </div>
              </div>

              {order.notes && (
                <div className="space-y-1 text-xs pt-3 border-t border-outline-variant/10">
                  <p className="font-bold text-secondary uppercase tracking-wider">Special Instructions</p>
                  <p className="font-light text-on-surface italic">
                    "{order.notes}"
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default TrackOrder;
