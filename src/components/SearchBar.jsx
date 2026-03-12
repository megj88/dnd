import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./SearchBar.css";

export default function SearchBar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ players: [], campaigns: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const close = () => {
    setOpen(false);
    setQuery("");
    setResults({ players: [], campaigns: [], posts: [] });
    setSearched(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Enter") handleSearch();
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    const q = query.trim();

    const [{ data: players }, { data: campaigns }, { data: posts }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, favourite_class, playstyle, avatar_url")
        .or(`display_name.ilike.%${q}%,favourite_class.ilike.%${q}%,bio.ilike.%${q}%`)
        .eq("onboarding_complete", true)
        .limit(4),
      supabase
        .from("posts")
        .select("id, title, body, system, user_id")
        .eq("type", "campaign")
        .or(`title.ilike.%${q}%,body.ilike.%${q}%,system.ilike.%${q}%`)
        .limit(4),
      supabase
        .from("posts")
        .select("id, title, body, type")
        .neq("type", "campaign")
        .or(`title.ilike.%${q}%,body.ilike.%${q}%`)
        .limit(4),
    ]);

    setResults({
      players: players || [],
      campaigns: campaigns || [],
      posts: posts || [],
    });
    setLoading(false);
  };

  const totalResults = results.players.length + results.campaigns.length + results.posts.length;

  const PLAYSTYLE_ICONS = {
    roleplay: "🎭",
    tactician: "⚔️",
    explorer: "🗺️",
    storyteller: "📖",
  };

  const POST_TYPE_ICONS = {
    lfg: "🎲",
    recap: "📜",
    homebrew: "⚗️",
  };

  return (
    <div className="sb-wrap" ref={wrapRef}>
      {!open ? (
        <button className="sb-icon-btn" onClick={() => setOpen(true)}>
          🔍
        </button>
      ) : (
        <div className="sb-input-wrap">
          <span className="sb-input-icon">🔍</span>
          <input
            ref={inputRef}
            className="sb-input"
            placeholder="Search the realm... (Enter)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="sb-close-btn" onClick={close}>✕</button>
        </div>
      )}

      {open && searched && (
        <div className="sb-dropdown">
          {loading ? (
            <div className="sb-loading">Consulting the arcane archives...</div>
          ) : totalResults === 0 ? (
            <div className="sb-empty">
              <span>🕯️</span>
              <span>No results found for "{query}"</span>
            </div>
          ) : (
            <>
              {results.players.length > 0 && (
                <div className="sb-group">
                  <div className="sb-group-title">Players</div>
                  {results.players.map(p => (
                    <div
                      key={p.id}
                      className="sb-result"
                      onClick={() => { navigate(`/profile/${p.id}`); close(); }}
                    >
                      <div className="sb-result-avatar">
                        {p.avatar_url
                          ? <img src={p.avatar_url} alt="" />
                          : <span>{(p.display_name || p.favourite_class || "?")[0].toUpperCase()}</span>
                        }
                      </div>
                      <div className="sb-result-info">
                        <div className="sb-result-name">
                          {p.display_name || p.favourite_class || "Anonymous Adventurer"}
                        </div>
                        {p.favourite_class && (
                          <div className="sb-result-sub">
                            {PLAYSTYLE_ICONS[p.playstyle]} {p.favourite_class}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.campaigns.length > 0 && (
                <div className="sb-group">
                  <div className="sb-group-title">Campaigns</div>
                  {results.campaigns.map(c => (
                    <div
                      key={c.id}
                      className="sb-result"
                      onClick={() => { navigate("/campaigns"); close(); }}
                    >
                      <div className="sb-result-icon">🗺️</div>
                      <div className="sb-result-info">
                        <div className="sb-result-name">{c.title}</div>
                        {c.system && <div className="sb-result-sub">{c.system}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.posts.length > 0 && (
                <div className="sb-group">
                  <div className="sb-group-title">Posts</div>
                  {results.posts.map(p => (
                    <div
                      key={p.id}
                      className="sb-result"
                      onClick={() => { navigate("/home"); close(); }}
                    >
                      <div className="sb-result-icon">{POST_TYPE_ICONS[p.type] || "📌"}</div>
                      <div className="sb-result-info">
                        <div className="sb-result-name">{p.title}</div>
                        <div className="sb-result-sub">{p.type?.toUpperCase()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}