import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      // Admins can see all profiles; regular users see only their own.
      // For assignment we need all profiles, so this works when the user
      // can see them (admin) or we fall back gracefully.
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .order("display_name");
      if (error) throw error;
      return (data || []) as TeamMember[];
    },
  });
}
