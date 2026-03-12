import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import CampaignCard from "../components/CampaignCard";
import CampaignDetail from "../components/CampaignDetail";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import "./CampaignBrowser.css";

const SYSTEMS = ["All Systems", "D&D 5e", "Pathfinder 2e", "OSR", "Call of Cthulhu", "Shadowrun", "Other"];
const PLAYERS_NEEDED = ["Any", "1", "2", "3", "4", "5+"];
const PLAYSTYLES = ["Any", "roleplay", "tactician", "explorer", "storyteller"];
const PLAYSTYLE_LABELS = {
  roleplay: "Roleplayer", tactician: "Tactician",
  explorer: "Explorer", storyteller: "Dungeon Master"
};

export default function CampaignBrowser() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const [filters, setFilters] = useState({
    system: "All Systems",
    players: "Any",
    playstyle: "Any",
    schedule: "",
  });

  useEffect(() => {
    fetchCampaigns();
    fetchUserProfile();
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [filters]);

 const fetchUserProfile = async () => {
  const { data } = await supabase
    .from("profiles")
    .select("playstyle, display_name, favourite_class")
    .eq("id", user.id)
    .maybeSingle();
  setUserProfile(data);
};

  const fetchCampaigns = async () => {
  setLoading(true);

  let query = supabase
    .from("posts")
    .select("*")
    .eq("type", "campaign")
    .order("created_at", { ascending: false });

  if (filters.system !== "All Systems") query = query.eq("system", filters.system);
  if (filters.players !== "Any") {
    if (filters.players === "5+") query = query.gte("players_needed", 5);
    else query = query.eq("players_needed", parseInt(filters.players));
  }
  if (filters.schedule) query = query.ilike("schedule", `%${filters.schedule}%`);

  const { data: posts, error } = await query;

  if (!posts || posts.length === 0) {
    setFeatured([]);
    setCampaigns([]);
    setLoading(false);
    return;
  }

  // Fetch profiles separately
  const userIds = [...new Set(posts.map(p => p.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, favourite_class, avatar_url, playstyle")
    .in("id", userIds);

  // Attach profile to each post manually
  const profileMap = {};
  (profiles || []).forEach(p => profileMap[p.id] = p);
  const enriched = posts.map(p => ({ ...p, profiles: profileMap[p.user_id] || null }));

  setFeatured(enriched.slice(0, 3));
  setCampaigns(enriched.slice(3));
  setLoading(false);
};

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));

  const isDM = userProfile?.playstyle === "storyteller";

  return (
    <div className="cb-wrap">
      {/* Stars */}
      <div className="cb-stars">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="cb-star" style={{
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
      <nav className="cb-nav">
        <button className="cb-nav-back" onClick={() => navigate("/home")}>
          ← Back to Tavern
        </button>
        <div className="cb-nav-logo">⚔️ The Tavern Board</div>
        <button className="cb-nav-profile" onClick={() => navigate(`/profile/${user?.id}`)}>
          My Profile
        </button>
        <SearchBar />
        <NotificationBell />
      </nav>

      <div className="cb-content">

        {/* Header */}
        <div className="cb-header">
          <div className="cb-eyebrow">Adventure Awaits</div>
          <h1 className="cb-title">The Campaign<br /><span>Registry</span></h1>
          <p className="cb-subtitle">Browse open campaigns seeking brave adventurers. Find your destiny.</p>
        </div>

        {/* Filters */}
        <div className="cb-filters">
          <div className="cb-filter-group">
            <label className="cb-filter-label">System</label>
            <select
              className="cb-filter-select"
              value={filters.system}
              onChange={e => setFilter("system", e.target.value)}
            >
              {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="cb-filter-group">
            <label className="cb-filter-label">Players Needed</label>
            <select
              className="cb-filter-select"
              value={filters.players}
              onChange={e => setFilter("players", e.target.value)}
            >
              {PLAYERS_NEEDED.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="cb-filter-group">
            <label className="cb-filter-label">Schedule</label>
            <input
              className="cb-filter-input"
              placeholder="e.g. weekends, evenings..."
              value={filters.schedule}
              onChange={e => setFilter("schedule", e.target.value)}
            />
          </div>
          <button className="cb-filter-reset" onClick={() => setFilters({ system: "All Systems", players: "Any", playstyle: "Any", schedule: "" })}>
            Reset
          </button>
        </div>

        {loading ? (
          <div className="cb-loading">Consulting the arcane archives...</div>
        ) : featured.length === 0 && campaigns.length === 0 ? (
          <div className="cb-empty">
            <div className="cb-empty-icon">🕯️</div>
            <p>No campaigns match your search. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && (
              <div className="cb-featured-section">
                <div className="cb-section-title">✦ Featured Campaigns</div>
                <div className="cb-featured-grid">
                  {featured.map(c => (
                    <CampaignCard
                      key={c.id}
                      campaign={c}
                      featured={true}
                      onClick={() => setSelected(c)}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* List */}
            {campaigns.length > 0 && (
              <div className="cb-list-section">
                <div className="cb-section-title">◈ All Campaigns</div>
                <div className="cb-list">
                  {campaigns.map(c => (
                    <CampaignCard
                      key={c.id}
                      campaign={c}
                      featured={false}
                      onClick={() => setSelected(c)}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <CampaignDetail
          campaign={selected}
          currentUserId={user?.id}
          isDM={isDM}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}