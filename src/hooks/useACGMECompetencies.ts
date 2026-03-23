import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ACGMEMilestone {
  id: string;
  level: number;
  description: string;
  summary: string | null;
}

export interface ACGMESubcategory {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  milestones: ACGMEMilestone[];
}

export interface ACGMECategory {
  id: string;
  code: string;
  name: string;
  color: string;
  sort_order: number;
  subcategories: ACGMESubcategory[];
}

export function useACGMECompetencies() {
  return useQuery({
    queryKey: ["acgme-competencies"],
    queryFn: async () => {
      const [cats, subs, miles] = await Promise.all([
        (supabase as any).from("competency_categories_acgme").select("*").order("sort_order"),
        (supabase as any).from("competency_subcategories_acgme").select("*").order("sort_order"),
        (supabase as any).from("competency_milestones_acgme").select("*").order("level"),
      ]);

      const milestoneMap = new Map<string, ACGMEMilestone[]>();
      (miles.data || []).forEach((m: any) => {
        const arr = milestoneMap.get(m.subcategory_id) || [];
        arr.push({ id: m.id, level: m.level, description: m.description, summary: m.summary ?? null });
        milestoneMap.set(m.subcategory_id, arr);
      });

      const subMap = new Map<string, ACGMESubcategory[]>();
      (subs.data || []).forEach((s: any) => {
        const arr = subMap.get(s.category_id) || [];
        arr.push({
          id: s.id, code: s.code, name: s.name, sort_order: s.sort_order,
          milestones: milestoneMap.get(s.id) || [],
        });
        subMap.set(s.category_id, arr);
      });

      return (cats.data || []).map((c: any) => ({
        id: c.id, code: c.code, name: c.name, color: c.color, sort_order: c.sort_order,
        subcategories: subMap.get(c.id) || [],
      })) as ACGMECategory[];
    },
  });
}
