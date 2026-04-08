import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Search, X } from "lucide-react";
import { useState } from "react";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import MilestoneLevelsGrid from "@/components/cbme/MilestoneLevelsGrid";

const Milestones = () => {
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();

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
        <MilestoneLevelsGrid />
      </main>
    </div>
  );
};

export default Milestones;
