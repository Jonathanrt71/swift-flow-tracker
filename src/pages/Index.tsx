import { useState } from "react";
import { Link } from "react-router-dom";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, CheckCircle2, ListTodo, Shield } from "lucide-react";
import TaskCard from "@/components/tasks/TaskCard";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";

const Index = () => {
  const { user, signOut } = useAuth();
  const {
    tasks,
    isLoading,
    createTask,
    updateTask,
    toggleComplete,
    deleteTask,
    createMilestone,
    toggleMilestone,
    deleteMilestone,
  } = useTasks();

  const now = new Date();

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks
    .filter((t) => t.completed)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

  // Overdue tasks pinned to the top
  const overdueTasks = activeTasks.filter(
    (t) => t.due_date && new Date(t.due_date) < now
  );
  const upcomingTasks = activeTasks.filter(
    (t) => !t.due_date || new Date(t.due_date) >= now
  );
  const sortedActive = [...overdueTasks, ...upcomingTasks];

  const isOverdue = (task: { due_date: string | null; completed: boolean }) =>
    !task.completed && !!task.due_date && new Date(task.due_date) < now;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl px-4 py-6">
        <Tabs defaultValue="active">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="active" className="gap-1.5">
                <ListTodo className="h-4 w-4" />
                Active
                {activeTasks.length > 0 && (
                  <span className="ml-1 text-xs bg-muted rounded-full px-1.5">
                    {activeTasks.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Completed
                {completedTasks.length > 0 && (
                  <span className="ml-1 text-xs bg-muted rounded-full px-1.5">
                    {completedTasks.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <CreateTaskDialog
              onSubmit={(data) => createTask.mutate(data)}
              loading={createTask.isPending}
            />
          </div>

          <TabsContent value="active" className="space-y-3 mt-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : sortedActive.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ListTodo className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No active tasks. Create one to get started!</p>
              </div>
            ) : (
              sortedActive.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isOverdue={isOverdue(task)}
                  onToggleComplete={(d) => toggleComplete.mutate(d)}
                  onUpdate={(d) => updateTask.mutate(d)}
                  onDelete={(id) => deleteTask.mutate(id)}
                  onCreateSubtask={(d) => createTask.mutate(d)}
                  onCreateMilestone={(d) => createMilestone.mutate(d)}
                  onToggleMilestone={(d) => toggleMilestone.mutate(d)}
                  onDeleteMilestone={(id) => deleteMilestone.mutate(id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3 mt-0">
            {completedTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No completed tasks yet.</p>
              </div>
            ) : (
              completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isOverdue={false}
                  onToggleComplete={(d) => toggleComplete.mutate(d)}
                  onUpdate={(d) => updateTask.mutate(d)}
                  onDelete={(id) => deleteTask.mutate(id)}
                  onCreateSubtask={(d) => createTask.mutate(d)}
                  onCreateMilestone={(d) => createMilestone.mutate(d)}
                  onToggleMilestone={(d) => toggleMilestone.mutate(d)}
                  onDeleteMilestone={(id) => deleteMilestone.mutate(id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
