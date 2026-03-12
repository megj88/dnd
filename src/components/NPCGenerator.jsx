import { useState } from "react";
import { supabase } from "../supabaseClient";
import "./NPCGenerator.css";

const RACES = ["Any", "Human", "Elf", "Dwarf", "Halfling", "Gnome", "Half-Orc", "Tiefling", "Dragonborn", "Aasimar", "Goblin", "Other"];
const ROLES = ["Any", "Tavern Keeper", "Merchant", "Guard", "Noble", "Criminal", "Priest", "Sage", "Soldier", "Bandit", "Quest Giver", "Villain", "Ally", "Neutral"];
const TONES = ["Any", "Friendly", "Mysterious", "Sinister", "Comic Relief", "Tragic", "Gruff", "Scholarly", "Fanatical"];

export default function NPCGenerator({ journalId, campaignId, userId, onSaved }) {
  const [open, setOpen] = useState(false);
  const [race, setRace] = useState("Any");
  const [role, setRole] = useState("Any");
  const [tone, setTone] = useState("Any");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [npc, setNpc] = useState(null);
  const [edited, setEdited] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const generate = async () => {
    setLoading(true);
    setNpc(null);
    setEdited(null);
    setSaveMsg("");

    const prompt = `You are a D&D 5e dungeon master assistant. Generate a detailed NPC with the following hints:
- Race: ${race}
- Role: ${role}
- Tone/personality: ${tone}
- Extra details: ${extra || "none"}

Respond ONLY with a valid JSON object, no markdown, no preamble. Use exactly these keys:
{
  "name": "Full name",
  "race": "Race and any subtype",
  "appearance": "2-3 sentences describing physical appearance",
  "personality": "2-3 distinctive personality traits",
  "backstory": "3-4 sentences of backstory",
  "motivations": "What drives them day to day",
  "secrets": "One or two secrets they are hiding",
  "hooks": "2-3 ways a DM could use this NPC to hook players",
  "stats": "CR, HP, AC, and 3-4 key abilities or actions in brief"
}`;

    try {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-npc`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    }
  );
  const raw = await res.text();
  console.log("Raw response:", raw);
  const data = JSON.parse(raw);
  const text = data.content?.find(b => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  setNpc(parsed);
  setEdited(parsed);
} catch (e) {
  console.error(e);
  setSaveMsg("Generation failed. Please try again.");
}
    setLoading(false);
  };

  const handleEdit = (field, value) => {
    setEdited(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (target) => {
    if (!edited) return;
    setSaving(true);
    setSaveMsg("");

    if (target === "journal" || target === "both") {
      await supabase.from("journal_npcs").insert({
        journal_id: journalId,
        name: edited.name,
        description: `${edited.race} — ${edited.appearance}`,
        attitude: edited.personality,
        notes: `Backstory: ${edited.backstory}\n\nMotivations: ${edited.motivations}\n\nSecrets: ${edited.secrets}\n\nHooks: ${edited.hooks}\n\nStats: ${edited.stats}`,
      });
    }

    if (target === "library" || target === "both") {
      await supabase.from("npc_library").insert({
        user_id: userId,
        campaign_id: campaignId || null,
        ...edited,
      });
    }

    setSaving(false);
    setSaveMsg(target === "both" ? "Saved to journal & library!" : target === "journal" ? "Saved to journal!" : "Saved to library!");
    if (onSaved) onSaved();
  };

  const FIELDS = [
    { key: "name", label: "Name" },
    { key: "race", label: "Race" },
    { key: "appearance", label: "Appearance" },
    { key: "personality", label: "Personality" },
    { key: "backstory", label: "Backstory" },
    { key: "motivations", label: "Motivations" },
    { key: "secrets", label: "Secrets" },
    { key: "hooks", label: "Roleplaying Hooks" },
    { key: "stats", label: "Stats / Combat Role" },
  ];

  return (
    <div className="npcg-wrap">
      <button className="npcg-toggle-btn" onClick={() => { setOpen(!open); setNpc(null); setEdited(null); setSaveMsg(""); }}>
        {open ? "✕ Close Generator" : "✨ Generate NPC"}
      </button>

      {open && (
        <div className="npcg-panel">
          <div className="npcg-panel-title">✨ AI NPC Generator</div>
          <p className="npcg-panel-sub">Fill in optional hints then generate. All fields can be edited before saving.</p>

          <div className="npcg-controls">
            <div className="npcg-field">
              <label className="npcg-label">Race</label>
              <select className="npcg-select" value={race} onChange={e => setRace(e.target.value)}>
                {RACES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="npcg-field">
              <label className="npcg-label">Role</label>
              <select className="npcg-select" value={role} onChange={e => setRole(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="npcg-field">
              <label className="npcg-label">Tone</label>
              <select className="npcg-select" value={tone} onChange={e => setTone(e.target.value)}>
                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="npcg-field">
            <label className="npcg-label">Extra Details (optional)</label>
            <input
              className="npcg-input"
              placeholder="e.g. runs the local blacksmith, has a secret connection to the thieves guild..."
              value={extra}
              onChange={e => setExtra(e.target.value)}
            />
          </div>

          <button className="npcg-generate-btn" onClick={generate} disabled={loading}>
            {loading ? "⚙️ Generating..." : "⚔️ Generate NPC"}
          </button>

          {loading && (
            <div className="npcg-loading">
              <div className="npcg-loading-bar" />
              <p>Consulting the arcane archives...</p>
            </div>
          )}

          {edited && (
            <div className="npcg-result">
              <div className="npcg-result-header">
                <div className="npcg-result-name">{edited.name}</div>
                <div className="npcg-result-race">{edited.race}</div>
                <button className="npcg-regen-btn" onClick={generate} disabled={loading}>↺ Regenerate</button>
              </div>

              <div className="npcg-result-fields">
                {FIELDS.filter(f => f.key !== "name" && f.key !== "race").map(f => (
                  <div key={f.key} className="npcg-result-field">
                    <label className="npcg-result-label">{f.label}</label>
                    <textarea
                      className="npcg-result-textarea"
                      value={edited[f.key] || ""}
                      onChange={e => handleEdit(f.key, e.target.value)}
                      rows={f.key === "backstory" || f.key === "hooks" ? 3 : 2}
                    />
                  </div>
                ))}
              </div>

              <div className="npcg-save-row">
                <button className="npcg-save-btn" onClick={() => handleSave("journal")} disabled={saving}>📖 Save to Journal</button>
                <button className="npcg-save-btn secondary" onClick={() => handleSave("library")} disabled={saving}>🗂️ Save to Library</button>
                <button className="npcg-save-btn gold" onClick={() => handleSave("both")} disabled={saving}>✨ Save Both</button>
              </div>
              {saveMsg && <div className="npcg-save-msg">{saveMsg}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}