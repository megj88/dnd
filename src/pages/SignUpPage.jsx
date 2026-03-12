import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthPages.css";

export default function SignUpPage() {
  const { signUp, signInWithGoogle, signInWithDiscord } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) return setError(error.message);
    setSuccess(true);
  };

  const handleGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  };

  const handleDiscord = async () => {
    const { error } = await signInWithDiscord();
    if (error) setError(error.message);
  };

  if (success) return (
    <div className="auth-wrap">
      <div className="auth-panel" style={{ textAlign: "center" }}>
        <div className="auth-success-icon">📜</div>
        <h2 className="auth-title">Check Your Scroll</h2>
        <p className="auth-sub">A confirmation has been sent to <strong>{email}</strong>. Click the link to activate your account.</p>
        <Link to="/login" className="auth-btn-primary" style={{ display: "block", marginTop: "24px", textDecoration: "none", textAlign: "center" }}>
          Back to Sign In
        </Link>
      </div>
    </div>
  );

  return (
    <div className="auth-wrap">
      <div className="auth-panel">
        <div className="auth-eyebrow">The Tavern Board</div>
        <h1 className="auth-title">Join the<br /><span>Adventurers Guild</span></h1>
        <p className="auth-sub">Create your account and find your party.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="············"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">Confirm Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="············"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>
          <button className="auth-btn-primary" type="submit" disabled={loading}>
            {loading ? "Forging your account..." : "Create Account →"}
          </button>
        </form>

        <div className="auth-divider"><span>or continue with</span></div>

        <div className="auth-oauth">
          <button className="auth-btn-oauth" onClick={handleGoogle}>
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width="18" />
            Google
          </button>
          <button className="auth-btn-oauth discord" onClick={handleDiscord}>
            <img src="https://www.svgrepo.com/show/353655/discord-icon.svg" alt="Discord" width="18" />
            Discord
          </button>
        </div>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}