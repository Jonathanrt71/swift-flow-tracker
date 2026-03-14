import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
  position: number;
  created_at: string;
  updated_at: string;
  subtasks?: Task[];
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export function useTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("*")
        .is("parent_id", null)
        .order("position", { ascending: true });
      if (error) throw error;

      const { data: subtasks, error: subError } = await supabase
        .from("tasks")
        .select("*")
        .not("parent_id", "is", null)
        .order("position", { ascending: true });
      if (subError) throw subError;

      const { data: milestones, error: mError } = await supabase
        .from("milestones")
        .select("*")
        .order("position", { ascending: true });
      if (mError) throw mError;

      const taskIds = [...(tasks || []).map(t => t.id), ...(subtasks || []).map(t => t.id)];
      const milestoneMap = new Map<string, Milestone[]>();
      (milestones || []).forEach((m) => {
        const list = milestoneMap.get(m.task_id) || [];
        list.push(m as Milestone);
        milestoneMap.set(m.task_id, list);
      });

      const subtaskMap = new Map<string, Task[]>();
      (subtasks || []).forEach((s) => {
        const st = { ...s, milestones: milestoneMap.get(s.id) || [] } as Task;
        const list = subtaskMap.get(s.parent_id!) || [];
        list.push(st);
        subtaskMap.set(s.parent_id!, list);
      });

      return (tasks || []).map((t) => ({
        ...t,
        subtasks: subtaskMap.get(t.id) || [],
        milestones: milestoneMap.get(t.id) || [],
      })) as Task[];
    },
    enabled: !!user,
  });

  const createTask = useMutation({
    mutationFn: async (data: { title: string; description?: string; due_date?: string; parent_id?: string }) => {
      const { error } = await supabase.from("tasks").insert({
        title: data.title,
        description: data.description || null,
        due_date: data.due_date || null,
        parent_id: data.parent_id || null,
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
    mutationFn: async ({ id, ...data }: { id: string; title?: string; description?: string; due_date?: string | null; assigned_to?: string | null }) => {
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

  const createMilestone = useMutation({
    mutationFn: async (data: { task_id: string; title: string }) => {
      const { error } = await supabase.from("milestones").insert(data);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMilestone = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("milestones").update({ completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading,
    createTask,
    updateTask,
    toggleComplete,
    deleteTask,
    createMilestone,
    toggleMilestone,
    deleteMilestone,
  };
}
