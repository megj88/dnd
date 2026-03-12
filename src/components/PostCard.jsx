import { useState } from "react";
import { supabase } from "../supabaseClient";
import ReportModal from "./ReportModal";
import "./PostCard.css";

const TYPE_CONFIG = {
  campaign: { label: "Campaign", icon: "🗺️", color: "#c9a96e" },
  lfg: { label: "Looking for Group", icon: "🎲", color: "#7eb8c9" },
  recap: { label: "Session Recap", icon: "📜", color: "#a87ec9" },
  homebrew: { label: "Homebrew", icon: "⚗️", color: "#7ec98a" },
};

export default function PostCard({ post, currentUserId, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const config = TYPE_CONFIG[post.type] || TYPE_CONFIG.campaign;

  const handleDelete = async (e) => {
    e.stopPropagation();
    await supabase.from("posts").delete().eq("id", post.id);
    onDelete();
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return "Just now";
  };

  return (
    <div className={`post-card ${expanded ? "expanded" : ""}`} onClick={() => setExpanded(!expanded)}>
      <div className="post-card-header">
        <div className="post-type-tag" style={{ borderColor: config.color, color: config.color }}>
          {config.icon} {config.label}
        </div>
        <div className="post-meta">
          <span className="post-time">{timeAgo(post.created_at)}</span>
          {currentUserId === post.user_id && (
            <button className="post-delete-btn" onClick={handleDelete}>✕</button>
          )}
        </div>
      </div>

      <h3 className="post-title">{post.title}</h3>
      <p className="post-author">Posted by {post.author_name || "Anonymous Adventurer"}</p>

      <p className={`post-body ${expanded ? "expanded" : ""}`}>{post.body}</p>

      {expanded && (
        <div className="post-details">
          {post.system && <div className="post-detail"><span>System</span> {post.system}</div>}
          {post.players_needed && <div className="post-detail"><span>Players Needed</span> {post.players_needed}</div>}
          {post.schedule && <div className="post-detail"><span>Schedule</span> {post.schedule}</div>}
        </div>
      )}

      <div className="post-card-footer">
        <div className="post-expand-hint">{expanded ? "▲ Show less" : "▼ Read more"}</div>
        {currentUserId !== post.user_id && (
          <button
            className="pc-report-btn"
            onClick={e => { e.stopPropagation(); setShowReport(true); }}
          >
            🚩
          </button>
        )}
      </div>

      {showReport && (
        <ReportModal
          contentType="post"
          contentId={post.id}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}