import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
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
import { X, Check, Plus, Trash2 } from "lucide-react";
import RichTextEditor from "@/components/tasks/RichTextEditor";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import type { Meeting } from "@/hooks/useMeetings";
import type { TeamMember } from "@/hooks/useTeamMembers";
import { format, parseISO } from "date-fns";

interface MeetingNotesDialogProps {
  meeting: Meeting;
  teamMembers: TeamMember[];
  onUpdate: (data: { id: string; notes?: string | null }) => void;
  onDelete: (id: string) => void;
  onCreateTask: (data: {
    title: string;
    description?: string;
    due_date?: string;
    assigned_to?: string;
    owed_to?: string;
  }) => void;
  children: React.ReactNode;
}

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

const MeetingNotesDialog = ({
  meeting,
  teamMembers,
  onUpdate,
  onDelete,
  onCreateTask,
  children,
}: MeetingNotesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(meeting.notes || "");

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setNotes(meeting.notes || "");
    setOpen(isOpen);
  };

  const handleSave = () => {
    onUpdate({ id: meeting.id, notes: notes.trim() || null });
    setOpen(false);
  };

  const creator = teamMembers.find((m) => m.id === meeting.created_by);
  const creatorName = creator?.display_name || "Unknown";
  const attendeeMembers = teamMembers.filter((m) =>
    meeting.attendees.includes(m.id)
  );

  const formattedDate = (() => {
    try {
      return format(parseISO(meeting.meeting_date), "MMM d, yyyy");
    } catch {
      return meeting.meeting_date;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg md:max-w-2xl max-h-[85vh] overflow-y-auto bg-muted border-border rounded-xl p-0 [&>button[class*='absolute']]:hidden"
        overlayClassName="bg-background/60 backdrop-blur-sm"
      >
        {/* Header: creator avatar + title + date + close */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-2">
          {creator?.avatar_url ? (
            <img
              src={creator.avatar_url}
              className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
              alt=""
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5"
              style={{
                fontSize: 13,
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
            <div className="text-xs text-muted-foreground">{formattedDate}</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-9 h-9 bg-transparent border-none cursor-pointer shrink-0"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>

        {/* Attendees */}
        <div className="px-5 pb-3 flex items-center gap-0">
          {attendeeMembers.slice(0, 6).map((m, i) =>
            m.avatar_url ? (
              <img
                key={m.id}
                src={m.avatar_url}
                className="w-6 h-6 rounded-full object-cover border-[1.5px] border-muted"
                style={{ marginLeft: i > 0 ? -4 : 0 }}
                alt=""
              />
            ) : (
              <div
                key={m.id}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-medium border-[1.5px] border-muted"
                style={{
                  background: getColor(m.display_name),
                  marginLeft: i > 0 ? -4 : 0,
                }}
              >
                {getInitials(m.display_name)}
              </div>
            )
          )}
          {attendeeMembers.length > 6 && (
            <span className="text-[11px] text-muted-foreground ml-1.5">
              +{attendeeMembers.length - 6}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground ml-2">
            {attendeeMembers.length} attendee{attendeeMembers.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Separator */}
        <div className="mx-5 h-px bg-border" />

        {/* Notes editor */}
        <div className="px-5 py-3">
          <div className="[&_.rounded-md]:rounded-lg [&_.rounded-md]:border-border">
            <RichTextEditor content={notes} onChange={setNotes} />
          </div>
        </div>

        {/* Action bar */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreateTaskDialog
              onSubmit={onCreateTask}
              meetingId={meeting.id}
            >
              <button className="flex items-center gap-1.5 bg-transparent border border-border rounded-lg px-3 py-2 cursor-pointer text-foreground text-[13px]">
                <Plus className="h-3.5 w-3.5" />
                Create task
              </button>
            </CreateTaskDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center justify-center w-11 h-11 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete meeting?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{meeting.title}" and all its notes. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete(meeting.id);
                      setOpen(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingNotesDialog;
