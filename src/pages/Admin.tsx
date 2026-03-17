import { useState } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Shield, Pencil, Check, X, Tag, Trash2 } from "lucide-react";
import { useMeetingTags } from "@/hooks/useMeetingTags";
import { useMeetingTagLinks } from "@/hooks/useMeetingTags";
import type { UserRole, ManagedUser } from "@/hooks/useAdmin";

/* ── Edit User Dialog ── */
const EditUserDialog = ({
  u,
  isSelf,
  onUpdateRole,
  onUpdateProfile,
}: {
  u: ManagedUser;
  isSelf: boolean;
  onUpdateRole: (data: { user_id: string; role: UserRole }) => void;
  onUpdateProfile: (data: { id: string; display_name?: string; first_name?: string; last_name?: string }) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(u.role);
  const [displayName, setDisplayName] = useState(u.display_name || "");
  const [firstName, setFirstName] = useState(u.first_name || "");
  const [lastName, setLastName] = useState(u.last_name || "");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setRole(u.role);
      setDisplayName(u.display_name || "");
      setFirstName(u.first_name || "");
      setLastName(u.last_name || "");
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    if (role !== u.role) {
      onUpdateRole({ user_id: u.id, role });
    }
    const profileChanged =
      displayName !== (u.display_name || "") ||
      firstName !== (u.first_name || "") ||
      lastName !== (u.last_name || "");
    if (profileChanged) {
      onUpdateProfile({
        id: u.id,
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
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
            <Label className="text-xs text-muted-foreground">Display name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
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
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={isSelf}>
              <SelectTrigger className="bg-background rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resident">Resident</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-xs text-muted-foreground">You cannot change your own role.</p>
            )}
          </div>

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

/* ── Add User Dialog ── */
const AddUserDialog = ({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: { email: string; password: string; display_name?: string; first_name?: string; last_name?: string; role?: string }) => void;
  isPending: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("resident");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEmail("");
      setPassword("");
      setDisplayName("");
      setFirstName("");
      setLastName("");
      setRole("resident");
    }
    setOpen(isOpen);
  };

  const handleSubmit = () => {
    if (!email || !password) return;
    onSubmit({
      email,
      password,
      display_name: displayName || undefined,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      role,
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
            <Label className="text-xs text-muted-foreground">Display name</Label>
            <Input
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
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
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm outline-none"
            >
              <option value="resident">Resident</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Password</Label>
            <Input
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background rounded-lg"
            />
          </div>

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

/* ── Admin Page ── */
const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, isAdminLoading, users, inviteUser, updateRole, updateProfile } = useAdmin();
  const { settings, updateSetting } = useAppSettings();
  const { tags, createTag, deleteTag } = useMeetingTags();
  const { links } = useMeetingTagLinks();

  const [facultyLimit, setFacultyLimit] = useState("");
  const [residentLimit, setResidentLimit] = useState("");
  const [newTagName, setNewTagName] = useState("");

  if (isAdminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center gap-3 h-14 px-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Admin Panel</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Team Members</h2>
          <AddUserDialog
            onSubmit={(data) => inviteUser.mutate(data)}
            isPending={inviteUser.isPending}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : users.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.data?.map((u) => {
                    const isSelf = u.id === user?.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {u.display_name || "Unnamed"}
                            </p>
                            {u.email && (
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            )}
                            {isSelf && (
                              <span className="text-xs text-muted-foreground">(you)</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{u.role}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <EditUserDialog
                            u={u}
                            isSelf={isSelf}
                            onUpdateRole={(data) => updateRole.mutate(data)}
                            onUpdateProfile={(data) => updateProfile.mutate(data)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Task Limits</h2>
        </div>

        <Card className="border-border">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-3">
              <Label className="font-normal text-sm text-muted-foreground w-32 shrink-0">Faculty max tasks</Label>
              <Input
                type="number"
                min="1"
                className="w-20"
                placeholder={String(settings.faculty_task_limit)}
                value={facultyLimit}
                onChange={(e) => setFacultyLimit(e.target.value)}
                onBlur={() => {
                  if (facultyLimit && parseInt(facultyLimit) > 0) {
                    updateSetting.mutate({ key: "faculty_task_limit", value: facultyLimit });
                  }
                  setFacultyLimit("");
                }}
              />
              <span className="text-sm text-muted-foreground">current: {settings.faculty_task_limit}</span>
            </div>
            <div className="flex items-center gap-3">
              <Label className="font-normal text-sm text-muted-foreground w-32 shrink-0">Resident max tasks</Label>
              <Input
                type="number"
                min="1"
                className="w-20"
                placeholder={String(settings.resident_task_limit)}
                value={residentLimit}
                onChange={(e) => setResidentLimit(e.target.value)}
                onBlur={() => {
                  if (residentLimit && parseInt(residentLimit) > 0) {
                    updateSetting.mutate({ key: "resident_task_limit", value: residentLimit });
                  }
                  setResidentLimit("");
                }}
              />
              <span className="text-sm text-muted-foreground">current: {settings.resident_task_limit}</span>
            </div>
          </CardContent>
        </Card>

        {/* Meeting Tags */}
        <Card className="bg-muted border-border">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Meeting Tags</h2>
            <div className="space-y-2">
              {tags.data?.map((tag) => {
                const count = links.data?.filter((l) => l.tag_id === tag.id).length || 0;
                return (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between px-3 py-2.5 bg-background rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-foreground">{tag.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground">
                        {count} meeting{count !== 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={() => deleteTag.mutate(tag.id)}
                        className="flex items-center justify-center w-7 h-7 bg-transparent border-none cursor-pointer text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {tags.data?.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No tags yet</p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
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
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
