import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CompetencySuggestion {
  subcategoryCode: string;
  level: number;
  reason: string;
}

export function useCompetencySuggestion() {
  const [suggestions, setSuggestions] = useState<CompetencySuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const suggest = async (comment: string) => {
    if (!comment || comment.trim().length < 10) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-competency", {
        body: { comment },
      });

      if (error) throw error;

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions.slice(0, 3));
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Competency suggestion error:", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, loading, suggest, clearSuggestions };
}
