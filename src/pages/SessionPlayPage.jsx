import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./SessionPlayPage.css";

const DICE = ["d4","d6","d8","d10","d12","d20","d100"];
const CONDITIONS = ["Blinded","Charmed","Deafened","Frightened","Grappled","Incapacitated","Invisible","Paralyzed","Petrified","Poisoned","Prone","Restrained","Stunned","Unconscious","Exhausted"];
const SPELL_LEVELS = [1,2,3,4,5,6,7,8,9];

function rollDie(sides) { return Math.floor(Math.random() * sides) + 1; }

export default function SessionPlayPage() {
  const { id: campaignId, sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("dice");
  const [session, setSession] = useState(null);
  const [members, setMembers] = useState([]);
  const [isDM, setIsDM] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  // Dice state
  const [selectedDie, setSelectedDie] = useState("d20");
  const [diceCount, setDiceCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [rollLabel, setRollLabel] = useState("");
  const [rolls, setRolls] = useState([]);
  const [rolling, setRolling] = useState(false);
  const rollsEndRef = useRef(null);

  // Initiative state
  const [state, setState] = useState({ initiative: [], hp_tracker: [], notes: "" });
  const [newCombatant, setNewCombatant] = useState({ name:"", initiative:0, hp:0, maxHp:0, isPlayer:false });
  const [currentTurn, setCurrentTurn] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Spell slots
  const [spellSlots, setSpellSlots] = useState({});

  // Notes debounce
  const notesTimer = useRef(null);

  useEffect(() => { fetchAll(); }, [sessionId]);
  useEffect(() => { setupRealtime(); return () => { supabase.removeAllChannels(); }; }, [sessionId]);

  const fetchAll = async () => {
    const { data: sess } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
    if (!sess) { navigate(`/campaign/${campaignId}/dashboard`); return; }
    setSession(sess);

    const { data: camp } = await supabase.from("posts").select("user_id").eq("id", campaignId).maybeSingle();
    const dmStatus = camp?.user_id === user.id;
    setIsDM(dmStatus);

    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    setDisplayName(profile?.display_name || "Adventurer");

    const { data: apps } = await supabase.from("applications").select("applicant_id").eq("campaign_id", campaignId).eq("status", "approved");
    const memberIds = (apps || []).map(a => a.applicant_id);
    if (camp && !memberIds.includes(camp.user_id)) memberIds.unshift(camp.user_id);
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", memberIds);
    setMembers(profiles || []);

    // Load or init session state
    const { data: stateData } = await supabase.from("session_state").select("*").eq("session_id", sessionId).maybeSingle();
    if (stateData) {
      setState({ initiative: stateData.initiative || [], hp_tracker: stateData.hp_tracker || [], notes: stateData.notes || "" });
    } else {
      await supabase.from("session_state").insert({ session_id: sessionId, initiative: [], hp_tracker: [], notes: "" });
    }

    // Dice rolls
    const { data: diceData } = await supabase.from("session_dice_rolls").select("*").eq("session_id", sessionId).order("rolled_at", { ascending: false }).limit(50);
    setRolls((diceData || []).reverse());

    // Spell slots
    const { data: slotsData } = await supabase.from("session_spell_slots").select("*").eq("session_id", sessionId).eq("user_id", user.id).maybeSingle();
    if (slotsData) {
      setSpellSlots(slotsData.slots || {});
    } else {
      const defaultSlots = {};
      SPELL_LEVELS.forEach(l => defaultSlots[l] = { max: 0, used: 0 });
      setSpellSlots(defaultSlots);
    }

    setLoading(false);
  };

  const setupRealtime = () => {
    supabase.channel(`session-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_state", filter: `session_id=eq.${sessionId}` }, payload => {
        if (payload.new) setState({ initiative: payload.new.initiative || [], hp_tracker: payload.new.hp_tracker || [], notes: payload.new.notes || "" });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_dice_rolls", filter: `session_id=eq.${sessionId}` }, payload => {
        if (payload.new) setRolls(prev => [...prev, payload.new]);
      })
      .subscribe();
  };

  const pushState = async (newState) => {
    setState(newState);
    await supabase.from("session_state").update({ initiative: newState.initiative, hp_tracker: newState.hp_tracker, notes: newState.notes, updated_at: new Date().toISOString() }).eq("session_id", sessionId);
  };

  // ---- DICE ----
  const handleRoll = async () => {
    setRolling(true);
    const sides = parseInt(selectedDie.replace("d", ""));
    let total = 0;
    const results = [];
    for (let i = 0; i < diceCount; i++) { const r = rollDie(sides); results.push(r); total += r; }
    total += modifier;
    setTimeout(async () => {
      await supabase.from("session_dice_rolls").insert({
        session_id: sessionId, user_id: user.id, display_name: displayName,
        result: total, dice: `${diceCount}${selectedDie}`, modifier, label: rollLabel || null,
      });
      setRolling(false);
      setTimeout(() => rollsEndRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
    }, 400);
  };

  const isCrit = (roll) => roll.dice === "1d20" && roll.result === 20;
  const isFail = (roll) => roll.dice === "1d20" && roll.result === 1;

  // ---- INITIATIVE ----
  const handleAddCombatant = async () => {
    if (!newCombatant.name.trim()) return;
    const updated = [...stateRef.current.initiative, { ...newCombatant, id: Date.now().toString(), conditions: [] }].sort((a,b) => b.initiative - a.initiative);
    await pushState({ ...stateRef.current, initiative: updated });
    setNewCombatant({ name:"", initiative:0, hp:0, maxHp:0, isPlayer:false });
  };

  const handleRemoveCombatant = async (combId) => {
    const updated = stateRef.current.initiative.filter(c => c.id !== combId);
    await pushState({ ...stateRef.current, initiative: updated });
  };

  const handleNextTurn = async () => {
    const next = (currentTurn + 1) % (state.initiative.length || 1);
    setCurrentTurn(next);
  };

  const handleToggleCondition = async (combId, condition) => {
    const updated = stateRef.current.initiative.map(c => {
      if (c.id !== combId) return c;
      const has = (c.conditions || []).includes(condition);
      return { ...c, conditions: has ? c.conditions.filter(x => x !== condition) : [...(c.conditions || []), condition] };
    });
    await pushState({ ...stateRef.current, initiative: updated });
  };

  // ---- HP ----
  const handleAddHpEntry = async () => {
    const entries = members.map(m => ({ id: m.id, name: m.display_name || "Adventurer", maxHp: 20, currentHp: 20, tempHp: 0 }));
    const existing = stateRef.current.hp_tracker.map(e => e.id);
    const toAdd = entries.filter(e => !existing.includes(e.id));
    await pushState({ ...stateRef.current, hp_tracker: [...stateRef.current.hp_tracker, ...toAdd] });
  };

  const handleHpChange = async (entryId, field, value) => {
    const updated = stateRef.current.hp_tracker.map(e => e.id === entryId ? { ...e, [field]: Math.max(0, parseInt(value) || 0) } : e);
    await pushState({ ...stateRef.current, hp_tracker: updated });
  };

  // ---- NOTES ----
  const handleNotesChange = (value) => {
    setState(prev => ({ ...prev, notes: value }));
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      await supabase.from("session_state").update({ notes: value, updated_at: new Date().toISOString() }).eq("session_id", sessionId);
    }, 800);
  };

  // ---- SPELL SLOTS ----
  const handleSlotChange = async (level, field, value) => {
    const updated = { ...spellSlots, [level]: { ...spellSlots[level], [field]: Math.max(0, parseInt(value) || 0) } };
    setSpellSlots(updated);
    await supabase.from("session_spell_slots").upsert({ session_id: sessionId, user_id: user.id, slots: updated, updated_at: new Date().toISOString() }, { onConflict: "session_id,user_id" });
  };

  const handleUseSlot = async (level) => {
    const slot = spellSlots[level] || { max: 0, used: 0 };
    if (slot.used >= slot.max) return;
    await handleSlotChange(level, "used", slot.used + 1);
  };

  const handleRestoreSlot = async (level) => {
    const slot = spellSlots[level] || { max: 0, used: 0 };
    if (slot.used <= 0) return;
    await handleSlotChange(level, "used", slot.used - 1);
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" });

  if (loading) return <div className="sp-loading">Lighting the torches...</div>;

  return (
    <div className="sp-wrap">
      <div className="sp-header">
        <button className="sp-back-btn" onClick={() => navigate(`/campaign/${campaignId}/dashboard`)}>← Dashboard</button>
        <div className="sp-session-title">⚔️ {session?.title}</div>
        <div className="sp-header-right">
          <span className="sp-live-dot" />
          <span className="sp-live-label">Live Session</span>
          <span className="sp-dm-badge">{isDM ? "👑 DM" : "🎲 Player"}</span>
        </div>
      </div>

      <div className="sp-tabs">
        {[
          { key:"dice", label:"🎲 Dice" },
          { key:"initiative", label:"⚔️ Initiative" },
          { key:"hp", label:"❤️ HP Tracker" },
          { key:"conditions", label:"🌀 Conditions" },
          { key:"spells", label:"🔮 Spell Slots" },
          { key:"notes", label:"📋 Notes" },
        ].map(t => (
          <button key={t.key} className={`sp-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <div className="sp-content">

        {/* DICE TAB */}
        {tab === "dice" && (
          <div className="sp-dice-wrap">
            <div className="sp-dice-controls">
              <div className="sp-field">
                <label className="sp-label">Die</label>
                <div className="sp-die-grid">
                  {DICE.map(d => (
                    <button key={d} className={`sp-die-btn ${selectedDie === d ? "active" : ""}`} onClick={() => setSelectedDie(d)}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="sp-row">
                <div className="sp-field">
                  <label className="sp-label">Count</label>
                  <input className="sp-input" type="number" min="1" max="20" value={diceCount} onChange={e => setDiceCount(parseInt(e.target.value)||1)} />
                </div>
                <div className="sp-field">
                  <label className="sp-label">Modifier</label>
                  <input className="sp-input" type="number" min="-20" max="20" value={modifier} onChange={e => setModifier(parseInt(e.target.value)||0)} />
                </div>
              </div>
              <div className="sp-field">
                <label className="sp-label">Label (optional)</label>
                <input className="sp-input" placeholder="e.g. Attack roll, Stealth check..." value={rollLabel} onChange={e => setRollLabel(e.target.value)} />
              </div>
              <button className={`sp-roll-btn ${rolling ? "rolling" : ""}`} onClick={handleRoll} disabled={rolling}>
                {rolling ? "Rolling..." : `Roll ${diceCount}${selectedDie}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ""}`}
              </button>
            </div>
            <div className="sp-dice-feed">
              <div className="sp-feed-header">Live Roll Feed</div>
              {rolls.length === 0 && <div className="sp-feed-empty">No rolls yet. Roll the dice!</div>}
              {rolls.map((r, i) => (
                <div key={r.id || i} className={`sp-roll-entry ${isCrit(r) ? "crit" : ""} ${isFail(r) ? "fail" : ""}`}>
                  <div className="sp-roll-left">
                    <span className="sp-roll-name">{r.display_name}</span>
                    <span className="sp-roll-dice">{r.dice}{r.modifier !== 0 ? (r.modifier > 0 ? `+${r.modifier}` : r.modifier) : ""}</span>
                    {r.label && <span className="sp-roll-label">— {r.label}</span>}
                  </div>
                  <div className="sp-roll-right">
                    <span className="sp-roll-result">{r.result}</span>
                    {isCrit(r) && <span className="sp-roll-badge crit">CRIT!</span>}
                    {isFail(r) && <span className="sp-roll-badge fail">FAIL</span>}
                    <span className="sp-roll-time">{formatTime(r.rolled_at)}</span>
                  </div>
                </div>
              ))}
              <div ref={rollsEndRef} />
            </div>
          </div>
        )}

        {/* INITIATIVE TAB */}
        {tab === "initiative" && (
          <div className="sp-initiative-wrap">
            {isDM && (
              <div className="sp-add-combatant">
                <div className="sp-field"><label className="sp-label">Name</label><input className="sp-input" placeholder="Goblin, Aragorn..." value={newCombatant.name} onChange={e => setNewCombatant(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="sp-field"><label className="sp-label">Initiative</label><input className="sp-input" type="number" value={newCombatant.initiative} onChange={e => setNewCombatant(p => ({ ...p, initiative: parseInt(e.target.value)||0 }))} /></div>
                <div className="sp-field"><label className="sp-label">Max HP</label><input className="sp-input" type="number" value={newCombatant.maxHp} onChange={e => setNewCombatant(p => ({ ...p, maxHp: parseInt(e.target.value)||0, hp: parseInt(e.target.value)||0 }))} /></div>
                <label className="sp-toggle-label"><input type="checkbox" checked={newCombatant.isPlayer} onChange={e => setNewCombatant(p => ({ ...p, isPlayer: e.target.checked }))} /><span>Player</span></label>
                <button className="sp-add-btn" onClick={handleAddCombatant}>+ Add</button>
              </div>
            )}
            {state.initiative.length === 0
              ? <div className="sp-empty">{isDM ? "Add combatants to start tracking initiative." : "Waiting for DM to set up initiative..."}</div>
              : <>
                  {isDM && (
                    <div className="sp-turn-controls">
                      <button className="sp-turn-btn" onClick={handleNextTurn}>Next Turn ›</button>
                      <span className="sp-turn-info">Turn: {state.initiative[currentTurn]?.name}</span>
                    </div>
                  )}
                  <div className="sp-initiative-list">
                    {state.initiative.map((c, i) => (
                      <div key={c.id} className={`sp-combatant ${i === currentTurn ? "active-turn" : ""}`}>
                        <div className="sp-combatant-init">{c.initiative}</div>
                        <div className="sp-combatant-info">
                          <div className="sp-combatant-name">{c.isPlayer ? "🎲" : "👹"} {c.name}</div>
                          <div className="sp-combatant-hp">HP: {c.hp} / {c.maxHp}</div>
                          {(c.conditions || []).length > 0 && (
                            <div className="sp-combatant-conditions">
                              {c.conditions.map(cond => <span key={cond} className="sp-condition-tag">{cond}</span>)}
                            </div>
                          )}
                        </div>
                        {isDM && <button className="sp-remove-btn" onClick={() => handleRemoveCombatant(c.id)}>✕</button>}
                        {i === currentTurn && <div className="sp-active-arrow">◀</div>}
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>
        )}

        {/* HP TRACKER TAB */}
        {tab === "hp" && (
          <div className="sp-hp-wrap">
            {isDM && state.hp_tracker.length === 0 && (
              <button className="sp-add-btn wide" onClick={handleAddHpEntry}>+ Load Party Members</button>
            )}
            {state.hp_tracker.length === 0
              ? <div className="sp-empty">{isDM ? "" : "Waiting for DM to load party HP..."}</div>
              : <div className="sp-hp-list">
                  {state.hp_tracker.map(entry => (
                    <div key={entry.id} className="sp-hp-entry">
                      <div className="sp-hp-name">{entry.name}</div>
                      <div className="sp-hp-bar-wrap">
                        <div className="sp-hp-bar" style={{ width:`${Math.min(100, (entry.currentHp / Math.max(1, entry.maxHp)) * 100)}%`, background: entry.currentHp / entry.maxHp > 0.5 ? "#7ec98a" : entry.currentHp / entry.maxHp > 0.25 ? "#c9a96e" : "#c97070" }} />
                      </div>
                      <div className="sp-hp-controls">
                        <label className="sp-label">Current</label>
                        <input className="sp-input small" type="number" value={entry.currentHp} onChange={e => handleHpChange(entry.id, "currentHp", e.target.value)} />
                        <span className="sp-hp-sep">/</span>
                        <label className="sp-label">Max</label>
                        <input className="sp-input small" type="number" value={entry.maxHp} onChange={e => handleHpChange(entry.id, "maxHp", e.target.value)} />
                        <label className="sp-label">Temp</label>
                        <input className="sp-input small" type="number" value={entry.tempHp} onChange={e => handleHpChange(entry.id, "tempHp", e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* CONDITIONS TAB */}
        {tab === "conditions" && (
          <div className="sp-conditions-wrap">
            {state.initiative.length === 0
              ? <div className="sp-empty">Add combatants in the Initiative tab first.</div>
              : state.initiative.map(c => (
                  <div key={c.id} className="sp-condition-entry">
                    <div className="sp-condition-name">{c.name}</div>
                    <div className="sp-condition-grid">
                      {CONDITIONS.map(cond => (
                        <button
                          key={cond}
                          className={`sp-cond-btn ${(c.conditions || []).includes(cond) ? "active" : ""}`}
                          onClick={() => isDM && handleToggleCondition(c.id, cond)}
                          disabled={!isDM}
                        >
                          {cond}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
            }
          </div>
        )}

        {/* SPELL SLOTS TAB */}
        {tab === "spells" && (
          <div className="sp-spells-wrap">
            <div className="sp-spells-header">Your Spell Slots</div>
            <div className="sp-spells-grid">
              {SPELL_LEVELS.map(level => {
                const slot = spellSlots[level] || { max: 0, used: 0 };
                const available = Math.max(0, slot.max - slot.used);
                return (
                  <div key={level} className="sp-spell-level">
                    <div className="sp-spell-level-label">Level {level}</div>
                    <div className="sp-spell-slots-row">
                      {Array.from({ length: slot.max }).map((_, i) => (
                        <div key={i} className={`sp-slot-pip ${i < available ? "available" : "used"}`} />
                      ))}
                      {slot.max === 0 && <span className="sp-no-slots">—</span>}
                    </div>
                    <div className="sp-spell-controls">
                      <input className="sp-input tiny" type="number" min="0" max="9" value={slot.max} onChange={e => handleSlotChange(level, "max", e.target.value)} placeholder="Max" />
                      <button className="sp-slot-btn use" onClick={() => handleUseSlot(level)} disabled={available === 0}>Use</button>
                      <button className="sp-slot-btn restore" onClick={() => handleRestoreSlot(level)} disabled={slot.used === 0}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NOTES TAB */}
        {tab === "notes" && (
          <div className="sp-notes-wrap">
            <div className="sp-notes-header">Shared Session Notes <span className="sp-notes-sub">— edits sync live for everyone</span></div>
            <textarea
              className="sp-notes-area"
              value={state.notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Take notes here during the session — everyone can see and edit..."
            />
          </div>
        )}

      </div>
    </div>
  );
}