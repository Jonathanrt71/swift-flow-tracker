import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

export type AccessLevel = "full" | "view" | "none";

export interface PermissionRow {
  role: string;
  permission_key: string;
  access_level: AccessLevel;
}

/**
 * Returns permission checks for the current user's role.
 * Admin always gets 'full' regardless of what's in the table.
 */
export function usePermissions() {
  const { role, isLoading: roleLoading } = useUserRole();

  const query = useQuery<PermissionRow[]>({
    queryKey: ["role-permissions", role],
    enabled: !roleLoading && !!role,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("role_permissions")
        .select("role, permission_key, access_level")
        .eq("role", role) as any);
      if (error) throw error;
      return (data || []) as PermissionRow[];
    },
  });

  const permMap = new Map<string, AccessLevel>();
  (query.data || []).forEach(p => permMap.set(p.permission_key, p.access_level as AccessLevel));

  /** Check if user has at least the given access level for a permission key */
  const has = (key: string, minLevel: AccessLevel = "full"): boolean => {
    // Admin override — always full access
    if (role === "admin") return true;
    const level = permMap.get(key) || "none";
    if (minLevel === "none") return true;
    if (minLevel === "view") return level === "view" || level === "full";
    return level === "full";
  };

  /** Get raw access level for a permission key */
  const get = (key: string): AccessLevel => {
    if (role === "admin") return "full";
    return permMap.get(key) || "none";
  };

  return {
    has,
    get,
    isLoading: roleLoading || query.isLoading,
    permissions: query.data || [],
  };
}

/**
 * Returns ALL role permissions (for the admin grid).
 * Used by the Role Access section in Admin page.
 */
export function useAllPermissions() {
  const queryClient = useQueryClient();

  const query = useQuery<PermissionRow[]>({
    queryKey: ["all-role-permissions"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("role_permissions")
        .select("role, permission_key, access_level")
        .order("permission_key") as any);
      if (error) throw error;
      return (data || []) as PermissionRow[];
    },
  });

  const updatePermission = useMutation({
    mutationFn: async ({ role, permission_key, access_level }: PermissionRow) => {
      const { error } = await (supabase
        .from("role_permissions")
        .update({ access_level, updated_at: new Date().toISOString() } as any)
        .eq("role", role)
        .eq("permission_key", permission_key) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-role-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
    },
  });

  // Build a lookup: permMap[role][key] = access_level
  const permMap: Record<string, Record<string, AccessLevel>> = {};
  (query.data || []).forEach(p => {
    if (!permMap[p.role]) permMap[p.role] = {};
    permMap[p.role][p.permission_key] = p.access_level as AccessLevel;
  });

  const getLevel = (role: string, key: string): AccessLevel => {
    return permMap[role]?.[key] || "none";
  };

  const cycleLevel = (current: AccessLevel): AccessLevel => {
    if (current === "none") return "view";
    if (current === "view") return "full";
    return "none";
  };

  return {
    permissions: query.data || [],
    permMap,
    getLevel,
    cycleLevel,
    updatePermission,
    isLoading: query.isLoading,
  };
}
