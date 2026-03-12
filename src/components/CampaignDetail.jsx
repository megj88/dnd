import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { createNotification } from "../utils/notify";
import { useNavigate } from "react-router-dom";
import { useAchievements } from "../context/AchievementContext";
import SessionCard from "./SessionCard";
import SessionModal from "./SessionModal";
import "./CampaignDetail.css";

export default function CampaignDetail({ campaign, currentUserId, isDM, onClose }) {
  const [message, setMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [application, setApplication] = useState(null);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [campaignSessions, setCampaignSessions] = useState([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [campaignJournal, setCampaignJournal] = useState(null);
  const isOwner = campaign.user_id === currentUserId;
  const dm = campaign.profiles;

  useEffect(() => {
  if (isOwner) fetchApplications();
  else fetchMyApplication();
  fetchCampaignSessions();
  fetchCampaignJournal();
}, []);

const { triggerCheck } = useAchievements();
const navigate = useNavigate();

const fetchCampaignJournal = async () => {
  const { data } = await supabase
    .from("journals")
    .select("id")
    .eq("campaign_id", campaign.id)
    .maybeSingle();
  setCampaignJournal(data);
};

  const fetchCampaignSessions = async () => {
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("scheduled_at", { ascending: true });

  if (!data || data.length === 0) { setCampaignSessions([]); return; }

  const enriched = await Promise.all(data.map(async (session) => {
    const { data: attendees } = await supabase
      .from("session_attendees")
      .select("user_id, rsvp")
      .eq("session_id", session.id);

    const userIds = (attendees || []).map(a => a.user_id);
    let profileMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, favourite_class")
        .in("id", userIds);
      (profiles || []).forEach(p => profileMap[p.id] = p);
    }

    return {
      ...session,
      attendees: (attendees || []).map(a => ({ ...a, profiles: profileMap[a.user_id] || null })),
    };
  }));

  setCampaignSessions(enriched);
};
  
  const fetchMyApplication = async () => {
    const { data } = await supabase
      .from("applications")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("applicant_id", currentUserId)
      .maybeSingle();
    setApplication(data);
  };

 const fetchApplications = async () => {
  const { data: apps } = await supabase
    .from("applications")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("created_at", { ascending: false });

  if (!apps || apps.length === 0) {
    setApplications([]);
    return;
  }

  const userIds = [...new Set(apps.map(a => a.applicant_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, favourite_class, avatar_url")
    .in("id", userIds);

  const profileMap = {};
  (profiles || []).forEach(p => profileMap[p.id] = p);

  const enriched = apps.map(a => ({
    ...a,
    profiles: profileMap[a.applicant_id] || null,
  }));

  setApplications(enriched);
};

  const handleApply = async () => {
    setError("");
    setApplying(true);
    const { error } = await supabase.from("applications").insert({
      campaign_id: campaign.id,
      applicant_id: currentUserId,
      dm_id: campaign.user_id,
      message: message || null,
    });
    await createNotification({
      userId: campaign.user_id,
      type: "application_received",
      message: `Someone applied to join "${campaign.title}"`,
      link: `/campaigns`,
    });
    setApplying(false);
    if (error) return setError(error.message);
    setSuccess(true);
    fetchMyApplication();
  };

  const handleUpdateStatus = async (appId, status, applicantId) => {
    await supabase
      .from("applications")
      .update({ status })
      .eq("id", appId);

    if (status === "approved") {
      await triggerCheck(applicantId, "campaign");
      await createNotification({
        userId: applicantId,
        type: "application_approved",
        message: `Your application to "${campaign.title}" was approved!`,
        link: `/campaigns`,
      });
    } else if (status === "rejected") {
      await createNotification({
        userId: applicantId,
        type: "application_rejected",
        message: `Your application to "${campaign.title}" was not accepted.`,
        link: `/campaigns`,
      });
    }

    fetchApplications();
  };

  const statusConfig = {
    pending: { label: "Pending Review", color: "#c9a96e" },
    approved: { label: "Approved! Welcome to the party.", color: "#7ec98a" },
    rejected: { label: "Not selected this time.", color: "#c97070" },
  };

  return (
    <div className="cd-overlay" onClick={onClose}>
      <div className="cd-panel" onClick={e => e.stopPropagation()}>
        <div className="cd-header">
  <div className="cd-tag">🗺️ Campaign</div>
  
  {campaignJournal && (
    <button className="cd-journal-btn" onClick={() => navigate(`/journal/${campaignJournal.id}`)}>
      📖 Journal
    </button>
  )}
  
  <button className="cd-journal-btn" onClick={() => navigate(`/campaign/${campaign.id}/dashboard`)}>
    🏰 Dashboard
  </button>
  
  <button className="cd-close" onClick={onClose}>✕</button>
</div>

        <h2 className="cd-title">{campaign.title}</h2>

        <div className="cd-dm-row">
          <div className="cd-dm-avatar">
            {dm?.avatar_url
              ? <img src={dm.avatar_url} alt="DM" />
              : <span>{(dm?.display_name || dm?.favourite_class || "?")[0].toUpperCase()}</span>
            }
          </div>
          <div className="cd-dm-info">
            <div className="cd-dm-label">Dungeon Master</div>
            <div className="cd-dm-name">{dm?.display_name || dm?.favourite_class || "Anonymous DM"}</div>
          </div>
        </div>

        <p className="cd-body">{campaign.body}</p>

        <div className="cd-details-grid">
          {campaign.system && (
            <div className="cd-detail">
              <span className="cd-detail-label">System</span>
              <span className="cd-detail-value">{campaign.system}</span>
            </div>
          )}
          {campaign.players_needed && (
            <div className="cd-detail">
              <span className="cd-detail-label">Players Needed</span>
              <span className="cd-detail-value">{campaign.players_needed}</span>
            </div>
          )}
          {campaign.schedule && (
            <div className="cd-detail">
              <span className="cd-detail-label">Schedule</span>
              <span className="cd-detail-value">{campaign.schedule}</span>
            </div>
          )}
        </div>

       <div className="cd-divider" />

{/* Tabs */}
<div className="cd-tabs">
  <button
    className={`cd-tab ${activeTab === "details" ? "active" : ""}`}
    onClick={() => setActiveTab("details")}
  >
    {isOwner ? "Applications" : "Join"}
  </button>
  <button
    className={`cd-tab ${activeTab === "sessions" ? "active" : ""}`}
    onClick={() => setActiveTab("sessions")}
  >
    Sessions ({campaignSessions.length})
  </button>
</div>

{activeTab === "details" && (
  <>
    {/* Owner view — applications */}
    {isOwner && (
      <div className="cd-applications">
        <div className="cd-section-title">Applications ({applications.length})</div>
        {applications.length === 0 ? (
          <p className="cd-no-apps">No applications yet.</p>
        ) : (
          <div className="cd-apps-list">
            {applications.map(app => (
              <div key={app.id} className="cd-app-row">
                <div className="cd-app-avatar">
                  {app.profiles?.avatar_url
                    ? <img src={app.profiles.avatar_url} alt="" />
                    : <span>{(app.profiles?.display_name || app.profiles?.favourite_class || "?")[0].toUpperCase()}</span>
                  }
                </div>
                <div className="cd-app-info">
                  <div className="cd-app-name">
                    {app.profiles?.display_name || app.profiles?.favourite_class || "Anonymous"}
                  </div>
                  {app.message && <div className="cd-app-message">"{app.message}"</div>}
                  <div className="cd-app-status" style={{ color: statusConfig[app.status]?.color }}>
                    {statusConfig[app.status]?.label}
                  </div>
                </div>
                {app.status === "pending" && (
                  <div className="cd-app-actions">
                    <button className="cd-approve-btn" onClick={() => handleUpdateStatus(app.id, "approved", app.applicant_id)}>
                      Approve
                    </button>
                    <button className="cd-reject-btn" onClick={() => handleUpdateStatus(app.id, "rejected", app.applicant_id)}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Player view — apply */}
    {!isOwner && !isDM && (
      <div className="cd-apply-section">
        <div className="cd-section-title">Join this Campaign</div>
        {application ? (
          <div className="cd-existing-app">
            <div className="cd-app-status-label">Your application status:</div>
            <div className="cd-app-status-value" style={{ color: statusConfig[application.status]?.color }}>
              {statusConfig[application.status]?.label}
            </div>
          </div>
        ) : success ? (
          <div className="cd-success">
            Your application has been sent to the Dungeon Master. May the dice be in your favour.
          </div>
        ) : (
          <>
            <textarea
              className="cd-message-input"
              placeholder="Introduce yourself to the DM... your experience, character ideas, availability (optional)"
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            {error && <div className="cd-error">{error}</div>}
            <button className="cd-apply-btn" onClick={handleApply} disabled={applying}>
              {applying ? "Sending application..." : "Apply to Join ⚔️"}
            </button>
          </>
        )}
      </div>
    )}

    {!isOwner && isDM && (
      <div className="cd-dm-note">
        You are viewing this as a Dungeon Master. Switch your playstyle to apply as a player.
      </div>
    )}
  </>
)}

{activeTab === "sessions" && (
  <div className="cd-sessions">
    {isOwner && (
      <button className="cd-create-session-btn" onClick={() => setShowSessionModal(true)}>
        + Schedule a Session
      </button>
    )}
    {campaignSessions.length === 0 ? (
      <p className="cd-no-apps">No sessions scheduled yet.</p>
    ) : (
      <div className="cd-sessions-list">
        {campaignSessions.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            currentUserId={currentUserId}
            onUpdated={fetchCampaignSessions}
          />
        ))}
      </div>
    )}
  </div>
)}

{showSessionModal && (
  <SessionModal
    userId={currentUserId}
    campaignId={campaign.id}
    campaignTitle={campaign.title}
    onClose={() => setShowSessionModal(false)}
    onCreated={() => { setShowSessionModal(false); fetchCampaignSessions(); }}
  />
)}

</div>
    </div>
  );
}