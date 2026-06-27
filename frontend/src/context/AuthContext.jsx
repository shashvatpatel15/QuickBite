import { createContext, useState, useEffect } from "react";
import API from "../api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile details
  const fetchUserProfile = async () => {
    try {
      const response = await API.get("/api/customer/profile/");
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      logout();
      return null;
    }
  };

  // Check login state on mount
  const [deliveryLocation, setDeliveryLocation] = useState(
    localStorage.getItem("deliveryLocation") || ""
  );

  const updateDeliveryLocation = (location) => {
    setDeliveryLocation(location);
    localStorage.setItem("deliveryLocation", location);
  };

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    const savedUser = localStorage.getItem("user");
    if (accessToken && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Login action
  const login = async (email, password) => {
    const response = await API.post("/api/auth/login/", { email, password });
    const { access, refresh } = response.data;
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
    
    // Fetch profile right after login
    const profile = await fetchUserProfile(access);
    return profile;
  };

  // Register action
  const register = async (email, phone_number, role, password, latitude = null, longitude = null) => {
    const response = await API.post("/api/auth/register/", {
      email,
      phone_number,
      role,
      password,
      latitude,
      longitude,
    });
    return response.data;
  };

  // Verify OTP action
  const verifyOtp = async (email, otp) => {
    const response = await API.post("/api/auth/verify-otp/", { email, otp });
    const { access, refresh } = response.data;
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
    
    const profile = await fetchUserProfile(access);
    return profile;
  };

  // Resend OTP action
  const resendOtp = async (email) => {
    const response = await API.post("/api/auth/resend-otp/", { email });
    return response.data;
  };

  // Logout action
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        deliveryLocation,
        updateDeliveryLocation,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
