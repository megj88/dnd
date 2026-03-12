import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import CampaignForum from "../components/CampaignForum";
import "./CampaignDashboardPage.css";

export default function CampaignDashboardPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [journal, setJournal] = useState(null);
  const [entries, setEntries] = useState([]);
  const [maps, setMaps] = useState([]);
  const [events, setEvents] = useState([]);
  const [posts, setPosts] = useState([]);
  const [presence, setPresence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState(false);
  const [allJournals, setAllJournals] = useState([]);
  const [showJournalPicker, setShowJournalPicker] = useState(false);
  const [dashTab, setDashTab] = useState("overview");

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    const { data: camp } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
    if (!camp) { navigate("/campaigns"); return; }
    setCampaign(camp);

    const isDM = camp.user_id === user.id;
    if (!isDM) {
      const { data: app } = await supabase.from("applications").select("id").eq("campaign_id", id).eq("applicant_id", user.id).eq("status", "approved").maybeSingle();
      if (!app) { navigate("/campaigns"); return; }
    }
    setAccess(true);

    const { data: apps } = await supabase.from("applications").select("applicant_id").eq("campaign_id", id).eq("status", "approved");
    const memberIds = (apps || []).map(a => a.applicant_id);
    if (!memberIds.includes(camp.user_id)) memberIds.unshift(camp.user_id);
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url, experience_level").in("id", memberIds);
    setMembers((profiles || []).map(p => ({ ...p, isDM: p.id === camp.user_id })));

    const { data: pres } = await supabase.from("user_presence").select("user_id, last_seen").in("user_id", memberIds);
    setPresence(pres || []);

    const { data: sess } = await supabase.from("sessions").select("*").eq("campaign_id", id).order("scheduled_at").limit(5);
    setSessions(sess || []);

    const { data: jour } = await supabase.from("journals").select("*").eq("campaign_id", id).maybeSingle();
    setJournal(jour);
    if (jour) {
      const { data: ents } = await supabase.from("journal_entries").select("*").eq("journal_id", jour.id).order("created_at", { ascending: false }).limit(3);
      setEntries(ents || []);
    }
    const { data: journalsData } = await supabase.from("journals").select("*").eq("created_by", user.id).is("campaign_id", null);
    setAllJournals(journalsData || []);

    const { data: mapsData } = await supabase.from("maps").select("*").eq("campaign_id", id).limit(3);
    setMaps(mapsData || []);

    const { data: eventsData } = await supabase.from("events").select("*").eq("campaign_id", id).gte("starts_at", new Date().toISOString()).order("starts_at").limit(3);
    setEvents(eventsData || []);

    const { data: postsData } = await supabase.from("posts").select("*").eq("type", "recap").order("created_at", { ascending: false }).limit(4);
    setPosts(postsData || []);

    setLoading(false);
  };

  const handleLinkJournal = async (journalId) => {
    await supabase.from("journals").update({ campaign_id: id }).eq("id", journalId);
    setShowJournalPicker(false);
    fetchAll();
  };

  const handleEnterSession = async () => {
    const session = upcomingSessions[0] || pastSessions[pastSessions.length - 1];
    if (session) {
      navigate(`/campaign/${id}/session/${session.id}/play`);
      return;
    }
    const { data } = await supabase.from("sessions").insert({
      title: "Quick Session",
      campaign_id: id,
      created_by: user.id,
      scheduled_at: new Date().toISOString(),
      duration_minutes: 180,
    }).select().single();
    if (data) navigate(`/campaign/${id}/session/${data.id}/play`);
  };

  const isOnline = (userId) => {
    const p = presence.find(p => p.user_id === userId);
    if (!p) return false;
    return new Date() - new Date(p.last_seen) < 5 * 60 * 1000;
  };

  const isDM = campaign?.user_id === user.id;
  const upcomingSessions = sessions.filter(s => new Date(s.scheduled_at) > new Date());
  const pastSessions = sessions.filter(s => new Date(s.scheduled_at) <= new Date());

  const formatDate = (d) => new Date(d).toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" });
  const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });

  if (loading) return <div className="cd-loading">Gathering your party...</div>;
  if (!access) return null;

  return (
    <div className="cd-wrap">
      <div className="cd-stars">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="cd-star" style={{
            left:`${Math.random()*100}%`, top:`${Math.random()*100}%`,
            width:`${Math.random()*2+1}px`, height:`${Math.random()*2+1}px`,
            animationDelay:`${Math.random()*6}s`, animationDuration:`${Math.random()*4+4}s`,
          }} />
        ))}
      </div>

      <nav className="cd-nav">
        <button className="cd-nav-btn" onClick={() => navigate("/campaigns")}>← Campaigns</button>
        <div className="cd-nav-logo">⚔️ The Tavern Board</div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <SearchBar /><NotificationBell />
          <button className="cd-nav-btn" onClick={() => navigate(`/profile/${user?.id}`)}>My Profile</button>
        </div>
      </nav>

      <div className="cd-content">

        {/* Hero */}
        <div className="cd-hero">
          <div className="cd-hero-left">
            <div className="cd-eyebrow">Campaign Dashboard</div>
            <h1 className="cd-title">{campaign.title}</h1>
            <p className="cd-subtitle">{campaign.body?.slice(0, 120)}{campaign.body?.length > 120 ? "..." : ""}</p>
            <div className="cd-meta">
              {campaign.system && <span className="cd-tag">⚔️ {campaign.system}</span>}
              <span className="cd-tag">👥 {members.length} adventurers</span>
              {isDM && <span className="cd-tag cd-tag-gold">👑 You are the DM</span>}
            </div>
          </div>
          <div className="cd-hero-actions">
            {isDM && (
              <button className="cd-primary-btn" onClick={handleEnterSession}>⚔️ Enter Session</button>
            )}
            <button className="cd-secondary-btn" onClick={() => navigate("/scheduler")}>📅 Scheduler</button>
            {journal && <button className="cd-secondary-btn" onClick={() => navigate(`/journal/${journal.id}`)}>📖 Journal</button>}
            <button className="cd-secondary-btn" onClick={() => navigate("/calendar")}>🗓️ Calendar</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="cd-dash-tabs">
          <button className={`cd-dash-tab ${dashTab === "overview" ? "active" : ""}`} onClick={() => setDashTab("overview")}>📊 Overview</button>
          <button className={`cd-dash-tab ${dashTab === "forum" ? "active" : ""}`} onClick={() => setDashTab("forum")}>💬 Forum</button>
        </div>

        {/* Overview */}
        {dashTab === "overview" && (
          <div className="cd-grid">

            {/* Party Members */}
            <div className="cd-card">
              <div className="cd-card-header">
                <div className="cd-card-title">⚔️ The Party</div>
                <span className="cd-card-count">{members.length}</span>
              </div>
              <div className="cd-members">
                {members.map(m => (
                  <div key={m.id} className="cd-member" onClick={() => navigate(`/profile/${m.id}`)}>
                    <div className="cd-member-avatar-wrap">
                      {m.avatar_url
                        ? <img src={m.avatar_url} className="cd-member-avatar" alt={m.display_name} />
                        : <div className="cd-member-avatar cd-member-avatar-placeholder">⚔️</div>
                      }
                      <div className={`cd-online-dot ${isOnline(m.id) ? "online" : ""}`} />
                    </div>
                    <div className="cd-member-info">
                      <div className="cd-member-name">{m.display_name || "Adventurer"}</div>
                      <div className="cd-member-role">{m.isDM ? "👑 Dungeon Master" : m.experience_level || "Player"}</div>
                    </div>
                    <div className={`cd-member-status ${isOnline(m.id) ? "online" : "offline"}`}>
                      {isOnline(m.id) ? "Online" : "Offline"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sessions */}
            <div className="cd-card">
              <div className="cd-card-header">
                <div className="cd-card-title">📅 Sessions</div>
                <button className="cd-card-link" onClick={() => navigate("/scheduler")}>View all</button>
              </div>
              {upcomingSessions.length === 0 && pastSessions.length === 0
                ? <div className="cd-empty">No sessions yet.</div>
                : <>
                    {upcomingSessions.map(s => (
                      <div key={s.id} className="cd-session-row upcoming">
                        <div className="cd-session-info">
                          <div className="cd-session-title">{s.title}</div>
                          <div className="cd-session-date">{formatDate(s.scheduled_at)} at {formatTime(s.scheduled_at)}</div>
                        </div>
                        {isDM && (
                          <button className="cd-play-btn" onClick={() => navigate(`/campaign/${id}/session/${s.id}/play`)}>
                            ▶ Play
                          </button>
                        )}
                      </div>
                    ))}
                    {pastSessions.map(s => (
                      <div key={s.id} className="cd-session-row past">
                        <div className="cd-session-info">
                          <div className="cd-session-title">{s.title}</div>
                          <div className="cd-session-date">{formatDate(s.scheduled_at)}</div>
                        </div>
                        <span className="cd-session-badge">Past</span>
                      </div>
                    ))}
                  </>
              }
            </div>

            {/* Journal */}
            <div className="cd-card">
              <div className="cd-card-header">
                <div className="cd-card-title">📖 Journal</div>
                {journal && <button className="cd-card-link" onClick={() => navigate(`/journal/${journal.id}`)}>Open</button>}
              </div>
              {!journal ? (
                <div className="cd-empty-col">
                  <div className="cd-empty">No journal yet.</div>
                  {isDM && (
                    <div className="cd-journal-actions">
                      <button className="cd-inline-btn" onClick={() => navigate(`/journals?campaign=${id}`)}>Create one →</button>
                      {allJournals.length > 0 && (
                        <button className="cd-inline-btn" onClick={() => setShowJournalPicker(!showJournalPicker)}>
                          Link existing →
                        </button>
                      )}
                    </div>
                  )}
                  {showJournalPicker && (
                    <div className="cd-journal-picker">
                      {allJournals.map(j => (
                        <div key={j.id} className="cd-journal-pick-row" onClick={() => handleLinkJournal(j.id)}>
                          📖 {j.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : entries.length === 0 ? (
                <div className="cd-empty">No entries yet.</div>
              ) : (
                entries.map(e => (
                  <div key={e.id} className="cd-journal-row" onClick={() => navigate(`/journal/${journal.id}`)}>
                    <div className="cd-journal-title">{e.title || `Session ${e.session_number}`}</div>
                    <div className="cd-journal-date">{formatDate(e.created_at)}</div>
                  </div>
                ))
              )}
            </div>

            {/* Maps */}
            <div className="cd-card">
              <div className="cd-card-header">
                <div className="cd-card-title">🗺️ Maps</div>
                <button className="cd-card-link" onClick={() => navigate(`/maps?campaign=${id}`)}>View all</button>
              </div>
              {maps.length === 0
                ? <div className="cd-empty">No maps yet. {isDM && <button className="cd-inline-btn" onClick={() => navigate(`/maps?campaign=${id}`)}>Create one →</button>}</div>
                : <div className="cd-maps-grid">
                    {maps.map(m => (
                      <div key={m.id} className="cd-map-thumb" onClick={() => navigate(`/map/${m.id}`)}>
                        <div className="cd-map-thumb-bg" style={m.background_url ? { backgroundImage:`url(${m.background_url})` } : {}} />
                        <div className="cd-map-thumb-label">{m.title}</div>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Upcoming Events */}
            <div className="cd-card">
              <div className="cd-card-header">
                <div className="cd-card-title">🗓️ Upcoming Events</div>
                <button className="cd-card-link" onClick={() => navigate("/calendar")}>Calendar</button>
              </div>
              {events.length === 0
                ? <div className="cd-empty">No upcoming events.</div>
                : events.map(e => (
                    <div key={e.id} className="cd-event-row">
                      <div className="cd-event-title">{e.title}</div>
                      <div className="cd-event-date">{formatDate(e.starts_at)} at {formatTime(e.starts_at)}</div>
                    </div>
                  ))
              }
            </div>

            {/* Recent Recaps */}
            <div className="cd-card">
              <div className="cd-card-header">
                <div className="cd-card-title">📜 Recent Recaps</div>
                <button className="cd-card-link" onClick={() => navigate("/home")}>Feed</button>
              </div>
              {posts.length === 0
                ? <div className="cd-empty">No recaps posted yet.</div>
                : posts.map(p => (
                    <div key={p.id} className="cd-post-row">
                      <div className="cd-post-title">{p.title}</div>
                      <div className="cd-post-author">{p.author_name} · {formatDate(p.created_at)}</div>
                    </div>
                  ))
              }
            </div>

          </div>
        )}

        {/* Forum */}
        {dashTab === "forum" && (
          <CampaignForum campaignId={id} currentUserId={user.id} isDM={isDM} />
        )}

      </div>
    </div>
  );
}