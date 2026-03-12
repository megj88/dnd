import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { createNotification } from "../utils/notify";
import "./EventModal.css";

const EVENT_TYPES = [
  { value:"session", label:"Game Session", icon:"⚔️" },
  { value:"social", label:"Social", icon:"🍺" },
  { value:"one_shot", label:"One Shot", icon:"🎲" },
  { value:"convention", label:"Convention", icon:"🏰" },
  { value:"other", label:"Other", icon:"📅" },
];

export default function EventModal({ userId, existing, onClose, onSaved }) {
  const [title, setTitle] = useState(existing?.title || "");
  const [type, setType] = useState(existing?.type || "session");
  const [description, setDescription] = useState(existing?.description || "");
  const [date, setDate] = useState(existing?.starts_at ? existing.starts_at.slice(0,10) : "");
  const [time, setTime] = useState(existing?.starts_at ? existing.starts_at.slice(11,16) : "");
  const [endTime, setEndTime] = useState(existing?.ends_at ? existing.ends_at.slice(11,16) : "");
  const [shared, setShared] = useState(existing?.shared || false);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState(existing?.campaign_id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    const { data } = await supabase.from("posts").select("id, title").eq("user_id", userId).eq("type", "campaign");
    setCampaigns(data || []);
  };

  const handleSave = async () => {
    if (!title.trim()) return setError("Please enter a title.");
    if (!date || !time) return setError("Please set a date and time.");
    setSaving(true);
    setError("");

    const starts_at = new Date(`${date}T${time}`).toISOString();
    const ends_at = endTime ? new Date(`${date}T${endTime}`).toISOString() : null;

    const payload = {
      user_id: userId,
      title: title.trim(),
      type,
      description: description || null,
      starts_at,
      ends_at,
      shared,
      campaign_id: campaignId || null,
    };

    let savedEvent;
    if (existing) {
      const { data } = await supabase.from("events").update(payload).eq("id", existing.id).select().single();
      savedEvent = data;
    } else {
      const { data } = await supabase.from("events").insert(payload).select().single();
      savedEvent = data;
    }

    // Auto RSVP creator as going
    if (savedEvent && !existing) {
      await supabase.from("event_rsvps").upsert({ event_id: savedEvent.id, user_id: userId, rsvp: "going" }, { onConflict: "event_id,user_id" });
    }

    // Notify campaign members if shared
    if (shared && campaignId && savedEvent && !existing) {
      const { data: apps } = await supabase.from("applications").select("applicant_id").eq("campaign_id", campaignId).eq("status", "approved");
      for (const app of (apps || [])) {
        if (app.applicant_id !== userId) {
          await createNotification({ userId: app.applicant_id, type: "message", message: `New event: "${title.trim()}"`, link: "/calendar" });
        }
      }
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="em-overlay" onClick={onClose}>
      <div className="em-panel" onClick={e => e.stopPropagation()}>
        <div className="em-header">
          <div className="em-title">{existing ? "Edit Event" : "Create Event"}</div>
          <button className="em-close" onClick={onClose}>✕</button>
        </div>

        <div className="em-fields">
          <div className="em-field">
            <label className="em-label">Event Title</label>
            <input className="em-input" placeholder="e.g. Session 5 — The Dragon Awakens" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="em-field">
            <label className="em-label">Type</label>
            <div className="em-type-grid">
              {EVENT_TYPES.map(t => (
                <button key={t.value} className={`em-type-btn ${type === t.value ? "active" : ""}`} onClick={() => setType(t.value)}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="em-row">
            <div className="em-field">
              <label className="em-label">Date</label>
              <input className="em-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="em-field">
              <label className="em-label">Start Time</label>
              <input className="em-input" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div className="em-field">
              <label className="em-label">End Time</label>
              <input className="em-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="em-field">
            <label className="em-label">Description (optional)</label>
            <textarea className="em-input em-textarea" rows={3} placeholder="What's happening at this event?" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {campaigns.length > 0 && (
            <div className="em-field">
              <label className="em-label">Link to Campaign (optional)</label>
              <select className="em-input em-select" value={campaignId} onChange={e => setCampaignId(e.target.value)}>
                <option value="">No campaign</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          )}

          <div className="em-field">
            <label className="em-toggle-label">
              <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} />
              <span>Share with campaign party</span>
            </label>
          </div>
        </div>

        {error && <div className="em-error">{error}</div>}

        <button className="em-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : existing ? "Save Changes" : "Create Event 📅"}
        </button>
      </div>
    </div>
  );
}