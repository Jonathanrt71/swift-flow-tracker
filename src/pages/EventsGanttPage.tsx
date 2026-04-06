import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { ArrowLeft } from "lucide-react";
import EventsGantt from "@/components/events/EventsGantt";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";

const MONTH_ABBRS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const EventsGanttPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const events = useEvents();

  const allEvents = useMemo(() => events.data || [], [events.data]);

  const ganttRangeLabel = useMemo(() => {
    const n = new Date();
    const endDate = new Date(n);
    endDate.setFullYear(endDate.getFullYear() + 1);
    return `${MONTH_ABBRS[n.getMonth()]} ${n.getFullYear()} — ${MONTH_ABBRS[endDate.getMonth()]} ${endDate.getFullYear()}`;
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE", width: "100vw", marginLeft: "calc(-50vw + 50%)", position: "relative" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <NotificationBell />
          </HeaderLogo>
        </div>
      </header>

      <main style={{ padding: "12px 24px 100px" }}>
        {/* Back link + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <button
            onClick={() => navigate("/events")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              color: "#5F7285",
            }}
          >
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2D3748" }}>Events Gantt</span>
          <span style={{ fontSize: 14, fontWeight: 400, color: "#8A9AAB" }}>{ganttRangeLabel}</span>
        </div>

        {/* Gantt chart */}
        {events.isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <EventsGantt events={allEvents} />
        )}
      </main>
    </div>
  );
};

export default EventsGanttPage;
