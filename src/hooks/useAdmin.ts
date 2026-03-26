import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type UserRole = "admin" | "faculty" | "resident";

export interface ManagedUser {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  graduation_year: number | null;
  role: UserRole;
  created_at: string;
}

export function useAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isAdmin = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      return !!data;
    },
  });

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: !!isAdmin.data,
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, email, created_at, graduation_year");
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;

      const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));

      return (profiles || []).map((p) => ({
        id: p.id,
        email: p.email || "",
        display_name: p.display_name,
        first_name: p.first_name,
        last_name: p.last_name,
        graduation_year: p.graduation_year ?? null,
        role: (roleMap.get(p.id) || "resident") as UserRole,
        created_at: p.created_at,
      })) as ManagedUser[];
    },
  });

  const inviteUser = useMutation({
    mutationFn: async (data: { email: string; password: string; display_name?: string; first_name?: string; last_name?: string; role?: UserRole; graduation_year?: number }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-invite-user", {
        body: { email: data.email, password: data.password, display_name: data.display_name },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message || "Failed to invite user");
      if (res.data?.error) throw new Error(res.data.error);

      // Update first/last name and email on the new profile
      if (res.data?.user?.id) {
        const displayName = (data.first_name && data.last_name)
          ? `${data.first_name} ${data.last_name}`
          : data.display_name || data.email;
        await supabase.from("profiles").update({
          display_name: displayName,
          email: data.email,
          first_name: data.first_name || null,
          last_name: data.last_name || null,
          graduation_year: data.graduation_year ?? null,
        }).eq("id", res.data.user.id);

        // Set role
        if (data.role) {
          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("id")
            .eq("user_id", res.data.user.id)
            .maybeSingle();
          if (existingRole) {
            await supabase.from("user_roles").update({ role: data.role }).eq("user_id", res.data.user.id);
          } else {
            await supabase.from("user_roles").insert({ user_id: res.data.user.id, role: data.role });
          }
        }
      }

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User created", description: "The user account has been created successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to invite", description: err.message, variant: "destructive" });
    },
  });

  const updateRole = useMutation({
    mutationFn: async (data: { user_id: string; role: UserRole }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-update-role", {
        body: data,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message || "Failed to update role");
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      // Small delay to ensure the edge function's DB write has propagated
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        queryClient.invalidateQueries({ queryKey: ["team-members"] });
      }, 500);
      toast({ title: "Role updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update role", description: err.message, variant: "destructive" });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (user_id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message || "Failed to delete user");
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User removed", description: "The user has been deleted." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to remove user", description: err.message, variant: "destructive" });
    },
  });

  const updateUser = useMutation({
    mutationFn: async (data: { user_id: string; email?: string; password?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-update-user", {
        body: data,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message || "Failed to update user");
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update user", description: err.message, variant: "destructive" });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: { id: string; display_name?: string; first_name?: string; last_name?: string; graduation_year?: number | null; email?: string }) => {
      const { id, ...fields } = data;
      const { error } = await supabase.from("profiles").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({ title: "Profile updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update profile", description: err.message, variant: "destructive" });
    },
  });

  return { isAdmin: isAdmin.data, isAdminLoading: isAdmin.isLoading, users, inviteUser, updateUser, updateRole, updateProfile, deleteUser };
}
