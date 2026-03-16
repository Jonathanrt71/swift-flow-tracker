import { useMeetings } from "@/hooks/useMeetings";
import { useTasks } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, User, LogOut, Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CreateMeetingDialog from "@/components/meetings/CreateMeetingDialog";
import MeetingNotesDialog from "@/components/meetings/MeetingNotesDialog";
import NotificationBell from "@/components/NotificationBell";
import type { Meeting } from "@/hooks/useMeetings";
import { format, parseISO } from "date-fns";

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
  onUpdate,
  onDelete,
  onCreateTask,
}: {
  meeting: Meeting;
  teamMembers: ReturnType<typeof useTeamMembers>["data"];
  onUpdate: (data: { id: string; notes?: string | null }) => void;
  onDelete: (id: string) => void;
  onCreateTask: (data: {
    title: string;
    description?: string;
    due_date?: string;
    assigned_to?: string;
    owed_to?: string;
  }) => void;
}) => {
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

  const hasNotes =
    meeting.notes &&
    meeting.notes.trim() !== "" &&
    meeting.notes.trim() !== "<p></p>";

  // Strip HTML for preview
  const notesPreview = hasNotes
    ? (() => {
        // Split by block-level tags to respect paragraph breaks
        const firstBlock = meeting.notes!
          .split(/<\/(?:p|li|h[1-6]|div|br\s*\/?)>/i)[0];
        return firstBlock.replace(/<[^>]*>/g, "").trim().slice(0, 120);
      })()
    : null;

  return (
    <MeetingNotesDialog
      meeting={meeting}
      teamMembers={members}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onCreateTask={onCreateTask}
    >
      <div className="bg-muted border border-border rounded-[10px] p-3 flex gap-2.5 cursor-pointer transition-all hover:border-border/80">
        {/* Creator avatar */}
        {creator?.avatar_url ? (
          <img
            src={creator.avatar_url}
            className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
            alt=""
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5"
            style={{
              fontSize: 10,
              fontWeight: 500,
              background: getColor(creatorName),
            }}
          >
            {getInitials(creatorName)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {meeting.title}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formattedDate}
          </div>

          {/* Attendee stack */}
          {attendeeMembers.length > 0 && (
            <div className="flex items-center mt-1.5">
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
                <span className="text-[11px] text-muted-foreground ml-1.5">
                  +{attendeeMembers.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Notes preview */}
          {notesPreview && (
            <div className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
              {notesPreview}
            </div>
          )}
        </div>
      </div>
    </MeetingNotesDialog>
  );
};

const Meetings = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { meetings, createMeeting, updateMeeting, deleteMeeting } = useMeetings();
  const { createTask } = useTasks();
  const { data: teamMembers } = useTeamMembers();

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="bg-[hsl(33,22%,88%)]">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-semibold text-foreground">Meetings</h1>
          <div className="flex items-center gap-1">
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
      </header>

      <main className="container max-w-2xl px-4 py-6">
        <div className="flex items-center justify-between py-2.5">
          <span className="text-[11px] font-medium text-muted-foreground">
            {meetings.data?.length || 0} meeting{(meetings.data?.length || 0) !== 1 ? "s" : ""}
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
          ) : meetings.data?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No meetings yet. Create one to get started!</p>
            </div>
          ) : (
            meetings.data?.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                teamMembers={teamMembers}
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
