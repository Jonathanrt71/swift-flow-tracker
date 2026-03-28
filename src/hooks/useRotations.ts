import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Rotation {
  id: string;
  slug: string;
  name: string;
  rotation_type: "required" | "elective";
  location: string | null;
  hours: string | null;
  attire: string | null;
  duration: string | null;
  pgy_levels: string[];
  vacation_eligible: boolean;
  rotation_director: string | null;
  contact_info: string | null;
  overview: string;
  preparation: string;
  schedule_details: string;
  attendings_notes: string;
  procedures: string;
  learning_goals: string;
  emr_notes: string;
  logistics: string;
  display_order: number;
  updated_at: string;
  updated_by: string | null;
}

export function useRotations() {
  return useQuery<Rotation[]>({
    queryKey: ["rotations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rotations")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as Rotation[]) || [];
    },
  });
}
