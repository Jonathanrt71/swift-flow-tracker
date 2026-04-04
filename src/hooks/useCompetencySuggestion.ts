import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MilestoneSuggestion {
  subcategoryCode: string;
  level: number;
  reason: string;
}

export interface EvalDomainSuggestion {
  domain: string;
  rating: string;
}

// Keep backward compat alias
export type CompetencySuggestion = MilestoneSuggestion;

export function useCompetencySuggestion() {
  const [suggestions, setSuggestions] = useState<MilestoneSuggestion[]>([]);
  const [evalDomains, setEvalDomains] = useState<EvalDomainSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const suggest = async (
    comment: string,
    sentiment?: "positive" | "negative",
    pgyLevel?: number,
    competencyData?: any[],
    currentLevels?: Record<string, number>,
  ) => {
    if (!comment || comment.trim().length < 10) {
      setSuggestions([]);
      setEvalDomains([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-competency", {
        body: { comment, sentiment, currentLevels },
      });

      if (error) throw error;

      let milestones: MilestoneSuggestion[] = [];
      if (data?.milestones && Array.isArray(data.milestones)) {
        milestones = data.milestones.slice(0, 2);
      }

      let domains: EvalDomainSuggestion[] = [];
      if (data?.evalDomains && Array.isArray(data.evalDomains)) {
        domains = data.evalDomains.slice(0, 4);
      }

      // Hard-clamp AI suggestions to PGY max level
      if (pgyLevel && milestones.length > 0) {
        try {
          const { data: settingsData } = await (supabase as any)
            .from("app_settings")
            .select("key, value")
            .eq("key", `pgy_max_level_${pgyLevel}`)
            .single();

          if (settingsData?.value) {
            const maxLevel = parseInt(settingsData.value, 10);
            if (!isNaN(maxLevel)) {
              milestones = milestones.map((s) => ({
                ...s,
                level: Math.min(s.level, maxLevel),
              }));
            }
          }
        } catch {
          // Settings not found — skip clamping
        }
      }

      setSuggestions(milestones);
      setEvalDomains(domains);
    } catch (err) {
      console.error("Competency suggestion error:", err);
      setSuggestions([]);
      setEvalDomains([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setEvalDomains([]);
  };

  return { suggestions, evalDomains, loading, suggest, clearSuggestions };
}
