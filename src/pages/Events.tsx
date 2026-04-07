import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEvents, calcNextOccurrence, RECURRENCE_LABELS } from "@/hooks/useEvents";
import type { ProgramEvent, EventCategory, RecurrencePattern } from "@/hooks/useEvents";
import { useEventCategories } from "@/hooks/useEventCategories";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Calendar, Search, X, Trash2, List, ClipboardCheck, ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatCardDate, ordinalSuffix } from "@/lib/dateFormat";
import CreateEventDialog from "@/components/events/CreateEventDialog";
import EditEventDialog from "@/components/events/EditEventDialog";
import EvaluationDialog from "@/components/events/EvaluationDialog";
import EventsGantt from "@/components/events/EventsGantt";
import EventsVerticalTimeline from "@/components/events/EventsVerticalTimeline";
import NotificationBell from "@/components/NotificationBell";
import HeaderLogo from "@/components/HeaderLogo";
import OperationsLinkPill from "@/components/shared/OperationsLinkPill";
import { useClinicalTopics } from "@/hooks/useClinicalTopics";

const VerticalTimelineIcon = ({ className }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

const GanttIcon = ({ className }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
    <line x1="3" y1="6" x2="15" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="5" y1="18" x2="17" y2="18" />
  </svg>
);

const getInitials = (name: string | null): string => {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
};

const getColor = (name: string | null): string => {
  const cols = ["#378ADD", "#1D9E75", "#D85A30", "#534AB7", "#993556"];
  let h = 0;
  if (name) for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return cols[Math.abs(h) % cols.length];
};

const formatTime = (t: string | null): string => {
  if (!t) return "";
  try {
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    const ampm = hr >= 12 ? "PM" : "AM";
    const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
    return `${hr12}:${m} ${ampm}`;
  } catch {
    return t;
  }
};

const EventCard = ({
  event,
  teamMembers,
  canEdit,
  isFacultyOrAdmin,
  evaluationStatus,
  clinicalTopics,
  onCreateTopic,
  onUpdate,
  onDelete,
  onConfirmRecurrence,
  onSkipRecurrence,
}: {
  event: ProgramEvent;
  teamMembers: ReturnType<typeof useTeamMembers>["data"];
  canEdit: boolean;
  isFacultyOrAdmin: boolean;
  evaluationStatus?: Record<string, boolean>;
  clinicalTopics?: import("@/hooks/useClinicalTopics").ClinicalTopic[];
  onCreateTopic?: (title: string) => Promise<void>;
  onUpdate: (data: {
    id: string;
    title?: string;
    event_date?: string;
    end_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    description?: string | null;
    category?: EventCategory;
    assigned_to?: string | null;
    recurrence_pattern?: RecurrencePattern;
    topic_id?: string | null;
  }) => void;
  onDelete: (id: string) => void;
  onConfirmRecurrence: (event: ProgramEvent, nextDate: string) => void;
  onSkipRecurrence: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [confirmingRecurrence, setConfirmingRecurrence] = useState(false);
  const members = teamMembers || [];
  const assignee = members.find((m) => m.id === event.assigned_to);
  const assigneeName = assignee?.display_name || null;
  const hasEvaluated = evaluationStatus?.[event.id] ?? false;

  // Recurrence logic
  const hasRecurrence = event.recurrence_pattern && event.recurrence_pattern !== "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(event.event_date);
  const isPastDue = eventDate < today;
  const isRecurrenceOverdue = hasRecurrence && isPastDue && !event.recurrence_confirmed;
  const isRecurrenceSoon = hasRecurrence && !isPastDue && !event.recurrence_confirmed &&
    (eventDate.getTime() - today.getTime()) < 14 * 24 * 60 * 60 * 1000; // within 14 days

  const suggestedNext = hasRecurrence
    ? (event.recurrence_pattern === "custom" ? null : calcNextOccurrence(event.recurrence_pattern, event.event_date))
    : null;

  const [nextDateInput, setNextDateInput] = useState(suggestedNext || "");

  const formattedDate = (() => {
    try {
      const startStr = format(parseISO(event.event_date), "EEE d");
      if (event.end_date && event.end_date !== event.event_date) {
        const start = parseISO(event.event_date);
        const end = parseISO(event.end_date);
        if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
          return `${format(start, "EEE d")} – ${format(end, "d")}`;
        }
        return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
      }
      return startStr;
    } catch {
      return event.event_date;
    }
  })();

  const timeRange = (() => {
    if (!event.start_time) return null;
    const start = formatTime(event.start_time);
    const end = event.end_time ? formatTime(event.end_time) : null;
    return end ? `${start} — ${end}` : start;
  })();

  return (
    <div
      className="border rounded-[10px] overflow-hidden transition-all mb-2 cursor-pointer"
      style={{ background: "#E7EBEF", borderColor: "#D5DAE0" }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#DFE3E8"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#E7EBEF"}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center min-h-[48px] px-2">
        <div className="flex-1 min-w-0 pl-2 pr-1 flex items-center gap-2">
          <span className="font-medium text-sm truncate">{event.title}</span>
          {/* Recurrence status badge */}
          {isRecurrenceOverdue && (
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "#FCEBEB", color: "#791F1F", whiteSpace: "nowrap", flexShrink: 0, fontWeight: 500 }}>↻ overdue</span>
          )}
          {isRecurrenceSoon && !isRecurrenceOverdue && (
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "#FAEEDA", color: "#633806", whiteSpace: "nowrap", flexShrink: 0, fontWeight: 500 }}>↻ confirm soon</span>
          )}
          {hasRecurrence && event.recurrence_confirmed && (
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "#EAF3DE", color: "#27500A", whiteSpace: "nowrap", flexShrink: 0, fontWeight: 500 }}>↻ confirmed</span>
          )}
          {event.start_time && (
            <span className="text-[11px] whitespace-nowrap shrink-0 text-muted-foreground">
              {formatTime(event.start_time)}
            </span>
          )}
          {(() => {
            const dd = formatCardDate(event.event_date);
            if (!dd) return null;
            let dateText = dd.text;
            if (event.end_date && event.end_date !== event.event_date) {
              try {
                const start = parseISO(event.event_date);
                const end = parseISO(event.end_date);
                const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
                const endDay = end.getDate();
                dateText = sameMonth
                  ? `${dd.text} – ${endDay}${ordinalSuffix(endDay)}`
                  : `${dd.text} – ${format(end, "MMM")} ${endDay}${ordinalSuffix(endDay)}`;
              } catch {}
            }
            return (
              <span className={cn("text-[11px] whitespace-nowrap shrink-0", dd.urgent ? "text-destructive" : "text-muted-foreground")}>
                {dateText}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center shrink-0 gap-1.5 pr-1">
          {assignee ? (
            assignee.avatar_url ? (
              <img src={assignee.avatar_url} className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ fontSize: 10, fontWeight: 500, background: getColor(assigneeName) }}
              >
                {getInitials(assigneeName)}
              </div>
            )
          ) : (
            <div className="w-7 h-7 rounded-full bg-border/50 shrink-0" />
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ background: "#D5DAE0", padding: "8px 12px 10px" }} onClick={(e) => e.stopPropagation()}>
          <div className="text-[11px] text-muted-foreground" style={{ marginBottom: 8 }}>
            {formattedDate}{timeRange ? ` · ${timeRange}` : ""}
            {event.description && <> · {event.description}</>}
          </div>
          <OperationsLinkPill sectionId={(event as any).operations_section_id} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isFacultyOrAdmin && event.category === "didactic" && (
                <button
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: hasEvaluated ? "#5E9E82" : "#415162",
                    background: "#E7EBEF",
                    border: "0.5px solid #C9CED4",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEvalDialogOpen(true);
                  }}
                  title="Evaluate session"
                >
                  <ClipboardCheck
                    className="h-3.5 w-3.5"
                    style={{ color: hasEvaluated ? "#5E9E82" : "#415162" }}
                  />
                  {hasEvaluated ? "Evaluated" : "Evaluate"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {canEdit && (
                <>
                  <EditEventDialog event={event} clinicalTopics={clinicalTopics} onCreateTopic={onCreateTopic} onUpdate={onUpdate} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="flex items-center justify-center w-8 h-8 rounded-md bg-transparent text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete event?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{event.title}". This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(event.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>

          {/* Recurrence confirm/skip row — shown when overdue or soon */}
          {canEdit && hasRecurrence && (isRecurrenceOverdue || isRecurrenceSoon) && !event.recurrence_confirmed && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #E7EBEF" }}>
              <div style={{ fontSize: 11, color: isRecurrenceOverdue ? "#791F1F" : "#633806", fontWeight: 500, marginBottom: 6 }}>
                {isRecurrenceOverdue ? "This event is overdue — confirm next occurrence?" : "Confirm next occurrence"}
                {" · "}<span style={{ fontWeight: 400, color: "#888" }}>{RECURRENCE_LABELS[event.recurrence_pattern]}</span>
              </div>
              {confirmingRecurrence ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#666" }}>Next date:</span>
                    <input
                      type="date"
                      value={nextDateInput}
                      onChange={e => setNextDateInput(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #C9CED4", borderRadius: 5, outline: "none", background: "#fff", color: "#333" }}
                    />
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onConfirmRecurrence(event, nextDateInput); setConfirmingRecurrence(false); }}
                    disabled={!nextDateInput}
                    style={{ padding: "5px 12px", fontSize: 11, fontWeight: 500, color: "#fff", background: "#415162", border: "none", borderRadius: 5, cursor: "pointer" }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmingRecurrence(false); }}
                    style={{ padding: "5px 10px", fontSize: 11, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setNextDateInput(suggestedNext || ""); setConfirmingRecurrence(true); }}
                    style={{ padding: "5px 12px", fontSize: 11, fontWeight: 500, color: "#fff", background: "#415162", border: "none", borderRadius: 5, cursor: "pointer" }}
                  >
                    {suggestedNext
                      ? `Confirm ${new Date(suggestedNext).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : "Pick next date"}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onSkipRecurrence(event.id); }}
                    style={{ padding: "5px 10px", fontSize: 11, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}
                  >
                    Skip
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isFacultyOrAdmin && event.category === "didactic" && (
        <EvaluationDialog
          open={evalDialogOpen}
          onOpenChange={setEvalDialogOpen}
          eventId={event.id}
          eventTitle={event.title}
          eventDate={event.event_date}
          eventDescription={event.description}
        />
      )}
    </div>
  );
};

const GroupedEventList = ({
  events,
  teamMembers,
  userId,
  isAdmin,
  isFacultyOrAdmin,
  evaluationStatus,
  clinicalTopics,
  onCreateTopic,
  onUpdate,
  onDelete,
  onConfirmRecurrence,
  onSkipRecurrence,
  emptyMessage,
}: {
  events: ProgramEvent[];
  teamMembers: ReturnType<typeof useTeamMembers>["data"];
  userId: string | undefined;
  isAdmin: boolean;
  isFacultyOrAdmin: boolean;
  evaluationStatus?: Record<string, boolean>;
  clinicalTopics?: import("@/hooks/useClinicalTopics").ClinicalTopic[];
  onCreateTopic?: (title: string) => Promise<void>;
  onUpdate: (data: {
    id: string;
    title?: string;
    event_date?: string;
    end_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    description?: string | null;
    category?: EventCategory;
    assigned_to?: string | null;
    recurrence_pattern?: RecurrencePattern;
  }) => void;
  onDelete: (id: string) => void;
  onConfirmRecurrence: (event: ProgramEvent, nextDate: string) => void;
  onSkipRecurrence: (id: string) => void;
  emptyMessage: string;
}) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const now = new Date();
  const currentMonthLabel = format(now, "MMMM yyyy");

  const grouped: { month: string; isCurrentMonth: boolean; items: ProgramEvent[] }[] = [];
  events.forEach((ev) => {
    try {
      const m = format(parseISO(ev.event_date), "MMMM yyyy");
      const last = grouped[grouped.length - 1];
      if (last && last.month === m) {
        last.items.push(ev);
      } else {
        grouped.push({ month: m, isCurrentMonth: m === currentMonthLabel, items: [ev] });
      }
    } catch {
      const last = grouped[grouped.length - 1];
      if (last && last.month === "Other") {
        last.items.push(ev);
      } else {
        grouped.push({ month: "Other", isCurrentMonth: false, items: [ev] });
      }
    }
  });

  return (
    <>
      {grouped.map((g) => (
        <div key={g.month}>
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider pt-3 pb-1">
            {g.month}
          </div>
          {g.items.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              teamMembers={teamMembers}
              canEdit={isAdmin || ev.created_by === userId}
              isFacultyOrAdmin={isFacultyOrAdmin}
              evaluationStatus={evaluationStatus}
              clinicalTopics={clinicalTopics}
              onCreateTopic={onCreateTopic}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onConfirmRecurrence={onConfirmRecurrence}
              onSkipRecurrence={onSkipRecurrence}
            />
          ))}
        </div>
      ))}
    </>
  );
};

const Events = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { isResident, isFaculty } = useUserRole();
  const isMobile = useIsMobile();

  const { events, createEvent, updateEvent, deleteEvent, confirmRecurrence, skipRecurrence } = useEvents();
  const { data: teamMembers } = useTeamMembers();
  const { has: hasPerm } = usePermissions();
  const canEditEvents = hasPerm("events.edit");
  const canEvaluate = hasPerm("events.evaluate");
  const isFacultyOrAdmin = canEvaluate;

  // Clinical topics for didactic event linking
  const { topics: topicsQuery, createTopic } = useClinicalTopics();
  const clinicalTopicsData = topicsQuery.data || [];
  const handleCreateTopic = async (title: string) => { await createTopic.mutateAsync({ title }); };

  // Query evaluation status for current user (which events they've evaluated)
  const { data: evaluationStatus } = useQuery({
    queryKey: ["event-evaluation-status", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_evaluations")
        .select("event_id")
        .eq("evaluator_id", user!.id);
      const map: Record<string, boolean> = {};
      (data || []).forEach((d) => { map[d.event_id] = true; });
      return map;
    },
    enabled: !!user && isFacultyOrAdmin,
  });

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "vertical" | "gantt">("list");
  const [showPast, setShowPast] = useState(false);
  const navigate = useNavigate();

  const { categories, categoryLabels } = useEventCategories();

  const allCategoryNames = categories.map(c => c.name);
  const isAllSelected = activeCategories.size === 0;

  const filteredEvents = useMemo(() => {
    const all = events.data || [];
    const byCategory = isAllSelected ? all : all.filter((e) => activeCategories.has(e.category));
    const withSearch = searchQuery.trim()
      ? byCategory.filter(
          (e) =>
            e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (e.description || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
      : byCategory;

    // For list and timeline views, hide overdue events unless toggled
    if ((viewMode === "list" || viewMode === "vertical") && !showPast) {
      const todayStr = new Date().toISOString().split("T")[0];
      return withSearch.filter((e) => e.event_date >= todayStr);
    }

    return withSearch;
  }, [events.data, activeCategories, isAllSelected, searchQuery, viewMode, showPast]);

  const handleCategoryToggle = (cat: string) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleAllClick = () => {
    setActiveCategories(new Set());
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-[#415162] sticky top-0 z-40">
        <div className="flex items-center h-14 px-4">
          <HeaderLogo isAdmin={isAdmin} onSignOut={() => signOut()}>
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
              {searchOpen ? <X style={{ width: 17, height: 17 }} /> : <Search style={{ width: 17, height: 17 }} />}
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
              placeholder="Search events..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}
      </header>

      <main className="px-4 pt-0 pb-4" style={{ maxWidth: viewMode === "gantt" ? undefined : 900, margin: "0 auto" }}>

        {/* Sticky filter bar below header */}
        <div className="sticky z-30 bg-background" style={{ top: 56 }}>

          {viewMode === "gantt" ? (
            /* Gantt mode: back arrow + category tabs in one row */
            <div className="flex items-center" style={{ gap: 8, borderBottom: "1px solid #D5DAE0" }}>
              <button
                onClick={() => setViewMode("list")}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 28, height: 28, background: "transparent", border: "none",
                  cursor: "pointer", color: "#5F7285", flexShrink: 0,
                }}
              >
                <ArrowLeft style={{ width: 16, height: 16 }} />
              </button>
              <button
                onClick={handleAllClick}
                style={{
                  padding: "6px 0", marginRight: 20, border: "none",
                  borderBottom: isAllSelected ? "2px solid #415162" : "2px solid transparent",
                  cursor: "pointer", fontSize: 13, fontWeight: isAllSelected ? 700 : 500,
                  background: "transparent", color: isAllSelected ? "#415162" : "#8A9AAB",
                  whiteSpace: "nowrap",
                }}
              >
                All
              </button>
              {categories.map((cat) => {
                const isActive = activeCategories.has(cat.name);
                return (
                  <button
                    key={cat.name}
                    onClick={() => handleCategoryToggle(cat.name)}
                    style={{
                      padding: "6px 0", marginRight: 20, border: "none",
                      borderBottom: isActive ? "2px solid #415162" : "2px solid transparent",
                      cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 500,
                      background: "transparent", color: isActive ? "#415162" : "#8A9AAB",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          ) : (
            /* List/Timeline mode: category tabs + view toggles */
            <>
              {/* Row 1: Category tabs */}
              <div className="flex items-center" style={{ borderBottom: "1px solid #D5DAE0" }}>
                <button
                  onClick={handleAllClick}
                  style={{
                    padding: "6px 0", marginRight: 20, border: "none",
                    borderBottom: isAllSelected ? "2px solid #415162" : "2px solid transparent",
                    cursor: "pointer", fontSize: 13, fontWeight: isAllSelected ? 700 : 500,
                    background: "transparent", color: isAllSelected ? "#415162" : "#8A9AAB",
                    transition: "all 0.15s",
                  }}
                >
                  All
                </button>
                {categories.map((cat) => {
                  const isActive = activeCategories.has(cat.name);
                  return (
                    <button
                      key={cat.name}
                      onClick={() => handleCategoryToggle(cat.name)}
                      style={{
                        padding: "6px 0", marginRight: 20, border: "none",
                        borderBottom: isActive ? "2px solid #415162" : "2px solid transparent",
                        cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 500,
                        background: "transparent", color: isActive ? "#415162" : "#8A9AAB",
                        transition: "all 0.15s",
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Row 2: View toggles + Add button */}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-0.5">
                  {([
                    { mode: "list" as const, icon: <List className="h-4 w-4" />, label: "List" },
                    { mode: "vertical" as const, icon: <VerticalTimelineIcon />, label: "Timeline" },
                    { mode: "gantt" as const, icon: <GanttIcon />, label: "Gantt" },
                  ] as { mode: "list" | "vertical" | "gantt"; icon: React.ReactNode; label: string }[]).map(({ mode, icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors"
                      style={{ background: "transparent" }}
                    >
                      <span style={{ color: viewMode === mode ? "#415162" : "#8A9AAB" }}>{icon}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase", color: viewMode === mode ? "#415162" : "#8A9AAB" }}>{label}</span>
                    </button>
                  ))}
                  {(viewMode === "list" || viewMode === "vertical") && (
                    <button
                      onClick={() => setShowPast(!showPast)}
                      className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors"
                      style={{ background: "transparent" }}
                    >
                      <span style={{ color: showPast ? "#415162" : "#8A9AAB" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase", color: showPast ? "#415162" : "#8A9AAB" }}>{showPast ? "Hide past" : "Show past"}</span>
                    </button>
                  )}
                </div>

                {canEditEvents && (
                  <CreateEventDialog
                    onSubmit={(data) => createEvent.mutate(data)}
                    defaultCategory={activeCategories.size === 1 ? (Array.from(activeCategories)[0] as EventCategory) : "program"}
                  />
                )}
              </div>
            </>
          )}


        </div>

        {/* Content */}
        {events.isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : viewMode === "gantt" ? (
          <EventsGantt events={filteredEvents} />
        ) : viewMode === "vertical" ? (
          <EventsVerticalTimeline events={filteredEvents} />
        ) : (
          <GroupedEventList
            events={filteredEvents}
            teamMembers={teamMembers}
            userId={user?.id}
            isAdmin={canEditEvents}
            isFacultyOrAdmin={isFacultyOrAdmin}
            evaluationStatus={evaluationStatus}
            clinicalTopics={clinicalTopicsData}
            onCreateTopic={handleCreateTopic}
            onUpdate={(data) => { if (canEditEvents) updateEvent.mutate(data); }}
            onDelete={(id) => { if (canEditEvents) deleteEvent.mutate(id); }}
            onConfirmRecurrence={(event, nextDate) => { if (canEditEvents) confirmRecurrence.mutate({ event, nextDate }); }}
            onSkipRecurrence={(id) => { if (canEditEvents) skipRecurrence.mutate(id); }}
            emptyMessage={isAllSelected ? "No events" : `No events in selected categories`}
          />
        )}
      </main>

    </div>
  );
};

export default Events;
