import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, X, Search, CalendarIcon } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { formatPersonName , getInitials } from "@/lib/dateFormat";
import { useMeetingCategories } from "@/hooks/useMeetingCategories";
import ComboSearch from "@/components/shared/ComboSearch";

interface CreateMeetingDialogProps {
  onSubmit: (data: {
    title: string;
    meeting_date: string;
    attendee_ids: string[];
    category_id?: string;
  }) => void;
}

const CreateMeetingDialog = ({ onSubmit }: CreateMeetingDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { data: members } = useTeamMembers();
  const { categories, createCategory } = useMeetingCategories();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTitle("");
      setMeetingDate("");
      setSelectedAttendees([]);
      setSearch("");
      setCategoryId(null);
    }
    setOpen(isOpen);
  };

  const handleSubmit = () => {
    if (!title.trim() || !meetingDate) return;
    onSubmit({
      title: title.trim(),
      meeting_date: meetingDate,
      attendee_ids: selectedAttendees,
      category_id: categoryId || undefined,
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
      formatPersonName(m).toLowerCase().includes(search.toLowerCase())
  );

  const selectedMembers = (members || []).filter((m) =>
    selectedAttendees.includes(m.id)
  );


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
        <span style={{
          fontSize: 13, fontWeight: 600, color: "#415162", background: "#E7EBEF",
          padding: "4px 12px", borderRadius: 6, cursor: "pointer", userSelect: "none",
        }}>
          Add
        </span>
      </DialogTrigger>
      <DialogContent
        className="rounded-lg p-5 max-w-[calc(100vw-2rem)] w-full sm:max-w-md overflow-hidden"
        style={{ background: "#F5F3EE", border: "1px solid #C9CED4", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}
        overlayClassName="bg-[rgba(65,81,98,0.45)] backdrop-blur-sm"
      >
        <div className="overflow-y-auto max-h-[80vh] overflow-x-hidden">
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-semibold" style={{ color: "#2D3748" }}>New meeting</span>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              className="rounded-lg" style={{ borderColor: "#C9CED4", background: "#fff" }}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Category</label>
            {categoryId ? (() => {
              const linked = categories.data?.find(c => c.id === categoryId);
              return (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "0.5px solid #C9CED4", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#2D3748", fontWeight: 500 }}>
                  {linked?.name || "Unknown"}
                  <div onClick={() => setCategoryId(null)} style={{ cursor: "pointer", display: "flex" }}>
                    <X style={{ width: 12, height: 12, color: "#8A9AAB" }} />
                  </div>
                </div>
              );
            })() : (
              <ComboSearch
                items={(categories.data || []).map(c => ({ id: c.id, label: c.name }))}
                placeholder="Search or create category..."
                createLabel="category"
                onSelect={(id) => setCategoryId(id)}
                onCreate={async (name) => { await createCategory.mutateAsync(name); }}
              />
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center justify-between w-full px-3 py-2 border rounded-lg text-sm text-left" style={{ borderColor: "#C9CED4", background: "#fff" }}>
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
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Attendees</label>

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
                      {formatPersonName(m)}
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
            <div className="border rounded-lg overflow-hidden" style={{ borderColor: "#C9CED4", background: "#fff" }}>
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
                      <span className="text-sm">{formatPersonName(m)}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !meetingDate}
            className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#415162" }}
          >
            Save meeting
          </button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateMeetingDialog;
