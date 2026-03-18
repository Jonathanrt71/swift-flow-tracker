import { useState } from "react";
import { format, parseISO } from "date-fns";
import { User, ThumbsUp, ThumbsDown, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useFeedback } from "@/hooks/useFeedback";
import { formatCardDate, formatLastFirst, formatNameFromParts } from "@/lib/dateFormat";
import { DetailReadOnly } from "@/components/cbme/DetailField";
import HeaderLogo from "@/components/HeaderLogo";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import CreateFeedbackDialog from "@/components/feedback/CreateFeedbackDialog";
import EditFeedbackDialog from "@/components/feedback/EditFeedbackDialog";
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

const Feedback = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { data: teamMembers } = useTeamMembers();
  const { feedbackQuery, createFeedback, updateFeedback, deleteFeedback } = useFeedback();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterResident, setFilterResident] = useState<string | null>(null);
  const [filterSentiment, setFilterSentiment] = useState<"positive" | "negative" | null>(null);

  const members = teamMembers || [];
  const allFeedback = feedbackQuery.data || [];

  // Build a lookup for names
  const nameMap = new Map<string, string>();
  members.forEach((m) => nameMap.set(m.id, formatNameFromParts(m.first_name, m.last_name)));

  // Get residents for the create dialog (we use user_roles if available, otherwise show all members)
  // For simplicity, show all team members in the resident selector — the dialog is only accessible to faculty/admin
  const residents = members;

  // Filter
  const filtered = allFeedback.filter((fb) => {
    if (filterResident && fb.resident_id !== filterResident) return false;
    if (filterSentiment && fb.sentiment !== filterSentiment) return false;
    return true;
  });

  // Already sorted descending from the query, but ensure it
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Month grouping
  const renderCards = () => {
    if (feedbackQuery.isLoading) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Loading...</p>
        </div>
      );
    }

    if (sorted.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No feedback yet.</p>
        </div>
      );
    }

    let prevMonth = "";
    const elements: React.ReactNode[] = [];

    sorted.forEach((fb) => {
      let monthKey = "";
      let monthLabel: string | null = null;
      try {
        const d = parseISO(fb.created_at);
        monthKey = format(d, "yyyy-MM");
        monthLabel = format(d, "MMMM yyyy");
      } catch {
        monthKey = "other";
      }

      if (monthKey !== prevMonth && monthLabel) {
        elements.push(
          <div
            key={`month-${monthKey}`}
            className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider pt-3 pb-1"
          >
            {monthLabel}
          </div>
        );
      }
      prevMonth = monthKey;

      const isExpanded = expandedId === fb.id;
      const dateInfo = formatCardDate(fb.created_at);
      const residentName = nameMap.get(fb.resident_id) || "?";
      const facultyName = nameMap.get(fb.faculty_id) || "?";
      const dotColor = fb.sentiment === "positive" ? "#5E9E82" : "#A63333";

      elements.push(
        <div
          key={fb.id}
          className="rounded-lg overflow-hidden cursor-pointer"
          style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4" }}
          onClick={() => setExpandedId(isExpanded ? null : fb.id)}
        >
          {/* Collapsed row */}
          <div className="flex items-center gap-2.5 px-3.5 py-3">
            <span className="text-sm flex-1 min-w-0 truncate" style={{ color: "#2D3748" }}>
              {residentName}
            </span>
            {dateInfo && (
              <span
                className="text-[13px] whitespace-nowrap"
                style={{ color: dateInfo.urgent ? "#E24B4A" : "#8A9AAB" }}
              >
                {dateInfo.text}
              </span>
            )}
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{ background: dotColor }}
            />
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <div className="px-3.5 pb-3" onClick={(e) => e.stopPropagation()}>
              {fb.comment && fb.comment !== "<p></p>" && fb.comment.trim() !== "" && (
                <div className="mb-2">
                  <DetailReadOnly html={fb.comment} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="text-xs" style={{ color: "#8A9AAB" }}>
                  {facultyName}
                </div>
                <div className="flex items-center gap-2">
                  <EditFeedbackDialog
                    feedback={fb}
                    residents={residents}
                    onSubmit={(data) => updateFeedback.mutate({ id: fb.id, ...data })}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1 text-[#8A9AAB] hover:text-[#A63333]">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this feedback entry. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            deleteFeedback.mutate(fb.id);
                            setExpandedId(null);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    });

    return elements;
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5F3EE" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3"
        style={{ background: "#415162" }}
      >
        <HeaderLogo isAdmin={isAdmin} onSignOut={signOut} />
        <div className="flex items-center gap-3">
          <NotificationBell />
        </div>
      </div>

      {/* Filter row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex gap-3.5">
          {/* Filter by resident */}
          <button
            onClick={() => {
              if (filterResident) {
                setFilterResident(null);
              } else {
                // Cycle through residents or just toggle — for now, use a simple popover approach
                // Simple approach: cycle through residents on each tap
                const residentIds = members.map((m) => m.id);
                if (residentIds.length === 0) return;
                const currentIdx = filterResident
                  ? residentIds.indexOf(filterResident)
                  : -1;
                const nextIdx = (currentIdx + 1) % residentIds.length;
                setFilterResident(residentIds[nextIdx]);
              }
            }}
            className="p-0.5"
          >
            <User
              className="h-5 w-5"
              style={{ color: filterResident ? "#415162" : "#8A9AAB" }}
            />
          </button>

          {/* Filter positive */}
          <button
            onClick={() =>
              setFilterSentiment(filterSentiment === "positive" ? null : "positive")
            }
            className="p-0.5"
          >
            <ThumbsUp
              className="h-5 w-5"
              style={{
                color: filterSentiment === "positive" ? "#5E9E82" : "#8A9AAB",
              }}
            />
          </button>

          {/* Filter negative */}
          <button
            onClick={() =>
              setFilterSentiment(filterSentiment === "negative" ? null : "negative")
            }
            className="p-0.5"
          >
            <ThumbsDown
              className="h-5 w-5"
              style={{
                color: filterSentiment === "negative" ? "#A63333" : "#8A9AAB",
              }}
            />
          </button>
        </div>

        {/* Add button */}
        <CreateFeedbackDialog
          onSubmit={(data) => createFeedback.mutate(data)}
          residents={residents}
        />
      </div>

      {/* Cards */}
      <div className="flex-1 px-4 pb-20 flex flex-col gap-2">
        {renderCards()}
      </div>

      <BottomNav />
    </div>
  );
};

export default Feedback;
