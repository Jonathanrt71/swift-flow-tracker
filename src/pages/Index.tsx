import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, CheckCircle2, ListTodo, Shield, User, Star, UserCheck, Users } from "lucide-react";
import TaskCard from "@/components/tasks/TaskCard";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import NotificationBell from "@/components/NotificationBell";
import type { Task } from "@/hooks/useTasks";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const [sortByAssignee, setSortByAssignee] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
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

  // Helper to check if task or any subtask is assigned to current user
  const isAssignedToMe = (t: Task): boolean =>
    t.assigned_to === user?.id || (t.subtasks?.some(isAssignedToMe) ?? false);

  const assignedToMe = activeTasks.filter(isAssignedToMe);
  const starredTasks = activeTasks.filter((t) => t.starred);

  // Default sort: starred first, then due date (soonest first, no date last)
  const sortByDueDate = (a: Task, b: Task) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  };

  const sortedActive = [...activeTasks].sort((a, b) => {
    if (sortByAssignee) {
      // Sort by assignee (assigned first, then alphabetically by id), then due date
      if (a.assigned_to && !b.assigned_to) return -1;
      if (!a.assigned_to && b.assigned_to) return 1;
      if (a.assigned_to && b.assigned_to && a.assigned_to !== b.assigned_to) {
        return a.assigned_to.localeCompare(b.assigned_to);
      }
      return sortByDueDate(a, b);
    }
    // Default: starred first, then due date
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
        onToggleComplete={(d) => toggleComplete.mutate(d)}
        onUpdate={(d) => updateTask.mutate(d)}
        onDelete={(id) => deleteTask.mutate(id)}
        onCreateSubtask={(d) => createTask.mutate(d)}
        onToggleStar={(d) => toggleStar.mutate(d)}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[hsl(0,0%,96%)] border-b border-border">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground hidden sm:inline mr-2">
              {user?.email}
            </span>
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
            <TabsList className="gap-1 h-auto p-1 bg-muted">
              <TabsTrigger value="active" className="h-8 w-8 p-0" title="All Tasks">
                <ListTodo className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="assigned" className="h-8 w-8 p-0" title="Assigned to Me">
                <UserCheck className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="starred" className="h-8 w-8 p-0" title="Starred">
                <Star className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="completed" className="h-8 w-8 p-0" title="Done">
                <CheckCircle2 className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-1">
              <div className="bg-muted rounded-lg p-1">
                <CreateTaskDialog
                  onSubmit={(data) => createTask.mutate(data)}
                  loading={createTask.isPending}
                  inlineIcon
                />
              </div>
            </div>
          </div>

          <TabsContent value="active" className="space-y-3 mt-0">
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7",
                      sortByAssignee && "bg-accent text-accent-foreground"
                    )}
                    title="Sort options"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setSortByAssignee(false)}
                    className={cn(!sortByAssignee && "bg-accent")}
                  >
                    <Star className="h-3.5 w-3.5 mr-2" />
                    Priority then due date
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortByAssignee(true)}
                    className={cn(sortByAssignee && "bg-accent")}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-2" />
                    Assignee then due date
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {renderTaskList(
              sortedActive,
              <ListTodo className="h-10 w-10 mx-auto" />,
              "No active tasks. Create one to get started!"
            )}
          </TabsContent>

          <TabsContent value="assigned" className="space-y-3 mt-0">
            {renderTaskList(
              assignedToMe,
              <UserCheck className="h-10 w-10 mx-auto" />,
              "No tasks assigned to you."
            )}
          </TabsContent>

          <TabsContent value="starred" className="space-y-3 mt-0">
            {renderTaskList(
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
