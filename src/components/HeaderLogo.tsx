import { useState, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckSquare, Users, Calendar, BookOpen, MessageSquare, Shield, User, LogOut, BookMarked, Stethoscope, ClipboardList, BookOpenCheck, Home, ShieldCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

interface NavEntry {
  path: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  permissionKey?: string; // if absent, always visible
}

const allNavItems: NavEntry[] = [
  { path: "/",            label: "FM App",       icon: Home },
  { path: "/cbme",        label: "CBME",         icon: BookOpen,      permissionKey: "cbme.view" },
  { path: "/events",      label: "Events",       icon: Calendar,      permissionKey: "events.view" },
  { path: "/feedback",    label: "Feedback",     icon: MessageSquare, permissionKey: "feedback.view" },
  { path: "/topics",      label: "Topics",       icon: BookOpenCheck, permissionKey: "topics.view" },
  { path: "/compliance",  label: "Compliance",   icon: ShieldCheck,   permissionKey: "compliance.view" },
  { path: "/meetings",    label: "Meetings",     icon: Users,         permissionKey: "meetings.view" },
  { path: "/operations",  label: "Operations",   icon: ClipboardList, permissionKey: "operations.view" },
  { path: "/tasks",       label: "Tasks",        icon: CheckSquare,   permissionKey: "tasks.view" },
  { path: "/gme-handbook",label: "GME Handbook", icon: FileText,      permissionKey: "gme_handbook.view" },
  { path: "/handbook",    label: "Handbook",     icon: BookMarked,    permissionKey: "handbook.view" },
  { path: "/rotations",   label: "Rotations",    icon: Stethoscope },
];

interface NavSection { label: string; paths: string[]; }
const navSections: NavSection[] = [
  { label: "Clinical",  paths: ["/cbme", "/events", "/feedback", "/topics"] },
  { label: "Program",   paths: ["/compliance", "/meetings", "/operations", "/tasks"] },
  { label: "Reference", paths: ["/gme-handbook", "/handbook", "/rotations"] },
];

const HeaderLogo = ({
  isAdmin,
  onSignOut,
}: {
  isAdmin?: boolean;
  onSignOut?: () => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { has: hasPerm } = usePermissions();
  const currentItem = allNavItems.find((n) => n.path === location.pathname)
    || (location.pathname === "/admin" ? { path: "/admin", label: "Admin", icon: Shield, permissionKey: "admin.all" } as NavEntry : undefined)
    || (location.pathname === "/profile" ? { path: "/profile", label: "Profile", icon: User } as NavEntry : undefined);
  const Icon = currentItem?.icon || User;

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const imageOpenedAt = useRef(0);

  const startPress = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      imageOpenedAt.current = Date.now();
      setImageOpen(true);
    }, 500);
  }, []);

  const endLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const cancelPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const closeImage = useCallback(() => {
    if (Date.now() - imageOpenedAt.current < 600) return;
    setImageOpen(false);
  }, []);

  return (
    <div className="relative flex items-center gap-2.5">
      <button
        onMouseDown={startPress}
        onMouseUp={endLongPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={(e) => { e.preventDefault(); endLongPress(); }}
        onTouchCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        className="w-8 h-8 rounded-md overflow-hidden border-none cursor-pointer p-0 bg-transparent select-none"
      >
        <img src="/yosemite-header.png" alt="" className="w-8 h-8 rounded-md object-cover pointer-events-none" draggable={false} />
      </button>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="border-none cursor-pointer p-0 bg-transparent"
      >
        <span className="text-base font-medium text-white">{currentItem?.label || "FM App"}</span>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute top-full left-0 mt-2 z-[70] rounded-lg overflow-hidden shadow-lg"
            style={{ background: "#415162", minWidth: 180 }}
          >
            {/* Home */}
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm",
                location.pathname === "/" ? "text-white bg-white/10" : "text-white/70"
              )}
            >
              <Home className="h-4 w-4" />
              FM App
            </Link>

            <div style={{ height: 0.5, background: "rgba(255,255,255,0.15)" }} />

            {/* Sectioned nav */}
            {navSections.map((section, si) => {
              const sectionItems = section.paths
                .map(p => allNavItems.find(n => n.path === p))
                .filter((item): item is NavEntry => !!item && (!item.permissionKey || hasPerm(item.permissionKey, "view")));
              if (sectionItems.length === 0) return null;
              return (
                <div key={section.label}>
                  {si > 0 && <div style={{ height: 0.5, background: "rgba(255,255,255,0.15)" }} />}
                  <div style={{ padding: "6px 16px 2px", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
                    {section.label}
                  </div>
                  {sectionItems.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm",
                          isActive ? "text-white bg-white/10" : "text-white/70"
                        )}
                      >
                        <ItemIcon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              );
            })}

            <div style={{ height: 0.5, background: "rgba(255,255,255,0.15)" }} />

            {/* Admin */}
            {isAdmin && (
              <>
                <div style={{ padding: "6px 16px 2px", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
                  Administration
                </div>
                <Link
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm",
                    location.pathname === "/admin" ? "text-white bg-white/10" : "text-white/70"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              </>
            )}
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm",
                location.pathname === "/profile" ? "text-white bg-white/10" : "text-white/70"
              )}
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            {onSignOut && (
              <button
                onClick={() => { onSignOut(); setMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 w-full border-none bg-transparent cursor-pointer text-left"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            )}
          </div>
        </>
      )}

      {imageOpen && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center"
            onClick={closeImage}
            onTouchEnd={(e) => {
              if (Date.now() - imageOpenedAt.current < 600) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <img
              src="/yosemite-header.png"
              alt="Yosemite"
              className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default HeaderLogo;
