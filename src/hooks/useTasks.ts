import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/hooks/useNotifications";
import { useCategoryUserIds } from "@/hooks/useCategoryUserIds";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  parent_id: string | null;
  created_by: string;
  assigned_to: string | null;
  owed_to: string | null;
  meeting_id: string | null;
  starred: boolean;
  priority_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  subtasks?: Task[];
}

function buildTree(allTasks: any[]): Task[] {
  const taskMap = new Map<string, Task>();
  allTasks.forEach((t) => {
    taskMap.set(t.id, { ...t, subtasks: [] });
  });
  const roots: Task[] = [];
  allTasks.forEach((t) => {
    const node = taskMap.get(t.id)!;
    if (t.parent_id && taskMap.has(t.parent_id)) {
      taskMap.get(t.parent_id)!.subtasks!.push(node);
    } else if (!t.parent_id) {
      roots.push(node);
    }
  });
  return roots;
}

export function useTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categoryUserIds, activeCategory } = useCategoryUserIds();

  const tasksQuery = useQuery({
    queryKey: ["tasks", activeCategory],
    queryFn: async () => {
      const { data: allTasks, error } = await supabase
        .from("tasks")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      const filtered = (allTasks || []).filter((t: any) => categoryUserIds.has(t.created_by));
      return buildTree(filtered);
    },
    enabled: !!user && categoryUserIds.size > 0,
  });

  const createTask = useMutation({
    mutationFn: async (data: { title: string; description?: string; due_date?: string; parent_id?: string; assigned_to?: string; owed_to?: string; meeting_id?: string }) => {
      const { error } = await supabase.from("tasks").insert({
        title: data.title,
        description: data.description || null,
        due_date: data.due_date || null,
        parent_id: data.parent_id || null,
        assigned_to: data.assigned_to || user!.id,
        owed_to: data.owed_to || null,
        meeting_id: data.meeting_id || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; description?: string; due_date?: string | null; assigned_to?: string | null; owed_to?: string | null; priority_id?: string | null }) => {
      // Check if assignment changed to notify
      if (data.assigned_to && data.assigned_to !== user?.id) {
        const taskTitle = data.title || "a task";
        createNotification({
          user_id: data.assigned_to,
          type: "assignment",
          title: "Task assigned to you",
          message: `You have been assigned "${taskTitle}"`,
          task_id: id,
        });
      }
      const { error } = await supabase.from("tasks").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ completed, completed_at: completed ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleStar = useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ starred })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading,
    createTask,
    updateTask,
    toggleComplete,
    toggleStar,
    deleteTask,
  };
}
