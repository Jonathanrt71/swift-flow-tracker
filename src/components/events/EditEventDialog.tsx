import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Check, X, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { formatPersonName } from "@/lib/dateFormat";
import type { ProgramEvent, EventCategory, RecurrencePattern } from "@/hooks/useEvents";
import { RECURRENCE_LABELS } from "@/hooks/useEvents";
import { useEventCategories } from "@/hooks/useEventCategories";

interface EditEventDialogProps {
  event: ProgramEvent;
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
}

const EditEventDialog = ({ event, onUpdate }: EditEventDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [eventDate, setEventDate] = useState(event.event_date);
  const [endDate, setEndDate] = useState(event.end_date || "");
  const [startTime, setStartTime] = useState(event.start_time || "");
  const [endTime, setEndTime] = useState(event.end_time || "");
  const [description, setDescription] = useState(event.description || "");
  const [category, setCategory] = useState<EventCategory>(event.category as EventCategory);
  const [assignedTo, setAssignedTo] = useState(event.assigned_to || "unassigned");
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>(event.recurrence_pattern || "none");
  const { data: members } = useTeamMembers();
  const { categories } = useEventCategories();

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
      setRecurrencePattern(event.recurrence_pattern || "none");
    }
    setOpen(isOpen);
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
      recurrence_pattern: recurrencePattern,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="flex items-center justify-center w-8 h-8 rounded-md bg-transparent text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md overflow-y-auto bg-muted border-border rounded-xl p-0 max-h-[85vh] [&>button[class*='absolute']]:hidden"
        overlayClassName="bg-background/60 backdrop-blur-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="text-base font-medium">Edit event</div>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-9 h-9 bg-transparent border-none cursor-pointer"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as EventCategory)}>
              <SelectTrigger className="bg-background rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="program">Program</SelectItem>
                <SelectItem value="didactic">Didactic</SelectItem>
                <SelectItem value="committee">Committee</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="administrative">Administrative</SelectItem>
                <SelectItem value="wellness">Wellness</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center justify-between w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-left">
                  <span className="text-foreground">
                    {eventDate ? format(parseISO(eventDate), "MMM d, yyyy") : "Select date"}
                  </span>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) setEventDate(format(d, "yyyy-MM-dd"));
                  }}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">End date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center justify-between w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-left">
                  <span className={endDate ? "text-foreground" : "text-muted-foreground"}>
                    {endDate ? format(parseISO(endDate), "MMM d, yyyy") : "Same as start"}
                  </span>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate ? parseISO(endDate) : undefined}
                  onSelect={(d) => {
                    if (d) setEndDate(format(d, "yyyy-MM-dd"));
                  }}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-background rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-background rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Assign to</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="bg-background rounded-lg">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {formatPersonName(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Repeats</Label>
            <Select value={recurrencePattern} onValueChange={(v) => setRecurrencePattern(v as RecurrencePattern)}>
              <SelectTrigger className="bg-background rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="semi_annual">Every 6 months</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
                <SelectItem value="custom">Custom (manual date)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <button
              onClick={handleSave}
              disabled={!title.trim() || !eventDate}
              className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditEventDialog;
