import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useEvents } from "@/hooks/useEvents";
import { useEventCategories } from "@/hooks/useEventCategories";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { ArrowLeft, Search, X } from "lucide-react";
import EventsGantt from "@/components/events/EventsGantt";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";

const EventsGanttPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { events } = useEvents();
  const { categories, categoryLabels } = useEventCategories();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const filteredEvents = useMemo(() => {
    const all = events.data || [];
    const byCategory = activeCategory === "all" ? all : all.filter((e) => e.category === activeCategory);
    if (!searchQuery.trim()) return byCategory;
    const q = searchQuery.toLowerCase();
    return byCategory.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q))
    );
  }, [events.data, activeCategory, searchQuery]);

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE", width: "100vw", marginLeft: "calc(-50vw + 50%)", position: "relative", overflowX: "hidden" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <button
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: "rgba(255,255,255,0.8)" }}
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(""); }}
            >
              {searchOpen ? <X style={{ width: 17, height: 17 }} /> : <Search style={{ width: 17, height: 17 }} />}
            </button>
            <NotificationBell />
          </HeaderLogo>
        </div>
        {searchOpen && (
          <div style={{ padding: "0 16px 12px" }}>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}
      </header>

      <main style={{ padding: "12px 24px 100px" }}>
        {/* Back link + category tabs row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #D5DAE0", marginBottom: 12 }}>
          <button
            onClick={() => navigate("/events")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#5F7285",
              flexShrink: 0,
            }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>

          <button
            onClick={() => setActiveCategory("all")}
            style={{
              padding: "6px 0",
              marginRight: 20,
              border: "none",
              borderBottom: activeCategory === "all" ? "2px solid #415162" : "2px solid transparent",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeCategory === "all" ? 700 : 500,
              background: "transparent",
              color: activeCategory === "all" ? "#415162" : "#8A9AAB",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              style={{
                padding: "6px 0",
                marginRight: 20,
                border: "none",
                borderBottom: activeCategory === cat.name ? "2px solid #415162" : "2px solid transparent",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: activeCategory === cat.name ? 700 : 500,
                background: "transparent",
                color: activeCategory === cat.name ? "#415162" : "#8A9AAB",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Gantt chart */}
        {events.isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <div style={{ width: 20, height: 20, border: "2px solid #C9CED4", borderTopColor: "#415162", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          </div>
        ) : (
          <EventsGantt events={filteredEvents} />
        )}
      </main>
    </div>
  );
};

export default EventsGanttPage;
