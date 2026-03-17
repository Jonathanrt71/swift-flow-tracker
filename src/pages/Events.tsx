import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useEvents } from "@/hooks/useEvents";
import type { ProgramEvent, EventCategory } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { LogOut, Shield, User, Calendar, BookOpen, Search, X, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import BottomNav from "@/components/BottomNav";
import CreateEventDialog from "@/components/events/CreateEventDialog";
import EditEventDialog from "@/components/events/EditEventDialog";
import NotificationBell from "@/components/NotificationBell";

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

  const hasExpandContent = true; // Always expandable for edit/delete access

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
      onClick={() => {
        if (hasExpandContent) setExpanded(!expanded);
      }}
    >
      <div className="flex items-center min-h-[48px] px-2">
        <div className="flex-1 min-w-0 pl-2 pr-1">
          <span className="font-medium text-sm truncate block">{event.title}</span>
        </div>
        <div className="flex items-center shrink-0 gap-1.5 pr-1">
          {assignee ? (
            assignee.avatar_url ? (
              <img
                src={assignee.avatar_url}
                className="w-7 h-7 rounded-full object-cover shrink-0"
                alt=""
              />
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
          {!g.isCurrentMonth && (
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider pt-3 pb-1">
              {g.month}
            </div>
          )}
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
  const { events, createEvent, updateEvent, deleteEvent } = useEvents();
  const { data: teamMembers } = useTeamMembers();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("program");

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

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="bg-[#04324A]">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-semibold text-white">Events</h1>
          <div className="flex items-center gap-1 text-white">
            <Button
              variant="ghost"
              size="icon"
              title="Search"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery("");
              }}
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
            <NotificationBell />
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="icon" title="Admin Panel">
                  <Shield className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link to="/profile">
              <Button variant="ghost" size="icon" title="Profile">
                <User className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" title="Sign out" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
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

      <main className="container max-w-2xl px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between pb-2.5">
            <TabsList className="gap-1 h-auto p-1 bg-transparent">
              <TabsTrigger value="program" className="h-8 w-8 p-0" title="Program Events">
                <Calendar className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="didactic" className="h-8 w-8 p-0" title="Didactics">
                <BookOpen className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
            <CreateEventDialog
              onSubmit={(data) => createEvent.mutate(data)}
              defaultCategory={activeTab as EventCategory}
            />
          </div>

          <TabsContent value="program" className="mt-0">
            {events.isLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <GroupedEventList
                events={filteredEvents}
                teamMembers={teamMembers}
                userId={user?.id}
                isAdmin={!!isAdmin}
                onUpdate={(data) => updateEvent.mutate(data)}
                onDelete={(id) => deleteEvent.mutate(id)}
                emptyMessage="No program events. Create one to get started!"
              />
            )}
          </TabsContent>

          <TabsContent value="didactic" className="mt-0">
            {events.isLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <GroupedEventList
                events={filteredEvents}
                teamMembers={teamMembers}
                userId={user?.id}
                isAdmin={!!isAdmin}
                onUpdate={(data) => updateEvent.mutate(data)}
                onDelete={(id) => deleteEvent.mutate(id)}
                emptyMessage="No didactics. Create one to get started!"
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Events;
