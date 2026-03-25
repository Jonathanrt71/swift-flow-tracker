import React, { useState, useEffect, useMemo } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { useACGMECompetencies } from "@/hooks/useACGMECompetencies";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Navigate, Link } from "react-router-dom";
import HeaderLogo from "@/components/HeaderLogo";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Shield, Pencil, Check, X, Tag, Trash2, BookOpen, RefreshCw, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMeetingTags } from "@/hooks/useMeetingTags";
import { useMeetingTagLinks } from "@/hooks/useMeetingTags";
import { useCompetencyCategories } from "@/hooks/useCompetencyCategories";
import type { UserRole, ManagedUser } from "@/hooks/useAdmin";
import { formatPersonName } from "@/lib/dateFormat";

/** Calculate PGY level from graduation year. Academic year starts July 1. */
function getPgyLevel(graduationYear: number | null): number | null {
  if (!graduationYear) return null;
  const now = new Date();
  const month = now.getMonth(); // 0-indexed, June = 5
  const calYear = now.getFullYear();
  const academicYear = month >= 6 ? calYear + 1 : calYear; // July 1 starts new academic year
  const pgy = academicYear - (graduationYear - 3);
  return pgy >= 1 ? pgy : null;
}

/* ── Edit User Dialog ── */
const EditUserDialog = ({
  u,
  isSelf,
  onUpdateRole,
  onUpdateProfile,
  onUpdateUser,
}: {
  u: ManagedUser;
  isSelf: boolean;
  onUpdateRole: (data: { user_id: string; role: UserRole }) => void;
  onUpdateProfile: (data: { id: string; display_name?: string; first_name?: string; last_name?: string; graduation_year?: number | null }) => void;
  onUpdateUser: (data: { user_id: string; email?: string; password?: string }) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(u.email || "");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState(u.first_name || "");
  const [lastName, setLastName] = useState(u.last_name || "");
  const [role, setRole] = useState<UserRole>(u.role);
  const [graduationYear, setGraduationYear] = useState(u.graduation_year?.toString() || "");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEmail(u.email || "");
      setPassword("");
      setFirstName(u.first_name || "");
      setLastName(u.last_name || "");
      setRole(u.role);
      setGraduationYear(u.graduation_year?.toString() || "");
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    // Update auth fields (email/password) via edge function
    const authUpdates: { user_id: string; email?: string; password?: string } = { user_id: u.id };
    if (email !== (u.email || "")) authUpdates.email = email;
    if (password) authUpdates.password = password;
    if (authUpdates.email || authUpdates.password) {
      onUpdateUser(authUpdates);
    }

    // Update role if changed
    if (role !== u.role) {
      onUpdateRole({ user_id: u.id, role });
    }

    // Update profile fields
    const parsedYear = graduationYear ? parseInt(graduationYear, 10) : null;
    const displayName = (firstName && lastName) ? `${firstName} ${lastName}` : u.display_name || "";
    const profileChanged =
      firstName !== (u.first_name || "") ||
      lastName !== (u.last_name || "") ||
      parsedYear !== (u.graduation_year ?? null) ||
      email !== (u.email || "");
    if (profileChanged) {
      onUpdateProfile({
        id: u.id,
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
        graduation_year: parsedYear,
        email: email !== (u.email || "") ? email : undefined,
      });
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center justify-center w-9 h-9 bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm bg-muted border-border rounded-xl p-0 [&>button[class*='absolute']]:hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <DialogTitle className="text-base font-medium">Edit user</DialogTitle>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-9 h-9 bg-transparent border-none cursor-pointer"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="bg-background rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Password</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="bg-background rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">First name</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="bg-background rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Last name</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="bg-background rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              disabled={isSelf}
              className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm outline-none"
            >
              <option value="resident">Resident</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </select>
            {isSelf && (
              <p className="text-xs text-muted-foreground">You cannot change your own role.</p>
            )}
          </div>

          {role === "resident" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Graduation year</Label>
              <Input
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="2028"
                className="bg-background rounded-lg"
              />
            </div>
          )}

          <div className="flex items-center justify-end pt-3 border-t border-border">
            <button
              onClick={handleSave}
              className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ── Delete User Dialog ── */
const DeleteUserDialog = ({
  u,
  onDelete,
}: {
  u: ManagedUser;
  onDelete: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) setConfirmText("");
    setOpen(isOpen);
  };

  const handleDelete = () => {
    onDelete(u.id);
    setConfirmText("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm bg-muted border-border rounded-xl p-0 [&>button[class*='absolute']]:hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <DialogTitle className="text-base font-medium">Delete user</DialogTitle>
          <button
            onClick={() => handleOpen(false)}
            className="flex items-center justify-center w-9 h-9 bg-transparent border-none cursor-pointer"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-3.5">
          <div className="space-y-1.5">
            <p className="text-sm text-foreground">
              Are you sure you want to delete <span className="font-medium">{formatPersonName(u)}</span>?
            </p>
            {u.email && (
              <p className="text-xs text-muted-foreground">{u.email}</p>
            )}
            <p className="text-xs text-destructive mt-2">
              This will permanently remove this user and cannot be undone.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Type DELETE to confirm</Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="bg-background rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={confirmText !== "DELETE"}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ── Add User Dialog ── */
const AddUserDialog = ({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: { email: string; password: string; display_name?: string; first_name?: string; last_name?: string; role?: UserRole; graduation_year?: number }) => void;
  isPending: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole>("resident");
  const [graduationYear, setGraduationYear] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setRole("resident");
      setGraduationYear("");
    }
    setOpen(isOpen);
  };

  const handleSubmit = () => {
    if (!email || !password) return;
    const parsedYear = graduationYear ? parseInt(graduationYear, 10) : undefined;
    onSubmit({
      email,
      password,
      display_name: (firstName && lastName) ? `${firstName} ${lastName}` : undefined,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      role,
      graduation_year: parsedYear,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="h-[18px] w-[18px]" />
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm bg-muted border-border rounded-xl p-0 [&>button[class*='absolute']]:hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <DialogTitle className="text-base font-medium">Add user</DialogTitle>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-9 h-9 bg-transparent border-none cursor-pointer"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Password</Label>
            <Input
              type="text"
              placeholder="Set a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">First name</Label>
            <Input
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-background rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Last name</Label>
            <Input
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-background rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm outline-none"
            >
              <option value="resident">Resident</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {role === "resident" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Graduation year</Label>
              <Input
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="2028"
                className="bg-background rounded-lg"
              />
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <button
              onClick={handleSubmit}
              disabled={!email || !password || isPending}
              className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ── Role Access Report (read-only) ── */
const RoleAccessSection = () => {
  const dot = (color: string) => (
    <div
      className="inline-block w-3 h-3 rounded-full"
      style={{ background: color }}
    />
  );
  const G = () => dot("#5E9E82");
  const Y = () => dot("#D4B820");
  const R = () => dot("#A63333");

  const sections = [
    {
      name: "Admin",
      rows: [
        { action: "All actions", a: <G />, f: <R />, r: <R /> },
      ],
    },
    {
      name: "CBME",
      rows: [
        { action: "View page", a: <G />, f: <G />, r: <R /> },
        { action: "Assess / edit / all scores", a: <G />, f: <G />, r: <R /> },
      ],
    },
    {
      name: "Events",
      rows: [
        { action: "View page", a: <G />, f: <G />, r: <R /> },
        { action: "Create / edit / delete", a: <G />, f: <G />, r: <R /> },
      ],
    },
    {
      name: "Feedback",
      rows: [
        { action: "All actions", a: <G />, f: <G />, r: <R /> },
      ],
    },
    {
      name: "Meetings",
      rows: [
        { action: "View page", a: <G />, f: <G />, r: <R /> },
        { action: "Create / edit / delete", a: <G />, f: <G />, r: <R /> },
      ],
    },
    {
      name: "Profile",
      rows: [
        { action: "View / edit own", a: <G />, f: <G />, r: <G /> },
      ],
    },
    {
      name: "Tasks",
      rows: [
        { action: "View page", a: <G />, f: <G />, r: <R /> },
        { action: "Create / edit / delete", a: <G />, f: <G />, r: <R /> },
      ],
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">{dot("#5E9E82")} Full</span>
        <span className="flex items-center gap-1">{dot("#D4B820")} View only</span>
        <span className="flex items-center gap-1">{dot("#A63333")} None</span>
      </div>
      <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
        <tbody>
          {sections.map((s, i) => (
            <React.Fragment key={s.name}>
              <tr>
                <td className="text-xs font-medium text-foreground pt-2 pb-1 border-b" style={{ width: "52%", borderColor: "#C9CED4" }}>
                  {s.name}
                </td>
                {i === 0 ? (
                  <>
                    <td className="text-center font-normal text-muted-foreground pt-2 pb-1 border-b" style={{ width: "16%", borderColor: "#C9CED4" }}>Adm</td>
                    <td className="text-center font-normal text-muted-foreground pt-2 pb-1 border-b" style={{ width: "16%", borderColor: "#C9CED4" }}>Fac</td>
                    <td className="text-center font-normal text-muted-foreground pt-2 pb-1 border-b" style={{ width: "16%", borderColor: "#C9CED4" }}>Res</td>
                  </>
                ) : (
                  <>
                    <td className="border-b" style={{ borderColor: "#C9CED4" }} />
                    <td className="border-b" style={{ borderColor: "#C9CED4" }} />
                    <td className="border-b" style={{ borderColor: "#C9CED4" }} />
                  </>
                )}
              </tr>
              {s.rows.map((row) => (
                <tr key={row.action}>
                  <td className="py-1 text-muted-foreground">{row.action}</td>
                  <td className="py-1 text-center">{row.a}</td>
                  <td className="py-1 text-center">{row.f}</td>
                  <td className="py-1 text-center">{row.r}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ── Admin Page ── */
const Admin = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isAdminLoading, users, inviteUser, updateUser, updateRole, updateProfile, deleteUser } = useAdmin();
  const { tags, createTag, updateTag, deleteTag } = useMeetingTags();
  const { links } = useMeetingTagLinks();
  const { categories, createCategory, updateCategory, deleteCategory } = useCompetencyCategories();

  const { settings, updateSetting } = useAppSettings();

  const [newTagName, setNewTagName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [defaultReportEmail, setDefaultReportEmail] = useState("");
  const [pgyMaxLevels, setPgyMaxLevels] = useState<Record<string, string>>({
    pgy_max_level_1: "2",
    pgy_max_level_2: "3",
    pgy_max_level_3: "4",
    pgy_max_level_4: "5",
  });

  // Milestone status management
  const { data: acgmeData } = useACGMECompetencies();
  const [msResident, setMsResident] = useState<string>("");
  const [msLevels, setMsLevels] = useState<Record<string, number>>({});
  const [msOriginal, setMsOriginal] = useState<Record<string, number>>({});
  const [msSaving, setMsSaving] = useState(false);
  const [msLoading, setMsLoading] = useState(false);

  const residents = useMemo(() => {
    if (!users.data) return [];
    return users.data.filter((u) => u.role === "resident").sort((a, b) => formatPersonName(a).localeCompare(formatPersonName(b)));
  }, [users.data]);

  // Load milestone status when resident is selected
  useEffect(() => {
    if (!msResident) { setMsLevels({}); setMsOriginal({}); return; }
    setMsLoading(true);
    (supabase as any)
      .from("resident_milestone_status")
      .select("subcategory_id, current_level")
      .eq("resident_id", msResident)
      .then(({ data }: any) => {
        const map: Record<string, number> = {};
        (data || []).forEach((r: any) => { map[r.subcategory_id] = r.current_level; });
        setMsLevels({ ...map });
        setMsOriginal({ ...map });
        setMsLoading(false);
      });
  }, [msResident]);

  const msHasChanges = useMemo(() => {
    return Object.keys(msLevels).some((k) => msLevels[k] !== msOriginal[k]) ||
      Object.keys(msLevels).some((k) => msOriginal[k] === undefined);
  }, [msLevels, msOriginal]);

  const handleMsSave = async () => {
    if (!msResident || !user) return;
    setMsSaving(true);
    const changedRows = Object.entries(msLevels)
      .filter(([k, v]) => msOriginal[k] !== v)
      .map(([subcategoryId, level]) => ({
        resident_id: msResident,
        subcategory_id: subcategoryId,
        current_level: level,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }));
    if (changedRows.length > 0) {
      await (supabase as any).from("resident_milestone_status").upsert(changedRows, { onConflict: "resident_id,subcategory_id" });
    }
    setMsOriginal({ ...msLevels });
    setMsSaving(false);
    toast({ title: "Milestone status updated" });
  };

  // Sync default report email and PGY max levels from settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await (supabase as any)
        .from("app_settings")
        .select("key, value")
        .in("key", ["default_report_email", "pgy_max_level_1", "pgy_max_level_2", "pgy_max_level_3", "pgy_max_level_4"]);
      if (data) {
        (data as any[]).forEach((row: any) => {
          if (row.key === "default_report_email") setDefaultReportEmail(row.value);
          if (row.key.startsWith("pgy_max_level_")) {
            setPgyMaxLevels((prev) => ({ ...prev, [row.key]: row.value }));
          }
        });
      }
    };
    fetchSettings();
  }, []);

  const toggleSection = (name: string) => {
    setExpandedSection(expandedSection === name ? null : name);
  };

  if (isAdminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen" style={{ background: "#F5F3EE" }}>
      <header className="sticky top-0 z-40" style={{ background: "#415162" }}>
        <div className="container flex items-center justify-between h-14 px-4">
          <HeaderLogo isAdmin={true} onSignOut={signOut} />
        </div>
      </header>

      <main className="container max-w-[1200px] px-4 py-4 space-y-2">

        {/* Team Members */}
        <div
          className="rounded-lg overflow-hidden cursor-pointer"
          style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4" }}
        >
          <div
            className="flex items-center px-3.5 py-3"
            onClick={() => toggleSection("team")}
          >
            <span className="text-sm font-medium" style={{ color: "#2D3748" }}>Team members</span>
          </div>
          {expandedSection === "team" && (
            <div className="px-3.5 pb-3 space-y-1.5">
              {/* Add user — top row */}
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <AddUserDialog
                  onSubmit={(data) => inviteUser.mutate(data)}
                  isPending={inviteUser.isPending}
                />
              </div>
              {users.isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : users.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No users found.</p>
              ) : (
                (() => {
                  const sorted = [...(users.data || [])].sort((a, b) => {
                    const roleOrder: Record<string, number> = { admin: 0, faculty: 1, resident: 2 };
                    const roleDiff = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
                    if (roleDiff !== 0) return roleDiff;
                    return formatPersonName(a).localeCompare(formatPersonName(b));
                  });
                  let lastRole = "";
                  return sorted.map((u) => {
                    const isSelf = u.id === user?.id;
                    const showHeader = u.role !== lastRole;
                    lastRole = u.role;
                    return (
                      <React.Fragment key={u.id}>
                        {showHeader && (
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-3 pb-1">
                            {u.role}
                          </p>
                        )}
                        <div
                          className="flex items-center justify-between px-3 py-2 bg-background rounded-lg border border-border"
                        >
                          <div>
                            <span className="text-sm font-medium text-foreground">
                              {formatPersonName(u)}
                            </span>
                            {u.role === "resident" && (() => {
                              const pgy = getPgyLevel(u.graduation_year);
                              return pgy ? (
                                <span className="ml-1.5 text-[11px] text-muted-foreground">(PGY-{pgy})</span>
                              ) : null;
                            })()}
                            {isSelf && (
                              <span className="ml-1 text-[11px] text-muted-foreground">(you)</span>
                            )}
                            {u.email && (
                              <p className="text-[11px] text-muted-foreground">{u.email}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <EditUserDialog
                              u={u}
                              isSelf={isSelf}
                              onUpdateRole={(data) => updateRole.mutate(data)}
                              onUpdateProfile={(data) => updateProfile.mutate(data)}
                              onUpdateUser={(data) => updateUser.mutate(data)}
                            />
                            {!isSelf && (
                              <DeleteUserDialog
                                u={u}
                                onDelete={(id) => deleteUser.mutate(id)}
                              />
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  });
                })()
              )}
            </div>
          )}
        </div>

        {/* Meeting Tags */}
        <div
          className="rounded-lg overflow-hidden cursor-pointer"
          style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4" }}
        >
          <div
            className="flex items-center px-3.5 py-3"
            onClick={() => toggleSection("tags")}
          >
            <span className="text-sm font-medium" style={{ color: "#2D3748" }}>Meeting tags</span>
          </div>
          {expandedSection === "tags" && (
            <div className="px-3.5 pb-3 space-y-1.5">
              {/* Add row — top */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="New tag name..."
                  className="bg-background rounded-lg flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTagName.trim()) {
                      createTag.mutate(newTagName.trim());
                      setNewTagName("");
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newTagName.trim()) {
                      createTag.mutate(newTagName.trim());
                      setNewTagName("");
                    }
                  }}
                  disabled={!newTagName.trim()}
                  className="p-1 text-[#8A9AAB] disabled:opacity-30"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              {tags.data?.map((tag) => {
                const count = links.data?.filter((l) => l.tag_id === tag.id).length || 0;
                const isEditing = editingTagId === tag.id;
                return (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between px-3 py-2 bg-background rounded-lg border border-border"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          autoFocus
                          value={editingTagName}
                          onChange={(e) => setEditingTagName(e.target.value)}
                          className="bg-background rounded-lg h-7 text-sm flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editingTagName.trim()) {
                              updateTag.mutate({ id: tag.id, name: editingTagName.trim() });
                              setEditingTagId(null);
                            }
                            if (e.key === "Escape") setEditingTagId(null);
                          }}
                        />
                        <button
                          onClick={() => {
                            if (editingTagName.trim()) {
                              updateTag.mutate({ id: tag.id, name: editingTagName.trim() });
                            }
                            setEditingTagId(null);
                          }}
                          className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-primary"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">{tag.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            ({count})
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingTagId(tag.id); setEditingTagName(tag.name); }}
                            className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground rounded-md transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteTag.mutate(tag.id); }}
                            className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {tags.data?.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No tags yet</p>
              )}
            </div>
          )}
        </div>

        {/* Competency Categories */}
        <div
          className="rounded-lg overflow-hidden cursor-pointer"
          style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4" }}
        >
          <div
            className="flex items-center px-3.5 py-3"
            onClick={() => toggleSection("categories")}
          >
            <span className="text-sm font-medium" style={{ color: "#2D3748" }}>Competency categories</span>
          </div>
          {expandedSection === "categories" && (
            <div className="px-3.5 pb-3 space-y-1.5">
              {/* Add row — top */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name..."
                  className="bg-background rounded-lg flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCategoryName.trim()) {
                      createCategory.mutate(newCategoryName.trim());
                      setNewCategoryName("");
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newCategoryName.trim()) {
                      createCategory.mutate(newCategoryName.trim());
                      setNewCategoryName("");
                    }
                  }}
                  disabled={!newCategoryName.trim()}
                  className="p-1 text-[#8A9AAB] disabled:opacity-30"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              {categories.data?.map((cat) => {
                const isEditing = editingCatId === cat.id;
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between px-3 py-2 bg-background rounded-lg border border-border"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          autoFocus
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="bg-background rounded-lg h-7 text-sm flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editingCatName.trim()) {
                              updateCategory.mutate({ id: cat.id, name: editingCatName.trim() });
                              setEditingCatId(null);
                            }
                            if (e.key === "Escape") setEditingCatId(null);
                          }}
                        />
                        <button
                          onClick={() => {
                            if (editingCatName.trim()) {
                              updateCategory.mutate({ id: cat.id, name: editingCatName.trim() });
                            }
                            setEditingCatId(null);
                          }}
                          className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-primary"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingCatId(cat.id); setEditingCatName(cat.name); }}
                            className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground rounded-md transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteCategory.mutate(cat.id); }}
                            className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {categories.data?.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No categories yet</p>
              )}
            </div>
          )}
        </div>

        {/* Milestone Status */}
        <div
          className="rounded-lg overflow-hidden cursor-pointer"
          style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4" }}
        >
          <div
            className="flex items-center px-3.5 py-3"
            onClick={() => toggleSection("milestones")}
          >
            <span className="text-sm font-medium" style={{ color: "#2D3748" }}>Milestone status</span>
          </div>
          {expandedSection === "milestones" && (
            <div className="px-3.5 pb-3 space-y-3" onClick={(e) => e.stopPropagation()}>
              {/* Resident selector */}
              <select
                value={msResident}
                onChange={(e) => setMsResident(e.target.value)}
                className="w-full bg-background border border-border rounded-lg h-10 px-3 text-sm outline-none"
              >
                <option value="">Select resident...</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>{formatPersonName(r)}</option>
                ))}
              </select>

              {msResident && msLoading && (
                <div className="flex justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}

              {msResident && !msLoading && acgmeData && (
                <>
                  {acgmeData.map((cat) => (
                    <div key={cat.id}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-3 pb-1 border-b border-border">
                        {cat.name}
                      </p>
                      {cat.subcategories.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between py-2">
                          <span className="text-[13px] font-medium" style={{ color: "#2D3748" }}>
                            {sub.code} — {sub.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {[0, 1, 2, 3, 4, 5].map((lvl) => {
                              const selected = (msLevels[sub.id] ?? 0) === lvl;
                              return (
                                <button
                                  key={lvl}
                                  onClick={() => setMsLevels((prev) => ({ ...prev, [sub.id]: lvl }))}
                                  className="flex items-center justify-center transition-all"
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: "50%",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    background: selected ? "#415162" : "#F5F3EE",
                                    color: selected ? "#fff" : "#5F7285",
                                    border: selected ? "2px solid #415162" : "1px solid #C9CED4",
                                  }}
                                >
                                  {lvl}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleMsSave}
                      disabled={!msHasChanges || msSaving}
                      style={{
                        background: !msHasChanges || msSaving ? "#A0AEC0" : "#415162",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 20px",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: !msHasChanges || msSaving ? "default" : "pointer",
                      }}
                    >
                      {msSaving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* App Settings */}
        <div
          className="rounded-lg overflow-hidden cursor-pointer"
          style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4" }}
        >
          <div
            className="flex items-center px-3.5 py-3"
            onClick={() => toggleSection("settings")}
          >
            <span className="text-sm font-medium" style={{ color: "#2D3748" }}>App settings</span>
          </div>
          {expandedSection === "settings" && (
            <div className="px-3.5 pb-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Default report email</label>
                  <Input
                    type="email"
                    value={defaultReportEmail}
                    onChange={(e) => setDefaultReportEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    className="bg-background rounded-lg"
                  />
                </div>
                <button
                  onClick={() => {
                    updateSetting.mutate({ key: "default_report_email", value: defaultReportEmail });
                  }}
                  className="flex items-center justify-center w-9 h-9 mt-5 bg-transparent border-none cursor-pointer text-primary hover:text-primary/80"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>

              {/* PGY milestone constraints */}
              <div className="pt-2">
                <label className="text-xs text-muted-foreground font-medium">PGY milestone constraints</label>
                {([1, 2, 3, 4] as const).map((pgy) => {
                  const key = `pgy_max_level_${pgy}`;
                  return (
                    <div key={key} className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">PGY-{pgy} max level</label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={pgyMaxLevels[key]}
                          onChange={(e) =>
                            setPgyMaxLevels((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder="e.g. 2"
                          className="bg-background rounded-lg"
                        />
                      </div>
                      <button
                        onClick={() => {
                          updateSetting.mutate({ key, value: pgyMaxLevels[key] });
                        }}
                        className="flex items-center justify-center w-9 h-9 mt-5 bg-transparent border-none cursor-pointer text-primary hover:text-primary/80"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div
          className="rounded-lg overflow-hidden cursor-pointer"
          style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4" }}
        >
          <div
            className="flex items-center justify-between px-3.5 py-3"
            onClick={() => toggleSection("access")}
          >
            <span className="text-sm font-medium" style={{ color: "#2D3748" }}>Role access</span>
          </div>
          {expandedSection === "access" && (
            <div className="px-3.5 pb-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={async () => {
                    setRefreshing(true);
                    await queryClient.refetchQueries();
                    setRefreshing(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground bg-background border border-border transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Refreshing..." : "Refresh all data"}
                </button>
              </div>
              <RoleAccessSection />
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default Admin;
