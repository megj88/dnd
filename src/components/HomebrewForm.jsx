import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAchievements } from "../context/AchievementContext";
import "./HomebrewForm.css";

const TYPES = [
  { value: "spell", label: "Spell" },
  { value: "class", label: "Class / Subclass" },
  { value: "monster", label: "Monster / Creature" },
  { value: "magic_item", label: "Magic Item" },
  { value: "rule", label: "Rule / Mechanic" },
  { value: "adventure", label: "Adventure / Encounter" },
];

export default function HomebrewForm({ userId, existing, onClose, onSaved }) {
  const [title, setTitle] = useState(existing?.title || "");
  const [type, setType] = useState(existing?.type || "spell");
  const [description, setDescription] = useState(existing?.description || "");
  const [body, setBody] = useState(existing?.body || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState(existing?.tags || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags(prev => [...prev, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag) => setTags(prev => prev.filter(t => t !== tag));

  const { triggerCheck } = useAchievements();
  
  const handleSave = async () => {
    if (!title.trim()) return setError("Please enter a title.");
    if (!description.trim()) return setError("Please enter a short description.");
    if (!body.trim()) return setError("Please enter the content body.");
    setSaving(true);
    setError("");

    const payload = { title: title.trim(), type, description: description.trim(), body: body.trim(), tags, user_id: userId };

    if (existing) {
      const { error } = await supabase.from("homebrew").update(payload).eq("id", existing.id);
      if (error) { setSaving(false); return setError(error.message); }
    } else {
      const { error } = await supabase.from("homebrew").insert(payload);
      if (error) { setSaving(false); return setError(error.message); }
    }

    setSaving(false);
    onSaved();
    await triggerCheck(userId, "homebrew");
  };

  return (
    <div className="hf-overlay" onClick={onClose}>
      <div className="hf-panel" onClick={e => e.stopPropagation()}>
        <div className="hf-header">
          <div className="hf-title">{existing ? "Edit Homebrew" : "Share Homebrew"}</div>
          <button className="hf-close" onClick={onClose}>✕</button>
        </div>

        <div className="hf-fields">
          <div className="hf-field">
            <label className="hf-label">Title</label>
            <input className="hf-input" placeholder="e.g. Shadow Step Spell, Artificer Subclass..." value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="hf-field">
            <label className="hf-label">Type</label>
            <select className="hf-input hf-select" value={type} onChange={e => setType(e.target.value)}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="hf-field">
            <label className="hf-label">Short Description</label>
            <input className="hf-input" placeholder="A one-line summary of your creation..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="hf-field">
            <label className="hf-label">Content</label>
            <textarea className="hf-input hf-textarea" rows={10} placeholder="Full details, stats, mechanics, flavour text..." value={body} onChange={e => setBody(e.target.value)} />
          </div>

          <div className="hf-field">
            <label className="hf-label">Tags (up to 8)</label>
            <div className="hf-tags">
              {tags.map(tag => (
                <span key={tag} className="hf-tag">
                  #{tag}
                  <button className="hf-tag-remove" onClick={() => removeTag(tag)}>✕</button>
                </span>
              ))}
            </div>
            <div className="hf-tag-input-row">
              <input
                className="hf-input"
                placeholder="Add a tag..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag()}
              />
              <button className="hf-tag-add-btn" onClick={addTag}>Add</button>
            </div>
          </div>
        </div>

        {error && <div className="hf-error">{error}</div>}

        <button className="hf-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : existing ? "Save Changes" : "Share with the Tavern ⚔️"}
        </button>
      </div>
    </div>
  );
}