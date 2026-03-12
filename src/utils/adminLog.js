import { supabase } from "../supabaseClient";

export async function logAdminAction({ adminId, action, targetType, targetId, details }) {
  await supabase.from("activity_logs").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  });
}