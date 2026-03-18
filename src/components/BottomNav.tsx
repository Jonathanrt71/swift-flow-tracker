import { Link, useLocation } from "react-router-dom";
import { CheckSquare, Users, Calendar, BookOpen, MessageSquare } from "lucide-react";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[768px] z-50 bg-[#415162]" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex border-t border-border">
      <Link to="/cbme" className="flex-1 flex items-center justify-center pt-3 pb-1 text-white/50">
        <BookOpen className="h-5 w-5" />
      </Link>
      <Link to="/events" className="flex-1 flex items-center justify-center pt-3 pb-1 text-white/50">
        <Calendar className="h-5 w-5" />
      </Link>
      <Link to="/feedback" className="flex-1 flex items-center justify-center pt-3 pb-1 text-white/50">
        <MessageSquare className="h-5 w-5" />
      </Link>
      <Link to="/meetings" className="flex-1 flex items-center justify-center pt-3 pb-1 text-white/50">
        <Users className="h-5 w-5" />
      </Link>
      <Link to="/" className="flex-1 flex items-center justify-center pt-3 pb-1 text-white/50">
        <CheckSquare className="h-5 w-5" />
      </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
