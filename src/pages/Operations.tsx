import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Home, Phone, Calendar, Clock, Shield, Repeat, FileText, TrendingUp,
  BookOpen, CalendarOff, CheckSquare, Moon, RefreshCw, Shirt, Heart,
  ShieldCheck, Globe, Coffee, AlertTriangle, MessageSquare, Layers,
  Users, AlertCircle, Monitor, Pencil, X, Save,
  Plus, ChevronDown, ChevronUp, ChevronRight, Trash2, Menu,
  CalendarPlus, ClipboardList, Eye, Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useUserRole } from "@/hooks/useUserRole";
import { useOperations, useOperationsMutations, OperationsSection } from "@/hooks/useOperations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import { TaskTemplatesSection } from "@/components/operations/TaskTemplatesSection";
import SectionTipTapEditor from "@/components/shared/SectionTipTapEditor";
import { EVENT_CATEGORY_LABELS } from "@/hooks/useEvents";
import type { EventCategory } from "@/hooks/useEvents";
import { useDocumentSearch } from "@/hooks/useDocumentSearch";
import DocumentSearchBar from "@/components/shared/DocumentSearchBar";
import { usePermissions } from "@/hooks/usePermissions";

const iconMap: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  home: Home, phone: Phone, calendar: Calendar, clock: Clock, shield: Shield,
  repeat: Repeat, "file-text": FileText, "trending-up": TrendingUp,
  "book-open": BookOpen, "calendar-off": CalendarOff, "check-square": CheckSquare,
  moon: Moon, "refresh-cw": RefreshCw, shirt: Shirt, heart: Heart,
  "shield-check": ShieldCheck, globe: Globe, coffee: Coffee,
  "alert-triangle": AlertTriangle, "message-square": MessageSquare,
  layers: Layers, users: Users, "alert-circle": AlertCircle, monitor: Monitor,
};

const Operations = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { has: hasPerm } = usePermissions();
  const hasEditPerm = hasPerm("operations.edit");
  const [viewAsReader, setViewAsReader] = useState(false);
  const canEdit = hasEditPerm && !viewAsReader;
  const { data: allSections, isLoading, error } = useOperations();
  const { updateSection, addSection, deleteSection, reorderSection } = useOperationsMutations();
  const { toast } = useToast();
  const { results: searchResults, isSearching, query: searchQuery, search: doSearch, clear: clearSearch } = useDocumentSearch();

  const topSections = (allSections || []).filter(s => !s.parent_id);
  const getSubsections = (parentId: string) => (allSections || []).filter(s => s.parent_id === parentId);

  // Linked events & task templates per section
  const [linkedEvents, setLinkedEvents] = useState<Record<string, any[]>>({});
  const [linkedTemplates, setLinkedTemplates] = useState<Record<string, any[]>>({});
  const [linkedRefresh, setLinkedRefresh] = useState(0);

  useEffect(() => {
    if (!allSections?.length) return;
    const sectionIds = allSections.map(s => s.id);
    // Fetch events linked to operations sections
    // Cast to 'any' to bypass typed client rejecting unknown column in .in() filter
    (supabase
      .from("events")
      .select("id, title, event_date, category, operations_section_id") as any)
      .in("operations_section_id", sectionIds)
      .eq("archived", false)
      .order("event_date", { ascending: true })
      .then(({ data, error }: { data: any[]; error: any }) => {
        if (error) { console.error("Linked events fetch error:", error); return; }
        const grouped: Record<string, any[]> = {};
        (data || []).forEach((e: any) => {
          const sid = e.operations_section_id;
          if (!sid) return;
          if (!grouped[sid]) grouped[sid] = [];
          grouped[sid].push(e);
        });
        setLinkedEvents(grouped);
      });
    // Fetch task templates linked to operations sections
    (supabase
      .from("task_templates")
      .select("id, name, category, operations_section_id") as any)
      .in("operations_section_id", sectionIds)
      .then(({ data, error }: { data: any[]; error: any }) => {
        if (error) { console.error("Linked templates fetch error:", error); return; }
        const grouped: Record<string, any[]> = {};
        (data || []).forEach((t: any) => {
          const sid = t.operations_section_id;
          if (!sid) return;
          if (!grouped[sid]) grouped[sid] = [];
          grouped[sid].push(t);
        });
        setLinkedTemplates(grouped);
      });
  }, [allSections, linkedRefresh]);

  // Map of section id → title for showing parent names in search results
  const sectionTitles: Record<string, string> = {};
  (allSections || []).forEach(s => { sectionTitles[s.id] = s.title; });

  const [tocOpen, setTocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsedToc, setCollapsedToc] = useState<Record<string, boolean>>({});
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [addingParentId, setAddingParentId] = useState<string | null | undefined>(undefined);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create Event dialog state
  const [createEventForSection, setCreateEventForSection] = useState<OperationsSection | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [eventCategory, setEventCategory] = useState<EventCategory>("program");
  const [eventDescription, setEventDescription] = useState("");

  // Create Task Template dialog state
  const [createTemplateForSection, setCreateTemplateForSection] = useState<OperationsSection | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

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

  // Auto-scroll to section from ?section= query param
  useEffect(() => {
    const sectionId = searchParams.get("section");
    if (sectionId && allSections?.length) {
      setTimeout(() => scrollTo(sectionId), 300);
      setSearchParams({}, { replace: true });
    }
  }, [allSections, searchParams]);

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
    setEditContent(s.content || "");
    setEditingId(s.id);
  };

  const cancelEditing = () => { setEditingId(null); setEditTitle(""); setEditContent(""); };

  const handleSave = (id: string) => {
    updateSection.mutate(
      { id, title: editTitle.trim(), content: editContent, userId: user?.id || "" },
      {
        onSuccess: () => { cancelEditing(); toast({ title: "Section saved" }); },
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

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !createEventForSection) return;
    try {
      const { error } = await supabase
        .from("events")
        .insert({
          title: eventTitle.trim(),
          event_date: eventDate,
          category: eventCategory,
          description: eventDescription.trim() || `Linked to Operations Manual: ${createEventForSection.title}`,
          created_by: user?.id,
          recurrence_pattern: "none",
          recurrence_confirmed: false,
          archived: false,
          operations_section_id: createEventForSection.id,
        } as any);
      if (error) throw error;
      toast({ title: "Event created", description: `"${eventTitle.trim()}" added to Events` });
      setLinkedRefresh(r => r + 1);
      setCreateEventForSection(null);
      setEventTitle("");
      setEventDescription("");
    } catch (e: any) {
      toast({ title: "Error creating event", description: e.message, variant: "destructive" });
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || !createTemplateForSection) return;
    try {
      const { error } = await supabase
        .from("task_templates")
        .insert({
          name: templateName.trim(),
          description: templateDescription.trim() || `From Operations Manual: ${createTemplateForSection.title}`,
          category: templateCategory || null,
          created_by: user?.id,
          operations_section_id: createTemplateForSection.id,
        } as any);
      if (error) throw error;
      toast({ title: "Template created", description: `"${templateName.trim()}" added to Task Templates` });
      setLinkedRefresh(r => r + 1);
      setCreateTemplateForSection(null);
      setTemplateName("");
      setTemplateDescription("");
      setTemplateCategory("");
    } catch (e: any) {
      toast({ title: "Error creating template", description: e.message, variant: "destructive" });
    }
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
            {depth === 0 && <Icon style={{ flexShrink: 0, opacity: isActive ? 1 : 0.55, width: 15, height: 15 }} />}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{section.title}</span>
          </button>
        </div>
        {!isCollapsed && subs.map(sub => <TocItem key={sub.id} section={sub} depth={1} />)}
      </div>
    );
  };

  // ── Section Content Block ─────────────────────────────────────────────
  const SectionBlock = ({ section, depth = 0, index, totalSiblings }: { section: OperationsSection; depth?: number; index?: number; totalSiblings?: number }) => {
    const subs = getSubsections(section.id);
    const isEditing = editingId === section.id;
    const isFirst = index === 0;
    const isLast = index !== undefined && totalSiblings !== undefined && index === totalSiblings - 1;

    const handleMoveUp = () => {
      if (isFirst || index === undefined) return;
      const siblings = section.parent_id ? getSubsections(section.parent_id) : topSections;
      const prev = siblings[index - 1];
      if (!prev) return;
      reorderSection.mutate({ id: section.id, newOrder: prev.display_order });
      reorderSection.mutate({ id: prev.id, newOrder: section.display_order });
    };

    const handleMoveDown = () => {
      if (isLast || index === undefined) return;
      const siblings = section.parent_id ? getSubsections(section.parent_id) : topSections;
      const next = siblings[index + 1];
      if (!next) return;
      reorderSection.mutate({ id: section.id, newOrder: next.display_order });
      reorderSection.mutate({ id: next.id, newOrder: section.display_order });
    };

    return (
      <div
        ref={el => { if (el) sectionRefs.current.set(section.id, el); }}
        style={{ marginBottom: depth === 0 ? 52 : 32 }}
      >
       {isEditing && depth === 0 ? (
        /* ── Three-zone editing layout ── */
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #C9CED4" }}>
          {/* Zone 1: Dark header bar */}
          <div style={{ background: "#415162", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 2 }}>
                <button onClick={handleMoveUp} disabled={isFirst}
                  style={{ width: 20, height: 18, display: "flex", alignItems: "center", justifyContent: "center", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: 3, background: "transparent", color: isFirst ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", cursor: isFirst ? "default" : "pointer" }}>
                  <ChevronUp style={{ width: 11, height: 11 }} />
                </button>
                <button onClick={handleMoveDown} disabled={isLast}
                  style={{ width: 20, height: 18, display: "flex", alignItems: "center", justifyContent: "center", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: 3, background: "transparent", color: isLast ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", cursor: isLast ? "default" : "pointer" }}>
                  <ChevronDown style={{ width: 11, height: 11 }} />
                </button>
              </div>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{ fontSize: 15, fontWeight: 500, color: "#fff", background: "transparent", border: "none", outline: "none", flex: 1, minWidth: 0 }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={cancelEditing}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 11, color: "rgba(255,255,255,0.7)", background: "transparent", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: 4, cursor: "pointer" }}>
                <X style={{ width: 10, height: 10 }} /> Cancel
              </button>
              <button onClick={() => handleSave(section.id)} disabled={updateSection.isPending}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 11, color: "#fff", background: "rgba(255,255,255,0.15)", border: "0.5px solid rgba(255,255,255,0.3)", borderRadius: 4, cursor: updateSection.isPending ? "not-allowed" : "pointer" }}>
                <Save style={{ width: 10, height: 10 }} /> {updateSection.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {/* Zone 2: Cream editor area */}
          <div style={{ padding: 16, background: "#F5F3EE" }}>
            <div style={{ fontSize: 11, color: "#bbb", marginBottom: 10 }}>Updated {formatDate(section.updated_at)}</div>
            <SectionTipTapEditor
              content={editContent}
              onChange={setEditContent}
              minHeight={280}
            />
          </div>

          {/* Zone 3: Gray footer — subsections, linked items, action buttons */}
          <div style={{ padding: "12px 16px 14px", background: "#E7EBEF", borderTop: "1px solid #D5DAE0" }}>
            {/* Subsections */}
            {subs.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {subs.map(sub => (
                  <div key={sub.id} style={{ borderLeft: "2px solid #C9CED4", paddingLeft: 14, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <h3 style={{ fontSize: 14, fontWeight: 500, color: "#333", margin: 0 }}>{sub.title}</h3>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => startEditing(sub)} style={{ fontSize: 11, color: "#415162", padding: "3px 8px", background: "#fff", border: "0.5px solid #C9CED4", borderRadius: 4, cursor: "pointer" }}>
                          <Pencil style={{ width: 10, height: 10 }} />
                        </button>
                        <button onClick={() => setConfirmDeleteId(sub.id)} style={{ fontSize: 11, color: "#c44", padding: "3px 6px", background: "#fff", border: "0.5px solid #f0c0c0", borderRadius: 4, cursor: "pointer" }}>
                          <Trash2 style={{ width: 10, height: 10 }} />
                        </button>
                      </div>
                    </div>
                    {sub.content && (
                      <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>
                        <SectionTipTapEditor content={sub.content} onChange={() => {}} readOnly />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add subsection + Create buttons row */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {addingParentId === section.id ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center", width: "100%", marginBottom: 6 }}>
                  <input
                    autoFocus
                    value={newSectionTitle}
                    onChange={e => setNewSectionTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAddSection(section.id); if (e.key === "Escape") { setAddingParentId(undefined); setNewSectionTitle(""); } }}
                    placeholder="Subsection title…"
                    style={{ flex: 1, padding: "5px 10px", fontSize: 12, border: "1px solid #C9CED4", borderRadius: 5, outline: "none", background: "#fff" }}
                  />
                  <button onClick={() => handleAddSection(section.id)} style={{ padding: "5px 10px", fontSize: 11, color: "#fff", background: "#415162", border: "none", borderRadius: 4, cursor: "pointer" }}>Add</button>
                  <button onClick={() => { setAddingParentId(undefined); setNewSectionTitle(""); }} style={{ padding: "5px 8px", fontSize: 11, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 4, cursor: "pointer" }}>Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingParentId(section.id); setNewSectionTitle(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11, color: "#999", background: "transparent", border: "0.5px dashed #C9CED4", borderRadius: 4, cursor: "pointer" }}
                >
                  <Plus style={{ width: 11, height: 11 }} /> Add subsection
                </button>
              )}
              <button
                onClick={() => {
                  setCreateEventForSection(section);
                  setEventTitle(section.title);
                  setEventDescription(`Linked to Operations Manual: ${section.title}`);
                  setEventDate(new Date().toISOString().split("T")[0]);
                  setEventCategory("program");
                }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11, color: "#415162", background: "#fff", border: "0.5px solid #C9CED4", borderRadius: 4, cursor: "pointer" }}
              >
                <CalendarPlus style={{ width: 11, height: 11 }} /> Create event
              </button>
              <button
                onClick={() => {
                  setCreateTemplateForSection(section);
                  setTemplateName(`${section.title} Prep`);
                  setTemplateDescription(`From Operations Manual: ${section.title}`);
                  setTemplateCategory("");
                }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11, color: "#415162", background: "#fff", border: "0.5px solid #C9CED4", borderRadius: 4, cursor: "pointer" }}
              >
                <ClipboardList style={{ width: 11, height: 11 }} /> Create template
              </button>
            </div>

            {/* Linked events & templates */}
            {(() => {
              const sectionEvents = linkedEvents[section.id] || [];
              const sectionTemplates = linkedTemplates[section.id] || [];
              if (sectionEvents.length === 0 && sectionTemplates.length === 0) return null;
              return (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {sectionEvents.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#8a9baa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Linked Events</div>
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
                            <span style={{ fontSize: 11, color: "#999", flexShrink: 0 }}>{formatDate(ev.event_date)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {sectionTemplates.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#8a9baa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Linked Task Templates</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {sectionTemplates.map((t: any) => (
                          <div key={t.id} onClick={() => { const el = document.getElementById("task-templates-section"); if (el) el.scrollIntoView({ behavior: "smooth" }); }}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#fff", border: "0.5px solid #D5DAE0", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>
                            <ClipboardList style={{ width: 12, height: 12, color: "#415162", flexShrink: 0 }} />
                            <span style={{ flex: 1, color: "#333", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                            {t.category && (
                              <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "#F5F3EE", color: "#52657A", flexShrink: 0 }}>{t.category}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
       ) : (
        /* ── Reader / non-editing layout ── */
        <>
        <div>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <h1 style={{ fontSize: depth === 0 ? 20 : 16, fontWeight: 600, color: "#333", margin: 0, flex: 1 }}>{section.title}</h1>
            {canEdit && (
              <div style={{ display: "flex", gap: 4, flexShrink: 0, marginTop: 2 }}>
                <button onClick={() => startEditing(section)} title="Edit"
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, color: "#415162", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>
                  <Pencil style={{ width: 12, height: 12 }} /> Edit
                </button>
                <button onClick={() => setConfirmDeleteId(section.id)} title="Delete"
                  style={{ display: "flex", alignItems: "center", padding: "5px 8px", fontSize: 12, color: "#c44", background: "transparent", border: "1px solid #f0c0c0", borderRadius: 5, cursor: "pointer" }}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            )}
          </div>

          <div style={{ fontSize: 11, color: "#bbb", marginBottom: 16, marginTop: 4 }}>
            Updated {formatDate(section.updated_at)}
          </div>

          {section.content ? (
            <SectionTipTapEditor content={section.content} onChange={() => {}} readOnly />
          ) : (
            <p style={{ fontSize: 14, color: "#bbb", fontStyle: "italic" }}>No content yet. {canEdit && "Click Edit to add content."}</p>
          )}

          {/* Subsections */}
          {depth === 0 && subs.length > 0 && (
            <div style={{ marginTop: 24, borderLeft: "2px solid #E7EBEF", paddingLeft: 16 }}>
              {subs.map(sub => <SectionBlock key={sub.id} section={sub} depth={1} />)}
            </div>
          )}
        </div>
        {depth === 0 && <div style={{ borderBottom: "1px solid #E0DDD8", marginTop: 28 }} />}
        </>
       )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      {/* Header */}
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
              onSearch={(q) => doSearch(q, "operations")}
              onClear={clearSearch}
              onResultClick={(r) => { clearSearch(); setSearchOpen(false); scrollTo(r.id); }}
              sectionTitles={sectionTitles}
            />
          </div>
        )}
      </header>

      <div style={{ display: "flex", height: "calc(100vh - 56px)", position: "relative", overflow: "hidden" }}>
        {tocOpen && (
          <div
            style={{ position: "absolute", inset: 0, zIndex: 30, background: "rgba(0,0,0,0.3)" }}
            onClick={() => setTocOpen(false)}
          />
        )}

        {/* Sidebar TOC */}
        <aside
          style={{
            position: "absolute", top: 0, left: 0, zIndex: 40,
            height: "100%", width: 256, minWidth: 256,
            background: "#fff", borderRight: "1px solid #E7EBEF",
            overflowY: "auto",
            transform: tocOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.2s ease",
          }}
        >
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #E7EBEF" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#415162", textTransform: "uppercase", letterSpacing: 0.8 }}>Operations Manual</div>
          </div>

          <nav style={{ padding: "6px 0" }}>
            {isLoading && <div style={{ padding: "16px", fontSize: 13, color: "#999" }}>Loading…</div>}
            {error && <div style={{ padding: "16px", fontSize: 13, color: "#c44" }}>Failed to load sections.</div>}
            {topSections.map(s => <TocItem key={s.id} section={s} />)}
            {/* Static TOC entry for Task Templates — editor mode only */}
            {canEdit && (
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
            )}
          </nav>


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
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
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

          {/* Toolbar row: pill toggle + Add section */}
          {hasEditPerm && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                onClick={() => setViewAsReader(!viewAsReader)}
                style={{
                  display: "inline-flex", position: "relative",
                  background: "#E7EBEF", borderRadius: 17,
                  padding: 3, width: 62, height: 34,
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: 3,
                  width: 28, height: 28,
                  background: "#415162", borderRadius: "50%",
                  transition: "left 0.2s ease",
                  left: viewAsReader ? 3 : 31,
                }} />
                <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100%" }}>
                  <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Eye style={{ width: 14, height: 14, color: viewAsReader ? "#fff" : "#888", transition: "color 0.2s" }} />
                  </div>
                  <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Pencil style={{ width: 14, height: 14, color: !viewAsReader ? "#fff" : "#888", transition: "color 0.2s" }} />
                  </div>
                </div>
              </div>
              {canEdit && (
                addingParentId === null ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      autoFocus
                      value={newSectionTitle}
                      onChange={e => setNewSectionTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAddSection(null); if (e.key === "Escape") { setAddingParentId(undefined); setNewSectionTitle(""); } }}
                      placeholder="Section title…"
                      style={{ padding: "6px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", width: 180 }}
                    />
                    <button onClick={() => handleAddSection(null)} style={{ padding: "6px 12px", fontSize: 12, color: "#fff", background: "#415162", border: "none", borderRadius: 5, cursor: "pointer" }}>Add</button>
                    <button onClick={() => { setAddingParentId(undefined); setNewSectionTitle(""); }} style={{ padding: "6px 10px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingParentId(null); setNewSectionTitle(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", fontSize: 12, fontWeight: 500, color: "#415162", background: "#E7EBEF", border: "1px solid #C9CED4", borderRadius: 6, cursor: "pointer" }}
                  >
                    <Plus style={{ width: 13, height: 13 }} /> Add section
                  </button>
                )
              )}
            </div>
          )}

            {isLoading && <div style={{ color: "#999", fontSize: 14, padding: "40px 0", textAlign: "center" }}>Loading operations manual…</div>}
            {error && <div style={{ color: "#c44", fontSize: 14 }}>Failed to load. Please refresh.</div>}
            {topSections.map((s, i) => <SectionBlock key={s.id} section={s} index={i} totalSiblings={topSections.length} />)}

            {/* Task Templates — only in editor mode */}
            {!isLoading && canEdit && (
              <div style={{ marginBottom: 52 }} ref={el => { if (el) sectionRefs.current.set("task-templates", el); }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 600, color: "#333", margin: 0 }}>Task Templates</h1>
                </div>
                <div id="task-templates-section" style={{ fontSize: 11, color: "#bbb", marginBottom: 18 }}>
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

      {/* Create Event dialog */}
      {createEventForSection && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 400, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#333" }}>Create Event</h3>
              <button onClick={() => setCreateEventForSection(null)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, color: "#aaa" }}><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>From section: {createEventForSection.title}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Event title</label>
                <input value={eventTitle} onChange={e => setEventTitle(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Date</label>
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Category</label>
                <select value={eventCategory} onChange={e => setEventCategory(e.target.value as EventCategory)}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", boxSizing: "border-box" }}>
                  {(Object.entries(EVENT_CATEGORY_LABELS) as [EventCategory, string][]).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Description (optional)</label>
                <textarea value={eventDescription} onChange={e => setEventDescription(e.target.value)} rows={3}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", resize: "vertical", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setCreateEventForSection(null)} style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 7, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleCreateEvent} disabled={!eventTitle.trim()}
                style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#fff", background: eventTitle.trim() ? "#415162" : "#aaa", border: "none", borderRadius: 7, cursor: eventTitle.trim() ? "pointer" : "not-allowed", fontWeight: 500 }}>
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Template dialog */}
      {createTemplateForSection && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 400, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#333" }}>Create Task Template</h3>
              <button onClick={() => setCreateTemplateForSection(null)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, color: "#aaa" }}><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>From section: {createTemplateForSection.title}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Template name</label>
                <input value={templateName} onChange={e => setTemplateName(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Category</label>
                <select value={templateCategory} onChange={e => setTemplateCategory(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", boxSizing: "border-box", color: templateCategory ? "#333" : "#aaa" }}>
                  <option value="">Select category…</option>
                  <option value="program">Program</option>
                  <option value="didactic">Didactic</option>
                  <option value="committee">Committee</option>
                  <option value="compliance">Compliance</option>
                  <option value="administrative">Administrative</option>
                  <option value="wellness">Wellness</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Description (optional)</label>
                <textarea value={templateDescription} onChange={e => setTemplateDescription(e.target.value)} rows={3}
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", resize: "vertical", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setCreateTemplateForSection(null)} style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 7, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleCreateTemplate} disabled={!templateName.trim()}
                style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#fff", background: templateName.trim() ? "#415162" : "#aaa", border: "none", borderRadius: 7, cursor: templateName.trim() ? "pointer" : "not-allowed", fontWeight: 500 }}>
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Operations;
