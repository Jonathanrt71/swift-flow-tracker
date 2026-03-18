import { useState, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckSquare, Users, Calendar, BookOpen, MessageSquare, Shield, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/cbme", label: "CBME", icon: BookOpen },
  { path: "/events", label: "Events", icon: Calendar },
  { path: "/feedback", label: "Feedback", icon: MessageSquare },
  { path: "/meetings", label: "Meetings", icon: Users },
  { path: "/", label: "Tasks", icon: CheckSquare },
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
  const currentItem = navItems.find((n) => n.path === location.pathname);
  const Icon = currentItem?.icon || CheckSquare;

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
        <span className="text-base font-medium text-white/85">{currentItem?.label || "Tasks"}</span>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute top-full left-0 mt-2 z-[70] rounded-lg overflow-hidden shadow-lg"
            style={{ background: "#415162", minWidth: 160 }}
          >
            {navItems.map((item) => {
              const ItemIcon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm",
                    isActive ? "text-white bg-white/10" : "text-white/70"
                  )}
                >
                  <ItemIcon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            <div style={{ height: 0.5, background: "rgba(255,255,255,0.15)", margin: "0" }} />

            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm",
                  location.pathname === "/admin" ? "text-white bg-white/10" : "text-white/70"
                )}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm",
                location.pathname === "/profile" ? "text-white bg-white/10" : "text-white/70"
              )}
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            {onSignOut && (
              <button
                onClick={() => { onSignOut(); setMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 w-full border-none bg-transparent cursor-pointer text-left"
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
