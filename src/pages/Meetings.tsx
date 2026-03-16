import { useState } from "react";
import { cn } from "@/lib/utils";
import { useMeetings } from "@/hooks/useMeetings";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, User, LogOut, Search, Pencil, X as XIcon, Trash2, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
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
import BottomNav from "@/components/BottomNav";
import CreateMeetingDialog from "@/components/meetings/CreateMeetingDialog";
import MeetingNotesDialog from "@/components/meetings/MeetingNotesDialog";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import NotificationBell from "@/components/NotificationBell";
import type { Meeting } from "@/hooks/useMeetings";

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

const MeetingCard = ({
  meeting,
  teamMembers,
  linkedTasks,
  onUpdate,
  onDelete,
  onCreateTask,
}: {
  meeting: Meeting;
  teamMembers: ReturnType<typeof useTeamMembers>["data"];
  linkedTasks: Task[];
  onUpdate: (data: { id: string; notes?: string | null }) => void;
  onDelete: (id: string) => void;
  onCreateTask: (data: {
    title: string;
    description?: string;
    due_date?: string;
    assigned_to?: string;
    owed_to?: string;
    meeting_id?: string;
  }) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const members = teamMembers || [];
  const creator = members.find((m) => m.id === meeting.created_by);
  const creatorName = creator?.display_name || "Unknown";
  const attendeeMembers = members.filter((m) => meeting.attendees.includes(m.id));

  const formattedDate = (() => {
    try {
      return format(parseISO(meeting.meeting_date), "MMM d, yyyy");
    } catch {
      return meeting.meeting_date;
    }
  })();

  return (
    <div className="bg-muted border border-border rounded-[10px] overflow-hidden transition-all">
      {/* Top row — tap to expand */}
      <div
        className="flex items-center min-h-[48px] px-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Dot */}
        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
          <div className="w-2 h-2 rounded-full bg-[#7A8FA0]" />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0 px-1">
          <span className="font-medium text-sm truncate block">{meeting.title}</span>
        </div>

        {/* Attendees + Creator avatar */}
        <div className="flex items-center shrink-0 pr-1">
          {attendeeMembers.slice(0, 5).map((m, i) =>
            m.avatar_url ? (
              <img
                key={m.id}
                src={m.avatar_url}
                className="w-[22px] h-[22px] rounded-full object-cover border-[1.5px] border-muted"
                style={{ marginLeft: i > 0 ? -4 : 0 }}
                alt=""
              />
            ) : (
              <div
                key={m.id}
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[8px] font-medium border-[1.5px] border-muted"
                style={{
                  background: getColor(m.display_name),
                  marginLeft: i > 0 ? -4 : 0,
                }}
              >
                {getInitials(m.display_name)}
              </div>
            )
          )}
          {attendeeMembers.length > 5 && (
            <span className="text-[10px] text-muted-foreground ml-1">
              +{attendeeMembers.length - 5}
            </span>
          )}
          {creator?.avatar_url ? (
            <img
              src={creator.avatar_url}
              className="w-7 h-7 rounded-full object-cover shrink-0 ml-1.5"
              alt=""
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ml-1.5"
              style={{
                fontSize: 10,
                fontWeight: 500,
                background: getColor(creatorName),
              }}
            >
              {getInitials(creatorName)}
            </div>
          )}
        </div>
      </div>

      {/* Expanded: date + actions + linked tasks */}
      {expanded && (
        <div className="pb-2 pl-[52px] pr-3">
          {/* Date left, actions right: pencil, add task, delete */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground">{formattedDate}</span>
            <div className="flex items-center gap-0.5">
              {/* Pencil — opens notes */}
              <MeetingNotesDialog
                meeting={meeting}
                teamMembers={members}
                onUpdate={onUpdate}
              >
                <button
                  className="flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </MeetingNotesDialog>
              {/* Add task */}
              <CreateTaskDialog
                onSubmit={onCreateTask}
                meetingId={meeting.id}
              >
                <button
                  className="flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </CreateTaskDialog>
              {/* Delete */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer text-destructive hover:text-destructive/80 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete meeting?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{meeting.title}" and all its notes. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(meeting.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Linked tasks */}
          {linkedTasks.length > 0 && (
            <>
              {linkedTasks.map((t) => {
                const assignee = members.find((m) => m.id === t.assigned_to);
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-1.5 px-2 py-1.5 mb-1 bg-background/50 rounded-md"
                  >
                    <div
                      className={cn(
                        "w-3 h-3 rounded-sm border shrink-0",
                        t.completed
                          ? "bg-muted-foreground border-muted-foreground"
                          : "bg-background border-muted-foreground/40"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs flex-1 min-w-0 truncate",
                        t.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {t.title}
                    </span>
                    {assignee && (
                      assignee.avatar_url ? (
                        <img
                          src={assignee.avatar_url}
                          className="w-[18px] h-[18px] rounded-full object-cover shrink-0"
                          alt=""
                        />
                      ) : (
                        <div
                          className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-white shrink-0"
                          style={{
                            fontSize: 7,
                            fontWeight: 500,
                            background: getColor(assignee.display_name),
                          }}
                        >
                          {getInitials(assignee.display_name)}
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const Meetings = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { meetings, createMeeting, updateMeeting, deleteMeeting } = useMeetings();
  const { tasks, createTask } = useTasks();
  const { data: teamMembers } = useTeamMembers();

  // Build a map of meeting_id -> linked tasks (flatten parent + subtasks)
  const allTasks: Task[] = [];
  (tasks || []).forEach((t) => {
    allTasks.push(t);
    t.subtasks?.forEach((s) => allTasks.push(s));
  });
  const tasksByMeeting = new Map<string, Task[]>();
  allTasks.forEach((t) => {
    if (t.meeting_id) {
      const list = tasksByMeeting.get(t.meeting_id) || [];
      list.push(t);
      tasksByMeeting.set(t.meeting_id, list);
    }
  });

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMeetings = (meetings.data || []).filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.title.toLowerCase().includes(q) || (m.notes || "").toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="bg-[hsl(33,22%,88%)]">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-semibold text-foreground">Meetings</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="Search"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery("");
              }}
            >
              {searchOpen ? <XIcon className="h-4 w-4" /> : <Search className="h-4 w-4" />}
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
              placeholder="Search meetings..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}
      </header>

      <main className="container max-w-2xl px-4 py-6">
        <div className="flex items-center justify-between py-2.5">
          <span className="text-[11px] font-medium text-muted-foreground">
            {filteredMeetings.length} meeting{filteredMeetings.length !== 1 ? "s" : ""}
          </span>
          <CreateMeetingDialog
            onSubmit={(data) => createMeeting.mutate(data)}
          />
        </div>

        <div className="space-y-2">
          {meetings.isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">{searchQuery ? "No meetings match your search." : "No meetings yet. Create one to get started!"}</p>
            </div>
          ) : (
            filteredMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                teamMembers={teamMembers}
                linkedTasks={tasksByMeeting.get(meeting.id) || []}
                onUpdate={(data) => updateMeeting.mutate(data)}
                onDelete={(id) => deleteMeeting.mutate(id)}
                onCreateTask={(data) => createTask.mutate(data)}
              />
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Meetings;
