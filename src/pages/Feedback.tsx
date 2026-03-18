import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { User, ThumbsUp, ThumbsDown, Pencil, Trash2, X as XIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useFeedback } from "@/hooks/useFeedback";
import { supabase } from "@/integrations/supabase/client";
import { formatCardDate, formatPersonName } from "@/lib/dateFormat";
import { DetailReadOnly } from "@/components/cbme/DetailField";
import HeaderLogo from "@/components/HeaderLogo";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import CreateFeedbackDialog from "@/components/feedback/CreateFeedbackDialog";
import EditFeedbackDialog from "@/components/feedback/EditFeedbackDialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const Feedback = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { data: teamMembers } = useTeamMembers();
  const { feedbackQuery, createFeedback, updateFeedback, deleteFeedback } = useFeedback();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSentiment, setFilterSentiment] = useState<"positive" | "negative" | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch user IDs with the 'resident' role
  const { data: residentRoles } = useQuery({
    queryKey: ["resident-role-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "resident");
      if (error) throw error;
      return (data || []).map((r) => r.user_id);
    },
  });

  const members = teamMembers || [];
  const residentIds = new Set(residentRoles || []);
  const residents = members.filter((m) => residentIds.has(m.id));

  // Build a lookup for names
  const nameMap = new Map<string, string>();
  members.forEach((m) => nameMap.set(m.id, formatPersonName(m)));
  const allFeedback = feedbackQuery.data || [];

  // Filter
  const filtered = allFeedback.filter((fb) => {
    if (filterResident && fb.resident_id !== filterResident) return false;
    if (filterSentiment && fb.sentiment !== filterSentiment) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const residentName = (nameMap.get(fb.resident_id) || "").toLowerCase();
      const facultyName = (nameMap.get(fb.faculty_id) || "").toLowerCase();
      if (
        !fb.comment.toLowerCase().includes(q) &&
        !residentName.includes(q) &&
        !facultyName.includes(q)
      ) return false;
    }
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
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm truncate" style={{ color: "#2D3748" }}>
                {residentName}
              </span>
              {dateInfo && (
                <span
                  className={cn("text-[11px] whitespace-nowrap shrink-0", dateInfo.urgent ? "text-destructive" : "text-muted-foreground")}
                >
                  {dateInfo.text}
                </span>
              )}
            </div>
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
    <div className="min-h-screen bg-background pb-20" style={{ background: "#F5F3EE" }}>
      {/* Header */}
      <header style={{ background: "#415162" }}>
        <div className="container flex items-center justify-between h-14 px-4">
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut} />
          <div className="flex items-center gap-1 text-white/50">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-transparent"
              title="Search"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery("");
              }}
            >
              {searchOpen ? <XIcon className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
            <NotificationBell />
          </div>
        </div>
        {searchOpen && (
          <div className="container px-4 pb-3">
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search feedback..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}
      </header>

      <main className="container max-w-2xl px-4 py-6">
        {/* Filter row */}
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex gap-1">
          {/* Filter by resident */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-8 w-8 p-0 inline-flex items-center justify-center rounded-md transition-colors",
                  filterResident
                    ? "text-[#415162]"
                    : "text-[#8A9AAB]"
                )}
              >
                <User className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="start">
              {filterResident && (
                <button
                  onClick={() => setFilterResident(null)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-destructive cursor-pointer hover:bg-accent mb-1"
                >
                  <XIcon className="h-3 w-3" />
                  Clear filter
                </button>
              )}
              <div className="max-h-60 overflow-y-auto">
                {residents.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setFilterResident(filterResident === m.id ? null : m.id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-left cursor-pointer transition-colors",
                      filterResident === m.id ? "bg-primary/10" : "hover:bg-accent"
                    )}
                  >
                    {m.avatar_url ? (
                      <img src={m.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" />
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                        style={{ fontSize: 8, fontWeight: 500, background: getColor(formatPersonName(m)) }}
                      >
                        {getInitials(formatPersonName(m))}
                      </div>
                    )}
                    <span className="text-foreground text-xs">{formatPersonName(m)}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

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
        <div className="flex flex-col gap-2">
          {renderCards()}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Feedback;
