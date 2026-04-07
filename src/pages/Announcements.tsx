import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useAnnouncements,
  useAnnouncementReplies,
  useCreateReply,
  useAnnouncementReads,
  useMyAck,
  CATEGORY_OPTIONS,
  AUDIENCE_OPTIONS,
  CATEGORY_COLORS,
  type Announcement,
  type AnnouncementCategory,
  type AnnouncementAudience,
} from "@/hooks/useAnnouncements";
import { formatDistanceToNow } from "date-fns";
import { Plus, Pin, ThumbsUp, MessageSquare, X, ChevronDown, ChevronUp, Mail, Bold, Italic, List, ListOrdered, Link2, Type } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import HeaderLogo from "@/components/HeaderLogo";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

/* helpers */

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const videoPatterns = [
  { regex: /https?:\/\/(?:www\.)?loom\.com\/share\/([a-zA-Z0-9]+)/, embed: (id: string) => `https://www.loom.com/embed/${id}` },
  { regex: /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/, embed: (id: string) => `https://www.youtube.com/embed/${id}` },
  { regex: /https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/, embed: (id: string) => `https://www.youtube.com/embed/${id}` },
  { regex: /https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/, embed: (id: string) => `https://player.vimeo.com/video/${id}` },
];

function extractVideoEmbeds(html: string): { embedUrl: string; originalUrl: string }[] {
  const embeds: { embedUrl: string; originalUrl: string }[] = [];
  const seen = new Set<string>();
  const urlRegex = /https?:\/\/[^\s<"']+/g;
  const urls = html.match(urlRegex) || [];
  urls.forEach(url => {
    for (const pattern of videoPatterns) {
      const match = url.match(pattern.regex);
      if (match) {
        const embedUrl = pattern.embed(match[1]);
        if (!seen.has(embedUrl)) {
          seen.add(embedUrl);
          embeds.push({ embedUrl, originalUrl: url });
        }
        break;
      }
    }
  });
  return embeds;
}

function hasVideoUrl(html: string): boolean {
  const urlRegex = /https?:\/\/[^\s<"']+/g;
  const urls = html.match(urlRegex) || [];
  return urls.some(url => videoPatterns.some(p => p.regex.test(url)));
}

const AnnouncementBody = ({ html, expanded }: { html: string; expanded: boolean }) => {
  const embeds = expanded ? extractVideoEmbeds(html) : [];

  // Strip video URLs from the displayed HTML when we're showing embeds
  let displayHtml = html;
  if (embeds.length > 0) {
    embeds.forEach(embed => {
      // Remove <a> tags containing the video URL
      const escapedUrl = embed.originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      displayHtml = displayHtml.replace(new RegExp(`<a[^>]*href=["']${escapedUrl}[^"']*["'][^>]*>.*?</a>`, "gi"), "");
      // Remove plain text URL
      displayHtml = displayHtml.replace(new RegExp(escapedUrl + "[^<\\s]*", "g"), "");
    });
    // Clean up empty paragraphs left behind
    displayHtml = displayHtml.replace(/<p>\s*<\/p>/g, "");
  }

  return (
    <>
      {expanded ? (
        displayHtml.replace(/<[^>]*>/g, "").trim() ? (
          <div
            style={{ fontSize: 13.5, color: "#4a4a4a", lineHeight: 1.55 }}
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        ) : null
      ) : (
        <div style={{ fontSize: 13.5, color: "#4a4a4a", lineHeight: 1.55, overflow: "hidden", maxHeight: "2.9em", position: "relative" }}>
          <div dangerouslySetInnerHTML={{ __html: displayHtml }} />
          <span style={{
            position: "absolute", right: 0, bottom: 0, paddingLeft: 24,
            background: "linear-gradient(to right, transparent, #E7EBEF 40%)",
            fontSize: 12, color: "#52657A", fontWeight: 600,
          }}>more</span>
        </div>
      )}
      {embeds.map((embed, i) => (
        <div key={i} style={{ margin: "10px 0", borderRadius: 8, overflow: "hidden" }}>
          <iframe
            src={embed.embedUrl}
            style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: 8 }}
            allowFullScreen
            allow="autoplay; encrypted-media"
          />
        </div>
      ))}
    </>
  );
};

const CategoryPill = ({ category }: { category: AnnouncementCategory }) => {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.general;
  const label = CATEGORY_OPTIONS.find((c) => c.key === category)?.label || category;
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 12,
      fontSize: 12, fontWeight: 600, backgroundColor: colors.bg, color: colors.text,
    }}>
      {label}
    </span>
  );
};

/* Reply Thread */

const ReplyThread = ({ announcementId }: { announcementId: string }) => {
  const { data: replies = [] } = useAnnouncementReplies(announcementId);
  const createReply = useCreateReply();
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);

  const handleSubmit = () => {
    if (!replyText.trim()) return;
    createReply.mutate(
      { announcement_id: announcementId, body: replyText.trim() },
      { onSuccess: () => { setReplyText(""); setShowReplies(true); } }
    );
  };

  return (
    <div style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
      {replies.length > 0 && (
        <button
          onClick={() => setShowReplies(!showReplies)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: "#52657A", padding: "4px 0", fontFamily: "inherit",
          }}
        >
          <MessageSquare style={{ width: 14, height: 14 }} />
          {showReplies ? "Hide" : "View"} {replies.length} {replies.length === 1 ? "reply" : "replies"}
          {showReplies
            ? <ChevronUp style={{ width: 10, height: 10 }} />
            : <ChevronDown style={{ width: 10, height: 10 }} />
          }
        </button>
      )}

      {showReplies && replies.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {replies.map((reply) => (
            <div key={reply.id} style={{
              backgroundColor: "#F5F3EE", borderRadius: 8, padding: "10px 12px", borderLeft: "3px solid #C9CED4",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#415162" }}>{reply.author_name}</span>
                <span style={{ fontSize: 11, color: "#6B7280" }}>{formatDate(reply.created_at)}</span>
              </div>
              <div style={{ fontSize: 13, color: "#4a4a4a", lineHeight: 1.5 }}>{reply.body}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: replies.length > 0 ? 10 : 0, alignItems: "flex-end" }}>
        <input
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder="Write a reply..."
          style={{
            flex: 1, padding: "8px 12px", border: "1px solid #C9CED4", borderRadius: 8,
            backgroundColor: "#F5F3EE", fontSize: 13, color: "#1a1a1a", outline: "none", fontFamily: "inherit",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!replyText.trim() || createReply.isPending}
          style={{
            padding: "8px 14px", borderRadius: 8, border: "none",
            backgroundColor: replyText.trim() ? "#415162" : "#C9CED4",
            color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: replyText.trim() ? "pointer" : "default", fontFamily: "inherit", whiteSpace: "nowrap",
          }}
        >
          Reply
        </button>
      </div>
    </div>
  );
};

/* Ack Button */

const AckButton = ({ announcement }: { announcement: Announcement }) => {
  const { data: isAcked } = useMyAck(announcement.id);
  const { acknowledge, unacknowledge } = useAnnouncements();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAcked) {
      unacknowledge.mutate(announcement.id);
    } else {
      acknowledge.mutate(announcement.id);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 16,
        border: isAcked ? "1px solid #4A846C" : "1px solid #C9CED4",
        backgroundColor: isAcked ? "#E4F0EB" : "transparent",
        color: isAcked ? "#4A846C" : "#6B7280",
        fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        transition: "all 0.15s",
      }}
    >
      <ThumbsUp style={{ width: 14, height: 14, fill: isAcked ? "#4A846C" : "none" }} />
      {announcement.ack_count || 0}
    </button>
  );
};

/* Read Tracker Modal */

const ReadTracker = ({ announcement, onClose }: { announcement: Announcement; onClose: () => void }) => {
  const { data: reads = [], isLoading } = useAnnouncementReads(announcement.id);
  const [tab, setTab] = useState<"ack" | "seen">("ack");

  const ackCount = reads.filter((r) => r.acknowledged_at).length;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 600, border: "none",
    borderBottom: active ? "2px solid #415162" : "2px solid transparent",
    backgroundColor: "transparent", color: active ? "#415162" : "#6B7280",
    cursor: "pointer", fontFamily: "inherit",
  });

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        backgroundColor: "#F5F3EE", borderRadius: 14, width: "100%", maxWidth: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
      }}>
        <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Tracking</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <X style={{ width: 18, height: 18, color: "#3D3D3A" }} />
          </button>
        </div>
        <div style={{ display: "flex", padding: "10px 20px 0", borderBottom: "1px solid #C9CED4" }}>
          <button style={tabStyle(tab === "ack")} onClick={() => setTab("ack")}>Acknowledged ({ackCount})</button>
          <button style={tabStyle(tab === "seen")} onClick={() => setTab("seen")}>Seen ({reads.length})</button>
        </div>
        <div style={{ padding: "8px 20px 20px", maxHeight: 300, overflowY: "auto" }}>
          {isLoading ? (
            <div style={{ padding: 20, textAlign: "center", color: "#6B7280", fontSize: 13 }}>Loading...</div>
          ) : reads.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#6B7280", fontSize: 13 }}>No data yet</div>
          ) : tab === "ack" ? (
            [...reads]
              .sort((a, b) => (a.acknowledged_at ? 1 : 0) - (b.acknowledged_at ? 1 : 0))
              .map((r, i) => (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 0", borderBottom: i < reads.length - 1 ? "1px solid #E7EBEF" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <ThumbsUp style={{
                      width: 14, height: 14,
                      color: r.acknowledged_at ? "#4A846C" : "#C9CED4",
                      fill: r.acknowledged_at ? "#4A846C" : "none",
                    }} />
                    <span style={{ fontSize: 14, color: r.acknowledged_at ? "#1a1a1a" : "#A04040", fontWeight: r.acknowledged_at ? 500 : 600 }}>
                      {r.user_name}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>
                    {r.acknowledged_at ? formatDate(r.acknowledged_at) : "Pending"}
                  </span>
                </div>
              ))
          ) : (
            reads.map((r, i) => (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 0", borderBottom: i < reads.length - 1 ? "1px solid #E7EBEF" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#4A846C" }} />
                  <span style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 500 }}>{r.user_name}</span>
                </div>
                <span style={{ fontSize: 12, color: "#6B7280" }}>{formatDate(r.read_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* Compose Dialog */

const ComposeDialog = ({ onClose, onSubmit, isPending }: {
  onClose: () => void;
  onSubmit: (data: { title: string; body: string; category: AnnouncementCategory; audience: AnnouncementAudience; is_pinned: boolean; is_action_required: boolean }) => void;
  isPending: boolean;
}) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("general");
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [pinned, setPinned] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { style: "color: #378ADD; text-decoration: underline;" } }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "outline-none min-h-[120px] text-sm px-3 py-2",
        style: "color: #1a1a1a;",
      },
    },
  });

  const bodyHtml = editor?.getHTML() || "";
  const bodyEmpty = !bodyHtml || bodyHtml === "<p></p>" || bodyHtml.trim() === "";

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", border: "1px solid #C9CED4", borderRadius: 8,
    backgroundColor: "#E7EBEF", fontSize: 14, color: "#1a1a1a", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "#52657A", marginBottom: 4,
    display: "block", textTransform: "uppercase" as const, letterSpacing: "0.4px",
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        backgroundColor: "#F5F3EE", borderRadius: 14, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #C9CED4" }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a" }}>New Announcement</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <X style={{ width: 20, height: 20, color: "#3D3D3A" }} />
          </button>
        </div>
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} placeholder="Announcement title..." value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Audience</label>
            <select style={selectStyle} value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}>
              {AUDIENCE_OPTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={labelStyle}>Message</label>
              <button
                type="button"
                onClick={() => setShowToolbar(!showToolbar)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer", padding: 2,
                  color: showToolbar ? "#415162" : "#8A9AAB",
                }}
              >
                <Type style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ ...inputStyle, padding: 0, overflow: "hidden" }}>
              {showToolbar && editor && (
                <div style={{
                  display: "flex", gap: 2, padding: "4px 6px",
                  borderBottom: "1px solid #C9CED4", background: "#F5F3EE",
                }}>
                  {([
                    { icon: <Bold style={{ width: 14, height: 14 }} />, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
                    { icon: <Italic style={{ width: 14, height: 14 }} />, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
                    { icon: <List style={{ width: 14, height: 14 }} />, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
                    { icon: <ListOrdered style={{ width: 14, height: 14 }} />, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
                    { icon: <Link2 style={{ width: 14, height: 14 }} />, action: () => {
                      if (editor.isActive("link")) {
                        editor.chain().focus().unsetLink().run();
                      } else {
                        const url = prompt("URL:");
                        if (url) editor.chain().focus().setLink({ href: url }).run();
                      }
                    }, active: editor.isActive("link") },
                  ]).map((btn, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={btn.action}
                      style={{
                        width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: 4, border: "none", cursor: "pointer",
                        background: btn.active ? "#415162" : "transparent",
                        color: btn.active ? "#fff" : "#5F7285",
                      }}
                    >
                      {btn.icon}
                    </button>
                  ))}
                </div>
              )}
              {editor && <EditorContent editor={editor} />}
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4a4a4a", cursor: "pointer" }}>
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} style={{ accentColor: "#415162" }} />
              Pin to top
            </label>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid #C9CED4" }}>
          <button onClick={onClose} style={{
            padding: "9px 20px", borderRadius: 8, border: "1px solid #C9CED4",
            backgroundColor: "transparent", color: "#52657A", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button
            disabled={!title.trim() || bodyEmpty || isPending}
            onClick={() => onSubmit({ title: title.trim(), body: bodyHtml, category, audience, is_pinned: pinned, is_action_required: false })}
            style={{
              padding: "9px 24px", borderRadius: 8, border: "none",
              backgroundColor: title.trim() && !bodyEmpty ? "#415162" : "#C9CED4",
              color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: title.trim() && !bodyEmpty ? "pointer" : "default", fontFamily: "inherit",
            }}
          >
            {isPending ? "Posting..." : "Post Announcement"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* Announcement Card */

const AnnouncementCard = ({ announcement, isAdmin, onOpenTracker, onDelete }: {
  announcement: Announcement; isAdmin: boolean; onOpenTracker: (a: Announcement) => void; onDelete?: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(() => hasVideoUrl(announcement.body));
  const { markAsRead } = useAnnouncements();

  const handleExpand = () => {
    if (!expanded) markAsRead.mutate(announcement.id);
    setExpanded(!expanded);
  };

  return (
    <div
      onClick={handleExpand}
      style={{
        backgroundColor: "#E7EBEF", border: "1px solid #D5DAE0", borderRadius: 10,
        padding: "16px 18px", cursor: "pointer", transition: "background-color 0.15s",
        borderLeft: announcement.is_pinned ? "4px solid #415162" : "1px solid #D5DAE0",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#DFE3E8")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#E7EBEF")}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {announcement.is_pinned && <Pin style={{ width: 14, height: 14, color: "#3D3D3A" }} />}
          <CategoryPill category={announcement.category} />
          {announcement.is_action_required && (
            <span style={{
              display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 10,
              fontSize: 11, fontWeight: 700, backgroundColor: "#F5D6D6", color: "#A04040",
              textTransform: "uppercase", letterSpacing: "0.3px",
            }}>Action Required</span>
          )}
        </div>
        <span style={{ fontSize: 12, color: "#6B7280" }}>{formatDate(announcement.created_at)}</span>
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", marginBottom: 6, lineHeight: 1.3 }}>
        {announcement.title}
      </div>

      <AnnouncementBody html={announcement.body} expanded={expanded} />

      {expanded && <ReplyThread announcementId={announcement.id} />}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: "#6B7280" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>Posted by {announcement.author_name || "Unknown"}</span>
          <AckButton announcement={announcement} />
          {(announcement.reply_count || 0) > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6B7280" }}>
              <MessageSquare style={{ width: 14, height: 14 }} />
              {announcement.reply_count}
            </span>
          )}
        </div>
        {isAdmin && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenTracker(announcement); }}
              style={{
                backgroundColor: "#F5F3EE", padding: "2px 8px", borderRadius: 8,
                fontSize: 11, border: "none", cursor: "pointer", color: "#6B7280", fontFamily: "inherit",
              }}
            >
              Seen {announcement.read_count || 0}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this announcement?")) onDelete?.(announcement.id);
              }}
              style={{
                backgroundColor: "transparent", padding: "2px 6px", borderRadius: 8,
                fontSize: 11, border: "none", cursor: "pointer", color: "#c44444", fontFamily: "inherit",
              }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* Main Page */


const Announcements = () => {
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { has: hasPerm } = usePermissions();
  const { announcements, isLoading, createAnnouncement, deleteAnnouncement } = useAnnouncements();

  const [showCompose, setShowCompose] = useState(false);
  const [trackerAnnouncement, setTrackerAnnouncement] = useState<Announcement | null>(null);

  const canEdit = isAdmin || hasPerm("announcements.edit", "full");

  const handleCreate = (data: Parameters<typeof createAnnouncement.mutate>[0]) => {
    createAnnouncement.mutate(data, { onSuccess: () => setShowCompose(false) });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            {canEdit && (
              <button
                onClick={() => setShowCompose(true)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 36, height: 36, background: "transparent", border: "none",
                  borderRadius: 6, cursor: "pointer", color: "rgba(255,255,255,0.8)",
                }}
              >
                <Plus style={{ width: 17, height: 17 }} />
              </button>
            )}
            <NotificationBell />
          </HeaderLogo>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 100px" }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{
              width: 20, height: 20, border: "2px solid #C9CED4", borderTopColor: "#415162",
              borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#6B7280", fontSize: 14 }}>
            "No announcements yet."
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} isAdmin={isAdmin} onOpenTracker={setTrackerAnnouncement} onDelete={(id) => deleteAnnouncement.mutate(id)} />
            ))}
          </div>
        )}
      </main>

      {showCompose && <ComposeDialog onClose={() => setShowCompose(false)} onSubmit={handleCreate} isPending={createAnnouncement.isPending} />}
      {trackerAnnouncement && <ReadTracker announcement={trackerAnnouncement} onClose={() => setTrackerAnnouncement(null)} />}
    </div>
  );
};

export default Announcements;
