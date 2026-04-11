import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import { GraduationCap } from "lucide-react";

const FacultyDevelopment = () => {
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={!!isAdmin} onSignOut={signOut}>
            <NotificationBell />
          </HeaderLogo>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "12px 16px 100px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E7EBEF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <GraduationCap style={{ width: 24, height: 24, color: "#8A9AAB" }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#2D3748", marginBottom: 6 }}>
            Faculty Development
          </h1>
          <p style={{ fontSize: 14, color: "#8A9AAB" }}>Coming soon</p>
        </div>
      </main>
    </div>
  );
};

export default FacultyDevelopment;
