import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PGY_KEYS = ["pgy_max_level_1", "pgy_max_level_2", "pgy_max_level_3", "pgy_max_level_4"];

const DEFAULTS: Record<number, number> = { 1: 2, 2: 3, 3: 4, 4: 5 };

export function usePgyMaxLevels() {
  return useQuery({
    queryKey: ["pgy-max-levels"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .select("key, value")
        .in("key", PGY_KEYS);
      if (error) throw error;

      const levels = { ...DEFAULTS };
      (data || []).forEach((row: any) => {
        const match = row.key.match(/pgy_max_level_(\d)/);
        if (match) levels[parseInt(match[1], 10)] = parseInt(row.value, 10);
      });
      return levels;
    },
    staleTime: 60_000,
  });
}

export function getMaxLevelForPgy(
  pgyLevel: number | undefined | null,
  levels: Record<number, number> | undefined,
): number | null {
  if (!pgyLevel || !levels) return null;
  return levels[pgyLevel] ?? null;
}
