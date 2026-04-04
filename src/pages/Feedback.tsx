import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { List, PieChart, FileText, BookOpen, Pencil, Trash2, X as XIcon, Search, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useFeedback } from "@/hooks/useFeedback";
import { useACGMECompetencies } from "@/hooks/useACGMECompetencies";
import { buildSelectionFromFeedback } from "@/components/feedback/CompetencySelector";
import { supabase } from "@/integrations/supabase/client";
import { formatCardDate, formatPersonName } from "@/lib/dateFormat";
import { DetailReadOnly } from "@/components/cbme/DetailField";
import HeaderLogo from "@/components/HeaderLogo";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";
import CreateFeedbackDialog from "@/components/feedback/CreateFeedbackDialog";
import EditFeedbackDialog from "@/components/feedback/EditFeedbackDialog";
import FeedbackPie from "@/components/feedback/FeedbackPie";
import MilestoneReport from "@/components/feedback/MilestoneReport";
import MilestonesBrowser from "@/components/feedback/MilestonesBrowser";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Feedback = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { has: hasPerm } = usePermissions();
  const canEditFeedback = hasPerm("feedback.edit");
  const canGenerateReport = hasPerm("feedback.report");
  const { data: teamMembers } = useTeamMembers();
  const { feedbackQuery, createFeedback, updateFeedback, deleteFeedback, saveAISuggestions, updateMilestone, deleteMilestone, updateEvalDomain, deleteEvalDomain } = useFeedback();
  const { data: acgmeCategories } = useACGMECompetencies();

  // Build subcategory code -> UUID lookup for AI suggestion saving
  const subcategoryLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    if (acgmeCategories) {
      acgmeCategories.forEach(cat => {
        cat.subcategories.forEach(sub => {
          lookup[sub.code] = sub.id;
        });
      });
    }
    return lookup;
  }, [acgmeCategories]);

  const handleCreateFeedback = async (data: {
    resident_id: string;
    comment: string;
    sentiment: "positive" | "negative";
  }) => {
    try {
      const feedbackId = await createFeedback.mutateAsync(data);

      // Get plain text from HTML comment for AI
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = data.comment;
      const plainText = tempDiv.textContent || tempDiv.innerText || "";

      // Find resident's current milestone levels
      const resident = residents.find(r => r.id === data.resident_id);
      const pgyLevel = resident?.graduation_year
        ? (() => {
            const now = new Date();
            const academicYear = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
            return academicYear - (resident.graduation_year! - 3);
          })()
        : undefined;

      // Build current levels from resident_milestone_status
      let currentLevels: Record<string, number> | undefined;
      try {
        const { data: statusData } = await (supabase as any)
          .from("resident_milestone_status")
          .select("subcategory_id, current_level")
          .eq("resident_id", data.resident_id);
        if (statusData && acgmeCategories) {
          currentLevels = {};
          statusData.forEach((s: any) => {
            acgmeCategories.forEach(cat => {
              const sub = cat.subcategories.find(sc => sc.id === s.subcategory_id);
              if (sub) currentLevels![sub.code] = s.current_level;
            });
          });
        }
      } catch { /* skip if not available */ }

      // Trigger AI in background — don't block the UI
      supabase.functions.invoke("suggest-competency", {
        body: { comment: plainText, sentiment: data.sentiment, currentLevels },
      }).then(({ data: aiData }) => {
        if (aiData?.milestones || aiData?.evalDomains) {
          saveAISuggestions(
            feedbackId,
            aiData.milestones || [],
            aiData.evalDomains || [],
            subcategoryLookup,
          );
        }
      }).catch(err => {
        console.error("AI suggestion failed:", err);
      });
    } catch {
      // createFeedback error is handled by the mutation's onError
    }
  };

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "summary" | "report" | "milestones">("list");
  const [viewSubcategoryId, setViewSubcategoryId] = useState<string | null>(null);

  // Fetch user IDs with the 'resident' role
  const { data: residentRoles } = useQuery({
    queryKey: ["resident-role-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "resident");
      if (error) throw error;
      return (data || []).map((r) => r.user_id);
    },
  });

  // Fetch graduation years for residents
  const { data: graduationYears } = useQuery({
    queryKey: ["resident-graduation-years"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, graduation_year")
        .not("graduation_year", "is", null);
      if (error) throw error;
      return new Map((data || []).map((p) => [p.id, p.graduation_year as number]));
    },
  });

  const members = teamMembers || [];
  const residentIds = new Set(residentRoles || []);
  const residents = members
    .filter((m) => residentIds.has(m.id))
    .map((m) => ({ ...m, graduation_year: graduationYears?.get(m.id) ?? null }));

  // Build a lookup for names
  const nameMap = new Map<string, string>();
  members.forEach((m) => nameMap.set(m.id, formatPersonName(m)));
  const allFeedback = feedbackQuery.data || [];
  const myFeedback = useMemo(() => allFeedback.filter((fb) => fb.faculty_id === user?.id), [allFeedback, user?.id]);

  // Filter for list view
  const filtered = myFeedback.filter((fb) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const residentName = (nameMap.get(fb.resident_id) || "").toLowerCase();
      const facultyName = (nameMap.get(fb.faculty_id) || "").toLowerCase();
      if (
        !fb.comment.toLowerCase().includes(q) &&
        !residentName.includes(q) &&
        !facultyName.includes(q)
      ) return false;
    }
    return true;
  });

  const sorted = useMemo(() => {
    return [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [filtered]);

  // Summary data
  const residentSummary = useMemo(() => {
    const map = new Map<string, { positive: number; negative: number; neutral: number }>();
    myFeedback.forEach((fb) => {
      if (!map.has(fb.resident_id)) map.set(fb.resident_id, { positive: 0, negative: 0, neutral: 0 });
      const entry = map.get(fb.resident_id)!;
      if (fb.sentiment === "positive") entry.positive++;
      else if (fb.sentiment === "neutral") entry.neutral++;
      else entry.negative++;
    });
    return Array.from(map.entries())
      .map(([id, counts]) => ({
        id,
        name: nameMap.get(id) || "?",
        ...counts,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [myFeedback, nameMap]);

  // List view cards
  const renderCards = () => {
    if (feedbackQuery.isLoading) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Loading...</p>
        </div>
      );
    }

    if (sorted.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No feedback yet.</p>
        </div>
      );
    }

    let prevGroup = "";
    const elements: React.ReactNode[] = [];

    sorted.forEach((fb) => {
      let groupKey = "";
      let groupLabel: string | null = null;

      try {
        const d = parseISO(fb.created_at);
        groupKey = format(d, "yyyy-MM");
        groupLabel = format(d, "MMMM yyyy");
      } catch {
        groupKey = "other";
      }

      if (groupKey !== prevGroup && groupLabel) {
        elements.push(
          <div
            key={`group-${groupKey}`}
            className="text-[11px] font-semibold uppercase tracking-wider pt-3 pb-1"
            style={{ color: "#8A9AAB", letterSpacing: "0.5px" }}
          >
            {groupLabel}
          </div>
        );
      }
      prevGroup = groupKey;

      const isExpanded = expandedId === fb.id;
      const dateInfo = formatCardDate(fb.created_at);
      const residentName = nameMap.get(fb.resident_id) || "?";
      const facultyName = nameMap.get(fb.faculty_id) || "?";
      const dotColor = fb.sentiment === "positive" ? "#52657A" : fb.sentiment === "neutral" ? "#4A846C" : "#D4A017";

      elements.push(
        <div
          key={fb.id}
          className="rounded-lg overflow-hidden cursor-pointer"
          style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4" }}
          onClick={() => setExpandedId(isExpanded ? null : fb.id)}
        >
          {/* Collapsed row */}
          <div className="flex items-center gap-2.5 px-3.5 py-3">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm truncate" style={{ color: "#2D3748" }}>
                {residentName}
              </span>
              {dateInfo && (
                <span className="text-[11px] whitespace-nowrap shrink-0 text-muted-foreground">
                  {dateInfo.text}
                </span>
              )}
            </div>
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{ background: dotColor }}
            />
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <div className="px-3.5 pb-3" onClick={(e) => e.stopPropagation()}>
              {fb.comment && fb.comment !== "<p></p>" && fb.comment.trim() !== "" && (
                <div className="mb-2">
                  <DetailReadOnly html={fb.comment} />
                </div>
              )}
              {/* Milestone pills from junction table */}
              {fb.feedback_milestones && fb.feedback_milestones.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {fb.feedback_milestones.map((fm) => {
                    let code = "";
                    let catColor = "#8A9AAB";
                    if (acgmeCategories) {
                      for (const cat of acgmeCategories) {
                        const sub = cat.subcategories.find(s => s.id === fm.subcategory_id);
                        if (sub) {
                          code = sub.code;
                          catColor = cat.color;
                          break;
                        }
                      }
                    }
                    if (!code) return null;
                    return (
                      <Popover key={fm.id}>
                        <PopoverTrigger asChild>
                          <button
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1"
                            style={{ background: "#F5F3EE", border: "0.5px solid #D5DAE0" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: catColor }} />
                            <span className="text-xs" style={{ color: "#2D3748" }}>
                              {code} &gt; L{fm.level}
                            </span>
                            {fm.source === "auto" && (
                              <span className="text-[9px]" style={{ color: "#8A9AAB" }}>AI</span>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-2"
                          style={{ background: "#F5F3EE", border: "1px solid #C9CED4", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-xs font-medium mb-2" style={{ color: "#2D3748" }}>{code} — Level</div>
                          <div className="flex gap-1 mb-2">
                            {[0, 1, 2, 3, 4, 5].map(lvl => (
                              <button
                                key={lvl}
                                onClick={() => updateMilestone(fm.id, { level: lvl })}
                                className="w-7 h-7 rounded text-xs font-medium"
                                style={{
                                  background: fm.level === lvl ? "#415162" : "#E7EBEF",
                                  color: fm.level === lvl ? "#fff" : "#2D3748",
                                  border: "none",
                                }}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setViewSubcategoryId(fm.subcategory_id)}
                            className="text-xs w-full py-1 rounded flex items-center justify-center gap-1"
                            style={{ background: "#E7EBEF", color: "#415162", border: "none", marginBottom: 4 }}
                          >
                            <ExternalLink className="h-3 w-3" /> View levels
                          </button>
                          <button
                            onClick={() => deleteMilestone(fm.id)}
                            className="text-xs w-full py-1 rounded"
                            style={{ background: "transparent", color: "#c44444", border: "none" }}
                          >
                            Remove
                          </button>
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>
              )}
              {/* Eval domain pills */}
              {fb.feedback_eval_domains && fb.feedback_eval_domains.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {fb.feedback_eval_domains.map((ed) => {
                    const domainLabels: Record<string, string> = {
                      direct_patient_care: "Patient Care",
                      medical_knowledge: "Med Knowledge",
                      clinical_reasoning: "Clinical Reasoning",
                      evidence_based: "Evidence-Based",
                      communication: "Communication",
                      care_transitions: "Care Transitions",
                      professionalism_flag: "Professionalism",
                    };
                    const isProfFlag = ed.domain === "professionalism_flag";
                    const ratingOptions = isProfFlag
                      ? [{ value: "none", label: "No Concerns" }, { value: "minor", label: "Minor" }, { value: "significant", label: "Significant" }]
                      : [{ value: "needs_improvement", label: "Needs Improvement" }, { value: "meets", label: "Meets" }, { value: "exceeds", label: "Exceeds" }, { value: "na", label: "N/A" }];
                    const ratingLabels: Record<string, string> = {
                      needs_improvement: "Needs Improvement", meets: "Meets", exceeds: "Exceeds", na: "N/A",
                      none: "No Concerns", minor: "Minor", significant: "Significant",
                    };
                    const ratingColors: Record<string, string> = {
                      needs_improvement: "#D4A017", meets: "#4A846C", exceeds: "#52657A", na: "#8A9AAB",
                      none: "#4A846C", minor: "#D4A017", significant: "#c44444",
                    };
                    return (
                      <Popover key={ed.id}>
                        <PopoverTrigger asChild>
                          <button
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1"
                            style={{ background: "#F5F3EE", border: "0.5px solid #D5DAE0" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] font-medium" style={{ color: ratingColors[ed.rating] || "#8A9AAB" }}>
                              {domainLabels[ed.domain] || ed.domain}: {ratingLabels[ed.rating] || ed.rating}
                            </span>
                            {ed.source === "auto" && (
                              <span className="text-[9px]" style={{ color: "#8A9AAB" }}>AI</span>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-2"
                          style={{ background: "#F5F3EE", border: "1px solid #C9CED4", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-xs font-medium mb-2" style={{ color: "#2D3748" }}>{domainLabels[ed.domain] || ed.domain}</div>
                          <div className="flex flex-col gap-1 mb-2">
                            {ratingOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => updateEvalDomain(ed.id, { rating: opt.value })}
                                className="text-xs px-2 py-1 rounded text-left"
                                style={{
                                  background: ed.rating === opt.value ? "#415162" : "#E7EBEF",
                                  color: ed.rating === opt.value ? "#fff" : "#2D3748",
                                  border: "none",
                                }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => deleteEvalDomain(ed.id)}
                            className="text-xs w-full py-1 rounded"
                            style={{ background: "transparent", color: "#c44444", border: "none" }}
                          >
                            Remove
                          </button>
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>
              )}
              {/* Legacy competency pill (for old feedback entries) */}
              {(!fb.feedback_milestones || fb.feedback_milestones.length === 0) && (() => {
                const sel = buildSelectionFromFeedback(
                  acgmeCategories || [],
                  fb.competency_category_id,
                  fb.competency_subcategory_id,
                  fb.competency_milestone_id,
                );
                if (!sel) return null;
                return (
                  <div
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 mb-2"
                    style={{ background: "#E7EBEF" }}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: sel.color }}
                    />
                    <span className="text-xs" style={{ color: "#2D3748" }}>
                      {sel.label}
                    </span>
                  </div>
                );
              })()}
              <div className="flex items-center justify-between">
                <div className="text-xs" style={{ color: "#8A9AAB" }}>
                  {facultyName}
                </div>
                <div className="flex items-center gap-2">
                  <EditFeedbackDialog
                    feedback={fb}
                    residents={residents}
                    onSubmit={(data) => updateFeedback.mutate({ id: fb.id, ...data })}
                  />
                  <AlertDialog>
                     <AlertDialogTrigger asChild>
                       <button
                         className="p-1 text-[#8A9AAB] hover:text-[#c44444]"
                         onClick={(e) => e.stopPropagation()}
                       >
                         <Trash2 className="h-3.5 w-3.5" />
                       </button>
                     </AlertDialogTrigger>
                     <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                       <AlertDialogHeader>
                         <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
                         <AlertDialogDescription>
                           This will permanently delete this feedback entry. This action cannot be undone.
                         </AlertDialogDescription>
                       </AlertDialogHeader>
                       <AlertDialogFooter>
                         <AlertDialogCancel>Cancel</AlertDialogCancel>
                         <AlertDialogAction
                           onClick={(e) => {
                             e.stopPropagation();
                             deleteFeedback.mutate(fb.id, {
                               onSuccess: () => setExpandedId(null),
                             });
                           }}
                           className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                         >
                           Delete
                         </AlertDialogAction>
                       </AlertDialogFooter>
                     </AlertDialogContent>
                   </AlertDialog>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    });

    return elements;
  };

  // Summary view
  const renderSummary = () => {
    if (feedbackQuery.isLoading) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Loading...</p>
        </div>
      );
    }

    if (residentSummary.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No feedback yet.</p>
        </div>
      );
    }

    return residentSummary.map((r) => (
      <div
        key={r.id}
        className="rounded-lg cursor-pointer"
        style={{ background: "#E7EBEF", border: "1px solid #C9CED4", padding: "12px 14px" }}
        onClick={() => {
          setSearchQuery(r.name);
          setSearchOpen(true);
          setViewMode("list");
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: "#2D3748" }}>
            {r.name}
          </span>
          <span className="text-[11px]" style={{ color: "#5F7285" }}>{r.positive}</span>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#52657A" }} />
          <span className="text-[11px]" style={{ color: "#5F7285" }}>{r.neutral}</span>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#4A846C" }} />
          <span className="text-[11px]" style={{ color: "#5F7285" }}>{r.negative}</span>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#D4A017" }} />
          <FeedbackPie positive={r.positive} negative={r.negative} neutral={r.neutral} />
        </div>
      </div>
    ));
  };


  return (
    <div className="min-h-screen bg-background pb-20" style={{ background: "#F5F3EE" }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: "#415162" }}>
        <div className="container flex items-center h-14 px-4">
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                background: "transparent",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                color: "rgba(255,255,255,0.8)",
              }}
              title="Search"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery("");
              }}
            >
              {searchOpen ? <XIcon style={{ width: 17, height: 17 }} /> : <Search style={{ width: 17, height: 17 }} />}
            </button>
            <NotificationBell />
          </HeaderLogo>
        </div>
        {searchOpen && (
          <div className="container px-4 pb-3">
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search feedback..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}
      </header>

      <main className="container max-w-[1200px] px-4 py-6">
        <Tabs defaultValue="list" onValueChange={(v) => setViewMode(v as any)}>
        {/* Toolbar */}
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex gap-2 items-center">
            {/* Overall pie chart */}
            {(() => {
              const total = myFeedback.length;
              const posCount = myFeedback.filter((fb) => fb.sentiment === "positive").length;
              const negCount = myFeedback.filter((fb) => fb.sentiment === "negative").length;
              const neuCount = myFeedback.filter((fb) => fb.sentiment === "neutral").length;
              const posPct = total > 0 ? (posCount / total) * 100 : 0;
              const negPct = total > 0 ? (negCount / total) * 100 : 0;
              const neuPct = total > 0 ? (neuCount / total) * 100 : 0;

              if (total === 0) return null;

              const cx = 14, cy = 14, r = 12;
              const toRad = (deg: number) => (deg * Math.PI) / 180;
              const pt = (angle: number) => ({
                x: cx + r * Math.sin(toRad(angle)),
                y: cy - r * Math.cos(toRad(angle)),
              });
              const arc = (start: number, sweep: number, color: string) => {
                if (sweep <= 0) return null;
                if (sweep >= 359.99) return <circle key={color} cx={cx} cy={cy} r={r} fill={color} />;
                const s = pt(start); const e = pt(start + sweep);
                return <path key={color} d={`M${cx} ${cy} L${s.x} ${s.y} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${e.x} ${e.y} Z`} fill={color} />;
              };
              const negAngle = (negCount / total) * 360;
              const neuAngle = (neuCount / total) * 360;
              const posAngle = (posCount / total) * 360;

              return (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="shrink-0 bg-transparent border-none cursor-pointer p-0">
                      <svg width="28" height="28" viewBox="0 0 28 28">
                        {arc(0, negAngle, "#D4A017")}
                        {arc(negAngle, neuAngle, "#4A846C")}
                        {arc(negAngle + neuAngle, posAngle, "#52657A")}
                      </svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <div className="flex flex-col gap-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: "#52657A" }} />
                        <span>Positive: {Math.round(posPct)}% ({posCount})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: "#4A846C" }} />
                        <span>Neutral: {Math.round(neuPct)}% ({neuCount})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: "#D4A017" }} />
                        <span>Negative: {Math.round(negPct)}% ({negCount})</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Total: {total}</div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })()}

            <TabsList className="gap-1 h-auto p-1 bg-transparent">
              <TabsTrigger value="list" className="flex flex-col items-center gap-0.5 h-auto px-2 py-1" title="List">
                <List className="h-4 w-4" />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>List</span>
              </TabsTrigger>
              <TabsTrigger value="summary" className="flex flex-col items-center gap-0.5 h-auto px-2 py-1" title="Summary">
                <PieChart className="h-4 w-4" />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>Summary</span>
              </TabsTrigger>
              {canGenerateReport && (
                <TabsTrigger value="report" className="flex flex-col items-center gap-0.5 h-auto px-2 py-1" title="Report">
                  <FileText className="h-4 w-4" />
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>Report</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="milestones" className="flex flex-col items-center gap-0.5 h-auto px-2 py-1" title="Milestones">
                <BookOpen className="h-4 w-4" />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>Milestones</span>
              </TabsTrigger>
            </TabsList>
          </div>
          {/* Add button */}
          <CreateFeedbackDialog
            onSubmit={handleCreateFeedback}
            residents={residents}
          />
        </div>

        {/* Content */}
        <TabsContent value="list" className="mt-0">
          <div className="flex flex-col gap-2">
            {renderCards()}
          </div>
        </TabsContent>
        <TabsContent value="summary" className="mt-0">
          <div className="flex flex-col gap-2">
            {renderSummary()}
          </div>
        </TabsContent>
        {canGenerateReport && (
          <TabsContent value="report" className="mt-0">
            <div className="flex flex-col gap-2">
              <MilestoneReport />
            </div>
          </TabsContent>
        )}
        <TabsContent value="milestones" className="mt-0">
          <div className="flex flex-col gap-2">
            <MilestonesBrowser />
          </div>
        </TabsContent>
        </Tabs>
      </main>

      {/* Milestone level detail dialog */}
      <Dialog open={!!viewSubcategoryId} onOpenChange={(open) => { if (!open) setViewSubcategoryId(null); }}>
        <DialogContent
          className="rounded-lg p-5 max-w-[calc(100vw-2rem)] w-full sm:max-w-md overflow-hidden"
          style={{ background: "#F5F3EE", border: "1px solid #C9CED4", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}
          overlayClassName="bg-[rgba(65,81,98,0.45)] backdrop-blur-sm"
        >
          <div className="overflow-y-auto max-h-[80vh]">
            {(() => {
              if (!viewSubcategoryId || !acgmeCategories) return null;
              let subName = "";
              let subCode = "";
              let catColor = "#8A9AAB";
              let milestones: { level: number; description: string; summary: string | null }[] = [];
              for (const cat of acgmeCategories) {
                const sub = cat.subcategories.find(s => s.id === viewSubcategoryId);
                if (sub) {
                  subName = sub.name;
                  subCode = sub.code;
                  catColor = cat.color;
                  milestones = sub.milestones.sort((a, b) => a.level - b.level);
                  break;
                }
              }
              return (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ background: catColor }} />
                    <span className="text-base font-semibold" style={{ color: "#2D3748" }}>
                      {subCode}: {subName}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {milestones.map(m => (
                      <div
                        key={m.level}
                        className="rounded-lg px-3 py-2.5"
                        style={{ background: "#E7EBEF", border: "0.5px solid #D5DAE0" }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: "#415162", color: "#fff", minWidth: 20, textAlign: "center" }}
                          >
                            {m.level}
                          </span>
                          {m.summary && (
                            <span className="text-xs font-medium" style={{ color: "#2D3748" }}>
                              {m.summary}
                            </span>
                          )}
                        </div>
                        <div className="text-xs leading-relaxed" style={{ color: "#5F7285" }}>
                          <ul style={{ margin: 0, paddingLeft: 16, listStyleType: "disc" }}>
                            {m.description.split(/(?<=\.)\s+/).filter(s => s.trim()).map((sentence, i) => (
                              <li key={i} style={{ marginBottom: 2 }}>{sentence}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Feedback;
