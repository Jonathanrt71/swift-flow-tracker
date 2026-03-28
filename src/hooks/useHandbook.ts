import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HandbookSection {
  id: string;
  slug: string;
  title: string;
  icon: string;
  content: string;
  display_order: number;
  role_visibility: string;
  parent_id: string | null;
  doc_type: string | null;
  updated_at: string;
  updated_by: string | null;
}

export function useHandbook() {
  return useQuery<HandbookSection[]>({
    queryKey: ["handbook-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handbook_sections")
        .select("*")
        .or("doc_type.is.null,doc_type.eq.handbook")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as HandbookSection[]) || [];
    },
  });
}

export function useHandbookMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["handbook-sections"] });

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
      const slug = `hb-${Date.now()}`;
      const { error } = await supabase
        .from("handbook_sections")
        .insert([{
          slug,
          title,
          icon: parentId ? "file-text" : "book-open",
          content: "",
          display_order: maxOrder + 10,
          role_visibility: "all",
          doc_type: "handbook",
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
