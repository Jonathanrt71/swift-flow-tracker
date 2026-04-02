import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Home, Phone, Calendar, Clock, Shield, Repeat, FileText, TrendingUp,
  BookOpen, CalendarOff, CheckSquare, Moon, RefreshCw, Shirt, Heart,
  ShieldCheck, Globe, Coffee, AlertTriangle, MessageSquare, Layers,
  Users, AlertCircle, Monitor, Pencil, X, Save,
  Menu, ChevronDown, ChevronRight, Plus, Trash2, Eye, EyeOff, Search,
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
  const { isAdmin } = useAdmin();
  const { has: hasPerm } = usePermissions();
  const hasEditPerm = hasPerm("handbook.edit");
  const [viewAsReader, setViewAsReader] = useState(true);
  const canEdit = hasEditPerm && !viewAsReader;
  const { data: allSections, isLoading, error } = useHandbook();
  const { updateSection, addSection, deleteSection } = useHandbookMutations();
  const { toast } = useToast();
  const { results: searchResults, isSearching, query: searchQuery, search: doSearch, clear: clearSearch } = useDocumentSearch();

  const topSections = (allSections || []).filter(s => !s.parent_id);
  const getSubsections = (parentId: string) => (allSections || []).filter(s => s.parent_id === parentId);

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

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return ""; }
  };

  // ── TOC Item ─────────────────────────────────────────────────────────
  const TocItem = ({ section, depth = 0 }: { section: HandbookSection; depth?: number }) => {
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
              flex: 1, display: "flex", alignItems: "center", gap: 8, overflow: "hidden", minWidth: 0,
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
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>{section.title}</span>
          </button>
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
              content={editContent}
              onChange={setEditContent}
              minHeight={320}
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
              onClick={() => setTocOpen(!tocOpen)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
              title="Table of Contents"
            >
              <Menu style={{ width: 18, height: 18 }} />
            </button>
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
            <div style={{ fontSize: 11, fontWeight: 600, color: "#415162", textTransform: "uppercase", letterSpacing: 0.8 }}>Resident Handbook</div>
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
          <div style={{ maxWidth: 700, margin: "0 auto" }}>

          {/* Reader view toggle — only shown for users with edit permission */}
          {hasEditPerm && (
            <div style={{ marginBottom: 12 }}>
              <button
                onClick={() => setViewAsReader(!viewAsReader)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 12px", fontSize: 12,
                  color: viewAsReader ? "#fff" : "#415162",
                  background: viewAsReader ? "#415162" : "#E7EBEF",
                  border: "1px solid #C9CED4", borderRadius: 6,
                  cursor: "pointer", fontWeight: 500,
                }}
              >
                {viewAsReader
                  ? <><EyeOff style={{ width: 13, height: 13 }} /> Reader view</>
                  : <><Eye style={{ width: 13, height: 13 }} /> Editor view</>
                }
              </button>
            </div>
          )}

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

    </div>
  );
};

export default Handbook;
