import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./NotificationBell.css";

const TYPE_ICONS = {
  nudge: "⚔️",
  message: "💬",
  application_received: "📜",
  application_approved: "✅",
  application_rejected: "✗",
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel("notifications-" + user.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data || []);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpen = async () => {
    setOpen(!open);
    if (!open && unreadCount > 0) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const handleClick = (notification) => {
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return "just now";
  };

  return (
    <div className="nb-wrap" ref={dropdownRef}>
      <button className="nb-bell" onClick={handleOpen}>
        🔔
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="nb-dropdown">
          <div className="nb-dropdown-header">
            <span className="nb-dropdown-title">Notifications</span>
            {notifications.length > 0 && (
              <button className="nb-clear" onClick={async () => {
                await supabase.from("notifications").delete().eq("user_id", user.id);
                setNotifications([]);
              }}>
                Clear all
              </button>
            )}
          </div>

          <div className="nb-list">
            {notifications.length === 0 ? (
              <div className="nb-empty">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`nb-item ${!n.read ? "unread" : ""}`}
                  onClick={() => handleClick(n)}
                >
                  <div className="nb-item-icon">{TYPE_ICONS[n.type] || "🔔"}</div>
                  <div className="nb-item-body">
                    <div className="nb-item-message">{n.message}</div>
                    <div className="nb-item-time">{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.read && <div className="nb-item-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}