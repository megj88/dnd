import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useAchievements } from "../context/AchievementContext";
import { useSearchParams } from "react-router-dom";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import "./MapsListPage.css";

export default function MapsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchMaps(); }, []);

  const { triggerCheck } = useAchievements();
  const [searchParams] = useSearchParams();
const linkedCampaignId = searchParams.get("campaign");

  const fetchMaps = async () => {
    const { data } = await supabase.from("maps").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setMaps(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
  if (!title.trim()) return;
  setSaving(true);
  const { data } = await supabase.from("maps").insert({ 
    user_id: user.id, 
    title: title.trim(),
    campaign_id: linkedCampaignId || null,
  }).select().single();
  setSaving(false);
  if (data) navigate(`/map/${data.id}`);
  await triggerCheck(user.id, "map");
};

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await supabase.from("maps").delete().eq("id", id);
    fetchMaps();
  };

  return (
    <div className="ml-wrap">
      <div className="ml-stars">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="ml-star" style={{
            left:`${Math.random()*100}%`, top:`${Math.random()*100}%`,
            width:`${Math.random()*2+1}px`, height:`${Math.random()*2+1}px`,
            animationDelay:`${Math.random()*6}s`, animationDuration:`${Math.random()*4+4}s`,
          }} />
        ))}
      </div>
      <nav className="ml-nav">
        <button className="ml-nav-btn" onClick={() => navigate("/home")}>← Back to Tavern</button>
        <div className="ml-nav-logo">⚔️ The Tavern Board</div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <SearchBar /><NotificationBell />
          <button className="ml-nav-btn" onClick={() => navigate(`/profile/${user?.id}`)}>My Profile</button>
        </div>
      </nav>

      <div className="ml-content">
        <div className="ml-header">
          <div className="ml-eyebrow">Cartography</div>
          <h1 className="ml-title">World <span>Maps</span></h1>
          <p className="ml-subtitle">Chart the realms of your campaigns and mark your discoveries.</p>
        </div>

        <button className="ml-create-btn" onClick={() => setShowForm(!showForm)}>+ New Map</button>

        {showForm && (
          <div className="ml-form">
            <input className="ml-input" placeholder="Map title, e.g. The Forgotten Realm..." value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreate()} autoFocus />
            <div className="ml-form-actions">
              <button className="ml-save-btn" onClick={handleCreate} disabled={saving || !title.trim()}>{saving ? "Creating..." : "Create Map"}</button>
              <button className="ml-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? <div className="ml-loading">Unrolling the parchment...</div> :
          maps.length === 0 && !showForm ? (
            <div className="ml-empty"><div className="ml-empty-icon">🗺️</div><p>No maps yet. Create one to chart your world.</p></div>
          ) : (
            <div className="ml-grid">
              {maps.map(map => (
                <div key={map.id} className="ml-card" onClick={() => navigate(`/map/${map.id}`)}>
                  <div className="ml-card-bg" style={map.background_url ? { backgroundImage:`url(${map.background_url})` } : {}} />
                  <div className="ml-card-overlay">
                    <div className="ml-card-icon">🗺️</div>
                    <div className="ml-card-title">{map.title}</div>
                    <div className="ml-card-meta">{map.shared ? "Shared with party" : "Private"}</div>
                    <button className="ml-card-delete" onClick={e => handleDelete(map.id, e)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}