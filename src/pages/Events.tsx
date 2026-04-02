import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useEvents, EVENT_CATEGORY_LABELS, EVENT_CATEGORY_COLORS, calcNextOccurrence, RECURRENCE_LABELS } from "@/hooks/useEvents";
import type { ProgramEvent, EventCategory, RecurrencePattern } from "@/hooks/useEvents";
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
import { Calendar, Search, X, Trash2, List, ClipboardCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatCardDate } from "@/lib/dateFormat";
import CreateEventDialog from "@/components/events/CreateEventDialog";
import EditEventDialog from "@/components/events/EditEventDialog";
import EvaluationDialog from "@/components/events/EvaluationDialog";
import EventsGantt from "@/components/events/EventsGantt";
import EventsVerticalTimeline from "@/components/events/EventsVerticalTimeline";
import NotificationBell from "@/components/NotificationBell";
import HeaderLogo from "@/components/HeaderLogo";
import OperationsLinkPill from "@/components/shared/OperationsLinkPill";

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
            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                {formattedDate}{timeRange ? ` · ${timeRange}` : ""}
              </span>
              {event.description && (
                <span className="text-xs text-muted-foreground truncate min-w-0">
                  {event.description}
                </span>
              )}
              <OperationsLinkPill sectionId={(event as any).operations_section_id} />
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
  const { has: hasPerm } = usePermissions();
  const canEditEvents = hasPerm("events.edit");
  const canEvaluate = hasPerm("events.evaluate");
  const isFacultyOrAdmin = canEvaluate;

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
  const [viewMode, setViewMode] = useState<"list" | "vertical" | "gantt">("list");

  const ALL_CATEGORIES: EventCategory[] = ["program", "didactic"];

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

  const handleCategoryChange = (cat: EventCategory | "all") => {
    if (cat === activeCategory) return;
    setActiveCategory(cat);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-[#415162] sticky top-0 z-40">
        <div className="container flex items-center h-14 px-4">
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

      <main className="container max-w-[1200px] px-4 pt-2 pb-4">

        {/* Row 1: Category tabs */}
        <div className="flex items-center" style={{ borderBottom: "1px solid #D5DAE0", marginBottom: 10 }}>
          {(["all", "program", "didactic"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              style={{
                padding: "6px 0",
                marginRight: 20,
                border: "none",
                borderBottom: activeCategory === cat ? "2px solid #415162" : "2px solid transparent",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: activeCategory === cat ? 700 : 500,
                background: "transparent",
                color: activeCategory === cat ? "#415162" : "#8A9AAB",
                transition: "all 0.15s",
              }}
            >
              {cat === "all" ? "All" : cat === "program" ? "Program" : "Didactic"}
            </button>
          ))}
        </div>

        {/* Row 2: View toggles + Add button — always visible */}
        <div className="flex items-center justify-between pb-2.5">
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
          </div>

          {canEditEvents && (
            <CreateEventDialog
              onSubmit={(data) => createEvent.mutate(data)}
              defaultCategory={activeCategory === "all" ? "program" : activeCategory as EventCategory}
            />
          )}
        </div>

        {/* Gantt label (only in gantt view) */}
        {viewMode === "gantt" && (
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
        ) : viewMode === "gantt" ? (
          <EventsGantt
            events={filteredEvents}
          />
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
            onUpdate={(data) => { if (canEditEvents) updateEvent.mutate(data); }}
            onDelete={(id) => { if (canEditEvents) deleteEvent.mutate(id); }}
            onConfirmRecurrence={(event, nextDate) => { if (canEditEvents) confirmRecurrence.mutate({ event, nextDate }); }}
            onSkipRecurrence={(id) => { if (canEditEvents) skipRecurrence.mutate(id); }}
            emptyMessage={activeCategory === "all" ? "No events" : `No ${EVENT_CATEGORY_LABELS[activeCategory as EventCategory]} events`}
          />
        )}
      </main>

    </div>
  );
};

export default Events;
