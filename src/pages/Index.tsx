// force rebuild v5
import { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTodo, CheckCircle2, Star, Search, X, Hash } from "lucide-react";
import TaskCard from "@/components/tasks/TaskCard";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import NotificationBell from "@/components/NotificationBell";
import type { Task } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useMeetings } from "@/hooks/useMeetings";
import HeaderLogo from "@/components/HeaderLogo";
import { usePriorities } from "@/hooks/usePriorities";
import PriorityCard from "@/components/tasks/PriorityCard";
import CreatePriorityDialog from "@/components/tasks/CreatePriorityDialog";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";
import { usePermissions } from "@/hooks/usePermissions";

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

  const { priorities, isLoading: prioritiesLoading, createPriority, updatePriority, deletePriority, reorderPriorities } = usePriorities();
  const { has: hasPerm } = usePermissions();
  const canEditPriorities = hasPerm("priorities.edit");

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [localPriorities, setLocalPriorities] = useState(priorities);
  const [activeTab, setActiveTab] = useState("myPriorities");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Touch long-press reorder
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchActive = useRef(false);
  const touchMovedEnough = useRef(false);
  const touchStartY = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchStart = (idx: number, e: React.TouchEvent) => {
    touchActive.current = true;
    touchMovedEnough.current = false;
    touchStartY.current = e.touches[0].clientY;

    longPressTimer.current = setTimeout(() => {
      if (!touchActive.current) return;
      // Activate drag mode
      setDragIdx(idx);
      setIsDragging(true);
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(30);
    }, 400);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);

    // If we moved before long press fired, cancel it (user is scrolling)
    if (!isDragging && dy > 8) {
      clearLongPress();
      touchActive.current = false;
      return;
    }

    if (!isDragging || dragIdx === null) return;

    // Prevent page scroll while dragging
    e.preventDefault();

    const touchY = e.touches[0].clientY;
    for (let i = 0; i < itemRefs.current.length; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (touchY >= rect.top && touchY <= rect.bottom && i !== dragOverIdx) {
        setDragOverIdx(i);
        break;
      }
    }
  };

  const handleTouchEnd = () => {
    clearLongPress();
    touchActive.current = false;

    if (isDragging && dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      const reordered = [...localPriorities];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(dragOverIdx, 0, moved);
      setLocalPriorities(reordered);
      reorderPriorities.mutate(reordered.map((r) => r.id));
    }

    setDragIdx(null);
    setDragOverIdx(null);
    // Delay clearing isDragging so the click handler on PriorityCard can check it
    setTimeout(() => setIsDragging(false), 50);
  };

  useEffect(() => {
    setLocalPriorities(priorities);
  }, [priorities]);

  const now = new Date();

  // Flatten all tasks for priority linking
  const flatAllTasks = (() => {
    const result: Task[] = [];
    const walk = (t: Task) => { result.push(t); t.subtasks?.forEach(walk); };
    tasks.forEach(walk);
    return result;
  })();

  // Build priority name map and task counts per priority
  const priorityNameMap = new Map<string, string>();
  priorities.forEach(p => priorityNameMap.set(p.id, p.title));

  const priorityTaskCounts = new Map<string, { total: number; done: number }>();
  flatAllTasks.forEach(t => {
    const pid = (t as any).priority_id;
    if (pid) {
      const entry = priorityTaskCounts.get(pid) || { total: 0, done: 0 };
      entry.total++;
      if (t.completed) entry.done++;
      priorityTaskCounts.set(pid, entry);
    }
  });

  // My priorities = program priorities assigned to current user
  const myPriorities = priorities.filter(p => p.assigned_to === user?.id);

  const searchFilter = (t: Task): boolean => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q) ||
      (t.subtasks?.some((s) => s.title.toLowerCase().includes(q)) ?? false)
    );
  };

  const isAssignedToMe = (t: Task): boolean =>
    t.assigned_to === user?.id || t.created_by === user?.id || (t.subtasks?.some(isAssignedToMe) ?? false);

  const sortByDueDate = (a: Task, b: Task) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  };

  const myTasks = tasks
    .filter((t) => !t.completed && isAssignedToMe(t) && searchFilter(t))
    .sort(sortByDueDate);

  const starredTasks = tasks
    .filter((t) => !t.completed && t.starred && searchFilter(t))
    .sort(sortByDueDate);

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
          priorityName={(task as any).priority_id ? priorityNameMap.get((task as any).priority_id) || null : null}
          onToggleComplete={(d) => toggleComplete.mutate(d)}
          onToggleStar={(d) => toggleStar.mutate(d)}
          onCardClick={(t) => setSelectedTask(t)}
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
        priorityName={(task as any).priority_id ? priorityNameMap.get((task as any).priority_id) || null : null}
        onToggleComplete={(d) => toggleComplete.mutate(d)}
        onToggleStar={(d) => toggleStar.mutate(d)}
        onCardClick={(t) => setSelectedTask(t)}
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="gap-1 h-auto p-1 bg-transparent">
              <TabsTrigger value="myPriorities" className="flex flex-col items-center gap-0.5 h-auto px-2 py-1" title="My Priorities">
                <Hash className="h-4 w-4" />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>My Priorities</span>
              </TabsTrigger>
              <TabsTrigger value="priorities" className="flex flex-col items-center gap-0.5 h-auto px-2 py-1" title="Priorities">
                <Hash className="h-4 w-4" />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>Priorities</span>
              </TabsTrigger>
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
            {(activeTab === "priorities") && canEditPriorities ? (
              <CreatePriorityDialog
                onSubmit={(data) => createPriority.mutate(data)}
                loading={createPriority.isPending}
                inlineIcon
              />
            ) : activeTab !== "priorities" ? (
              <CreateTaskDialog
                onSubmit={(data) => createTask.mutate(data)}
                loading={createTask.isPending}
                inlineIcon
              />
            ) : null}
          </div>

          <TabsContent value="myPriorities" className="space-y-3 mt-0">
            {prioritiesLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : myPriorities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Hash className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No priorities assigned to you</p>
              </div>
            ) : (
              myPriorities.map((p) => {
                const programRank = priorities.indexOf(p) + 1;
                return (
                  <PriorityCard
                    key={p.id}
                    priority={p}
                    rank={programRank}
                    teamMembers={teamMembers || []}
                    linkedTaskCount={priorityTaskCounts.get(p.id)?.total || 0}
                    linkedTasksDone={priorityTaskCounts.get(p.id)?.done || 0}
                    onUpdate={(data) => updatePriority.mutate(data)}
                    onDelete={(id) => deletePriority.mutate(id)}
                  />
                );
              })
            )}
          </TabsContent>

          <TabsContent value="priorities" className="space-y-3 mt-0">
            {prioritiesLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : localPriorities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Hash className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No priorities yet. Add one to get started!</p>
              </div>
            ) : (
              localPriorities.map((p, idx) => (
                <div
                  key={p.id}
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  draggable={!isDragging}
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                  onDragEnd={() => {
                    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
                      const reordered = [...localPriorities];
                      const [moved] = reordered.splice(dragIdx, 1);
                      reordered.splice(dragOverIdx, 0, moved);
                      setLocalPriorities(reordered);
                      reorderPriorities.mutate(reordered.map((r) => r.id));
                    }
                    setDragIdx(null);
                    setDragOverIdx(null);
                  }}
                  onTouchStart={(e) => handleTouchStart(idx, e)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    opacity: dragIdx === idx ? 0.5 : 1,
                    borderTop: dragOverIdx === idx && dragIdx !== null && dragIdx > idx ? "2px solid #415162" : undefined,
                    borderBottom: dragOverIdx === idx && dragIdx !== null && dragIdx < idx ? "2px solid #415162" : undefined,
                    transform: isDragging && dragIdx === idx ? "scale(1.02)" : undefined,
                    transition: isDragging ? "none" : "opacity 0.15s",
                    touchAction: isDragging ? "none" : "auto",
                  }}
                >
                  <PriorityCard
                    priority={p}
                    rank={idx + 1}
                    teamMembers={teamMembers || []}
                    linkedTaskCount={priorityTaskCounts.get(p.id)?.total || 0}
                    linkedTasksDone={priorityTaskCounts.get(p.id)?.done || 0}
                    suppressClick={isDragging}
                    onUpdate={(data) => updatePriority.mutate(data)}
                    onDelete={(id) => deletePriority.mutate(id)}
                  />
                </div>
              ))
            )}
          </TabsContent>

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

      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
          teamMembers={teamMembers || []}
          meetingNames={meetingNames}
          onUpdate={(d) => { updateTask.mutate(d); setSelectedTask(null); }}
          onDelete={(id) => { deleteTask.mutate(id); setSelectedTask(null); }}
          onToggleComplete={(d) => toggleComplete.mutate(d)}
          onCreateSubtask={(d) => createTask.mutate(d)}
          onToggleStar={(d) => toggleStar.mutate(d)}
        />
      )}
    </div>
  );
};

export default Index;
