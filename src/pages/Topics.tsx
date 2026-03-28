import { useState, useMemo } from "react";
import { Plus, ExternalLink, Trash2, X, Check, ChevronDown, ChevronUp, Pencil, Tag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useUserRole } from "@/hooks/useUserRole";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useClinicalTopics, ClinicalTopic, TopicTag } from "@/hooks/useClinicalTopics";
import HeaderLogo from "@/components/HeaderLogo";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";

const TAG_COLORS = ["#415162","#4A846C","#52657A","#D4A017","#7A6052","#6A5A7A","#5A7A6A","#378ADD","#993556","#D85A30","#7F77DD","#1D9E75","#E24B4A","#BA7517"];

function TagPill({ tag, onRemove }: { tag: TopicTag; onRemove?: () => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, padding: "2px 7px", borderRadius: 10, background: tag.color + "18", color: tag.color, fontWeight: 500, flexShrink: 0 }}>
      {tag.name}
      {onRemove && (
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: tag.color, display: "flex", lineHeight: 1 }}>
          <X style={{ width: 10, height: 10 }} />
        </button>
      )}
    </span>
  );
}

function TagSelector({ allTags, selectedIds, onChange, canCreateTag, onCreateTag }: {
  allTags: TopicTag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  canCreateTag: boolean;
  onCreateTag: (name: string, color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  const domainTags = allTags.filter(t => t.tag_type === "domain");
  const customTags = allTags.filter(t => t.tag_type === "custom");

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#415162" }}
      >
        <Tag style={{ width: 12, height: 12 }} />
        {selectedIds.length > 0 ? `${selectedIds.length} tag${selectedIds.length > 1 ? "s" : ""} selected` : "Add tags"}
        <ChevronDown style={{ width: 11, height: 11, color: "#aaa" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50, background: "#fff", border: "1px solid #C9CED4", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 220, padding: 8, maxHeight: 320, overflowY: "auto" }}>
          {domainTags.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 8px 4px" }}>Domain</div>
              {domainTags.map(tag => (
                <button key={tag.id} onClick={() => toggle(tag.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 8px", fontSize: 12, background: selectedIds.includes(tag.id) ? "#F0F2F4" : "transparent", border: "none", borderRadius: 6, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: tag.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: "#333" }}>{tag.name}</span>
                  {selectedIds.includes(tag.id) && <Check style={{ width: 11, height: 11, color: "#415162" }} />}
                </button>
              ))}
            </>
          )}
          {customTags.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, padding: "8px 8px 4px" }}>Custom</div>
              {customTags.map(tag => (
                <button key={tag.id} onClick={() => toggle(tag.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 8px", fontSize: 12, background: selectedIds.includes(tag.id) ? "#F0F2F4" : "transparent", border: "none", borderRadius: 6, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: tag.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: "#333" }}>{tag.name}</span>
                  {selectedIds.includes(tag.id) && <Check style={{ width: 11, height: 11, color: "#415162" }} />}
                </button>
              ))}
            </>
          )}
          {canCreateTag && (
            <div style={{ borderTop: "1px solid #E7EBEF", marginTop: 6, paddingTop: 8 }}>
              <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, padding: "0 8px 4px" }}>New custom tag</div>
              <div style={{ padding: "0 8px", display: "flex", gap: 5 }}>
                <input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Tag name"
                  style={{ flex: 1, padding: "5px 8px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 5, outline: "none" }} />
                <select value={newTagColor} onChange={e => setNewTagColor(e.target.value)}
                  style={{ width: 34, padding: "5px 2px", border: "1px solid #C9CED4", borderRadius: 5, background: newTagColor, cursor: "pointer" }}>
                  {TAG_COLORS.map(c => <option key={c} value={c} style={{ background: c }}>·</option>)}
                </select>
                <button onClick={() => { if (newTagName.trim()) { onCreateTag(newTagName.trim(), newTagColor); setNewTagName(""); } }}
                  disabled={!newTagName.trim()}
                  style={{ padding: "5px 8px", fontSize: 11, color: "#fff", background: "#415162", border: "none", borderRadius: 5, cursor: "pointer" }}>
                  Add
                </button>
              </div>
            </div>
          )}
          <div style={{ borderTop: "1px solid #E7EBEF", marginTop: 8, paddingTop: 6, paddingBottom: 2, display: "flex", justifyContent: "flex-end", paddingRight: 8 }}>
            <button onClick={() => setOpen(false)} style={{ fontSize: 11, color: "#415162", background: "transparent", border: "none", cursor: "pointer" }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckoffDialog({ topic, residents, currentUserId, onAdd, onClose }: {
  topic: ClinicalTopic;
  residents: any[];
  currentUserId: string;
  onAdd: (residentId: string, notes: string) => void;
  onClose: () => void;
}) {
  const [residentId, setResidentId] = useState(residents[0]?.id || "");
  const [notes, setNotes] = useState("");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 380, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#333" }}>Record checkoff</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#aaa" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <p style={{ fontSize: 12, color: "#888", marginBottom: 16, lineHeight: 1.5 }}>
          Confirm that the resident gave an oral overview of <strong style={{ color: "#333" }}>{topic.title}</strong> without notes.
        </p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase" as const, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Resident</label>
          <select value={residentId} onChange={e => setResidentId(e.target.value)}
            style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", color: "#333" }}>
            {residents.map((r: any) => <option key={r.id} value={r.id}>{r.display_name || r.email}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase" as const, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any context about the checkoff…"
            style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", resize: "none", minHeight: 72 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 7, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { onAdd(residentId, notes); onClose(); }} disabled={!residentId}
            style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#fff", background: "#415162", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 500 }}>
            Confirm checkoff
          </button>
        </div>
      </div>
    </div>
  );
}

function TopicRow({ topic, allTags, canEdit, isAdmin, isFaculty, residents, currentUserId, onUpdate, onDelete, onAddCheckoff, onDeleteCheckoff }: {
  topic: ClinicalTopic;
  allTags: TopicTag[];
  canEdit: boolean;
  isAdmin: boolean;
  isFaculty: boolean;
  residents: any[];
  currentUserId: string;
  onUpdate: (data: any) => void;
  onDelete: (id: string) => void;
  onAddCheckoff: (topicId: string, residentId: string, notes: string) => void;
  onDeleteCheckoff: (id: string) => void;
  onCreateTag: (name: string, color: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(topic.title);
  const [editUrl, setEditUrl] = useState(topic.url || "");
  const [editNotes, setEditNotes] = useState(topic.notes || "");
  const [editRequired, setEditRequired] = useState(topic.is_required);
  const [editLastReviewed, setEditLastReviewed] = useState(topic.last_reviewed || "");
  const [editTagIds, setEditTagIds] = useState((topic.tags || []).map(t => t.id));
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const checkoffs = topic.checkoffs || [];
  const checkedResidentIds = new Set(checkoffs.map(c => c.resident_id));
  const checkedCount = checkedResidentIds.size;

  const handleSave = () => {
    onUpdate({ id: topic.id, title: editTitle.trim(), url: editUrl.trim() || null, notes: editNotes.trim() || null, is_required: editRequired, last_reviewed: editLastReviewed || null, tagIds: editTagIds });
    setEditing(false);
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <>
      <div style={{ background: "#fff", border: "1px solid #E7EBEF", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
        {/* Collapsed row */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: isAdmin ? "pointer" : "default" }}
          onClick={() => !editing && isAdmin && setExpanded(!expanded)}
        >
          {/* Required dot */}
          {topic.is_required && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#415162", flexShrink: 0 }} title="Required" />}
          {!topic.is_required && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "transparent", flexShrink: 0 }} />}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: (topic.tags || []).length > 0 ? 4 : 0 }}>{topic.title}</div>
            {(topic.tags || []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(topic.tags || []).map(tag => <TagPill key={tag.id} tag={tag} />)}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Checkoff progress — admin only */}
            {isAdmin && residents.length > 0 && (
              <span style={{ fontSize: 11, color: checkedCount === residents.length ? "#27500A" : "#888",
                background: checkedCount === residents.length ? "#EAF3DE" : "#F0F2F4",
                padding: "2px 7px", borderRadius: 10, whiteSpace: "nowrap" as const }}>
                {checkedCount}/{residents.length}
              </span>
            )}
            {topic.url && (
              <a href={topic.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                style={{ color: "#415162", display: "flex", alignItems: "center" }}>
                <ExternalLink style={{ width: 14, height: 14 }} />
              </a>
            )}
            {isAdmin && (
              expanded ? <ChevronUp style={{ width: 14, height: 14, color: "#aaa" }} /> : <ChevronDown style={{ width: 14, height: 14, color: "#aaa" }} />
            )}
          </div>
        </div>

        {/* Expanded */}
        {expanded && !editing && (
          <div style={{ borderTop: "1px solid #E7EBEF", padding: "12px 14px" }}>
            {topic.notes && <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 10 }}>{topic.notes}</p>}

            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 12, marginBottom: 12, fontSize: 12, color: "#888" }}>
              {topic.last_reviewed && <span>Last reviewed: {formatDate(topic.last_reviewed)}</span>}
              {topic.is_required && <span style={{ color: "#415162", fontWeight: 500 }}>Required for graduation</span>}
            </div>

            {/* Checkoffs — faculty can add, admin sees all */}
            {(isFaculty || isAdmin) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6 }}>
                  Checkoffs {isAdmin && `(${checkoffs.length})`}
                </div>
                {checkoffs.length === 0 && <p style={{ fontSize: 12, color: "#bbb", fontStyle: "italic" }}>No checkoffs yet.</p>}
                {checkoffs.map(c => {
                  const res = residents.find((r: any) => r.id === c.resident_id);
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #F5F3EE" }}>
                      <Check style={{ width: 12, height: 12, color: "#27500A", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 12, color: "#333", fontWeight: 500 }}>{res?.display_name || "Unknown resident"}</span>
                        {c.notes && <span style={{ fontSize: 11, color: "#888", marginLeft: 6 }}>{c.notes}</span>}
                        <span style={{ fontSize: 11, color: "#bbb", marginLeft: 6 }}>{formatDate(c.checked_off_at)}</span>
                      </div>
                      {(isAdmin || c.faculty_id === currentUserId) && (
                        <button onClick={() => onDeleteCheckoff(c.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ddd", padding: 2 }}>
                          <X style={{ width: 11, height: 11 }} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {isFaculty && residents.length > 0 && (
                  <button onClick={() => setCheckoffOpen(true)}
                    style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, padding: "5px 10px", fontSize: 11, color: "#415162", background: "#F0F2F4", border: "1px solid #C9CED4", borderRadius: 6, cursor: "pointer" }}>
                    <Plus style={{ width: 11, height: 11 }} /> Record checkoff
                  </button>
                )}
              </div>
            )}

            {/* Edit / delete */}
            {canEdit && (
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <button onClick={() => { setEditing(true); setEditTitle(topic.title); setEditUrl(topic.url || ""); setEditNotes(topic.notes || ""); setEditRequired(topic.is_required); setEditLastReviewed(topic.last_reviewed || ""); setEditTagIds((topic.tags || []).map(t => t.id)); }}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 11, color: "#415162", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>
                  <Pencil style={{ width: 11, height: 11 }} /> Edit
                </button>
                <button onClick={() => setConfirmDelete(true)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 11, color: "#c44", background: "transparent", border: "1px solid #f0c0c0", borderRadius: 5, cursor: "pointer" }}>
                  <Trash2 style={{ width: 11, height: 11 }} /> Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* Edit mode */}
        {editing && (
          <div style={{ borderTop: "1px solid #E7EBEF", padding: "12px 14px" }}>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Topic title"
                style={{ padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }} />
              <input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="Resource URL (https://…)"
                style={{ padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }} />
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes (optional)"
                style={{ padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", resize: "none", minHeight: 60 }} />
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" id={`req-${topic.id}`} checked={editRequired} onChange={e => setEditRequired(e.target.checked)} />
                  <label htmlFor={`req-${topic.id}`} style={{ fontSize: 12, color: "#555", cursor: "pointer" }}>Required for graduation</label>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "#888" }}>Last reviewed:</label>
                  <input type="date" value={editLastReviewed} onChange={e => setEditLastReviewed(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 5, outline: "none", background: "#fff" }} />
                </div>
              </div>
              <TagSelector allTags={allTags} selectedIds={editTagIds} onChange={setEditTagIds}
                canCreateTag={canEdit} onCreateTag={(name, color) => { /* handled at page level */ }} />
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" as const }}>
                <button onClick={() => setEditing(false)} style={{ padding: "6px 14px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSave} disabled={!editTitle.trim()}
                  style={{ padding: "6px 14px", fontSize: 12, color: "#fff", background: "#415162", border: "none", borderRadius: 6, cursor: "pointer" }}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {checkoffOpen && (
        <CheckoffDialog topic={topic} residents={residents} currentUserId={currentUserId}
          onAdd={(residentId, notes) => onAddCheckoff(topic.id, residentId, notes)}
          onClose={() => setCheckoffOpen(false)} />
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 320, width: "100%" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 8 }}>Delete topic?</h3>
            <p style={{ fontSize: 13, color: "#777", marginBottom: 20, lineHeight: 1.5 }}>This will permanently delete "{topic.title}" and all its checkoffs.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { onDelete(topic.id); setConfirmDelete(false); }} style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#fff", background: "#c44444", border: "none", borderRadius: 6, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AddTopicForm({ allTags, canEdit, onAdd, onCreateTag, onClose }: {
  allTags: TopicTag[];
  canEdit: boolean;
  onAdd: (data: any) => void;
  onCreateTag: (name: string, color: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [required, setRequired] = useState(false);
  const [tagIds, setTagIds] = useState<string[]>([]);

  return (
    <div style={{ background: "#F0F2F4", border: "1px dashed #C9CED4", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Topic title (e.g. Chest pain evaluation)"
          style={{ padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }} />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Resource URL (https://…)"
          style={{ padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }} />
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
          style={{ padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" id="new-req" checked={required} onChange={e => setRequired(e.target.checked)} />
          <label htmlFor="new-req" style={{ fontSize: 12, color: "#555", cursor: "pointer" }}>Required for graduation</label>
        </div>
        <TagSelector allTags={allTags} selectedIds={tagIds} onChange={setTagIds}
          canCreateTag={canEdit} onCreateTag={onCreateTag} />
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" as const }}>
          <button onClick={onClose} style={{ padding: "6px 14px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { if (title.trim()) { onAdd({ title: title.trim(), url: url.trim() || undefined, notes: notes.trim() || undefined, is_required: required, tagIds }); onClose(); } }}
            disabled={!title.trim()}
            style={{ padding: "6px 14px", fontSize: 12, color: "#fff", background: "#415162", border: "none", borderRadius: 6, cursor: "pointer" }}>Add topic</button>
        </div>
      </div>
    </div>
  );
}

const Topics = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { role } = useUserRole();
  const isFaculty = role === "faculty";
  const canEdit = isAdmin || isFaculty;
  const { teamMembers } = useTeamMembers();
  const residents = (teamMembers || []).filter((m: any) => m.role === "resident");

  const { topics, allTags, createTopic, updateTopic, deleteTopic, createTag, addCheckoff, deleteCheckoff } = useClinicalTopics();

  const [search, setSearch] = useState("");
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const filtered = useMemo(() => {
    let list = topics.data || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q));
    }
    if (filterTagId) {
      list = list.filter(t => (t.tags || []).some(tag => tag.id === filterTagId));
    }
    return list;
  }, [topics.data, search, filterTagId]);

  const domainTags = (allTags.data || []).filter(t => t.tag_type === "domain");

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut} />
          <NotificationBell />
        </div>
      </header>

      <main style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px 120px" }}>
        {/* Search + filter */}
        <div style={{ marginBottom: 14 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topics…"
            style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 8, outline: "none", background: "#fff", marginBottom: 10, boxSizing: "border-box" as const }} />
          {/* Domain filter pills */}
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
            <div style={{ display: "flex", gap: 6, minWidth: "max-content", paddingBottom: 2 }}>
              <button onClick={() => setFilterTagId(null)}
                style={{ padding: "4px 12px", fontSize: 12, borderRadius: 20, border: "none", cursor: "pointer", background: filterTagId === null ? "#415162" : "#E7EBEF", color: filterTagId === null ? "#fff" : "#555", fontWeight: filterTagId === null ? 600 : 400 }}>
                All
              </button>
              {domainTags.map(tag => (
                <button key={tag.id} onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
                  style={{ padding: "4px 12px", fontSize: 12, borderRadius: 20, border: "none", cursor: "pointer",
                    background: filterTagId === tag.id ? tag.color : "#E7EBEF",
                    color: filterTagId === tag.id ? "#fff" : "#555",
                    fontWeight: filterTagId === tag.id ? 600 : 400 }}>
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Topic count + add button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: "#aaa" }}>{filtered.length} topic{filtered.length !== 1 ? "s" : ""}</span>
          {canEdit && !showAddForm && (
            <button onClick={() => setShowAddForm(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 12, color: "#fff", background: "#415162", border: "none", borderRadius: 7, cursor: "pointer" }}>
              <Plus style={{ width: 13, height: 13 }} /> Add topic
            </button>
          )}
        </div>

        {/* Add form */}
        {showAddForm && (
          <AddTopicForm allTags={allTags.data || []} canEdit={canEdit}
            onAdd={data => createTopic.mutate(data)}
            onCreateTag={(name, color) => createTag.mutate({ name, color, tag_type: "custom" })}
            onClose={() => setShowAddForm(false)} />
        )}

        {/* Topic list */}
        {topics.isLoading && <div style={{ color: "#aaa", fontSize: 14, textAlign: "center", padding: "40px 0" }}>Loading topics…</div>}
        {!topics.isLoading && filtered.length === 0 && (
          <div style={{ color: "#bbb", fontSize: 14, textAlign: "center", padding: "40px 0" }}>
            {search || filterTagId ? "No topics match your filter." : "No topics yet."}
          </div>
        )}
        {filtered.map(topic => (
          <TopicRow
            key={topic.id}
            topic={topic}
            allTags={allTags.data || []}
            canEdit={canEdit}
            isAdmin={!!isAdmin}
            isFaculty={isFaculty}
            residents={residents}
            currentUserId={user?.id || ""}
            onUpdate={data => updateTopic.mutate(data)}
            onDelete={id => deleteTopic.mutate(id)}
            onAddCheckoff={(topicId, residentId, notes) => addCheckoff.mutate({ topic_id: topicId, resident_id: residentId, notes })}
            onDeleteCheckoff={id => deleteCheckoff.mutate(id)}
            onCreateTag={(name, color) => createTag.mutate({ name, color, tag_type: "custom" })}
          />
        ))}
      </main>
      <BottomNav />
    </div>
  );
};

export default Topics;
