import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

// Components & guards
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOTP from "./pages/VerifyOTP";
import CustomerDashboard from "./pages/CustomerDashboard";
import RestaurantMenu from "./pages/RestaurantMenu";
import CartPage from "./pages/CartPage";
import OrderHistory from "./pages/OrderHistory";
import TrackOrder from "./pages/TrackOrder";
import OwnerDashboard from "./pages/OwnerDashboard";
import MenuManager from "./pages/MenuManager";
import OrderQueue from "./pages/OrderQueue";
import RiderDashboard from "./pages/RiderDashboard";

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <div className="flex flex-col min-h-screen bg-surface">
            {/* Header */}
            <Navbar />
            
            {/* Content body */}
            <div className="flex-grow">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-otp" element={<VerifyOTP />} />
                
                {/* Protected customer routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRole="customer">
                      <CustomerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/restaurant/:restaurantId"
                  element={
                    <ProtectedRoute allowedRole="customer">
                      <RestaurantMenu />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute allowedRole="customer">
                      <CartPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute allowedRole="customer">
                      <OrderHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/track-order/:orderId"
                  element={
                    <ProtectedRoute allowedRole="customer">
                      <TrackOrder />
                    </ProtectedRoute>
                  }
                />
                
                {/* Protected restaurant owner routes */}
                <Route
                  path="/owner/dashboard"
                  element={
                    <ProtectedRoute allowedRole="restaurant_owner">
                      <OwnerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/owner/restaurant/:restaurantId/menu"
                  element={
                    <ProtectedRoute allowedRole="restaurant_owner">
                      <MenuManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/owner/restaurant/:restaurantId/orders"
                  element={
                    <ProtectedRoute allowedRole="restaurant_owner">
                      <OrderQueue />
                    </ProtectedRoute>
                  }
                />
                
                {/* Protected delivery partner routes */}
                <Route
                  path="/delivery/dashboard"
                  element={
                    <ProtectedRoute allowedRole="delivery_partner">
                      <RiderDashboard />
                    </ProtectedRoute>
                  }
                />
                
                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            
            {/* Footer */}
            <Footer />
          </div>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
