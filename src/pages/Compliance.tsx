import { useState, useRef, useMemo, useCallback } from "react";
import {
  Search, Filter, ChevronDown, ChevronRight, Save, X, Pencil,
  Plus, Trash2, Shield, FileText, User, Clock,
  CheckCircle2, AlertCircle, MinusCircle, HelpCircle, Eye, EyeOff,
  Menu, BookOpen, ClipboardList, Sparkles, Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import {
  useRequirements, useRequirementsMutations,
  useComplianceNarrative, useComplianceNarrativeMutations,
  ProgramRequirement, ComplianceNarrativeSection,
  ComplianceStatus, STATUS_CONFIG, SECTION_NAMES, TYPE_LABELS, SOURCE_CONFIG,
} from "@/hooks/useCompliance";

// ── Status Icon ──────────────────────────────────────────────────────────
function StatusIcon({ status, size = 16 }: { status: ComplianceStatus; size?: number }) {
  const cfg = STATUS_CONFIG[status];
  const iconProps = { width: size, height: size, color: cfg.color, strokeWidth: 2 };
  switch (status) {
    case "compliant": return <CheckCircle2 {...iconProps} />;
    case "partially_compliant": return <AlertCircle {...iconProps} />;
    case "non_compliant": return <MinusCircle {...iconProps} />;
    case "not_applicable": return <HelpCircle {...iconProps} />;
    default: return <HelpCircle {...iconProps} />;
  }
}

// ── Status Selector ──────────────────────────────────────────────────────
function StatusSelector({ value, onChange }: { value: ComplianceStatus; onChange: (s: ComplianceStatus) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[value];

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px", fontSize: 12, fontWeight: 500,
          color: cfg.color, background: cfg.bg,
          border: `1px solid ${cfg.color}33`, borderRadius: 6,
          cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        <StatusIcon status={value} size={14} />
        {cfg.label}
        <ChevronDown style={{ width: 12, height: 12 }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 4,
          background: "#fff", border: "1px solid #C9CED4", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 160,
          overflow: "hidden",
        }}>
          {(Object.entries(STATUS_CONFIG) as [ComplianceStatus, typeof cfg][]).map(([key, c]) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "8px 12px", fontSize: 13, color: c.color,
                background: value === key ? c.bg : "transparent",
                border: "none", cursor: "pointer", textAlign: "left",
              }}
            >
              <StatusIcon status={key} size={14} />
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Requirement Pill (for narrative doc) ─────────────────────────────────
function RequirementPill({ number, onClick }: { number: string; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        padding: "2px 8px", fontSize: 11, fontWeight: 600,
        color: hovered ? "#fff" : "#415162",
        background: hovered ? "#415162" : "#E7EBEF",
        border: "1px solid #C9CED4", borderRadius: 10,
        cursor: onClick ? "pointer" : "default",
        fontFamily: "monospace", letterSpacing: 0.3,
        transition: "all 0.15s ease",
        textDecoration: hovered ? "none" : "none",
      }}
      title={`Click to view requirement ${number}`}
    >
      {number}
    </button>
  );
}

// ── Requirement Row ──────────────────────────────────────────────────────
function RequirementRow({
  req, users, userId, expanded, onToggle, mutations, onHighlight, onGoToNarrative,
}: {
  req: ProgramRequirement;
  users: { id: string; name: string }[];
  userId: string;
  expanded: boolean;
  onToggle: () => void;
  mutations: ReturnType<typeof useRequirementsMutations>;
  onHighlight?: string;
  onGoToNarrative?: (sectionNumber: number) => void;
}) {
  const [editingComment, setEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState(req.compliance_narrative || "");
  const { toast } = useToast();
  const typeCfg = TYPE_LABELS[req.requirement_type];
  const isHighlighted = onHighlight === req.requirement_number;

  const saveComment = () => {
    mutations.updateNarrative.mutate(
      { id: req.id, narrative: commentDraft.trim(), userId },
      {
        onSuccess: () => { setEditingComment(false); toast({ title: "Comment saved" }); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleStatusChange = (status: ComplianceStatus) => {
    mutations.updateStatus.mutate({ id: req.id, status, userId });
  };

  const handleResponsibleChange = (personId: string) => {
    mutations.updateResponsible.mutate({ id: req.id, personId: personId || null, userId });
  };

  // Indentation based on requirement depth
  const depth = (req.requirement_number.match(/\./g) || []).length - 1;
  const indent = Math.max(0, depth) * 16;

  return (
    <div
      id={`req-${req.requirement_number}`}
      style={{
        borderBottom: "1px solid #E7EBEF",
        background: isHighlighted ? "#FDF6E3" : expanded ? "#FAFBFC" : "#fff",
        transition: "background 0.3s ease",
      }}
    >
      {/* Collapsed row */}
      <button
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "flex-start", gap: 8, width: "100%",
          padding: `10px 14px 10px ${14 + indent}px`, border: "none",
          cursor: "pointer", textAlign: "left", background: "transparent",
        }}
      >
        <div style={{ marginTop: 2, flexShrink: 0 }}>
          {expanded
            ? <ChevronDown style={{ width: 14, height: 14, color: "#999" }} />
            : <ChevronRight style={{ width: 14, height: 14, color: "#999" }} />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#415162" }}>
              {req.requirement_number}
            </span>
            {onGoToNarrative && (
              <button
                onClick={(e) => { e.stopPropagation(); onGoToNarrative(req.section_number); }}
                title="View in narrative"
                style={{
                  display: "inline-flex", alignItems: "center", padding: 2,
                  background: "transparent", border: "none", cursor: "pointer", color: "#8A9AAB",
                }}
              >
                <BookOpen style={{ width: 12, height: 12 }} />
              </button>
            )}
            <span style={{
              fontSize: 10, fontWeight: 500, padding: "1px 5px",
              borderRadius: 3, color: typeCfg.color, background: `${typeCfg.color}15`,
              border: `1px solid ${typeCfg.color}30`,
            }}>
              {typeCfg.label}
            </span>
            {req.source && req.source !== "both" && (() => {
              const srcCfg = SOURCE_CONFIG[req.source];
              return srcCfg ? (
                <span style={{
                  fontSize: 10, fontWeight: 500, padding: "1px 5px",
                  borderRadius: 3, color: srcCfg.color, background: srcCfg.bg,
                  border: `1px solid ${srcCfg.color}30`,
                }}>
                  {srcCfg.short}
                </span>
              ) : null;
            })()}
            <div style={{ marginLeft: "auto", flexShrink: 0 }}>
              <StatusIcon status={req.compliance_status} size={16} />
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>
            {req.requirement_text.length > 200 && !expanded
              ? req.requirement_text.slice(0, 200) + "…"
              : req.requirement_text
            }
          </div>
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div style={{ padding: `0 14px 14px ${14 + indent + 22}px` }}>
          {/* Status + Responsible row */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Status</div>
              <StatusSelector value={req.compliance_status} onChange={handleStatusChange} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Responsible</div>
              <select
                value={req.responsible_person_id || ""}
                onChange={e => handleResponsibleChange(e.target.value)}
                style={{
                  fontSize: 12, padding: "5px 8px", border: "1px solid #C9CED4",
                  borderRadius: 6, background: "#fff", color: "#333", minWidth: 140,
                }}
              >
                <option value="">— Unassigned —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            {req.last_reviewed_at && (
              <div style={{ fontSize: 11, color: "#999", display: "flex", alignItems: "center", gap: 4, marginTop: 18 }}>
                <Clock style={{ width: 11, height: 11 }} />
                Reviewed {new Date(req.last_reviewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            )}
          </div>

          {/* Comment / Narrative box */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <FileText style={{ width: 13, height: 13, color: "#999" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Comment</span>
              {!editingComment && (
                <button
                  onClick={() => { setCommentDraft(req.compliance_narrative || ""); setEditingComment(true); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#415162", display: "flex" }}
                >
                  <Pencil style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
            {editingComment ? (
              <div>
                <textarea
                  value={commentDraft}
                  onChange={e => setCommentDraft(e.target.value)}
                  placeholder="Describe how the program meets this requirement..."
                  style={{
                    width: "100%", minHeight: 80, fontSize: 13, padding: "8px 10px",
                    border: "1px solid #C9CED4", borderRadius: 6, background: "#fff",
                    color: "#333", lineHeight: 1.6, resize: "vertical", fontFamily: "inherit",
                  }}
                />
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button onClick={saveComment} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", fontSize: 12, color: "#fff", background: "#415162", border: "none", borderRadius: 5, cursor: "pointer" }}>
                    <Save style={{ width: 12, height: 12 }} /> Save
                  </button>
                  <button onClick={() => setEditingComment(false)} style={{ padding: "5px 12px", fontSize: 12, color: "#666", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: req.compliance_narrative ? "#444" : "#bbb", lineHeight: 1.6, fontStyle: req.compliance_narrative ? "normal" : "italic" }}>
                {req.compliance_narrative || "No comment added yet."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Narrative Markdown Renderer ──────────────────────────────────────────
function renderNarrativeContent(
  content: string,
  onPillClick: (reqNumber: string) => void
): React.ReactNode[] {
  if (!content) return [];
  const elements: React.ReactNode[] = [];
  const lines = content.split("\n");
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers (check ### before ## before # so longer prefixes match first)
    if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} style={{ fontSize: 15, fontWeight: 600, color: "#333", margin: "18px 0 6px" }}>{line.slice(4)}</h3>);
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} style={{ fontSize: 17, fontWeight: 600, color: "#415162", margin: "22px 0 8px", paddingBottom: 5, borderBottom: "1px solid #E7EBEF" }}>{line.slice(3)}</h2>);
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h1 key={key++} style={{ fontSize: 19, fontWeight: 700, color: "#415162", margin: "26px 0 10px", paddingBottom: 6, borderBottom: "2px solid #E7EBEF" }}>{line.slice(2)}</h1>);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      continue;
    }

    // Render inline content with requirement pill syntax: [1.7.c]
    const renderInline = (text: string): React.ReactNode[] => {
      const parts: React.ReactNode[] = [];
      // Match [number.number...] pattern for requirement pills
      const pillRegex = /\[(\d+\.\d+(?:\.[a-z](?:\.\d+(?:\.[a-z])?)?)?)\]/g;
      let lastIdx = 0;
      let match: RegExpExecArray | null;

      while ((match = pillRegex.exec(text)) !== null) {
        if (match.index > lastIdx) {
          // Check for bold in the text before the pill
          const before = text.slice(lastIdx, match.index);
          parts.push(...renderBold(before, key++));
        }
        const reqNum = match[1]; // capture immediately before closure
        parts.push(
          <RequirementPill
            key={`pill-${key++}`}
            number={reqNum}
            onClick={() => onPillClick(reqNum)}
          />
        );
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < text.length) {
        parts.push(...renderBold(text.slice(lastIdx), key++));
      }
      return parts;
    };

    const renderBold = (text: string, baseKey: number): React.ReactNode[] => {
      const parts: React.ReactNode[] = [];
      const boldRe = /\*\*(.+?)\*\*/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = boldRe.exec(text)) !== null) {
        if (m.index > last) parts.push(<span key={`t-${baseKey}-${last}`}>{text.slice(last, m.index)}</span>);
        parts.push(<strong key={`b-${baseKey}-${m.index}`}>{m[1]}</strong>);
        last = m.index + m[0].length;
      }
      if (last < text.length) parts.push(<span key={`t-${baseKey}-${last}`}>{text.slice(last)}</span>);
      return parts;
    };

    // Bullet list
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      i--; // back up one since the for loop will increment
      elements.push(
        <ul key={key++} style={{ paddingLeft: 18, margin: "6px 0 14px" }}>
          {items.map((item, j) => (
            <li key={j} style={{ fontSize: 14, lineHeight: 1.7, color: "#555", marginBottom: 3 }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Paragraph
    elements.push(
      <p key={key++} style={{ fontSize: 14, lineHeight: 1.7, color: "#555", margin: "0 0 10px" }}>
        {renderInline(line)}
      </p>
    );
  }
  return elements;
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPLIANCE PAGE
// ══════════════════════════════════════════════════════════════════════════
const Compliance = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, users: adminUsers } = useAdmin();
  const { toast } = useToast();

  // ── Data ───────────────────────────────────────────────────────────────
  const { data: requirements, isLoading: reqLoading } = useRequirements();
  const mutations = useRequirementsMutations();
  const { data: narrativeSections, isLoading: narLoading } = useComplianceNarrative();
  const narrativeMutations = useComplianceNarrativeMutations();

  // User list for responsible-person picker
  const userList = useMemo(() => {
    return (adminUsers.data || []).map(u => ({
      id: u.id,
      name: u.first_name && u.last_name
        ? `${u.first_name} ${u.last_name}`
        : u.display_name || u.email,
    }));
  }, [adminUsers.data]);

  // ── UI State ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"table" | "narrative">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterSection, setFilterSection] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<ComplianceStatus | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
  const [highlightedReq, setHighlightedReq] = useState<string | null>(null);

  // Narrative editing state
  const [editingNarId, setEditingNarId] = useState<string | null>(null);
  const [narEditTitle, setNarEditTitle] = useState("");
  const [narEditContent, setNarEditContent] = useState("");
  const [addingNarrative, setAddingNarrative] = useState(false);
  const [newNarTitle, setNewNarTitle] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // ── AI Narrative Generation ────────────────────────────────────────────
  const handleGenerate = useCallback(async (section: ComplianceNarrativeSection) => {
    if (!requirements) return;

    // Extract section number from title (e.g., "Section 1: Oversight" → 1)
    const secMatch = section.title.match(/Section\s*(\d+)/i);
    const sectionNumber = secMatch ? Number(secMatch[1]) : null;

    if (!sectionNumber) {
      toast({ title: "Cannot determine section number", description: "Section title must contain 'Section N' to match requirements.", variant: "destructive" });
      return;
    }

    // Gather all requirements for this section that have comments
    const sectionReqs = requirements.filter(r => r.section_number === sectionNumber);
    const reqsWithComments = sectionReqs.filter(r => r.compliance_narrative && r.compliance_narrative.trim());

    if (reqsWithComments.length === 0) {
      toast({ title: "No comments found", description: `Add comments to requirements in Section ${sectionNumber} first, then regenerate.`, variant: "destructive" });
      return;
    }

    setGeneratingId(section.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("generate-compliance-narrative", {
        body: {
          section_number: sectionNumber,
          section_name: SECTION_NAMES[sectionNumber],
          requirements: sectionReqs.map(r => ({
            requirement_number: r.requirement_number,
            requirement_text: r.requirement_text,
            requirement_type: r.requirement_type,
            compliance_status: r.compliance_status,
            compliance_narrative: r.compliance_narrative,
          })),
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error) throw new Error(res.error.message || "Generation failed");
      if (res.data?.error) throw new Error(res.data.error);

      const narrative = res.data?.narrative || "";

      // Open the editor with the generated content
      setNarEditTitle(section.title);
      setNarEditContent(narrative);
      setEditingNarId(section.id);
      toast({ title: "Draft generated", description: "Review the narrative below and save when ready." });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingId(null);
    }
  }, [requirements, toast]);

  // ── Filtering ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!requirements) return [];
    return requirements.filter(r => {
      if (filterSection !== null && r.section_number !== filterSection) return false;
      if (filterStatus && r.compliance_status !== filterStatus) return false;
      if (filterType && r.requirement_type !== filterType) return false;
      if (filterSource && r.source !== filterSource) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.requirement_number.toLowerCase().includes(q) ||
          r.requirement_text.toLowerCase().includes(q) ||
          r.subsection_name.toLowerCase().includes(q) ||
          (r.compliance_narrative || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [requirements, filterSection, filterStatus, filterType, filterSource, searchQuery]);

  // Group by section
  const groupedBySection = useMemo(() => {
    const groups: Record<number, ProgramRequirement[]> = {};
    for (const r of filtered) {
      if (!groups[r.section_number]) groups[r.section_number] = [];
      groups[r.section_number].push(r);
    }
    return groups;
  }, [filtered]);

  // Stats
  const stats = useMemo(() => {
    if (!requirements) return { total: 0, core: 0, met: 0, partial: 0, notMet: 0, unreviewed: 0 };
    return {
      total: requirements.length,
      core: requirements.filter(r => r.requirement_type === "core").length,
      met: requirements.filter(r => r.compliance_status === "compliant").length,
      partial: requirements.filter(r => r.compliance_status === "partially_compliant").length,
      notMet: requirements.filter(r => r.compliance_status === "non_compliant").length,
      unreviewed: requirements.filter(r => r.compliance_status === "not_reviewed").length,
    };
  }, [requirements]);

  // ── Navigation from pill click ─────────────────────────────────────────
  const handlePillClick = useCallback((reqNumber: string) => {
    setActiveTab("table");
    setSearchQuery("");
    setFilterSection(null);
    setFilterStatus(null);
    setFilterType(null);
    setFilterSource(null);
    setHighlightedReq(reqNumber);

    // Find the requirement and expand it
    const req = requirements?.find(r => r.requirement_number === reqNumber);
    if (req) {
      setExpandedId(req.id);
      // Make sure its section is not collapsed
      setCollapsedSections(prev => ({ ...prev, [req.section_number]: false }));
    }

    // Scroll after a tick
    setTimeout(() => {
      const el = document.getElementById(`req-${reqNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // Clear highlight after 3s
      setTimeout(() => setHighlightedReq(null), 3000);
    }, 100);
  }, [requirements]);

  // Navigate from table requirement to narrative section
  const handleGoToNarrative = useCallback((sectionNumber: number) => {
    setActiveTab("narrative");
    // Find the narrative section whose title contains this section number
    const narSection = (narrativeSections || []).find(s => {
      const match = s.title.match(/Section\s*(\d+)/i);
      return match && Number(match[1]) === sectionNumber;
    });
    if (narSection) {
      setTimeout(() => {
        const el = document.getElementById(`narrative-${narSection.id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [narrativeSections]);

  // ── Narrative Handlers ─────────────────────────────────────────────────
  const startNarEdit = (s: ComplianceNarrativeSection) => {
    setNarEditTitle(s.title);
    setNarEditContent(s.content);
    setEditingNarId(s.id);
  };

  const saveNarEdit = () => {
    if (!editingNarId) return;
    narrativeMutations.updateSection.mutate(
      { id: editingNarId, title: narEditTitle.trim(), content: narEditContent, userId: user?.id || "" },
      {
        onSuccess: () => { setEditingNarId(null); toast({ title: "Section saved" }); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleAddNarrative = () => {
    if (!newNarTitle.trim()) return;
    const maxOrder = (narrativeSections || []).reduce((max, s) => Math.max(max, s.display_order), 0);
    narrativeMutations.addSection.mutate(
      { title: newNarTitle.trim(), parentId: null, maxOrder, userId: user?.id || "" },
      {
        onSuccess: () => { setAddingNarrative(false); setNewNarTitle(""); toast({ title: "Section added" }); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────
  if (reqLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F3EE", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 14, color: "#999" }}>Loading compliance data…</div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#F5F3EE" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "14px 16px", background: "#415162", color: "#fff",
      }}>
        <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
          <button
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, background: "transparent", border: "none",
              borderRadius: 6, cursor: "pointer", color: "rgba(255,255,255,0.8)",
            }}
            onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(""); }}
          >
            {searchOpen ? <X style={{ width: 17, height: 17 }} /> : <Search style={{ width: 17, height: 17 }} />}
          </button>
          <NotificationBell />
        </HeaderLogo>
      </div>
      {searchOpen && (
        <div style={{ padding: "0 16px 12px", background: "#415162" }}>
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search requirements…"
            style={{
              width: "100%", fontSize: 13, padding: "9px 12px",
              border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8,
              background: "rgba(255,255,255,0.95)", color: "#333", outline: "none",
              boxSizing: "border-box" as const,
            }}
          />
        </div>
      )}

      {/* Tabs */}
      <div style={{ padding: "12px 16px 0", background: "#F5F3EE", maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#2D3748", marginBottom: 16 }}>ACGME Handbook</h1>

        {/* Stats bar */}
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center",
          padding: "10px 12px", background: "#fff", borderRadius: 8,
          border: "1px solid #E7EBEF",
        }}>
          <div style={{ fontSize: 12, color: "#555" }}>
            <strong style={{ fontSize: 16, color: "#333" }}>{stats.total}</strong> total
          </div>
          <div style={{ width: 1, background: "#E7EBEF" }} />
          <div style={{ fontSize: 12, color: STATUS_CONFIG.compliant.color }}>
            <strong>{stats.met}</strong> met
          </div>
          <div style={{ fontSize: 12, color: STATUS_CONFIG.partially_compliant.color }}>
            <strong>{stats.partial}</strong> partial
          </div>
          <div style={{ fontSize: 12, color: STATUS_CONFIG.non_compliant.color }}>
            <strong>{stats.notMet}</strong> not met
          </div>
          <div style={{ fontSize: 12, color: "#999" }}>
            <strong>{stats.unreviewed}</strong> unreviewed
          </div>
        </div>
      </div>

      {/* ── TAB: Requirements Table ─────────────────────────────────────── */}
      {activeTab === "table" && (
        <div style={{ flex: 1, padding: "12px 16px 100px", maxWidth: 900, margin: "0 auto" }}>
          {/* Filters */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, justifyContent: "center" }}>
            <select
              value={filterSection ?? ""}
              onChange={e => setFilterSection(e.target.value ? Number(e.target.value) : null)}
              style={{ fontSize: 12, padding: "7px 8px", border: "1px solid #C9CED4", borderRadius: 6, background: "#fff", color: "#333" }}
            >
              <option value="">All Sections</option>
              {Object.entries(SECTION_NAMES).map(([num, name]) => (
                <option key={num} value={num}>Sec {num}: {name}</option>
              ))}
            </select>
            <select
              value={filterStatus ?? ""}
              onChange={e => setFilterStatus(e.target.value as ComplianceStatus || null)}
              style={{ fontSize: 12, padding: "7px 8px", border: "1px solid #C9CED4", borderRadius: 6, background: "#fff", color: "#333" }}
            >
              <option value="">All Status</option>
              {(Object.entries(STATUS_CONFIG) as [ComplianceStatus, { label: string }][]).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <select
              value={filterType ?? ""}
              onChange={e => setFilterType(e.target.value || null)}
              style={{ fontSize: 12, padding: "7px 8px", border: "1px solid #C9CED4", borderRadius: 6, background: "#fff", color: "#333" }}
            >
              <option value="">All Types</option>
              <option value="core">Core</option>
              <option value="detail">Detail</option>
              <option value="outcome">Outcome</option>
            </select>
            <select
              value={filterSource ?? ""}
              onChange={e => setFilterSource(e.target.value || null)}
              style={{ fontSize: 12, padding: "7px 8px", border: "1px solid #C9CED4", borderRadius: 6, background: "#fff", color: "#333" }}
            >
              <option value="">All Sources</option>
              <option value="common">Common (CPR)</option>
              <option value="specialty">FM-Specific</option>
              <option value="both">Both</option>
            </select>
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E7EBEF", marginBottom: 12 }}>
            <button
              onClick={() => setActiveTab("table")}
              style={{
                padding: "8px 0", marginRight: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: "transparent", border: "none",
                color: activeTab === "table" ? "#415162" : "#999",
                borderBottom: activeTab === "table" ? "2px solid #415162" : "2px solid transparent",
                marginBottom: -2, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <ClipboardList style={{ width: 15, height: 15 }} /> Requirements
            </button>
            <button
              onClick={() => setActiveTab("narrative")}
              style={{
                padding: "8px 0", marginRight: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: "transparent", border: "none",
                color: activeTab === "narrative" ? "#415162" : "#999",
                borderBottom: activeTab === "narrative" ? "2px solid #415162" : "2px solid transparent",
                marginBottom: -2, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <BookOpen style={{ width: 15, height: 15 }} /> Narrative
            </button>
          </div>

          <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
            Showing {filtered.length} of {requirements?.length || 0} requirements
          </div>

          {/* Grouped requirements */}
          {Object.entries(groupedBySection)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([secNum, reqs]) => {
              const sn = Number(secNum);
              const collapsed = collapsedSections[sn];
              const sectionMet = reqs.filter(r => r.compliance_status === "compliant").length;

              return (
                <div key={secNum} style={{ marginBottom: 8 }}>
                  {/* Section header */}
                  <button
                    onClick={() => setCollapsedSections(prev => ({ ...prev, [sn]: !prev[sn] }))}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "10px 14px", background: "#E7EBEF", border: "none",
                      borderRadius: "8px 8px 0 0", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    {collapsed
                      ? <ChevronRight style={{ width: 16, height: 16, color: "#666" }} />
                      : <ChevronDown style={{ width: 16, height: 16, color: "#666" }} />
                    }
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>
                      Section {secNum}: {SECTION_NAMES[sn]}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>
                      {sectionMet}/{reqs.length} met
                    </span>
                  </button>

                  {/* Requirements in this section */}
                  {!collapsed && (
                    <div style={{ background: "#fff", border: "1px solid #E7EBEF", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
                      {reqs.map(req => (
                        <RequirementRow
                          key={req.id}
                          req={req}
                          users={userList}
                          userId={user?.id || ""}
                          expanded={expandedId === req.id}
                          onToggle={() => setExpandedId(expandedId === req.id ? null : req.id)}
                          mutations={mutations}
                          onHighlight={highlightedReq || undefined}
                          onGoToNarrative={handleGoToNarrative}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          }
        </div>
      )}

      {/* ── TAB: Narrative Document ─────────────────────────────────────── */}
      {activeTab === "narrative" && (
        <div style={{ flex: 1, padding: "16px 16px 100px", maxWidth: 900, margin: "0 auto" }}>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E7EBEF", marginBottom: 12 }}>
            <button
              onClick={() => setActiveTab("table")}
              style={{
                padding: "8px 0", marginRight: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: "transparent", border: "none",
                color: activeTab === "table" ? "#415162" : "#999",
                borderBottom: activeTab === "table" ? "2px solid #415162" : "2px solid transparent",
                marginBottom: -2, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <ClipboardList style={{ width: 15, height: 15 }} /> Requirements
            </button>
            <button
              onClick={() => setActiveTab("narrative")}
              style={{
                padding: "8px 0", marginRight: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: "transparent", border: "none",
                color: activeTab === "narrative" ? "#415162" : "#999",
                borderBottom: activeTab === "narrative" ? "2px solid #415162" : "2px solid transparent",
                marginBottom: -2, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <BookOpen style={{ width: 15, height: 15 }} /> Narrative
            </button>
          </div>

          <div style={{ fontSize: 13, color: "#888", marginBottom: 16, lineHeight: 1.6 }}>
            Write the program's compliance narrative here. Use <RequirementPill number="1.7.c" /> syntax in your markdown
            (e.g., <code style={{ fontSize: 11, background: "#E7EBEF", padding: "1px 4px", borderRadius: 3 }}>[1.7.c]</code>)
            to create clickable links to specific requirements in the table.
          </div>

          {(narrativeSections || []).length === 0 && !narLoading && (
            <div style={{
              padding: "40px 20px", textAlign: "center", background: "#fff",
              border: "1px solid #E7EBEF", borderRadius: 10, marginBottom: 16,
            }}>
              <Shield style={{ width: 40, height: 40, color: "#C9CED4", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: "#666", marginBottom: 6 }}>No narrative sections yet</div>
              <div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
                Add sections to describe how your program meets ACGME requirements.
              </div>
              <button
                onClick={() => setAddingNarrative(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", fontSize: 13, fontWeight: 500,
                  color: "#fff", background: "#415162", border: "none",
                  borderRadius: 6, cursor: "pointer",
                }}
              >
                <Plus style={{ width: 14, height: 14 }} /> Add First Section
              </button>
            </div>
          )}

          {(narrativeSections || []).map(section => {
            const isEditing = editingNarId === section.id;

            return (
              <div key={section.id} id={`narrative-${section.id}`} style={{
                background: "#fff", border: "1px solid #E7EBEF",
                borderRadius: 10, padding: "18px 18px 14px", marginBottom: 16,
              }}>
                {/* Section header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                  {isEditing ? (
                    <input
                      value={narEditTitle}
                      onChange={e => setNarEditTitle(e.target.value)}
                      style={{
                        flex: 1, fontSize: 17, fontWeight: 600, color: "#333",
                        border: "1px solid #C9CED4", borderRadius: 6, padding: "3px 10px",
                        background: "#fff",
                      }}
                    />
                  ) : (
                    <h2 style={{ fontSize: 17, fontWeight: 600, color: "#333", margin: 0 }}>{section.title}</h2>
                  )}
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveNarEdit}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, color: "#fff", background: "#415162", border: "none", borderRadius: 5, cursor: "pointer" }}
                        >
                          <Save style={{ width: 12, height: 12 }} /> Save
                        </button>
                        <button
                          onClick={() => setEditingNarId(null)}
                          style={{ padding: "5px 10px", fontSize: 12, color: "#666", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleGenerate(section)}
                          disabled={generatingId === section.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            padding: "5px 10px", fontSize: 12, fontWeight: 500,
                            color: generatingId === section.id ? "#999" : "#fff",
                            background: generatingId === section.id ? "#E7EBEF" : "#4A846C",
                            border: "none", borderRadius: 5, cursor: generatingId === section.id ? "wait" : "pointer",
                          }}
                        >
                          {generatingId === section.id
                            ? <><Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> Generating…</>
                            : <><Sparkles style={{ width: 12, height: 12 }} /> Generate</>
                          }
                        </button>
                        <button
                          onClick={() => startNarEdit(section)}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, color: "#415162", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}
                        >
                          <Pencil style={{ width: 12, height: 12 }} /> Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this section?")) {
                              narrativeMutations.deleteSection.mutate(section.id, {
                                onSuccess: () => toast({ title: "Section deleted" }),
                              });
                            }
                          }}
                          style={{ padding: "5px 8px", fontSize: 12, color: "#C0392B", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer", display: "flex" }}
                        >
                          <Trash2 style={{ width: 12, height: 12 }} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Content */}
                {isEditing ? (
                  <textarea
                    value={narEditContent}
                    onChange={e => setNarEditContent(e.target.value)}
                    placeholder="Write your compliance narrative here. Use [1.7.c] to link to requirements."
                    style={{
                      width: "100%", minHeight: 200, fontSize: 13, padding: "10px 12px",
                      border: "1px solid #C9CED4", borderRadius: 6, background: "#FAFBFC",
                      color: "#333", lineHeight: 1.7, resize: "vertical", fontFamily: "inherit",
                    }}
                  />
                ) : (
                  <div>
                    {section.content
                      ? renderNarrativeContent(section.content, handlePillClick)
                      : <p style={{ fontSize: 13, color: "#bbb", fontStyle: "italic" }}>Click Edit to add content.</p>
                    }
                  </div>
                )}

                {/* Updated timestamp */}
                {section.updated_at && (
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 10, display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock style={{ width: 10, height: 10 }} />
                    Updated {new Date(section.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add section */}
          {addingNarrative ? (
            <div style={{
              background: "#fff", border: "1px solid #E7EBEF",
              borderRadius: 10, padding: 16, marginBottom: 16,
            }}>
              <input
                value={newNarTitle}
                onChange={e => setNewNarTitle(e.target.value)}
                placeholder="Section title (e.g., 'Oversight & Resources')"
                style={{
                  width: "100%", fontSize: 14, padding: "8px 10px",
                  border: "1px solid #C9CED4", borderRadius: 6, background: "#fff",
                  marginBottom: 10,
                }}
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleAddNarrative()}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={handleAddNarrative} style={{ padding: "6px 14px", fontSize: 13, color: "#fff", background: "#415162", border: "none", borderRadius: 5, cursor: "pointer" }}>Add</button>
                <button onClick={() => { setAddingNarrative(false); setNewNarTitle(""); }} style={{ padding: "6px 14px", fontSize: 13, color: "#666", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            (narrativeSections || []).length > 0 && (
              <button
                onClick={() => setAddingNarrative(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, width: "100%",
                  padding: "12px 14px", fontSize: 13, color: "#415162",
                  background: "#fff", border: "1px dashed #C9CED4",
                  borderRadius: 8, cursor: "pointer", justifyContent: "center",
                }}
              >
                <Plus style={{ width: 14, height: 14 }} /> Add Narrative Section
              </button>
            )
          )}
        </div>
      )}

    </div>
  );
};

export default Compliance;
