import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAchievements } from "../context/AchievementContext";
import "./RatingModal.css";

const CATEGORIES = [
  { key: "reliability", label: "Reliability", desc: "Shows up on time, prepared" },
  { key: "communication", label: "Communication", desc: "Responsive, clear, respectful" },
  { key: "roleplay", label: "Roleplay Quality", desc: "Engaging, creative, in-character" },
  { key: "rules_knowledge", label: "Rules Knowledge", desc: "Knows the system, helps others" },
  { key: "overall", label: "Overall Experience", desc: "Would you adventure with them again?" },
];

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="rm-stars">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          className={`rm-star ${star <= (hover || value) ? "active" : ""}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function RatingModal({ revieweeId, revieweeName, campaignId, campaignTitle, reviewerId, onClose, onSubmitted }) {
  const [ratings, setRatings] = useState({
    reliability: 0,
    communication: 0,
    roleplay: 0,
    rules_knowledge: 0,
    overall: 0,
  });
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const allRated = Object.values(ratings).every(v => v > 0);

  const { triggerCheck } = useAchievements();
  
  const handleSubmit = async () => {
    if (!allRated) return setError("Please rate all categories before submitting.");
    setSubmitting(true);
    setError("");

    const { error } = await supabase.from("ratings").insert({
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      campaign_id: campaignId,
      ...ratings,
      review_text: reviewText || null,
    });

    setSubmitting(false);
    if (error) return setError(error.message);
    onSubmitted();
    await triggerCheck(revieweeId, "rating");
  };

  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-panel" onClick={e => e.stopPropagation()}>
        <div className="rm-header">
          <div className="rm-title">Rate Your Adventurer</div>
          <button className="rm-close" onClick={onClose}>✕</button>
        </div>

        <div className="rm-subtitle">
          Rating <span className="rm-name">{revieweeName}</span> for{" "}
          <span className="rm-campaign">{campaignTitle}</span>
        </div>

        <div className="rm-categories">
          {CATEGORIES.map(cat => (
            <div key={cat.key} className="rm-category">
              <div className="rm-category-info">
                <div className="rm-category-label">{cat.label}</div>
                <div className="rm-category-desc">{cat.desc}</div>
              </div>
              <StarRating
                value={ratings[cat.key]}
                onChange={val => setRatings(r => ({ ...r, [cat.key]: val }))}
              />
            </div>
          ))}
        </div>

        <div className="rm-review-field">
          <label className="rm-review-label">Leave a review (optional)</label>
          <textarea
            className="rm-review-input"
            placeholder="Share your experience adventuring with this player..."
            rows={3}
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
          />
        </div>

        {error && <div className="rm-error">{error}</div>}

        <button
          className="rm-submit-btn"
          onClick={handleSubmit}
          disabled={submitting || !allRated}
        >
          {submitting ? "Submitting..." : "Submit Rating ⚔️"}
        </button>
      </div>
    </div>
  );
}