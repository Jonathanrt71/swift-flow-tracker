import { useState } from "react";
import { useMeetings } from "@/hooks/useMeetings";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, User, LogOut, Search, X as XIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { DetailReadOnly } from "@/components/cbme/DetailField";
import { formatCardDate, formatPersonName, getInitials } from "@/lib/dateFormat";
import HeaderLogo from "@/components/HeaderLogo";
import CreateMeetingDialog from "@/components/meetings/CreateMeetingDialog";
import EditMeetingDialog from "@/components/meetings/MeetingNotesDialog";
import { useMeetingTags, useMeetingTagLinks } from "@/hooks/useMeetingTags";
import NotificationBell from "@/components/NotificationBell";
import type { Meeting } from "@/hooks/useMeetings";
import { useMeetingCategories } from "@/hooks/useMeetingCategories";


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
  meetingTagNames,
  categoryName,
  onUpdate,
  onDelete,
  onEdit,
  onCreateTask,
}: {
  meeting: Meeting;
  teamMembers: ReturnType<typeof useTeamMembers>["data"];
  linkedTasks: Task[];
  meetingTagNames: string[];
  categoryName?: string;
  onUpdate: (data: { id: string; notes?: string | null }) => void;
  onDelete: (id: string) => void;
  onEdit?: (meeting: Meeting) => void;
  onCreateTask: (data: {
    title: string;
    description?: string;
    due_date?: string;
    assigned_to?: string;
    owed_to?: string;
    meeting_id?: string;
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

  return (
    <div className="bg-muted border border-border rounded-[10px] overflow-hidden transition-all">
      {/* Top row — tap to open edit */}
      <div
        className="flex items-center min-h-[48px] px-2 cursor-pointer"
        onClick={() => onEdit?.(meeting)}
      >
        {/* Title + category */}
        <div className="flex-1 min-w-0 pl-2 pr-1" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="font-medium text-sm truncate">{meeting.title}</span>
          {categoryName && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 4, background: "#D5DAE0", color: "#415162", textTransform: "uppercase" as const, letterSpacing: "0.03em", whiteSpace: "nowrap", flexShrink: 0 }}>
              {categoryName}
            </span>
          )}
        </div>

        {/* Date preview */}
        {(() => {
          const dd = formatCardDate(meeting.meeting_date);
          return dd ? (
            <span className="text-[11px] whitespace-nowrap mr-1.5 text-muted-foreground">
              {dd.text}
            </span>
          ) : null;
        })()}

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


      {/* Tags row */}
      {meetingTagNames.length > 0 && (
        <div className="px-3 pb-1.5 flex flex-wrap gap-1">
          {meetingTagNames.map((t) => (
            <span key={t} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 10, background: "#D5DAE0", color: "#415162", fontWeight: 500 }}>{t}</span>
          ))}
        </div>
      )}

      {/* Notes preview */}
      {meeting.notes && meeting.notes !== "<p></p>" && meeting.notes.trim() !== "" && (
        <div className="pb-2 pl-3 pr-3">
          <div className="px-1">
            <DetailReadOnly html={meeting.notes} />
          </div>
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
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

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
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { categories: meetingCategories } = useMeetingCategories();
  const categoryNameMap = new Map<string, string>();
  (meetingCategories.data || []).forEach((c) => categoryNameMap.set(c.id, c.name));

  const { tags: allTags } = useMeetingTags();
  const { links: tagLinks } = useMeetingTagLinks();

  // Build tag lookup: meeting_id -> tag_id[]
  const tagsByMeeting = new Map<string, string[]>();
  (tagLinks.data || []).forEach((l) => {
    const list = tagsByMeeting.get(l.meeting_id) || [];
    list.push(l.tag_id);
    tagsByMeeting.set(l.meeting_id, list);
  });

  // Build tag name lookup
  const tagNameMap = new Map<string, string>();
  (allTags.data || []).forEach((t) => tagNameMap.set(t.id, t.name));

  const filteredMeetings = (meetings.data || []).filter((m) => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!m.title.toLowerCase().includes(q) && !(m.notes || "").toLowerCase().includes(q)) return false;
    }
    // Category filter
    if (categoryFilter) {
      if ((m as any).category_id !== categoryFilter) return false;
    }
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div className="flex items-center h-14 px-4">
          <HeaderLogo isAdmin={isAdmin} onSignOut={() => signOut()}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                background: "transparent",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                color: "rgba(255,255,255,0.8)",
              }}
              title="Search"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery("");
              }}
            >
              {searchOpen ? <XIcon style={{ width: 17, height: 17 }} /> : <Search style={{ width: 17, height: 17 }} />}
            </button>
            <NotificationBell />
          </HeaderLogo>
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

      <main className="px-4 pt-3" style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 100 }}>
        {/* Category filter + Add button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 0 }}>
            <button
              onClick={() => setCategoryFilter(null)}
              style={{
                padding: "1px 0 0 0", marginRight: 20, fontSize: 14, fontWeight: 600, cursor: "pointer",
                background: "transparent", border: "none",
                color: categoryFilter === null ? "#415162" : "#8A9AAB",
                borderBottom: categoryFilter === null ? "2px solid #415162" : "2px solid transparent",
              }}
            >
              All
            </button>
            {(meetingCategories.data || []).map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
                style={{
                  padding: "1px 0 0 0", marginRight: 20, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  background: "transparent", border: "none",
                  color: categoryFilter === cat.id ? "#415162" : "#8A9AAB",
                  borderBottom: categoryFilter === cat.id ? "2px solid #415162" : "2px solid transparent",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
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
            (() => {
              const now = new Date();
              const currentMonthLabel = format(now, "MMMM yyyy");
              let prevMonth = "";
              const elements: React.ReactNode[] = [];

              filteredMeetings.forEach((meeting) => {
                let monthKey = "";
                let monthLabel: string | null = null;
                try {
                  const d = parseISO(meeting.meeting_date);
                  monthKey = format(d, "yyyy-MM");
                  monthLabel = format(d, "MMMM yyyy");
                } catch {
                  monthKey = "other";
                }

                if (monthKey !== prevMonth && monthLabel) {
                  elements.push(
                    <div key={`month-${monthKey}`} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider pt-3 pb-1">
                      {monthLabel}
                    </div>
                  );
                }
                prevMonth = monthKey;

                elements.push(
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    teamMembers={teamMembers}
                    linkedTasks={tasksByMeeting.get(meeting.id) || []}
                    meetingTagNames={(tagsByMeeting.get(meeting.id) || []).map((id) => tagNameMap.get(id) || "").filter(Boolean)}
                    categoryName={(meeting as any).category_id ? categoryNameMap.get((meeting as any).category_id) : undefined}
                    onUpdate={(data) => updateMeeting.mutate(data)}
                    onDelete={(id) => deleteMeeting.mutate(id)}
                    onEdit={(m) => setEditingMeeting(m)}
                    onCreateTask={(data) => createTask.mutate(data)}
                  />
                );
              });

              return elements;
            })()
          )}
        </div>
      </main>

      {editingMeeting && (
        <EditMeetingDialog
          meeting={editingMeeting}
          open={!!editingMeeting}
          onOpenChange={(open) => { if (!open) setEditingMeeting(null); }}
          teamMembers={teamMembers || []}
          onUpdate={(data) => { updateMeeting.mutate(data); setEditingMeeting(null); }}
          onDelete={(id) => { deleteMeeting.mutate(id); setEditingMeeting(null); }}
        />
      )}

    </div>
  );
};

export default Meetings;
