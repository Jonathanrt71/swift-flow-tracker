import { Link, useLocation } from "react-router-dom";
import { CheckSquare, Calendar, BookOpen, BookMarked, Stethoscope, MessageSquare, ClipboardList, BookOpenCheck, Home, Shield, FileText } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

type AllowedRole = "admin" | "faculty" | "resident";

const allNavItems = [
  { path: "/",        icon: Home,          allowed: ["admin", "faculty", "resident"] as AllowedRole[] },
  { path: "/feedback",icon: MessageSquare, allowed: ["admin", "faculty"] as AllowedRole[] },
  { path: "/events",  icon: Calendar,      allowed: ["admin", "faculty"] as AllowedRole[] },
  { path: "/tasks",   icon: CheckSquare,   allowed: ["admin"] as AllowedRole[] },
  { path: "/cbme",    icon: BookOpen,      allowed: ["admin"] as AllowedRole[] },
  { path: "/handbook",icon: BookMarked,    allowed: ["faculty", "resident"] as AllowedRole[] },
  { path: "/gme-handbook",icon: FileText, allowed: ["admin", "faculty"] as AllowedRole[] },
  { path: "/topics",  icon: BookOpenCheck, allowed: ["faculty", "resident"] as AllowedRole[] },
  { path: "/rotations",icon: Stethoscope,  allowed: ["resident"] as AllowedRole[] },
  { path: "/operations",icon: ClipboardList, allowed: ["faculty"] as AllowedRole[] },
  { path: "/compliance",icon: Shield, allowed: ["admin"] as AllowedRole[] },
];

const BottomNav = () => {
  const { role } = useUserRole();

  const navItems = allNavItems.filter((item) =>
    item.allowed.includes(role as AllowedRole)
  );

  // If only one or zero items visible, no point showing the nav
  if (navItems.length <= 1) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#415162]"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      <div className="flex max-w-[1200px] mx-auto pt-3 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex-1 flex items-center justify-center text-white/50"
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
