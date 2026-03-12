import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { createNotification } from "../utils/notify";
import "./ChatWidget.css";

export default function ChatWidget() {
  const { user } = useAuth();
  const {
    conversations, activeConversation, setActiveConversation,
    isOpen, setIsOpen, unreadCount, openConversation, fetchConversations
  } = useChat();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [view, setView] = useState("list"); // "list" | "conversation"
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!activeConversation) return;
    fetchMessages();

    const channel = supabase
      .channel(`messages-${activeConversation.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConversation.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        scrollToBottom();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", activeConversation.id)
    .order("created_at", { ascending: true });

  if (!msgs || msgs.length === 0) {
    setMessages([]);
    return;
  }

  const userIds = [...new Set(msgs.map(m => m.sender_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, favourite_class, avatar_url")
    .in("id", userIds);

  const profileMap = {};
  (profiles || []).forEach(p => profileMap[p.id] = p);

  const enriched = msgs.map(m => ({
    ...m,
    profiles: profileMap[m.sender_id] || null,
  }));

  setMessages(enriched);
};

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
  if (!newMessage.trim() || sending) return;
  setSending(true);

  await supabase.from("messages").insert({
    conversation_id: activeConversation.id,
    sender_id: user.id,
    content: newMessage.trim(),
  });

  // Notify other members
  const otherMembers = (activeConversation.members || [])
    .filter(m => m.user_id !== user.id);

  const senderName = "Someone";
  for (const member of otherMembers) {
    await createNotification({
      userId: member.user_id,
      type: "message",
      message: `${senderName} sent you a message`,
      link: null,
    });
  }

  setNewMessage("");
  setSending(false);
  fetchConversations();
};

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openChat = (conv) => {
    openConversation(conv);
    setView("conversation");
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (mins > 0) return `${mins}m`;
    return "now";
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Floating button */}
      <button
        className="cw-toggle"
        onClick={() => { setIsOpen(!isOpen); setView("list"); }}
      >
        <span className="cw-toggle-icon">⚔️</span>
        {unreadCount > 0 && (
          <span className="cw-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="cw-panel">
          {/* Panel header */}
          <div className="cw-panel-header">
            {view === "conversation" && activeConversation ? (
              <>
                <button className="cw-back-btn" onClick={() => { setView("list"); setActiveConversation(null); }}>
                  ←
                </button>
                <div className="cw-panel-title">{activeConversation.displayName}</div>
              </>
            ) : (
              <div className="cw-panel-title">Messages</div>
            )}
            <button className="cw-close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          {/* Conversation list */}
          {view === "list" && (
            <div className="cw-list">
              {conversations.length === 0 ? (
                <div className="cw-empty">
                  <div className="cw-empty-icon">📜</div>
                  <p>No messages yet. Visit a player's profile to start a conversation.</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`cw-conv-row ${conv.unreadCount > 0 ? "unread" : ""}`}
                    onClick={() => openChat(conv)}
                  >
                    <div className="cw-conv-avatar">
                      {conv.type === "group" ? "⚔️" : conv.displayName?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="cw-conv-info">
                      <div className="cw-conv-name">{conv.displayName || "Conversation"}</div>
                      <div className="cw-conv-last">
                        {conv.lastMessage?.content
                          ? conv.lastMessage.content.length > 35
                            ? conv.lastMessage.content.slice(0, 35) + "..."
                            : conv.lastMessage.content
                          : "No messages yet"
                        }
                      </div>
                    </div>
                    <div className="cw-conv-meta">
                      {conv.lastMessage && (
                        <div className="cw-conv-time">{timeAgo(conv.lastMessage.created_at)}</div>
                      )}
                      {conv.unreadCount > 0 && (
                        <div className="cw-unread-dot">{conv.unreadCount}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Message thread */}
          {view === "conversation" && activeConversation && (
            <div className="cw-thread">
              <div className="cw-messages">
                {messages.length === 0 ? (
                  <div className="cw-no-messages">
                    The scroll is blank. Send the first message.
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === user.id;
                    const senderName = msg.profiles?.display_name || msg.profiles?.favourite_class || "Adventurer";
                    return (
                      <div key={msg.id} className={`cw-message ${isMe ? "mine" : "theirs"}`}>
                        {!isMe && (
                          <div className="cw-message-sender">{senderName}</div>
                        )}
                        <div className="cw-message-bubble">
                          {msg.content}
                        </div>
                        <div className="cw-message-time">{formatTime(msg.created_at)}</div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="cw-input-row">
                <textarea
                  className="cw-input"
                  placeholder="Send a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button
                  className="cw-send-btn"
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                >
                  ➤
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}