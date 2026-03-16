import { Link, useLocation } from "react-router-dom";
import { CheckSquare, Users, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-[hsl(33,22%,88%)] flex">
      <Link
        to="/"
        className={cn(
          "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px]",
          isActive("/") ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <CheckSquare className="h-5 w-5" />
        Tasks
      </Link>
      <Link
        to="/meetings"
        className={cn(
          "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px]",
          isActive("/meetings") ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <Users className="h-5 w-5" />
        Meetings
      </Link>
      <Link
        to="/events"
        className={cn(
          "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px]",
          isActive("/events") ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <Calendar className="h-5 w-5" />
        Events
      </Link>
    </nav>
  );
};

export default BottomNav;
