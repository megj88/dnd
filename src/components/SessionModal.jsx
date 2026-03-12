import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { createNotification } from "../utils/notify";
import "./SessionModal.css";

export default function SessionModal({ userId, campaignId, campaignTitle, onClose, onCreated }) {
  const [title, setTitle] = useState(campaignTitle ? `${campaignTitle} — Session` : "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(180);
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [invitees, setInvitees] = useState([]);
  const [campaignMembers, setCampaignMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (campaignId) fetchCampaignMembers();
  }, [campaignId]);

  const fetchCampaignMembers = async () => {
    const { data } = await supabase
      .from("applications")
      .select("applicant_id")
      .eq("campaign_id", campaignId)
      .eq("status", "approved");

    if (!data || data.length === 0) return;

    const ids = data.map(a => a.applicant_id).filter(id => id !== userId);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, favourite_class, avatar_url")
      .in("id", ids);

    setCampaignMembers(profiles || []);
    setInvitees(profiles || []);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, favourite_class, avatar_url")
      .or(`display_name.ilike.%${searchQuery}%,favourite_class.ilike.%${searchQuery}%`)
      .neq("id", userId)
      .limit(5);
    setSearchResults(data || []);
  };

  const addInvitee = (player) => {
    if (!invitees.find(i => i.id === player.id)) {
      setInvitees(prev => [...prev, player]);
    }
    setSearchResults([]);
    setSearchQuery("");
  };

  const removeInvitee = (id) => setInvitees(prev => prev.filter(i => i.id !== id));

  const handleSave = async () => {
    if (!title.trim()) return setError("Please enter a session title.");
    if (!date || !time) return setError("Please set a date and time.");
    setSaving(true);
    setError("");

    const scheduledAt = new Date(`${date}T${time}`).toISOString();

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        title: title.trim(),
        campaign_id: campaignId || null,
        created_by: userId,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        notes: notes || null,
      })
      .select()
      .single();

    if (sessionError) { setSaving(false); return setError(sessionError.message); }

    // Add creator as attendee
    await supabase.from("session_attendees").insert({
      session_id: session.id,
      user_id: userId,
      rsvp: "going",
    });

    // Add and notify invitees
    for (const invitee of invitees) {
      await supabase.from("session_attendees").insert({
        session_id: session.id,
        user_id: invitee.id,
        rsvp: "pending",
      });
      await createNotification({
        userId: invitee.id,
        type: "message",
        message: `You've been invited to "${title.trim()}"`,
        link: "/scheduler",
      });
    }

    setSaving(false);
    onCreated();
  };

  return (
    <div className="sm-overlay" onClick={onClose}>
      <div className="sm-panel" onClick={e => e.stopPropagation()}>
        <div className="sm-header">
          <div className="sm-title">Schedule a Session</div>
          <button className="sm-close" onClick={onClose}>✕</button>
        </div>

        <div className="sm-fields">
          <div className="sm-field">
            <label className="sm-label">Session Title</label>
            <input
              className="sm-input"
              placeholder="e.g. The Dragon's Lair — Session 4"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="sm-row">
            <div className="sm-field">
              <label className="sm-label">Date</label>
              <input
                className="sm-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="sm-field">
              <label className="sm-label">Time</label>
              <input
                className="sm-input"
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
            <div className="sm-field">
              <label className="sm-label">Duration</label>
              <select
                className="sm-input"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
              >
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
                <option value={300}>5 hours</option>
                <option value={360}>6 hours</option>
              </select>
            </div>
          </div>

          <div className="sm-field">
            <label className="sm-label">Session Notes / Agenda (optional)</label>
            <textarea
              className="sm-input sm-textarea"
              placeholder="What's planned for this session? Any prep notes for players..."
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="sm-field">
            <label className="sm-label">Invite Players</label>
            {invitees.length > 0 && (
              <div className="sm-invitees">
                {invitees.map(inv => (
                  <div key={inv.id} className="sm-invitee">
                    <span>{inv.display_name || inv.favourite_class || "Adventurer"}</span>
                    <button className="sm-remove-invitee" onClick={() => removeInvitee(inv.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="sm-search-row">
              <input
                className="sm-input"
                placeholder="Search for a player..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
              <button className="sm-search-btn" onClick={handleSearch}>Search</button>
            </div>
            {searchResults.length > 0 && (
              <div className="sm-search-results">
                {searchResults.map(p => (
                  <div key={p.id} className="sm-search-result" onClick={() => addInvitee(p)}>
                    <span>{p.display_name || p.favourite_class || "Adventurer"}</span>
                    <span className="sm-add-btn">+ Add</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <div className="sm-error">{error}</div>}

        <button className="sm-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Scheduling..." : "Schedule Session ⚔️"}
        </button>
      </div>
    </div>
  );
}