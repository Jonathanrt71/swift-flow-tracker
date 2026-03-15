import { useState } from "react";
import { Link } from "react-router-dom";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, CheckCircle2, ListTodo, Shield, User, Star, UserCheck } from "lucide-react";
import TaskCard from "@/components/tasks/TaskCard";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import NotificationBell from "@/components/NotificationBell";
import type { Task } from "@/hooks/useTasks";

const Index = () => {
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

  const overdueTasks = activeTasks.filter(
    (t) => t.due_date && new Date(t.due_date) < now
  );
  const upcomingTasks = activeTasks.filter(
    (t) => !t.due_date || new Date(t.due_date) >= now
  );
  const sortedActive = [...overdueTasks, ...upcomingTasks];

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
      <header className="bg-[hsl(40,25%,96%)]">
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
            <CreateTaskDialog
              onSubmit={(data) => createTask.mutate(data)}
              loading={createTask.isPending}
              iconOnly
            />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl px-4 py-6">
        <Tabs defaultValue="active">
          <div className="flex items-center justify-between mb-4 gap-2">
            <TabsList className="gap-1 h-auto p-1">
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
            <CreateTaskDialog
              onSubmit={(data) => createTask.mutate(data)}
              loading={createTask.isPending}
              iconOnly
            />
          </div>

          <TabsContent value="active" className="space-y-3 mt-0">
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
