import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { logAdminAction } from "../utils/adminLog";
import "./AdminPage.css";

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adminRole, setAdminRole] = useState(null);
  const [tab, setTab] = useState("stats");
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({});

  // Users
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [bannedIds, setBannedIds] = useState(new Set());
  const [adminIds, setAdminIds] = useState({});

  // Content
  const [posts, setPosts] = useState([]);
  const [homebrew, setHomebrew] = useState([]);
  const [contentTab, setContentTab] = useState("posts");

  // Reports
  const [reports, setReports] = useState([]);

  // Logs
  const [logs, setLogs] = useState([]);

  // Flags
  const [flags, setFlags] = useState([]);

  useEffect(() => { checkAdmin(); }, []);

  const checkAdmin = async () => {
    const { data } = await supabase.from("admin_roles").select("*").eq("user_id", user.id).maybeSingle();
    if (!data) { navigate("/home"); return; }
    setAdminRole(data);
    fetchAll();
  };

  const fetchAll = async () => {
    await Promise.all([fetchStats(), fetchUsers(), fetchContent(), fetchReports(), fetchLogs(), fetchFlags()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    const [
      { count: totalUsers },
      { count: totalCampaigns },
      { count: totalPosts },
      { count: totalHomebrew },
      { count: totalSessions },
      { count: totalMaps },
      { count: totalJournals },
      { count: newUsers },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count:"exact", head:true }),
      supabase.from("posts").select("*", { count:"exact", head:true }).eq("type", "campaign"),
      supabase.from("posts").select("*", { count:"exact", head:true }),
      supabase.from("homebrew").select("*", { count:"exact", head:true }),
      supabase.from("sessions").select("*", { count:"exact", head:true }),
      supabase.from("maps").select("*", { count:"exact", head:true }),
      supabase.from("journals").select("*", { count:"exact", head:true }),
      supabase.from("profiles").select("*", { count:"exact", head:true }).gte("created_at", new Date(Date.now() - 7*24*60*60*1000).toISOString()),
    ]);
    setStats({ totalUsers, totalCampaigns, totalPosts, totalHomebrew, totalSessions, totalMaps, totalJournals, newUsers });
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    const { data: banned } = await supabase.from("banned_users").select("user_id");
    setBannedIds(new Set((banned || []).map(b => b.user_id)));
    const { data: admins } = await supabase.from("admin_roles").select("user_id, role");
    const map = {};
    (admins || []).forEach(a => map[a.user_id] = a.role);
    setAdminIds(map);
  };

  const fetchContent = async () => {
    const { data: postsData } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50);
    setPosts(postsData || []);
    const { data: homebrewData } = await supabase.from("homebrew").select("*").order("created_at", { ascending: false }).limit(50);
    setHomebrew(homebrewData || []);
  };

  const fetchReports = async () => {
    const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    setReports(data || []);
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from("activity_logs").select("*, profiles(display_name)").order("created_at", { ascending: false }).limit(100);
    setLogs(data || []);
  };

  const fetchFlags = async () => {
    const { data } = await supabase.from("feature_flags").select("*").order("label");
    setFlags(data || []);
  };

  const handleBan = async (userId, displayName) => {
    const reason = prompt(`Reason for banning ${displayName}:`);
    if (!reason) return;
    await supabase.from("banned_users").insert({ user_id: userId, banned_by: user.id, reason });
    await logAdminAction({ adminId: user.id, action: "ban_user", targetType: "user", targetId: userId, details: reason });
    fetchUsers();
  };

  const handleUnban = async (userId) => {
    await supabase.from("banned_users").delete().eq("user_id", userId);
    await logAdminAction({ adminId: user.id, action: "unban_user", targetType: "user", targetId: userId });
    fetchUsers();
  };

  const handleDeleteUser = async (userId, displayName) => {
    if (!window.confirm(`Permanently delete ${displayName}? This cannot be undone.`)) return;
    await supabase.from("profiles").delete().eq("id", userId);
    await logAdminAction({ adminId: user.id, action: "delete_user", targetType: "user", targetId: userId, details: displayName });
    fetchUsers();
  };

  const handlePromote = async (userId, displayName) => {
    await supabase.from("admin_roles").upsert({ user_id: userId, role: "moderator" }, { onConflict: "user_id" });
    await logAdminAction({ adminId: user.id, action: "promote_moderator", targetType: "user", targetId: userId, details: displayName });
    fetchUsers();
  };

  const handleDemote = async (userId) => {
    await supabase.from("admin_roles").delete().eq("user_id", userId);
    await logAdminAction({ adminId: user.id, action: "demote_moderator", targetType: "user", targetId: userId });
    fetchUsers();
  };

  const handleDeletePost = async (postId, postTitle) => {
    if (!window.confirm(`Delete post "${postTitle}"?`)) return;
    await supabase.from("posts").delete().eq("id", postId);
    await logAdminAction({ adminId: user.id, action: "delete_post", targetType: "post", targetId: postId, details: postTitle });
    fetchContent();
  };

  const handleDeleteHomebrew = async (id, title) => {
    if (!window.confirm(`Delete homebrew "${title}"?`)) return;
    await supabase.from("homebrew").delete().eq("id", id);
    await logAdminAction({ adminId: user.id, action: "delete_homebrew", targetType: "homebrew", targetId: id, details: title });
    fetchContent();
  };

  const handleResolveReport = async (reportId, status) => {
    await supabase.from("reports").update({ status }).eq("id", reportId);
    await logAdminAction({ adminId: user.id, action: `report_${status}`, targetType: "report", targetId: reportId });
    fetchReports();
  };

  const handleToggleFlag = async (flag) => {
    if (adminRole?.role !== "super_admin") return;
    const updated = !flag.enabled;
    await supabase.from("feature_flags").update({ enabled: updated, updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", flag.id);
    await logAdminAction({ adminId: user.id, action: `flag_${updated ? "enabled" : "disabled"}`, targetType: "feature_flag", details: flag.key });
    fetchFlags();
  };

  const filteredUsers = users.filter(u =>
    !userSearch || (u.display_name || "").toLowerCase().includes(userSearch.toLowerCase())
  );

  const formatDate = (d) => new Date(d).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
  const formatDateTime = (d) => new Date(d).toLocaleString("en-GB", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });

  if (loading) return <div className="ap-loading">Loading admin panel...</div>;

  return (
    <div className="ap-wrap">
      <nav className="ap-nav">
        <button className="ap-nav-btn" onClick={() => navigate("/home")}>← Back to Tavern</button>
        <div className="ap-nav-logo">🛡️ Admin Panel</div>
        <div className="ap-nav-role">{adminRole?.role === "super_admin" ? "👑 Super Admin" : "🛡️ Moderator"}</div>
      </nav>

      <div className="ap-tabs">
        {[
          { key:"stats", label:"📊 Stats" },
          { key:"users", label:"👥 Users" },
          { key:"content", label:"📋 Content" },
          { key:"reports", label:`🚩 Reports ${reports.filter(r => r.status === "pending").length > 0 ? `(${reports.filter(r => r.status === "pending").length})` : ""}` },
          { key:"logs", label:"📜 Activity Log" },
          { key:"flags", label:"🔧 Feature Flags" },
        ].map(t => (
          <button key={t.key} className={`ap-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <div className="ap-content">

        {/* STATS */}
        {tab === "stats" && (
          <div className="ap-stats">
            <div className="ap-section-title">Platform Overview</div>
            <div className="ap-stats-grid">
              {[
                { label:"Total Users", value:stats.totalUsers, icon:"👥" },
                { label:"New This Week", value:stats.newUsers, icon:"✨" },
                { label:"Campaigns", value:stats.totalCampaigns, icon:"🗺️" },
                { label:"Total Posts", value:stats.totalPosts, icon:"📜" },
                { label:"Homebrew Entries", value:stats.totalHomebrew, icon:"⚗️" },
                { label:"Sessions", value:stats.totalSessions, icon:"⚔️" },
                { label:"Maps Created", value:stats.totalMaps, icon:"🗺️" },
                { label:"Journals", value:stats.totalJournals, icon:"📖" },
              ].map(s => (
                <div key={s.label} className="ap-stat-card">
                  <div className="ap-stat-icon">{s.icon}</div>
                  <div className="ap-stat-value">{s.value ?? "—"}</div>
                  <div className="ap-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div className="ap-users">
            <div className="ap-section-header">
              <div className="ap-section-title">Users ({users.length})</div>
              <input className="ap-search" placeholder="Search by name..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            </div>
            <div className="ap-table">
              <div className="ap-table-head">
                <span>User</span><span>Joined</span><span>Role</span><span>Status</span><span>Actions</span>
              </div>
              {filteredUsers.map(u => (
                <div key={u.id} className={`ap-table-row ${bannedIds.has(u.id) ? "banned" : ""}`}>
                  <div className="ap-user-cell">
                    {u.avatar_url ? <img src={u.avatar_url} className="ap-avatar" alt="" /> : <div className="ap-avatar-placeholder">⚔️</div>}
                    <div>
                      <div className="ap-user-name">{u.display_name || "Unnamed"}</div>
                      <div className="ap-user-level">{u.experience_level || "—"}</div>
                    </div>
                  </div>
                  <span className="ap-cell">{formatDate(u.created_at)}</span>
                  <span className="ap-cell ap-role">{adminIds[u.id] ? (adminIds[u.id] === "super_admin" ? "👑 Super Admin" : "🛡️ Mod") : "User"}</span>
                  <span className={`ap-cell ap-status ${bannedIds.has(u.id) ? "banned" : "active"}`}>{bannedIds.has(u.id) ? "Banned" : "Active"}</span>
                  <div className="ap-actions-cell">
                    {u.id !== user.id && (
                      <>
                        {bannedIds.has(u.id)
                          ? <button className="ap-action-btn restore" onClick={() => handleUnban(u.id)}>Unban</button>
                          : <button className="ap-action-btn ban" onClick={() => handleBan(u.id, u.display_name)}>Ban</button>
                        }
                        {adminRole?.role === "super_admin" && !adminIds[u.id] && (
                          <button className="ap-action-btn promote" onClick={() => handlePromote(u.id, u.display_name)}>Make Mod</button>
                        )}
                        {adminRole?.role === "super_admin" && adminIds[u.id] === "moderator" && (
                          <button className="ap-action-btn demote" onClick={() => handleDemote(u.id)}>Remove Mod</button>
                        )}
                        <button className="ap-action-btn delete" onClick={() => handleDeleteUser(u.id, u.display_name)}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENT */}
        {tab === "content" && (
          <div className="ap-content-tab">
            <div className="ap-section-header">
              <div className="ap-section-title">Content Moderation</div>
              <div className="ap-content-toggle">
                <button className={`ap-toggle-btn ${contentTab === "posts" ? "active" : ""}`} onClick={() => setContentTab("posts")}>Posts ({posts.length})</button>
                <button className={`ap-toggle-btn ${contentTab === "homebrew" ? "active" : ""}`} onClick={() => setContentTab("homebrew")}>Homebrew ({homebrew.length})</button>
              </div>
            </div>
            <div className="ap-table">
              <div className="ap-table-head">
                <span>Title</span><span>Author</span><span>Type</span><span>Date</span><span>Actions</span>
              </div>
              {contentTab === "posts" && posts.map(p => (
                <div key={p.id} className="ap-table-row">
                  <span className="ap-cell ap-cell-title">{p.title}</span>
                  <span className="ap-cell">{p.author_name || "—"}</span>
                  <span className="ap-cell ap-type-badge">{p.type}</span>
                  <span className="ap-cell">{formatDate(p.created_at)}</span>
                  <div className="ap-actions-cell">
                    <button className="ap-action-btn delete" onClick={() => handleDeletePost(p.id, p.title)}>Delete</button>
                  </div>
                </div>
              ))}
              {contentTab === "homebrew" && homebrew.map(h => (
                <div key={h.id} className="ap-table-row">
                  <span className="ap-cell ap-cell-title">{h.title}</span>
                  <span className="ap-cell">—</span>
                  <span className="ap-cell ap-type-badge">{h.type}</span>
                  <span className="ap-cell">{formatDate(h.created_at)}</span>
                  <div className="ap-actions-cell">
                    <button className="ap-action-btn delete" onClick={() => handleDeleteHomebrew(h.id, h.title)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORTS */}
        {tab === "reports" && (
          <div className="ap-reports">
            <div className="ap-section-title">Reports</div>
            {reports.length === 0
              ? <div className="ap-empty">No reports submitted yet.</div>
              : <div className="ap-table">
                  <div className="ap-table-head">
                    <span>Type</span><span>Reason</span><span>Reported</span><span>Status</span><span>Actions</span>
                  </div>
                  {reports.map(r => (
                    <div key={r.id} className={`ap-table-row ${r.status !== "pending" ? "resolved" : ""}`}>
                      <span className="ap-cell ap-type-badge">{r.content_type}</span>
                      <span className="ap-cell">{r.reason}</span>
                      <span className="ap-cell">{formatDateTime(r.created_at)}</span>
                      <span className={`ap-cell ap-status ${r.status}`}>{r.status}</span>
                      <div className="ap-actions-cell">
                        {r.status === "pending" && (
                          <>
                            <button className="ap-action-btn restore" onClick={() => handleResolveReport(r.id, "resolved")}>Resolve</button>
                            <button className="ap-action-btn ban" onClick={() => handleResolveReport(r.id, "dismissed")}>Dismiss</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* LOGS */}
        {tab === "logs" && (
          <div className="ap-logs">
            <div className="ap-section-title">Activity Log</div>
            {logs.length === 0
              ? <div className="ap-empty">No admin actions logged yet.</div>
              : <div className="ap-log-list">
                  {logs.map(log => (
                    <div key={log.id} className="ap-log-row">
                      <div className="ap-log-left">
                        <span className="ap-log-admin">{log.profiles?.display_name || "Admin"}</span>
                        <span className="ap-log-action">{log.action.replace(/_/g, " ")}</span>
                        {log.details && <span className="ap-log-details">— {log.details}</span>}
                      </div>
                      <span className="ap-log-time">{formatDateTime(log.created_at)}</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* FEATURE FLAGS */}
        {tab === "flags" && (
          <div className="ap-flags">
            <div className="ap-section-title">Feature Flags</div>
            {adminRole?.role !== "super_admin" && (
              <div className="ap-flags-notice">Only super admins can toggle feature flags.</div>
            )}
            <div className="ap-flags-list">
              {flags.map(flag => (
                <div key={flag.id} className="ap-flag-row">
                  <div className="ap-flag-info">
                    <div className="ap-flag-label">{flag.label}</div>
                    <div className="ap-flag-key">{flag.key}</div>
                  </div>
                  <div className={`ap-flag-toggle ${flag.enabled ? "on" : "off"} ${adminRole?.role !== "super_admin" ? "disabled" : ""}`} onClick={() => handleToggleFlag(flag)}>
                    <div className="ap-flag-thumb" />
                    <span className="ap-flag-status">{flag.enabled ? "On" : "Off"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}