import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, Phone, Calendar, Clock, Shield, Repeat, FileText, TrendingUp,
  BookOpen, CalendarOff, CheckSquare, Moon, RefreshCw, Shirt, Heart,
  ShieldCheck, Globe, Coffee, AlertTriangle, MessageSquare, Layers,
  Users, AlertCircle, Monitor, Pencil, X, Save,
  Menu, ChevronDown, ChevronRight, Plus, Trash2, Search, ArrowUp, ArrowDown,
  CalendarPlus, Paperclip,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useUserRole } from "@/hooks/useUserRole";
import { useHandbook, useHandbookMutations, HandbookSection } from "@/hooks/useHandbook";
import { useToast } from "@/hooks/use-toast";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import SectionTipTapEditor from "@/components/shared/SectionTipTapEditor";
import { useDocumentSearch } from "@/hooks/useDocumentSearch";
import DocumentSearchBar from "@/components/shared/DocumentSearchBar";
import { usePermissions } from "@/hooks/usePermissions";
import { EVENT_CATEGORY_LABELS } from "@/hooks/useEvents";
import type { EventCategory } from "@/hooks/useEvents";

const iconMap: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  home: Home, phone: Phone, calendar: Calendar, clock: Clock, shield: Shield,
  repeat: Repeat, "file-text": FileText, "trending-up": TrendingUp,
  "book-open": BookOpen, "calendar-off": CalendarOff, "check-square": CheckSquare,
  moon: Moon, "refresh-cw": RefreshCw, shirt: Shirt, heart: Heart,
  "shield-check": ShieldCheck, globe: Globe, coffee: Coffee,
  "alert-triangle": AlertTriangle, "message-square": MessageSquare,
  layers: Layers, users: Users, "alert-circle": AlertCircle, monitor: Monitor,
};

const Handbook = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { has: hasPerm } = usePermissions();
  const hasEditPerm = hasPerm("handbook.edit");
  const [viewAsReader, setViewAsReader] = useState(true);
  const canEdit = hasEditPerm && !viewAsReader;
  const { data: allSections, isLoading, error } = useHandbook();
  const { updateSection, addSection, deleteSection } = useHandbookMutations();
  const { toast } = useToast();
  const { results: searchResults, isSearching, query: searchQuery, search: doSearch, clear: clearSearch } = useDocumentSearch();

  const topSections = (allSections || []).filter(s => !s.parent_id).sort((a, b) => a.display_order - b.display_order);
  const getSubsections = (parentId: string) => (allSections || []).filter(s => s.parent_id === parentId).sort((a, b) => a.display_order - b.display_order);

  const sectionTitles: Record<string, string> = {};
  (allSections || []).forEach(s => { sectionTitles[s.id] = s.title; });

  const [tocOpen, setTocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsedToc, setCollapsedToc] = useState<Record<string, boolean>>({});
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editContentRef = useRef("");
  const [addingParentId, setAddingParentId] = useState<string | null | undefined>(undefined);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Linked events & tasks
  const [linkedEvents, setLinkedEvents] = useState<Record<string, any[]>>({});
  const [linkedTasks, setLinkedTasks] = useState<Record<string, any[]>>({});
  const [linkedFiles, setLinkedFiles] = useState<Record<string, any[]>>({});
  const [linkedRefresh, setLinkedRefresh] = useState(0);
  const [createEventForSection, setCreateEventForSection] = useState<HandbookSection | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventCategory, setEventCategory] = useState("program");
  const [createTaskForSection, setCreateTaskForSection] = useState<HandbookSection | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingSectionId, setUploadingSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!allSections?.length) return;
    const sectionIds = allSections.map(s => s.id);
    (supabase.from("events").select("id, title, event_date, category, operations_section_id") as any)
      .in("operations_section_id", sectionIds)
      .eq("archived", false)
      .order("event_date", { ascending: true })
      .then(({ data, error: err }: { data: any[]; error: any }) => {
        if (err) return;
        const grouped: Record<string, any[]> = {};
        (data || []).forEach((e: any) => { const sid = e.operations_section_id; if (sid) { if (!grouped[sid]) grouped[sid] = []; grouped[sid].push(e); } });
        setLinkedEvents(grouped);
      });
    (supabase.from("tasks").select("id, title, completed, due_date, operations_section_id") as any)
      .in("operations_section_id", sectionIds)
      .then(({ data, error: err }: { data: any[]; error: any }) => {
        if (err) return;
        const grouped: Record<string, any[]> = {};
        (data || []).forEach((t: any) => { const sid = t.operations_section_id; if (sid) { if (!grouped[sid]) grouped[sid] = []; grouped[sid].push(t); } });
        setLinkedTasks(grouped);
      });
    (supabase as any).from("handbook_attachments").select("*").in("section_id", sectionIds).order("created_at", { ascending: true })
      .then(({ data, error: err }: { data: any[]; error: any }) => {
        if (err) return;
        const grouped: Record<string, any[]> = {};
        (data || []).forEach((f: any) => { const sid = f.section_id; if (sid) { if (!grouped[sid]) grouped[sid] = []; grouped[sid].push(f); } });
        setLinkedFiles(grouped);
      });
  }, [allSections, linkedRefresh]);

  const handleFileUpload = async (sectionId: string, files: FileList | null) => {
    if (!files || files.length === 0) { setUploadingSectionId(null); return; }
    setUploadingSectionId(sectionId);
    try {
      for (const file of Array.from(files)) {
        const filePath = `${sectionId}/${Date.now()}-${file.name}`;
        console.log("Uploading to handbook-attachments:", filePath);
        const { error: uploadErr } = await supabase.storage.from("handbook-attachments").upload(filePath, file);
        if (uploadErr) { console.error("Storage upload error:", uploadErr); throw uploadErr; }
        const { error: insertErr } = await (supabase as any).from("handbook_attachments").insert({
          section_id: sectionId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: user?.id,
        });
        if (insertErr) { console.error("DB insert error:", insertErr); throw insertErr; }
      }
      toast({ title: "File(s) uploaded" });
      setLinkedRefresh(r => r + 1);
    } catch (e: any) {
      console.error("Upload failed:", e);
      toast({ title: "Upload failed", description: e.message || JSON.stringify(e), variant: "destructive" });
    } finally {
      setUploadingSectionId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    try {
      await supabase.storage.from("handbook-attachments").remove([filePath]);
      await (supabase as any).from("handbook_attachments").delete().eq("id", fileId);
      toast({ title: "File removed" });
      setLinkedRefresh(r => r + 1);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from("handbook-attachments").getPublicUrl(filePath);
    return data?.publicUrl || "";
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !createEventForSection) return;
    try {
      const { error: err } = await (supabase as any).from("events").insert({
        title: eventTitle.trim(),
        event_date: eventDate || new Date().toISOString().split("T")[0],
        category: eventCategory,
        operations_section_id: createEventForSection.id,
        created_by: user?.id,
        archived: false,
      });
      if (err) throw err;
      toast({ title: "Event added", description: `"${eventTitle.trim()}" linked to ${createEventForSection.title}` });
      setLinkedRefresh(r => r + 1);
      setCreateEventForSection(null);
      setEventTitle(""); setEventDate(""); setEventCategory("program");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !createTaskForSection) return;
    try {
      const { error: err } = await (supabase as any).from("tasks").insert({
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        created_by: user?.id,
        operations_section_id: createTaskForSection.id,
        completed: false,
      });
      if (err) throw err;
      toast({ title: "Task added", description: `"${taskTitle.trim()}" linked to ${createTaskForSection.title}` });
      setLinkedRefresh(r => r + 1);
      setCreateTaskForSection(null);
      setTaskTitle(""); setTaskDescription("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const formatDateShort = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return ""; }
  };

  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

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

  const startEditing = (s: HandbookSection) => {
    setEditTitle(s.title);
    editContentRef.current = s.content || "";
    setEditingId(s.id);
  };

  const cancelEditing = () => { setEditingId(null); setEditTitle(""); editContentRef.current = ""; };

  const handleSave = (id: string) => {
    const container = contentRef.current;
    const scrollPos = container ? container.scrollTop : 0;
    updateSection.mutate(
      { id, title: editTitle.trim(), content: editContentRef.current, userId: user?.id || "" },
      {
        onSuccess: () => {
          cancelEditing();
          toast({ title: "Section saved" });
          requestAnimationFrame(() => {
            if (container) container.scrollTop = scrollPos;
          });
        },
        onError: (e: any) => toast({ title: "Error saving", description: e.message, variant: "destructive" }),
      }
    );
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

  const handleReorder = async (sectionId: string, direction: "up" | "down") => {
    const section = allSections?.find(s => s.id === sectionId);
    if (!section) return;
    const siblings = [...(section.parent_id ? getSubsections(section.parent_id) : topSections)];
    const idx = siblings.findIndex(s => s.id === sectionId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    [siblings[idx], siblings[swapIdx]] = [siblings[swapIdx], siblings[idx]];
    for (let i = 0; i < siblings.length; i++) {
      const { error } = await (supabase as any)
        .from("handbook_sections")
        .update({ display_order: i * 10 })
        .eq("id", siblings[i].id);
      if (error) {
        console.error("Reorder error:", error);
        toast({ title: "Reorder failed", description: error.message || JSON.stringify(error), variant: "destructive" });
        return;
      }
    }
    queryClient.invalidateQueries({ queryKey: ["handbook-sections"] });
    toast({ title: "Reordered" });
  };

  // ── TOC Item ─────────────────────────────────────────────────────────
  const TocItem = ({ section, depth = 0 }: { section: HandbookSection; depth?: number }) => {
    const subs = getSubsections(section.id);
    const isActive = activeSectionId === section.id || subs.some(s => s.id === activeSectionId);
    const isCollapsed = collapsedToc[section.id];
    const siblings = section.parent_id ? getSubsections(section.parent_id) : topSections;
    const idx = siblings.findIndex(s => s.id === section.id);

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            onClick={() => { if (subs.length > 0) setCollapsedToc(p => ({ ...p, [section.id]: !p[section.id] })); else scrollTo(section.id); }}
            style={{
              flex: 1, display: "flex", alignItems: "center", overflow: "hidden", minWidth: 0,
              padding: depth === 0 ? "6px 14px" : "4px 14px 4px 44px",
              fontSize: depth === 0 ? 13 : 12,
              color: isActive ? "#415162" : "#777",
              fontWeight: isActive ? 600 : 400,
              background: isActive ? "#F0F2F4" : "transparent",
              borderLeft: isActive && depth === 0 ? "3px solid #415162" : "3px solid transparent",
              border: "none", borderRight: "none", borderTop: "none", borderBottom: "none",
              cursor: "pointer", textAlign: "left",
            }}
          >
            {depth === 0 && (
              subs.length > 0 ? (
                isCollapsed
                  ? <ChevronRight style={{ width: 13, height: 13, flexShrink: 0, marginRight: 6, color: "#aaa" }} />
                  : <ChevronDown style={{ width: 13, height: 13, flexShrink: 0, marginRight: 6, color: "#aaa" }} />
              ) : (
                <div style={{ width: 13, flexShrink: 0, marginRight: 6 }} />
              )
            )}
            <span onClick={(e) => { e.stopPropagation(); scrollTo(section.id); }} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>{section.title}</span>
          </button>
          {canEdit && depth === 0 && (
            <div style={{ display: "flex", gap: 2, marginRight: 4, zIndex: 50 }} onClick={e => e.stopPropagation()}>
              {idx > 0 && (
                <div
                  onPointerDown={(e) => { e.stopPropagation(); handleReorder(section.id, "up"); }}
                  style={{ padding: 4, color: "#999", display: "flex", cursor: "pointer", WebkitTapHighlightColor: "transparent", userSelect: "none" }}
                >
                  <ArrowUp style={{ width: 14, height: 14 }} />
                </div>
              )}
              {idx < siblings.length - 1 && (
                <div
                  onPointerDown={(e) => { e.stopPropagation(); handleReorder(section.id, "down"); }}
                  style={{ padding: 4, color: "#999", display: "flex", cursor: "pointer", WebkitTapHighlightColor: "transparent", userSelect: "none" }}
                >
                  <ArrowDown style={{ width: 14, height: 14 }} />
                </div>
              )}
            </div>
          )}
        </div>
        {!isCollapsed && subs.map(sub => <TocItem key={sub.id} section={sub} depth={1} />)}
      </div>
    );
  };

  // ── Section Content Block ─────────────────────────────────────────────
  const SectionBlock = ({ section, depth = 0 }: { section: HandbookSection; depth?: number }) => {
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
            <h1 style={{ fontSize: depth === 0 ? 20 : 16, fontWeight: 600, color: "#333", margin: 0, flex: 1 }}>{section.title}</h1>
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
            <SectionTipTapEditor
              content={editContentRef.current}
              onChange={(html) => { editContentRef.current = html; }}
              minHeight={320}
              hideHeadings
            />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 10 }}>
              <button onClick={cancelEditing} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>
                <X style={{ width: 12, height: 12 }} /> Cancel
              </button>
              <button
                onClick={() => handleSave(section.id)}
                disabled={updateSection.isPending}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 12, color: "#fff", background: updateSection.isPending ? "#8a9baa" : "#415162", border: "none", borderRadius: 5, cursor: updateSection.isPending ? "not-allowed" : "pointer" }}
              >
                <Save style={{ width: 12, height: 12 }} /> {updateSection.isPending ? "Saving…" : "Save"}
              </button>
            </div>
            {/* Add event / task / attach file buttons */}
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button
                onClick={() => { setCreateEventForSection(section); setEventTitle(section.title); setEventDate(new Date().toISOString().split("T")[0]); setEventCategory("program"); }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11, color: "#415162", background: "#fff", border: "0.5px solid #C9CED4", borderRadius: 4, cursor: "pointer" }}
              >
                <CalendarPlus style={{ width: 11, height: 11 }} /> Add event
              </button>
              <button
                onClick={() => { setCreateTaskForSection(section); setTaskTitle(""); setTaskDescription(""); }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11, color: "#415162", background: "#fff", border: "0.5px solid #C9CED4", borderRadius: 4, cursor: "pointer" }}
              >
                <CheckSquare style={{ width: 11, height: 11 }} /> Add task
              </button>
              <button
                onClick={() => { setUploadingSectionId(section.id); setTimeout(() => fileInputRef.current?.click(), 50); }}
                disabled={!!uploadingSectionId}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11, color: "#415162", background: "#fff", border: "0.5px solid #C9CED4", borderRadius: 4, cursor: "pointer" }}
              >
                <Paperclip style={{ width: 11, height: 11 }} /> {uploadingSectionId === section.id ? "Uploading…" : "Attach file"}
              </button>
            </div>
          </>
        ) : (
          <>
            {section.content ? (
              <SectionTipTapEditor content={section.content} onChange={() => {}} readOnly />
            ) : (
              <p style={{ fontSize: 14, color: "#bbb", fontStyle: "italic" }}>No content yet. {canEdit && "Click Edit to add content."}</p>
            )}
          </>
        )}

        {/* Linked events, tasks & files — visible in edit mode regardless of section edit state */}
        {canEdit && (() => {
          const sectionEvents = linkedEvents[section.id] || [];
          const sectionTasks = linkedTasks[section.id] || [];
          const sectionFiles = linkedFiles[section.id] || [];
          if (sectionEvents.length === 0 && sectionTasks.length === 0 && sectionFiles.length === 0) return null;
          return (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {sectionEvents.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#8a9baa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Linked events</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {sectionEvents.map((ev: any) => (
                      <div key={ev.id} onClick={() => navigate("/events")}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#fff", border: "0.5px solid #D5DAE0", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>
                        <Calendar style={{ width: 12, height: 12, color: "#415162", flexShrink: 0 }} />
                        <span style={{ flex: 1, color: "#333", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</span>
                        {ev.category && (
                          <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "#F5F3EE", color: "#52657A", flexShrink: 0 }}>
                            {EVENT_CATEGORY_LABELS[ev.category as EventCategory] || ev.category}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "#999", flexShrink: 0 }}>{formatDateShort(ev.event_date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sectionTasks.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#8a9baa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Linked tasks</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {sectionTasks.map((t: any) => (
                      <div key={t.id} onClick={() => navigate("/tasks")}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#fff", border: "0.5px solid #D5DAE0", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>
                        <CheckSquare style={{ width: 12, height: 12, color: t.completed ? "#4A846C" : "#415162", flexShrink: 0 }} />
                        <span style={{ flex: 1, color: t.completed ? "#999" : "#333", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: t.completed ? "line-through" : "none" }}>{t.title}</span>
                        {t.due_date && <span style={{ fontSize: 11, color: "#999", flexShrink: 0 }}>{formatDateShort(t.due_date)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sectionFiles.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#8a9baa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Attached files</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {sectionFiles.map((f: any) => (
                      <div key={f.id}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#fff", border: "0.5px solid #D5DAE0", borderRadius: 5, fontSize: 12 }}>
                        <Paperclip style={{ width: 12, height: 12, color: "#415162", flexShrink: 0 }} />
                        <a href={getFileUrl(f.file_path)} target="_blank" rel="noopener noreferrer"
                          style={{ flex: 1, color: "#415162", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "underline" }}>
                          {f.file_name}
                        </a>
                        {f.file_size && <span style={{ fontSize: 10, color: "#999", flexShrink: 0 }}>{(f.file_size / 1024).toFixed(0)} KB</span>}
                        <button onClick={() => handleDeleteFile(f.id, f.file_path)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, color: "#c44", flexShrink: 0 }}>
                          <X style={{ width: 11, height: 11 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Subsections */}
        {depth === 0 && subs.length > 0 && (
          <div style={{ marginTop: 24, borderLeft: "2px solid #E7EBEF", paddingLeft: 16 }}>
            {subs.map(sub => <SectionBlock key={sub.id} section={sub} depth={1} />)}
          </div>
        )}

        {/* Add subsection button */}
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
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <button
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) clearSearch(); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
              title="Search"
            >
              {searchOpen ? <X style={{ width: 18, height: 18 }} /> : <Search style={{ width: 18, height: 18 }} />}
            </button>
            <NotificationBell />
          </HeaderLogo>
        </div>
        {searchOpen && (
          <div style={{ padding: "0 16px 12px" }}>
            <DocumentSearchBar
              query={searchQuery}
              isSearching={isSearching}
              results={searchResults}
              onSearch={(q) => doSearch(q, "handbook")}
              onClear={clearSearch}
              onResultClick={(r) => { clearSearch(); setSearchOpen(false); scrollTo(r.id); }}
              sectionTitles={sectionTitles}
            />
          </div>
        )}
      </header>

      <div style={{ display: "flex", height: "calc(100vh - 56px)", position: "relative", overflow: "hidden" }}>
        {tocOpen && <div style={{ position: "absolute", inset: 0, zIndex: 30, background: "rgba(0,0,0,0.3)" }} onClick={() => setTocOpen(false)} />}

        <aside style={{
          position: "absolute", top: 0, left: 0, zIndex: 40, height: "100%",
          width: 300, minWidth: 300, background: "#F5F3EE", borderRight: "1px solid #E7EBEF",
          overflowY: "auto", transform: tocOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.2s ease",
        }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #E7EBEF" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#415162", textTransform: "uppercase", letterSpacing: 0.8 }}>Program Handbook</div>
          </div>
          <nav style={{ padding: "6px 0" }}>
            {isLoading && <div style={{ padding: "16px", fontSize: 13, color: "#999" }}>Loading…</div>}
            {error && <div style={{ padding: "16px", fontSize: 13, color: "#c44" }}>Failed to load sections.</div>}
            {topSections.map(s => <TocItem key={s.id} section={s} />)}
          </nav>

          {canEdit && (
            <div style={{ padding: "10px 12px", borderTop: "1px solid #E7EBEF" }}>
              {addingParentId === null ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input autoFocus value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAddSection(null); if (e.key === "Escape") { setAddingParentId(undefined); setNewSectionTitle(""); } }} placeholder="New section title…" style={{ padding: "6px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleAddSection(null)} style={{ flex: 1, padding: "5px 0", fontSize: 12, color: "#fff", background: "#415162", border: "none", borderRadius: 5, cursor: "pointer" }}>Add</button>
                    <button onClick={() => { setAddingParentId(undefined); setNewSectionTitle(""); }} style={{ padding: "5px 10px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddingParentId(null); setNewSectionTitle(""); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 10px", fontSize: 12, color: "#415162", background: "#F0F2F4", border: "1px dashed #C9CED4", borderRadius: 6, cursor: "pointer" }}>
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

        <div ref={contentRef} style={{ flex: 1, overflowY: "auto", padding: "24px 20px 120px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setTocOpen(!tocOpen)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "#5F7285", flexShrink: 0 }}
              title="Table of Contents"
            >
              <Menu style={{ width: 20, height: 20 }} />
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#2D3748", margin: 0 }}>Program Handbook</h1>
          </div>

          {/* Top bar: Read/Edit toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            {hasEditPerm ? (
              <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "0.5px solid #C9CED4" }}>
                <button
                  onClick={() => setViewAsReader(true)}
                  style={{
                    padding: "5px 14px", fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer",
                    background: viewAsReader ? "#415162" : "#fff",
                    color: viewAsReader ? "#fff" : "#5F7285",
                  }}
                >
                  Read
                </button>
                <button
                  onClick={() => setViewAsReader(false)}
                  style={{
                    padding: "5px 14px", fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer",
                    background: !viewAsReader ? "#415162" : "#fff",
                    color: !viewAsReader ? "#fff" : "#5F7285",
                  }}
                >
                  Edit
                </button>
              </div>
            ) : <div />}
          </div>

            {isLoading && <div style={{ color: "#999", fontSize: 14, padding: "40px 0", textAlign: "center" }}>Loading handbook…</div>}
            {error && <div style={{ color: "#c44", fontSize: 14 }}>Failed to load. Please refresh.</div>}
            {topSections.map(s => <SectionBlock key={s.id} section={s} />)}
          </div>
        </div>
      </div>

      {confirmDeleteId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 340, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#333", margin: "0 0 8px" }}>Delete section?</h3>
            <p style={{ fontSize: 13, color: "#777", margin: "0 0 20px", lineHeight: 1.5 }}>This will permanently delete the section and all its subsections. This cannot be undone.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "8px 16px", fontSize: 13, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDeleteId)} style={{ padding: "8px 16px", fontSize: 13, color: "#fff", background: "#c44444", border: "none", borderRadius: 6, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden global file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => { if (uploadingSectionId) handleFileUpload(uploadingSectionId, e.target.files); }}
      />

      {/* Add Event dialog */}
      {createEventForSection && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(65,81,98,0.45)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#F5F3EE", borderRadius: 10, padding: 20, maxWidth: 400, width: "100%", border: "1px solid #C9CED4" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#2D3748", margin: 0 }}>Add event</h3>
              <button onClick={() => setCreateEventForSection(null)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, color: "#aaa" }}><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <p style={{ fontSize: 12, color: "#5F7285", marginBottom: 16 }}>Linked to: {createEventForSection.title}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>Title</label>
                <input value={eventTitle} onChange={e => setEventTitle(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>Date</label>
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>Category</label>
                <select value={eventCategory} onChange={e => setEventCategory(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", boxSizing: "border-box" }}>
                  <option value="program">Program</option>
                  <option value="didactic">Didactic</option>
                </select>
              </div>
            </div>
            <button onClick={handleCreateEvent} disabled={!eventTitle.trim()}
              className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "#415162", marginTop: 16 }}>
              Save event
            </button>
          </div>
        </div>
      )}

      {/* Add Task dialog */}
      {createTaskForSection && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(65,81,98,0.45)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#F5F3EE", borderRadius: 10, padding: 20, maxWidth: 400, width: "100%", border: "1px solid #C9CED4" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#2D3748", margin: 0 }}>Add task</h3>
              <button onClick={() => setCreateTaskForSection(null)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, color: "#aaa" }}><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <p style={{ fontSize: 12, color: "#5F7285", marginBottom: 16 }}>Linked to: {createTaskForSection.title}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>Title</label>
                <input autoFocus value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && taskTitle.trim()) handleCreateTask(); }}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>Description (optional)</label>
                <textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)} rows={3}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", resize: "vertical", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={handleCreateTask} disabled={!taskTitle.trim()}
              className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "#415162", marginTop: 16 }}>
              Save task
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Handbook;
