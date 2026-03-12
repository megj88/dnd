import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import SessionCard from "../components/SessionCard";
import SessionModal from "../components/SessionModal";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import "./SchedulerPage.css";

export default function SchedulerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);

    const { data: memberRows } = await supabase
      .from("session_attendees")
      .select("session_id")
      .eq("user_id", user.id);

    const { data: createdSessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("created_by", user.id);

    const attendeeSessionIds = (memberRows || []).map(r => r.session_id);
    const createdIds = new Set((createdSessions || []).map(s => s.id));
    const allIds = [...new Set([...attendeeSessionIds, ...createdIds])];

    if (allIds.length === 0) { setSessions([]); setLoading(false); return; }

    const { data: allSessions } = await supabase
      .from("sessions")
      .select("*")
      .in("id", allIds)
      .order("scheduled_at", { ascending: true });

    if (!allSessions || allSessions.length === 0) { setSessions([]); setLoading(false); return; }

    const enriched = await Promise.all(allSessions.map(async (session) => {
      const { data: attendees } = await supabase
        .from("session_attendees")
        .select("user_id, rsvp")
        .eq("session_id", session.id);

      const userIds = (attendees || []).map(a => a.user_id);
      let profileMap = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, favourite_class")
          .in("id", userIds);
        (profiles || []).forEach(p => profileMap[p.id] = p);
      }

      const enrichedAttendees = (attendees || []).map(a => ({
        ...a,
        profiles: profileMap[a.user_id] || null,
      }));

      let campaign_title = null;
      if (session.campaign_id) {
        const { data: post } = await supabase
          .from("posts")
          .select("title")
          .eq("id", session.campaign_id)
          .maybeSingle();
        campaign_title = post?.title || null;
      }

      return { ...session, attendees: enrichedAttendees, campaign_title };
    }));

    setSessions(enriched);
    setLoading(false);
  };

  const upcoming = sessions.filter(s => new Date(s.scheduled_at) >= new Date());
  const past = sessions.filter(s => new Date(s.scheduled_at) < new Date());

  return (
    <div className="sp-wrap">
      <div className="sp-stars">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="sp-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 6}s`,
            animationDuration: `${Math.random() * 4 + 4}s`,
          }} />
        ))}
      </div>

      <nav className="sp-nav">
        <button className="sp-nav-btn" onClick={() => navigate("/home")}>
          ← Back to Tavern
        </button>
        <div className="sp-nav-logo">⚔️ The Tavern Board</div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <SearchBar />
          <NotificationBell />
          <button className="sp-nav-btn" onClick={() => navigate(`/profile/${user?.id}`)}>
            My Profile
          </button>
        </div>
      </nav>

      <div className="sp-content">
        <div className="sp-header">
          <div className="sp-eyebrow">Plan Your Adventures</div>
          <h1 className="sp-title">Session <span>Scheduler</span></h1>
          <p className="sp-subtitle">Organise your sessions, track attendance, and keep your party prepared.</p>
        </div>

        <div className="sp-actions">
          <button className="sp-create-btn" onClick={() => setShowModal(true)}>
            + Schedule a Session
          </button>
        </div>

        {loading ? (
          <div className="sp-loading">Consulting the arcane calendar...</div>
        ) : sessions.length === 0 ? (
          <div className="sp-empty">
            <div className="sp-empty-icon">🕯️</div>
            <p>No sessions scheduled yet. Create one to gather your party.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="sp-section">
                <div className="sp-section-title">✦ Upcoming Sessions</div>
                <div className="sp-list">
                  {upcoming.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      currentUserId={user.id}
                      onUpdated={fetchSessions}
                    />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div className="sp-section">
                <div className="sp-section-title">◈ Past Sessions</div>
                <div className="sp-list">
                  {past.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      currentUserId={user.id}
                      onUpdated={fetchSessions}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <SessionModal
          userId={user.id}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchSessions(); }}
        />
      )}
    </div>
  );
}