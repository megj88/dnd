import { useState, useRef } from "react";
import "./DiceRoller.css";

const DICE = [
  { sides: 4, label: "D4", shape: "▲" },
  { sides: 6, label: "D6", shape: "■" },
  { sides: 8, label: "D8", shape: "◆" },
  { sides: 10, label: "D10", shape: "◈" },
  { sides: 12, label: "D12", shape: "⬡" },
  { sides: 20, label: "D20", shape: "⬟" },
  { sides: 100, label: "D100", shape: "●" },
];

const COMMON_LABELS = [
  "Attack Roll", "Damage", "Saving Throw", "Skill Check",
  "Initiative", "Perception", "Stealth", "Persuasion"
];

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export default function DiceRoller() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState({ sides: 20, label: "D20" });
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [rollLabel, setRollLabel] = useState("");
  const [lastRoll, setLastRoll] = useState(null);
  const [history, setHistory] = useState([]);
  const [rolling, setRolling] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const animRef = useRef(null);

  const handleRoll = () => {
    if (rolling) return;
    setRolling(true);

    // Animate briefly
    let flashes = 0;
    const interval = setInterval(() => {
      const fakeRolls = Array.from({ length: count }, () => rollDie(selected.sides));
      setLastRoll({
        dice: fakeRolls,
        total: fakeRolls.reduce((a, b) => a + b, 0) + modifier,
        modifier,
        sides: selected.sides,
        label: rollLabel || selected.label,
        animating: true,
      });
      flashes++;
      if (flashes >= 6) {
        clearInterval(interval);
        // Final real roll
        const finalRolls = Array.from({ length: count }, () => rollDie(selected.sides));
        const total = finalRolls.reduce((a, b) => a + b, 0) + modifier;
        const result = {
          id: Date.now(),
          dice: finalRolls,
          total,
          modifier,
          sides: selected.sides,
          count,
          label: rollLabel || selected.label,
          animating: false,
          timestamp: new Date(),
        };
        setLastRoll(result);
        setHistory(prev => [result, ...prev].slice(0, 10));
        setRolling(false);
      }
    }, 80);
    animRef.current = interval;
  };

  const isCrit = (roll, sides) => roll === sides;
  const isFail = (roll, sides) => roll === 1 && sides === 20;

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Floating button */}
      <button
        className="dr-toggle"
        onClick={() => { setOpen(!open); setShowHistory(false); }}
        title="Dice Roller"
      >
        🎲
      </button>

      {open && (
        <div className="dr-panel">
          {/* Header */}
          <div className="dr-header">
            <div className="dr-title">Dice Roller</div>
            <div className="dr-header-actions">
              <button
                className={`dr-history-toggle ${showHistory ? "active" : ""}`}
                onClick={() => setShowHistory(!showHistory)}
                title="Roll History"
              >
                📜
              </button>
              <button className="dr-close" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          {showHistory ? (
            <div className="dr-history">
              <div className="dr-history-title">Roll History</div>
              {history.length === 0 ? (
                <div className="dr-history-empty">No rolls yet. Start rolling!</div>
              ) : (
                history.map(h => (
                  <div key={h.id} className="dr-history-row">
                    <div className="dr-history-left">
                      <div className="dr-history-label">{h.label}</div>
                      <div className="dr-history-detail">
                        {h.count}d{h.sides}
                        {h.modifier !== 0 && ` ${h.modifier > 0 ? "+" : ""}${h.modifier}`}
                        {" → "}[{h.dice.join(", ")}]
                      </div>
                    </div>
                    <div className="dr-history-right">
                      <div className={`dr-history-total ${h.dice.some(d => isCrit(d, h.sides)) ? "crit" : ""} ${h.dice.some(d => isFail(d, h.sides)) ? "fail" : ""}`}>
                        {h.total}
                      </div>
                      <div className="dr-history-time">{formatTime(h.timestamp)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="dr-body">
              {/* Dice selector */}
              <div className="dr-dice-grid">
                {DICE.map(die => (
                  <button
                    key={die.sides}
                    className={`dr-die-btn ${selected.sides === die.sides ? "active" : ""}`}
                    onClick={() => setSelected(die)}
                  >
                    <span className="dr-die-shape">{die.shape}</span>
                    <span className="dr-die-label">{die.label}</span>
                  </button>
                ))}
              </div>

              {/* Controls */}
              <div className="dr-controls">
                <div className="dr-control-group">
                  <label className="dr-control-label">Dice</label>
                  <div className="dr-counter">
                    <button className="dr-counter-btn" onClick={() => setCount(c => Math.max(1, c - 1))}>−</button>
                    <span className="dr-counter-value">{count}</span>
                    <button className="dr-counter-btn" onClick={() => setCount(c => Math.min(10, c + 1))}>+</button>
                  </div>
                </div>
                <div className="dr-control-group">
                  <label className="dr-control-label">Modifier</label>
                  <div className="dr-counter">
                    <button className="dr-counter-btn" onClick={() => setModifier(m => m - 1)}>−</button>
                    <span className="dr-counter-value">{modifier >= 0 ? `+${modifier}` : modifier}</span>
                    <button className="dr-counter-btn" onClick={() => setModifier(m => m + 1)}>+</button>
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="dr-label-section">
                <input
                  className="dr-label-input"
                  placeholder="Label this roll..."
                  value={rollLabel}
                  onChange={e => setRollLabel(e.target.value)}
                  list="dr-common-labels"
                />
                <datalist id="dr-common-labels">
                  {COMMON_LABELS.map(l => <option key={l} value={l} />)}
                </datalist>
              </div>

              {/* Result */}
              {lastRoll && (
                <div className={`dr-result ${lastRoll.animating ? "animating" : ""}`}>
                  <div className="dr-result-label">{lastRoll.label}</div>
                  <div className={`dr-result-total ${lastRoll.dice.some(d => isCrit(d, lastRoll.sides)) ? "crit" : ""} ${lastRoll.dice.some(d => isFail(d, lastRoll.sides)) ? "fail" : ""}`}>
                    {lastRoll.total}
                    {lastRoll.dice.some(d => isCrit(d, lastRoll.sides)) && !lastRoll.animating && (
                      <span className="dr-crit-label">CRIT!</span>
                    )}
                    {lastRoll.dice.some(d => isFail(d, lastRoll.sides)) && !lastRoll.animating && (
                      <span className="dr-fail-label">FAIL</span>
                    )}
                  </div>
                  <div className="dr-result-breakdown">
                    {lastRoll.dice.map((d, i) => (
                      <span
                        key={i}
                        className={`dr-die-result ${isCrit(d, lastRoll.sides) ? "crit" : ""} ${isFail(d, lastRoll.sides) ? "fail" : ""}`}
                      >
                        {d}
                      </span>
                    ))}
                    {lastRoll.modifier !== 0 && (
                      <span className="dr-modifier-result">
                        {lastRoll.modifier > 0 ? `+${lastRoll.modifier}` : lastRoll.modifier}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Roll button */}
              <button
                className="dr-roll-btn"
                onClick={handleRoll}
                disabled={rolling}
              >
                {rolling ? "Rolling..." : `Roll ${count > 1 ? `${count}×` : ""}${selected.label}${modifier !== 0 ? ` ${modifier > 0 ? "+" : ""}${modifier}` : ""}`}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}