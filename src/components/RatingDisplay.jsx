import "./RatingDisplay.css";

const CATEGORIES = [
  { key: "reliability", label: "Reliability" },
  { key: "communication", label: "Communication" },
  { key: "roleplay", label: "Roleplay" },
  { key: "rules_knowledge", label: "Rules Knowledge" },
  { key: "overall", label: "Overall" },
];

function Stars({ value }) {
  return (
    <div className="rd-stars">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={`rd-star ${s <= Math.round(value) ? "active" : ""}`}>★</span>
      ))}
      <span className="rd-value">{value.toFixed(1)}</span>
    </div>
  );
}

export default function RatingDisplay({ ratings }) {
  if (!ratings || ratings.length === 0) return (
    <div className="rd-empty">No ratings yet. Adventure with others to earn your reputation.</div>
  );

  const avg = (key) => {
    const sum = ratings.reduce((acc, r) => acc + r[key], 0);
    return sum / ratings.length;
  };

  const overallAvg = (
    avg("reliability") + avg("communication") +
    avg("roleplay") + avg("rules_knowledge") + avg("overall")
  ) / 5;

  return (
    <div className="rd-wrap">
      <div className="rd-overall">
        <div className="rd-overall-score">{overallAvg.toFixed(1)}</div>
        <div className="rd-overall-stars">
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s} className={`rd-star large ${s <= Math.round(overallAvg) ? "active" : ""}`}>★</span>
          ))}
        </div>
        <div className="rd-overall-count">{ratings.length} rating{ratings.length !== 1 ? "s" : ""}</div>
      </div>

      <div className="rd-categories">
        {CATEGORIES.map(cat => (
          <div key={cat.key} className="rd-category">
            <div className="rd-category-label">{cat.label}</div>
            <Stars value={avg(cat.key)} />
          </div>
        ))}
      </div>

      {ratings.some(r => r.review_text) && (
        <div className="rd-reviews">
          <div className="rd-reviews-title">Reviews</div>
          {ratings.filter(r => r.review_text).map(r => (
            <div key={r.id} className="rd-review">
              <p className="rd-review-text">"{r.review_text}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}