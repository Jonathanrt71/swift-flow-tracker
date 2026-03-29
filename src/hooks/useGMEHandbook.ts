import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GMEHandbookSection {
  id: string;
  slug: string;
  title: string;
  icon: string;
  content: string;
  display_order: number;
  role_visibility: string;
  parent_id: string | null;
  doc_type: string;
  updated_at: string;
  updated_by: string | null;
}

export function useGMEHandbook() {
  return useQuery<GMEHandbookSection[]>({
    queryKey: ["gme-handbook-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handbook_sections")
        .select("*")
        .eq("doc_type", "gme_handbook")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as GMEHandbookSection[]) || [];
    },
  });
}

export function useGMEHandbookMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["gme-handbook-sections"] });

  const updateSection = useMutation({
    mutationFn: async ({ id, title, content, userId }: { id: string; title: string; content: string; userId: string }) => {
      const { error } = await supabase
        .from("handbook_sections")
        .update({ title, content, updated_at: new Date().toISOString(), updated_by: userId } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addSection = useMutation({
    mutationFn: async ({ title, parentId, maxOrder, userId }: { title: string; parentId: string | null; maxOrder: number; userId: string }) => {
      const slug = `gme-${Date.now()}`;
      const { error } = await supabase
        .from("handbook_sections")
        .insert([{
          slug,
          title,
          icon: parentId ? "file-text" : "shield",
          content: "",
          display_order: maxOrder + 10,
          role_visibility: "all",
          doc_type: "gme_handbook",
          parent_id: parentId,
          updated_by: userId,
        }] as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("handbook_sections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { updateSection, addSection, deleteSection };
}
