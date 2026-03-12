import { supabase } from "../supabaseClient";

export const createNotification = async ({ userId, type, message, link }) => {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    message,
    link,
  });
};