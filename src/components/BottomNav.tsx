import { Link, useLocation } from "react-router-dom";
import { CheckSquare, Users, Calendar, BookOpen } from "lucide-react";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#415162]">
      <div className="mx-auto max-w-[768px] flex border-t border-border">
      <Link to="/" className="flex-1 flex items-center justify-center py-4 text-white/50">
        <CheckSquare className="h-5 w-5" />
      </Link>
      <Link to="/meetings" className="flex-1 flex items-center justify-center py-4 text-white/50">
        <Users className="h-5 w-5" />
      </Link>
      <Link to="/events" className="flex-1 flex items-center justify-center py-4 text-white/50">
        <Calendar className="h-5 w-5" />
      </Link>
      <Link to="/cbme" className="flex-1 flex items-center justify-center py-4 text-white/50">
        <BookOpen className="h-5 w-5" />
      </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
