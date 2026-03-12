import { useState, useEffect } from 'react'
import { useAuth } from "./context/AuthContext";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import "./DnDOnboarding.css"

const playstyles = [
  {
    id: "roleplay",
    icon: "🎭", 
    title: "Roleplayer",
    subtitle: "Deep stories & living characters",
    desc: "You're here for immersive narrative, rich character backstories, and emotional arcs that last campains.",
    rune: "ᚱ",
  },
    {
    id: "tactician",
    icon: "⚔️", 
    title: "Tactician",
    subtitle: "Strategy, optimisation & combat.",
    desc: "Flanking bonuses, action economy, multiclass builds - you come prepared and you play to win.",
    rune: "ᛏ",
  },
     {
    id: "explorer",
    icon: "🗺️", 
    title: "Explorer",
    subtitle: "Lore, world-building & discovery.",
    desc: "You want to map every dungeon, uncover every secret, and understand the world deeper than anyone.",
    rune: "ᛖ",
  },
       {
    id: "storyteller",
    icon: "📖", 
    title: "Dungeon Master",
    subtitle: "Craft worlds & guide adventurers.",
    desc: "You live to build encounters, weave plots, and watch your players fall right into your traps.",
    rune: "ᛞ",
  },
]

const profileFields = [
  {id: "character", label: "Favourite Character Class", placeholder: "E.g. Wild Magic Sorcerer...", icon: "💎"},
  {id: "campaign", label: "Current/Dream Campaign", placeholder: "E.g. Curse of Strahd...", icon:"💠"},
  {id: "years", label: "Years at the Table", placeholder: "E.g. 3 years, just started...", icon: "🔶"},
]

export default function DnDOnboarding() {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState(null)
  const [profile, setProfile] = useState({ character: "", campaign: "", years: "" })
  const [revealed, setRevealed] = useState(false)
  const [particles, setParticles] = useState([])
  const [hoveredCard, setHoveredCard] = useState(null)
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setRevealed(false)
    const t = setTimeout(() => setRevealed(true), 50)
  return () => clearTimeout(t)
}, [step])

useEffect(() => {
  const pts = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    delay: Math.random() * 6,
    duration: Math.random() * 4 + 4,
    opacity: Math.random() * 0.5 + 0.1, 
  }))
  setParticles(pts)
}, [])

const canContinue = step === 0 ? true : step === 1 ? !!selected: Object.values(profile).some(Boolean)


  const CornerSVG = () => (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 10 L10 50 M10 10 L50 10" stroke="#c9a96e" strokeWidth="1.5"/>
      <path d="M10 10 L40 40" stroke="#c9a96e" strokeWidth="0.5" strokeDasharray="3 4"/>
      <circle cx="10" cy="10" r="3" fill="#c9a96e"/>
      <circle cx="50" cy="10" r="1.5" fill="#c9a96e" opacity="0.5"/>
      <circle cx="10" cy="50" r="1.5" fill="#c9a96e" opacity="0.5"/>
      <path d="M25 10 L25 16 M10 25 L16 25" stroke="#c9a96e" strokeWidth="0.8" opacity="0.4"/>
      <path d="M35 10 L38 13 M10 35 L13 38" stroke="#c9a96e" strokeWidth="0.8" opacity="0.3"/>
    </svg>
  );

  return (
    <>
      <div className="dnd-wrap">
        {/* Starfield */}
        <div className="stars">
          {particles.map(p => (
            <div key={p.id} className="star" style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: `${p.size}px`, height: `${p.size}px`,
              "--dur": `${p.duration}s`, "--delay": `${p.delay}s`, "--op": p.opacity,
            }} />
          ))}
        </div>

        {/* Corner ornaments */}
        {["tl","tr","bl","br"].map(pos => (
          <div key={pos} className={`corner-ornament ${pos}`}><CornerSVG /></div>
        ))}

        <div className="panel">
          <div className="panel-glow" />

          {/* Progress indicator */}
          {step < 3 && (
            <div className="progress-row">
              {[0,1,2].map(i => (
                <div key={i} className={`progress-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
              ))}
            </div>
          )}

          {/* ── STEP 0: Welcome ── */}
          {step === 0 && (
            <>
              <div className={`reveal ${revealed ? "shown" : ""}`}>
                <div className="welcome-badge">✦ New Adventurer ✦</div>
              </div>
              <div className={`reveal d1 ${revealed ? "shown" : ""}`}>
                <div className="eyebrow">The Realm Awaits</div>
                <h1 className="main-title">Welcome to<br /><span>The Tavern Board</span></h1>
                <p className="subtitle">Where adventurers gather, parties form, and legends begin. Your quest starts here.</p>
              </div>
              <div className={`reveal d2 ${revealed ? "shown" : ""}`}>
                <div className="divider"><div className="divider-line"/><div className="divider-diamond"/><div className="divider-line"/></div>
              </div>
              <ul className={`feature-list reveal d3 ${revealed ? "shown" : ""}`}>
                <li><span className="fi">⚔️</span> Find parties that match your playstyle and schedule</li>
                <li><span className="fi">🗺️</span> Browse campaigns, one-shots, and long-term adventures</li>
                <li><span className="fi">🎲</span> Connect with DMs, players, and worldbuilders near you</li>
                <li><span className="fi">📜</span> Showcase your characters, homebrew, and session stories</li>
              </ul>
              <div className={`reveal d4 ${revealed ? "shown" : ""}`}>
                <button className="cta-btn" onClick={() => setStep(1)}>
                  Begin Your Journey →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 1: Playstyle ── */}
          {step === 1 && (
            <>
              <div className={`reveal ${revealed ? "shown" : ""}`}>
                <div className="eyebrow">Your Nature</div>
                <h2 className="main-title">Choose Your<br /><span>Adventurer's Path</span></h2>
                <p className="subtitle">How do you play? This shapes who we connect you with.</p>
              </div>
              <div className={`cards-grid reveal d2 ${revealed ? "shown" : ""}`}>
                {playstyles.map(s => (
                  <div
                    key={s.id}
                    className={`style-card ${selected === s.id ? "active" : ""}`}
                    onClick={() => setSelected(s.id)}
                    onMouseEnter={() => setHoveredCard(s.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div className="card-rune">{s.rune}</div>
                    <div className="check-mark">{selected === s.id ? "✓" : ""}</div>
                    <span className="card-icon">{s.icon}</span>
                    <div className="card-title">{s.title}</div>
                    <div className="card-sub">{s.subtitle}</div>
                    <p className="card-desc">{s.desc}</p>
                  </div>
                ))}
              </div>
              <div className={`reveal d3 ${revealed ? "shown" : ""}`}>
                <button className="cta-btn" onClick={() => setStep(2)} disabled={!selected}>
                  {selected ? "Seal Your Choice →" : "Choose a Path to Continue"}
                </button>
                <div style={{textAlign:"center"}}>
                  <button className="ghost-btn" onClick={() => setStep(0)}>← Back</button>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2: Profile ── */}
          {step === 2 && (
            <>
              <div className={`reveal ${revealed ? "shown" : ""}`}>
                <div className="eyebrow">Your Legend</div>
                <h2 className="main-title">Fill Your<br /><span>Adventurer's Dossier</span></h2>
                <p className="subtitle">Help others know who you are at the table. Even one field helps.</p>
              </div>
              <div className={`field-group reveal d2 ${revealed ? "shown" : ""}`}>
                {profileFields.map(f => (
                  <div key={f.id} className="field-wrap">
                    <label className="field-label">
                      <span>{f.icon}</span> {f.label}
                    </label>
                    <input
                      className="field-input"
                      placeholder={f.placeholder}
                      value={profile[f.id]}
                      onChange={e => setProfile(p => ({ ...p, [f.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className={`reveal d3 ${revealed ? "shown" : ""}`}>
                <button className="cta-btn" onClick={() => setStep(3)}>
                  {canContinue ? "Enter the Tavern →" : "Enter the Tavern →"}
                </button>
                <p className="skip-note">You can always fill this in later from your profile.</p>
                <div style={{textAlign:"center"}}>
                  <button className="ghost-btn" onClick={() => setStep(1)}>← Back</button>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 3: Complete ── */}
          {step === 3 && (
            <>
              <div className={`reveal ${revealed ? "shown" : ""} `} style={{textAlign:"center"}}>
                <div className="complete-sigil">
                  <div className="sigil-ring r1" />
                  <div className="sigil-ring r2" />
                  <span className="sigil-icon">⚔️</span>
                </div>
              </div>
              <div className={`reveal d1 ${revealed ? "shown" : ""}`}>
                <h2 className="complete-title">Your Seat<br />at the Tavern</h2>
                <p className="complete-sub">
                  Your character sheet is inked. Your path is chosen.<br />
                  {selected && <em>The {playstyles.find(s=>s.id===selected)?.title} enters the hall…</em>}
                </p>
              </div>
              <div className={`reveal d2 ${revealed ? "shown" : ""}`}>
                <div className="divider"><div className="divider-line"/><div className="divider-diamond"/><div className="divider-line"/></div>
              </div>
              <div className={`reveal d3 ${revealed ? "shown" : ""}`}>
                <button className="cta-btn" 
                onClick={async () => {
  await supabase.from("profiles").upsert({
    id: user.id,
    playstyle: selected,
    favourite_class: profile.character,
    campaign: profile.campaign,
    years_playing: profile.years,
    onboarding_complete: true,
  });
  navigate("/home");
}} >
                  ✦ Enter The Tavern Board ✦
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
    
