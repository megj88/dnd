import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import "./CharacterSheetPage.css";

const TABS = ["Core", "Stats", "Combat", "Skills", "Spells", "Inventory", "Feats", "Backstory"];

const ABILITY_SCORES = [
  { key: "str", label: "Strength" },
  { key: "dex", label: "Dexterity" },
  { key: "con", label: "Constitution" },
  { key: "int_stat", label: "Intelligence" },
  { key: "wis", label: "Wisdom" },
  { key: "cha", label: "Charisma" },
];

const SKILLS_5E = [
  { key: "acrobatics", label: "Acrobatics", ability: "dex" },
  { key: "animal_handling", label: "Animal Handling", ability: "wis" },
  { key: "arcana", label: "Arcana", ability: "int_stat" },
  { key: "athletics", label: "Athletics", ability: "str" },
  { key: "deception", label: "Deception", ability: "cha" },
  { key: "history", label: "History", ability: "int_stat" },
  { key: "insight", label: "Insight", ability: "wis" },
  { key: "intimidation", label: "Intimidation", ability: "cha" },
  { key: "investigation", label: "Investigation", ability: "int_stat" },
  { key: "medicine", label: "Medicine", ability: "wis" },
  { key: "nature", label: "Nature", ability: "int_stat" },
  { key: "perception", label: "Perception", ability: "wis" },
  { key: "performance", label: "Performance", ability: "cha" },
  { key: "persuasion", label: "Persuasion", ability: "cha" },
  { key: "religion", label: "Religion", ability: "int_stat" },
  { key: "sleight_of_hand", label: "Sleight of Hand", ability: "dex" },
  { key: "stealth", label: "Stealth", ability: "dex" },
  { key: "survival", label: "Survival", ability: "wis" },
];

const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const mod = (score) => Math.floor((score - 10) / 2);
const modStr = (score) => { const m = mod(score); return m >= 0 ? `+${m}` : `${m}`; };

export default function CharacterSheetPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [activeTab, setActiveTab] = useState("Core");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const isOwner = sheet?.user_id === user?.id;

  useEffect(() => { fetchSheet(); }, [id]);

  const fetchSheet = async () => {
    const { data } = await supabase.from("character_sheets").select("*").eq("id", id).maybeSingle();
    if (!data) { navigate("/characters"); return; }
    setSheet(data);
    setLoading(false);
  };

  const update = useCallback(async (field, value) => {
    if (!isOwner) return;
    setSheet(prev => ({ ...prev, [field]: value }));
    setSaving(true);
    await supabase.from("character_sheets").update({ [field]: value, updated_at: new Date().toISOString() }).eq("id", id);
    setSaving(false);
    setSaveStatus("Saved");
    setTimeout(() => setSaveStatus(""), 2000);
  }, [id, isOwner]);

  const Field = ({ field, label, type = "text", placeholder = "" }) => (
    <div className="cs-field">
      <label className="cs-label">{label}</label>
      {type === "textarea" ? (
        <textarea className="cs-input cs-textarea" rows={4} defaultValue={sheet[field] || ""} placeholder={placeholder}
          onBlur={e => update(field, e.target.value)} disabled={!isOwner} />
      ) : (
        <input className="cs-input" type={type} defaultValue={sheet[field] ?? ""} placeholder={placeholder}
          onBlur={e => update(field, type === "number" ? (parseInt(e.target.value) || 0) : e.target.value)} disabled={!isOwner} />
      )}
    </div>
  );

  if (loading) return <div className="cs-loading">Loading character...</div>;

  return (
    <div className="cs-wrap">
      <div className="cs-stars">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="cs-star" style={{
            left:`${Math.random()*100}%`, top:`${Math.random()*100}%`,
            width:`${Math.random()*2+1}px`, height:`${Math.random()*2+1}px`,
            animationDelay:`${Math.random()*6}s`, animationDuration:`${Math.random()*4+4}s`,
          }} />
        ))}
      </div>

      <nav className="cs-nav">
        <button className="cs-nav-btn" onClick={() => navigate("/characters")}>← My Characters</button>
        <div className="cs-nav-center">
          <div className="cs-nav-name">{sheet.name}</div>
          {saveStatus && <div className="cs-save-status">✓ {saveStatus}</div>}
          {saving && <div className="cs-save-status">Saving...</div>}
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <SearchBar /><NotificationBell />
        </div>
      </nav>

      <div className="cs-content">
        <div className="cs-tabs">
          {TABS.map(tab => (
            <button key={tab} className={`cs-tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>

        <div className="cs-tab-body">

          {/* CORE */}
          {activeTab === "Core" && (
            <div className="cs-section">
              <div className="cs-grid-2">
                <Field field="name" label="Character Name" placeholder="Your hero's name..." />
                <div className="cs-field">
                  <label className="cs-label">System</label>
                  <select className="cs-input cs-select" value={sheet.system || "5e"} onChange={e => update("system", e.target.value)} disabled={!isOwner}>
                    <option value="5e">D&D 5e</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <div className="cs-grid-3">
                <Field field="race" label="Race" placeholder="Human, Elf, Dwarf..." />
                <Field field="class" label="Class" placeholder="Fighter, Wizard..." />
                <Field field="level" label="Level" type="number" />
              </div>
              <div className="cs-grid-2">
                <Field field="background" label="Background" placeholder="Acolyte, Criminal..." />
                <Field field="alignment" label="Alignment" placeholder="Chaotic Good..." />
              </div>
            </div>
          )}

          {/* STATS */}
          {activeTab === "Stats" && (
            <div className="cs-section">
              <div className="cs-ability-grid">
                {ABILITY_SCORES.map(ability => (
                  <div key={ability.key} className="cs-ability-card">
                    <div className="cs-ability-label">{ability.label.toUpperCase().slice(0, 3)}</div>
                    <div className="cs-ability-mod">{modStr(sheet[ability.key] || 10)}</div>
                    <input
                      className="cs-ability-input"
                      type="number" min={1} max={30}
                      defaultValue={sheet[ability.key] || 10}
                      onBlur={e => update(ability.key, parseInt(e.target.value) || 10)}
                      disabled={!isOwner}
                    />
                    <div className="cs-ability-full">{ability.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COMBAT */}
          {activeTab === "Combat" && (
            <div className="cs-section">
              <div className="cs-grid-3">
                <Field field="hp_max" label="Max HP" type="number" />
                <Field field="hp_current" label="Current HP" type="number" />
                <Field field="hp_temp" label="Temp HP" type="number" />
              </div>
              <div className="cs-grid-3">
                <Field field="ac" label="Armour Class" type="number" />
                <Field field="speed" label="Speed (ft)" type="number" />
                <Field field="initiative" label="Initiative" type="number" />
              </div>
              <div className="cs-grid-2">
                <Field field="hit_dice" label="Hit Dice" placeholder="1d8" />
                <Field field="proficiency_bonus" label="Proficiency Bonus" type="number" />
              </div>
            </div>
          )}

          {/* SKILLS */}
          {activeTab === "Skills" && (
            <div className="cs-section">
              {sheet.system === "5e" ? (
                <div className="cs-skills-list">
                  {SKILLS_5E.map(skill => {
                    const proficient = (sheet.skills || {})[skill.key]?.proficient || false;
                    const abilityMod = mod(sheet[skill.ability] || 10);
                    const prof = sheet.proficiency_bonus || 2;
                    const total = abilityMod + (proficient ? prof : 0);
                    return (
                      <div key={skill.key} className="cs-skill-row">
                        <button
                          className={`cs-prof-dot ${proficient ? "active" : ""}`}
                          onClick={() => {
                            if (!isOwner) return;
                            const updated = { ...(sheet.skills || {}), [skill.key]: { proficient: !proficient } };
                            update("skills", updated);
                          }}
                        />
                        <div className="cs-skill-bonus">{total >= 0 ? `+${total}` : total}</div>
                        <div className="cs-skill-name">{skill.label}</div>
                        <div className="cs-skill-ability">{skill.ability.replace("_stat", "").toUpperCase().slice(0, 3)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="cs-custom-skills">
                  <p className="cs-custom-note">Custom system — enter your skills and bonuses freely.</p>
                  <Field field="custom_skills" label="Skills & Proficiencies" type="textarea" placeholder="List your skills, proficiencies and bonuses..." />
                </div>
              )}
            </div>
          )}

          {/* SPELLS */}
          {activeTab === "Spells" && (
            <div className="cs-section">
              <div className="cs-spell-slots">
                <div className="cs-section-title">Spell Slots</div>
                <div className="cs-spell-slots-grid">
                  {SPELL_LEVELS.map(lvl => (
                    <div key={lvl} className="cs-spell-slot-card">
                      <div className="cs-spell-slot-label">{lvl === 0 ? "Cantrip" : `Level ${lvl}`}</div>
                      {lvl > 0 && (
                        <input
                          className="cs-spell-slot-input"
                          type="number" min={0} max={9}
                          defaultValue={(sheet.spell_slots || {})[lvl] || 0}
                          onBlur={e => {
                            const updated = { ...(sheet.spell_slots || {}), [lvl]: parseInt(e.target.value) || 0 };
                            update("spell_slots", updated);
                          }}
                          disabled={!isOwner}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="cs-spells-list-section">
                <div className="cs-section-title-row">
                  <div className="cs-section-title">Known Spells</div>
                  {isOwner && (
                    <button className="cs-add-btn" onClick={() => {
                      const updated = [...(sheet.spells || []), { id: Date.now(), name: "", level: 0, description: "" }];
                      update("spells", updated);
                    }}>+ Add Spell</button>
                  )}
                </div>
                {(sheet.spells || []).length === 0 ? (
                  <div className="cs-empty">No spells added yet.</div>
                ) : (
                  <div className="cs-spells-list">
                    {(sheet.spells || []).map((spell, i) => (
                      <div key={spell.id || i} className="cs-spell-row">
                        <input className="cs-inline-input" placeholder="Spell name..." defaultValue={spell.name}
                          onBlur={e => { const u = [...sheet.spells]; u[i] = { ...u[i], name: e.target.value }; update("spells", u); }} disabled={!isOwner} />
                        <select className="cs-inline-select" value={spell.level}
                          onChange={e => { const u = [...sheet.spells]; u[i] = { ...u[i], level: parseInt(e.target.value) }; update("spells", u); }} disabled={!isOwner}>
                          {SPELL_LEVELS.map(l => <option key={l} value={l}>{l === 0 ? "Cantrip" : `L${l}`}</option>)}
                        </select>
                        <input className="cs-inline-input cs-spell-desc" placeholder="Description..." defaultValue={spell.description}
                          onBlur={e => { const u = [...sheet.spells]; u[i] = { ...u[i], description: e.target.value }; update("spells", u); }} disabled={!isOwner} />
                        {isOwner && (
                          <button className="cs-remove-btn" onClick={() => { const u = sheet.spells.filter((_, j) => j !== i); update("spells", u); }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* INVENTORY */}
          {activeTab === "Inventory" && (
            <div className="cs-section">
              <div className="cs-section-title-row">
                <div className="cs-section-title">Equipment & Inventory</div>
                {isOwner && (
                  <button className="cs-add-btn" onClick={() => {
                    const updated = [...(sheet.inventory || []), { id: Date.now(), name: "", quantity: 1, weight: "", notes: "" }];
                    update("inventory", updated);
                  }}>+ Add Item</button>
                )}
              </div>
              {(sheet.inventory || []).length === 0 ? (
                <div className="cs-empty">No items yet. Your pack is empty.</div>
              ) : (
                <div className="cs-inventory-list">
                  <div className="cs-inventory-header">
                    <span>Item</span><span>Qty</span><span>Weight</span><span>Notes</span><span></span>
                  </div>
                  {(sheet.inventory || []).map((item, i) => (
                    <div key={item.id || i} className="cs-inventory-row">
                      <input className="cs-inline-input" placeholder="Item name..." defaultValue={item.name}
                        onBlur={e => { const u = [...sheet.inventory]; u[i] = { ...u[i], name: e.target.value }; update("inventory", u); }} disabled={!isOwner} />
                      <input className="cs-inline-input cs-narrow" type="number" min={0} defaultValue={item.quantity}
                        onBlur={e => { const u = [...sheet.inventory]; u[i] = { ...u[i], quantity: parseInt(e.target.value) || 1 }; update("inventory", u); }} disabled={!isOwner} />
                      <input className="cs-inline-input cs-narrow" placeholder="lb" defaultValue={item.weight}
                        onBlur={e => { const u = [...sheet.inventory]; u[i] = { ...u[i], weight: e.target.value }; update("inventory", u); }} disabled={!isOwner} />
                      <input className="cs-inline-input" placeholder="Notes..." defaultValue={item.notes}
                        onBlur={e => { const u = [...sheet.inventory]; u[i] = { ...u[i], notes: e.target.value }; update("inventory", u); }} disabled={!isOwner} />
                      {isOwner && (
                        <button className="cs-remove-btn" onClick={() => { const u = sheet.inventory.filter((_, j) => j !== i); update("inventory", u); }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FEATS */}
          {activeTab === "Feats" && (
            <div className="cs-section">
              <div className="cs-section-title-row">
                <div className="cs-section-title">Feats & Special Abilities</div>
                {isOwner && (
                  <button className="cs-add-btn" onClick={() => {
                    const updated = [...(sheet.feats || []), { id: Date.now(), name: "", description: "" }];
                    update("feats", updated);
                  }}>+ Add Feat</button>
                )}
              </div>
              {(sheet.feats || []).length === 0 ? (
                <div className="cs-empty">No feats added yet.</div>
              ) : (
                <div className="cs-feats-list">
                  {(sheet.feats || []).map((feat, i) => (
                    <div key={feat.id || i} className="cs-feat-card">
                      <div className="cs-feat-header">
                        <input className="cs-inline-input cs-feat-name" placeholder="Feat name..." defaultValue={feat.name}
                          onBlur={e => { const u = [...sheet.feats]; u[i] = { ...u[i], name: e.target.value }; update("feats", u); }} disabled={!isOwner} />
                        {isOwner && <button className="cs-remove-btn" onClick={() => { const u = sheet.feats.filter((_, j) => j !== i); update("feats", u); }}>✕</button>}
                      </div>
                      <textarea className="cs-inline-textarea" rows={3} placeholder="Description..." defaultValue={feat.description}
                        onBlur={e => { const u = [...sheet.feats]; u[i] = { ...u[i], description: e.target.value }; update("feats", u); }} disabled={!isOwner} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BACKSTORY */}
          {activeTab === "Backstory" && (
            <div className="cs-section">
              <div className="cs-grid-2">
                <Field field="personality" label="Personality Traits" type="textarea" placeholder="How does your character behave?" />
                <Field field="ideals" label="Ideals" type="textarea" placeholder="What drives your character?" />
              </div>
              <div className="cs-grid-2">
                <Field field="bonds" label="Bonds" type="textarea" placeholder="What connects your character to the world?" />
                <Field field="flaws" label="Flaws" type="textarea" placeholder="What are your character's weaknesses?" />
              </div>
              <Field field="backstory" label="Backstory" type="textarea" placeholder="Your character's history, origins, and story so far..." />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}