// force rebuild v4
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTodo, CheckCircle2, Star, Search, X } from "lucide-react";
import TaskCard from "@/components/tasks/TaskCard";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import NotificationBell from "@/components/NotificationBell";
import type { Task } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useMeetings } from "@/hooks/useMeetings";
import HeaderLogo from "@/components/HeaderLogo";

const Index = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { data: teamMembers } = useTeamMembers();
  const { meetings } = useMeetings();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const meetingNames = new Map<string, string>();
  meetings.data?.forEach((m) => meetingNames.set(m.id, m.title));
  const {
    tasks,
    isLoading,
    createTask,
    updateTask,
    toggleComplete,
    toggleStar,
    deleteTask,
  } = useTasks();

  const now = new Date();

  const searchFilter = (t: Task): boolean => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q) ||
      (t.subtasks?.some((s) => s.title.toLowerCase().includes(q)) ?? false)
    );
  };

  // Helper to check if task or any subtask is assigned to current user
  const isAssignedToMe = (t: Task): boolean =>
    t.assigned_to === user?.id || t.created_by === user?.id || (t.subtasks?.some(isAssignedToMe) ?? false);

  // Default sort: due date (soonest first, no date last)
  const sortByDueDate = (a: Task, b: Task) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  };

  // My Tasks: incomplete, assigned to or created by me
  const myTasks = tasks
    .filter((t) => !t.completed && isAssignedToMe(t) && searchFilter(t))
    .sort(sortByDueDate);

  // Starred: incomplete + starred
  const starredTasks = tasks
    .filter((t) => !t.completed && t.starred && searchFilter(t))
    .sort(sortByDueDate);

  // Completed
  const completedTasks = tasks
    .filter((t) => t.completed && searchFilter(t))
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

  const isOverdue = (task: { due_date: string | null; completed: boolean }) =>
    !task.completed && !!task.due_date && new Date(task.due_date) < now;

  const getMonthKey = (task: Task): string => {
    if (!task.due_date) return "no-date";
    try {
      return format(parseISO(task.due_date.split("T")[0]), "yyyy-MM");
    } catch {
      return "no-date";
    }
  };

  const getMonthLabel = (task: Task): string | null => {
    if (!task.due_date) return null;
    try {
      return format(parseISO(task.due_date.split("T")[0]), "MMMM yyyy");
    } catch {
      return null;
    }
  };

  const renderGroupedTaskList = (taskList: Task[], emptyIcon: React.ReactNode, emptyText: string) => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      );
    }
    if (taskList.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <div className="mx-auto mb-3 opacity-40">{emptyIcon}</div>
          <p className="text-sm">{emptyText}</p>
        </div>
      );
    }

    const elements: React.ReactNode[] = [];
    let prevMonth = "";

    taskList.forEach((task) => {
      const monthKey = getMonthKey(task);
      const monthLabel = getMonthLabel(task);
      if (monthKey !== prevMonth && monthLabel) {
        elements.push(
          <div key={`month-${monthKey}`} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider pt-3 pb-1">
            {monthLabel}
          </div>
        );
      }
      prevMonth = monthKey;
      elements.push(
        <TaskCard
          key={task.id}
          task={task}
          isOverdue={isOverdue(task)}
          teamMembers={teamMembers || []}
          onToggleComplete={(d) => toggleComplete.mutate(d)}
          onToggleStar={(d) => toggleStar.mutate(d)}
          onCardClick={() => {}}
        />
      );
    });

    return elements;
  };

  const renderTaskList = (taskList: Task[], emptyIcon: React.ReactNode, emptyText: string) => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      );
    }
    if (taskList.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <div className="mx-auto mb-3 opacity-40">{emptyIcon}</div>
          <p className="text-sm">{emptyText}</p>
        </div>
      );
    }
    return taskList.map((task) => (
      <TaskCard
        key={task.id}
        task={task}
        isOverdue={isOverdue(task)}
        teamMembers={teamMembers || []}
        meetingNames={meetingNames}
        onToggleComplete={(d) => toggleComplete.mutate(d)}
        onUpdate={(d) => updateTask.mutate(d)}
        onDelete={(id) => deleteTask.mutate(id)}
        onCreateSubtask={(d) => createTask.mutate(d)}
        onToggleStar={(d) => toggleStar.mutate(d)}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-[#415162] sticky top-0 z-40">
        <div className="container flex items-center h-14 px-4">
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
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
              {searchOpen ? <X style={{ width: 17, height: 17 }} /> : <Search style={{ width: 17, height: 17 }} />}
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
              placeholder="Search tasks..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}
      </header>

      <main className="container max-w-[1200px] px-4 py-6">
        <Tabs defaultValue="myTasks">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="gap-1 h-auto p-1 bg-transparent">
              <TabsTrigger value="myTasks" className="flex flex-col items-center gap-0.5 h-auto px-2 py-1" title="My Tasks">
                <ListTodo className="h-4 w-4" />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="starred" className="flex flex-col items-center gap-0.5 h-auto px-2 py-1" title="Starred">
                <Star className="h-4 w-4" />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>Starred</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex flex-col items-center gap-0.5 h-auto px-2 py-1" title="Completed">
                <CheckCircle2 className="h-4 w-4" />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>Done</span>
              </TabsTrigger>
            </TabsList>
            <CreateTaskDialog
              onSubmit={(data) => createTask.mutate(data)}
              loading={createTask.isPending}
              inlineIcon
            />
          </div>

          <TabsContent value="myTasks" className="space-y-3 mt-0">
            {renderGroupedTaskList(
              myTasks,
              <ListTodo className="h-10 w-10 mx-auto" />,
              "No active tasks. Create one to get started!"
            )}
          </TabsContent>

          <TabsContent value="starred" className="space-y-3 mt-0">
            {renderGroupedTaskList(
              starredTasks,
              <Star className="h-10 w-10 mx-auto" />,
              "No starred tasks. Star a task to pin it here."
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3 mt-0">
            {renderTaskList(
              completedTasks,
              <CheckCircle2 className="h-10 w-10 mx-auto" />,
              "No completed tasks yet."
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
