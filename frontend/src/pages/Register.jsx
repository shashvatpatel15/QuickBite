import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Register = () => {
  const { user, register } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === "restaurant_owner") {
        navigate("/owner/dashboard");
      } else if (user.role === "delivery_partner") {
        navigate("/delivery/dashboard");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState({
    email: "",
    phone_number: "",
    role: "customer",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelect = (role) => {
    setFormData({ ...formData, role });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { email, phone_number, role, password, confirmPassword } = formData;

    if (!email || !phone_number || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    // Validate phone number format
    const digitsOnly = phone_number.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setError("Phone number must be at least 10 digits.");
      return;
    }

    if (digitsOnly.length > 15) {
      setError("Phone number must not exceed 15 digits.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register(email, phone_number, role, password);
      setSuccess("Account created successfully! Verification OTP sent.");
      // Redirect to OTP verification after 2 seconds
      setTimeout(() => {
        navigate("/verify-otp", { state: { email } });
      }, 1500);
    } catch (err) {
      console.error(err);
      
      // Handle detailed error responses from backend
      let msg = "Registration failed. Please check your inputs.";
      
      if (err.response?.data) {
        // Check for field-specific errors
        if (err.response.data.email) {
          msg = Array.isArray(err.response.data.email) 
            ? err.response.data.email[0] 
            : err.response.data.email;
        } else if (err.response.data.phone_number) {
          msg = Array.isArray(err.response.data.phone_number)
            ? err.response.data.phone_number[0]
            : err.response.data.phone_number;
        } else if (err.response.data.password) {
          msg = Array.isArray(err.response.data.password)
            ? err.response.data.password[0]
            : err.response.data.password;
        } else if (err.response.data.error) {
          msg = err.response.data.error;
        } else if (typeof err.response.data === 'object') {
          // Show first available error from the response
          const firstError = Object.values(err.response.data)[0];
          if (Array.isArray(firstError)) {
            msg = firstError[0];
          } else {
            msg = firstError || msg;
          }
        }
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center pt-24 pb-12 px-6">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 shadow-xl relative overflow-hidden">
        {/* Decorative subtle gradient */}
        <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary-orange/5 rounded-full blur-2xl"></div>

        <div className="text-center mb-8">
          <span className="font-display text-2xl font-extrabold text-primary tracking-tight">QuickBite</span>
          <h2 className="font-display text-xl font-bold text-on-surface mt-4">Create Account</h2>
          <p className="text-secondary text-xs mt-2 font-light">Join us to experience gourmet culinary experiences delivered fresh.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-container text-error rounded-xl text-xs font-semibold border border-error/10">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-tertiary-container/10 text-tertiary text-xs font-semibold rounded-xl border border-tertiary/10">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider">I want to join as a:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRoleSelect("customer")}
                className={`py-3 rounded-xl text-[10px] sm:text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                  formData.role === "customer"
                    ? "bg-primary text-on-primary border-primary shadow-md"
                    : "bg-surface-container border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-sm">person</span>
                Customer
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect("restaurant_owner")}
                className={`py-3 rounded-xl text-[10px] sm:text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                  formData.role === "restaurant_owner"
                    ? "bg-primary text-on-primary border-primary shadow-md"
                    : "bg-surface-container border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-sm">storefront</span>
                Restaurant Dashboard
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect("delivery_partner")}
                className={`py-3 rounded-xl text-[10px] sm:text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                  formData.role === "delivery_partner"
                    ? "bg-primary text-on-primary border-primary shadow-md"
                    : "bg-surface-container border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-sm">motorcycle</span>
                Rider
              </button>
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Email Address</label>
            <div className="flex items-center bg-surface-container rounded-xl px-4 border border-outline-variant/20 focus-within:border-primary-orange transition-all">
              <span className="material-symbols-outlined text-secondary text-lg">mail</span>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full bg-transparent border-none py-3.5 px-3 focus:ring-0 text-sm outline-none text-on-surface"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Phone Number</label>
            <div className="flex items-center bg-surface-container rounded-xl px-4 border border-outline-variant/20 focus-within:border-primary-orange transition-all">
              <span className="material-symbols-outlined text-secondary text-lg">call</span>
              <input
                type="tel"
                name="phone_number"
                placeholder="+15551234567"
                value={formData.phone_number}
                onChange={handleChange}
                required
                className="w-full bg-transparent border-none py-3.5 px-3 focus:ring-0 text-sm outline-none text-on-surface"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Password</label>
            <div className="flex items-center bg-surface-container rounded-xl px-4 border border-outline-variant/20 focus-within:border-primary-orange transition-all">
              <span className="material-symbols-outlined text-secondary text-lg">lock</span>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full bg-transparent border-none py-3.5 px-3 focus:ring-0 text-sm outline-none text-on-surface"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Confirm Password</label>
            <div className="flex items-center bg-surface-container rounded-xl px-4 border border-outline-variant/20 focus-within:border-primary-orange transition-all">
              <span className="material-symbols-outlined text-secondary text-lg">lock</span>
              <input
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full bg-transparent border-none py-3.5 px-3 focus:ring-0 text-sm outline-none text-on-surface"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-orange text-white font-bold rounded-xl shadow-md hover:bg-primary transition-all active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-wider mt-4"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-outline-variant/10 text-xs text-secondary">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-orange font-bold hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
