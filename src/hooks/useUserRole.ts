import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "./useAdmin";

export function useUserRole() {
  const query = useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "resident" as UserRole;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      return (data?.role || "resident") as UserRole;
    },
  });

  const role = query.data || "resident";

  return {
    role,
    isLoading: query.isLoading,
    isAdmin: role === "admin",
    isFaculty: role === "faculty" || role === "admin",
    isResident: role === "resident",
  };
}
