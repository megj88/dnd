import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { createNotification } from "../utils/notify";
import { useAchievements } from "../context/AchievementContext";
import PlayerCard from "../components/PlayerCard";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import "./PartyFinder.css";

const PLAYSTYLES = [
  { value: "any", label: "Any Playstyle" },
  { value: "roleplay", label: "Roleplayer" },
  { value: "tactician", label: "Tactician" },
  { value: "explorer", label: "Explorer" },
  { value: "storyteller", label: "Dungeon Master" },
];

const EXPERIENCE_LEVELS = [
  { value: "any", label: "Any Experience" },
  { value: "new", label: "New to TTRPG" },
  { value: "some", label: "Some Experience" },
  { value: "experienced", label: "Experienced" },
  { value: "veteran", label: "Veteran" },
];

const SYSTEMS = [
  "Any System", "D&D 5e", "Pathfinder 2e", "OSR",
  "Call of Cthulhu", "Shadowrun", "Other"
];

export default function PartyFinder() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nudges, setNudges] = useState([]);

  const [filters, setFilters] = useState({
    playstyle: "any",
    system: "Any System",
    availability: "",
    experience: "any",
  });

  useEffect(() => {
    fetchPlayers();
    fetchMyNudges();
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [filters]);

  const { triggerCheck } = useAchievements();

  const fetchMyNudges = async () => {
    const { data } = await supabase
      .from("nudges")
      .select("receiver_id")
      .eq("sender_id", user.id);
    setNudges((data || []).map(n => n.receiver_id));
  };

  const fetchPlayers = async () => {
    setLoading(true);

    let query = supabase
      .from("profiles")
      .select("*")
      .neq("id", user.id)
      .eq("onboarding_complete", true)
      .order("created_at", { ascending: false });

    if (filters.playstyle !== "any") query = query.eq("playstyle", filters.playstyle);
    if (filters.system !== "Any System") query = query.ilike("system_preference", `%${filters.system}%`);
    if (filters.availability) query = query.ilike("availability", `%${filters.availability}%`);
    if (filters.experience !== "any") query = query.eq("experience_level", filters.experience);

    const { data } = await query;
    const all = data || [];
    setFeatured(all.slice(0, 3));
    setPlayers(all.slice(3));
    setLoading(false);
  };

 const handleNudge = async (receiverId) => {
  if (nudges.includes(receiverId)) {
    await supabase.from("nudges").delete()
      .eq("sender_id", user.id)
      .eq("receiver_id", receiverId);
    setNudges(n => n.filter(id => id !== receiverId));
  } else {
    await supabase.from("nudges").insert({
      sender_id: user.id,
      receiver_id: receiverId,
    });
    setNudges(n => [...n, receiverId]);

    const senderName = userProfile?.display_name || userProfile?.favourite_class || "An adventurer";
    await createNotification({
      userId: receiverId,
      type: "nudge",
      message: `${senderName} nudged you!`,
      link: `/profile/${user.id}`,
    });
    await triggerCheck(user.id, "nudge_given");
await triggerCheck(playerId, "nudge_received");
  }
};

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));

  return (
    <div className="pf-wrap">
      {/* Stars */}
      <div className="pf-stars">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="pf-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 6}s`,
            animationDuration: `${Math.random() * 4 + 4}s`,
          }} />
        ))}
      </div>

      {/* Nav */}
      <nav className="pf-nav">
        
        <button className="pf-nav-btn" onClick={() => navigate("/home")}>
          ← Back to Tavern
        </button>
        <div className="pf-nav-logo">⚔️ The Tavern Board</div>
        <button className="pf-nav-btn" onClick={() => navigate(`/profile/${user?.id}`)}>
          My Profile
        </button>
        <SearchBar />
        <NotificationBell />
      </nav>

      <div className="pf-content">

        {/* Header */}
        <div className="pf-header">
          <div className="pf-eyebrow">Seek Your Companions</div>
          <h1 className="pf-title">The Party<br /><span>Finder</span></h1>
          <p className="pf-subtitle">Find fellow adventurers who share your playstyle, schedule, and ambitions.</p>
        </div>

        {/* Filters */}
        <div className="pf-filters">
          <div className="pf-filter-group">
            <label className="pf-filter-label">Playstyle</label>
            <select
              className="pf-filter-select"
              value={filters.playstyle}
              onChange={e => setFilter("playstyle", e.target.value)}
            >
              {PLAYSTYLES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="pf-filter-group">
            <label className="pf-filter-label">System</label>
            <select
              className="pf-filter-select"
              value={filters.system}
              onChange={e => setFilter("system", e.target.value)}
            >
              {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="pf-filter-group">
            <label className="pf-filter-label">Availability</label>
            <input
              className="pf-filter-input"
              placeholder="e.g. weekends, evenings..."
              value={filters.availability}
              onChange={e => setFilter("availability", e.target.value)}
            />
          </div>
          <div className="pf-filter-group">
            <label className="pf-filter-label">Experience</label>
            <select
              className="pf-filter-select"
              value={filters.experience}
              onChange={e => setFilter("experience", e.target.value)}
            >
              {EXPERIENCE_LEVELS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <button className="pf-filter-reset" onClick={() => setFilters({ playstyle: "any", system: "Any System", availability: "", experience: "any" })}>
            Reset
          </button>
        </div>

        {loading ? (
          <div className="pf-loading">Searching the realm for adventurers...</div>
        ) : featured.length === 0 && players.length === 0 ? (
          <div className="pf-empty">
            <div className="pf-empty-icon">🕯️</div>
            <p>No adventurers match your search. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && (
              <div className="pf-featured-section">
                <div className="pf-section-title">✦ Featured Adventurers</div>
                <div className="pf-featured-grid">
                  {featured.map(player => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      nudged={nudges.includes(player.id)}
                      onNudge={() => handleNudge(player.id)}
                      onViewProfile={() => navigate(`/profile/${player.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* List */}
            {players.length > 0 && (
              <div className="pf-list-section">
                <div className="pf-section-title">◈ All Adventurers</div>
                <div className="pf-list">
                  {players.map(player => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      nudged={nudges.includes(player.id)}
                      onNudge={() => handleNudge(player.id)}
                      onViewProfile={() => navigate(`/profile/${player.id}`)}
                      compact={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}