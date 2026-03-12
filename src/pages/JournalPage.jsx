import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import NPCGenerator from "../components/NPCGenerator";
import "./JournalPage.css";

const TABS = ["Recaps", "NPCs", "Locations", "Loot", "Quests"];

const ATTITUDE_CONFIG = {
  friendly: { label: "Friendly", color: "#7ec98a" },
  neutral: { label: "Neutral", color: "#c9a96e" },
  hostile: { label: "Hostile", color: "#c97070" },
  unknown: { label: "Unknown", color: "#6a5a48" },
};

const LOCATION_STATUS = {
  discovered: { label: "Discovered", color: "#c9a96e" },
  explored: { label: "Explored", color: "#7ec98a" },
  cleared: { label: "Cleared", color: "#7090c9" },
};

const QUEST_STATUS = {
  active: { label: "Active", color: "#c9a96e" },
  completed: { label: "Completed", color: "#7ec98a" },
  failed: { label: "Failed", color: "#c97070" },
};

export default function JournalPage() {
  const { journalId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [journal, setJournal] = useState(null);
  const [activeTab, setActiveTab] = useState("Recaps");
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data
  const [entries, setEntries] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loot, setLoot] = useState([]);
  const [quests, setQuests] = useState([]);
  const [comments, setComments] = useState({});

  // Forms
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [expandedEntry, setExpandedEntry] = useState(null);

  useEffect(() => { fetchJournal(); }, [journalId]);
  useEffect(() => { if (journal) fetchTabData(); }, [journal, activeTab]);

  const fetchJournal = async () => {
    const { data } = await supabase.from("journals").select("*").eq("id", journalId).maybeSingle();
    if (!data) { navigate("/journals"); return; }
    setJournal(data);
    setIsOwner(data.created_by === user.id);
    setLoading(false);
  };

  const fetchTabData = async () => {
    if (activeTab === "Recaps") {
      const { data } = await supabase.from("journal_entries").select("*").eq("journal_id", journal.id).order("session_number", { ascending: true });
      setEntries(data || []);
    } else if (activeTab === "NPCs") {
      const { data } = await supabase.from("journal_npcs").select("*").eq("journal_id", journal.id).order("created_at");
      setNpcs(data || []);
    } else if (activeTab === "Locations") {
      const { data } = await supabase.from("journal_locations").select("*").eq("journal_id", journal.id).order("created_at");
      setLocations(data || []);
    } else if (activeTab === "Loot") {
      const { data } = await supabase.from("journal_loot").select("*").eq("journal_id", journal.id).order("created_at");
      setLoot(data || []);
    } else if (activeTab === "Quests") {
      const { data } = await supabase.from("journal_quests").select("*").eq("journal_id", journal.id).order("created_at");
      setQuests(data || []);
    }
  };

  const fetchComments = async (entryId) => {
    const { data: commentData } = await supabase.from("journal_comments").select("*").eq("entry_id", entryId).order("created_at");
    if (!commentData || commentData.length === 0) { setComments(c => ({ ...c, [entryId]: [] })); return; }
    const userIds = [...new Set(commentData.map(c => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, favourite_class").in("id", userIds);
    const profileMap = {};
    (profiles || []).forEach(p => profileMap[p.id] = p);
    setComments(c => ({ ...c, [entryId]: commentData.map(c => ({ ...c, profile: profileMap[c.user_id] || null })) }));
  };

  const toggleEntry = (entryId) => {
    if (expandedEntry === entryId) { setExpandedEntry(null); return; }
    setExpandedEntry(entryId);
    if (!comments[entryId]) fetchComments(entryId);
  };

  const handleAddComment = async (entryId) => {
    const body = commentInputs[entryId]?.trim();
    if (!body) return;
    await supabase.from("journal_comments").insert({ entry_id: entryId, user_id: user.id, body });
    setCommentInputs(c => ({ ...c, [entryId]: "" }));
    fetchComments(entryId);
  };

  const handleDeleteComment = async (commentId, entryId) => {
    await supabase.from("journal_comments").delete().eq("id", commentId);
    fetchComments(entryId);
  };

  const openForm = (item = null) => {
    setEditingId(item?.id || null);
    setForm(item ? { ...item } : getDefaultForm());
    setShowForm(true);
  };

  const getDefaultForm = () => {
    if (activeTab === "Recaps") return { title: "", body: "", session_number: (entries.length + 1), session_date: "" };
    if (activeTab === "NPCs") return { name: "", description: "", attitude: "neutral", notes: "" };
    if (activeTab === "Locations") return { name: "", description: "", status: "discovered", notes: "" };
    if (activeTab === "Loot") return { name: "", given_to: "", value: "", notes: "" };
    if (activeTab === "Quests") return { name: "", description: "", status: "active" };
    return {};
  };

  const getTable = () => {
    if (activeTab === "Recaps") return "journal_entries";
    if (activeTab === "NPCs") return "journal_npcs";
    if (activeTab === "Locations") return "journal_locations";
    if (activeTab === "Loot") return "journal_loot";
    if (activeTab === "Quests") return "journal_quests";
  };

  const handleSave = async () => {
    setSaving(true);
    const table = getTable();
    const payload = { ...form, journal_id: journal.id };
    if (editingId) {
      await supabase.from(table).update(payload).eq("id", editingId);
    } else {
      await supabase.from(table).insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    fetchTabData();
  };

  const handleDelete = async (id) => {
    await supabase.from(getTable()).delete().eq("id", id);
    fetchTabData();
  };

  if (loading) return <div className="jp-loading">Loading journal...</div>;

  return (
    <div className="jp-wrap">
      <div className="jp-stars">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="jp-star" style={{
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 6}s`, animationDuration: `${Math.random() * 4 + 4}s`,
          }} />
        ))}
      </div>

      <nav className="jp-nav">
        <button className="jp-nav-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="jp-nav-logo">⚔️ The Tavern Board</div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <SearchBar />
          <NotificationBell />
          <button className="jp-nav-btn" onClick={() => navigate(`/profile/${user?.id}`)}>My Profile</button>
        </div>
      </nav>

      <div className="jp-content">
        <div className="jp-header">
          <div className="jp-eyebrow">Campaign Journal</div>
          <h1 className="jp-title">{journal.title}</h1>
        </div>

        {/* Tabs */}
        <div className="jp-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`jp-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => { setActiveTab(tab); setShowForm(false); }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="jp-tab-content">
          {isOwner && !showForm && (
            <button className="jp-add-btn" onClick={() => openForm()}>
              + Add {activeTab === "Recaps" ? "Recap" : activeTab === "NPCs" ? "NPC" : activeTab === "Loot" ? "Item" : activeTab.slice(0, -1)}
            </button>
          )}

          {/* Inline form */}
          {showForm && isOwner && (
            <div className="jp-form">
              <div className="jp-form-title">{editingId ? "Edit" : "Add"} {activeTab === "Recaps" ? "Recap" : activeTab === "NPCs" ? "NPC" : activeTab === "Loot" ? "Item" : activeTab.slice(0, -1)}</div>
              {renderForm(activeTab, form, setForm)}
              <div className="jp-form-actions">
                <button className="jp-save-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                <button className="jp-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Recaps */}
          {activeTab === "Recaps" && (
            <div className="jp-list">
              {entries.length === 0 && !showForm && <div className="jp-empty">No recaps yet. Chronicle your adventures!</div>}
              {entries.map(entry => (
                <div key={entry.id} className="jp-entry-card">
                  <div className="jp-entry-top" onClick={() => toggleEntry(entry.id)}>
                    <div className="jp-entry-session">Session {entry.session_number}</div>
                    <div className="jp-entry-info">
                      <div className="jp-entry-title">{entry.title}</div>
                      {entry.session_date && <div className="jp-entry-date">{new Date(entry.session_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>}
                    </div>
                    <div className="jp-entry-expand">{expandedEntry === entry.id ? "▲" : "▼"}</div>
                  </div>
                  {expandedEntry === entry.id && (
                    <div className="jp-entry-body-wrap">
                      <p className="jp-entry-body">{entry.body}</p>
                      {isOwner && (
                        <div className="jp-entry-actions">
                          <button className="jp-edit-btn" onClick={() => openForm(entry)}>Edit</button>
                          <button className="jp-delete-btn" onClick={() => handleDelete(entry.id)}>Delete</button>
                        </div>
                      )}
                      <div className="jp-comments">
                        <div className="jp-comments-title">Comments ({(comments[entry.id] || []).length})</div>
                        {(comments[entry.id] || []).map(c => (
                          <div key={c.id} className="jp-comment">
                            <div className="jp-comment-author">{c.profile?.display_name || c.profile?.favourite_class || "Adventurer"}</div>
                            <div className="jp-comment-body">{c.body}</div>
                            {c.user_id === user.id && (
                              <button className="jp-comment-delete" onClick={() => handleDeleteComment(c.id, entry.id)}>✕</button>
                            )}
                          </div>
                        ))}
                        <div className="jp-comment-input-row">
                          <input
                            className="jp-comment-input"
                            placeholder="Add a comment..."
                            value={commentInputs[entry.id] || ""}
                            onChange={e => setCommentInputs(c => ({ ...c, [entry.id]: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && handleAddComment(entry.id)}
                          />
                          <button className="jp-comment-submit" onClick={() => handleAddComment(entry.id)}>Post</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* NPCs */}
{activeTab === "NPCs" && (
  <div>
    {isOwner && (
      <NPCGenerator
  journalId={journal.id}
  campaignId={journal.campaign_id}
  userId={user.id}
  onSaved={fetchTabData}
/>
    )}
    <div className="jp-grid">
      {npcs.length === 0 && !showForm && <div className="jp-empty">No NPCs logged yet.</div>}
      {npcs.map(npc => (
        <div key={npc.id} className="jp-card">
          <div className="jp-card-header">
            <div className="jp-card-name">{npc.name}</div>
            <div className="jp-card-badge" style={{ color: ATTITUDE_CONFIG[npc.attitude]?.color }}>
              {ATTITUDE_CONFIG[npc.attitude]?.label}
            </div>
          </div>
          {npc.description && <p className="jp-card-desc">{npc.description}</p>}
          {npc.notes && <p className="jp-card-notes">📝 {npc.notes}</p>}
          {isOwner && (
            <div className="jp-card-actions">
              <button className="jp-edit-btn" onClick={() => openForm(npc)}>Edit</button>
              <button className="jp-delete-btn" onClick={() => handleDelete(npc.id)}>Delete</button>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}

          {/* Locations */}
          {activeTab === "Locations" && (
            <div className="jp-grid">
              {locations.length === 0 && !showForm && <div className="jp-empty">No locations discovered yet.</div>}
              {locations.map(loc => (
                <div key={loc.id} className="jp-card">
                  <div className="jp-card-header">
                    <div className="jp-card-name">{loc.name}</div>
                    <div className="jp-card-badge" style={{ color: LOCATION_STATUS[loc.status]?.color }}>
                      {LOCATION_STATUS[loc.status]?.label}
                    </div>
                  </div>
                  {loc.description && <p className="jp-card-desc">{loc.description}</p>}
                  {loc.notes && <p className="jp-card-notes">📝 {loc.notes}</p>}
                  {isOwner && (
                    <div className="jp-card-actions">
                      <button className="jp-edit-btn" onClick={() => openForm(loc)}>Edit</button>
                      <button className="jp-delete-btn" onClick={() => handleDelete(loc.id)}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Loot */}
          {activeTab === "Loot" && (
            <div className="jp-loot-list">
              {loot.length === 0 && !showForm && <div className="jp-empty">No loot tracked yet.</div>}
              {loot.map(item => (
                <div key={item.id} className="jp-loot-row">
                  <div className="jp-loot-info">
                    <div className="jp-loot-name">⚔️ {item.name}</div>
                    <div className="jp-loot-meta">
                      {item.given_to && <span>→ {item.given_to}</span>}
                      {item.value && <span>💰 {item.value}</span>}
                    </div>
                    {item.notes && <div className="jp-loot-notes">{item.notes}</div>}
                  </div>
                  {isOwner && (
                    <div className="jp-card-actions">
                      <button className="jp-edit-btn" onClick={() => openForm(item)}>Edit</button>
                      <button className="jp-delete-btn" onClick={() => handleDelete(item.id)}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quests */}
          {activeTab === "Quests" && (
            <div className="jp-list">
              {quests.length === 0 && !showForm && <div className="jp-empty">No quests tracked yet.</div>}
              {quests.map(quest => (
                <div key={quest.id} className="jp-quest-card">
                  <div className="jp-quest-header">
                    <div className="jp-quest-name">{quest.name}</div>
                    <div className="jp-quest-status" style={{ color: QUEST_STATUS[quest.status]?.color }}>
                      {QUEST_STATUS[quest.status]?.label}
                    </div>
                  </div>
                  {quest.description && <p className="jp-quest-desc">{quest.description}</p>}
                  {isOwner && (
                    <div className="jp-card-actions">
                      <button className="jp-edit-btn" onClick={() => openForm(quest)}>Edit</button>
                      <button className="jp-delete-btn" onClick={() => handleDelete(quest.id)}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderForm(tab, form, setForm) {
  const field = (key, label, type = "text", placeholder = "") => (
    <div className="jp-field">
      <label className="jp-label">{label}</label>
      {type === "textarea" ? (
        <textarea className="jp-input jp-textarea" rows={4} value={form[key] || ""} placeholder={placeholder} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      ) : type === "select" ? null : (
        <input className="jp-input" type={type} value={form[key] || ""} placeholder={placeholder} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      )}
    </div>
  );

  const select = (key, label, options) => (
    <div className="jp-field">
      <label className="jp-label">{label}</label>
      <select className="jp-input jp-select" value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  if (tab === "Recaps") return (
    <div className="jp-form-fields">
      <div className="jp-form-row">
        {field("session_number", "Session #", "number")}
        {field("session_date", "Date", "date")}
      </div>
      {field("title", "Title", "text", "e.g. The Fall of Shadowmere")}
      {field("body", "Recap", "textarea", "What happened this session...")}
    </div>
  );

  if (tab === "NPCs") return (
    <div className="jp-form-fields">
      {field("name", "Name", "text", "e.g. Mira the Innkeeper")}
      {field("description", "Description", "textarea", "Appearance, role, background...")}
      {select("attitude", "Attitude", [
        { value: "friendly", label: "Friendly" },
        { value: "neutral", label: "Neutral" },
        { value: "hostile", label: "Hostile" },
        { value: "unknown", label: "Unknown" },
      ])}
      {field("notes", "Notes", "text", "Any extra notes...")}
    </div>
  );

  if (tab === "Locations") return (
    <div className="jp-form-fields">
      {field("name", "Name", "text", "e.g. The Sunken Citadel")}
      {field("description", "Description", "textarea", "What the party knows about this place...")}
      {select("status", "Status", [
        { value: "discovered", label: "Discovered" },
        { value: "explored", label: "Explored" },
        { value: "cleared", label: "Cleared" },
      ])}
      {field("notes", "Notes", "text", "Any extra notes...")}
    </div>
  );

  if (tab === "Loot") return (
    <div className="jp-form-fields">
      {field("name", "Item Name", "text", "e.g. Sword of Flame +2")}
      {field("given_to", "Given To", "text", "Which party member?")}
      {field("value", "Value", "text", "e.g. 500gp or Priceless")}
      {field("notes", "Notes", "text", "Any extra notes...")}
    </div>
  );

  if (tab === "Quests") return (
    <div className="jp-form-fields">
      {field("name", "Quest Name", "text", "e.g. Find the missing heir")}
      {field("description", "Description", "textarea", "Quest details and objectives...")}
      {select("status", "Status", [
        { value: "active", label: "Active" },
        { value: "completed", label: "Completed" },
        { value: "failed", label: "Failed" },
      ])}
    </div>
  );
}