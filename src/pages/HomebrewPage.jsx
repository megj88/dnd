import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import HomebrewCard from "../components/HomebrewCard";
import HomebrewDetail from "../components/HomebrewDetail";
import HomebrewForm from "../components/HomebrewForm";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import "./HomebrewPage.css";

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "spell", label: "Spells" },
  { value: "class", label: "Classes" },
  { value: "monster", label: "Monsters" },
  { value: "magic_item", label: "Magic Items" },
  { value: "rule", label: "Rules" },
  { value: "adventure", label: "Adventures" },
  { value: "saved", label: "🔖 Saved" },
];

export default function HomebrewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [likes, setLikes] = useState(new Set());
  const [saves, setSaves] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => { fetchAll(); }, [typeFilter]);

  const fetchAll = async () => {
    setLoading(true);

    // Fetch likes and saves
    const [{ data: likeData }, { data: saveData }] = await Promise.all([
      supabase.from("homebrew_likes").select("homebrew_id").eq("user_id", user.id),
      supabase.from("homebrew_saves").select("homebrew_id").eq("user_id", user.id),
    ]);
    setLikes(new Set((likeData || []).map(l => l.homebrew_id)));
    setSaves(new Set((saveData || []).map(s => s.homebrew_id)));

    let query = supabase.from("homebrew").select("*").order("created_at", { ascending: false });

    if (typeFilter === "saved") {
      const savedIds = (saveData || []).map(s => s.homebrew_id);
      if (savedIds.length === 0) { setItems([]); setLoading(false); return; }
      query = query.in("id", savedIds);
    } else if (typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    }

    const { data } = await query;
    if (!data || data.length === 0) { setItems([]); setLoading(false); return; }

    // Enrich with profiles, like/save/comment counts
    const userIds = [...new Set(data.map(i => i.user_id))];
    const [{ data: profiles }, { data: allLikes }, { data: allSaves }, { data: allComments }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, favourite_class").in("id", userIds),
      supabase.from("homebrew_likes").select("homebrew_id").in("homebrew_id", data.map(i => i.id)),
      supabase.from("homebrew_saves").select("homebrew_id").in("homebrew_id", data.map(i => i.id)),
      supabase.from("homebrew_comments").select("homebrew_id").in("homebrew_id", data.map(i => i.id)),
    ]);

    const profileMap = {};
    (profiles || []).forEach(p => profileMap[p.id] = p);

    const likeCount = {};
    (allLikes || []).forEach(l => likeCount[l.homebrew_id] = (likeCount[l.homebrew_id] || 0) + 1);
    const saveCount = {};
    (allSaves || []).forEach(s => saveCount[s.homebrew_id] = (saveCount[s.homebrew_id] || 0) + 1);
    const commentCount = {};
    (allComments || []).forEach(c => commentCount[c.homebrew_id] = (commentCount[c.homebrew_id] || 0) + 1);

    setItems(data.map(i => ({
      ...i,
      profiles: profileMap[i.user_id] || null,
      like_count: likeCount[i.id] || 0,
      save_count: saveCount[i.id] || 0,
      comment_count: commentCount[i.id] || 0,
    })));
    setLoading(false);
  };

  const handleLike = async (item) => {
    if (likes.has(item.id)) {
      await supabase.from("homebrew_likes").delete().eq("homebrew_id", item.id).eq("user_id", user.id);
      setLikes(prev => { const n = new Set(prev); n.delete(item.id); return n; });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, like_count: Math.max(0, i.like_count - 1) } : i));
    } else {
      await supabase.from("homebrew_likes").insert({ homebrew_id: item.id, user_id: user.id });
      setLikes(prev => new Set([...prev, item.id]));
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, like_count: i.like_count + 1 } : i));
    }
    if (selectedItem?.id === item.id) setSelectedItem(i => ({ ...i, like_count: likes.has(item.id) ? i.like_count - 1 : i.like_count + 1 }));
  };

  const handleSave = async (item) => {
    if (saves.has(item.id)) {
      await supabase.from("homebrew_saves").delete().eq("homebrew_id", item.id).eq("user_id", user.id);
      setSaves(prev => { const n = new Set(prev); n.delete(item.id); return n; });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, save_count: Math.max(0, i.save_count - 1) } : i));
    } else {
      await supabase.from("homebrew_saves").insert({ homebrew_id: item.id, user_id: user.id });
      setSaves(prev => new Set([...prev, item.id]));
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, save_count: i.save_count + 1 } : i));
    }
  };

  const handleDelete = async (item) => {
    await supabase.from("homebrew").delete().eq("id", item.id);
    setSelectedItem(null);
    fetchAll();
  };

  const filtered = items.filter(item => {
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase());
    const matchTag = !tagFilter || item.tags?.includes(tagFilter.toLowerCase());
    return matchSearch && matchTag;
  });

  return (
    <div className="hp-wrap">
      <div className="hp-stars">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="hp-star" style={{
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 6}s`, animationDuration: `${Math.random() * 4 + 4}s`,
          }} />
        ))}
      </div>

      <nav className="hp-nav">
        <button className="hp-nav-btn" onClick={() => navigate("/home")}>← Back to Tavern</button>
        <div className="hp-nav-logo">⚔️ The Tavern Board</div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <SearchBar />
          <NotificationBell />
          <button className="hp-nav-btn" onClick={() => navigate(`/profile/${user?.id}`)}>My Profile</button>
        </div>
      </nav>

      <div className="hp-content">
        <div className="hp-header">
          <div className="hp-eyebrow">The Scriptorium</div>
          <h1 className="hp-title">Homebrew <span>Workshop</span></h1>
          <p className="hp-subtitle">Discover and share custom creations from adventurers across the realm.</p>
        </div>

        <div className="hp-toolbar">
          <input
            className="hp-search"
            placeholder="Search homebrew..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input
            className="hp-tag-search"
            placeholder="Filter by tag..."
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
          />
          <button className="hp-create-btn" onClick={() => { setEditingItem(null); setShowForm(true); }}>
            + Share Homebrew
          </button>
        </div>

        <div className="hp-type-filters">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              className={`hp-type-btn ${typeFilter === f.value ? "active" : ""}`}
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="hp-loading">Consulting the arcane archives...</div>
        ) : filtered.length === 0 ? (
          <div className="hp-empty">
            <div className="hp-empty-icon">📜</div>
            <p>No homebrew found. Be the first to share your creation!</p>
          </div>
        ) : (
          <div className="hp-grid">
            {filtered.map(item => (
              <HomebrewCard
                key={item.id}
                item={item}
                currentUserId={user.id}
                liked={likes.has(item.id)}
                saved={saves.has(item.id)}
                onLike={() => handleLike(item)}
                onSave={() => handleSave(item)}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedItem && (
        <HomebrewDetail
          item={selectedItem}
          currentUserId={user.id}
          liked={likes.has(selectedItem.id)}
          saved={saves.has(selectedItem.id)}
          onLike={() => handleLike(selectedItem)}
          onSave={() => handleSave(selectedItem)}
          onClose={() => setSelectedItem(null)}
          onEdit={() => { setEditingItem(selectedItem); setSelectedItem(null); setShowForm(true); }}
          onDelete={() => handleDelete(selectedItem)}
        />
      )}

      {showForm && (
        <HomebrewForm
          userId={user.id}
          existing={editingItem}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSaved={() => { setShowForm(false); setEditingItem(null); fetchAll(); }}
        />
      )}
    </div>
  );
}