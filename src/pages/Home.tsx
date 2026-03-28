import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";

interface NavItem {
  label: string;
  description?: string;
  path: string;
  color: string;
  icon: React.ReactNode;
}

const Icon = ({ path, color, size = 18 }: { path: string | React.ReactNode; color: string; size?: number }) => (
  <div style={{ width: 36, height: 36, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    {typeof path === "string" ? (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    ) : path}
  </div>
);

const SVGIcon = ({ children, color, size = 18 }: { children: React.ReactNode; color: string; size?: number }) => (
  <div style={{ width: 36, height: 36, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  </div>
);

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9CED4" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
);

const ADMIN_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Clinical",
    items: [
      {
        label: "Feedback", path: "/feedback", color: "#415162",
        icon: <SVGIcon color="#415162"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></SVGIcon>,
      },
      {
        label: "Topics", path: "/topics", color: "#4A846C",
        icon: <SVGIcon color="#4A846C"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></SVGIcon>,
      },
      {
        label: "CBME", path: "/cbme", color: "#52657A",
        icon: <SVGIcon color="#52657A"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></SVGIcon>,
      },
      {
        label: "Events", path: "/events", color: "#D4A017",
        icon: <SVGIcon color="#D4A017"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></SVGIcon>,
      },
    ],
  },
  {
    label: "Program",
    items: [
      {
        label: "Operations", description: "Manual, task templates", path: "/operations", color: "#415162",
        icon: <SVGIcon color="#415162"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></SVGIcon>,
      },
      {
        label: "Meetings", description: "CCC, PEC, GMEC", path: "/meetings", color: "#4A846C",
        icon: <SVGIcon color="#4A846C"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></SVGIcon>,
      },
      {
        label: "Tasks", description: "Assignments & checklists", path: "/tasks", color: "#52657A",
        icon: <SVGIcon color="#52657A"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></SVGIcon>,
      },
      {
        label: "Admin", description: "Users, settings", path: "/admin", color: "#D4A017",
        icon: <SVGIcon color="#D4A017"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></SVGIcon>,
      },
    ],
  },
  {
    label: "Reference",
    items: [
      {
        label: "Handbook", path: "/handbook", color: "#415162",
        icon: <SVGIcon color="#415162"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></SVGIcon>,
      },
      {
        label: "Rotations", path: "/rotations", color: "#4A846C",
        icon: <SVGIcon color="#4A846C"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 1h3a2 2 0 0 1 2 1.72c.1.41.2.81.32 1.2A2 2 0 0 1 7.91 8.5l-.46.46A16 16 0 0 0 13 14.55l.46-.46a2 2 0 0 1 2.11-.45c.39.12.79.22 1.2.32A2 2 0 0 1 18.5 16h.42A2 2 0 0 1 22 16.92z"/></SVGIcon>,
      },
    ],
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startYear = month >= 6 ? year : year - 1;
  return `AY ${startYear}–${(startYear + 1).toString().slice(2)}`;
}

function getDayLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

const Home = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name, display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFirstName((data as any).first_name || (data as any).display_name?.split(" ")[0] || "");
        }
      });
  }, [user]);

  const NavCard = ({ item, full = false }: { item: NavItem; full?: boolean }) => (
    <div
      onClick={() => navigate(item.path)}
      style={{
        background: "#fff",
        border: "1px solid #E7EBEF",
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        transition: "background 0.12s",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#F8F7F5"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#fff"}
    >
      {item.icon}
      {full ? (
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#2D3748" }}>{item.label}</div>
            {item.description && <div style={{ fontSize: 11, color: "#8A9AAB", marginTop: 1 }}>{item.description}</div>}
          </div>
          <ChevronRight />
        </>
      ) : (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#2D3748" }}>{item.label}</div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, padding: "0 16px" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", lineHeight: 1.2 }}>FM Tasks</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>HMC Family Medicine</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <NotificationBell />
            
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px 100px" }}>
        {/* Greeting */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#2D3748", marginBottom: 2 }}>
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </div>
          <div style={{ fontSize: 12, color: "#8A9AAB" }}>{getDayLabel()} · {getAcademicYear()}</div>
        </div>

        {/* Sections */}
        {ADMIN_SECTIONS.map(section => (
          <div key={section.label} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: "#8A9AAB", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
              {section.label}
            </div>
            {/* Clinical uses 2-col grid; Program/Reference use full-width rows */}
            {section.label === "Clinical" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {section.items.map(item => <NavCard key={item.path} item={item} full={false} />)}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {section.items.map(item => <NavCard key={item.path} item={item} full={true} />)}
              </div>
            )}
          </div>
        ))}
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
