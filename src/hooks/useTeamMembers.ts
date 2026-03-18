import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPersonName } from "@/lib/dateFormat";

export interface TeamMember {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, avatar_url");
      if (error) throw error;

      return ((data || []) as TeamMember[])
        .map((member) => ({
          ...member,
          display_name: formatPersonName(member),
        }))
        .sort((a, b) => formatPersonName(a).localeCompare(formatPersonName(b)));
    },
  });
}
