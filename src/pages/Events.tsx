import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Calendar, Search, X, ClipboardCheck, Pencil, BookMarked } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatCardDate, ordinalSuffix } , getInitials } from "@/lib/dateFormat";
import CreateEventDialog from "@/components/events/CreateEventDialog";
import EditEventDialog from "@/components/events/EditEventDialog";
import EvaluationDialog from "@/components/events/EvaluationDialog";
import EventsGantt from "@/components/events/EventsGantt";
import EventsVerticalTimeline from "@/components/events/EventsVerticalTimeline";
import NotificationBell from "@/components/NotificationBell";
import HeaderLogo from "@/components/HeaderLogo";
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
  onEdit,
  onConfirmRecurrence,
  onSkipRecurrence,
  sectionName,
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
  onEdit: (event: ProgramEvent) => void;
  onConfirmRecurrence: (event: ProgramEvent, nextDate: string) => void;
  onSkipRecurrence: (id: string) => void;
  sectionName?: string | null;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const [confirmingRecurrence, setConfirmingRecurrence] = useState(false);
  const navigate = useNavigate();
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

  const hasDetails = !!sectionName || !!event.description || (isFacultyOrAdmin && event.category === "didactic") || (canEdit && hasRecurrence && (isRecurrenceOverdue || isRecurrenceSoon) && !event.recurrence_confirmed);

  return (
    <div
      className="border rounded-[10px] overflow-hidden transition-all mb-2 select-none"
      style={{ background: "#E7EBEF", borderColor: "#D5DAE0", WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
    >
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("button")) return;
          if (hasDetails) setExpanded(!expanded);
        }}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
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
        <div className="shrink-0">
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
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border" style={{ color: "#A0AEC0", borderColor: "#CBD5E0" }}>?</div>
          )}
        </div>
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(event); }}
            style={{ padding: 4, background: "transparent", border: "none", cursor: "pointer", color: "#8A9AAB", display: "flex", flexShrink: 0 }}
          >
            <Pencil style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      {expanded && (
        <div style={{ padding: "0 12px 10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {sectionName && (
            <div
              onClick={(e) => { e.stopPropagation(); navigate(`/handbook?section=${(event as any).operations_section_id}`); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", background: "#F5F3EE", borderRadius: 6, cursor: "pointer" }}
            >
              <BookMarked style={{ width: 14, height: 14, color: "#415162", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#415162", fontWeight: 500, textDecoration: "underline", textDecorationColor: "#C9CED4" }}>{sectionName}</span>
            </div>
          )}

          {(event.description || timeRange) && (
            <div style={{ fontSize: 12, color: "#5F7285", lineHeight: 1.5, padding: "2px 8px" }}>
              {formattedDate}{timeRange ? ` · ${timeRange}` : ""}
              {event.description && <> · {event.description}</>}
            </div>
          )}

          {isFacultyOrAdmin && event.category === "didactic" && (
            <div style={{ padding: "2px 8px" }}>
              <button
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", fontSize: 11, fontWeight: 500,
                  color: hasEvaluated ? "#5E9E82" : "#415162",
                  background: "#F5F3EE", border: "0.5px solid #C9CED4", borderRadius: 6, cursor: "pointer",
                }}
                onClick={(e) => { e.stopPropagation(); setEvalDialogOpen(true); }}
              >
                <ClipboardCheck className="h-3.5 w-3.5" style={{ color: hasEvaluated ? "#5E9E82" : "#415162" }} />
                {hasEvaluated ? "Evaluated" : "Evaluate"}
              </button>
            </div>
          )}

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
  onEdit,
  onConfirmRecurrence,
  onSkipRecurrence,
  sectionNameMap,
  emptyMessage,
  highlightId,
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
  onEdit: (event: ProgramEvent) => void;
  onConfirmRecurrence: (event: ProgramEvent, nextDate: string) => void;
  onSkipRecurrence: (id: string) => void;
  sectionNameMap: Map<string, string>;
  emptyMessage: string;
  highlightId?: string | null;
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
            <div key={ev.id} style={{ borderRadius: 8, boxShadow: highlightId === ev.id ? "0 0 0 2px #D4A017" : "none", transition: "box-shadow 0.3s ease" }}>
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
              onEdit={onEdit}
              onConfirmRecurrence={onConfirmRecurrence}
              onSkipRecurrence={onSkipRecurrence}
              sectionName={(ev as any).operations_section_id ? sectionNameMap.get((ev as any).operations_section_id) || null : null}
            />
            </div>
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
  const [editingEvent, setEditingEvent] = useState<ProgramEvent | null>(null);

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

  // Fetch handbook section names for events with operations_section_id
  const eventSectionIds = [...new Set((events.data || []).map(e => (e as any).operations_section_id).filter(Boolean))] as string[];
  const { data: eventSectionNameMap } = useQuery({
    queryKey: ["event-section-names", eventSectionIds.join(",")],
    enabled: eventSectionIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("handbook_sections")
        .select("id, title")
        .in("id", eventSectionIds);
      const map = new Map<string, string>();
      (data || []).forEach((s: any) => map.set(s.id, s.title));
      return map;
    },
  });
  const sectionNameMap = eventSectionNameMap || new Map<string, string>();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "vertical" | "gantt">("list");
  const [showPast, setShowPast] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const highlight = searchParams.get("highlight");
    if (highlight) {
      setHighlightId(highlight);
      setTimeout(() => setHighlightId(null), 2000);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

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

          {/* Row 1: View tabs + Add button */}
          <div className="flex items-start justify-between" style={{ paddingTop: 8, paddingBottom: 8 }}>
            <div style={{ display: "flex", gap: 16 }}>
              {([
                { mode: "list" as const, label: "List" },
                { mode: "vertical" as const, label: "Timeline" },
                { mode: "gantt" as const, label: "Gantt" },
              ] as { mode: "list" | "vertical" | "gantt"; label: string }[]).map(({ mode, label }) => (
                <span
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    fontSize: 13, fontWeight: 500, cursor: "pointer",
                    color: viewMode === mode ? "#415162" : "#8A9AAB",
                    borderBottom: viewMode === mode ? "2px solid #415162" : "2px solid transparent",
                    paddingBottom: 2,
                  }}
                >
                  {label}
                </span>
              ))}
              {(viewMode === "list" || viewMode === "vertical") && (
                <span
                  onClick={() => setShowPast(!showPast)}
                  style={{
                    fontSize: 13, fontWeight: 500, cursor: "pointer",
                    color: showPast ? "#415162" : "#8A9AAB",
                    borderBottom: showPast ? "2px solid #415162" : "2px solid transparent",
                    paddingBottom: 2,
                  }}
                >
                  {showPast ? "Hide past" : "Show past"}
                </span>
              )}
            </div>

            {canEditEvents && (
              <CreateEventDialog
                onSubmit={(data) => createEvent.mutate(data)}
                defaultCategory={activeCategories.size === 1 ? (Array.from(activeCategories)[0] as EventCategory) : "program"}
              />
            )}
          </div>

          {/* Row 2: Category pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingBottom: 10 }}>
            <button
              onClick={handleAllClick}
              style={{
                fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20,
                border: isAllSelected ? "1px solid #415162" : "1px solid #C9CED4",
                background: isAllSelected ? "#415162" : "transparent",
                color: isAllSelected ? "#fff" : "#8A9AAB",
                cursor: "pointer",
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
                    fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20,
                    border: isActive ? "1px solid #415162" : "1px solid #C9CED4",
                    background: isActive ? "#415162" : "transparent",
                    color: isActive ? "#fff" : "#8A9AAB",
                    cursor: "pointer",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>}


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
            onEdit={(event) => setEditingEvent(event)}
            onConfirmRecurrence={(event, nextDate) => { if (canEditEvents) confirmRecurrence.mutate({ event, nextDate }); }}
            onSkipRecurrence={(id) => { if (canEditEvents) skipRecurrence.mutate(id); }}
            sectionNameMap={sectionNameMap}
            emptyMessage={isAllSelected ? "No events" : `No events in selected categories`}
            highlightId={highlightId}
          />
        )}
      </main>

      {editingEvent && (
        <EditEventDialog
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => { if (!open) setEditingEvent(null); }}
          clinicalTopics={clinicalTopicsData}
          onCreateTopic={handleCreateTopic}
          onUpdate={(data) => { updateEvent.mutate(data); setEditingEvent(null); }}
          onDelete={(id) => { deleteEvent.mutate(id); setEditingEvent(null); }}
        />
      )}

    </div>
  );
};

export default Events;
