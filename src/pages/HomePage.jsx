import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { usePresence } from "../hooks/usePresence";
import PostCard from "../components/PostCard";
import NewPostModal from "../components/NewPostModal";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import "./HomePage.css";

const FILTERS = [
  { id: "all", label: "All Posts", icon: "⚔️" },
  { id: "campaign", label: "Campaigns", icon: "🗺️" },
  { id: "lfg", label: "LFG", icon: "🎲" },
  { id: "recap", label: "Recaps", icon: "📜" },
  { id: "homebrew", label: "Homebrew", icon: "⚗️" },
];

export default function HomePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.from("admin_roles").select("id").eq("user_id", user?.id).maybeSingle();
      setIsAdmin(!!data);
    };
    if (user) checkAdmin();
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  usePresence(user?.id);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("playstyle, favourite_class, years_playing")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data);
  };

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter !== "all") query = query.eq("type", filter);

    const { data } = await query;
    setPosts(data || []);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleMobileNav = (path) => {
  setMobileMenuOpen(false);
  navigate(path);
};

  const isDM = profile?.playstyle === "storyteller";
  const postButtonLabel = isDM ? "⚔️ Post a Campaign" : "🎲 Looking for Group";
  const postType = isDM ? "campaign" : "lfg";

  return (
    <div className="home-wrap">
      {/* Starfield */}
      <div className="home-stars">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="home-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 6}s`,
            animationDuration: `${Math.random() * 4 + 4}s`,
            opacity: Math.random() * 0.5 + 0.1,
          }} />
        ))}
      </div>

      {/* Nav */}
      <nav className="home-nav">
  <div className="home-nav-logo" onClick={() => navigate("/home")}>⚔️ The Tavern Board</div>
  <div className="home-nav-right">
    {profile && <span className="home-nav-class">{profile.favourite_class || "Adventurer"}</span>}

    {/* Desktop dropdowns */}
    <div className="home-nav-dropdown">
      <button className="home-nav-dropdown-btn">⚔️ Play ▾</button>
      <div className="home-nav-dropdown-menu">
        <div className="home-nav-dropdown-menu-inner">
          <button onClick={() => navigate("/campaigns")}>🗺️ Campaigns</button>
          <button onClick={() => navigate("/party")}>🎲 Find Party</button>
          <button onClick={() => navigate("/scheduler")}>📅 Scheduler</button>
          <button onClick={() => navigate("/calendar")}>🗓️ Calendar</button>
        </div>
      </div>
    </div>

    <div className="home-nav-dropdown">
      <button className="home-nav-dropdown-btn">📜 Create ▾</button>
      <div className="home-nav-dropdown-menu">
        <div className="home-nav-dropdown-menu-inner">
          <button onClick={() => navigate("/journals")}>📖 Journals</button>
          <button onClick={() => navigate("/homebrew")}>⚗️ Homebrew</button>
          <button onClick={() => navigate("/maps")}>🗺️ Maps</button>
          <button onClick={() => navigate("/characters")}>📋 Characters</button>
          <button onClick={() => navigate("/rules")}>📚 Rules Reference</button>
          <button onClick={() => navigate("/npcs")}>🎭 NPC Library</button>
        </div>
      </div>
    </div>

    <div className="home-nav-dropdown">
      <button className="home-nav-dropdown-btn">🤝 Social ▾</button>
      <div className="home-nav-dropdown-menu">
        <div className="home-nav-dropdown-menu-inner">
          <button onClick={() => navigate("/friends")}>👥 Friends</button>
          <button onClick={() => navigate(`/profile/${user?.id}`)}>⚔️ My Profile</button>
          {isAdmin && <button onClick={() => navigate("/admin")}>🛡️ Admin</button>}
          <div className="home-nav-dropdown-divider" />
          <button className="home-nav-dropdown-signout" onClick={handleSignOut}>Sign Out</button>
        </div>
      </div>
    </div>

    <SearchBar />
    <NotificationBell />

    {/* Hamburger */}
    <button
      className={`home-nav-hamburger ${mobileMenuOpen ? "open" : ""}`}
      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
    >
      <span /><span /><span />
    </button>
  </div>
</nav>

{/* Mobile menu */}
<div className={`home-mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
  <div className="home-mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />
  <div className="home-mobile-menu-panel">
    <button className="home-mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
    <div className="home-mobile-menu-logo">⚔️ The Tavern Board</div>

    <div className="home-mobile-menu-section">
      <div className="home-mobile-menu-section-label">Play</div>
      <button className="home-mobile-menu-btn" onClick={() => handleMobileNav("/campaigns")}>🗺️ Campaigns</button>
      <button className="home-mobile-menu-btn" onClick={() => handleMobileNav("/party")}>🎲 Find Party</button>
      <button className="home-mobile-menu-btn" onClick={() => handleMobileNav("/scheduler")}>📅 Scheduler</button>
      <button className="home-mobile-menu-btn" onClick={() => handleMobileNav("/calendar")}>🗓️ Calendar</button>
    </div>

    <div className="home-nav-dropdown">
  <button className="home-nav-dropdown-btn">📜 Create ▾</button>
  <div className="home-nav-dropdown-menu">
    <div className="home-nav-dropdown-menu-inner">
      <button onClick={() => navigate("/journals")}>📖 Journals</button>
      <button onClick={() => navigate("/homebrew")}>⚗️ Homebrew</button>
      <button onClick={() => navigate("/maps")}>🗺️ Maps</button>
      <button onClick={() => navigate("/characters")}>📋 Characters</button>
      <button onClick={() => navigate("/rules")}>📚 Rules Reference</button>
      <button className="home-mobile-menu-btn" onClick={() => handleMobileNav("/npcs")}>🎭 NPC Library</button>
    </div>
  </div>
</div>

    <div className="home-mobile-menu-section">
      <div className="home-mobile-menu-section-label">Social</div>
      <button className="home-mobile-menu-btn" onClick={() => handleMobileNav("/friends")}>👥 Friends</button>
      <button className="home-mobile-menu-btn" onClick={() => handleMobileNav(`/profile/${user?.id}`)}>⚔️ My Profile</button>
      {isAdmin && <button className="home-mobile-menu-btn" onClick={() => handleMobileNav("/admin")}>🛡️ Admin</button>}
    </div>

    <button className="home-mobile-menu-btn signout" onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}>
      Sign Out
    </button>
  </div>
</div>

      <div className="home-content">
        {/* Header */}
        <div className="home-header">
          <div className="home-header-left">
            <div className="home-eyebrow">The Notice Board</div>
            <h1 className="home-title">What stirs in<br /><span>the Realm?</span></h1>
          </div>
          <button className="home-post-btn" onClick={() => setShowModal(true)}>
            {postButtonLabel}
          </button>
        </div>

        {/* Filters */}
        <div className="home-filters">
          {FILTERS.map(f => (
            <button
              key={f.id}
              className={`home-filter-btn ${filter === f.id ? "active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              <span>{f.icon}</span> {f.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="home-loading">Consulting the arcane archives...</div>
        ) : posts.length === 0 ? (
          <div className="home-empty">
            <div className="home-empty-icon">🕯️</div>
            <p>The notice board is bare. Be the first to post.</p>
          </div>
        ) : (
          <div className="home-feed">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onDelete={fetchPosts}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NewPostModal
          type={postType}
          userId={user?.id}
          authorName={profile?.favourite_class || user?.email}
          onClose={() => setShowModal(false)}
          onPosted={() => { setShowModal(false); fetchPosts(); }}
        />
      )}
    </div>
  );
}