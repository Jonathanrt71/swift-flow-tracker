import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { MilestoneSuggestion, EvalDomainSuggestion } from "@/hooks/useCompetencySuggestion";

export interface FeedbackMilestone {
  id: string;
  feedback_id: string;
  subcategory_id: string;
  level: number;
  source: "auto" | "manual";
  created_at: string;
}

export interface FeedbackEvalDomain {
  id: string;
  feedback_id: string;
  domain: string;
  rating: string;
  source: "auto" | "manual";
  created_at: string;
}

export interface Feedback {
  id: string;
  resident_id: string;
  faculty_id: string;
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
  guidance_level: "substantial" | "some" | "minimal" | null;
  created_at: string;
  competency_category_id: string | null;
  competency_subcategory_id: string | null;
  competency_milestone_id: string | null;
  feedback_milestones?: FeedbackMilestone[];
  feedback_eval_domains?: FeedbackEvalDomain[];
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
        .select("*, feedback_milestones(*), feedback_eval_domains(*)")
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
      guidance_level?: "substantial" | "some" | "minimal";
      competency_category_id?: string | null;
      competency_subcategory_id?: string | null;
      competency_milestone_id?: string | null;
    }) => {
      const { data, error } = await (supabase as any).from("feedback").insert({
        resident_id: input.resident_id,
        faculty_id: user!.id,
        comment: input.comment,
        sentiment: input.sentiment,
        guidance_level: input.guidance_level || null,
        competency_category_id: input.competency_category_id || null,
        competency_subcategory_id: input.competency_subcategory_id || null,
        competency_milestone_id: input.competency_milestone_id || null,
      }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast({ title: "Feedback added" });
    },
    onError: () => {
      toast({ title: "Failed to add feedback", variant: "destructive" });
    },
  });

  const saveAISuggestions = async (
    feedbackId: string,
    milestones: MilestoneSuggestion[],
    evalDomains: EvalDomainSuggestion[],
    subcategoryLookup: Record<string, string>, // code -> UUID
  ) => {
    try {
      // Save milestones to junction table
      if (milestones.length > 0) {
        const milestoneRows = milestones
          .filter(m => subcategoryLookup[m.subcategoryCode])
          .map(m => ({
            feedback_id: feedbackId,
            subcategory_id: subcategoryLookup[m.subcategoryCode],
            level: m.level,
            source: "auto" as const,
          }));

        if (milestoneRows.length > 0) {
          await (supabase as any).from("feedback_milestones").insert(milestoneRows);
        }
      }

      // Save eval domains
      if (evalDomains.length > 0) {
        const domainRows = evalDomains.map(d => ({
          feedback_id: feedbackId,
          domain: d.domain,
          rating: d.rating,
          source: "auto" as const,
        }));

        await (supabase as any).from("feedback_eval_domains").insert(domainRows);
      }

      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    } catch (err) {
      console.error("Failed to save AI suggestions:", err);
    }
  };

  const updateFeedback = useMutation({
    mutationFn: async (input: {
      id: string;
      resident_id?: string;
      comment?: string;
      sentiment?: "positive" | "negative" | "neutral";
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

  const updateMilestone = async (milestoneId: string, updates: { level?: number; subcategory_id?: string }) => {
    try {
      await (supabase as any)
        .from("feedback_milestones")
        .update({ ...updates, source: "manual" })
        .eq("id", milestoneId);
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    } catch (err) {
      console.error("Failed to update milestone:", err);
    }
  };

  const deleteMilestone = async (milestoneId: string) => {
    try {
      await (supabase as any)
        .from("feedback_milestones")
        .delete()
        .eq("id", milestoneId);
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    } catch (err) {
      console.error("Failed to delete milestone:", err);
    }
  };

  const updateEvalDomain = async (evalDomainId: string, updates: { rating?: string }) => {
    try {
      await (supabase as any)
        .from("feedback_eval_domains")
        .update({ ...updates, source: "manual" })
        .eq("id", evalDomainId);
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    } catch (err) {
      console.error("Failed to update eval domain:", err);
    }
  };

  const deleteEvalDomain = async (evalDomainId: string) => {
    try {
      await (supabase as any)
        .from("feedback_eval_domains")
        .delete()
        .eq("id", evalDomainId);
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    } catch (err) {
      console.error("Failed to delete eval domain:", err);
    }
  };

  return { feedbackQuery, createFeedback, updateFeedback, deleteFeedback, saveAISuggestions, updateMilestone, deleteMilestone, updateEvalDomain, deleteEvalDomain };
}
