import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Feedback {
  id: string;
  resident_id: string;
  faculty_id: string;
  comment: string;
  sentiment: "positive" | "negative";
  created_at: string;
  competency_category_id: string | null;
  competency_subcategory_id: string | null;
  competency_milestone_id: string | null;
}

export function useFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const feedbackQuery = useQuery({
    queryKey: ["feedback"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Feedback[];
    },
  });

  const createFeedback = useMutation({
    mutationFn: async (input: {
      resident_id: string;
      comment: string;
      sentiment: "positive" | "negative";
      competency_category_id?: string | null;
      competency_subcategory_id?: string | null;
      competency_milestone_id?: string | null;
    }) => {
      const { error } = await (supabase as any).from("feedback").insert({
        resident_id: input.resident_id,
        faculty_id: user!.id,
        comment: input.comment,
        sentiment: input.sentiment,
        competency_category_id: input.competency_category_id || null,
        competency_subcategory_id: input.competency_subcategory_id || null,
        competency_milestone_id: input.competency_milestone_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast({ title: "Feedback added" });
    },
    onError: () => {
      toast({ title: "Failed to add feedback", variant: "destructive" });
    },
  });

  const updateFeedback = useMutation({
    mutationFn: async (input: {
      id: string;
      resident_id?: string;
      comment?: string;
      sentiment?: "positive" | "negative";
      competency_category_id?: string | null;
      competency_subcategory_id?: string | null;
      competency_milestone_id?: string | null;
    }) => {
      const { id, ...updates } = input;
      const { error } = await (supabase as any)
        .from("feedback")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast({ title: "Feedback updated" });
    },
    onError: () => {
      toast({ title: "Failed to update feedback", variant: "destructive" });
    },
  });

  const deleteFeedback = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("feedback")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast({ title: "Feedback deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete feedback", variant: "destructive" });
    },
  });

  return { feedbackQuery, createFeedback, updateFeedback, deleteFeedback };
}
