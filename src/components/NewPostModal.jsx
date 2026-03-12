import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAchievements } from "../context/AchievementContext";
import "./NewPostModal.css";

export default function NewPostModal({ type, userId, authorName, onClose, onPosted }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [system, setSystem] = useState("");
  const [playersNeeded, setPlayersNeeded] = useState("");
  const [schedule, setSchedule] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [friendsOnly, setFriendsOnly] = useState(false);
  const isCampaign = type === "campaign";
  const isLFG = type === "lfg";

  const { triggerCheck } = useAchievements();

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      setError("Title and description are required.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("posts").insert({
      user_id: userId,
      author_name: authorName,
      type,
      title,
      body,
      system: system || null,
      players_needed: playersNeeded ? parseInt(playersNeeded) : null,
      schedule: schedule || null,
      friends_only: friendsOnly,
      
    });
    setLoading(false);
if (error) return setError(error.message);
onPosted();
await triggerCheck(userId, "post");
  };

  const modalTitle = isCampaign ? "Post a Campaign" : isLFG ? "Looking for Group" : type === "recap" ? "Share a Recap" : "Share Homebrew";
  const modalIcon = isCampaign ? "🗺️" : isLFG ? "🎲" : type === "recap" ? "📜" : "⚗️";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{modalIcon} {modalTitle}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-fields">
          <div className="modal-field">
            <label className="modal-label">Title</label>
            <input
              className="modal-input"
              placeholder={isCampaign ? "e.g. Curse of Strahd — 3 players needed..." : "e.g. Experienced player seeking long-term campaign..."}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">{isCampaign ? "Campaign Description" : isLFG ? "About You" : "Description"}</label>
            <textarea
              className="modal-textarea"
              placeholder={isCampaign ? "Describe your campaign, setting, tone, house rules..." : "Tell the party about yourself, your experience, availability..."}
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">System</label>
            <input
              className="modal-input"
              placeholder="e.g. D&D 5e, Pathfinder 2e, OSR..."
              value={system}
              onChange={e => setSystem(e.target.value)}
            />
          </div>

          {isCampaign && (
            <div className="modal-field">
              <label className="modal-label">Players Needed</label>
              <input
                className="modal-input"
                type="number"
                placeholder="e.g. 3"
                min="1"
                max="10"
                value={playersNeeded}
                onChange={e => setPlayersNeeded(e.target.value)}
              />
            </div>
          )}

          <div className="modal-field">
            <label className="modal-label">Schedule</label>
            <input
              className="modal-input"
              placeholder="e.g. Sundays 7pm GMT, bi-weekly..."
              value={schedule}
              onChange={e => setSchedule(e.target.value)}
            />
          </div>
        </div>
<div className="npm-friends-toggle">
  <label className="npm-toggle-label">
    <input
      type="checkbox"
      checked={friendsOnly}
      onChange={e => setFriendsOnly(e.target.checked)}
    />
    <span>Friends Only</span>
  </label>
</div>
        <button className="modal-submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Posting to the board..." : "Pin to the Notice Board"}
        </button>
      </div>
    </div>
  );
}