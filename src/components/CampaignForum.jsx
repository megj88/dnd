import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { renderMarkdown } from "../utils/markdown";
import "./CampaignForum.css";

const CATEGORIES = [
  { value:"all", label:"All", color:"#c9a96e" },
  { value:"general", label:"General", color:"#c9a96e" },
  { value:"planning", label:"Planning", color:"#7eb8c9" },
  { value:"lore", label:"Lore", color:"#a87ec9" },
  { value:"off-topic", label:"Off-Topic", color:"#7ec98a" },
];

export default function CampaignForum({ campaignId, currentUserId, isDM }) {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [replyPreview, setReplyPreview] = useState(false);

  useEffect(() => { fetchThreads(); }, [category]);

  const fetchThreads = async () => {
    setLoading(true);
    let query = supabase.from("forum_threads").select("*").eq("campaign_id", campaignId).order("pinned", { ascending: false }).order("created_at", { ascending: false });
    if (category !== "all") query = query.eq("category", category);
    const { data } = await query;
    setThreads(data || []);

    const userIds = [...new Set((data || []).map(t => t.user_id))];
    if (userIds.length > 0) {
      const { data: profileData } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds);
      const map = {};
      (profileData || []).forEach(p => map[p.id] = p);
      setProfiles(prev => ({ ...prev, ...map }));
    }
    setLoading(false);
  };

  const fetchReplies = async (threadId) => {
    const { data } = await supabase.from("forum_replies").select("*").eq("thread_id", threadId).order("created_at");
    setReplies(data || []);
    const userIds = [...new Set((data || []).map(r => r.user_id))];
    if (userIds.length > 0) {
      const { data: profileData } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds);
      const map = {};
      (profileData || []).forEach(p => map[p.id] = p);
      setProfiles(prev => ({ ...prev, ...map }));
    }
  };

  const handleSelectThread = async (thread) => {
    setSelectedThread(thread);
    await fetchReplies(thread.id);
  };

  const handleCreateThread = async () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    setSubmitting(true);
    const { data } = await supabase.from("forum_threads").insert({
      campaign_id: campaignId, user_id: currentUserId,
      title: newTitle.trim(), body: newBody.trim(), category: newCategory,
    }).select().single();
    setSubmitting(false);
    if (data) {
      setNewTitle(""); setNewBody(""); setShowNewThread(false);
      fetchThreads();
      handleSelectThread(data);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !selectedThread) return;
    setSubmitting(true);
    await supabase.from("forum_replies").insert({
      thread_id: selectedThread.id, user_id: currentUserId, body: replyBody.trim(),
    });
    setReplyBody("");
    setSubmitting(false);
    fetchReplies(selectedThread.id);
  };

  const handlePin = async (threadId, pinned) => {
    await supabase.from("forum_threads").update({ pinned: !pinned }).eq("id", threadId);
    fetchThreads();
    if (selectedThread?.id === threadId) setSelectedThread(prev => ({ ...prev, pinned: !pinned }));
  };

  const handleDeleteThread = async (threadId) => {
    if (!window.confirm("Delete this thread?")) return;
    await supabase.from("forum_threads").delete().eq("id", threadId);
    setSelectedThread(null);
    fetchThreads();
  };

  const handleDeleteReply = async (replyId) => {
    await supabase.from("forum_replies").delete().eq("id", replyId);
    fetchReplies(selectedThread.id);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
  const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  const categoryColor = (cat) => CATEGORIES.find(c => c.value === cat)?.color || "#c9a96e";

  const Avatar = ({ userId }) => {
    const p = profiles[userId];
    return p?.avatar_url
      ? <img src={p.avatar_url} className="cf-avatar" alt="" />
      : <div className="cf-avatar cf-avatar-placeholder">{(p?.display_name || "?")[0].toUpperCase()}</div>;
  };

  return (
    <div className="cf-wrap">
      {!selectedThread ? (
        <>
          {/* Thread list */}
          <div className="cf-header">
            <div className="cf-cats">
              {CATEGORIES.map(c => (
                <button key={c.value} className={`cf-cat-btn ${category === c.value ? "active" : ""}`} style={category === c.value ? { borderColor: c.color, color: c.color } : {}} onClick={() => setCategory(c.value)}>
                  {c.label}
                </button>
              ))}
            </div>
            <button className="cf-new-btn" onClick={() => setShowNewThread(!showNewThread)}>+ New Thread</button>
          </div>

          {showNewThread && (
            <div className="cf-new-thread">
              <div className="cf-field">
                <label className="cf-label">Title</label>
                <input className="cf-input" placeholder="Thread title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              </div>
              <div className="cf-field">
                <label className="cf-label">Category</label>
                <div className="cf-cat-select">
                  {CATEGORIES.filter(c => c.value !== "all").map(c => (
                    <button key={c.value} className={`cf-cat-btn ${newCategory === c.value ? "active" : ""}`} style={newCategory === c.value ? { borderColor: c.color, color: c.color } : {}} onClick={() => setNewCategory(c.value)}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cf-field">
                <div className="cf-label-row">
                  <label className="cf-label">Body</label>
                  <button className="cf-preview-toggle" onClick={() => setPreview(!preview)}>{preview ? "Edit" : "Preview"}</button>
                </div>
                {preview
                  ? <div className="cf-markdown-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(newBody) }} />
                  : <textarea className="cf-textarea" rows={5} placeholder="Supports **bold**, *italic*, `code`, # headings, > quotes..." value={newBody} onChange={e => setNewBody(e.target.value)} />
                }
              </div>
              <div className="cf-new-actions">
                <button className="cf-submit-btn" onClick={handleCreateThread} disabled={submitting || !newTitle.trim() || !newBody.trim()}>{submitting ? "Posting..." : "Post Thread"}</button>
                <button className="cf-cancel-btn" onClick={() => setShowNewThread(false)}>Cancel</button>
              </div>
            </div>
          )}

          {loading ? <div className="cf-loading">Consulting the forum...</div> :
            threads.length === 0 ? <div className="cf-empty">No threads yet. Start the conversation!</div> :
            <div className="cf-thread-list">
              {threads.map(thread => (
                <div key={thread.id} className={`cf-thread-row ${thread.pinned ? "pinned" : ""}`} onClick={() => handleSelectThread(thread)}>
                  <div className="cf-thread-left">
                    <Avatar userId={thread.user_id} />
                    <div className="cf-thread-info">
                      <div className="cf-thread-title">
                        {thread.pinned && <span className="cf-pin-icon">📌</span>}
                        {thread.title}
                      </div>
                      <div className="cf-thread-meta">
                        <span style={{ color: categoryColor(thread.category) }} className="cf-thread-cat">{thread.category}</span>
                        <span>by {profiles[thread.user_id]?.display_name || "Adventurer"}</span>
                        <span>{formatDate(thread.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  {isDM && (
                    <div className="cf-thread-actions" onClick={e => e.stopPropagation()}>
                      <button className="cf-icon-btn" onClick={() => handlePin(thread.id, thread.pinned)} title={thread.pinned ? "Unpin" : "Pin"}>
                        {thread.pinned ? "📌" : "📍"}
                      </button>
                      <button className="cf-icon-btn delete" onClick={() => handleDeleteThread(thread.id)}>✕</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          }
        </>
      ) : (
        <>
          {/* Thread detail */}
          <div className="cf-thread-detail-header">
            <button className="cf-back-btn" onClick={() => setSelectedThread(null)}>← Back to Forum</button>
            {isDM && (
              <div className="cf-detail-actions">
                <button className="cf-icon-btn" onClick={() => handlePin(selectedThread.id, selectedThread.pinned)}>
                  {selectedThread.pinned ? "📌 Pinned" : "📍 Pin"}
                </button>
                <button className="cf-icon-btn delete" onClick={() => handleDeleteThread(selectedThread.id)}>Delete Thread</button>
              </div>
            )}
          </div>

          <div className="cf-thread-detail">
            <div className="cf-thread-detail-title">
              {selectedThread.pinned && <span className="cf-pin-icon">📌</span>}
              {selectedThread.title}
            </div>
            <div className="cf-thread-detail-meta">
              <span style={{ color: categoryColor(selectedThread.category) }}>{selectedThread.category}</span>
              <span>by {profiles[selectedThread.user_id]?.display_name || "Adventurer"}</span>
              <span>{formatDate(selectedThread.created_at)} at {formatTime(selectedThread.created_at)}</span>
            </div>
            <div className="cf-thread-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedThread.body) }} />
          </div>

          <div className="cf-replies">
            <div className="cf-replies-label">{replies.length} {replies.length === 1 ? "Reply" : "Replies"}</div>
            {replies.map(reply => (
              <div key={reply.id} className="cf-reply">
                <Avatar userId={reply.user_id} />
                <div className="cf-reply-content">
                  <div className="cf-reply-header">
                    <span className="cf-reply-author">{profiles[reply.user_id]?.display_name || "Adventurer"}</span>
                    <span className="cf-reply-time">{formatDate(reply.created_at)} at {formatTime(reply.created_at)}</span>
                    {(isDM || reply.user_id === currentUserId) && (
                      <button className="cf-icon-btn delete small" onClick={() => handleDeleteReply(reply.id)}>✕</button>
                    )}
                  </div>
                  <div className="cf-reply-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(reply.body) }} />
                </div>
              </div>
            ))}

            <div className="cf-reply-form">
              <div className="cf-label-row">
                <label className="cf-label">Your Reply</label>
                <button className="cf-preview-toggle" onClick={() => setReplyPreview(!replyPreview)}>{replyPreview ? "Edit" : "Preview"}</button>
              </div>
              {replyPreview
                ? <div className="cf-markdown-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(replyBody) }} />
                : <textarea className="cf-textarea" rows={4} placeholder="Write your reply... supports **bold**, *italic*, `code`" value={replyBody} onChange={e => setReplyBody(e.target.value)} />
              }
              <button className="cf-submit-btn" onClick={handleReply} disabled={submitting || !replyBody.trim()}>
                {submitting ? "Posting..." : "Post Reply"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}