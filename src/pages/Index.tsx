import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { LogOut, CheckCircle2, ListTodo, Shield, User, Star, UserCheck, Users } from "lucide-react";
import TaskCard from "@/components/tasks/TaskCard";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import NotificationBell from "@/components/NotificationBell";
import type { Task } from "@/hooks/useTasks";
import { useToast } from "@/components/ui/use-toast";

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

  // Default sort: starred first, then due date (soonest first, no date last)
  const sortByDueDate = (a: Task, b: Task) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  };

  const sortedActive = [...activeTasks].sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    return sortByDueDate(a, b);
  });

  const sortedByAssignee = [...activeTasks].sort((a, b) => {
    if (a.assigned_to && !b.assigned_to) return -1;
    if (!a.assigned_to && b.assigned_to) return 1;
    if (a.assigned_to && b.assigned_to && a.assigned_to !== b.assigned_to) {
      return a.assigned_to.localeCompare(b.assigned_to);
    }
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

  const [activeTab, setActiveTab] = useState("active");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20">
        <header className="bg-[hsl(33,22%,88%)]">
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

        <div className="bg-[hsl(33,22%,88%)]">
          <div className="container max-w-2xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-1 p-1 bg-[hsl(33,18%,84%)] rounded-md">
                {[
                  { value: "active", icon: <ListTodo className="h-4 w-4" />, title: "All Tasks" },
                  { value: "byAssignee", icon: <Users className="h-4 w-4" />, title: "By Assignee" },
                  { value: "assigned", icon: <UserCheck className="h-4 w-4" />, title: "Assigned to Me" },
                  { value: "starred", icon: <Star className="h-4 w-4" />, title: "Starred" },
                  { value: "completed", icon: <CheckCircle2 className="h-4 w-4" />, title: "Done" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    title={tab.title}
                    className={cn(
                      "h-8 w-8 p-0 flex items-center justify-center rounded-sm transition-colors border-none cursor-pointer",
                      activeTab === tab.value
                        ? "bg-background text-foreground shadow-sm"
                        : "bg-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.icon}
                  </button>
                ))}
              </div>
              <CreateTaskDialog
                onSubmit={(data) => createTask.mutate(data)}
                loading={createTask.isPending}
                inlineIcon
              />
            </div>
          </div>
        </div>
      </div>

      <main className="container max-w-2xl px-4 py-4 flex-1">
        {activeTab === "active" && (
          <div className="space-y-3">
            {renderTaskList(
              sortedActive,
              <ListTodo className="h-10 w-10 mx-auto" />,
              "No active tasks. Create one to get started!"
            )}
          </div>
        )}

        {activeTab === "byAssignee" && (
          <div className="space-y-3">
            {renderTaskList(
              sortedByAssignee,
              <Users className="h-10 w-10 mx-auto" />,
              "No active tasks."
            )}
          </div>
        )}

        {activeTab === "assigned" && (
          <div className="space-y-3">
            {renderTaskList(
              assignedToMe,
              <UserCheck className="h-10 w-10 mx-auto" />,
              "No tasks assigned to you."
            )}
          </div>
        )}

        {activeTab === "starred" && (
          <div className="space-y-3">
            {renderTaskList(
              starredTasks,
              <Star className="h-10 w-10 mx-auto" />,
              "No starred tasks."
            )}
          </div>
        )}

        {activeTab === "completed" && (
          <div className="space-y-3">
            {renderTaskList(
              completedTasks,
              <CheckCircle2 className="h-10 w-10 mx-auto" />,
              "No completed tasks yet."
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
