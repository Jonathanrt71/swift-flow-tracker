import { Link, useLocation } from "react-router-dom";
import { CheckSquare, Calendar, BookOpen, MessageSquare, Users } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const BottomNav = () => {
  const { isResident } = useUserRole();

  // Residents only see Profile (no bottom nav needed)
  if (isResident) return null;

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
      <Link to="/cbme" className="flex-1 flex items-center justify-center text-white/50">
        <BookOpen className="h-5 w-5" />
      </Link>
      <Link to="/events" className="flex-1 flex items-center justify-center text-white/50">
        <Calendar className="h-5 w-5" />
      </Link>
      <Link to="/feedback" className="flex-1 flex items-center justify-center text-white/50">
        <MessageSquare className="h-5 w-5" />
      </Link>
      <Link to="/" className="flex-1 flex items-center justify-center text-white/50">
        <CheckSquare className="h-5 w-5" />
      </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
