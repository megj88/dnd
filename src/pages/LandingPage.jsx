import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const FEATURES = [
  {
    icon: "⚔️",
    title: "Party Finder",
    description: "Browse adventurers by playstyle, system, availability and experience. Find your perfect party with powerful filters.",
  },
  {
    icon: "🗺️",
    title: "Campaign Board",
    description: "Dungeon Masters post campaigns, players apply to join. Manage applications and build your dream table.",
  },
  {
    icon: "💬",
    title: "Real-time Messaging",
    description: "Direct messages and group chats built right in. Coordinate sessions, plan quests, and stay connected.",
  },
  {
    icon: "📜",
    title: "Adventure Profiles",
    description: "Showcase your favourite class, playstyle, availability and campaign history. Let the right DMs find you.",
  },
];

const STEPS = [
  {
    number: "I",
    title: "Create Your Profile",
    description: "Choose your playstyle, favourite class and availability. Tell the realm who you are.",
  },
  {
    number: "II",
    title: "Find Adventurers",
    description: "Browse the party finder and campaign board. Nudge players, apply to campaigns, send messages.",
  },
  {
    number: "III",
    title: "Begin Your Quest",
    description: "Connect with your party, coordinate your sessions, and write your legend together.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".lp-animate").forEach(el => {
      observerRef.current.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="lp-wrap">

      {/* Stars */}
      <div className="lp-stars">
        {Array.from({ length: 80 }).map((_, i) => (
          <div key={i} className="lp-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2.5 + 0.5}px`,
            height: `${Math.random() * 2.5 + 0.5}px`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${Math.random() * 4 + 4}s`,
          }} />
        ))}
      </div>

      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-nav-logo">⚔️ The Tavern Board</div>
        <div className="lp-nav-actions">
          <button className="lp-nav-login" onClick={() => navigate("/login")}>
            Sign In
          </button>
          <button className="lp-nav-signup" onClick={() => navigate("/signup")}>
            Join the Tavern
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-rune lp-rune-1">✦</div>
        <div className="lp-hero-rune lp-rune-2">⚔️</div>
        <div className="lp-hero-rune lp-rune-3">✦</div>
        <div className="lp-hero-rune lp-rune-4">🎲</div>
        <div className="lp-hero-rune lp-rune-5">✦</div>

        <div className="lp-hero-content">
          <div className="lp-hero-eyebrow">The TTRPG Social Network</div>
          <h1 className="lp-hero-title">
            Find Your Party.<br />
            <span>Begin Your Legend.</span>
          </h1>
          <p className="lp-hero-subtitle">
            The Tavern Board connects tabletop RPG players and Dungeon Masters.
            Browse campaigns, find adventurers, and forge your next great story.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={() => navigate("/signup")}>
              Create Your Character
            </button>
            <button className="lp-btn-secondary" onClick={() => navigate("/login")}>
              Enter the Tavern
            </button>
          </div>
          <div className="lp-hero-hint">Free to join. No dragons required.</div>
        </div>

        <div className="lp-hero-scroll">
          <div className="lp-scroll-line" />
          <span>Scroll</span>
          <div className="lp-scroll-line" />
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-features">
        <div className="lp-section-inner">
          <div className="lp-animate lp-section-eyebrow">What Awaits You</div>
          <h2 className="lp-animate lp-section-title">Everything a tavern needs</h2>
          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="lp-animate lp-feature-card"
                style={{ animationDelay: `${i * 0.1}s`, transitionDelay: `${i * 0.1}s` }}
              >
                <div className="lp-feature-icon">{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-how">
        <div className="lp-section-inner">
          <div className="lp-animate lp-section-eyebrow">Your Journey</div>
          <h2 className="lp-animate lp-section-title">How it works</h2>
          <div className="lp-steps">
            {STEPS.map((step, i) => (
              <div key={step.number} className="lp-animate lp-step" style={{ transitionDelay: `${i * 0.15}s` }}>
                <div className="lp-step-number">{step.number}</div>
                {i < STEPS.length - 1 && <div className="lp-step-connector" />}
                <h3 className="lp-step-title">{step.title}</h3>
                <p className="lp-step-desc">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <div className="lp-cta-inner">
          <div className="lp-animate lp-cta-rune">✦</div>
          <h2 className="lp-animate lp-cta-title">Ready to join the tavern?</h2>
          <p className="lp-animate lp-cta-subtitle">
            Hundreds of adventurers are waiting. Your party is out there.
          </p>
          <button className="lp-animate lp-btn-primary lp-cta-btn" onClick={() => navigate("/signup")}>
            Begin Your Adventure
          </button>
          <p className="lp-animate lp-cta-login">
            Already have an account?{" "}
            <span className="lp-cta-link" onClick={() => navigate("/login")}>
              Sign in here
            </span>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">⚔️ The Tavern Board</div>
        <div className="lp-footer-tagline">Where legends begin.</div>
      </footer>

    </div>
  );
}