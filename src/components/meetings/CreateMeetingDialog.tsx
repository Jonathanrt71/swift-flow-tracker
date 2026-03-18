import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Check, X, Search, CalendarIcon } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { formatPersonName } from "@/lib/dateFormat";

interface CreateMeetingDialogProps {
  onSubmit: (data: {
    title: string;
    meeting_date: string;
    attendee_ids: string[];
  }) => void;
}

const CreateMeetingDialog = ({ onSubmit }: CreateMeetingDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const { data: members } = useTeamMembers();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTitle("");
      setMeetingDate("");
      setSelectedAttendees([]);
      setSearch("");
    }
    setOpen(isOpen);
  };

  const handleSubmit = () => {
    if (!title.trim() || !meetingDate) return;
    onSubmit({
      title: title.trim(),
      meeting_date: meetingDate,
      attendee_ids: selectedAttendees,
    });
    setOpen(false);
  };

  const toggleAttendee = (id: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const availableMembers = (members || []).filter(
    (m) =>
      m.id !== user?.id &&
      !selectedAttendees.includes(m.id) &&
      (m.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const selectedMembers = (members || []).filter((m) =>
    selectedAttendees.includes(m.id)
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

  const selectedDate = meetingDate ? parseISO(meetingDate) : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer text-muted-foreground">
          <Plus className="h-[18px] w-[18px]" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md bg-muted border-border rounded-xl p-0 [&>button[class*='absolute']]:hidden"
        overlayClassName="bg-background/60 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="text-base font-medium">New meeting</div>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-9 h-9 bg-transparent border-none cursor-pointer"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-3.5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              className="bg-background rounded-lg"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center justify-between w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-left">
                  <span className={meetingDate ? "text-foreground" : "text-muted-foreground"}>
                    {meetingDate ? format(parseISO(meetingDate), "MMM d, yyyy") : "Select date"}
                  </span>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) setMeetingDate(format(d, "yyyy-MM-dd"));
                  }}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Attendees */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Attendees</Label>

            {/* Selected chips */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-1.5 bg-background border border-border rounded-full pl-1 pr-2.5 py-1"
                  >
                    {m.avatar_url ? (
                      <img
                        src={m.avatar_url}
                        className="w-5 h-5 rounded-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-medium"
                        style={{ background: getColor(m.display_name) }}
                      >
                        {getInitials(m.display_name)}
                      </div>
                    )}
                    <span className="text-xs text-foreground">
                      {m.display_name || "Unnamed"}
                    </span>
                    <button
                      onClick={() => toggleAttendee(m.id)}
                      className="bg-transparent border-none cursor-pointer p-0"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search + dropdown */}
            <div className="bg-background border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Add attendees..."
                  className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="max-h-[120px] overflow-y-auto">
                {availableMembers.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {search ? "No matches" : "All members added"}
                  </div>
                ) : (
                  availableMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        toggleAttendee(m.id);
                        setSearch("");
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left bg-transparent border-none cursor-pointer hover:bg-muted/50"
                    >
                      {m.avatar_url ? (
                        <img
                          src={m.avatar_url}
                          className="w-6 h-6 rounded-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-medium"
                          style={{ background: getColor(m.display_name) }}
                        >
                          {getInitials(m.display_name)}
                        </div>
                      )}
                      <span className="text-sm">{m.display_name || "Unnamed"}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end pt-3 border-t border-border">
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !meetingDate}
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

export default CreateMeetingDialog;
