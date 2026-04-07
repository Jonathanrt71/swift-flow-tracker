import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, Check, User, X } from "lucide-react";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("profiles")
      .select("display_name, first_name, last_name, email, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || "");
          setFirstName((data as any).first_name || "");
          setLastName((data as any).last_name || "");
          setEmail((data as any).email || user.email || "");
          setAvatarUrl(data.avatar_url);
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
      } as any)
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both fields match.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated" });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2MB allowed.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      setUploading(false);
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;

    const { error: updateErr } = await (supabase as any)
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", user.id);

    setUploading(false);

    if (updateErr) {
      toast({ title: "Error", description: updateErr.message, variant: "destructive" });
    } else {
      setAvatarUrl(url);
      toast({ title: "Avatar updated" });
    }
  };

  const initials = (displayName || user?.email || "?")
    .split(/[\s@]/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F3EE" }}>
      <header className="sticky top-0 z-40" style={{ background: "#415162" }}>
        <div className="flex items-center h-14 px-4">
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <NotificationBell />
          </HeaderLogo>
        </div>
      </header>

      <main className="container max-w-lg px-4 py-12 flex flex-col items-center gap-8">
        {/* Avatar */}
        <button
          type="button"
          className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-xl bg-muted text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading ? (
              <Loader2 className="h-5 w-5 text-background animate-spin" />
            ) : (
              <Camera className="h-5 w-5 text-background" />
            )}
          </div>
          <div className="absolute bottom-0 right-0 flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground shadow-sm">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />

        {/* Form fields */}
        <div className="w-full flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-normal text-sm text-muted-foreground">Email</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="opacity-60"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="font-normal text-sm text-muted-foreground">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="font-normal text-sm text-muted-foreground">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              aria-label="Save profile"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-border my-2" />

          {/* Change password */}
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-foreground">Change password</p>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="font-normal text-sm text-muted-foreground">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="font-normal text-sm text-muted-foreground">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                aria-label="Change password"
              >
                {changingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
