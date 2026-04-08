import { useState } from "react";
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
import { CalendarIcon, X, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { formatPersonName } from "@/lib/dateFormat";
import type { ProgramEvent, EventCategory, RecurrencePattern } from "@/hooks/useEvents";
import { RECURRENCE_LABELS } from "@/hooks/useEvents";
import { useEventCategories } from "@/hooks/useEventCategories";
import ComboSearch from "@/components/shared/ComboSearch";
import type { ClinicalTopic } from "@/hooks/useClinicalTopics";
import TimeSelect from "@/components/shared/TimeSelect";

interface EditEventDialogProps {
  event: ProgramEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicalTopics?: ClinicalTopic[];
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
}

const EditEventDialog = ({ event, open, onOpenChange, clinicalTopics, onCreateTopic, onUpdate, onDelete }: EditEventDialogProps) => {
  const [title, setTitle] = useState(event.title);
  const [eventDate, setEventDate] = useState(event.event_date);
  const [endDate, setEndDate] = useState(event.end_date || "");
  const [startTime, setStartTime] = useState(event.start_time || "");
  const [endTime, setEndTime] = useState(event.end_time || "");
  const [description, setDescription] = useState(event.description || "");
  const [category, setCategory] = useState<EventCategory>(event.category as EventCategory);
  const [assignedTo, setAssignedTo] = useState(event.assigned_to || "unassigned");
  const { data: members } = useTeamMembers();
  const { categories } = useEventCategories();
  const [topicId, setTopicId] = useState<string | null>((event as any).topic_id || null);

  const selectedDate = eventDate ? parseISO(eventDate) : undefined;

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTitle(event.title);
      setEventDate(event.event_date);
      setEndDate(event.end_date || "");
      setStartTime(event.start_time || "");
      setEndTime(event.end_time || "");
      setDescription(event.description || "");
      setCategory(event.category as EventCategory);
      setAssignedTo(event.assigned_to || "unassigned");
      setTopicId((event as any).topic_id || null);
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    if (!title.trim() || !eventDate) return;
    onUpdate({
      id: event.id,
      title: title.trim(),
      event_date: eventDate,
      end_date: endDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      description: description.trim() || null,
      category,
      assigned_to: assignedTo === "unassigned" ? null : assignedTo,
      topic_id: category === "didactic" ? topicId : null,
    });
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
              Edit event
            </span>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
              style={{ borderColor: "#C9CED4", background: "#fff", boxShadow: "none" }}
            />
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as EventCategory)}>
              <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Topic (didactic only) */}
          {category === "didactic" && (
            <div className="mb-4">
              <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Topic</label>
              {topicId ? (() => {
                const linked = clinicalTopics?.find(t => t.id === topicId);
                return (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "0.5px solid #C9CED4", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#2D3748", fontWeight: 500 }}>
                    {linked?.title || "Unknown"}
                    <div onClick={() => setTopicId(null)} style={{ cursor: "pointer", display: "flex" }}>
                      <X style={{ width: 12, height: 12, color: "#8A9AAB" }} />
                    </div>
                  </div>
                );
              })() : (
                <ComboSearch
                  items={(clinicalTopics || []).map(t => ({ id: t.id, label: t.title }))}
                  placeholder="Search or create topic..."
                  createLabel="topic"
                  onSelect={(id) => setTopicId(id)}
                  onCreate={async (title) => {
                    if (onCreateTopic) await onCreateTopic(title);
                  }}
                />
              )}
            </div>
          )}

          {/* Date */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Date</label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn("flex-1 flex items-center text-left text-sm rounded-lg px-3 py-2", !eventDate && "opacity-60")}
                    style={{ border: "1px solid #C9CED4", background: "#fff", color: "#2D3748" }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" style={{ color: "#5F7285" }} />
                    {eventDate ? format(selectedDate!, "PPP") : "Select date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { if (d) setEventDate(format(d, "yyyy-MM-dd")); }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* End date */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>End date (optional)</label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex-1 flex items-center text-left text-sm rounded-lg px-3 py-2"
                    style={{ border: "1px solid #C9CED4", background: "#fff", color: endDate ? "#2D3748" : "#8A9AAB" }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" style={{ color: "#5F7285" }} />
                    {endDate ? format(parseISO(endDate), "PPP") : "Same as start"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate ? parseISO(endDate) : undefined}
                    onSelect={(d) => { if (d) setEndDate(format(d, "yyyy-MM-dd")); }}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {endDate && (
                <button type="button" onClick={() => setEndDate("")} className="flex items-center justify-center w-9 h-9" style={{ color: "#5F7285" }}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Start / End time */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Time</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TimeSelect value={startTime} onChange={setStartTime} placeholder="Start" />
              <span style={{ fontSize: 12, color: "#8A9AAB" }}>to</span>
              <TimeSelect value={endTime} onChange={setEndTime} placeholder="End" />
            </div>
          </div>

          {/* Assign to */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Assign to</label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff" }}>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{formatPersonName(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full rounded-lg text-sm px-3 py-2 resize-vertical focus:outline-none"
              style={{ borderColor: "#C9CED4", background: "#fff", border: "1px solid #C9CED4", boxSizing: "border-box" }}
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!title.trim() || !eventDate}
            className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#415162" }}
          >
            Save event
          </button>

          {/* Delete */}
          <div className="mt-4 flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-destructive hover:underline bg-transparent border-none cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" /> Delete this event
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete event?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete "{event.title}".</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { onDelete(event.id); onOpenChange(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditEventDialog;
