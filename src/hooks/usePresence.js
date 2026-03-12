import { useEffect } from "react";
import { supabase } from "../supabaseClient";

export function usePresence(userId) {
  useEffect(() => {
    if (!userId) return;

    const updatePresence = async () => {
      await supabase.from("user_presence").upsert({
        user_id: userId,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    };

    updatePresence();
    const interval = setInterval(updatePresence, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);
}