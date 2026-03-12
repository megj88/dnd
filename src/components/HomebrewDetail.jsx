import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./HomebrewDetail.css";

const TYPE_CONFIG = {
  spell: { label: "Spell", icon: "✨", color: "#9b7ec9" },
  class: { label: "Class", icon: "⚔️", color: "#c9a96e" },
  monster: { label: "Monster", icon: "🐉", color: "#c97070" },
  magic_item: { label: "Magic Item", icon: "💎", color: "#7090c9" },
  rule: { label: "Rule", icon: "📜", color: "#7ec98a" },
  adventure: { label: "Adventure", icon: "🗺️", color: "#c9b870" },
};

export default function HomebrewDetail({ item, currentUserId, liked, saved, onLike, onSave, onClose, onEdit, onDelete }) {
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.rule;
  const isOwner = item.user_id === currentUserId;

  useEffect(() => { fetchComments(); }, [item.id]);

  const fetchComments = async () => {
    const { data } = await supabase.from("homebrew_comments").select("*").eq("homebrew_id", item.id).order("created_at");
    if (!data || data.length === 0) { setComments([]); return; }
    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, favourite_class").in("id", userIds);
    const profileMap = {};
    (profiles || []).forEach(p => profileMap[p.id] = p);
    setComments(data.map(c => ({ ...c, profile: profileMap[c.user_id] || null })));
  };

  const handleComment = async () => {
    if (!commentInput.trim()) return;
    await supabase.from("homebrew_comments").insert({ homebrew_id: item.id, user_id: currentUserId, body: commentInput.trim() });
    setCommentInput("");
    fetchComments();
  };

  const handleDeleteComment = async (id) => {
    await supabase.from("homebrew_comments").delete().eq("id", id);
    fetchComments();
  };

  return (
    <div className="hd-overlay" onClick={onClose}>
      <div className="hd-panel" onClick={e => e.stopPropagation()}>
        <div className="hd-header">
          <div className="hd-type-badge" style={{ color: config.color, borderColor: `${config.color}33` }}>
            {config.icon} {config.label}
          </div>
          <div className="hd-header-right">
            {isOwner && (
              <>
                <button className="hd-edit-btn" onClick={onEdit}>Edit</button>
                <button className="hd-delete-btn" onClick={onDelete}>Delete</button>
              </>
            )}
            <button className="hd-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <h2 className="hd-title">{item.title}</h2>
        <div className="hd-author">
          by {item.profiles?.display_name || item.profiles?.favourite_class || "Adventurer"}
        </div>

        <p className="hd-description">{item.description}</p>

        {item.tags?.length > 0 && (
          <div className="hd-tags">
            {item.tags.map(tag => <span key={tag} className="hd-tag">#{tag}</span>)}
          </div>
        )}

        <div className="hd-divider" />

        <div className="hd-body">{item.body}</div>

        <div className="hd-divider" />

        <div className="hd-actions">
          <button className={`hd-action-btn ${liked ? "active" : ""}`} onClick={onLike}>
            ▲ {item.like_count || 0} {liked ? "Liked" : "Upvote"}
          </button>
          <button className={`hd-action-btn ${saved ? "active-save" : ""}`} onClick={onSave}>
            🔖 {saved ? "Saved" : "Save"}
          </button>
        </div>

        <div className="hd-comments">
          <div className="hd-comments-title">Comments ({comments.length})</div>
          {comments.map(c => (
            <div key={c.id} className="hd-comment">
              <div className="hd-comment-author">{c.profile?.display_name || c.profile?.favourite_class || "Adventurer"}</div>
              <div className="hd-comment-body">{c.body}</div>
              {c.user_id === currentUserId && (
                <button className="hd-comment-delete" onClick={() => handleDeleteComment(c.id)}>✕</button>
              )}
            </div>
          ))}
          <div className="hd-comment-input-row">
            <input
              className="hd-comment-input"
              placeholder="Share your thoughts..."
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleComment()}
            />
            <button className="hd-comment-submit" onClick={handleComment}>Post</button>
          </div>
        </div>
      </div>
    </div>
  );
}