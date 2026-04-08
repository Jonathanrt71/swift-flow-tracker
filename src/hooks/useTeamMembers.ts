import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPersonName } from "@/lib/dateFormat";
import { useUserCategory } from "@/contexts/UserCategoryContext";

export interface TeamMember {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
}

export function useTeamMembers() {
  const { activeCategory } = useUserCategory();

  return useQuery({
    queryKey: ["team-members", activeCategory],
    queryFn: async () => {
      const { data: profiles, error: pe } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, first_name, last_name, avatar_url, user_category")
        .eq("user_category", activeCategory);
      if (pe) throw pe;

      const { data: roles, error: re } = await (supabase as any)
        .from("user_roles")
        .select("user_id, role");
      if (re) throw re;

      const roleMap: Record<string, string> = {};
      (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

      return ((profiles || []) as TeamMember[])
        .map((member) => ({
          ...member,
          display_name: formatPersonName(member),
          role: roleMap[member.id] || "resident",
        }))
        .filter((member) => member.role !== "admin")
        .sort((a, b) => formatPersonName(a).localeCompare(formatPersonName(b)));
    },
  });
}
