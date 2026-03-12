import { useState } from "react";
import { supabase } from "../supabaseClient";
import "./SessionCard.css";

const RSVP_CONFIG = {
  going: { label: "Going", icon: "✓", color: "#7ec98a" },
  maybe: { label: "Maybe", icon: "?", color: "#c9a96e" },
  cant: { label: "Can't Attend", icon: "✗", color: "#c97070" },
  pending: { label: "Pending", icon: "…", color: "#6a5a48" },
};

export default function SessionCard({ session, currentUserId, onUpdated }) {
  const [expanded, setExpanded] = useState(false);

  const isPast = new Date(session.scheduled_at) < new Date();
  const isOwner = session.created_by === currentUserId;
  const myAttendee = session.attendees?.find(a => a.user_id === currentUserId);
  const myRsvp = myAttendee?.rsvp || "pending";

  const handleRsvp = async (rsvp) => {
    await supabase
      .from("session_attendees")
      .update({ rsvp })
      .eq("session_id", session.id)
      .eq("user_id", currentUserId);
    onUpdated();
  };

  const handleDelete = async () => {
    await supabase.from("sessions").delete().eq("id", session.id);
    onUpdated();
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const goingCount = session.attendees?.filter(a => a.rsvp === "going").length || 0;
  const maybeCount = session.attendees?.filter(a => a.rsvp === "maybe").length || 0;

  return (
    <div className={`sc-card ${isPast ? "past" : ""}`}>
      <div className="sc-card-top" onClick={() => setExpanded(!expanded)}>
        <div className="sc-date-block">
          <div className="sc-day">{new Date(session.scheduled_at).getDate()}</div>
          <div className="sc-month">{new Date(session.scheduled_at).toLocaleDateString("en-GB", { month: "short" })}</div>
        </div>

        <div className="sc-info">
          <div className="sc-title">{session.title}</div>
          <div className="sc-meta">
            <span>🕐 {formatTime(session.scheduled_at)}</span>
            <span>⏱ {formatDuration(session.duration_minutes)}</span>
            {session.campaign_title && <span>🗺️ {session.campaign_title}</span>}
          </div>
          <div className="sc-attendees-summary">
            <span className="sc-going">{goingCount} going</span>
            {maybeCount > 0 && <span className="sc-maybe">{maybeCount} maybe</span>}
          </div>
        </div>

        <div className="sc-right">
          {!isPast && myAttendee && (
            <div className="sc-my-rsvp" style={{ color: RSVP_CONFIG[myRsvp].color }}>
              {RSVP_CONFIG[myRsvp].icon} {RSVP_CONFIG[myRsvp].label}
            </div>
          )}
          <div className="sc-expand">{expanded ? "▲" : "▼"}</div>
        </div>
      </div>

      {expanded && (
        <div className="sc-expanded">
          <div className="sc-expanded-date">{formatDate(session.scheduled_at)}</div>

          {session.notes && (
            <div className="sc-notes">
              <div className="sc-notes-label">Session Notes</div>
              <p className="sc-notes-text">{session.notes}</p>
            </div>
          )}

          {session.attendees && session.attendees.length > 0 && (
            <div className="sc-attendees">
              <div className="sc-attendees-label">Attendees</div>
              <div className="sc-attendees-list">
                {session.attendees.map(a => (
                  <div key={a.user_id} className="sc-attendee">
                    <span className="sc-attendee-name">
                      {a.profiles?.display_name || a.profiles?.favourite_class || "Adventurer"}
                    </span>
                    <span className="sc-attendee-rsvp" style={{ color: RSVP_CONFIG[a.rsvp]?.color }}>
                      {RSVP_CONFIG[a.rsvp]?.icon} {RSVP_CONFIG[a.rsvp]?.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isPast && myAttendee && (
            <div className="sc-rsvp-section">
              <div className="sc-rsvp-label">Your RSVP</div>
              <div className="sc-rsvp-btns">
                {["going", "maybe", "cant"].map(rsvp => (
                  <button
                    key={rsvp}
                    className={`sc-rsvp-btn ${myRsvp === rsvp ? "active" : ""}`}
                    style={myRsvp === rsvp ? { borderColor: RSVP_CONFIG[rsvp].color, color: RSVP_CONFIG[rsvp].color } : {}}
                    onClick={() => handleRsvp(rsvp)}
                  >
                    {RSVP_CONFIG[rsvp].icon} {RSVP_CONFIG[rsvp].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isOwner && (
            <button className="sc-delete-btn" onClick={handleDelete}>
              Delete Session
            </button>
          )}
        </div>
      )}
    </div>
  );
}