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
import type { EventCategory, EVENT_CATEGORY_LABELS } from "@/hooks/useEvents";
import { EVENT_CATEGORY_LABELS as LABELS } from "@/hooks/useEvents";

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
        className="w-[calc(100%-2rem)] max-w-md overflow-y-auto bg-muted border-border rounded-xl p-0 max-h-[85vh] [&>button[class*='absolute']]:hidden"
        overlayClassName="bg-background/60 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="text-base font-medium">New event</div>
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
              placeholder="Event title"
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
                  <span className={eventDate ? "text-foreground" : "text-muted-foreground"}>
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
              placeholder="Optional description"
              className="bg-background rounded-lg"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <button
              onClick={handleSubmit}
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

export default CreateEventDialog;
