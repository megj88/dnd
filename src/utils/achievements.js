import { supabase } from "../supabaseClient";
import { createNotification } from "./notify";

export const ACHIEVEMENTS = [
  { key:"first_post",        icon:"🗡️",  label:"First Steps",        desc:"Make your first post" },
  { key:"first_campaign",    icon:"⚔️",  label:"Battle Ready",       desc:"Join your first campaign" },
  { key:"first_rating",      icon:"🌟",  label:"Rising Star",        desc:"Receive your first rating" },
  { key:"sessions_5",        icon:"🎯",  label:"Sharpshooter",       desc:"Attend 5 sessions" },
  { key:"sessions_25",       icon:"🏆",  label:"Veteran",            desc:"Attend 25 sessions" },
  { key:"first_homebrew",    icon:"📜",  label:"Scribe",             desc:"Create your first homebrew" },
  { key:"homebrew_5",        icon:"📚",  label:"Loremaster",         desc:"Create 5 homebrew entries" },
  { key:"homebrew_3",        icon:"📖",  label:"Storyteller",        desc:"Create 3 homebrew entries" },
  { key:"first_friend",      icon:"🤝",  label:"Companion",          desc:"Make your first friend" },
  { key:"friends_3",         icon:"🎪",  label:"Social Butterfly",   desc:"Make 3 friends" },
  { key:"friends_5",         icon:"🎭",  label:"Party Leader",       desc:"Make 5 friends" },
  { key:"first_map",         icon:"🗺️",  label:"Cartographer",       desc:"Create your first map" },
  { key:"maps_5",            icon:"🌍",  label:"World Builder",      desc:"Create 5 maps" },
  { key:"first_character",   icon:"📋",  label:"Chronicle",          desc:"Create your first character sheet" },
  { key:"characters_5",      icon:"🧙",  label:"Master of Many",     desc:"Create 5 character sheets" },
  { key:"first_nudge",       icon:"👊",  label:"Nudge",              desc:"Give your first nudge" },
  { key:"nudges_10",         icon:"💫",  label:"Well Known",         desc:"Receive 10 nudges" },
  { key:"posts_10",          icon:"✨",  label:"Prolific",           desc:"Make 10 posts" },
  { key:"first_dm_campaign", icon:"🏰",  label:"Dungeon Master",     desc:"Create your first campaign" },
  { key:"legend",            icon:"💎",  label:"Legend",             desc:"Unlock 10 achievements" },
];

export async function checkAchievements(userId, action) {
  if (!userId) return [];

  const { data: existing } = await supabase
    .from("user_achievements")
    .select("achievement_key")
    .eq("user_id", userId);

  const unlocked = new Set((existing || []).map(a => a.achievement_key));
  const newlyUnlocked = [];

  const award = async (key) => {
    if (unlocked.has(key)) return;
    const { error } = await supabase.from("user_achievements").insert({ user_id: userId, achievement_key: key });
    if (!error) {
      unlocked.add(key);
      newlyUnlocked.push(key);
      const achievement = ACHIEVEMENTS.find(a => a.key === key);
      if (achievement) {
        await createNotification({
          userId,
          type: "message",
          message: `🏅 Achievement unlocked: ${achievement.label}!`,
          link: `/profile/${userId}`,
        });
      }
    }
  };

  if (action === "post" || action === "check_all") {
    const { count } = await supabase.from("posts").select("*", { count:"exact", head:true }).eq("user_id", userId);
    if (count >= 1) await award("first_post");
    if (count >= 10) await award("posts_10");
    const { count: dmCount } = await supabase.from("posts").select("*", { count:"exact", head:true }).eq("user_id", userId).eq("type", "campaign");
    if (dmCount >= 1) await award("first_dm_campaign");
  }

  if (action === "campaign" || action === "check_all") {
    const { count } = await supabase.from("applications").select("*", { count:"exact", head:true }).eq("applicant_id", userId).eq("status", "approved");
    if (count >= 1) await award("first_campaign");
  }

  if (action === "rating" || action === "check_all") {
    const { count } = await supabase.from("ratings").select("*", { count:"exact", head:true }).eq("reviewee_id", userId);
    if (count >= 1) await award("first_rating");
  }

  if (action === "session" || action === "check_all") {
    const { count } = await supabase.from("session_attendees").select("*", { count:"exact", head:true }).eq("user_id", userId).eq("rsvp", "going");
    if (count >= 5) await award("sessions_5");
    if (count >= 25) await award("sessions_25");
  }

  if (action === "homebrew" || action === "check_all") {
    const { count } = await supabase.from("homebrew").select("*", { count:"exact", head:true }).eq("user_id", userId);
    if (count >= 1) await award("first_homebrew");
    if (count >= 3) await award("homebrew_3");
    if (count >= 5) await award("homebrew_5");
  }

  if (action === "friend" || action === "check_all") {
    const { data: friendships } = await supabase.from("friendships").select("*").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).eq("status", "accepted");
    const count = (friendships || []).length;
    if (count >= 1) await award("first_friend");
    if (count >= 3) await award("friends_3");
    if (count >= 5) await award("friends_5");
  }

  if (action === "map" || action === "check_all") {
    const { count } = await supabase.from("maps").select("*", { count:"exact", head:true }).eq("user_id", userId);
    if (count >= 1) await award("first_map");
    if (count >= 5) await award("maps_5");
  }

  if (action === "character" || action === "check_all") {
    const { count } = await supabase.from("character_sheets").select("*", { count:"exact", head:true }).eq("user_id", userId);
    if (count >= 1) await award("first_character");
    if (count >= 5) await award("characters_5");
  }

  if (action === "nudge_given" || action === "check_all") {
    const { count } = await supabase.from("nudges").select("*", { count:"exact", head:true }).eq("sender_id", userId);
    if (count >= 1) await award("first_nudge");
  }

  if (action === "nudge_received" || action === "check_all") {
    const { count } = await supabase.from("nudges").select("*", { count:"exact", head:true }).eq("receiver_id", userId);
    if (count >= 10) await award("nudges_10");
  }

  // Check legend after all others
  if (unlocked.size >= 10) await award("legend");

  return newlyUnlocked;
}