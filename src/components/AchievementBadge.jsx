import "./AchievementBadge.css";

export default function AchievementBadge({ achievement, unlocked, unlockedAt }) {
  return (
    <div className={`ab-badge ${unlocked ? "unlocked" : "locked"}`} title={unlocked ? `${achievement.label} — ${achievement.desc}` : "???"}>
      <div className="ab-icon">{unlocked ? achievement.icon : "🔒"}</div>
      <div className="ab-label">{unlocked ? achievement.label : "???"}</div>
      {unlocked && unlockedAt && (
        <div className="ab-date">{new Date(unlockedAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}</div>
      )}
      {!unlocked && <div className="ab-hint">{achievement.desc}</div>}
    </div>
  );
}