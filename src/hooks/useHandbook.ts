import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HandbookSection {
  id: string;
  slug: string;
  title: string;
  icon: string;
  content: string;
  display_order: number;
  role_visibility: string;
  parent_id: string | null;
  doc_type: string | null;
  updated_at: string;
  updated_by: string | null;
}

export function useHandbook() {
  return useQuery<HandbookSection[]>({
    queryKey: ["handbook-sections"],
    queryFn: async () => {
      // Fetch only handbook sections (doc_type is null for legacy rows, or 'handbook')
      const { data, error } = await supabase
        .from("handbook_sections")
        .select("*")
        .or("doc_type.is.null,doc_type.eq.handbook")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as HandbookSection[]) || [];
    },
  });
}
