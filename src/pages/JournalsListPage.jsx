import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useSearchParams } from "react-router-dom";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import "./JournalsListPage.css";

export default function JournalsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchJournals(); }, []);

  const [searchParams] = useSearchParams();
  const linkedCampaignId = searchParams.get("campaign");

  const fetchJournals = async () => {
    const { data } = await supabase.from("journals").select("*").eq("created_by", user.id).order("created_at", { ascending: false });
    setJournals(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("journals").insert({ 
  title: title.trim(), 
  created_by: user.id,
  campaign_id: linkedCampaignId || null,
}).select().single();
    setSaving(false);
    if (data) navigate(`/journal/${data.id}`);
  };

  const handleDelete = async (id) => {
    await supabase.from("journals").delete().eq("id", id);
    fetchJournals();
  };

  return (
    <div className="jl-wrap">
      <div className="jl-stars">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="jl-star" style={{
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 6}s`, animationDuration: `${Math.random() * 4 + 4}s`,
          }} />
        ))}
      </div>

      <nav className="jl-nav">
        <button className="jl-nav-btn" onClick={() => navigate("/home")}>← Back to Tavern</button>
        <div className="jl-nav-logo">⚔️ The Tavern Board</div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <SearchBar />
          <NotificationBell />
          <button className="jl-nav-btn" onClick={() => navigate(`/profile/${user?.id}`)}>My Profile</button>
        </div>
      </nav>

      <div className="jl-content">
        <div className="jl-header">
          <div className="jl-eyebrow">Your Chronicles</div>
          <h1 className="jl-title">Campaign <span>Journals</span></h1>
          <p className="jl-subtitle">Preserve the stories of your adventures for posterity.</p>
        </div>

        <button className="jl-create-btn" onClick={() => setShowForm(!showForm)}>
          + New Journal
        </button>

        {showForm && (
          <div className="jl-form">
            <input
              className="jl-input"
              placeholder="Journal title, e.g. The Dragon's Lair Campaign"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <div className="jl-form-actions">
              <button className="jl-save-btn" onClick={handleCreate} disabled={saving || !title.trim()}>
                {saving ? "Creating..." : "Create Journal"}
              </button>
              <button className="jl-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="jl-loading">Consulting the archives...</div>
        ) : journals.length === 0 && !showForm ? (
          <div className="jl-empty">
            <div className="jl-empty-icon">📖</div>
            <p>No journals yet. Create one to start chronicling your campaigns.</p>
          </div>
        ) : (
          <div className="jl-grid">
            {journals.map(j => (
              <div key={j.id} className="jl-card" onClick={() => navigate(`/journal/${j.id}`)}>
                <div className="jl-card-icon">📖</div>
                <div className="jl-card-title">{j.title}</div>
                <div className="jl-card-date">Created {new Date(j.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
                <button className="jl-card-delete" onClick={e => { e.stopPropagation(); handleDelete(j.id); }}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}