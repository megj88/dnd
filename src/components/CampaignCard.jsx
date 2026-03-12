import "./CampaignCard.css";

export default function CampaignCard({ campaign, featured, onClick, currentUserId }) {
  const isOwner = campaign.user_id === currentUserId;
  const dm = campaign.profiles;

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  const dmName = dm?.display_name || dm?.favourite_class || campaign.author_name || "Anonymous DM";
  const dmInitial = dmName[0]?.toUpperCase() || "?";

  return (
    <div className={`cc-card ${featured ? "cc-featured" : ""}`} onClick={onClick}>
      <div className="cc-top">
        <div className="cc-tag">🗺️ Campaign</div>
        {isOwner && <div className="cc-owner-badge">Your Campaign</div>}
      </div>

      <h3 className="cc-title">{campaign.title}</h3>

      <p className="cc-body">{campaign.body}</p>

      <div className="cc-details">
        {campaign.system && (
          <div className="cc-detail">
            <span className="cc-detail-label">System</span>
            <span className="cc-detail-value">{campaign.system}</span>
          </div>
        )}
        {campaign.players_needed && (
          <div className="cc-detail">
            <span className="cc-detail-label">Players</span>
            <span className="cc-detail-value">{campaign.players_needed} needed</span>
          </div>
        )}
        {campaign.schedule && (
          <div className="cc-detail">
            <span className="cc-detail-label">Schedule</span>
            <span className="cc-detail-value">{campaign.schedule}</span>
          </div>
        )}
      </div>

      <div className="cc-footer">
        <div className="cc-dm">
          <div className="cc-dm-avatar">
            {dm?.avatar_url
              ? <img src={dm.avatar_url} alt="DM" />
              : <span>{dmInitial}</span>
            }
          </div>
          <div className="cc-dm-name">{dmName}</div>
        </div>
        <div className="cc-time">{timeAgo(campaign.created_at)}</div>
      </div>
    </div>
  );
}