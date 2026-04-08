import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserCategory } from "@/contexts/UserCategoryContext";

/**
 * Returns the set of user IDs belonging to the active category.
 * Used to filter data tables by creator/owner category.
 */
export function useCategoryUserIds() {
  const { activeCategory } = useUserCategory();

  const query = useQuery({
    queryKey: ["category-user-ids", activeCategory],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id")
        .eq("user_category", activeCategory);
      if (error) throw error;
      return new Set((data || []).map((p: any) => p.id as string));
    },
  });

  return { categoryUserIds: query.data || new Set<string>(), isLoaded: !!query.data, activeCategory };
}
