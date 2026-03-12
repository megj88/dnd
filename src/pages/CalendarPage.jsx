import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import EventModal from "../components/EventModal";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import "./CalendarPage.css";

const TYPE_CONFIG = {
  session:     { label:"Session",     icon:"⚔️", color:"#c9a96e" },
  social:      { label:"Social",      icon:"🍺", color:"#7ec98a" },
  one_shot:    { label:"One Shot",    icon:"🎲", color:"#9b7ec9" },
  convention:  { label:"Convention",  icon:"🏰", color:"#7090c9" },
  other:       { label:"Other",       icon:"📅", color:"#8a7060" },
};

const RSVP_CONFIG = {
  going:  { label:"Going",        color:"#7ec98a" },
  maybe:  { label:"Maybe",        color:"#c9a96e" },
  cant:   { label:"Can't Attend", color:"#c97070" },
};

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("month");
  const [today] = useState(new Date());
  const [current, setCurrent] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [rsvps, setRsvps] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, [current]);

  const fetchAll = async () => {
    setLoading(true);
    const startOfMonth = new Date(current.getFullYear(), current.getMonth(), 1).toISOString();
    const endOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const [{ data: eventsData }, { data: sessionsData }] = await Promise.all([
      supabase.from("events").select("*").or(`user_id.eq.${user.id},shared.eq.true`).gte("starts_at", startOfMonth).lte("starts_at", endOfMonth).order("starts_at"),
      supabase.from("sessions").select("*").or(`created_by.eq.${user.id}`).gte("scheduled_at", startOfMonth).lte("scheduled_at", endOfMonth).order("scheduled_at"),
    ]);

    setEvents(eventsData || []);

    // Convert sessions to event-like objects
    const sessionEvents = (sessionsData || []).map(s => ({
      id: `session-${s.id}`,
      title: s.title,
      type: "session",
      starts_at: s.scheduled_at,
      description: s.notes,
      isSession: true,
      sessionId: s.id,
    }));
    setSessions(sessionEvents);

    // Fetch rsvps
    const eventIds = (eventsData || []).map(e => e.id);
    if (eventIds.length > 0) {
      const { data: rsvpData } = await supabase.from("event_rsvps").select("*").eq("user_id", user.id).in("event_id", eventIds);
      const map = {};
      (rsvpData || []).forEach(r => map[r.event_id] = r.rsvp);
      setRsvps(map);
    }

    setLoading(false);
  };

  const allEvents = [...events, ...sessions];

  const eventsForDay = (date) => {
    return allEvents.filter(e => {
      const d = new Date(e.starts_at);
      return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
    });
  };

  const handleRsvp = async (eventId, rsvp) => {
    await supabase.from("event_rsvps").upsert({ event_id: eventId, user_id: user.id, rsvp }, { onConflict: "event_id,user_id" });
    setRsvps(prev => ({ ...prev, [eventId]: rsvp }));
  };

  const handleDeleteEvent = async (eventId) => {
    await supabase.from("events").delete().eq("id", eventId);
    setSelectedEvent(null);
    fetchAll();
  };

  // Build calendar grid
  const firstDay = new Date(current.getFullYear(), current.getMonth(), 1).getDay();
  const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(new Date(current.getFullYear(), current.getMonth(), i));

  // Upcoming reminders (events in next 24h)
  const upcoming24h = allEvents.filter(e => {
    const diff = new Date(e.starts_at) - new Date();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  });

  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" });

  return (
    <div className="cp-wrap">
      <div className="cp-stars">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="cp-star" style={{
            left:`${Math.random()*100}%`, top:`${Math.random()*100}%`,
            width:`${Math.random()*2+1}px`, height:`${Math.random()*2+1}px`,
            animationDelay:`${Math.random()*6}s`, animationDuration:`${Math.random()*4+4}s`,
          }} />
        ))}
      </div>

      <nav className="cp-nav">
        <button className="cp-nav-btn" onClick={() => navigate("/home")}>← Back to Tavern</button>
        <div className="cp-nav-logo">⚔️ The Tavern Board</div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <SearchBar /><NotificationBell />
          <button className="cp-nav-btn" onClick={() => navigate(`/profile/${user?.id}`)}>My Profile</button>
        </div>
      </nav>

      <div className="cp-content">

        {/* Reminders banner */}
        {upcoming24h.length > 0 && (
          <div className="cp-reminders">
            <div className="cp-reminders-icon">⏰</div>
            <div className="cp-reminders-text">
              {upcoming24h.map(e => (
                <span key={e.id} className="cp-reminder-item">
                  <strong>{e.title}</strong> starts at {formatTime(e.starts_at)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="cp-header">
          <div className="cp-header-left">
            <button className="cp-nav-month" onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1))}>‹</button>
            <h2 className="cp-month-title">{MONTHS[current.getMonth()]} {current.getFullYear()}</h2>
            <button className="cp-nav-month" onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1))}>›</button>
            <button className="cp-today-btn" onClick={() => setCurrent(new Date())}>Today</button>
          </div>
          <div className="cp-header-right">
            <div className="cp-view-toggle">
              <button className={`cp-view-btn ${view === "month" ? "active" : ""}`} onClick={() => setView("month")}>Month</button>
              <button className={`cp-view-btn ${view === "agenda" ? "active" : ""}`} onClick={() => setView("agenda")}>Agenda</button>
            </div>
            <button className="cp-create-btn" onClick={() => { setEditingEvent(null); setShowModal(true); }}>+ New Event</button>
          </div>
        </div>

        {loading ? <div className="cp-loading">Consulting the stars...</div> : (
          <>
            {/* Month view */}
            {view === "month" && (
              <div className="cp-calendar">
                <div className="cp-day-headers">
                  {DAYS.map(d => <div key={d} className="cp-day-header">{d}</div>)}
                </div>
                <div className="cp-grid">
                  {calendarDays.map((date, i) => {
                    if (!date) return <div key={`empty-${i}`} className="cp-cell cp-cell-empty" />;
                    const dayEvents = eventsForDay(date);
                    const isToday = date.toDateString() === today.toDateString();
                    const isSelected = selectedDay?.toDateString() === date.toDateString();
                    return (
                      <div
                        key={date.toISOString()}
                        className={`cp-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedDay(isSelected ? null : date)}
                      >
                        <div className="cp-cell-date">{date.getDate()}</div>
                        <div className="cp-cell-events">
                          {dayEvents.slice(0, 3).map(e => (
                            <div
                              key={e.id}
                              className="cp-cell-event"
                              style={{ borderLeftColor: TYPE_CONFIG[e.type]?.color }}
                              onClick={ev => { ev.stopPropagation(); setSelectedEvent(e); setSelectedDay(null); }}
                            >
                              {TYPE_CONFIG[e.type]?.icon} {e.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && <div className="cp-cell-more">+{dayEvents.length - 3} more</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Agenda view */}
            {view === "agenda" && (
              <div className="cp-agenda">
                {allEvents.length === 0 ? (
                  <div className="cp-empty"><div className="cp-empty-icon">📅</div><p>No events this month.</p></div>
                ) : (
                  allEvents.map((e, i) => {
                    const showDate = i === 0 || formatDate(allEvents[i-1].starts_at) !== formatDate(e.starts_at);
                    return (
                      <div key={e.id}>
                        {showDate && <div className="cp-agenda-date">{formatDate(e.starts_at)}</div>}
                        <div className="cp-agenda-event" onClick={() => setSelectedEvent(e)} style={{ borderLeftColor: TYPE_CONFIG[e.type]?.color }}>
                          <div className="cp-agenda-time">{formatTime(e.starts_at)}</div>
                          <div className="cp-agenda-info">
                            <div className="cp-agenda-title">{TYPE_CONFIG[e.type]?.icon} {e.title}</div>
                            {e.description && <div className="cp-agenda-desc">{e.description}</div>}
                          </div>
                          {!e.isSession && rsvps[e.id] && (
                            <div className="cp-agenda-rsvp" style={{ color: RSVP_CONFIG[rsvps[e.id]]?.color }}>
                              {RSVP_CONFIG[rsvps[e.id]]?.label}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Day detail panel */}
            {selectedDay && (
              <div className="cp-day-panel">
                <div className="cp-day-panel-header">
                  <div className="cp-day-panel-title">{formatDate(selectedDay.toISOString())}</div>
                  <button className="cp-day-panel-close" onClick={() => setSelectedDay(null)}>✕</button>
                </div>
                {eventsForDay(selectedDay).length === 0 ? (
                  <div className="cp-day-panel-empty">No events on this day.</div>
                ) : (
                  eventsForDay(selectedDay).map(e => (
                    <div key={e.id} className="cp-day-event" onClick={() => { setSelectedEvent(e); setSelectedDay(null); }}>
                      <div className="cp-day-event-type" style={{ color: TYPE_CONFIG[e.type]?.color }}>{TYPE_CONFIG[e.type]?.icon} {TYPE_CONFIG[e.type]?.label}</div>
                      <div className="cp-day-event-title">{e.title}</div>
                      <div className="cp-day-event-time">{formatTime(e.starts_at)}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Event detail panel */}
            {selectedEvent && (
              <div className="cp-event-panel">
                <div className="cp-event-panel-header">
                  <div className="cp-event-type-badge" style={{ color: TYPE_CONFIG[selectedEvent.type]?.color, borderColor: `${TYPE_CONFIG[selectedEvent.type]?.color}44` }}>
                    {TYPE_CONFIG[selectedEvent.type]?.icon} {TYPE_CONFIG[selectedEvent.type]?.label}
                  </div>
                  <div className="cp-event-panel-actions">
                    {!selectedEvent.isSession && selectedEvent.user_id === user.id && (
                      <>
                        <button className="cp-event-edit-btn" onClick={() => { setEditingEvent(selectedEvent); setShowModal(true); setSelectedEvent(null); }}>Edit</button>
                        <button className="cp-event-delete-btn" onClick={() => handleDeleteEvent(selectedEvent.id)}>Delete</button>
                      </>
                    )}
                    <button className="cp-event-panel-close" onClick={() => setSelectedEvent(null)}>✕</button>
                  </div>
                </div>
                <div className="cp-event-panel-title">{selectedEvent.title}</div>
                <div className="cp-event-panel-date">{formatDate(selectedEvent.starts_at)} at {formatTime(selectedEvent.starts_at)}</div>
                {selectedEvent.description && <p className="cp-event-panel-desc">{selectedEvent.description}</p>}

                {!selectedEvent.isSession && (
                  <div className="cp-rsvp-section">
                    <div className="cp-rsvp-label">Your RSVP</div>
                    <div className="cp-rsvp-btns">
                      {["going","maybe","cant"].map(r => (
                        <button
                          key={r}
                          className={`cp-rsvp-btn ${rsvps[selectedEvent.id] === r ? "active" : ""}`}
                          style={rsvps[selectedEvent.id] === r ? { borderColor: RSVP_CONFIG[r].color, color: RSVP_CONFIG[r].color } : {}}
                          onClick={() => handleRsvp(selectedEvent.id, r)}
                        >
                          {RSVP_CONFIG[r].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.isSession && (
                  <button className="cp-session-link-btn" onClick={() => navigate("/scheduler")}>
                    View in Scheduler →
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <EventModal
          userId={user.id}
          existing={editingEvent}
          onClose={() => { setShowModal(false); setEditingEvent(null); }}
          onSaved={() => { setShowModal(false); setEditingEvent(null); fetchAll(); }}
        />
      )}
    </div>
  );
}