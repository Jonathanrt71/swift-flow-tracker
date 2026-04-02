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
import { Plus, Check, X, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { formatPersonName } from "@/lib/dateFormat";
import { useAuth } from "@/contexts/AuthContext";
import type { EventCategory, EVENT_CATEGORY_LABELS, RecurrencePattern } from "@/hooks/useEvents";
import { EVENT_CATEGORY_LABELS as LABELS, RECURRENCE_LABELS } from "@/hooks/useEvents";

interface CreateEventDialogProps {
  onSubmit: (data: {
    title: string;
    event_date: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    description?: string;
    category: EventCategory;
    assigned_to?: string;
    recurrence_pattern?: RecurrencePattern;
  }) => void;
  defaultCategory?: EventCategory;
}

const CreateEventDialog = ({ onSubmit, defaultCategory }: CreateEventDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory>(defaultCategory || "program");
  const [assignedTo, setAssignedTo] = useState(user?.id || "unassigned");
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>("none");
  const { data: members } = useTeamMembers();

  const selectedDate = eventDate ? parseISO(eventDate) : undefined;

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTitle("");
      setEventDate("");
      setEndDate("");
      setStartTime("");
      setEndTime("");
      setDescription("");
      setCategory(defaultCategory || "program");
      setAssignedTo(user?.id || "unassigned");
    }
    setOpen(isOpen);
  };

  const handleSubmit = () => {
    if (!title.trim() || !eventDate) return;
    onSubmit({
      title: title.trim(),
      event_date: eventDate,
      end_date: endDate || undefined,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      description: description.trim() || undefined,
      category,
      assigned_to: assignedTo === "unassigned" ? undefined : assignedTo,
      recurrence_pattern: recurrencePattern,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer text-muted-foreground">
          <Plus className="h-[18px] w-[18px]" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="rounded-lg p-5 max-w-[calc(100vw-2rem)] w-full sm:max-w-md overflow-hidden"
        style={{ background: "#F5F3EE", border: "1px solid #C9CED4", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}
        overlayClassName="bg-background/60 backdrop-blur-sm"
      >
        <div className="overflow-y-auto max-h-[80vh] overflow-x-hidden">
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-semibold" style={{ color: "#2D3748" }}>
            New event
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
              style={{ borderColor: "#C9CED4", background: "#fff" }}
            />
          </div>

          <div>
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as EventCategory)}>
              <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none" style={{ borderColor: "#C9CED4", background: "#fff" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="program">Program</SelectItem>
                <SelectItem value="didactic">Didactic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center justify-between w-full px-3 py-2 border rounded-lg text-sm text-left"
                  style={{ borderColor: "#C9CED4", background: "#fff", color: eventDate ? "#2D3748" : "#8A9AAB" }}
                >
                  <span>
                    {eventDate ? format(parseISO(eventDate), "MMM d, yyyy") : "Select date"}
                  </span>
                  <CalendarIcon className="h-4 w-4" style={{ color: "#8A9AAB" }} />
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

          <div>
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>End date (optional)</label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center justify-between w-full px-3 py-2 border rounded-lg text-sm text-left"
                  style={{ borderColor: "#C9CED4", background: "#fff", color: endDate ? "#2D3748" : "#8A9AAB" }}
                >
                  <span>
                    {endDate ? format(parseISO(endDate), "MMM d, yyyy") : "Same as start"}
                  </span>
                  <CalendarIcon className="h-4 w-4" style={{ color: "#8A9AAB" }} />
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
            <div>
              <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Start time</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                style={{ borderColor: "#C9CED4", background: "#fff" }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>End time</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                style={{ borderColor: "#C9CED4", background: "#fff" }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Assign to</label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none" style={{ borderColor: "#C9CED4", background: "#fff" }}>
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

          <div>
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
              style={{ borderColor: "#C9CED4", background: "#fff" }}
            />
          </div>

          <div>
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Repeats</label>
            <Select value={recurrencePattern} onValueChange={(v) => setRecurrencePattern(v as RecurrencePattern)}>
              <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none" style={{ borderColor: "#C9CED4", background: "#fff" }}>
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

          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !eventDate}
            className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#415162" }}
          >
            Save event
          </button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;
