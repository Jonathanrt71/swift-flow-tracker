import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserPriorityOrder {
  id: string;
  user_id: string;
  priority_id: string;
  display_order: number;
}

export function useUserPriorityOrder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user_priority_order", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_priority_order")
        .select("*")
        .eq("user_id", user!.id)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as UserPriorityOrder[];
    },
  });

  const reorder = useMutation({
    mutationFn: async (orderedPriorityIds: string[]) => {
      // Delete all existing entries for this user and re-insert
      await (supabase as any)
        .from("user_priority_order")
        .delete()
        .eq("user_id", user!.id);

      if (orderedPriorityIds.length === 0) return;

      const rows = orderedPriorityIds.map((priority_id, idx) => ({
        user_id: user!.id,
        priority_id,
        display_order: idx,
      }));

      const { error } = await (supabase as any)
        .from("user_priority_order")
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_priority_order"] }),
  });

  return {
    userOrder: query.data || [],
    isLoading: query.isLoading,
    reorder,
  };
}
