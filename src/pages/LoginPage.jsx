import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import "./AuthPages.css";

export default function LoginPage() {
  const { signIn, signInWithGoogle, signInWithDiscord } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      return setError(error.message);
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .maybeSingle();

    setLoading(false);

    if (profile?.onboarding_complete) {
      navigate("/home");
    } else {
      navigate("/onboarding");
    }
  };

  const handleGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  };

  const handleDiscord = async () => {
    const { error } = await signInWithDiscord();
    if (error) setError(error.message);
  };

  const handleResetPassword = async () => {
  if (!resetEmail.trim()) return;
  setResetLoading(true);
  const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  setResetLoading(false);
  if (error) {
    setResetMsg("Something went wrong. Please try again.");
  } else {
    setResetMsg("Check your email for a reset link!");
  }
};

  return (
    <div className="auth-wrap">
      <div className="auth-panel">
        <div className="auth-eyebrow">The Tavern Board</div>
        <h1 className="auth-title">Welcome Back,<br /><span>Adventurer</span></h1>
        <p className="auth-sub">Your party awaits. Sign in to continue.</p>

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
          {!showReset ? (
  <button
    type="button"
    className="auth-forgot-btn"
    onClick={() => setShowReset(true)}
  >
    Forgot your password?
  </button>
) : (
  <div className="auth-reset-inline">
    <p className="auth-reset-inline-label">Enter your email to receive a reset link:</p>
    <input
      className="auth-input"
      type="email"
      placeholder="your@email.com"
      value={resetEmail}
      onChange={e => setResetEmail(e.target.value)}
    />
    {resetMsg && (
      <div className={`auth-reset-msg ${resetMsg.includes("Check") ? "success" : "error"}`}>
        {resetMsg}
      </div>
    )}
    <div className="auth-reset-inline-actions">
      <button
        type="button"
        className="auth-submit-btn"
        onClick={handleResetPassword}
        disabled={resetLoading || !resetEmail.trim()}
      >
        {resetLoading ? "Sending..." : "Send Reset Link"}
      </button>
      <button
        type="button"
        className="auth-forgot-btn"
        onClick={() => { setShowReset(false); setResetMsg(""); setResetEmail(""); }}
      >
        Cancel
      </button>
    </div>
  </div>
)}
          <button className="auth-btn-primary" type="submit" disabled={loading}>
            {loading ? "Entering the Tavern..." : "Sign In"}
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
          No account yet?{" "}
          <Link to="/signup" className="auth-link">Create one here</Link>
        </p>
      </div>
    </div>
  );
}