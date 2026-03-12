import "./HomebrewCard.css";

const TYPE_CONFIG = {
  spell: { label: "Spell", icon: "✨", color: "#9b7ec9" },
  class: { label: "Class", icon: "⚔️", color: "#c9a96e" },
  monster: { label: "Monster", icon: "🐉", color: "#c97070" },
  magic_item: { label: "Magic Item", icon: "💎", color: "#7090c9" },
  rule: { label: "Rule", icon: "📜", color: "#7ec98a" },
  adventure: { label: "Adventure", icon: "🗺️", color: "#c9b870" },
};

export default function HomebrewCard({ item, onClick, liked, saved, onLike, onSave, currentUserId }) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.rule;
  const isOwner = item.user_id === currentUserId;

  return (
    <div className="hbc-card" onClick={onClick}>
      <div className="hbc-top">
        <div className="hbc-type-badge" style={{ color: config.color, borderColor: `${config.color}33` }}>
          {config.icon} {config.label}
        </div>
        {isOwner && <div className="hbc-owner-badge">Yours</div>}
      </div>

      <div className="hbc-title">{item.title}</div>
      <div className="hbc-desc">{item.description}</div>

      {item.tags?.length > 0 && (
        <div className="hbc-tags">
          {item.tags.slice(0, 4).map(tag => (
            <span key={tag} className="hbc-tag">#{tag}</span>
          ))}
          {item.tags.length > 4 && <span className="hbc-tag-more">+{item.tags.length - 4}</span>}
        </div>
      )}

      <div className="hbc-author">
        by {item.profiles?.display_name || item.profiles?.favourite_class || "Adventurer"}
      </div>

      <div className="hbc-footer">
        <button
          className={`hbc-action-btn ${liked ? "active" : ""}`}
          onClick={e => { e.stopPropagation(); onLike(); }}
        >
          ▲ {item.like_count || 0}
        </button>
        <button
          className={`hbc-action-btn ${saved ? "active-save" : ""}`}
          onClick={e => { e.stopPropagation(); onSave(); }}
        >
          🔖 {item.save_count || 0}
        </button>
        <span className="hbc-comment-count">💬 {item.comment_count || 0}</span>
      </div>
    </div>
  );
}