import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useEvents } from "@/hooks/useEvents";
import type { ProgramEvent, EventCategory } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useUserRole } from "@/hooks/useUserRole";
import { useTeamMembers } from "@/hooks/useTeamMembers";
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
import { Calendar, BookOpen, Search, X, Trash2, List } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatCardDate } from "@/lib/dateFormat";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import CreateEventDialog from "@/components/events/CreateEventDialog";
import EditEventDialog from "@/components/events/EditEventDialog";
import EventsTimeline from "@/components/events/EventsTimeline";
import NotificationBell from "@/components/NotificationBell";
import HeaderLogo from "@/components/HeaderLogo";


const GanttIcon = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
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
  onUpdate,
  onDelete,
}: {
  event: ProgramEvent;
  teamMembers: ReturnType<typeof useTeamMembers>["data"];
  canEdit: boolean;
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
  }) => void;
  onDelete: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const members = teamMembers || [];
  const assignee = members.find((m) => m.id === event.assigned_to);
  const assigneeName = assignee?.display_name || null;

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
            {canEdit && (
              <div className="flex items-center gap-0.5 shrink-0 ml-2">
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const GroupedEventList = ({
  events,
  teamMembers,
  userId,
  isAdmin,
  onUpdate,
  onDelete,
  emptyMessage,
}: {
  events: ProgramEvent[];
  teamMembers: ReturnType<typeof useTeamMembers>["data"];
  userId: string | undefined;
  isAdmin: boolean;
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
  }) => void;
  onDelete: (id: string) => void;
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
              onUpdate={onUpdate}
              onDelete={onDelete}
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
  const { isResident } = useUserRole();
  
  const { events, createEvent, updateEvent, deleteEvent } = useEvents();
  const { data: teamMembers } = useTeamMembers();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"program" | "didactic">("program");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");

  const filteredEvents = useMemo(() => {
    const all = events.data || [];
    const byCategory = all.filter((e) => e.category === activeTab);
    if (!searchQuery.trim()) return byCategory;
    const q = searchQuery.toLowerCase();
    return byCategory.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q)
    );
  }, [events.data, activeTab, searchQuery]);

  const programEvents = useMemo(() => {
    return (events.data || []).filter((e) => e.category === "program");
  }, [events.data]);

  const handleTabChange = (tab: "program" | "didactic") => {
    setActiveTab(tab);
    if (tab === "didactic") setViewMode("list");
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

      <main className="container max-w-[1200px] px-4 py-6">
        {/* Row 1: Toolbar */}
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-1">
            {/* Program tab icon */}
            <button
              onClick={() => handleTabChange("program")}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
                activeTab === "program" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Calendar className="h-4 w-4" />
            </button>

            {/* View toggle pill - only when program tab is active */}
            {activeTab === "program" && (
              <div className="flex items-center rounded-full p-0.5 ml-1" style={{ background: "#D5DAE0" }}>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full transition-colors",
                    viewMode === "list" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("timeline")}
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full transition-colors",
                    viewMode === "timeline" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <GanttIcon />
                </button>
              </div>
            )}

            {/* Separator */}
            <div className="mx-1" style={{ width: 1, height: 20, background: "#C9CED4" }} />

            {/* Didactic tab icon */}
            <button
              onClick={() => handleTabChange("didactic")}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
                activeTab === "didactic" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <BookOpen className="h-4 w-4" />
            </button>
          </div>

          {!isResident && (
            <CreateEventDialog
              onSubmit={(data) => createEvent.mutate(data)}
              defaultCategory={activeTab as EventCategory}
            />
          )}
        </div>

        {/* Row 2: Timeline range label (only in timeline view + program tab) */}

        {/* Content */}
        {events.isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : activeTab === "program" && viewMode === "timeline" ? (
          <EventsTimeline
            events={programEvents}
          />
        ) : (
          <GroupedEventList
            events={filteredEvents}
            teamMembers={teamMembers}
            userId={user?.id}
            isAdmin={!isResident && !!isAdmin}
            onUpdate={(data) => { if (!isResident) updateEvent.mutate(data); }}
            onDelete={(id) => { if (!isResident) deleteEvent.mutate(id); }}
            emptyMessage={activeTab === "program" ? "No program events" : "No didactics"}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Events;
