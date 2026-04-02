import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface EventCategory {
  id: string;
  name: string;
  label: string;
  color: string;
  display_order: number;
  created_at: string;
}

export function useEventCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["event-categories"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("event_categories" as any)
        .select("*")
        .order("display_order", { ascending: true }) as any);
      if (error) throw error;
      return (data || []) as EventCategory[];
    },
  });

  const addCategory = useMutation({
    mutationFn: async (data: { name: string; label: string; color: string }) => {
      const current = query.data || [];
      const maxOrder = current.reduce((m, c) => Math.max(m, c.display_order), 0);
      const { error } = await (supabase.from("event_categories" as any).insert({
        name: data.name.toLowerCase().replace(/\s+/g, "_"),
        label: data.label,
        color: data.color,
        display_order: maxOrder + 1,
      } as any) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-categories"] });
      toast({ title: "Category added" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; label?: string; color?: string; display_order?: number }) => {
      const { error } = await (supabase
        .from("event_categories" as any)
        .update(data as any)
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-categories"] });
      toast({ title: "Category updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("event_categories" as any)
        .delete()
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-categories"] });
      toast({ title: "Category deleted" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Build lookup maps for backward compatibility
  const categoryLabels: Record<string, string> = {};
  const categoryColors: Record<string, string> = {};
  (query.data || []).forEach((c) => {
    categoryLabels[c.name] = c.label;
    categoryColors[c.name] = c.color;
  });

  return {
    categories: query.data || [],
    isLoading: query.isLoading,
    categoryLabels,
    categoryColors,
    addCategory,
    updateCategory,
    deleteCategory,
  };
}
