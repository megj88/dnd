import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { createNotification } from "../utils/notify";
import { useAchievements } from "../context/AchievementContext";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import "./FriendsPage.css";

const TABS = ["Friends", "Requests", "Suggestions"];

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return new Date() - new Date(lastSeen) < 5 * 60 * 1000;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Friends");
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchFriends(), fetchRequests(), fetchSuggestions()]);
    setLoading(false);
  };

  const { triggerCheck } = useAchievements();

  const fetchFriends = async () => {
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!data || data.length === 0) { setFriends([]); return; }

    const friendIds = data.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id);
    const [{ data: profiles }, { data: presence }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, favourite_class, avatar_url, playstyle").in("id", friendIds),
      supabase.from("user_presence").select("user_id, last_seen").in("user_id", friendIds),
    ]);

    const presenceMap = {};
    (presence || []).forEach(p => presenceMap[p.user_id] = p.last_seen);

    setFriends((profiles || []).map(p => ({
      ...p,
      last_seen: presenceMap[p.id] || null,
      friendship: data.find(f => f.requester_id === p.id || f.addressee_id === p.id),
    })));
  };

  const fetchRequests = async () => {
    // Incoming
    const { data: inc } = await supabase
      .from("friendships")
      .select("*")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (inc && inc.length > 0) {
      const ids = inc.map(f => f.requester_id);
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, favourite_class, avatar_url").in("id", ids);
      const profileMap = {};
      (profiles || []).forEach(p => profileMap[p.id] = p);
      setIncoming(inc.map(f => ({ ...f, profile: profileMap[f.requester_id] || null })));
    } else {
      setIncoming([]);
    }

    // Outgoing
    const { data: out } = await supabase
      .from("friendships")
      .select("*")
      .eq("requester_id", user.id)
      .eq("status", "pending");

    if (out && out.length > 0) {
      const ids = out.map(f => f.addressee_id);
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, favourite_class, avatar_url").in("id", ids);
      const profileMap = {};
      (profiles || []).forEach(p => profileMap[p.id] = p);
      setOutgoing(out.map(f => ({ ...f, profile: profileMap[f.addressee_id] || null })));
    } else {
      setOutgoing([]);
    }
  };

  const fetchSuggestions = async () => {
    // Get all existing friendship ids
    const { data: existing } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const knownIds = new Set([user.id]);
    (existing || []).forEach(f => {
      knownIds.add(f.requester_id);
      knownIds.add(f.addressee_id);
    });

    // Get campaign mates
    const { data: myApps } = await supabase
      .from("applications")
      .select("campaign_id")
      .eq("applicant_id", user.id)
      .eq("status", "approved");

    const { data: myDmCampaigns } = await supabase
      .from("posts")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "campaign");

    const campaignIds = [
      ...((myApps || []).map(a => a.campaign_id)),
      ...((myDmCampaigns || []).map(c => c.id)),
    ];

    let suggestionIds = new Set();

    if (campaignIds.length > 0) {
      const { data: coPlayers } = await supabase
        .from("applications")
        .select("applicant_id, dm_id")
        .in("campaign_id", campaignIds)
        .eq("status", "approved");

      (coPlayers || []).forEach(a => {
        if (!knownIds.has(a.applicant_id)) suggestionIds.add(a.applicant_id);
        if (!knownIds.has(a.dm_id)) suggestionIds.add(a.dm_id);
      });
    }

    // Fill with similar playstyle if not enough
    if (suggestionIds.size < 6) {
      const { data: myProfile } = await supabase.from("profiles").select("playstyle").eq("id", user.id).maybeSingle();
      if (myProfile?.playstyle) {
        const { data: similar } = await supabase
          .from("profiles")
          .select("id")
          .eq("playstyle", myProfile.playstyle)
          .neq("id", user.id)
          .limit(10);
        (similar || []).forEach(p => { if (!knownIds.has(p.id)) suggestionIds.add(p.id); });
      }
    }

    const ids = [...suggestionIds].slice(0, 8);
    if (ids.length === 0) { setSuggestions([]); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, favourite_class, avatar_url, playstyle")
      .in("id", ids);

    setSuggestions(profiles || []);
  };

  const handleAccept = async (friendship) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendship.id);
    await createNotification({
      userId: friendship.requester_id,
      type: "message",
      message: `Your friend request was accepted!`,
      link: "/friends",
    });
    fetchAll();
    await triggerCheck(user.id, "friend");
  };

  const handleDecline = async (friendship) => {
    await supabase.from("friendships").update({ status: "declined" }).eq("id", friendship.id);
    fetchAll();
  };

  const handleUnfriend = async (friendship) => {
    await supabase.from("friendships").delete().eq("id", friendship.id);
    fetchAll();
  };

  const handleSendRequest = async (profileId) => {
    await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: profileId });
    await createNotification({
      userId: profileId,
      type: "message",
      message: "You have a new friend request!",
      link: "/friends",
    });
    fetchAll();
  };

  const handleCancelRequest = async (friendship) => {
    await supabase.from("friendships").delete().eq("id", friendship.id);
    fetchAll();
  };

  const Avatar = ({ profile, size = 44 }) => (
    <div className="fp-avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
        : <span>{(profile?.display_name || profile?.favourite_class || "?")[0].toUpperCase()}</span>
      }
    </div>
  );

  return (
    <div className="fp-wrap">
      <div className="fp-stars">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="fp-star" style={{
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 6}s`, animationDuration: `${Math.random() * 4 + 4}s`,
          }} />
        ))}
      </div>

      <nav className="fp-nav">
        <button className="fp-nav-btn" onClick={() => navigate("/home")}>← Back to Tavern</button>
        <div className="fp-nav-logo">⚔️ The Tavern Board</div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <SearchBar />
          <NotificationBell />
          <button className="fp-nav-btn" onClick={() => navigate(`/profile/${user?.id}`)}>My Profile</button>
        </div>
      </nav>

      <div className="fp-content">
        <div className="fp-header">
          <div className="fp-eyebrow">Your Companions</div>
          <h1 className="fp-title">The <span>Fellowship</span></h1>
          <p className="fp-subtitle">Manage your adventuring companions and discover new allies.</p>
        </div>

        <div className="fp-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`fp-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "Requests" && incoming.length > 0 && (
                <span className="fp-tab-badge">{incoming.length}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="fp-loading">Gathering your companions...</div>
        ) : (
          <div className="fp-tab-content">

            {/* Friends */}
            {activeTab === "Friends" && (
              <div className="fp-list">
                {friends.length === 0 ? (
                  <div className="fp-empty">
                    <div className="fp-empty-icon">🤝</div>
                    <p>No companions yet. Find adventurers in the Party Finder and send them a request!</p>
                  </div>
                ) : friends.map(friend => (
                  <div key={friend.id} className="fp-friend-row">
                    <div className="fp-friend-left" onClick={() => navigate(`/profile/${friend.id}`)}>
                      <div className="fp-avatar-wrap">
                        <Avatar profile={friend} />
                        <div className={`fp-online-dot ${isOnline(friend.last_seen) ? "online" : ""}`} />
                      </div>
                      <div className="fp-friend-info">
                        <div className="fp-friend-name">{friend.display_name || friend.favourite_class || "Adventurer"}</div>
                        <div className="fp-friend-meta">
                          {friend.playstyle && <span className="fp-friend-playstyle">{friend.playstyle}</span>}
                          <span className={`fp-friend-status ${isOnline(friend.last_seen) ? "online" : ""}`}>
                            {isOnline(friend.last_seen) ? "● Online" : "○ Offline"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="fp-friend-actions">
                      <button className="fp-msg-btn" onClick={() => navigate(`/profile/${friend.id}`)}>View Profile</button>
                      <button className="fp-unfriend-btn" onClick={() => handleUnfriend(friend.friendship)}>Unfriend</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Requests */}
            {activeTab === "Requests" && (
              <div className="fp-requests">
                {incoming.length > 0 && (
                  <div className="fp-requests-section">
                    <div className="fp-requests-title">Incoming Requests ({incoming.length})</div>
                    {incoming.map(req => (
                      <div key={req.id} className="fp-friend-row">
                        <div className="fp-friend-left" onClick={() => navigate(`/profile/${req.requester_id}`)}>
                          <Avatar profile={req.profile} />
                          <div className="fp-friend-info">
                            <div className="fp-friend-name">{req.profile?.display_name || req.profile?.favourite_class || "Adventurer"}</div>
                            <div className="fp-friend-meta">Wants to join your party</div>
                          </div>
                        </div>
                        <div className="fp-friend-actions">
                          <button className="fp-accept-btn" onClick={() => handleAccept(req)}>Accept</button>
                          <button className="fp-decline-btn" onClick={() => handleDecline(req)}>Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {outgoing.length > 0 && (
                  <div className="fp-requests-section">
                    <div className="fp-requests-title">Sent Requests ({outgoing.length})</div>
                    {outgoing.map(req => (
                      <div key={req.id} className="fp-friend-row">
                        <div className="fp-friend-left" onClick={() => navigate(`/profile/${req.addressee_id}`)}>
                          <Avatar profile={req.profile} />
                          <div className="fp-friend-info">
                            <div className="fp-friend-name">{req.profile?.display_name || req.profile?.favourite_class || "Adventurer"}</div>
                            <div className="fp-friend-meta">Request pending...</div>
                          </div>
                        </div>
                        <div className="fp-friend-actions">
                          <button className="fp-decline-btn" onClick={() => handleCancelRequest(req)}>Cancel</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {incoming.length === 0 && outgoing.length === 0 && (
                  <div className="fp-empty">
                    <div className="fp-empty-icon">📬</div>
                    <p>No pending requests.</p>
                  </div>
                )}
              </div>
            )}

            {/* Suggestions */}
            {activeTab === "Suggestions" && (
              <div className="fp-suggestions-grid">
                {suggestions.length === 0 ? (
                  <div className="fp-empty">
                    <div className="fp-empty-icon">🔮</div>
                    <p>No suggestions yet. Join some campaigns to meet fellow adventurers!</p>
                  </div>
                ) : suggestions.map(profile => (
                  <div key={profile.id} className="fp-suggestion-card">
                    <Avatar profile={profile} size={56} />
                    <div className="fp-suggestion-name">{profile.display_name || profile.favourite_class || "Adventurer"}</div>
                    {profile.playstyle && <div className="fp-suggestion-playstyle">{profile.playstyle}</div>}
                    <div className="fp-suggestion-actions">
                      <button className="fp-view-btn" onClick={() => navigate(`/profile/${profile.id}`)}>View</button>
                      <button className="fp-add-btn" onClick={() => handleSendRequest(profile.id)}>+ Add</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}