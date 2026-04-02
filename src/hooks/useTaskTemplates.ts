import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface TaskTemplateItem {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  assignee_role: "admin" | "faculty" | "specific";
  assignee_id: string | null;
  day_offset: number;
  sort_order: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  created_by: string | null;
  created_at: string;
  operations_section_id: string | null;
  items?: TaskTemplateItem[];
}

export function useTaskTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["task-templates"] });

  const templates = useQuery<TaskTemplate[]>({
    queryKey: ["task-templates"],
    enabled: !!user,
    queryFn: async () => {
      const { data: tmpl, error: te } = await supabase
        .from("task_templates")
        .select("*")
        .order("created_at", { ascending: true });
      if (te) throw te;

      const { data: items, error: ie } = await supabase
        .from("task_template_items")
        .select("*")
        .order("sort_order", { ascending: true });
      if (ie) throw ie;

      return (tmpl || []).map((t: any) => ({
        ...t,
        items: (items || []).filter((i: any) => i.template_id === t.id),
      })) as TaskTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (data: { name: string; description?: string; category?: string; operations_section_id?: string }) => {
      const { error } = await supabase.from("task_templates").insert({
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        created_by: user!.id,
        operations_section_id: data.operations_section_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Template created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Template deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addItem = useMutation({
    mutationFn: async (data: {
      template_id: string;
      title: string;
      description?: string;
      assignee_role: "admin" | "faculty" | "specific";
      assignee_id?: string;
      day_offset: number;
      sort_order: number;
    }) => {
      const { error } = await supabase.from("task_template_items").insert({
        template_id: data.template_id,
        title: data.title,
        description: data.description || null,
        assignee_role: data.assignee_role,
        assignee_id: data.assignee_id || null,
        day_offset: data.day_offset,
        sort_order: data.sort_order,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_template_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateTemplate = useMutation({
    mutationFn: async (data: { id: string; name: string; description?: string; category?: string }) => {
      const { error } = await supabase.from("task_templates").update({
        name: data.name,
        description: data.description || null,
        category: data.category || null,
      }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Template updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateItem = useMutation({
    mutationFn: async (data: { id: string; title: string; description?: string; assignee_role: string; assignee_id?: string; day_offset: number }) => {
      const { error } = await supabase.from("task_template_items").update({
        title: data.title,
        description: data.description || null,
        assignee_role: data.assignee_role,
        assignee_id: data.assignee_id || null,
        day_offset: data.day_offset,
      }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const spawnTasks = useMutation({
    mutationFn: async ({ template, anchorDate, adminId, facultyId }: {
      template: TaskTemplate;
      anchorDate: string;
      adminId: string;
      facultyId: string | null;
    }) => {
      const anchor = new Date(anchorDate);
      const tasksToInsert = (template.items || []).map((item) => {
        const due = new Date(anchor);
        due.setDate(due.getDate() + item.day_offset);
        const assignedTo =
          item.assignee_role === "specific" && item.assignee_id
            ? item.assignee_id
            : item.assignee_role === "faculty" && facultyId
            ? facultyId
            : adminId;
        return {
          title: item.title,
          description: item.description || null,
          due_date: due.toISOString().split("T")[0],
          assigned_to: assignedTo,
          created_by: user!.id,
          parent_id: null,
          meeting_id: null,
          owed_to: null,
        };
      });
      const { error } = await supabase.from("tasks").insert(tasksToInsert);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Tasks created", description: `${vars.template.items?.length || 0} tasks spawned from "${vars.template.name}"` });
    },
    onError: (e: Error) => toast({ title: "Error spawning tasks", description: e.message, variant: "destructive" }),
  });

  return { templates, createTemplate, deleteTemplate, updateTemplate, addItem, deleteItem, updateItem, spawnTasks };
}
