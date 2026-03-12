import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import "./RulesPage.css";

const TABS = [
  { key:"spells", label:"🔮 Spells", endpoint:"spells" },
  { key:"monsters", label:"👹 Monsters", endpoint:"monsters" },
  { key:"conditions", label:"🌀 Conditions", endpoint:"conditions" },
  { key:"classes", label:"🧙 Classes", endpoint:"classes" },
  { key:"races", label:"🧝 Races", endpoint:"races" },
  { key:"equipment", label:"⚔️ Equipment", endpoint:"equipment" },
  { key:"rules", label:"📜 Combat Rules", endpoint:"rules" },
];

const BASE = "https://api.open5e.com/v1";

export default function RulesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("spells");
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setItems([]); setSelected(null); setPage(1); setSearch("");
    fetchItems(1, "");
  }, [tab]);

  const fetchItems = useCallback(async (p = 1, s = search) => {
    setLoading(true);
    const endpoint = TABS.find(t => t.key === tab)?.endpoint;
    const params = new URLSearchParams({ limit: 20, page: p });
    if (s) params.append("search", s);
    const res = await fetch(`${BASE}/${endpoint}/?${params}`);
    const data = await res.json();
    setItems(prev => p === 1 ? (data.results || []) : [...prev, ...(data.results || [])]);
    setHasMore(!!data.next);
    setLoading(false);
  }, [tab, search]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    clearTimeout(window._rulesTimer);
    window._rulesTimer = setTimeout(() => fetchItems(1, val), 400);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchItems(next, search);
  };

  const renderDetail = () => {
    if (!selected) return null;
    const t = tab;

    if (t === "spells") return (
      <div className="rp-detail-body">
        <div className="rp-detail-tags">
          {selected.level !== undefined && <span className="rp-tag">{selected.level === 0 ? "Cantrip" : `Level ${selected.level}`}</span>}
          {selected.school && <span className="rp-tag">{selected.school}</span>}
          {selected.casting_time && <span className="rp-tag">⏱ {selected.casting_time}</span>}
          {selected.range && <span className="rp-tag">📏 {selected.range}</span>}
          {selected.duration && <span className="rp-tag">⌛ {selected.duration}</span>}
          {selected.concentration && <span className="rp-tag rp-tag-warn">Concentration</span>}
          {selected.ritual && <span className="rp-tag rp-tag-warn">Ritual</span>}
        </div>
        {selected.components && <p className="rp-detail-meta"><strong>Components:</strong> {selected.components}</p>}
        {selected.material && <p className="rp-detail-meta"><strong>Material:</strong> {selected.material}</p>}
        <p className="rp-detail-desc">{selected.desc}</p>
        {selected.higher_level && <div className="rp-detail-higher"><strong>At Higher Levels:</strong> {selected.higher_level}</div>}
      </div>
    );

    if (t === "monsters") return (
      <div className="rp-detail-body">
        <div className="rp-detail-tags">
          {selected.size && <span className="rp-tag">{selected.size}</span>}
          {selected.type && <span className="rp-tag">{selected.type}</span>}
          {selected.alignment && <span className="rp-tag">{selected.alignment}</span>}
          {selected.challenge_rating && <span className="rp-tag rp-tag-gold">CR {selected.challenge_rating}</span>}
        </div>
        <div className="rp-stat-grid">
          {["strength","dexterity","constitution","intelligence","wisdom","charisma"].map(stat => (
            <div key={stat} className="rp-stat-box">
              <div className="rp-stat-name">{stat.slice(0,3).toUpperCase()}</div>
              <div className="rp-stat-val">{selected[stat]}</div>
              <div className="rp-stat-mod">{Math.floor((selected[stat]-10)/2) >= 0 ? "+" : ""}{Math.floor((selected[stat]-10)/2)}</div>
            </div>
          ))}
        </div>
        <div className="rp-detail-meta-grid">
          {selected.armor_class && <p><strong>AC:</strong> {selected.armor_class}</p>}
          {selected.hit_points && <p><strong>HP:</strong> {selected.hit_points} ({selected.hit_dice})</p>}
          {selected.speed && <p><strong>Speed:</strong> {selected.speed}</p>}
          {selected.senses && <p><strong>Senses:</strong> {selected.senses}</p>}
          {selected.languages && <p><strong>Languages:</strong> {selected.languages}</p>}
        </div>
        {selected.desc && <p className="rp-detail-desc">{selected.desc}</p>}
        {selected.actions && selected.actions.length > 0 && (
          <div className="rp-detail-section">
            <div className="rp-detail-section-title">Actions</div>
            {selected.actions.map((a, i) => (
              <div key={i} className="rp-detail-action">
                <strong>{a.name}.</strong> {a.desc}
              </div>
            ))}
          </div>
        )}
      </div>
    );

    if (t === "conditions") return (
      <div className="rp-detail-body">
        <p className="rp-detail-desc">{selected.desc}</p>
      </div>
    );

    if (t === "classes") return (
      <div className="rp-detail-body">
        <div className="rp-detail-tags">
          {selected.hit_dice && <span className="rp-tag">Hit Die: {selected.hit_dice}</span>}
        </div>
        {selected.desc && <p className="rp-detail-desc">{selected.desc}</p>}
        {selected.prof_weapons && <p className="rp-detail-meta"><strong>Weapon Proficiencies:</strong> {selected.prof_weapons}</p>}
        {selected.prof_armor && <p className="rp-detail-meta"><strong>Armor Proficiencies:</strong> {selected.prof_armor}</p>}
        {selected.prof_skills && <p className="rp-detail-meta"><strong>Skill Proficiencies:</strong> {selected.prof_skills}</p>}
      </div>
    );

    if (t === "races") return (
      <div className="rp-detail-body">
        {selected.desc && <p className="rp-detail-desc">{selected.desc}</p>}
        {selected.asi_desc && <p className="rp-detail-meta"><strong>Ability Score Increase:</strong> {selected.asi_desc}</p>}
        {selected.age && <p className="rp-detail-meta"><strong>Age:</strong> {selected.age}</p>}
        {selected.alignment && <p className="rp-detail-meta"><strong>Alignment:</strong> {selected.alignment}</p>}
        {selected.size && <p className="rp-detail-meta"><strong>Size:</strong> {selected.size}</p>}
        {selected.speed_desc && <p className="rp-detail-meta"><strong>Speed:</strong> {selected.speed_desc}</p>}
        {selected.languages && <p className="rp-detail-meta"><strong>Languages:</strong> {selected.languages}</p>}
      </div>
    );

    if (t === "equipment") return (
      <div className="rp-detail-body">
        <div className="rp-detail-tags">
          {selected.category && <span className="rp-tag">{selected.category}</span>}
          {selected.cost && <span className="rp-tag rp-tag-gold">💰 {selected.cost}</span>}
          {selected.weight && <span className="rp-tag">⚖️ {selected.weight}</span>}
        </div>
        {selected.damage && <p className="rp-detail-meta"><strong>Damage:</strong> {selected.damage} {selected.damage_type}</p>}
        {selected.armor_class && <p className="rp-detail-meta"><strong>AC:</strong> {selected.armor_class}</p>}
        {selected.properties && selected.properties.length > 0 && <p className="rp-detail-meta"><strong>Properties:</strong> {selected.properties.join(", ")}</p>}
        {selected.desc && selected.desc.length > 0 && <p className="rp-detail-desc">{Array.isArray(selected.desc) ? selected.desc.join(" ") : selected.desc}</p>}
      </div>
    );

    if (t === "rules") return (
      <div className="rp-detail-body">
        {selected.desc && <p className="rp-detail-desc">{selected.desc}</p>}
        {selected.subsections && selected.subsections.map((s, i) => (
          <div key={i} className="rp-detail-section">
            <div className="rp-detail-section-title">{s.name}</div>
            <p className="rp-detail-desc">{s.desc}</p>
          </div>
        ))}
      </div>
    );

    return <p className="rp-detail-desc">{JSON.stringify(selected, null, 2)}</p>;
  };

  return (
    <div className="rp-wrap">
      <div className="rp-stars">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="rp-star" style={{
            left:`${Math.random()*100}%`, top:`${Math.random()*100}%`,
            width:`${Math.random()*2+1}px`, height:`${Math.random()*2+1}px`,
            animationDelay:`${Math.random()*6}s`, animationDuration:`${Math.random()*4+4}s`,
          }} />
        ))}
      </div>

      <nav className="rp-nav">
        <button className="rp-nav-btn" onClick={() => navigate("/home")}>← Back to Tavern</button>
        <div className="rp-nav-logo">⚔️ The Tavern Board</div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <SearchBar /><NotificationBell />
          <button className="rp-nav-btn" onClick={() => navigate(`/profile/${user?.id}`)}>My Profile</button>
        </div>
      </nav>

      <div className="rp-content">
        <div className="rp-header">
          <div className="rp-eyebrow">D&D 5e Reference</div>
          <h1 className="rp-title">Rules <span>Reference</span></h1>
          <p className="rp-subtitle">Searchable compendium of D&D 5e rules, spells, monsters and more.</p>
        </div>

        <div className="rp-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`rp-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        <div className="rp-body">
          <div className="rp-list-col">
            <input className="rp-search" placeholder={`Search ${tab}...`} value={search} onChange={handleSearch} />
            {loading && items.length === 0 ? (
              <div className="rp-loading">Consulting the archives...</div>
            ) : (
              <>
                <div className="rp-list">
                  {items.map((item, i) => (
                    <div key={i} className={`rp-list-item ${selected?.slug === item.slug || selected?.name === item.name ? "active" : ""}`} onClick={() => setSelected(item)}>
                      <div className="rp-item-name">{item.name}</div>
                      {tab === "spells" && <div className="rp-item-sub">{item.level === 0 ? "Cantrip" : `Level ${item.level}`} · {item.school}</div>}
                      {tab === "monsters" && <div className="rp-item-sub">CR {item.challenge_rating} · {item.type}</div>}
                      {tab === "equipment" && <div className="rp-item-sub">{item.category} · {item.cost}</div>}
                      {tab === "classes" && <div className="rp-item-sub">Hit Die: {item.hit_dice}</div>}
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <button className="rp-load-more" onClick={handleLoadMore} disabled={loading}>
                    {loading ? "Loading..." : "Load More"}
                  </button>
                )}
              </>
            )}
          </div>

          <div className="rp-detail-col">
            {!selected ? (
              <div className="rp-detail-empty">
                <div className="rp-detail-empty-icon">📖</div>
                <p>Select an entry to view details</p>
              </div>
            ) : (
              <>
                <div className="rp-detail-header">
                  <h2 className="rp-detail-title">{selected.name}</h2>
                  <button className="rp-detail-close" onClick={() => setSelected(null)}>✕</button>
                </div>
                {renderDetail()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}