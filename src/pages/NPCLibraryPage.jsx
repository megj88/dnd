import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import "./NPCLibraryPage.css";

export default function NPCLibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [filterCampaign, setFilterCampaign] = useState("all");

  useEffect(() => { fetchNPCs(); fetchCampaigns(); }, []);

  const fetchNPCs = async () => {
    setLoading(true);
    const { data } = await supabase.from("npc_library").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setNpcs(data || []);
    setLoading(false);
  };

  const fetchCampaigns = async () => {
    const { data } = await supabase.from("posts").select("id, title").eq("user_id", user.id).eq("type", "campaign");
    setCampaigns(data || []);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this NPC from your library?")) return;
    await supabase.from("npc_library").delete().eq("id", id);
    setSelected(null);
    fetchNPCs();
  };

  const filtered = npcs.filter(n => {
    const matchSearch = !search || n.name?.toLowerCase().includes(search.toLowerCase()) || n.race?.toLowerCase().includes(search.toLowerCase());
    const matchCampaign = filterCampaign === "all" || n.campaign_id === filterCampaign || (filterCampaign === "none" && !n.campaign_id);
    return matchSearch && matchCampaign;
  });

  const formatDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="npcl-wrap">
      <div className="npcl-stars">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="npcl-star" style={{
            left:`${Math.random()*100}%`, top:`${Math.random()*100}%`,
            width:`${Math.random()*2+1}px`, height:`${Math.random()*2+1}px`,
            animationDelay:`${Math.random()*6}s`, animationDuration:`${Math.random()*4+4}s`,
          }} />
        ))}
      </div>

      <nav className="npcl-nav">
        <button className="npcl-nav-btn" onClick={() => navigate("/home")}>← Tavern</button>
        <div className="npcl-nav-logo">⚔️ The Tavern Board</div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <SearchBar /><NotificationBell />
          <button className="npcl-nav-btn" onClick={() => navigate(`/profile/${user?.id}`)}>My Profile</button>
        </div>
      </nav>

      <div className="npcl-content">
        <div className="npcl-header">
          <div>
            <div className="npcl-eyebrow">Your Collection</div>
            <h1 className="npcl-title">NPC <span>Library</span></h1>
          </div>
        </div>

        <div className="npcl-controls">
          <input className="npcl-search" placeholder="Search by name or race..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="npcl-filter" value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)}>
            <option value="all">All Campaigns</option>
            <option value="none">No Campaign</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        <div className="npcl-body">
          <div className="npcl-list">
            {loading ? (
              <div className="npcl-loading">Loading your NPCs...</div>
            ) : filtered.length === 0 ? (
              <div className="npcl-empty">
                <div className="npcl-empty-icon">🎭</div>
                <p>No NPCs yet. Generate some in your campaign journal!</p>
              </div>
            ) : filtered.map(n => (
              <div key={n.id} className={`npcl-item ${selected?.id === n.id ? "active" : ""}`} onClick={() => setSelected(n)}>
                <div className="npcl-item-name">{n.name}</div>
                <div className="npcl-item-meta">
                  {n.race && <span>{n.race}</span>}
                  <span>{formatDate(n.created_at)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="npcl-detail">
            {!selected ? (
              <div className="npcl-detail-empty">
                <div className="npcl-detail-empty-icon">🎭</div>
                <p>Select an NPC to view their full profile</p>
              </div>
            ) : (
              <>
                <div className="npcl-detail-header">
                  <div>
                    <h2 className="npcl-detail-name">{selected.name}</h2>
                    {selected.race && <div className="npcl-detail-race">{selected.race}</div>}
                  </div>
                  <button className="npcl-delete-btn" onClick={() => handleDelete(selected.id)}>Delete</button>
                </div>

                {[
                  { label: "Appearance", key: "appearance" },
                  { label: "Personality", key: "personality" },
                  { label: "Backstory", key: "backstory" },
                  { label: "Motivations", key: "motivations" },
                  { label: "Secrets", key: "secrets" },
                  { label: "Roleplaying Hooks", key: "hooks" },
                  { label: "Stats / Combat Role", key: "stats" },
                ].map(f => selected[f.key] && (
                  <div key={f.key} className="npcl-detail-section">
                    <div className="npcl-detail-section-label">{f.label}</div>
                    <p className="npcl-detail-section-body">{selected[f.key]}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}