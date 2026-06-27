import React, { useState, useEffect, useRef, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const VerifyOTP = () => {
  const { verifyOtp, resendOtp } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  // Get email from router navigation state (passed from Register page)
  const [email, setEmail] = useState(location.state?.email || "");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // References for OTP input elements
  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // Countdown effect
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Handle OTP digit changes
  const handleDigitChange = (index, value) => {
    // Only allow single digit
    if (value.length > 1) {
      value = value.charAt(value.length - 1);
    }

    const updated = [...otpDigits];
    updated[index] = value;
    setOtpDigits(updated);

    // Auto-focus next input if not the last box
    if (value !== "" && index < 5) {
      inputRefs[index + 1].current.focus();
    }
  };

  // Handle backspace key to move focus back
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && otpDigits[index] === "" && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  // Submit OTP
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    const otpCode = otpDigits.join("");
    if (otpCode.length < 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    if (!email) {
      setError("Email address is required.");
      return;
    }

    setLoading(true);
    try {
      const userProfile = await verifyOtp(email, otpCode);
      setSuccess("Account verified successfully!");
      
      // Redirect based on user role
      setTimeout(() => {
        if (userProfile?.role === "restaurant_owner") {
          navigate("/owner/dashboard");
        } else if (userProfile?.role === "delivery_partner") {
          navigate("/delivery/dashboard");
        } else {
          navigate("/dashboard");
        }
      }, 1500);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Verification failed. Incorrect OTP.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (timer > 0) return;
    setError("");
    setSuccess("");

    if (!email) {
      setError("Email address is required to resend OTP.");
      return;
    }

    setLoading(true);
    try {
      await resendOtp(email);
      setSuccess("A new OTP has been sent to your email.");
      setTimer(60); // Reset timer to 60 seconds
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Failed to resend OTP.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center pt-24 pb-12 px-6">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 shadow-xl relative overflow-hidden">
        
        <div className="text-center mb-8">
          <span className="font-display text-2xl font-extrabold text-primary tracking-tight">QuickBite</span>
          <h2 className="font-display text-xl font-bold text-on-surface mt-4 font-display">Verify Account</h2>
          <p className="text-secondary text-xs mt-2 font-light">
            We have sent a 6-digit verification code to your email.
          </p>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email input (editable if not passed in routing state) */}
          {!location.state?.email && (
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                Confirm Email
              </label>
              <div className="flex items-center bg-surface-container rounded-xl px-4 border border-outline-variant/20 focus-within:border-primary-orange transition-all">
                <span className="material-symbols-outlined text-secondary text-lg">mail</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent border-none py-3.5 px-3 focus:ring-0 text-sm outline-none text-on-surface"
                />
              </div>
            </div>
          )}

          {/* OTP Digit Boxes */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider text-center mb-2">
              Verification Code
            </label>
            <div className="flex justify-between gap-2 max-w-sm mx-auto">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  maxLength="1"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 bg-surface-container border border-outline-variant/20 focus:border-primary-orange text-center text-lg font-bold text-on-surface rounded-xl outline-none focus:ring-1 focus:ring-primary-orange/30"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-orange text-white font-bold rounded-xl shadow-md hover:bg-primary transition-all active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-wider mt-4"
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-outline-variant/10 text-xs text-secondary">
          Didn't receive the code?{" "}
          {timer > 0 ? (
            <span className="text-secondary/50 font-bold">
              Resend in {timer}s
            </span>
          ) : (
            <button
              onClick={handleResend}
              disabled={loading}
              className="text-primary-orange font-bold hover:underline"
            >
              Resend OTP
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
