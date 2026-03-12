import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./ReportModal.css";

const REASONS = [
  "Inappropriate content",
  "Harassment or hate speech",
  "Spam or advertising",
  "Misinformation",
  "Copyright violation",
  "Other",
];

export default function ReportModal({ contentType, contentId, onClose }) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    await supabase.from("reports").insert({
      reporter_id: user.id,
      content_type: contentType,
      content_id: contentId,
      reason: reason === "Other" ? custom || "Other" : reason,
    });
    setSubmitting(false);
    setDone(true);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="rep-overlay" onClick={onClose}>
      <div className="rep-panel" onClick={e => e.stopPropagation()}>
        <div className="rep-header">
          <div className="rep-title">🚩 Report Content</div>
          <button className="rep-close" onClick={onClose}>✕</button>
        </div>
        {done ? (
          <div className="rep-done">✓ Report submitted. Thank you.</div>
        ) : (
          <>
            <p className="rep-subtitle">Select a reason for reporting this content.</p>
            <div className="rep-reasons">
              {REASONS.map(r => (
                <button key={r} className={`rep-reason-btn ${reason === r ? "active" : ""}`} onClick={() => setReason(r)}>
                  {r}
                </button>
              ))}
            </div>
            {reason === "Other" && (
              <textarea className="rep-input" rows={3} placeholder="Describe the issue..." value={custom} onChange={e => setCustom(e.target.value)} />
            )}
            <button className="rep-submit-btn" onClick={handleSubmit} disabled={!reason || submitting}>
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}