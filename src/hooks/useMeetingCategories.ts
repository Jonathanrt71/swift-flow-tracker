import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface MeetingCategory {
  id: string;
  name: string;
  created_at: string;
}

export function useMeetingCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const categories = useQuery<MeetingCategory[]>({
    queryKey: ["meeting-categories"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("meeting_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []) as MeetingCategory[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await (supabase as any)
        .from("meeting_categories")
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return data as MeetingCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-categories"] });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { categories, createCategory };
}
