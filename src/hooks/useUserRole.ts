import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "./useAdmin";

export function useUserRole() {
  const { session, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["user-role", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return "resident" as UserRole;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      return (data?.role || "resident") as UserRole;
    },
    enabled: !authLoading && !!session?.user?.id,
  });

  const isLoading = authLoading || query.isLoading;
  const role = query.data || "resident";

  return {
    role,
    isLoading,
    isAdmin: role === "admin",
    isFaculty: role === "faculty" || role === "admin",
    isResident: role === "resident",
  };
}
