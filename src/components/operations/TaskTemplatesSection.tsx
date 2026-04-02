import { useState } from "react";
import { Plus, ChevronDown, ChevronRight, Trash2, Play, X, Calendar, Pencil, Save, Check } from "lucide-react";
import { useTaskTemplates, TaskTemplate, TaskTemplateItem } from "@/hooks/useTaskTemplates";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/contexts/AuthContext";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_COLORS } from "@/hooks/useEvents";
import type { EventCategory } from "@/hooks/useEvents";
import OperationsLinkPill from "@/components/shared/OperationsLinkPill";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  faculty: "Faculty",
  specific: "Specific person",
};

const offsetLabel = (n: number) => {
  if (n === 0) return "On anchor date";
  if (n < 0) return `${Math.abs(n)} day${Math.abs(n) !== 1 ? "s" : ""} before`;
  return `${n} day${n !== 1 ? "s" : ""} after`;
};

function SpawnDialog({ template, onClose, onSpawn, teamMembers, isPending }: {
  template: TaskTemplate; onClose: () => void;
  onSpawn: (anchorDate: string, facultyId: string | null) => void;
  teamMembers: any[]; isPending: boolean;
}) {
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().split("T")[0]);
  const [facultyId, setFacultyId] = useState("");
  const faculty = teamMembers.filter((m: any) => m.role === "faculty");
  const hasFacultyItems = template.items?.some(i => i.assignee_role === "faculty");

  const computedDate = (offset: number) => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 400, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.22)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#333" }}>Spawn "{template.name}"</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, color: "#aaa" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <p style={{ fontSize: 12, color: "#888", marginBottom: 18 }}>Creates {template.items?.length || 0} task{template.items?.length !== 1 ? "s" : ""} in the Tasks module.</p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase" as const, letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Anchor date</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar style={{ width: 14, height: 14, color: "#888", flexShrink: 0 }} />
            <input type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)}
              style={{ flex: 1, padding: "6px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", color: "#333" }} />
          </div>
          <p style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Task due dates are calculated relative to this date.</p>
        </div>

        {hasFacultyItems && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase" as const, letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Assign faculty tasks to</label>
            <select value={facultyId} onChange={e => setFacultyId(e.target.value)}
              style={{ width: "100%", padding: "6px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", color: "#333" }}>
              <option value="">— pick faculty member —</option>
              {faculty.map((f: any) => <option key={f.id} value={f.id}>{f.display_name || f.email}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8 }}>Tasks to create</div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
            {(template.items || []).map(item => (
              <div key={item.id} style={{ padding: "8px 10px", background: "#F5F3EE", borderRadius: 7 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#333", marginBottom: 2 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "#999" }}>Due {computedDate(item.day_offset)} · {item.assignee_role === "specific" && item.assignee_id
                  ? (teamMembers.find((m: any) => m.id === item.assignee_id)?.display_name || "Specific user")
                  : ROLE_LABELS[item.assignee_role]
                }</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 7, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onSpawn(anchorDate, facultyId || null)} disabled={isPending || !anchorDate}
            style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#fff", background: isPending ? "#8a9baa" : "#415162", border: "none", borderRadius: 7, cursor: isPending ? "not-allowed" : "pointer", fontWeight: 500 }}>
            {isPending ? "Creating…" : "Create tasks"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddItemForm({ templateId, itemCount, onDone, addItem, teamMembers }: { templateId: string; itemCount: number; onDone: () => void; addItem: ReturnType<typeof useTaskTemplates>["addItem"]; teamMembers: any[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState<"admin" | "faculty">("admin");
  const [assigneeId, setAssigneeId] = useState("");
  const [offset, setOffset] = useState(0);
  const [addedCount, setAddedCount] = useState(0);

  const filteredMembers = teamMembers.filter((m: any) => m.role === role);

  const handleAdd = () => {
    if (!title.trim()) return;
    addItem.mutate({
      template_id: templateId,
      title: title.trim(),
      description: description.trim() || undefined,
      assignee_role: assigneeId ? "specific" : role,
      assignee_id: assigneeId || undefined,
      day_offset: offset,
      sort_order: (itemCount + addedCount + 1) * 10,
    }, { onSuccess: () => { setTitle(""); setDescription(""); setOffset(0); setAssigneeId(""); setAddedCount(c => c + 1); } });
  };

  return (
    <div style={{ padding: "10px 12px", background: "#F0F2F4", borderRadius: 8, marginTop: 6 }}>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title…"
          style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }} />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)"
          style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }} />
        <div style={{ display: "flex", gap: 6 }}>
          <select value={role} onChange={e => { setRole(e.target.value as any); setAssigneeId(""); }}
            style={{ flex: 1, padding: "6px 8px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }}>
            <option value="admin">Admin</option>
            <option value="faculty">Faculty</option>
          </select>
          <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
            style={{ flex: 2, padding: "6px 8px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", color: assigneeId ? "#333" : "#aaa" }}>
            <option value="">Any {role === "admin" ? "admin" : "faculty"}…</option>
            {filteredMembers.map((m: any) => (
              <option key={m.id} value={m.id}>{m.display_name || m.id}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="number" value={offset} onChange={e => setOffset(parseInt(e.target.value) || 0)}
            style={{ width: 60, padding: "6px 8px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", textAlign: "center" as const }} />
          <span style={{ fontSize: 11, color: "#888", whiteSpace: "nowrap" as const }}>days offset from anchor date</span>
        </div>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" as const }}>
          <button onClick={onDone} style={{ padding: "5px 12px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>Done</button>
          <button onClick={handleAdd} disabled={!title.trim() || addItem.isPending}
            style={{ padding: "5px 12px", fontSize: 12, color: "#fff", background: "#415162", border: "none", borderRadius: 5, cursor: "pointer" }}>{addItem.isPending ? "Adding…" : "Add task"}</button>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template, canEdit }: { template: TaskTemplate; canEdit: boolean }) {
  const { deleteTemplate, deleteItem, addItem, updateTemplate, updateItem, spawnTasks } = useTaskTemplates();
  const teamQuery = useTeamMembers();
  const teamMembers = teamQuery.data ?? [];
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [spawning, setSpawning] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Template editing state
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCat, setEditCat] = useState("");

  // Item editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemTitle, setEditItemTitle] = useState("");
  const [editItemDesc, setEditItemDesc] = useState("");
  const [editItemRole, setEditItemRole] = useState<string>("admin");
  const [editItemAssigneeId, setEditItemAssigneeId] = useState("");
  const [editItemOffset, setEditItemOffset] = useState(0);

  const catColor = template.category ? EVENT_CATEGORY_COLORS[template.category as EventCategory] || "#415162" : "#415162";
  const adminMember = teamMembers.find((m: any) => m.role === "admin");
  const adminId = adminMember?.id || user!.id;

  const startEditTemplate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(template.name);
    setEditDesc(template.description || "");
    setEditCat(template.category || "");
    setEditingTemplate(true);
  };

  const saveTemplate = () => {
    if (!editName.trim()) return;
    updateTemplate.mutate({ id: template.id, name: editName.trim(), description: editDesc.trim() || undefined, category: editCat || undefined },
      { onSuccess: () => setEditingTemplate(false) });
  };

  const startEditItem = (item: TaskTemplateItem) => {
    setEditingItemId(item.id);
    setEditItemTitle(item.title);
    setEditItemDesc(item.description || "");
    setEditItemRole(item.assignee_role === "specific" ? (teamMembers.find((m: any) => m.id === item.assignee_id)?.role || "admin") : item.assignee_role);
    setEditItemAssigneeId(item.assignee_id || "");
    setEditItemOffset(item.day_offset);
  };

  const saveItem = () => {
    if (!editingItemId || !editItemTitle.trim()) return;
    updateItem.mutate({
      id: editingItemId,
      title: editItemTitle.trim(),
      description: editItemDesc.trim() || undefined,
      assignee_role: editItemAssigneeId ? "specific" : editItemRole,
      assignee_id: editItemAssigneeId || undefined,
      day_offset: editItemOffset,
    }, { onSuccess: () => setEditingItemId(null) });
  };

  return (
    <>
      <div style={{ background: "#fff", border: "1px solid #E7EBEF", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
        {/* Header */}
        {editingTemplate ? (
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column" as const, gap: 8 }}>
            <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
              style={{ padding: "6px 10px", fontSize: 13, fontWeight: 600, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }} />
            <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description (optional)"
              style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }} />
            <select value={editCat} onChange={e => setEditCat(e.target.value)}
              style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", color: editCat ? "#333" : "#aaa" }}>
              <option value="">Category (optional)</option>
              <option value="program">Program</option>
              <option value="didactic">Didactic</option>
              <option value="committee">Committee</option>
              <option value="compliance">Compliance</option>
              <option value="administrative">Administrative</option>
              <option value="wellness">Wellness</option>
              <option value="faculty">Faculty</option>
            </select>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" as const }}>
              <button onClick={() => setEditingTemplate(false)} style={{ padding: "5px 12px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveTemplate} disabled={!editName.trim() || updateTemplate.isPending}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", fontSize: 12, color: "#fff", background: "#415162", border: "none", borderRadius: 5, cursor: "pointer" }}>
                <Save style={{ width: 11, height: 11 }} /> {updateTemplate.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown style={{ width: 14, height: 14, color: "#aaa", flexShrink: 0 }} /> : <ChevronRight style={{ width: 14, height: 14, color: "#aaa", flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{template.name}</div>
              {template.description && <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{template.description}</div>}
              {template.operations_section_id && <div style={{ marginTop: 4 }}><OperationsLinkPill sectionId={template.operations_section_id} /></div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {canEdit && (
                <button onClick={startEditTemplate} style={{ display: "flex", alignItems: "center", padding: 4, background: "transparent", border: "none", cursor: "pointer", color: "#bbb" }} title="Edit template">
                  <Pencil style={{ width: 12, height: 12 }} />
                </button>
              )}
              {template.category && (
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: catColor + "18", color: catColor, fontWeight: 500 }}>
                  {EVENT_CATEGORY_LABELS[template.category as EventCategory] || template.category}
                </span>
              )}
              <span style={{ fontSize: 11, color: "#aaa" }}>{template.items?.length || 0} tasks</span>
            </div>
          </div>
        )}

        {expanded && !editingTemplate && (
          <div style={{ borderTop: "1px solid #E7EBEF", padding: "10px 14px" }}>
            {(template.items || []).length === 0 && (
              <p style={{ fontSize: 12, color: "#bbb", fontStyle: "italic", marginBottom: 8 }}>No tasks yet. Add one below.</p>
            )}
            {(template.items || []).map(item => (
              <div key={item.id} style={{ padding: "7px 0", borderBottom: "1px solid #F0F0EE" }}>
                {editingItemId === item.id ? (
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, padding: "4px 0" }}>
                    <input autoFocus value={editItemTitle} onChange={e => setEditItemTitle(e.target.value)}
                      style={{ padding: "5px 8px", fontSize: 12, fontWeight: 500, border: "1px solid #C9CED4", borderRadius: 5, outline: "none", background: "#fff" }} />
                    <input value={editItemDesc} onChange={e => setEditItemDesc(e.target.value)} placeholder="Description (optional)"
                      style={{ padding: "5px 8px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 5, outline: "none", background: "#fff" }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <select value={editItemRole} onChange={e => { setEditItemRole(e.target.value); setEditItemAssigneeId(""); }}
                        style={{ flex: 1, padding: "5px 8px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 5, outline: "none", background: "#fff" }}>
                        <option value="admin">Admin</option>
                        <option value="faculty">Faculty</option>
                      </select>
                      <select value={editItemAssigneeId} onChange={e => setEditItemAssigneeId(e.target.value)}
                        style={{ flex: 2, padding: "5px 8px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 5, outline: "none", background: "#fff", color: editItemAssigneeId ? "#333" : "#aaa" }}>
                        <option value="">Any {editItemRole === "admin" ? "admin" : "faculty"}…</option>
                        {teamMembers.filter((m: any) => m.role === editItemRole).map((m: any) => (
                          <option key={m.id} value={m.id}>{m.display_name || m.id}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="number" value={editItemOffset} onChange={e => setEditItemOffset(parseInt(e.target.value) || 0)}
                        style={{ width: 60, padding: "5px 8px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 5, outline: "none", background: "#fff", textAlign: "center" as const }} />
                      <span style={{ fontSize: 11, color: "#888", whiteSpace: "nowrap" as const }}>days offset from anchor date</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" as const }}>
                      <button onClick={() => setEditingItemId(null)} style={{ padding: "4px 10px", fontSize: 11, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 4, cursor: "pointer" }}>Cancel</button>
                      <button onClick={saveItem} disabled={!editItemTitle.trim() || updateItem.isPending}
                        style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 10px", fontSize: 11, color: "#fff", background: "#415162", border: "none", borderRadius: 4, cursor: "pointer" }}>
                        <Check style={{ width: 10, height: 10 }} /> {updateItem.isPending ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#333" }}>{item.title}</div>
                      {item.description && <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{item.description}</div>}
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                        {item.assignee_role === "specific" && item.assignee_id
                          ? (teamMembers.find((m: any) => m.id === item.assignee_id)?.display_name || "Specific user")
                          : ROLE_LABELS[item.assignee_role]
                        } · {offsetLabel(item.day_offset)}
                      </div>
                    </div>
                    {canEdit && (
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        <button onClick={() => startEditItem(item)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, color: "#ccc" }} title="Edit task">
                          <Pencil style={{ width: 11, height: 11 }} />
                        </button>
                        <button onClick={() => deleteItem.mutate(item.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, color: "#ccc" }} title="Delete task">
                          <Trash2 style={{ width: 11, height: 11 }} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {canEdit && !addingItem && (
              <button onClick={() => setAddingItem(true)}
                style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, padding: "4px 8px", fontSize: 11, color: "#888", background: "transparent", border: "1px dashed #C9CED4", borderRadius: 5, cursor: "pointer" }}>
                <Plus style={{ width: 11, height: 11 }} /> Add task
              </button>
            )}
            {addingItem && <AddItemForm templateId={template.id} itemCount={template.items?.length || 0} onDone={() => setAddingItem(false)} addItem={addItem} teamMembers={teamMembers} />}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: "1px solid #F0F0EE" }}>
              {canEdit ? (
                <button onClick={() => setConfirmDelete(true)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 11, color: "#c44", background: "transparent", border: "1px solid #f0c0c0", borderRadius: 6, cursor: "pointer" }}>
                  <Trash2 style={{ width: 11, height: 11 }} /> Delete template
                </button>
              ) : <div />}
              <button onClick={e => { e.stopPropagation(); setSpawning(true); }} disabled={!template.items?.length}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", fontSize: 12, color: "#fff", background: template.items?.length ? "#415162" : "#aaa", border: "none", borderRadius: 6, cursor: template.items?.length ? "pointer" : "not-allowed", fontWeight: 500 }}>
                <Play style={{ width: 12, height: 12 }} /> Spawn tasks
              </button>
            </div>
          </div>
        )}
      </div>

      {spawning && (
        <SpawnDialog template={template} onClose={() => setSpawning(false)}
          onSpawn={(anchorDate, fid) => spawnTasks.mutate({ template, anchorDate, adminId, facultyId: fid }, { onSuccess: () => setSpawning(false) })}
          teamMembers={teamMembers} isPending={spawnTasks.isPending} />
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 320, width: "100%" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 8 }}>Delete template?</h3>
            <p style={{ fontSize: 13, color: "#777", marginBottom: 20, lineHeight: 1.5 }}>Permanently deletes "{template.name}" and its task definitions. Spawned tasks are not affected.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { deleteTemplate.mutate(template.id); setConfirmDelete(false); }} style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#fff", background: "#c44444", border: "none", borderRadius: 6, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function TaskTemplatesSection({ canEdit }: { canEdit: boolean }) {
  const { templates, createTemplate } = useTaskTemplates();
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    createTemplate.mutate({ name: newName.trim(), description: newDesc.trim() || undefined, category: newCat || undefined },
      { onSuccess: () => { setAddingTemplate(false); setNewName(""); setNewDesc(""); setNewCat(""); } });
  };

  if (templates.isLoading) return <div style={{ fontSize: 13, color: "#aaa", padding: "12px 0" }}>Loading templates…</div>;

  return (
    <div>
      {(templates.data || []).map(t => <TemplateCard key={t.id} template={t} canEdit={canEdit} />)}
      {canEdit && (
        addingTemplate ? (
          <div style={{ padding: "12px 14px", background: "#F0F2F4", borderRadius: 10, border: "1px dashed #C9CED4" }}>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Template name…"
                style={{ padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }} />
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)"
                style={{ padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }} />
              <select value={newCat} onChange={e => setNewCat(e.target.value)}
                style={{ padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", color: newCat ? "#333" : "#aaa" }}>
                <option value="">Category (optional)</option>
                <option value="program">Program</option>
                <option value="didactic">Didactic</option>
                <option value="committee">Committee</option>
                <option value="compliance">Compliance</option>
                <option value="administrative">Administrative</option>
                <option value="wellness">Wellness</option>
                <option value="faculty">Faculty</option>
              </select>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" as const }}>
                <button onClick={() => { setAddingTemplate(false); setNewName(""); setNewDesc(""); setNewCat(""); }}
                  style={{ padding: "6px 14px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleCreate} disabled={!newName.trim() || createTemplate.isPending}
                  style={{ padding: "6px 14px", fontSize: 12, color: "#fff", background: "#415162", border: "none", borderRadius: 6, cursor: "pointer" }}>Create</button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingTemplate(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "9px 12px", fontSize: 12, color: "#415162", background: "#F0F2F4", border: "1px dashed #C9CED4", borderRadius: 8, cursor: "pointer" }}>
            <Plus style={{ width: 13, height: 13 }} /> New template
          </button>
        )
      )}
    </div>
  );
}
