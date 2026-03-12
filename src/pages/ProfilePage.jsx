import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { usePresence } from "../hooks/usePresence";
import { createNotification } from "../utils/notify";
import { ACHIEVEMENTS } from "../utils/achievements";
import AchievementBadge from "../components/AchievementBadge";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import RatingModal from "../components/RatingModal";
import RatingDisplay from "../components/RatingDisplay";
import "./ProfilePage.css";

const PLAYSTYLE_CONFIG = {
  roleplay: { label: "The Roleplayer", icon: "🎭", color: "#c9a96e" },
  tactician: { label: "The Tactician", icon: "⚔️", color: "#7eb8c9" },
  explorer: { label: "The Explorer", icon: "🗺️", color: "#7ec98a" },
  storyteller: { label: "The Dungeon Master", icon: "📖", color: "#a87ec9" },
};

const SESSION_LENGTHS = ["1-2 hours", "2-3 hours", "3-4 hours", "4+ hours", "Full day sessions"];
const TIMEZONES = ["GMT", "GMT+1", "GMT+2", "EST", "CST", "MST", "PST", "AEST", "JST", "IST"];

const EXPERIENCE_LABELS = {
  new: "New to TTRPG",
  some: "Some Experience",
  experienced: "Experienced",
  veteran: "Veteran",
};

export default function ProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [nudgeCount, setNudgeCount] = useState(0);
  const profileId = id === "me" ? user?.id : id;
  const isOwner = user?.id === profileId;
  const { startDirectMessage } = useChat();
  const [ratings, setRatings] = useState([]);
const [showRatingModal, setShowRatingModal] = useState(false);
const [ratingCampaign, setRatingCampaign] = useState(null);
const [canRate, setCanRate] = useState(false);
const [friendship, setFriendship] = useState(null);
const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    if (!profileId) return;
    fetchProfile();
    fetchPosts();
    fetchNudgeCount();
    fetchRatings();
    fetchAchievements();
    if (!isOwner && user) fetchFriendship();
if (!isOwner && user) checkCanRate();
  }, [profileId, user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();
    setProfile(data);
    setLoading(false);
  };

  const fetchAchievements = async () => {
  const { data } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", profileId);
  setAchievements(data || []);
};

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", profileId)
      .order("created_at", { ascending: false });
    setPosts(data || []);
  };

  const fetchNudgeCount = async () => {
    const { count } = await supabase
      .from("nudges")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", profileId);
    setNudgeCount(count || 0);
  };

  const fetchRatings = async () => {
  const { data } = await supabase
    .from("ratings")
    .select("*")
    .eq("reviewee_id", profileId);
  setRatings(data || []);
};

const fetchFriendship = async () => {
  const { data } = await supabase
    .from("friendships")
    .select("*")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${user.id})`
    )
    .maybeSingle();
  setFriendship(data);
};

const handleFriendAction = async () => {
  if (!friendship) {
    await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: profileId });
    await createNotification({ userId: profileId, type: "message", message: "You have a new friend request!", link: "/friends" });
  } else if (friendship.status === "accepted") {
    await supabase.from("friendships").delete().eq("id", friendship.id);
  } else if (friendship.status === "pending" && friendship.requester_id === user.id) {
    await supabase.from("friendships").delete().eq("id", friendship.id);
  } else if (friendship.status === "pending" && friendship.addressee_id === user.id) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendship.id);
  }
  fetchFriendship();
};

const friendBtnLabel = () => {
  if (!friendship) return "+ Add Friend";
  if (friendship.status === "accepted") return "✓ Friends";
  if (friendship.status === "pending" && friendship.requester_id === user.id) return "Request Sent";
  if (friendship.status === "pending" && friendship.addressee_id === user.id) return "Accept Request";
  return "+ Add Friend";
};

const checkCanRate = async () => {
  // Find shared approved applications
  const { data } = await supabase
    .from("applications")
    .select("*, posts(id, title)")
    .eq("applicant_id", profileId)
    .eq("status", "approved");

  if (!data || data.length === 0) return;

  // Check if reviewer is the DM of any of those campaigns
  const dmCampaigns = data.filter(app => app.dm_id === user.id);

  // Also check if current user is an approved applicant for campaigns owned by profileId
  const { data: asApplicant } = await supabase
    .from("applications")
    .select("*, posts(id, title)")
    .eq("applicant_id", user.id)
    .eq("dm_id", profileId)
    .eq("status", "approved");

  const eligible = [...dmCampaigns, ...(asApplicant || [])];
  if (eligible.length === 0) return;

  // Check if already rated for any of these campaigns
  const campaignIds = eligible.map(a => a.campaign_id || a.posts?.id).filter(Boolean);
  const { data: existingRatings } = await supabase
    .from("ratings")
    .select("campaign_id")
    .eq("reviewer_id", user.id)
    .eq("reviewee_id", profileId)
    .in("campaign_id", campaignIds);

  const ratedIds = new Set((existingRatings || []).map(r => r.campaign_id));
  const unrated = eligible.find(a => {
    const cid = a.campaign_id || a.posts?.id;
    return cid && !ratedIds.has(cid);
  });

  if (unrated) {
    setCanRate(true);
    setRatingCampaign({
      id: unrated.campaign_id || unrated.posts?.id,
      title: unrated.posts?.title || "your campaign",
    });
  }
};

  const handleAvatarClick = () => {
    if (isOwner) fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      setProfile(p => ({ ...p, avatar_url: publicUrl }));
    }
    setUploadingAvatar(false);
  };

  const startEdit = (section) => {
    setEditingSection(section);
    setEditData({ ...profile });
    setSaveError("");
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setEditData({});
    setSaveError("");
  };

  const saveEdit = async () => {
    setSaving(true);
    setSaveError("");
    const { error } = await supabase
      .from("profiles")
      .update(editData)
      .eq("id", user.id);
    setSaving(false);
    if (error) return setSaveError(error.message);
    setProfile({ ...profile, ...editData });
    setEditingSection(null);
  };

  const playstyle = PLAYSTYLE_CONFIG[profile?.playstyle] || null;
  const postTypeCount = (type) => posts.filter(p => p.type === type).length;

  if (loading) return (
    <div className="profile-loading">
      <div className="profile-loading-text">Consulting the arcane archives...</div>
    </div>
  );

  if (!profile) return (
    <div className="profile-loading">
      <div className="profile-loading-text">This adventurer could not be found.</div>
    </div>
  );

  return (
    <div className="profile-wrap">
      {/* Stars */}
      <div className="profile-stars">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="profile-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 6}s`,
            animationDuration: `${Math.random() * 4 + 4}s`,
          }} />
        ))}
      </div>

      {/* Nav */}
      <nav className="profile-nav">
        <button className="profile-nav-back" onClick={() => navigate("/home")}>
          Back to Tavern
        </button>
        <div className="profile-nav-logo">The Tavern Board</div>
        <SearchBar />
        <NotificationBell />
        
      </nav>

      <div className="profile-content">

        {/* HEADER SECTION */}
        <div className="profile-header-card">
          <div className="profile-avatar-wrap" onClick={handleAvatarClick}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-placeholder">
                {(profile.display_name || profile.favourite_class || "A")?.[0]?.toUpperCase()}
              </div>
            )}
            {isOwner && (
              <div className="profile-avatar-overlay">
                {uploadingAvatar ? "..." : "✎"}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarUpload}
            />
          </div>

          <div className="profile-header-info">
            {editingSection === "header" ? (
              <div className="profile-edit-fields">
                <input
                  className="profile-edit-input"
                  placeholder="Display name"
                  value={editData.display_name || ""}
                  onChange={e => setEditData(d => ({ ...d, display_name: e.target.value }))}
                />
                <textarea
                  className="profile-edit-textarea"
                  placeholder="Write a short bio..."
                  rows={3}
                  value={editData.bio || ""}
                  onChange={e => setEditData(d => ({ ...d, bio: e.target.value }))}
                />
                {saveError && <div className="profile-save-error">{saveError}</div>}
                <div className="profile-edit-actions">
                  <button className="profile-save-btn" onClick={saveEdit} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button className="profile-cancel-btn" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="profile-display-name">
                  {profile.display_name || profile.favourite_class || "Anonymous Adventurer"}
                  {isOwner && (
                    <button className="profile-edit-icon" onClick={() => startEdit("header")}>✎</button>
                  )}
                </div>
                {playstyle && (
                  <div className="profile-playstyle-badge" style={{ borderColor: playstyle.color, color: playstyle.color }}>
                    {playstyle.icon} {playstyle.label}
                  </div>
                )}
{!isOwner && (
  <button
    className="profile-message-btn"
    onClick={() => startDirectMessage(profileId)}
  >
    Send Message
  </button>
)}
{!isOwner && (
  <button
    className="profile-save-btn"
    onClick={handleFriendAction}
    style={friendship?.status === "accepted" ? { background: "rgba(126,201,138,0.15)", border: "1px solid rgba(126,201,138,0.3)", color: "#7ec98a" } : {}}
  >
    {friendBtnLabel()}
  </button>
)}
                <p className="profile-bio">
                  {profile.bio || (isOwner ? "Click the edit button to add a bio..." : "This adventurer is a mystery.")}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="profile-grid">

          {/* CHARACTER SHOWCASE */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title">Character Showcase</div>
              {isOwner && editingSection !== "character" && (
                <button className="profile-edit-icon" onClick={() => startEdit("character")}>✎</button>
              )}
            </div>
            {editingSection === "character" ? (
              <div className="profile-edit-fields">
                <div className="profile-edit-field">
                  <label className="profile-edit-label">Favourite Class</label>
                  <input
                    className="profile-edit-input"
                    placeholder="e.g. Wild Magic Sorcerer"
                    value={editData.favourite_class || ""}
                    onChange={e => setEditData(d => ({ ...d, favourite_class: e.target.value }))}
                  />
                </div>
                <div className="profile-edit-field">
                  <label className="profile-edit-label">Current / Dream Campaign</label>
                  <input
                    className="profile-edit-input"
                    placeholder="e.g. Curse of Strahd"
                    value={editData.campaign || ""}
                    onChange={e => setEditData(d => ({ ...d, campaign: e.target.value }))}
                  />
                </div>
                <div className="profile-edit-field">
                  <label className="profile-edit-label">Preferred System</label>
                  <input
                    className="profile-edit-input"
                    placeholder="e.g. D&D 5e, Pathfinder 2e"
                    value={editData.system_preference || ""}
                    onChange={e => setEditData(d => ({ ...d, system_preference: e.target.value }))}
                  />
                </div>
                <div className="profile-edit-field">
                  <label className="profile-edit-label">Years at the Table</label>
                  <input
                    className="profile-edit-input"
                    placeholder="e.g. 3 years"
                    value={editData.years_playing || ""}
                    onChange={e => setEditData(d => ({ ...d, years_playing: e.target.value }))}
                  />
                </div>
                <div className="profile-edit-field">
                  <label className="profile-edit-label">Experience Level</label>
                  <select
                    className="profile-edit-input"
                    value={editData.experience_level || ""}
                    onChange={e => setEditData(d => ({ ...d, experience_level: e.target.value }))}
                  >
                    <option value="">Select level</option>
                    <option value="new">New to TTRPG</option>
                    <option value="some">Some Experience</option>
                    <option value="experienced">Experienced</option>
                    <option value="veteran">Veteran</option>
                  </select>
                </div>
                {saveError && <div className="profile-save-error">{saveError}</div>}
                <div className="profile-edit-actions">
                  <button className="profile-save-btn" onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                  <button className="profile-cancel-btn" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="profile-details">
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Class</span>
                  <span className="profile-detail-value">{profile.favourite_class || "—"}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Campaign</span>
                  <span className="profile-detail-value">{profile.campaign || "—"}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-label">System</span>
                  <span className="profile-detail-value">{profile.system_preference || "—"}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Years Playing</span>
                  <span className="profile-detail-value">{profile.years_playing || "—"}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Experience</span>
                  <span className="profile-detail-value">
                    {EXPERIENCE_LABELS[profile.experience_level] || "—"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* AVAILABILITY */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title">Availability</div>
              {isOwner && editingSection !== "availability" && (
                <button className="profile-edit-icon" onClick={() => startEdit("availability")}>✎</button>
              )}
            </div>
            {editingSection === "availability" ? (
              <div className="profile-edit-fields">
                <div className="profile-edit-field">
                  <label className="profile-edit-label">Schedule</label>
                  <input
                    className="profile-edit-input"
                    placeholder="e.g. Weekends, Tuesday evenings"
                    value={editData.availability || ""}
                    onChange={e => setEditData(d => ({ ...d, availability: e.target.value }))}
                  />
                </div>
                <div className="profile-edit-field">
                  <label className="profile-edit-label">Timezone</label>
                  <select
                    className="profile-edit-input"
                    value={editData.timezone || ""}
                    onChange={e => setEditData(d => ({ ...d, timezone: e.target.value }))}
                  >
                    <option value="">Select timezone</option>
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
                <div className="profile-edit-field">
                  <label className="profile-edit-label">Preferred Session Length</label>
                  <select
                    className="profile-edit-input"
                    value={editData.session_length || ""}
                    onChange={e => setEditData(d => ({ ...d, session_length: e.target.value }))}
                  >
                    <option value="">Select length</option>
                    {SESSION_LENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {saveError && <div className="profile-save-error">{saveError}</div>}
                <div className="profile-edit-actions">
                  <button className="profile-save-btn" onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                  <button className="profile-cancel-btn" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="profile-details">
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Schedule</span>
                  <span className="profile-detail-value">{profile.availability || "—"}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Timezone</span>
                  <span className="profile-detail-value">{profile.timezone || "—"}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Session Length</span>
                  <span className="profile-detail-value">{profile.session_length || "—"}</span>
                </div>
              </div>
            )}
          </div>

          {/* STATS */}
          <div className="profile-card">
            <div className="profile-card-title">Adventure Log</div>
            <div className="profile-stats-grid">
              <div className="profile-stat">
                <div className="profile-stat-number">{posts.length}</div>
                <div className="profile-stat-label">Total Posts</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-number">{postTypeCount("campaign")}</div>
                <div className="profile-stat-label">Campaigns</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-number">{postTypeCount("lfg")}</div>
                <div className="profile-stat-label">LFG Posts</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-number">{postTypeCount("recap")}</div>
                <div className="profile-stat-label">Recaps</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-number">{nudgeCount}</div>
                <div className="profile-stat-label">Nudges</div>
              </div>
            </div>
          </div>

          {/* SOCIAL LINKS */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title">Social Links</div>
              {isOwner && editingSection !== "social" && (
                <button className="profile-edit-icon" onClick={() => startEdit("social")}>✎</button>
              )}
            </div>
            {editingSection === "social" ? (
              <div className="profile-edit-fields">
                <div className="profile-edit-field">
                  <label className="profile-edit-label">Discord Handle</label>
                  <input
                    className="profile-edit-input"
                    placeholder="e.g. adventurer#1234"
                    value={editData.discord_handle || ""}
                    onChange={e => setEditData(d => ({ ...d, discord_handle: e.target.value }))}
                  />
                </div>
                {saveError && <div className="profile-save-error">{saveError}</div>}
                <div className="profile-edit-actions">
                  <button className="profile-save-btn" onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                  <button className="profile-cancel-btn" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="profile-details">
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Discord</span>
                  <span className="profile-detail-value profile-discord">
                    {profile.discord_handle || "—"}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* REPUTATION */}
<div className="profile-card" style={{ gridColumn: "1 / -1" }}>
  <div className="profile-card-header">
    <div className="profile-card-title">Reputation</div>
    {canRate && !isOwner && (
      <button className="profile-save-btn" onClick={() => setShowRatingModal(true)}>
        Rate this Adventurer
      </button>
    )}
  </div>
  <RatingDisplay ratings={ratings} />
</div>

<div className="profile-card" style={{ gridColumn:"1 / -1" }}>
  <div className="profile-card-header">
    <div className="profile-card-title">Achievements</div>
    <div className="profile-card-subtitle">{achievements.length} / {ACHIEVEMENTS.length} unlocked</div>
  </div>
  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(110px, 1fr))", gap:"10px", marginTop:"8px" }}>
    {ACHIEVEMENTS.map(achievement => {
      const unlocked = achievements.find(a => a.achievement_key === achievement.key);
      return (
        <AchievementBadge
          key={achievement.key}
          achievement={achievement}
          unlocked={!!unlocked}
          unlockedAt={unlocked?.unlocked_at}
        />
      );
    })}
  </div>
</div>

        {/* RECENT POSTS */}
        {posts.length > 0 && (
          <div className="profile-posts-section">
            <div className="profile-section-title">Recent Posts</div>
            <div className="profile-posts-list">
              {posts.slice(0, 3).map(post => (
                <div key={post.id} className="profile-post-row">
                  <div className="profile-post-type">{post.type}</div>
                  <div className="profile-post-title">{post.title}</div>
                  <div className="profile-post-date">
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {showRatingModal && ratingCampaign && (
  <RatingModal
    revieweeId={profileId}
    revieweeName={profile.display_name || profile.favourite_class || "this adventurer"}
    campaignId={ratingCampaign.id}
    campaignTitle={ratingCampaign.title}
    reviewerId={user.id}
    onClose={() => setShowRatingModal(false)}
    onSubmitted={() => {
      setShowRatingModal(false);
      setCanRate(false);
      fetchRatings();
    }}
  />
)}

{showRatingModal && ratingCampaign && (
  <RatingModal
    revieweeId={profileId}
    revieweeName={profile.display_name || profile.favourite_class || "this adventurer"}
    campaignId={ratingCampaign.id}
    campaignTitle={ratingCampaign.title}
    reviewerId={user.id}
    onClose={() => setShowRatingModal(false)}
    onSubmitted={() => {
      setShowRatingModal(false);
      setCanRate(false);
      fetchRatings();
    }}
  />
)}
    </div>
  );
}