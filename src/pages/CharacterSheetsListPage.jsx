import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useAchievements } from "../context/AchievementContext";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import "./CharacterSheetsListPage.css";

const CLASS_ICONS = { Barbarian:"⚔️", Bard:"🎵", Cleric:"✝️", Druid:"🌿", Fighter:"🛡️", Monk:"👊", Paladin:"⚜️", Ranger:"🏹", Rogue:"🗡️", Sorcerer:"✨", Warlock:"👁️", Wizard:"📚" };

export default function CharacterSheetsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSystem, setNewSystem] = useState("5e");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSheets(); }, []);

  const { triggerCheck } = useAchievements();

  const fetchSheets = async () => {
    const { data } = await supabase.from("character_sheets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setSheets(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("character_sheets").insert({
      user_id: user.id,
      name: newName.trim(),
      system: newSystem,
    }).select().single();
    await triggerCheck(user.id, "character");
    setSaving(false);
    if (data) navigate(`/character/${data.id}`);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await supabase.from("character_sheets").delete().eq("id", id);
    fetchSheets();
  };

  return (
    <div className="csl-wrap">
      <div className="csl-stars">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="csl-star" style={{
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 6}s`, animationDuration: `${Math.random() * 4 + 4}s`,
          }} />
        ))}
      </div>
      <nav className="csl-nav">
        <button className="csl-nav-btn" onClick={() => navigate("/home")}>← Back to Tavern</button>
        <div className="csl-nav-logo">⚔️ The Tavern Board</div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <SearchBar /><NotificationBell />
          <button className="csl-nav-btn" onClick={() => navigate(`/profile/${user?.id}`)}>My Profile</button>
        </div>
      </nav>
      <div className="csl-content">
        <div className="csl-header">
          <div className="csl-eyebrow">Your Heroes</div>
          <h1 className="csl-title">Character <span>Sheets</span></h1>
          <p className="csl-subtitle">Chronicle the heroes of your adventures.</p>
        </div>
        <button className="csl-create-btn" onClick={() => setShowForm(!showForm)}>+ New Character</button>
        {showForm && (
          <div className="csl-form">
            <input className="csl-input" placeholder="Character name..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreate()} autoFocus />
            <select className="csl-input csl-select" value={newSystem} onChange={e => setNewSystem(e.target.value)}>
              <option value="5e">D&D 5e</option>
              <option value="custom">Custom System</option>
            </select>
            <div className="csl-form-actions">
              <button className="csl-save-btn" onClick={handleCreate} disabled={saving || !newName.trim()}>{saving ? "Creating..." : "Create Character"}</button>
              <button className="csl-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}
        {loading ? <div className="csl-loading">Consulting the arcane registry...</div> :
          sheets.length === 0 && !showForm ? (
            <div className="csl-empty"><div className="csl-empty-icon">📜</div><p>No characters yet. Create one to begin your legend.</p></div>
          ) : (
            <div className="csl-grid">
              {sheets.map(sheet => (
                <div key={sheet.id} className="csl-card" onClick={() => navigate(`/character/${sheet.id}`)}>
                  <div className="csl-card-icon">{CLASS_ICONS[sheet.class] || "🧙"}</div>
                  <div className="csl-card-name">{sheet.name}</div>
                  <div className="csl-card-meta">
                    {sheet.class && <span>{sheet.class}</span>}
                    {sheet.level && <span>Level {sheet.level}</span>}
                    {sheet.race && <span>{sheet.race}</span>}
                  </div>
                  <div className="csl-card-system">{sheet.system === "5e" ? "D&D 5e" : "Custom"}</div>
                  <button className="csl-card-delete" onClick={e => handleDelete(sheet.id, e)}>Delete</button>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}