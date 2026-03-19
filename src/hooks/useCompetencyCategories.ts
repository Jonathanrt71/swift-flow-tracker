import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CompetencyCategory {
  id: string;
  name: string;
  created_at: string;
}

export function useCompetencyCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const categories = useQuery({
    queryKey: ["competency_categories"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competency_categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as CompetencyCategory[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("competency_categories")
        .insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competency_categories"] });
      toast({ title: "Category created" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("competency_categories")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competency_categories"] });
      queryClient.invalidateQueries({ queryKey: ["competencies"] });
      toast({ title: "Category updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      // Unlink competencies first (set category_id to null)
      await supabase.from("competencies").update({ category_id: null }).eq("category_id", id);
      const { error } = await supabase.from("competency_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competency_categories"] });
      queryClient.invalidateQueries({ queryKey: ["competencies"] });
      toast({ title: "Category deleted" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { categories, createCategory, updateCategory, deleteCategory };
}
