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

  const suggest = async (
    comment: string,
    sentiment?: "positive" | "negative",
    pgyLevel?: number,
    competencyData?: any[],
  ) => {
    if (!comment || comment.trim().length < 10) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-competency", {
        body: { comment, sentiment, pgyLevel, competencies: competencyData },
      });

      if (error) throw error;

      let results: CompetencySuggestion[] = [];
      if (data?.suggestions && Array.isArray(data.suggestions)) {
        results = data.suggestions.slice(0, 3);
      }

      // Hard-clamp AI suggestions to PGY max level
      if (pgyLevel && results.length > 0) {
        try {
          const { data: settingsData } = await (supabase as any)
            .from("app_settings")
            .select("key, value")
            .eq("key", `pgy_max_level_${pgyLevel}`)
            .single();

          if (settingsData?.value) {
            const maxLevel = parseInt(settingsData.value, 10);
            if (!isNaN(maxLevel)) {
              results = results.map((s) => ({
                ...s,
                level: Math.min(s.level, maxLevel),
              }));
            }
          }
        } catch {
          // Settings not found — skip clamping
        }
      }

      setSuggestions(results);
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
