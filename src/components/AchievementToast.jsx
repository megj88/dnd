import { useState, useEffect } from "react";
import { ACHIEVEMENTS } from "../utils/achievements";
import "./AchievementToast.css";

export default function AchievementToast({ achievementKey, onDone }) {
  const [visible, setVisible] = useState(false);
  const achievement = ACHIEVEMENTS.find(a => a.key === achievementKey);

  useEffect(() => {
    if (!achievement) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 4000);
    return () => clearTimeout(timer);
  }, [achievementKey]);

  if (!achievement) return null;

  return (
    <div className={`at-toast ${visible ? "visible" : ""}`}>
      <div className="at-icon">{achievement.icon}</div>
      <div className="at-text">
        <div className="at-header">Achievement Unlocked!</div>
        <div className="at-label">{achievement.label}</div>
        <div className="at-desc">{achievement.desc}</div>
      </div>
    </div>
  );
}