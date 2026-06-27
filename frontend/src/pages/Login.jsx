import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Login = () => {
  const { user, login } = useContext(AuthContext);
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
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { email, password } = formData;
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const userProfile = await login(email, password);
      
      // Redirect based on user role
      if (userProfile?.role === "restaurant_owner") {
        navigate("/owner/dashboard");
      } else if (userProfile?.role === "delivery_partner") {
        navigate("/delivery/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      
      const errMsg = err.response?.data?.error || "Invalid email or password.";
      
      // If user is registered but not verified
      if (err.response?.status === 403 || errMsg.toLowerCase().includes("verify")) {
        setError("Your account is not verified. Redirecting to OTP verification...");
        setTimeout(() => {
          navigate("/verify-otp", { state: { email } });
        }, 1500);
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center pt-24 pb-12 px-6">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 shadow-xl relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary-orange/5 rounded-full blur-2xl"></div>

        <div className="text-center mb-8">
          <span className="font-display text-2xl font-extrabold text-primary tracking-tight">QuickBite</span>
          <h2 className="font-display text-xl font-bold text-on-surface mt-4">Welcome Back</h2>
          <p className="text-secondary text-xs mt-2 font-light">Login to order delicious gourmet meals right to your doorstep.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-container text-error rounded-xl text-xs font-semibold border border-error/10">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-orange text-white font-bold rounded-xl shadow-md hover:bg-primary transition-all active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-wider mt-4"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-outline-variant/10 text-xs text-secondary">
          Don't have an account yet?{" "}
          <Link to="/register" className="text-primary-orange font-bold hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
