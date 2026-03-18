import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckSquare, Users, Calendar, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Tasks", icon: CheckSquare },
  { path: "/meetings", label: "Meetings", icon: Users },
  { path: "/events", label: "Events", icon: Calendar },
  { path: "/cbme", label: "CBME", icon: BookOpen },
];

const HeaderLogo = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const currentItem = navItems.find((n) => n.path === location.pathname);
  const Icon = currentItem?.icon || CheckSquare;

  return (
    <div className="relative flex items-center gap-2.5">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="w-8 h-8 rounded-md overflow-hidden border-none cursor-pointer p-0 bg-transparent"
      >
        <img src="/yosemite-header.png" alt="" className="w-8 h-8 rounded-md object-cover" />
      </button>
      <Icon className="h-[18px] w-[18px] text-white" />

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
                    "flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                    isActive ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  <ItemIcon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default HeaderLogo;
