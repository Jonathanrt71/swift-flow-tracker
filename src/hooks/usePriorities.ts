import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCategoryUserIds } from "@/hooks/useCategoryUserIds";

export interface Priority {
  id: string;
  title: string;
  notes: string;
  assigned_to: string | null;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_name?: string;
}

export function usePriorities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { categoryUserIds, activeCategory } = useCategoryUserIds();

  const query = useQuery({
    queryKey: ["priorities", activeCategory],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("priorities" as any)
        .select("*")
        .order("display_order", { ascending: true }) as any);
      if (error) throw error;

      // Fetch assigned profile names
      const assignedIds = [...new Set((data || []).map((p: any) => p.assigned_to).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (assignedIds.length > 0) {
        const { data: profiles } = await (supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", assignedIds) as any);
        (profiles || []).forEach((p: any) => {
          profileMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email;
        });
      }

      return ((data || []) as any[])
        .filter((p: any) => p.created_by && categoryUserIds.has(p.created_by))
        .map((p: any) => ({
          ...p,
          assigned_name: p.assigned_to ? profileMap[p.assigned_to] || null : null,
        })) as Priority[];
    },
    enabled: !!user && categoryUserIds.size > 0,
  });

  const createPriority = useMutation({
    mutationFn: async (input: { title: string; notes?: string; assigned_to?: string | null }) => {
      const { data: existing } = await (supabase
        .from("priorities" as any)
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1) as any);
      const nextOrder = existing && existing.length > 0 ? (existing[0] as any).display_order + 1 : 0;
      const { error } = await (supabase
        .from("priorities" as any)
        .insert({ ...input, display_order: nextOrder, created_by: user!.id }) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["priorities"] }),
  });

  const updatePriority = useMutation({
    mutationFn: async (input: { id: string; title?: string; notes?: string; assigned_to?: string | null }) => {
      const { id, ...updates } = input;
      const { error } = await (supabase
        .from("priorities" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["priorities"] }),
  });

  const deletePriority = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("priorities" as any)
        .delete()
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["priorities"] }),
  });

  const reorderPriorities = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        (supabase
          .from("priorities" as any)
          .update({ display_order: index, updated_at: new Date().toISOString() })
          .eq("id", id) as any)
      );
      await Promise.all(updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["priorities"] }),
  });

  return {
    priorities: query.data || [],
    isLoading: query.isLoading,
    createPriority,
    updatePriority,
    deletePriority,
    reorderPriorities,
  };
}
