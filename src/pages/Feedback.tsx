import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { List, PieChart, FileText, BookOpen, Pencil, Trash2, X as XIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const { feedbackQuery, createFeedback, updateFeedback, deleteFeedback } = useFeedback();
  const { data: acgmeCategories } = useACGMECompetencies();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "summary" | "report" | "milestones">("list");

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
      const dotColor = fb.sentiment === "positive" ? "#5E9E82" : fb.sentiment === "neutral" ? "#C49A1A" : "#A63333";

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
              {/* Competency pill */}
              {(() => {
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
                         className="p-1 text-[#8A9AAB] hover:text-[#A63333]"
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
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#5E9E82" }} />
          <span className="text-[11px]" style={{ color: "#5F7285" }}>{r.neutral}</span>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#C49A1A" }} />
          <span className="text-[11px]" style={{ color: "#5F7285" }}>{r.negative}</span>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#A63333" }} />
          <FeedbackPie positive={r.positive} negative={r.negative} neutral={r.neutral} />
        </div>
      </div>
    ));
  };


  return (
    <div className="min-h-screen bg-background pb-20" style={{ background: "#F5F3EE" }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: "#415162" }}>
        <div className="container flex items-center justify-between h-14 px-4">
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut} />
          <div className="flex items-center gap-1 text-white/50">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-transparent"
              title="Search"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery("");
              }}
            >
              {searchOpen ? <XIcon className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
            <NotificationBell />
          </div>
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
                        {arc(0, negAngle, "#A63333")}
                        {arc(negAngle, neuAngle, "#C49A1A")}
                        {arc(negAngle + neuAngle, posAngle, "#5E9E82")}
                      </svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <div className="flex flex-col gap-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: "#5E9E82" }} />
                        <span>Positive: {Math.round(posPct)}% ({posCount})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: "#C49A1A" }} />
                        <span>Neutral: {Math.round(neuPct)}% ({neuCount})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: "#A63333" }} />
                        <span>Negative: {Math.round(negPct)}% ({negCount})</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Total: {total}</div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })()}


            {/* View toggle pill — rounded-full matching Events page */}
            <div className="flex items-center rounded-full p-0.5" style={{ background: "#D5DAE0" }}>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full transition-colors",
                  viewMode === "list" ? "bg-white shadow-sm" : ""
                )}
              >
                <List
                  className="h-3.5 w-3.5"
                  style={{ color: viewMode === "list" ? "#415162" : "#8A9AAB" }}
                />
              </button>
              <button
                onClick={() => setViewMode("summary")}
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full transition-colors",
                  viewMode === "summary" ? "bg-white shadow-sm" : ""
                )}
              >
                <PieChart
                  className="h-3.5 w-3.5"
                  style={{ color: viewMode === "summary" ? "#415162" : "#8A9AAB" }}
                />
              </button>
              {canGenerateReport && (
                <button
                  onClick={() => setViewMode("report")}
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full transition-colors",
                    viewMode === "report" ? "bg-white shadow-sm" : ""
                  )}
                >
                  <FileText
                    className="h-3.5 w-3.5"
                    style={{ color: viewMode === "report" ? "#415162" : "#8A9AAB" }}
                  />
                </button>
              )}
              <button
                onClick={() => setViewMode("milestones")}
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full transition-colors",
                  viewMode === "milestones" ? "bg-white shadow-sm" : ""
                )}
              >
                <BookOpen
                  className="h-3.5 w-3.5"
                  style={{ color: viewMode === "milestones" ? "#415162" : "#8A9AAB" }}
                />
              </button>
            </div>
          </div>
          {/* Add button */}
          <CreateFeedbackDialog
            onSubmit={(data) => createFeedback.mutate(data)}
            residents={residents}
          />
        </div>


        {/* Content */}
        <div className="flex flex-col gap-2">
          {viewMode === "list" || (!canGenerateReport && viewMode === "report") ? renderCards() : viewMode === "summary" ? renderSummary() : viewMode === "report" ? <MilestoneReport /> : <MilestonesBrowser />}
        </div>
      </main>

    </div>
  );
};

export default Feedback;
