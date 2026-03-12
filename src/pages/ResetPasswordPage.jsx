import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./AuthPages.css";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
  // Check if there's a token in the URL hash immediately
  const hash = window.location.hash;
  if (hash && hash.includes("type=recovery")) {
    setReady(true);
    return;
  }

  // Also listen for the auth state change as fallback
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      setReady(true);
    }
  });

  return () => subscription.unsubscribe();
}, []);

  const handleReset = async () => {
    setError("");
    setMsg("");

    if (!password.trim()) { setError("Please enter a new password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setMsg("Password updated! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-stars">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="auth-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 6}s`,
            animationDuration: `${Math.random() * 4 + 4}s`,
          }} />
        ))}
      </div>

      <div className="auth-card">
        <div className="auth-logo">⚔️</div>
        <div className="auth-title">The Tavern Board</div>
        <div className="auth-subtitle">Reset your password</div>

        {!ready ? (
          <div className="auth-reset-waiting">
            <p>Waiting for reset link verification...</p>
            <p className="auth-reset-waiting-sub">If this takes too long, try clicking the link in your email again.</p>
          </div>
        ) : (
          <div className="auth-form">
            <div className="auth-field">
              <label className="auth-label">New Password</label>
              <input
                className="auth-input"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Confirm Password</label>
              <input
                className="auth-input"
                type="password"
                placeholder="Repeat your new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleReset()}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}
            {msg && <div className="auth-reset-msg success">{msg}</div>}

            <button
              className="auth-submit-btn"
              onClick={handleReset}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        )}

        <button className="auth-switch-btn" onClick={() => navigate("/login")}>
          ← Back to Login
        </button>
      </div>
    </div>
  );
}