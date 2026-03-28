import { useState, useEffect, useRef } from "react";
import {
  Home, Phone, Calendar, Clock, Shield, Repeat, FileText, TrendingUp,
  BookOpen, CalendarOff, CheckSquare, Moon, RefreshCw, Shirt, Heart,
  ShieldCheck, Globe, Coffee, AlertTriangle, MessageSquare, Layers,
  Users, AlertCircle, Monitor, Pencil, X, Save, Eye, EyeOff,
  Plus, ChevronDown, ChevronRight, Trash2, GripVertical, Menu,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useUserRole } from "@/hooks/useUserRole";
import { useOperations, useOperationsMutations, OperationsSection } from "@/hooks/useOperations";
import { useToast } from "@/hooks/use-toast";
import HeaderLogo from "@/components/HeaderLogo";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import { TaskTemplatesSection } from "@/components/operations/TaskTemplatesSection";

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  home: Home, phone: Phone, calendar: Calendar, clock: Clock, shield: Shield,
  repeat: Repeat, "file-text": FileText, "trending-up": TrendingUp,
  "book-open": BookOpen, "calendar-off": CalendarOff, "check-square": CheckSquare,
  moon: Moon, "refresh-cw": RefreshCw, shirt: Shirt, heart: Heart,
  "shield-check": ShieldCheck, globe: Globe, coffee: Coffee,
  "alert-triangle": AlertTriangle, "message-square": MessageSquare,
  layers: Layers, users: Users, "alert-circle": AlertCircle, monitor: Monitor,
};

const APP_ROUTES = [
  { label: "Feedback", path: "/feedback" },
  { label: "Tasks", path: "/tasks" },
  { label: "Events", path: "/events" },
  { label: "Meetings", path: "/meetings" },
  { label: "Handbook", path: "/handbook" },
  { label: "Rotations", path: "/rotations" },
  { label: "CBME", path: "/cbme" },
  { label: "Admin", path: "/admin" },
];

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const renderInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const re = /\*\*(.+?)\*\*/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let k = 0;
    while ((match = re.exec(text)) !== null) {
      if (match.index > last) parts.push(text.slice(last, match.index));
      parts.push(<strong key={`b${k++}`}>{match[1]}</strong>);
      last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} style={{ fontSize: 16, fontWeight: 600, color: "#415162", margin: "24px 0 10px", paddingBottom: 5, borderBottom: "1px solid #E7EBEF" }}>
          {line.slice(3)}
        </h2>
      );
      i++; continue;
    }

    if (line.includes("|") && lines[i + 1]?.match(/^\|[-| ]+\|$/)) {
      const headerCells = line.split("|").map(c => c.trim()).filter(Boolean);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").map(c => c.trim()).filter(Boolean));
        i++;
      }
      elements.push(
        <div key={key++} style={{ overflowX: "auto", margin: "12px 0 16px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>{headerCells.map((h, j) => <th key={j} style={{ textAlign: "left", padding: "7px 10px", background: "#415162", color: "#fff", fontWeight: 500, fontSize: 12 }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 1 ? "#F5F3EE" : "transparent" }}>
                  {row.map((cell, ci) => <td key={ci} style={{ padding: "6px 10px", fontSize: 13, borderBottom: "1px solid #E7EBEF", color: "#444" }}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, "")); i++; }
      elements.push(
        <ol key={key++} style={{ paddingLeft: 18, margin: "6px 0 14px" }}>
          {items.map((item, j) => <li key={j} style={{ fontSize: 14, lineHeight: 1.7, color: "#555", marginBottom: 3 }}>{renderInline(item)}</li>)}
        </ol>
      );
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("  - ")) {
      const items: { text: string; indent: number }[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("  - "))) {
        items.push({ text: lines[i].replace(/^\s*- /, ""), indent: lines[i].startsWith("  - ") ? 1 : 0 });
        i++;
      }
      elements.push(
        <ul key={key++} style={{ paddingLeft: 18, margin: "6px 0 14px" }}>
          {items.map((item, j) => <li key={j} style={{ fontSize: 14, lineHeight: 1.7, color: "#555", marginBottom: 3, marginLeft: item.indent * 18 }}>{renderInline(item.text)}</li>)}
        </ul>
      );
      continue;
    }

    elements.push(<p key={key++} style={{ fontSize: 14, lineHeight: 1.7, color: "#555", margin: "0 0 10px" }}>{renderInline(line)}</p>);
    i++;
  }
  return elements;
}

const Operations = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { role } = useUserRole();
  const canEdit = isAdmin || role === "faculty";
  const { data: allSections, isLoading, error } = useOperations();
  const { updateSection, addSection, deleteSection } = useOperationsMutations();
  const { toast } = useToast();

  // Separate top-level and subsections
  const topSections = (allSections || []).filter(s => !s.parent_id);
  const getSubsections = (parentId: string) => (allSections || []).filter(s => s.parent_id === parentId);

  // Mobile TOC drawer
  const [tocOpen, setTocOpen] = useState(false);
  // Collapsed top-level sections in TOC (desktop)
  const [collapsedToc, setCollapsedToc] = useState<Record<string, boolean>>({});
  // Active section tracking
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  // Add section modal
  const [addingParentId, setAddingParentId] = useState<string | null | undefined>(undefined);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  // Link picker
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Scroll tracking
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !allSections?.length) return;
    const handleScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      let current = allSections[0]?.id || "";
      for (const s of allSections) {
        const el = sectionRefs.current.get(s.id);
        if (el && el.getBoundingClientRect().top - containerTop <= 90) current = s.id;
      }
      setActiveSectionId(current);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [allSections]);

  const scrollTo = (id: string) => {
    const el = sectionRefs.current.get(id);
    const container = contentRef.current;
    if (el && container) {
      const containerTop = container.getBoundingClientRect().top + container.scrollTop;
      const elTop = el.getBoundingClientRect().top + container.scrollTop;
      container.scrollTo({ top: elTop - containerTop - 16, behavior: "smooth" });
    }
    setActiveSectionId(id);
    setTocOpen(false);
  };

  const startEditing = (s: OperationsSection) => {
    setEditTitle(s.title);
    setEditContent(s.content);
    setShowPreview(false);
    setEditingId(s.id);
  };

  const cancelEditing = () => { setEditingId(null); setEditTitle(""); setEditContent(""); setShowPreview(false); };

  const handleSave = (id: string) => {
    updateSection.mutate(
      { id, title: editTitle.trim(), content: editContent, userId: user?.id || "" },
      {
        onSuccess: () => { cancelEditing(); toast({ title: "Section saved" }); },
        onError: (e: any) => toast({ title: "Error saving", description: e.message, variant: "destructive" }),
      }
    );
  };

  const insertLink = (path: string) => {
    setEditContent(prev => prev + `\n\nSee the [${path.replace("/", "")} module](${path}) for more information.`);
    setShowLinkPicker(false);
  };

  const handleAddSection = (parentId: string | null) => {
    if (!newSectionTitle.trim()) return;
    const siblings = parentId ? getSubsections(parentId) : topSections;
    const maxOrder = siblings.reduce((m, s) => Math.max(m, s.display_order), 0);
    addSection.mutate(
      { title: newSectionTitle.trim(), parentId, maxOrder, userId: user?.id || "" },
      {
        onSuccess: () => { setAddingParentId(undefined); setNewSectionTitle(""); toast({ title: "Section added" }); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteSection.mutate(id, {
      onSuccess: () => { setConfirmDeleteId(null); toast({ title: "Section deleted" }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return ""; }
  };

  // ── TOC Item ─────────────────────────────────────────────────────────
  const TocItem = ({ section, depth = 0 }: { section: OperationsSection; depth?: number }) => {
    const Icon = iconMap[section.icon] || FileText;
    const subs = getSubsections(section.id);
    const isActive = activeSectionId === section.id || subs.some(s => s.id === activeSectionId);
    const isCollapsed = collapsedToc[section.id];

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {subs.length > 0 && (
            <button
              onClick={() => setCollapsedToc(p => ({ ...p, [section.id]: !p[section.id] }))}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: "0 2px", color: "#aaa", display: "flex", alignItems: "center" }}
            >
              {isCollapsed ? <ChevronRight style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
            </button>
          )}
          <button
            onClick={() => scrollTo(section.id)}
            style={{
              flex: 1, display: "flex", alignItems: "center", gap: 8,
              padding: depth === 0 ? "9px 12px 9px 8px" : "7px 12px 7px 28px",
              fontSize: depth === 0 ? 13 : 12,
              color: isActive ? "#415162" : "#777",
              fontWeight: isActive ? 600 : 400,
              background: isActive ? "#F0F2F4" : "transparent",
              borderLeft: isActive ? "3px solid #415162" : "3px solid transparent",
              border: "none", borderRight: "none", borderTop: "none", borderBottom: "none",
              cursor: "pointer", textAlign: "left",
            }}
          >
            {depth === 0 && <Icon className="h-4 w-4" style={{ flexShrink: 0, opacity: isActive ? 1 : 0.55, width: 15, height: 15 }} />}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{section.title}</span>
          </button>
        </div>
        {!isCollapsed && subs.map(sub => <TocItem key={sub.id} section={sub} depth={1} />)}
      </div>
    );
  };

  // ── Section Content Block ─────────────────────────────────────────────
  const SectionBlock = ({ section, depth = 0 }: { section: OperationsSection; depth?: number }) => {
    const subs = getSubsections(section.id);
    const isEditing = editingId === section.id;

    return (
      <div
        ref={el => { if (el) sectionRefs.current.set(section.id, el); }}
        style={{ marginBottom: depth === 0 ? 52 : 32 }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          {isEditing ? (
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              style={{
                fontSize: depth === 0 ? 20 : 16, fontWeight: 600, color: "#333",
                border: "1px solid #C9CED4", borderRadius: 6, padding: "3px 10px",
                background: "#fff", flex: 1, outline: "none",
              }}
            />
          ) : (
            <h1 style={{ fontSize: depth === 0 ? 20 : 16, fontWeight: 600, color: "#333", margin: 0, lineHeight: 1.3 }}>
              {depth === 1 && <span style={{ color: "#C9CED4", marginRight: 6 }}>›</span>}
              {section.title}
            </h1>
          )}
          {canEdit && !isEditing && (
            <div style={{ display: "flex", gap: 4, flexShrink: 0, marginTop: 2 }}>
              <button
                onClick={() => startEditing(section)}
                title="Edit"
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, color: "#415162", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}
              >
                <Pencil style={{ width: 12, height: 12 }} /> Edit
              </button>
              <button
                onClick={() => setConfirmDeleteId(section.id)}
                title="Delete"
                style={{ display: "flex", alignItems: "center", padding: "5px 8px", fontSize: 12, color: "#c44", background: "transparent", border: "1px solid #f0c0c0", borderRadius: 5, cursor: "pointer" }}
              >
                <Trash2 style={{ width: 12, height: 12 }} />
              </button>
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: "#bbb", marginBottom: isEditing ? 14 : 16, marginTop: 4 }}>
          Updated {formatDate(section.updated_at)}
        </div>

        {isEditing ? (
          <>
            {/* Edit toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", fontSize: 12, color: showPreview ? "#415162" : "#888", background: showPreview ? "#E7EBEF" : "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}
                >
                  {showPreview ? <EyeOff style={{ width: 12, height: 12 }} /> : <Eye style={{ width: 12, height: 12 }} />}
                  {showPreview ? "Hide preview" : "Preview"}
                </button>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowLinkPicker(!showLinkPicker)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", fontSize: 12, color: "#888", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}
                  >
                    Link to page
                  </button>
                  {showLinkPicker && (
                    <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "#fff", border: "1px solid #C9CED4", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 180, padding: 4 }}>
                      {APP_ROUTES.map(r => (
                        <button
                          key={r.path}
                          onClick={() => insertLink(r.path)}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, color: "#415162", background: "transparent", border: "none", cursor: "pointer", borderRadius: 4 }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#F0F2F4"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={cancelEditing} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>
                  <X style={{ width: 12, height: 12 }} /> Cancel
                </button>
                <button
                  onClick={() => handleSave(section.id)}
                  disabled={updateSection.isPending}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", fontSize: 12, color: "#fff", background: updateSection.isPending ? "#8a9baa" : "#415162", border: "none", borderRadius: 5, cursor: updateSection.isPending ? "not-allowed" : "pointer" }}
                >
                  <Save style={{ width: 12, height: 12 }} /> {updateSection.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <div style={{ display: showPreview ? "grid" : "block", gridTemplateColumns: showPreview ? "1fr 1fr" : undefined, gap: 12 }}>
              <div>
                {showPreview && <div style={{ fontSize: 10, color: "#bbb", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>Markdown</div>}
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  spellCheck
                  style={{ width: "100%", minHeight: 320, padding: 12, fontSize: 13, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.6, color: "#333", background: "#fff", border: "1px solid #C9CED4", borderRadius: 6, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
              {showPreview && (
                <div>
                  <div style={{ fontSize: 10, color: "#bbb", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>Preview</div>
                  <div style={{ padding: 12, background: "#fff", border: "1px solid #E7EBEF", borderRadius: 6, minHeight: 320, overflowY: "auto" }}>
                    {renderMarkdown(editContent)}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 10, padding: "8px 12px", background: "#F0F2F4", borderRadius: 6, fontSize: 11, color: "#888", lineHeight: 1.6 }}>
              <span style={{ fontWeight: 500, color: "#666" }}>Markdown: </span>
              <code style={{ background: "#E7EBEF", padding: "1px 3px", borderRadius: 3, fontSize: 10 }}>## Heading</code>{" · "}
              <code style={{ background: "#E7EBEF", padding: "1px 3px", borderRadius: 3, fontSize: 10 }}>**bold**</code>{" · "}
              <code style={{ background: "#E7EBEF", padding: "1px 3px", borderRadius: 3, fontSize: 10 }}>- bullet</code>{" · "}
              <code style={{ background: "#E7EBEF", padding: "1px 3px", borderRadius: 3, fontSize: 10 }}>1. numbered</code>
            </div>
          </>
        ) : (
          <>
            {section.content ? renderMarkdown(section.content) : (
              <p style={{ fontSize: 14, color: "#bbb", fontStyle: "italic" }}>No content yet. {canEdit && "Click Edit to add content."}</p>
            )}
          </>
        )}

        {/* Subsections */}
        {depth === 0 && subs.length > 0 && (
          <div style={{ marginTop: 24, paddingLeft: 0, borderLeft: "2px solid #E7EBEF", paddingLeft: 16 }}>
            {subs.map(sub => <SectionBlock key={sub.id} section={sub} depth={1} />)}
          </div>
        )}

        {/* Add subsection button (depth 0 only, admin/faculty) */}
        {depth === 0 && canEdit && editingId !== section.id && (
          <div style={{ marginTop: subs.length > 0 ? 8 : 0 }}>
            {addingParentId === section.id ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <input
                  autoFocus
                  value={newSectionTitle}
                  onChange={e => setNewSectionTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddSection(section.id); if (e.key === "Escape") { setAddingParentId(undefined); setNewSectionTitle(""); } }}
                  placeholder="Subsection title…"
                  style={{ flex: 1, padding: "6px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }}
                />
                <button onClick={() => handleAddSection(section.id)} style={{ padding: "6px 12px", fontSize: 12, color: "#fff", background: "#415162", border: "none", borderRadius: 5, cursor: "pointer" }}>Add</button>
                <button onClick={() => { setAddingParentId(undefined); setNewSectionTitle(""); }} style={{ padding: "6px 10px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => { setAddingParentId(section.id); setNewSectionTitle(""); }}
                style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, padding: "4px 10px", fontSize: 11, color: "#999", background: "transparent", border: "1px dashed #C9CED4", borderRadius: 5, cursor: "pointer" }}
              >
                <Plus style={{ width: 11, height: 11 }} /> Add subsection
              </button>
            )}
          </div>
        )}

        {depth === 0 && <div style={{ borderBottom: "1px solid #E0DDD8", marginTop: 28 }} />}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut} />
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => setTocOpen(!tocOpen)}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 8, color: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center" }}
              aria-label="Toggle table of contents"
            >
              <Menu style={{ width: 18, height: 18 }} />
            </button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
        {/* Overlay for mobile TOC */}
        {tocOpen && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 30, background: "rgba(0,0,0,0.3)" }}
            onClick={() => setTocOpen(false)}
          />
        )}

        {/* Sidebar TOC */}
        <aside
          style={{
            position: "fixed",
            top: 56,
            left: 0,
            zIndex: 40,
            height: "calc(100vh - 56px)",
            width: 256,
            minWidth: 256,
            background: "#fff",
            borderRight: "1px solid #E7EBEF",
            overflowY: "auto",
            transform: tocOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.2s ease",
          }}
        >
          {/* Sidebar header */}
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #E7EBEF" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#415162", textTransform: "uppercase", letterSpacing: 0.8 }}>Operations Manual</div>
          </div>

          <nav style={{ padding: "6px 0" }}>
            {isLoading && <div style={{ padding: "16px", fontSize: 13, color: "#999" }}>Loading…</div>}
            {error && <div style={{ padding: "16px", fontSize: 13, color: "#c44" }}>Failed to load sections.</div>}
            {topSections.map(s => <TocItem key={s.id} section={s} />)}
            {/* Static TOC entry for Task Templates */}
            <button
              onClick={() => scrollTo("task-templates")}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "9px 12px 9px 8px", fontSize: 13,
                color: activeSectionId === "task-templates" ? "#415162" : "#777",
                fontWeight: activeSectionId === "task-templates" ? 600 : 400,
                background: activeSectionId === "task-templates" ? "#F0F2F4" : "transparent",
                borderLeft: activeSectionId === "task-templates" ? "3px solid #415162" : "3px solid transparent",
                border: "none", borderRight: "none", borderTop: "none", borderBottom: "none",
                cursor: "pointer", textAlign: "left",
              }}
            >
              <CheckSquare style={{ width: 15, height: 15, flexShrink: 0, opacity: activeSectionId === "task-templates" ? 1 : 0.55 }} />
              <span>Task Templates</span>
            </button>
          </nav>

          {/* Add top-level section */}
          {canEdit && (
            <div style={{ padding: "10px 12px", borderTop: "1px solid #E7EBEF" }}>
              {addingParentId === null ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input
                    autoFocus
                    value={newSectionTitle}
                    onChange={e => setNewSectionTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAddSection(null); if (e.key === "Escape") { setAddingParentId(undefined); setNewSectionTitle(""); } }}
                    placeholder="New section title…"
                    style={{ padding: "6px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleAddSection(null)} style={{ flex: 1, padding: "5px 0", fontSize: 12, color: "#fff", background: "#415162", border: "none", borderRadius: 5, cursor: "pointer" }}>Add</button>
                    <button onClick={() => { setAddingParentId(undefined); setNewSectionTitle(""); }} style={{ padding: "5px 10px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingParentId(null); setNewSectionTitle(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 10px", fontSize: 12, color: "#415162", background: "#F0F2F4", border: "1px dashed #C9CED4", borderRadius: 6, cursor: "pointer" }}
                >
                  <Plus style={{ width: 13, height: 13 }} /> Add section
                </button>
              )}
            </div>
          )}

          <div style={{ padding: "8px 14px", borderTop: "1px solid #E7EBEF", fontSize: 11, color: "#bbb", display: "flex", justifyContent: "space-between" }}>
            <span>{topSections.length} sections</span>
            <span>AY 2025–2026</span>
          </div>
        </aside>

        {/* Main content */}
        <div
          ref={contentRef}
          style={{ flex: 1, overflowY: "auto", padding: "24px 20px 120px" }}
        >
          {/* Mobile TOC accordion (always visible at top on mobile) */}
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={() => setTocOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: "#fff", border: "1px solid #C9CED4", borderRadius: 8, fontSize: 13, color: "#415162", fontWeight: 500, cursor: "pointer", textAlign: "left" }}
            >
              <Menu style={{ width: 15, height: 15, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>Table of Contents</span>
              <span style={{ fontSize: 11, color: "#aaa" }}>{topSections.length} sections</span>
              <ChevronRight style={{ width: 14, height: 14, color: "#aaa" }} />
            </button>
          </div>

          <div style={{ maxWidth: 700 }}>
            {isLoading && <div style={{ color: "#999", fontSize: 14, padding: "40px 0", textAlign: "center" }}>Loading operations manual…</div>}
            {error && <div style={{ color: "#c44", fontSize: 14 }}>Failed to load. Please refresh.</div>}
            {topSections.map(s => <SectionBlock key={s.id} section={s} />)}

            {/* Task Templates — always shown, not an editable markdown section */}
            {!isLoading && (
              <div style={{ marginBottom: 52 }} ref={el => { if (el) sectionRefs.current.set("task-templates", el); }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 600, color: "#333", margin: 0 }}>Task Templates</h1>
                </div>
                <div style={{ fontSize: 11, color: "#bbb", marginBottom: 18 }}>
                  Reusable task bundles · spawn into Tasks with one tap
                </div>
                <TaskTemplatesSection canEdit={canEdit} />
                <div style={{ borderBottom: "1px solid #E0DDD8", marginTop: 28 }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 340, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#333", margin: "0 0 8px" }}>Delete section?</h3>
            <p style={{ fontSize: 13, color: "#777", margin: "0 0 20px", lineHeight: 1.5 }}>This will permanently delete the section and all its subsections. This cannot be undone.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "8px 16px", fontSize: 13, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDeleteId)} style={{ padding: "8px 16px", fontSize: 13, color: "#fff", background: "#c44444", border: "none", borderRadius: 6, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Operations;
