// force rebuild v5
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTodo, CheckCircle2, Star, Search, X, Hash, ChevronDown } from "lucide-react";
import TaskCard from "@/components/tasks/TaskCard";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import NotificationBell from "@/components/NotificationBell";
import type { Task } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useMeetings } from "@/hooks/useMeetings";
import HeaderLogo from "@/components/HeaderLogo";
import { usePriorities } from "@/hooks/usePriorities";
import { useUserPriorityOrder } from "@/hooks/useUserPriorityOrder";
import PriorityCard from "@/components/tasks/PriorityCard";
import CreatePriorityDialog from "@/components/tasks/CreatePriorityDialog";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const { userOrder, reorder: reorderUserPriorities } = useUserPriorityOrder();
  const { has: hasPerm } = usePermissions();
  const canEditPriorities = hasPerm("priorities.edit");

  const [localPriorities, setLocalPriorities] = useState(priorities);
  const [localMyPriorities, setLocalMyPriorities] = useState<typeof priorities>([]);
  const [activeTab, setActiveTab] = useState("priorities");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [programCollapsed, setProgramCollapsed] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [highlightKey, setHighlightKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle ?tab= and ?highlight= query params
  useEffect(() => {
    const tab = searchParams.get("tab");
    const highlight = searchParams.get("highlight");
    if (tab) setActiveTab(tab);
    if (highlight) {
      // Clear params
      setSearchParams({}, { replace: true });
      // Delay to let tab content render, then highlight + scroll
      const timer = setTimeout(() => {
        setHighlightId(highlight);
        setHighlightKey(k => k + 1);
        // Poll for the element (data may still be loading)
        let attempts = 0;
        const poll = setInterval(() => {
          const el = document.querySelector(`[data-highlight-id="${highlight}"]`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            clearInterval(poll);
          }
          if (++attempts > 20) clearInterval(poll);
        }, 100);
        setTimeout(() => setHighlightId(null), 2500);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

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

  // Fetch handbook section names for tasks with operations_section_id
  const sectionIds = [...new Set(flatAllTasks.map(t => (t as any).operations_section_id).filter(Boolean))] as string[];
  const sectionNamesQuery = useQuery({
    queryKey: ["task-section-names", sectionIds.join(",")],
    enabled: sectionIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("handbook_sections")
        .select("id, title")
        .in("id", sectionIds);
      const map = new Map<string, string>();
      (data || []).forEach((s: any) => map.set(s.id, s.title));
      return map;
    },
  });
  const sectionNameMap = sectionNamesQuery.data || new Map<string, string>();

  // My priorities = program priorities assigned to current user, sorted by user order
  const myPrioritiesUnsorted = isAdmin ? priorities : priorities.filter(p => p.assigned_to === user?.id);
  const myPriorities = (() => {
    if (userOrder.length === 0) return myPrioritiesUnsorted;
    const orderMap = new Map<string, number>();
    userOrder.forEach(o => orderMap.set(o.priority_id, o.display_order));
    return [...myPrioritiesUnsorted].sort((a, b) => {
      const oa = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
      const ob = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
      return oa - ob;
    });
  })();

  useEffect(() => {
    setLocalMyPriorities(myPriorities);
  }, [priorities, userOrder]);

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
    !!isAdmin || t.assigned_to === user?.id || t.created_by === user?.id || (t.subtasks?.some(isAssignedToMe) ?? false);

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
        <div key={task.id} data-highlight-id={task.id} className={highlightId === task.id ? "highlight-pulse" : undefined} style={{ borderRadius: 8 }}>
          <TaskCard
            task={task}
            isOverdue={isOverdue(task)}
            teamMembers={teamMembers || []}
            priorityName={(task as any).priority_id ? priorityNameMap.get((task as any).priority_id) || null : null}
            sectionName={(task as any).operations_section_id ? sectionNameMap.get((task as any).operations_section_id) || null : null}
            onToggleComplete={(d) => toggleComplete.mutate(d)}
            onToggleStar={(d) => toggleStar.mutate(d)}
            onCardClick={(t) => setSelectedTask(t)}
          />
        </div>
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
      <div key={task.id} data-highlight-id={task.id} className={highlightId === task.id ? "highlight-pulse" : undefined} style={{ borderRadius: 8 }}>
        <TaskCard
          task={task}
          isOverdue={isOverdue(task)}
          teamMembers={teamMembers || []}
          priorityName={(task as any).priority_id ? priorityNameMap.get((task as any).priority_id) || null : null}
          sectionName={(task as any).operations_section_id ? sectionNameMap.get((task as any).operations_section_id) || null : null}
          onToggleComplete={(d) => toggleComplete.mutate(d)}
          onToggleStar={(d) => toggleStar.mutate(d)}
          onCardClick={(t) => setSelectedTask(t)}
        />
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <style>{`
        @keyframes highlightPulse {
          0% { background-color: rgba(212, 160, 23, 0.2); }
          100% { background-color: transparent; }
        }
        .highlight-pulse { animation: highlightPulse 1.5s ease-out forwards; border-radius: 8px; }
      `}</style>
      <header className="bg-[#415162] sticky top-0 z-40">
        <div className="flex items-center h-14 px-4">
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

      <main className="px-4 py-6" style={{ maxWidth: 900, margin: "0 auto" }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="gap-1 h-auto p-1 bg-transparent">
              <TabsTrigger value="priorities" className="flex flex-col items-center gap-0.5 h-auto py-1 data-[state=active]:bg-[#D5DAE0] data-[state=active]:text-[#415162] data-[state=active]:shadow-none data-[state=inactive]:text-[#8A9AAB]" style={{ width: 72 }} title="Priorities">
                <Hash className="h-4 w-4" />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>Priorities</span>
              </TabsTrigger>
              <TabsTrigger value="myTasks" className="flex flex-col items-center gap-0.5 h-auto py-1 data-[state=active]:bg-[#D5DAE0] data-[state=active]:text-[#415162] data-[state=active]:shadow-none data-[state=inactive]:text-[#8A9AAB]" style={{ width: 72 }} title="My Tasks">
                <ListTodo className="h-4 w-4" />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex flex-col items-center gap-0.5 h-auto py-1 data-[state=active]:bg-[#D5DAE0] data-[state=active]:text-[#415162] data-[state=active]:shadow-none data-[state=inactive]:text-[#8A9AAB]" style={{ width: 72 }} title="Completed">
                <CheckCircle2 className="h-4 w-4" />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>Done</span>
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center self-center">
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
          </div>

          <TabsContent value="priorities" className="mt-0">
            {prioritiesLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                {/* My Priorities section */}
                {localMyPriorities.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#8A9AAB", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                      My Priorities
                    </div>
                    <div className="space-y-1.5" style={{ marginBottom: 20 }}>
                      {localMyPriorities.map((p, idx) => {
                        const programRank = priorities.indexOf(p) + 1;
                        return (
                          <div key={p.id} data-highlight-id={p.id} className={highlightId === p.id ? "highlight-pulse" : undefined} style={{ borderRadius: 8 }}>
                              <PriorityCard
                                priority={p}
                                rank={idx + 1}
                                teamMembers={teamMembers || []}
                                linkedTasks={flatAllTasks.filter(t => (t as any).priority_id === p.id)}
                                unlinkableTasks={flatAllTasks.filter(t => !(t as any).priority_id && !t.completed)}
                                showArrows
                                isFirst={idx === 0}
                                isLast={idx === localMyPriorities.length - 1}
                                onMoveUp={() => {
                                  const reordered = [...localMyPriorities];
                                  [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
                                  setLocalMyPriorities(reordered);
                                  reorderUserPriorities.mutate(reordered.map(r => r.id));
                                }}
                                onMoveDown={() => {
                                  const reordered = [...localMyPriorities];
                                  [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
                                  setLocalMyPriorities(reordered);
                                  reorderUserPriorities.mutate(reordered.map(r => r.id));
                                }}
                                onUpdate={(data) => updatePriority.mutate(data)}
                                onDelete={(id) => deletePriority.mutate(id)}
                                onToggleTaskComplete={(d) => updateTask.mutate(d)}
                                onUnlinkTask={(id) => updateTask.mutate({ id, priority_id: null })}
                                onLinkTask={(id) => updateTask.mutate({ id, priority_id: p.id })}
                                onCreateTask={(title) => createTask.mutate({ title, assigned_to: p.assigned_to || undefined, priority_id: p.id })}
                              />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Program Priorities section */}
                <button
                  onClick={() => setProgramCollapsed(!programCollapsed)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, width: "100%",
                    fontSize: 11, fontWeight: 600, color: "#8A9AAB", textTransform: "uppercase",
                    letterSpacing: "0.05em", marginBottom: programCollapsed ? 0 : 8,
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                  }}
                >
                  <ChevronDown style={{ width: 14, height: 14, transition: "transform 0.2s", transform: programCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }} />
                  Program Priorities ({localPriorities.length})
                </button>
                {!programCollapsed && (
                  localPriorities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Hash className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No priorities yet. Add one to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {localPriorities.map((p, idx) => {
                      const showGapBefore = dragOverIdx === idx && dragIdx !== null && dragIdx > idx && activeListRef.current === "program";
                      const showGapAfter = dragOverIdx === idx && dragIdx !== null && dragIdx < idx && activeListRef.current === "program";
                      const dropGap = (
                        <div style={{ marginTop: -12 }}>
                          <div style={{ height: 36, display: "flex", alignItems: "center" }}>
                            <div style={{ height: 4, background: "#415162", borderRadius: 2, width: "100%" }} />
                          </div>
                        </div>
                      );
                      return (
                        <div key={p.id} data-highlight-id={p.id} className={`mb-1.5 ${highlightId === p.id ? "highlight-pulse" : ""}`} style={{ borderRadius: 8 }}>
                            <PriorityCard
                              priority={p}
                              rank={idx + 1}
                              teamMembers={teamMembers || []}
                              linkedTasks={flatAllTasks.filter(t => (t as any).priority_id === p.id)}
                              unlinkableTasks={flatAllTasks.filter(t => !(t as any).priority_id && !t.completed)}
                              showArrows={canEditPriorities}
                              isFirst={idx === 0}
                              isLast={idx === localPriorities.length - 1}
                              onMoveUp={() => {
                                const reordered = [...localPriorities];
                                [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
                                setLocalPriorities(reordered);
                                reorderPriorities.mutate(reordered.map((r) => r.id));
                              }}
                              onMoveDown={() => {
                                const reordered = [...localPriorities];
                                [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
                                setLocalPriorities(reordered);
                                reorderPriorities.mutate(reordered.map((r) => r.id));
                              }}
                              onUpdate={(data) => updatePriority.mutate(data)}
                              onDelete={(id) => deletePriority.mutate(id)}
                              onToggleTaskComplete={(d) => updateTask.mutate(d)}
                              onUnlinkTask={(id) => updateTask.mutate({ id, priority_id: null })}
                              onLinkTask={(id) => updateTask.mutate({ id, priority_id: p.id })}
                              onCreateTask={(title) => createTask.mutate({ title, assigned_to: p.assigned_to || undefined, priority_id: p.id })}
                            />
                        </div>
                      );
                    })}
                  </div>
                )
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="myTasks" className="space-y-3 mt-0">
            {renderGroupedTaskList(
              myTasks,
              <ListTodo className="h-10 w-10 mx-auto" />,
              "No active tasks. Create one to get started!"
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
