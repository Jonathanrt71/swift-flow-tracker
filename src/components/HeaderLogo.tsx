import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckSquare, Users, Calendar, BookOpen, MessageSquare, Shield, User, LogOut, BookMarked, Stethoscope, ClipboardList, BookOpenCheck, Home, ShieldCheck, FileText, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface NavEntry {
  path: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  permissionKey?: string;
}

const allNavItems: NavEntry[] = [
  { path: "/",            label: "FM App",       icon: Home },
  { path: "/cbme",        label: "CBME",         icon: BookOpen,      permissionKey: "cbme.view" },
  { path: "/events",      label: "Events",       icon: Calendar,      permissionKey: "events.view" },
  { path: "/feedback",    label: "Feedback",     icon: MessageSquare, permissionKey: "feedback.view" },
  { path: "/topics",      label: "Topics",       icon: BookOpenCheck, permissionKey: "topics.view" },
  { path: "/compliance",  label: "Compliance",   icon: ShieldCheck,   permissionKey: "compliance.view" },
  { path: "/announcements", label: "Announcements", icon: Megaphone, permissionKey: "announcements.view" },
  { path: "/meetings",    label: "Meetings",     icon: Users,         permissionKey: "meetings.view" },
  { path: "/operations",  label: "Operations",   icon: ClipboardList, permissionKey: "operations.view" },
  { path: "/tasks",       label: "Tasks",        icon: CheckSquare,   permissionKey: "tasks.view" },
  { path: "/gme-handbook",label: "GME Handbook", icon: FileText,      permissionKey: "gme_handbook.view" },
  { path: "/handbook",    label: "Resident Handbook", icon: BookMarked, permissionKey: "handbook.view" },
  { path: "/rotations",   label: "Rotations",    icon: Stethoscope,   permissionKey: "rotations.view" },
];

interface NavSection { label: string; paths: string[]; }
const navSections: NavSection[] = [
  { label: "Clinical",  paths: ["/cbme", "/events", "/feedback", "/topics"] },
  { label: "Program",   paths: ["/compliance", "/announcements", "/meetings", "/operations", "/tasks"] },
  { label: "Reference", paths: ["/gme-handbook", "/handbook", "/rotations"] },
];

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; first_name: string | null; last_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("display_name, first_name, last_name, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user?.id]);

  const userName = profile?.first_name || user?.email?.split("@")[0] || "User";
  const userInitials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : userName.substring(0, 2).toUpperCase();
  const avatarUrl = profile?.avatar_url || null;

  return { userName, userInitials, avatarUrl, email: user?.email || "" };
}

const HeaderLogo = ({
  isAdmin,
  onSignOut,
  children,
}: {
  isAdmin?: boolean;
  onSignOut?: () => void;
  children?: React.ReactNode;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const location = useLocation();
  const { has: hasPerm } = usePermissions();
  const { settings } = useAppSettings();
  const navImageUrl = settings.nav_image_url || "/yosemite-header.png";
  const { userName, userInitials, avatarUrl } = useUserProfile();

  const currentItem = allNavItems.find((n) => n.path === location.pathname)
    || (location.pathname === "/admin" ? { path: "/admin", label: "Admin", icon: Shield, permissionKey: "admin.all" } as NavEntry : undefined)
    || (location.pathname === "/profile" ? { path: "/profile", label: "Profile", icon: User } as NavEntry : undefined);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageOpenedAt = useRef(0);

  const startPress = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      imageOpenedAt.current = Date.now();
      setImageOpen(true);
    }, 500);
  }, []);
  const endLongPress = useCallback(() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }, []);
  const cancelPress = useCallback(() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }, []);
  const closeImage = useCallback(() => { if (Date.now() - imageOpenedAt.current < 600) return; setImageOpen(false); }, []);

  return (
    <div className="relative flex items-center gap-2.5" style={{ flex: 1 }}>
      {/* Logo */}
      <button
        onMouseDown={startPress} onMouseUp={endLongPress} onMouseLeave={cancelPress}
        onTouchStart={startPress} onTouchEnd={(e) => { e.preventDefault(); endLongPress(); }} onTouchCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        className="w-8 h-8 rounded-md overflow-hidden border-none cursor-pointer p-0 bg-transparent select-none"
      >
        <img src={navImageUrl} alt="" className="w-8 h-8 rounded-md object-cover pointer-events-none" draggable={false} />
      </button>

      {/* Page title — opens nav dropdown */}
      <button onClick={() => setMenuOpen(!menuOpen)} className="border-none cursor-pointer p-0 bg-transparent">
        <span className="text-base font-medium text-white">{currentItem?.label || "FM App"}</span>
      </button>

      <div style={{ flex: 1 }} />

      {/* Right side: children (search, bell) + avatar + name — all evenly spaced */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {children}
        <Link to="/profile" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.3)" }} />
          ) : (
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#fff" }}>
              {userInitials}
            </div>
          )}
          <span className="hidden sm:inline" style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{userName}</span>
        </Link>
      </div>

      {/* Navigation dropdown — triggered by page title */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)} onTouchEnd={() => setMenuOpen(false)} />
          <div className="fixed z-[70] rounded-lg shadow-lg overscroll-contain" style={{ top: 58, left: 16, background: "#415162", minWidth: 200, maxHeight: "calc(100vh - 70px)", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
            <Link to="/" onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", location.pathname === "/" ? "text-white bg-white/10" : "text-white/70")}>
              <Home className="h-4 w-4" /> FM App
            </Link>
            <div style={{ height: 0.5, background: "rgba(255,255,255,0.15)" }} />
            {navSections.map((section, si) => {
              const items = section.paths.map(p => allNavItems.find(n => n.path === p)).filter((item): item is NavEntry => !!item && (!item.permissionKey || hasPerm(item.permissionKey, "view")));
              if (!items.length) return null;
              return (<div key={section.label}>
                {si > 0 && <div style={{ height: 0.5, background: "rgba(255,255,255,0.15)" }} />}
                <div style={{ padding: "6px 16px 2px", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>{section.label}</div>
                {items.map(item => { const I = item.icon; return (
                  <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", location.pathname === item.path ? "text-white bg-white/10" : "text-white/70")}><I className="h-4 w-4" /> {item.label}</Link>
                ); })}
              </div>);
            })}
            <div style={{ height: 0.5, background: "rgba(255,255,255,0.15)" }} />
            {isAdmin && (<>
              <div style={{ padding: "6px 16px 2px", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Administration</div>
              <Link to="/admin" onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", location.pathname === "/admin" ? "text-white bg-white/10" : "text-white/70")}><Shield className="h-4 w-4" /> Admin</Link>
            </>)}
            {onSignOut && (
              <>
              <Link to="/profile" onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", location.pathname === "/profile" ? "text-white bg-white/10" : "text-white/70")}>
                <User className="h-4 w-4" /> Profile
              </Link>
              <button onClick={() => { onSignOut(); setMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 w-full border-none bg-transparent cursor-pointer text-left">
                <LogOut className="h-4 w-4" /> Log out
              </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Long-press image viewer */}
      {imageOpen && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center" onClick={closeImage}
          onTouchEnd={(e) => { if (Date.now() - imageOpenedAt.current < 600) { e.preventDefault(); e.stopPropagation(); } }}>
          <img src={navImageUrl} alt="" className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default HeaderLogo;
