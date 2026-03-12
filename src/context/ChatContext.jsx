import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";

const ChatContext = createContext({});

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchConversations();

    const channel = supabase
      .channel("chat-updates")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    const { data: memberRows } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read")
      .eq("user_id", user.id);

    if (!memberRows || memberRows.length === 0) {
      setConversations([]);
      return;
    }

    const convIds = memberRows.map(r => r.conversation_id);
    const lastReadMap = {};
    memberRows.forEach(r => lastReadMap[r.conversation_id] = r.last_read);

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds)
      .order("created_at", { ascending: false });

    if (!convs) return;

    // Get last message and member info for each conversation
    const enriched = await Promise.all(convs.map(async (conv) => {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, created_at, sender_id")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conv.id);

      const otherMemberIds = (members || [])
        .map(m => m.user_id)
        .filter(id => id !== user.id);

      let displayName = conv.name;
      if (conv.type === "direct" && otherMemberIds.length > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, favourite_class")
          .eq("id", otherMemberIds[0])
          .maybeSingle();
        displayName = profile?.display_name || profile?.favourite_class || "Adventurer";
      }

      const { count: unread } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .gt("created_at", lastReadMap[conv.id] || "1970-01-01");

      return {
        ...conv,
        displayName,
        lastMessage: lastMsg,
        unreadCount: unread || 0,
        members: members || [],
      };
    }));

    setConversations(enriched);
    setUnreadCount(enriched.reduce((sum, c) => sum + c.unreadCount, 0));
  };

  const openConversation = async (conversation) => {
    setActiveConversation(conversation);
    setIsOpen(true);
    // Mark as read
    await supabase
      .from("conversation_members")
      .update({ last_read: new Date().toISOString() })
      .eq("conversation_id", conversation.id)
      .eq("user_id", user.id);
    fetchConversations();
  };

  const startDirectMessage = async (otherUserId) => {
    if (!user) return;

    // Check if direct conversation already exists
    const { data: myMemberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    const { data: theirMemberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherUserId);

    const myIds = new Set((myMemberships || []).map(m => m.conversation_id));
    const sharedId = (theirMemberships || []).find(m => myIds.has(m.conversation_id));

    if (sharedId) {
      const existing = conversations.find(c => c.id === sharedId.conversation_id && c.type === "direct");
      if (existing) {
        openConversation(existing);
        return;
      }
    }

    // Create new direct conversation
    const { data: conv } = await supabase
      .from("conversations")
      .insert({ type: "direct" })
      .select()
      .single();

    if (!conv) return;

    await supabase.from("conversation_members").insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);

    await fetchConversations();
    const fresh = { ...conv, displayName: "Adventurer", lastMessage: null, unreadCount: 0 };
    openConversation(fresh);
  };

  return (
    <ChatContext.Provider value={{
      conversations, activeConversation, setActiveConversation,
      isOpen, setIsOpen, unreadCount,
      fetchConversations, openConversation, startDirectMessage,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);