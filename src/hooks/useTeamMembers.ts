import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPersonName } from "@/lib/dateFormat";

export interface TeamMember {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data: profiles, error: pe } = await (supabase as any)
        .from("profiles_public")
        .select("id, display_name, first_name, last_name, avatar_url");
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
        .sort((a, b) => formatPersonName(a).localeCompare(formatPersonName(b)));
    },
  });
}
