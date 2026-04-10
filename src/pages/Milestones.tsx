import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Search, X } from "lucide-react";
import { useState } from "react";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import MilestoneLevelsGrid from "@/components/cbme/MilestoneLevelsGrid";
import MilestonesBrowser from "@/components/feedback/MilestonesBrowser";

const Milestones = () => {
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const [view, setView] = useState<"levels" | "reference">("levels");

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <NotificationBell />
          </HeaderLogo>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 16px 100px" }}>
        <div style={{ display: "flex", gap: 16, borderBottom: "0.5px solid #D5DAE0", paddingBottom: 8, marginBottom: 16 }}>
          <span
            onClick={() => setView("levels")}
            style={{
              fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "1px 0 0 0",
              color: view === "levels" ? "#415162" : "#999",
              borderBottom: view === "levels" ? "2px solid #415162" : "2px solid transparent",
            }}
          >
            Levels
          </span>
          <span
            onClick={() => setView("reference")}
            style={{
              fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "1px 0 0 0",
              color: view === "reference" ? "#415162" : "#999",
              borderBottom: view === "reference" ? "2px solid #415162" : "2px solid transparent",
            }}
          >
            Reference
          </span>
        </div>

        {view === "levels" ? <MilestoneLevelsGrid /> : <MilestonesBrowser />}
      </main>
    </div>
  );
};

export default Milestones;
