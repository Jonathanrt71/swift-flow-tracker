import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useEvents, EVENT_CATEGORY_LABELS, EVENT_CATEGORY_COLORS, calcNextOccurrence, RECURRENCE_LABELS } from "@/hooks/useEvents";
import type { ProgramEvent, EventCategory, RecurrencePattern } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useUserRole } from "@/hooks/useUserRole";
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
import { Calendar, BookOpen, Search, X, Trash2, List, ClipboardCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatCardDate } from "@/lib/dateFormat";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import CreateEventDialog from "@/components/events/CreateEventDialog";
import EditEventDialog from "@/components/events/EditEventDialog";
import EvaluationDialog from "@/components/events/EvaluationDialog";
import EventsEvaluationsView from "@/components/events/EventsEvaluationsView";
import EventsGantt from "@/components/events/EventsGantt";
import EventsVerticalTimeline from "@/components/events/EventsVerticalTimeline";
import NotificationBell from "@/components/NotificationBell";
import HeaderLogo from "@/components/HeaderLogo";

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

const MONTH_ABBRS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
      return format(parseISO(event.event_date), "EEE d");
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
      className="bg-muted border border-border rounded-[10px] overflow-hidden transition-all mb-2 cursor-pointer"
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
            return dd ? (
              <span className={cn("text-[11px] whitespace-nowrap shrink-0", dd.urgent ? "text-destructive" : "text-muted-foreground")}>
                {dd.text}
              </span>
            ) : null;
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
        <div className="pb-2 pl-3 pr-3">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2 flex-1 min-w-0">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                {formattedDate}{timeRange ? ` · ${timeRange}` : ""}
              </span>
              {event.description && (
                <span className="text-xs text-muted-foreground truncate min-w-0">
                  {event.description}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0 ml-2">
              {isFacultyOrAdmin && event.category === "didactic" && (
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-md bg-transparent hover:bg-accent transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEvalDialogOpen(true);
                  }}
                  title="Evaluate session"
                >
                  <ClipboardCheck
                    className="h-3.5 w-3.5"
                    style={{ color: hasEvaluated ? "#5E9E82" : "#8A9AAB" }}
                  />
                </button>
              )}
              {canEdit && (
                <>
                  <EditEventDialog event={event} onUpdate={onUpdate} />
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
  const isFacultyOrAdmin = !!isAdmin || !!isFaculty;

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
  const [activeCategory, setActiveCategory] = useState<EventCategory | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "vertical" | "gantt" | "evaluations">("list");

  const ALL_CATEGORIES: EventCategory[] = ["program", "didactic", "committee", "compliance", "administrative", "wellness", "faculty"];

  const ganttRangeLabel = useMemo(() => {
    const n = new Date();
    const startYear = n.getFullYear() - 1;
    const endYear = n.getFullYear() + 2;
    const startMonthIdx = n.getMonth();
    const endMonthIdx = (n.getMonth() + 11) % 12;
    return `${MONTH_ABBRS[startMonthIdx]} ${startYear} — ${MONTH_ABBRS[endMonthIdx]} ${endYear}`;
  }, []);

  const filteredEvents = useMemo(() => {
    const all = events.data || [];
    const byCategory = activeCategory === "all" ? all : all.filter((e) => e.category === activeCategory);
    if (!searchQuery.trim()) return byCategory;
    const q = searchQuery.toLowerCase();
    return byCategory.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q)
    );
  }, [events.data, activeCategory, searchQuery]);

  const programEvents = useMemo(() => {
    if (activeCategory === "all") return events.data || [];
    return (events.data || []).filter((e) => e.category === activeCategory);
  }, [events.data, activeCategory]);

  const handleCategoryChange = (cat: EventCategory | "all") => {
    if (cat === activeCategory) return;
    if (cat === "didactic") {
      setViewMode("list");
    }
    setActiveCategory(cat);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-[#415162] sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14 px-4">
          <HeaderLogo isAdmin={isAdmin} onSignOut={() => signOut()} />
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
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
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
              placeholder="Search events..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}
      </header>

      <main className="container max-w-[1200px] px-4 py-4">
        {/* Row 1: Category filter pills */}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 10, paddingBottom: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: "max-content" }}>
            {/* All pill */}
            <button
              onClick={() => handleCategoryChange("all")}
              style={{
                padding: "5px 12px", fontSize: 12, fontWeight: activeCategory === "all" ? 600 : 400,
                borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap",
                background: activeCategory === "all" ? "#415162" : "#E7EBEF",
                color: activeCategory === "all" ? "#fff" : "#555",
                transition: "background 0.15s",
              }}
            >
              All
            </button>
            {ALL_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              const color = EVENT_CATEGORY_COLORS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  style={{
                    padding: "5px 12px", fontSize: 12, fontWeight: isActive ? 600 : 400,
                    borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap",
                    background: isActive ? color : "#E7EBEF",
                    color: isActive ? "#fff" : "#555",
                    transition: "background 0.15s",
                  }}
                >
                  {EVENT_CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: View toggle + Add button */}
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-2">
            {/* View toggle pill — hidden when didactic-only selected */}
            {activeCategory !== "didactic" && (
              <div
                className="flex items-center rounded-full p-0.5"
                style={{ background: "#D5DAE0" }}
              >
                {([
                  { mode: "list" as const, icon: <List className="h-3.5 w-3.5" /> },
                  { mode: "vertical" as const, icon: <VerticalTimelineIcon /> },
                  { mode: "gantt" as const, icon: <GanttIcon /> },
                  ...(isAdmin ? [{ mode: "evaluations" as const, icon: <ClipboardCheck className="h-3.5 w-3.5" /> }] : []),
                ]).map(({ mode, icon }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-full transition-colors",
                      viewMode === mode ? "bg-white shadow-sm" : ""
                    )}
                    style={{ color: viewMode === mode ? "#415162" : "#8A9AAB" }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isResident && (
            <CreateEventDialog
              onSubmit={(data) => createEvent.mutate(data)}
              defaultCategory={activeCategory === "all" ? "program" : activeCategory as EventCategory}
            />
          )}
        </div>

        {/* Row 3: Gantt label (only in gantt view) */}
        {viewMode === "gantt" && activeCategory !== "didactic" && (
          <div className="flex items-center justify-center pb-3">
            <span style={{ fontSize: 15, fontWeight: 500, color: "#2D3748" }}>
              {ganttRangeLabel}
            </span>
          </div>
        )}

        {/* Content */}
        {events.isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : viewMode === "evaluations" ? (
          <EventsEvaluationsView events={events.data || []} />
        ) : viewMode === "gantt" && activeCategory !== "didactic" ? (
          <EventsGantt
            events={programEvents}
          />
        ) : viewMode === "vertical" && activeCategory !== "didactic" ? (
          <EventsVerticalTimeline events={programEvents} />
        ) : (
          <GroupedEventList
            events={filteredEvents}
            teamMembers={teamMembers}
            userId={user?.id}
            isAdmin={!isResident && !!isAdmin}
            isFacultyOrAdmin={isFacultyOrAdmin}
            evaluationStatus={evaluationStatus}
            onUpdate={(data) => { if (!isResident) updateEvent.mutate(data); }}
            onDelete={(id) => { if (!isResident) deleteEvent.mutate(id); }}
            onConfirmRecurrence={(event, nextDate) => { if (!isResident) confirmRecurrence.mutate({ event, nextDate }); }}
            onSkipRecurrence={(id) => { if (!isResident) skipRecurrence.mutate(id); }}
            emptyMessage={activeCategory === "all" ? "No events" : `No ${EVENT_CATEGORY_LABELS[activeCategory as EventCategory]} events`}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Events;
