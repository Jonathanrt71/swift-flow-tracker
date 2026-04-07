import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckSquare, Users, Calendar, BookOpen, MessageSquare, Shield, User, LogOut, BookMarked, Stethoscope, ClipboardList, BookOpenCheck, Home, ShieldCheck, FileText, Megaphone, FileCheck, CalendarDays, Activity, UserCheck } from "lucide-react";
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
  { path: "/evaluations", label: "Evaluations",  icon: FileCheck,     permissionKey: "evaluations.view" },
  { path: "/procedure-logs", label: "Procedures", icon: Activity,     permissionKey: "procedures.view" },
  { path: "/resident-summary", label: "Resident Summary", icon: UserCheck, permissionKey: "resident_summary.view" },
  { path: "/topics",      label: "Topics",       icon: BookOpenCheck, permissionKey: "topics.view" },
  { path: "/compliance",  label: "Compliance",   icon: ShieldCheck,   permissionKey: "compliance.view" },
  { path: "/schedule",    label: "Schedule",     icon: CalendarDays,  permissionKey: "schedule.view" },
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
  { label: "Clinical",  paths: ["/cbme", "/events", "/feedback", "/evaluations", "/procedure-logs", "/resident-summary", "/topics"] },
  { label: "Program",   paths: ["/compliance", "/schedule", "/announcements", "/meetings", "/operations", "/tasks"] },
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
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    
    // Lock body scroll
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!avatarMenuOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [avatarMenuOpen]);

  const location = useLocation();
  const navigate = useNavigate();
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
  const endLongPress = useCallback(() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; navigate("/"); } }, [navigate]);
  const cancelPress = useCallback(() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }, []);
  const closeImage = useCallback(() => { if (Date.now() - imageOpenedAt.current < 600) return; setImageOpen(false); }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [menuLeft, setMenuLeft] = useState(0);

  useEffect(() => {
    if (menuOpen && containerRef.current) {
      const appWrapper = containerRef.current.closest('.mx-auto');
      if (appWrapper) {
        const rect = appWrapper.getBoundingClientRect();
        setMenuLeft(rect.left);
      } else {
        setMenuLeft(0);
      }
    }
  }, [menuOpen]);

  return (
    <div ref={containerRef} className="relative flex items-center gap-2.5" style={{ flex: 1 }}>
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
        <span className="text-base font-medium text-white whitespace-nowrap">{currentItem?.label || "FM App"}</span>
      </button>

      <div style={{ flex: 1 }} />

      {/* Right side: children (search, bell) + avatar + name — all evenly spaced */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {children}
        <div ref={avatarMenuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.3)" }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#fff" }}>
                {userInitials}
              </div>
            )}
            <span className="hidden sm:inline" style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{userName}</span>
          </button>
          {avatarMenuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 60,
              background: "#415162", borderRadius: 10, padding: "6px 0", minWidth: 160,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}>
              <Link
                to="/profile"
                onClick={() => setAvatarMenuOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", color: "rgba(255,255,255,0.8)", fontSize: 14, textDecoration: "none" }}
              >
                <User style={{ width: 16, height: 16 }} /> Profile
              </Link>
              {onSignOut && (
                <button
                  onClick={() => { onSignOut(); setAvatarMenuOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", color: "rgba(255,255,255,0.8)", fontSize: 14, width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  <LogOut style={{ width: 16, height: 16 }} /> Log out
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation dropdown — triggered by page title */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60]" style={{ top: 56 }} onClick={() => setMenuOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 0,
              left: menuLeft,
              bottom: 0,
              width: 260,
              background: "#415162",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flex: 1, overflowY: "scroll", WebkitOverflowScrolling: "touch" }}>
              <Link to="/" onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm whitespace-nowrap", location.pathname === "/" ? "text-white bg-white/10" : "text-white/70")}>
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
                    <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm whitespace-nowrap", location.pathname === item.path ? "text-white bg-white/10" : "text-white/70")}><I className="h-4 w-4" /> {item.label}</Link>
                  ); })}
                </div>);
              })}
              <div style={{ height: 0.5, background: "rgba(255,255,255,0.15)" }} />
              {isAdmin && (<>
                <div style={{ padding: "6px 16px 2px", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Administration</div>
                <Link to="/admin" onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm whitespace-nowrap", location.pathname === "/admin" ? "text-white bg-white/10" : "text-white/70")}><Shield className="h-4 w-4" /> Admin</Link>
              </>)}
              {onSignOut && (
                <>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm whitespace-nowrap", location.pathname === "/profile" ? "text-white bg-white/10" : "text-white/70")}>
                  <User className="h-4 w-4" /> Profile
                </Link>
                <button onClick={() => { onSignOut(); setMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2.5 text-sm whitespace-nowrap text-white/70 w-full border-none bg-transparent cursor-pointer text-left">
                  <LogOut className="h-4 w-4" /> Log out
                </button>
                </>
              )}
            </div>
          </div>
        </div>
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
