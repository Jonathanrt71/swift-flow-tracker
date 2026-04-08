import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { CalendarIcon, X, Trash2, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import RichTextEditor from "@/components/tasks/RichTextEditor";
import type { Meeting } from "@/hooks/useMeetings";
import type { TeamMember } from "@/hooks/useTeamMembers";
import { formatPersonName } from "@/lib/dateFormat";
import { useMeetingTags, useMeetingTagLinks } from "@/hooks/useMeetingTags";
import { useMeetingCategories } from "@/hooks/useMeetingCategories";

interface EditMeetingDialogProps {
  meeting: Meeting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: TeamMember[];
  onUpdate: (data: {
    id: string;
    title?: string;
    meeting_date?: string;
    notes?: string | null;
    attendee_ids?: string[];
    category_id?: string | null;
  }) => void;
  onDelete: (id: string) => void;
}

const EditMeetingDialog = ({
  meeting,
  open,
  onOpenChange,
  teamMembers,
  onUpdate,
  onDelete,
}: EditMeetingDialogProps) => {
  const [title, setTitle] = useState(meeting.title);
  const [meetingDate, setMeetingDate] = useState(meeting.meeting_date);
  const [notes, setNotes] = useState(meeting.notes || "");
  const [attendeeIds, setAttendeeIds] = useState<string[]>(meeting.attendees || []);
  const [categoryId, setCategoryId] = useState<string>(meeting.category_id || "none");

  const { tags } = useMeetingTags();
  const { links, setTagsForMeeting } = useMeetingTagLinks();
  const { categories: meetingCategories } = useMeetingCategories();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const meetingTagIds = (links.data || [])
    .filter((l) => l.meeting_id === meeting.id)
    .map((l) => l.tag_id);

  const selectedDate = meetingDate ? parseISO(meetingDate) : undefined;

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTitle(meeting.title);
      setMeetingDate(meeting.meeting_date);
      setNotes(meeting.notes || "");
      setAttendeeIds(meeting.attendees || []);
      setCategoryId(meeting.category_id || "none");
      setSelectedTagIds(meetingTagIds);
    }
    onOpenChange(isOpen);
  };

  useEffect(() => {
    if (open) {
      setSelectedTagIds(meetingTagIds);
    }
  }, [links.data]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const toggleAttendee = (memberId: string) => {
    setAttendeeIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSave = () => {
    if (!title.trim() || !meetingDate) return;
    onUpdate({
      id: meeting.id,
      title: title.trim(),
      meeting_date: meetingDate,
      notes: notes.trim() || null,
      attendee_ids: attendeeIds,
      category_id: categoryId === "none" ? null : categoryId,
    });
    setTagsForMeeting.mutate({ meetingId: meeting.id, tagIds: selectedTagIds });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="rounded-lg p-5 max-w-[calc(100vw-2rem)] w-full sm:max-w-md overflow-hidden"
        style={{ background: "#F5F3EE", border: "1px solid #C9CED4", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}
        overlayClassName="bg-[rgba(65,81,98,0.45)] backdrop-blur-sm"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="overflow-y-auto max-h-[80vh] overflow-x-hidden">
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-semibold" style={{ color: "#2D3748" }}>
              Edit meeting
            </span>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              className="rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
              style={{ borderColor: "#C9CED4", background: "#fff", boxShadow: "none" }}
            />
          </div>

          {/* Date */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Date</label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn("flex-1 flex items-center text-left text-sm rounded-lg px-3 py-2", !meetingDate && "opacity-60")}
                    style={{ border: "1px solid #C9CED4", background: "#fff", color: "#2D3748" }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" style={{ color: "#5F7285" }} />
                    {meetingDate ? format(selectedDate!, "PPP") : "Select date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { if (d) setMeetingDate(format(d, "yyyy-MM-dd")); }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Category */}
          {(meetingCategories.data?.length ?? 0) > 0 && (
            <div className="mb-4">
              <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Category</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff" }}>
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {meetingCategories.data?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Attendees */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Attendees</label>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg" style={{ background: "#fff", border: "1px solid #C9CED4", minHeight: 38 }}>
              {teamMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAttendee(m.id)}
                  className="text-[11px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors"
                  style={attendeeIds.includes(m.id) ? {
                    background: "#415162", color: "#fff", borderColor: "#415162",
                  } : {
                    background: "transparent", color: "#5F7285", borderColor: "#C9CED4",
                  }}
                >
                  {formatPersonName(m)}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Notes</label>
            <div className="[&_.ProseMirror]:min-h-[80px] [&_.rounded-md]:bg-white [&_.ProseMirror]:bg-white" style={{ background: "#fff", borderRadius: 8 }}>
              <RichTextEditor content={notes} onChange={setNotes} />
            </div>
          </div>

          {/* Tags */}
          {(tags.data?.length ?? 0) > 0 && (
            <div className="mb-4">
              <label className="text-xs flex items-center gap-1.5 mb-1.5" style={{ color: "#5F7285" }}>
                <Tag className="h-3 w-3" /> Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tags.data?.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className="text-[11px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors"
                    style={selectedTagIds.includes(tag.id) ? {
                      background: "#415162", color: "#fff", borderColor: "#415162",
                    } : {
                      background: "#fff", color: "#5F7285", borderColor: "#C9CED4",
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!title.trim() || !meetingDate}
            className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#415162" }}
          >
            Save meeting
          </button>

          {/* Delete */}
          <div className="mt-4 flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-destructive hover:underline bg-transparent border-none cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" /> Delete this meeting
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete meeting?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete "{meeting.title}" and all its notes.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { onDelete(meeting.id); onOpenChange(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditMeetingDialog;
