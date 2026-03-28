import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Home, Phone, Calendar, Clock, Shield, Repeat, FileText, TrendingUp,
  BookOpen, CalendarOff, CheckSquare, Moon, RefreshCw, Shirt, Heart,
  ShieldCheck, Globe, Coffee, AlertTriangle, MessageSquare, Layers,
  Users, AlertCircle, Monitor,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useHandbook, HandbookSection } from "@/hooks/useHandbook";
import HeaderLogo from "@/components/HeaderLogo";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  home: Home,
  phone: Phone,
  calendar: Calendar,
  clock: Clock,
  shield: Shield,
  repeat: Repeat,
  "file-text": FileText,
  "trending-up": TrendingUp,
  "book-open": BookOpen,
  "calendar-off": CalendarOff,
  "check-square": CheckSquare,
  moon: Moon,
  "refresh-cw": RefreshCw,
  shirt: Shirt,
  heart: Heart,
  "shield-check": ShieldCheck,
  globe: Globe,
  coffee: Coffee,
  "alert-triangle": AlertTriangle,
  "message-square": MessageSquare,
  layers: Layers,
  users: Users,
  "alert-circle": AlertCircle,
  monitor: Monitor,
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

    // Blank line
    if (line.trim() === "") { i++; continue; }

    // Heading
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} style={{
          fontSize: 17, fontWeight: 600, color: "#415162",
          margin: "28px 0 12px", paddingBottom: 6,
          borderBottom: "1px solid #E7EBEF",
        }}>
          {line.slice(3)}
        </h2>
      );
      i++; continue;
    }

    // Table
    if (line.includes("|") && lines[i + 1]?.match(/^\|[-| ]+\|$/)) {
      const headerCells = line.split("|").map(c => c.trim()).filter(Boolean);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").map(c => c.trim()).filter(Boolean));
        i++;
      }
      elements.push(
        <div key={key++} style={{ overflowX: "auto", margin: "12px 0 16px" }}>
          <table style={{
            width: "100%", borderCollapse: "collapse", fontSize: 13,
          }}>
            <thead>
              <tr>
                {headerCells.map((h, j) => (
                  <th key={j} style={{
                    textAlign: "left", padding: "8px 12px",
                    background: "#415162", color: "#fff",
                    fontWeight: 500, fontSize: 12,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 1 ? "#F5F3EE" : "transparent" }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: "7px 12px", fontSize: 13,
                      borderBottom: "1px solid #E7EBEF",
                      color: "#444",
                    }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={key++} style={{ paddingLeft: 20, margin: "8px 0 16px" }}>
          {items.map((item, j) => (
            <li key={j} style={{ fontSize: 14, lineHeight: 1.7, color: "#555", marginBottom: 4 }}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Unordered list (top-level and nested)
    if (line.startsWith("- ")) {
      const items: { text: string; indent: number }[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("  - "))) {
        const indent = lines[i].startsWith("  - ") ? 1 : 0;
        const text = lines[i].replace(/^\s*- /, "");
        items.push({ text, indent });
        i++;
      }
      elements.push(
        <ul key={key++} style={{ paddingLeft: 20, margin: "8px 0 16px" }}>
          {items.map((item, j) => (
            <li key={j} style={{
              fontSize: 14, lineHeight: 1.7, color: "#555", marginBottom: 4,
              marginLeft: item.indent * 20,
            }}>
              {renderInline(item.text)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Paragraph
    elements.push(
      <p key={key++} style={{ fontSize: 14, lineHeight: 1.7, color: "#555", margin: "0 0 12px" }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return elements;
}

const Handbook = () => {
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { data: sections, isLoading, error } = useHandbook();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSlug, setActiveSlug] = useState<string>("welcome");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync slug from URL param on mount
  useEffect(() => {
    const s = searchParams.get("section");
    if (s && sections?.find((sec) => sec.slug === s)) {
      setActiveSlug(s);
    }
  }, [searchParams, sections]);

  const activeSection = sections?.find((s) => s.slug === activeSlug) || sections?.[0];

  const handleNavClick = (slug: string) => {
    setActiveSlug(slug);
    setSearchParams({ section: slug });
    setSidebarOpen(false);
    // Scroll content to top
    document.getElementById("handbook-content")?.scrollTo(0, 0);
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return ""; }
  };

  return (
    <div className="min-h-screen" style={{ background: "#F5F3EE" }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: "#415162" }}>
        <div className="container flex items-center justify-between h-14 px-4">
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut} />
          <div className="flex items-center gap-1 text-white/50">
            {/* Mobile sidebar toggle */}
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

      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
        {/* Sidebar - always visible on desktop, toggled on mobile */}
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={`
            fixed md:sticky top-14 z-40 md:z-auto
            h-[calc(100vh-56px)] overflow-y-auto
            transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
          style={{
            width: 250,
            minWidth: 250,
            background: "#fff",
            borderRight: "1px solid #E7EBEF",
          }}
        >
          <nav style={{ padding: "8px 0" }}>
            {isLoading && (
              <div style={{ padding: "20px 16px", fontSize: 13, color: "#999" }}>
                Loading...
              </div>
            )}
            {error && (
              <div style={{ padding: "20px 16px", fontSize: 13, color: "#c44" }}>
                Failed to load handbook sections.
              </div>
            )}
            {sections?.map((section) => {
              const Icon = iconMap[section.icon] || FileText;
              const isActive = section.slug === activeSlug;
              return (
                <button
                  key={section.id}
                  onClick={() => handleNavClick(section.slug)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 16px",
                    fontSize: 13,
                    color: isActive ? "#415162" : "#777",
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? "#F0F2F4" : "transparent",
                    borderLeft: isActive ? "3px solid #415162" : "3px solid transparent",
                    border: "none",
                    borderRight: "none",
                    borderTop: "none",
                    borderBottom: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "#FAFAF8";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <Icon className="h-4 w-4" style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                  <span>{section.title}</span>
                </button>
              );
            })}
          </nav>
          <div style={{
            padding: "10px 16px",
            borderTop: "1px solid #E7EBEF",
            fontSize: 12,
            color: "#aaa",
            display: "flex",
            justifyContent: "space-between",
          }}>
            <span>{sections?.length || 0} sections</span>
            <span>AY 2025–2026</span>
          </div>
        </aside>

        {/* Content */}
        <main
          id="handbook-content"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px 40px",
            maxWidth: 720,
          }}
        >
          {activeSection ? (
            <>
              <h1 style={{
                fontSize: 22, fontWeight: 600, color: "#333",
                margin: "0 0 6px",
              }}>
                {activeSection.title}
              </h1>
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 24 }}>
                Updated {formatDate(activeSection.updated_at)}
              </div>
              {renderMarkdown(activeSection.content)}
            </>
          ) : !isLoading ? (
            <p style={{ fontSize: 14, color: "#999" }}>
              Select a section from the sidebar.
            </p>
          ) : null}
        </main>
      </div>

      <BottomNav />
    </div>
  );
};

export default Handbook;
