import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return navigate("/login", { replace: true });

      // Check if user has already completed onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", session.user.id)
        .single();

      if (profile?.onboarding_complete) {
        navigate("/home", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    });
  }, [navigate]);

  return (
    <div style={{ background: "#0a0608", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#c9a96e", fontFamily: "Cinzel, serif", letterSpacing: "0.2em" }}>
      Entering the Tavern...
    </div>
  );
}