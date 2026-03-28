import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Home, Phone, Calendar, Clock, Shield, Repeat, FileText, TrendingUp,
  BookOpen, CalendarOff, CheckSquare, Moon, RefreshCw, Shirt, Heart,
  ShieldCheck, Globe, Coffee, AlertTriangle, MessageSquare, Layers,
  Users, AlertCircle, Monitor, Pencil, X, Save, Eye, EyeOff,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useHandbook, HandbookSection } from "@/hooks/useHandbook";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import HeaderLogo from "@/components/HeaderLogo";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  home: Home, phone: Phone, calendar: Calendar, clock: Clock, shield: Shield,
  repeat: Repeat, "file-text": FileText, "trending-up": TrendingUp,
  "book-open": BookOpen, "calendar-off": CalendarOff, "check-square": CheckSquare,
  moon: Moon, "refresh-cw": RefreshCw, shirt: Shirt, heart: Heart,
  "shield-check": ShieldCheck, globe: Globe, coffee: Coffee,
  "alert-triangle": AlertTriangle, "message-square": MessageSquare,
  layers: Layers, users: Users, "alert-circle": AlertCircle, monitor: Monitor,
};

/* ── Minimal markdown renderer ── */
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
        <h2 key={key++} style={{ fontSize: 17, fontWeight: 600, color: "#415162", margin: "28px 0 12px", paddingBottom: 6, borderBottom: "1px solid #E7EBEF" }}>
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
              <tr>
                {headerCells.map((h, j) => (
                  <th key={j} style={{ textAlign: "left", padding: "8px 12px", background: "#415162", color: "#fff", fontWeight: 500, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 1 ? "#F5F3EE" : "transparent" }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: "7px 12px", fontSize: 13, borderBottom: "1px solid #E7EBEF", color: "#444" }}>{cell}</td>
                  ))}
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
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={key++} style={{ paddingLeft: 20, margin: "8px 0 16px" }}>
          {items.map((item, j) => (
            <li key={j} style={{ fontSize: 14, lineHeight: 1.7, color: "#555", marginBottom: 4 }}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("  - ")) {
      const items: { text: string; indent: number }[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("  - "))) {
        const indent = lines[i].startsWith("  - ") ? 1 : 0;
        items.push({ text: lines[i].replace(/^\s*- /, ""), indent });
        i++;
      }
      elements.push(
        <ul key={key++} style={{ paddingLeft: 20, margin: "8px 0 16px" }}>
          {items.map((item, j) => (
            <li key={j} style={{ fontSize: 14, lineHeight: 1.7, color: "#555", marginBottom: 4, marginLeft: item.indent * 20 }}>{renderInline(item.text)}</li>
          ))}
        </ul>
      );
      continue;
    }

    elements.push(
      <p key={key++} style={{ fontSize: 14, lineHeight: 1.7, color: "#555", margin: "0 0 12px" }}>{renderInline(line)}</p>
    );
    i++;
  }
  return elements;
}

const Handbook = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { data: sections, isLoading, error } = useHandbook();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Edit state
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Scroll to section from URL param on load
  useEffect(() => {
    const s = searchParams.get("section");
    if (s && sections?.find((sec) => sec.slug === s)) {
      setTimeout(() => scrollToSection(s), 100);
    }
  }, [sections]);

  // Track which section is visible while scrolling
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !sections?.length) return;

    const handleScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      let current = sections[0].slug;
      for (const section of sections) {
        const el = sectionRefs.current.get(section.slug);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top - containerTop <= 80) {
            current = section.slug;
          }
        }
      }
      setActiveSlug(current);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (slug: string) => {
    const el = sectionRefs.current.get(slug);
    const container = contentRef.current;
    if (el && container) {
      const containerTop = container.getBoundingClientRect().top + container.scrollTop;
      const elTop = el.getBoundingClientRect().top + container.scrollTop;
      container.scrollTo({ top: elTop - containerTop - 16, behavior: "smooth" });
    }
    setSearchParams({ section: slug });
    setSidebarOpen(false);
  };

  const startEditing = (section: HandbookSection) => {
    setEditTitle(section.title);
    setEditContent(section.content);
    setShowPreview(false);
    setEditingSlug(section.slug);
  };

  const cancelEditing = () => {
    setEditingSlug(null);
    setEditTitle("");
    setEditContent("");
    setShowPreview(false);
  };

  const saveMutation = useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: string }) => {
      const { error } = await supabase
        .from("handbook_sections")
        .update({
          title,
          content,
          updated_at: new Date().toISOString(),
          updated_by: user?.id || null,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["handbook-sections"] });
      setEditingSlug(null);
      toast({ title: "Section updated", description: "Handbook section saved successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error saving", description: err.message || "Failed to save section.", variant: "destructive" });
    },
  });

  const handleSave = (id: string) => {
    saveMutation.mutate({ id, title: editTitle.trim(), content: editContent });
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return ""; }
  };

  return (
    <div className="min-h-screen" style={{ background: "#F5F3EE" }}>
      <header className="sticky top-0 z-40" style={{ background: "#415162" }}>
        <div className="container flex items-center justify-between h-14 px-4">
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut} />
          <div className="flex items-center gap-1 text-white/50">
            <button
              className="md:hidden bg-transparent border-none cursor-pointer p-2 text-white/70"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sections"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-black/30" onClick={() => setSidebarOpen(false)} />
        )}
        <aside
          className={`fixed md:sticky top-14 z-40 md:z-auto h-[calc(100vh-56px)] overflow-y-auto transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{ width: 250, minWidth: 250, background: "#fff", borderRight: "1px solid #E7EBEF" }}
        >
          <nav style={{ padding: "8px 0" }}>
            {isLoading && <div style={{ padding: "20px 16px", fontSize: 13, color: "#999" }}>Loading...</div>}
            {error && <div style={{ padding: "20px 16px", fontSize: 13, color: "#c44" }}>Failed to load handbook sections.</div>}
            {sections?.map((section) => {
              const Icon = iconMap[section.icon] || FileText;
              const isActive = section.slug === activeSlug;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.slug)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 16px", fontSize: 13,
                    color: isActive ? "#415162" : "#777",
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? "#F0F2F4" : "transparent",
                    borderLeft: isActive ? "3px solid #415162" : "3px solid transparent",
                    border: "none", borderRight: "none", borderTop: "none", borderBottom: "none",
                    cursor: "pointer", textAlign: "left", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#FAFAF8"; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Icon className="h-4 w-4" style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                  <span>{section.title}</span>
                </button>
              );
            })}
          </nav>
          <div style={{ padding: "10px 16px", borderTop: "1px solid #E7EBEF", fontSize: 12, color: "#aaa", display: "flex", justifyContent: "space-between" }}>
            <span>{sections?.length || 0} sections</span>
            <span>AY 2025–2026</span>
          </div>
        </aside>

        {/* Scrollable content — all sections rendered */}
        <div
          ref={contentRef}
          style={{ flex: 1, overflowY: "auto", padding: "24px 40px 120px" }}
        >
          <div style={{ maxWidth: 680 }}>
            {sections?.map((section) => {
              const isEditing = editingSlug === section.slug;
              return (
                <div
                  key={section.id}
                  ref={(el) => { if (el) sectionRefs.current.set(section.slug, el); }}
                  style={{ marginBottom: 48 }}
                >
                  {/* Section header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    {isEditing ? (
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        style={{
                          fontSize: 22, fontWeight: 600, color: "#333",
                          border: "1px solid #C9CED4", borderRadius: 6,
                          padding: "4px 10px", background: "#fff", flex: 1, outline: "none",
                        }}
                      />
                    ) : (
                      <h1 style={{ fontSize: 22, fontWeight: 600, color: "#333", margin: 0 }}>
                        {section.title}
                      </h1>
                    )}
                    {isAdmin && !isEditing && (
                      <button
                        onClick={() => startEditing(section)}
                        title="Edit section"
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "6px 12px", fontSize: 13, color: "#415162",
                          background: "transparent", border: "1px solid #C9CED4",
                          borderRadius: 6, cursor: "pointer", flexShrink: 0, marginTop: 2,
                        }}
                      >
                        <Pencil style={{ width: 14, height: 14 }} />
                        Edit
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: "#aaa", marginBottom: isEditing ? 16 : 20, marginTop: 6 }}>
                    Updated {formatDate(section.updated_at)}
                  </div>

                  {isEditing ? (
                    <>
                      {/* Edit toolbar */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <button
                          onClick={() => setShowPreview(!showPreview)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "5px 10px", fontSize: 12,
                            color: showPreview ? "#415162" : "#888",
                            background: showPreview ? "#E7EBEF" : "transparent",
                            border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer",
                          }}
                        >
                          {showPreview ? <EyeOff style={{ width: 13, height: 13 }} /> : <Eye style={{ width: 13, height: 13 }} />}
                          {showPreview ? "Hide preview" : "Show preview"}
                        </button>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={cancelEditing}
                            style={{
                              display: "flex", alignItems: "center", gap: 5,
                              padding: "6px 14px", fontSize: 13, color: "#777",
                              background: "transparent", border: "1px solid #C9CED4",
                              borderRadius: 6, cursor: "pointer",
                            }}
                          >
                            <X style={{ width: 14, height: 14 }} />
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSave(section.id)}
                            disabled={saveMutation.isPending}
                            style={{
                              display: "flex", alignItems: "center", gap: 5,
                              padding: "6px 14px", fontSize: 13, color: "#fff",
                              background: saveMutation.isPending ? "#8a9baa" : "#415162",
                              border: "none", borderRadius: 6,
                              cursor: saveMutation.isPending ? "not-allowed" : "pointer",
                            }}
                          >
                            <Save style={{ width: 14, height: 14 }} />
                            {saveMutation.isPending ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>

                      {/* Editor */}
                      <div style={{
                        display: showPreview ? "grid" : "block",
                        gridTemplateColumns: showPreview ? "1fr 1fr" : undefined,
                        gap: showPreview ? 16 : undefined,
                      }}>
                        <div>
                          {showPreview && (
                            <div style={{ fontSize: 11, color: "#999", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Markdown</div>
                          )}
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            spellCheck
                            style={{
                              width: "100%", minHeight: 400, padding: 14, fontSize: 13,
                              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                              lineHeight: 1.6, color: "#333", background: "#fff",
                              border: "1px solid #C9CED4", borderRadius: 6, outline: "none", resize: "vertical",
                            }}
                          />
                        </div>
                        {showPreview && (
                          <div>
                            <div style={{ fontSize: 11, color: "#999", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Preview</div>
                            <div style={{ padding: 14, background: "#fff", border: "1px solid #E7EBEF", borderRadius: 6, minHeight: 400, overflowY: "auto" }}>
                              {renderMarkdown(editContent)}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: 12, padding: "10px 14px", background: "#F0F2F4", borderRadius: 6, fontSize: 12, color: "#777", lineHeight: 1.6 }}>
                        <span style={{ fontWeight: 500, color: "#555" }}>Markdown tips:</span>{" "}
                        <code style={{ background: "#E7EBEF", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>## Heading</code>{" · "}
                        <code style={{ background: "#E7EBEF", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>**bold**</code>{" · "}
                        <code style={{ background: "#E7EBEF", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>- bullet item</code>{" · "}
                        <code style={{ background: "#E7EBEF", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>1. numbered item</code>{" · "}
                        Tables: <code style={{ background: "#E7EBEF", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>| Col 1 | Col 2 |</code>
                      </div>
                    </>
                  ) : (
                    renderMarkdown(section.content)
                  )}

                  {/* Section divider */}
                  <div style={{ borderBottom: "1px solid #E0DDD8", marginTop: 32 }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Handbook;
