import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckSquare, Users, Calendar, BookOpen, MessageSquare, Shield, User, LogOut, BookMarked, Stethoscope, ClipboardList, BookOpenCheck, Home, ShieldCheck, FileText, Megaphone, FileCheck, CalendarDays, Activity, UserCheck, BarChart2, Clock, Heart } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCategory } from "@/contexts/UserCategoryContext";
import { supabase } from "@/integrations/supabase/client";

interface NavEntry {
  path: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  permissionKey?: string;
}

const allNavItems: NavEntry[] = [
  { path: "/",            label: "The App",       icon: Home },
  { path: "/cbme",        label: "Competencies",  icon: BookOpen,      permissionKey: "cbme.view" },
  { path: "/events",      label: "Events",       icon: Calendar,      permissionKey: "events.view" },
  { path: "/feedback",    label: "Feedback",     icon: MessageSquare, permissionKey: "feedback.view" },
  { path: "/evaluations", label: "Evaluations",  icon: FileCheck,     permissionKey: "evaluations.view" },
  { path: "/procedure-logs", label: "Procedures", icon: Activity,     permissionKey: "procedures.view" },
  { path: "/resident-summary", label: "Resident Summary", icon: UserCheck, permissionKey: "resident_summary.view" },
  { path: "/topics",      label: "Topics",       icon: BookOpenCheck, permissionKey: "topics.view" },
  { path: "/compliance",  label: "ACGME Handbook", icon: ShieldCheck,   permissionKey: "compliance.view" },
  { path: "/schedule",    label: "Block Matrix",  icon: CalendarDays,  permissionKey: "schedule.view" },
  { path: "/announcements", label: "Announcements", icon: Megaphone, permissionKey: "announcements.view" },
  { path: "/meetings",    label: "Meetings",     icon: Users,         permissionKey: "meetings.view" },
  { path: "/tasks",       label: "Priorities & Tasks", icon: CheckSquare,   permissionKey: "tasks.view" },
  { path: "/gme-handbook",label: "GME Handbook", icon: FileText,      permissionKey: "gme_handbook.view" },
  { path: "/handbook",    label: "Program Handbook", icon: BookMarked, permissionKey: "handbook.view" },
  { path: "/rotations",   label: "Rotations",    icon: Stethoscope,   permissionKey: "rotations.view" },
  { path: "/milestones",  label: "Milestones",   icon: BarChart2,     permissionKey: "cbme.view" },
  { path: "/visit-duration", label: "Visit Duration", icon: Clock, permissionKey: "visit_duration.view" },
  { path: "/patient-satisfaction", label: "Patient Satisfaction", icon: Heart, permissionKey: "patient_satisfaction.view" },
];

interface NavSection { label: string; paths: string[]; }
const navSections: NavSection[] = [
  { label: "Curriculum", paths: ["/rotations", "/topics"] },
  { label: "Evaluation", paths: ["/cbme", "/evaluations", "/feedback", "/milestones", "/procedure-logs", "/resident-summary"] },
  { label: "Program",    paths: ["/events", "/schedule", "/announcements", "/meetings", "/visit-duration", "/patient-satisfaction"] },
  { label: "Reference",  paths: ["/compliance", "/gme-handbook", "/handbook"] },
];

// Kill every possible browser highlight on interactive elements
const noFlash: React.CSSProperties = {
  background: "none",
  border: "none",
  outline: "none",
  padding: 0,
  margin: 0,
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
  WebkitAppearance: "none",
  userSelect: "none",
  boxShadow: "none",
  color: "inherit",
};

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
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuLeft, setMenuLeft] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();
  const { has: hasPerm } = usePermissions();
  const { settings } = useAppSettings();
  const { activeCategory } = useUserCategory();
  const navImageUrl = settings.nav_image_url || "/yosemite-header.png";
  const { userName, userInitials, avatarUrl } = useUserProfile();

  const currentItem = allNavItems.find((n) => n.path === location.pathname)
    || (location.pathname === "/admin" ? { path: "/admin", label: "Admin", icon: Shield, permissionKey: "admin.all" } as NavEntry : undefined)
    || (location.pathname === "/profile" ? { path: "/profile", label: "Profile", icon: User } as NavEntry : undefined);

  // Logo: long-press → image viewer, short tap → home
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageOpenedAt = useRef(0);
  const startPress = useCallback(() => {
    longPressTimer.current = setTimeout(() => { imageOpenedAt.current = Date.now(); setImageOpen(true); }, 500);
  }, []);
  const endLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; navigate("/"); }
  }, [navigate]);
  const cancelPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);
  const closeImage = useCallback(() => {
    if (Date.now() - imageOpenedAt.current < 600) return; setImageOpen(false);
  }, []);

  // Lock body scroll when nav open — use overflow instead of position to avoid repaint flash
  useEffect(() => {
    if (!menuOpen) return;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [menuOpen]);

  // Dropdown left position from header
  useEffect(() => {
    if (menuOpen && containerRef.current) {
      const headerEl = containerRef.current.closest("header");
      if (headerEl) {
        setMenuLeft(headerEl.getBoundingClientRect().left);
      } else {
        const wrapper = containerRef.current.closest(".mx-auto");
        setMenuLeft(wrapper ? wrapper.getBoundingClientRect().left : 0);
      }
    }
  }, [menuOpen]);

  // Close avatar menu on outside click
  useEffect(() => {
    if (!avatarMenuOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) setAvatarMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [avatarMenuOpen]);

  const navLink = (active: boolean): React.CSSProperties => ({
    ...noFlash,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 16px",
    fontSize: 14,
    whiteSpace: "nowrap",
    textDecoration: "none",
    color: active ? "#fff" : "rgba(255,255,255,0.7)",
    background: active ? "rgba(255,255,255,0.1)" : "transparent",
  });

  return (
    <div ref={containerRef} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, position: "relative" }}>

      {/* Image with home badge overlay — tap=home, long press=image viewer */}
      <div
        onMouseDown={startPress} onMouseUp={endLongPress} onMouseLeave={cancelPress}
        onTouchStart={startPress} onTouchEnd={(e) => { e.preventDefault(); endLongPress(); }} onTouchCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        style={{ ...noFlash, position: "relative", width: 32, height: 32, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}
      >
        <img src={navImageUrl} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", pointerEvents: "none", display: "block" }} draggable={false} />
        <div style={{ position: "absolute", bottom: -1, right: -1, width: 15, height: 15, background: "#415162", borderRadius: "4px 0 6px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Home style={{ width: 9, height: 9, color: "#fff" }} />
        </div>
      </div>

      {/* Page title + chevron → opens dropdown */}
      <div
        onClick={() => setMenuOpen(!menuOpen)}
        style={{ ...noFlash, display: "flex", alignItems: "center", gap: 4 }}
      >
        <span style={{ fontSize: 16, fontWeight: 500, color: "#fff", whiteSpace: "nowrap" }}>
          {currentItem?.label || "The App"}
        </span>
        {isAdmin && (
          <span style={{
            fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.5)",
            background: "rgba(255,255,255,0.12)", borderRadius: 3,
            padding: "1px 4px", marginLeft: 2, letterSpacing: "0.02em",
          }}>
            {activeCategory === "FM" ? "F" : "G"}
          </span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div style={{ flex: 1 }} />

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {children}

        {/* Avatar dropdown */}
        <div ref={avatarMenuRef} style={{ position: "relative" }}>
          <div
            onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
            style={{ ...noFlash, display: "flex", alignItems: "center", gap: 8 }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.3)" }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#fff" }}>
                {userInitials}
              </div>
            )}
            <span style={{ fontSize: 13, fontWeight: 500, color: "#fff", display: "none" }} className="sm:!inline">{userName}</span>
          </div>

          {avatarMenuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 60,
              background: "#415162", borderRadius: 10, padding: "6px 0", minWidth: 160,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}>
              <Link to="/profile" onClick={() => setAvatarMenuOpen(false)} style={navLink(location.pathname === "/profile")}>
                <User style={{ width: 16, height: 16 }} /> Profile
              </Link>
              {onSignOut && (
                <div onClick={() => { onSignOut(); setAvatarMenuOpen(false); }} style={navLink(false)}>
                  <LogOut style={{ width: 16, height: 16 }} /> Log out
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation panel */}
      {/* Backdrop — always in DOM, toggle pointer events and visibility */}
      <div
        style={{
          position: "fixed", inset: 0, top: 56, zIndex: 60,
          pointerEvents: menuOpen ? "auto" : "none",
          visibility: menuOpen ? "visible" : "hidden",
        }}
        onClick={() => setMenuOpen(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", top: 0, left: menuLeft, bottom: 0, width: 260,
            background: "#415162", display: "flex", flexDirection: "column",
            transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.15s ease-out",
          }}
        >
            <div style={{ flex: 1, overflowY: "scroll", WebkitOverflowScrolling: "touch" }}>

              {/* Priorities & Tasks — top item, no section header */}
              {(() => {
                const tasksItem = allNavItems.find(n => n.path === "/tasks");
                if (!tasksItem || (tasksItem.permissionKey && !hasPerm(tasksItem.permissionKey, "view"))) return null;
                const I = tasksItem.icon;
                return (
                  <Link to={tasksItem.path} onClick={() => setMenuOpen(false)} style={navLink(location.pathname === tasksItem.path)}>
                    <I style={{ width: 16, height: 16 }} /> {tasksItem.label}
                  </Link>
                );
              })()}

              {navSections.map((section, si) => {
                const items = section.paths
                  .map(p => allNavItems.find(n => n.path === p))
                  .filter((item): item is NavEntry => !!item && (!item.permissionKey || hasPerm(item.permissionKey, "view")))
                  .sort((a, b) => a.label.localeCompare(b.label));
                if (!items.length) return null;
                return (
                  <div key={section.label}>
                    {si > 0 && <div style={{ height: 0.5, background: "rgba(255,255,255,0.15)" }} />}
                    <div style={{ padding: "6px 16px 2px", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
                      {section.label}
                    </div>
                    {items.map(item => {
                      const I = item.icon;
                      return (
                        <Link key={item.path} to={item.path} onClick={() => setMenuOpen(false)} style={navLink(location.pathname === item.path)}>
                          <I style={{ width: 16, height: 16 }} /> {item.label}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}

              <div style={{ height: 0.5, background: "rgba(255,255,255,0.15)" }} />
              {isAdmin && (
                <>
                  <div style={{ padding: "6px 16px 2px", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
                    Administration
                  </div>
                  <Link to="/admin" onClick={() => setMenuOpen(false)} style={navLink(location.pathname === "/admin")}>
                    <Shield style={{ width: 16, height: 16 }} /> Admin
                  </Link>
                </>
              )}
              {onSignOut && (
                <>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} style={navLink(location.pathname === "/profile")}>
                    <User style={{ width: 16, height: 16 }} /> Profile
                  </Link>
                  <div onClick={() => { onSignOut(); setMenuOpen(false); }} style={navLink(false)}>
                    <LogOut style={{ width: 16, height: 16 }} /> Log out
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      {/* Image viewer (long-press logo) */}
      {imageOpen && (
        <div
          onClick={closeImage}
          onTouchEnd={(e) => { if (Date.now() - imageOpenedAt.current < 600) { e.preventDefault(); e.stopPropagation(); } }}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <img src={navImageUrl} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
};

export default HeaderLogo;
