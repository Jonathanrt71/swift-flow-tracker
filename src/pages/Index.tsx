import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, CheckCircle2, ListTodo, Shield, User, Star, UserCheck, Users, HandCoins } from "lucide-react";
import TaskCard from "@/components/tasks/TaskCard";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import NotificationBell from "@/components/NotificationBell";
import BottomNav from "@/components/BottomNav";
import type { Task } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { data: teamMembers } = useTeamMembers();
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

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks
    .filter((t) => t.completed)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

  // Default sort: due date (soonest first, no date last)
  const sortByDueDate = (a: Task, b: Task) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  };

  // Helper to check if task or any subtask is assigned to current user
  const isAssignedToMe = (t: Task): boolean =>
    t.assigned_to === user?.id || (t.subtasks?.some(isAssignedToMe) ?? false);

  // Helper to check if task or any subtask is owed to current user
  const isOwedToMe = (t: Task): boolean =>
    t.owed_to === user?.id || (t.subtasks?.some(isOwedToMe) ?? false);

  const assignedToMe = activeTasks.filter(isAssignedToMe).sort(sortByDueDate);
  const owedToMe = activeTasks.filter(isOwedToMe).sort(sortByDueDate);
  const starredTasks = activeTasks.filter((t) => t.starred).sort(sortByDueDate);

  const sortedActive = [...activeTasks].sort(sortByDueDate);

  const sortedByAssignee = [...activeTasks].sort((a, b) => {
    const nameA = teamMembers?.find((m) => m.id === (a.assigned_to || a.created_by))?.display_name || "";
    const nameB = teamMembers?.find((m) => m.id === (b.assigned_to || b.created_by))?.display_name || "";
    const nameCmp = nameA.localeCompare(nameB);
    if (nameCmp !== 0) return nameCmp;
    // Same assignee: starred first, then by due date
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    return sortByDueDate(a, b);
  });

  const isOverdue = (task: { due_date: string | null; completed: boolean }) =>
    !task.completed && !!task.due_date && new Date(task.due_date) < now;

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
        onToggleComplete={(d) => toggleComplete.mutate(d)}
        onUpdate={(d) => updateTask.mutate(d)}
        onDelete={(id) => deleteTask.mutate(id)}
        onCreateSubtask={(d) => createTask.mutate(d)}
        onToggleStar={(d) => toggleStar.mutate(d)}
      />
    ));
  };

  const getDueBucket = (task: Task): number => {
    if (!task.due_date) return 3;
    const days = Math.ceil(
      (new Date(task.due_date).getTime() - now.getTime()) / 86400000
    );
    if (days <= 7) return 0; // overdue and this week
    if (days <= 30) return 1;
    return 2;
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
    let prevBucket = -1;

    taskList.forEach((task) => {
      const bucket = getDueBucket(task);
      if (prevBucket !== -1 && bucket !== prevBucket && bucket >= 1 && bucket <= 3) {
        elements.push(
          <div key={`sep-${task.id}`} className="py-1">
            <div className="h-px bg-border" />
          </div>
        );
      }
      prevBucket = bucket;
      elements.push(
        <TaskCard
          key={task.id}
          task={task}
          isOverdue={isOverdue(task)}
          teamMembers={teamMembers || []}
          onToggleComplete={(d) => toggleComplete.mutate(d)}
          onUpdate={(d) => updateTask.mutate(d)}
          onDelete={(id) => deleteTask.mutate(id)}
          onCreateSubtask={(d) => createTask.mutate(d)}
          onToggleStar={(d) => toggleStar.mutate(d)}
        />
      );
    });

    return elements;
  };

  const renderByAssigneeList = (taskList: Task[], emptyIcon: React.ReactNode, emptyText: string) => {
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
    let prevAssignee = "";

    taskList.forEach((task) => {
      const assigneeId = task.assigned_to || task.created_by;
      const assigneeName = teamMembers?.find((m) => m.id === assigneeId)?.display_name || assigneeId || "";
      if (prevAssignee && assigneeName !== prevAssignee) {
        elements.push(
          <div key={`sep-assignee-${task.id}`} className="py-1">
            <div className="h-px bg-border" />
          </div>
        );
      }
      prevAssignee = assigneeName;
      elements.push(
        <TaskCard
          key={task.id}
          task={task}
          isOverdue={isOverdue(task)}
          teamMembers={teamMembers || []}
          onToggleComplete={(d) => toggleComplete.mutate(d)}
          onUpdate={(d) => updateTask.mutate(d)}
          onDelete={(id) => deleteTask.mutate(id)}
          onCreateSubtask={(d) => createTask.mutate(d)}
          onToggleStar={(d) => toggleStar.mutate(d)}
        />
      );
    });

    return elements;
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="bg-[hsl(33,22%,88%)]">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
          <div className="flex items-center gap-1">
            <NotificationBell />
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="icon" title="Admin Panel">
                  <Shield className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link to="/profile">
              <Button variant="ghost" size="icon" title="Profile Settings">
                <User className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl px-4 py-6">
        <Tabs defaultValue="active">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="gap-1 h-auto p-1 bg-transparent">
              <TabsTrigger value="active" className="h-8 w-8 p-0" title="All Tasks">
                <ListTodo className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="byAssignee" className="h-8 w-8 p-0" title="By Assignee">
                <Users className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="assigned" className="h-8 w-8 p-0" title="Assigned to Me">
                <UserCheck className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="owedToMe" className="h-8 w-8 p-0" title="Owed to Me">
                <HandCoins className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="starred" className="h-8 w-8 p-0" title="Starred">
                <Star className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="completed" className="h-8 w-8 p-0" title="Done">
                <CheckCircle2 className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
            <CreateTaskDialog
              onSubmit={(data) => createTask.mutate(data)}
              loading={createTask.isPending}
              inlineIcon
            />
          </div>

          <TabsContent value="active" className="space-y-3 mt-0">
            {renderGroupedTaskList(
              sortedActive,
              <ListTodo className="h-10 w-10 mx-auto" />,
              "No active tasks. Create one to get started!"
            )}
          </TabsContent>

          <TabsContent value="byAssignee" className="space-y-3 mt-0">
            {renderByAssigneeList(
              sortedByAssignee,
              <Users className="h-10 w-10 mx-auto" />,
              "No active tasks."
            )}
          </TabsContent>

          <TabsContent value="assigned" className="space-y-3 mt-0">
            {renderGroupedTaskList(
              assignedToMe,
              <UserCheck className="h-10 w-10 mx-auto" />,
              "No tasks assigned to you."
            )}
          </TabsContent>

          <TabsContent value="owedToMe" className="space-y-3 mt-0">
            {renderGroupedTaskList(
              owedToMe,
              <HandCoins className="h-10 w-10 mx-auto" />,
              "No tasks owed to you."
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
      <BottomNav />
    </div>
  );
};

export default Index;
