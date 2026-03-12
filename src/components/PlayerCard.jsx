import "./PlayerCard.css";

const PLAYSTYLE_CONFIG = {
  roleplay: { label: "Roleplayer", icon: "🎭", color: "#c9a96e" },
  tactician: { label: "Tactician", icon: "⚔️", color: "#7eb8c9" },
  explorer: { label: "Explorer", icon: "🗺️", color: "#7ec98a" },
  storyteller: { label: "Dungeon Master", icon: "📖", color: "#a87ec9" },
};

const EXPERIENCE_LABELS = {
  new: "New to TTRPG",
  some: "Some Experience",
  experienced: "Experienced",
  veteran: "Veteran",
};

export default function PlayerCard({ player, nudged, onNudge, onViewProfile, compact }) {
  const playstyle = PLAYSTYLE_CONFIG[player.playstyle];
  const name = player.display_name || player.favourite_class || "Anonymous Adventurer";
  const initial = name[0]?.toUpperCase() || "?";

  if (compact) return (
    <div className="pc-compact">
      <div className="pc-compact-avatar" onClick={onViewProfile}>
        {player.avatar_url
          ? <img src={player.avatar_url} alt={name} />
          : <span>{initial}</span>
        }
      </div>
      <div className="pc-compact-info" onClick={onViewProfile}>
        <div className="pc-compact-name">{name}</div>
        <div className="pc-compact-details">
          {playstyle && (
            <span className="pc-compact-playstyle" style={{ color: playstyle.color }}>
              {playstyle.icon} {playstyle.label}
            </span>
          )}
          {player.system_preference && (
            <span className="pc-compact-system">{player.system_preference}</span>
          )}
          {player.availability && (
            <span className="pc-compact-avail">{player.availability}</span>
          )}
        </div>
      </div>
      <button
        className={`pc-nudge-btn ${nudged ? "nudged" : ""}`}
        onClick={onNudge}
      >
        {nudged ? "✓ Nudged" : "Nudge"}
      </button>
    </div>
  );

  return (
    <div className="pc-card">
      <div className="pc-card-top">
        <div className="pc-avatar" onClick={onViewProfile}>
          {player.avatar_url
            ? <img src={player.avatar_url} alt={name} />
            : <span>{initial}</span>
          }
        </div>
        {playstyle && (
          <div className="pc-playstyle-badge" style={{ borderColor: playstyle.color, color: playstyle.color }}>
            {playstyle.icon} {playstyle.label}
          </div>
        )}
      </div>

      <div className="pc-name" onClick={onViewProfile}>{name}</div>

      {player.bio && <p className="pc-bio">{player.bio}</p>}

      <div className="pc-details">
        {player.favourite_class && (
          <div className="pc-detail">
            <span className="pc-detail-label">Class</span>
            <span className="pc-detail-value">{player.favourite_class}</span>
          </div>
        )}
        {player.system_preference && (
          <div className="pc-detail">
            <span className="pc-detail-label">System</span>
            <span className="pc-detail-value">{player.system_preference}</span>
          </div>
        )}
        {player.availability && (
          <div className="pc-detail">
            <span className="pc-detail-label">Available</span>
            <span className="pc-detail-value">{player.availability}</span>
          </div>
        )}
        {player.experience_level && (
          <div className="pc-detail">
            <span className="pc-detail-label">Experience</span>
            <span className="pc-detail-value">{EXPERIENCE_LABELS[player.experience_level] || player.experience_level}</span>
          </div>
        )}
      </div>

      <div className="pc-actions">
        <button className="pc-profile-btn" onClick={onViewProfile}>
          View Profile
        </button>
        <button
          className={`pc-nudge-btn ${nudged ? "nudged" : ""}`}
          onClick={onNudge}
        >
          {nudged ? "✓ Nudged" : "Nudge ✦"}
        </button>
      </div>
    </div>
  );
}