import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "./useAdmin";

interface UserRoleRow {
  role: UserRole;
  can_edit_handbook: boolean;
  can_edit_operations: boolean;
}

export function useUserRole() {
  const { session, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["user-role", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return { role: "resident" as UserRole, can_edit_handbook: false, can_edit_operations: false };

      const { data } = await (supabase
        .from("user_roles")
        .select("role, can_edit_handbook, can_edit_operations")
        .eq("user_id", session.user.id)
        .single() as any);

      return {
        role: (data?.role || "resident") as UserRole,
        can_edit_handbook: data?.can_edit_handbook ?? false,
        can_edit_operations: data?.can_edit_operations ?? false,
      } as UserRoleRow;
    },
    enabled: !authLoading && !!session?.user?.id,
  });

  const isLoading = authLoading || query.isLoading;
  const role = query.data?.role || "resident";
  const canEditHandbook = role === "admin" || (query.data?.can_edit_handbook ?? false);
  const canEditOperations = role === "admin" || (query.data?.can_edit_operations ?? false);

  return {
    role,
    isLoading,
    isAdmin: role === "admin",
    isFaculty: role === "faculty" || role === "admin",
    isResident: role === "resident",
    canEditHandbook,
    canEditOperations,
  };
}
