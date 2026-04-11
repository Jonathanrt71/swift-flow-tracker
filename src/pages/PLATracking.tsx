import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";

interface PLAAgreement {
  id: string;
  rotation: string;
  program: string;
  rotation_supervisor: string | null;
  supervisor_email: string | null;
  contact_number: string | null;
  start_date: string | null;
  end_date: string | null;
  gmec_approval_date: string | null;
  comment: string | null;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

const PLATracking = () => {
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ["pla_agreements"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("pla_agreements" as any).select("*").order("program").order("rotation") as any);
      if (error) throw error;
      return (data || []) as PLAAgreement[];
    },
  });

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
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 20, height: 20, border: "2px solid #C9CED4", borderTopColor: "#415162", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
          </div>
        ) : (
          <div style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#2D3748", marginBottom: 10 }}>Participating Learning Agreements</div>
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>Rotation</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>Program</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>Supervisor</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>Email</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>Phone</th>
                    <th style={{ textAlign: "center", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>Start</th>
                    <th style={{ textAlign: "center", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>End</th>
                  </tr>
                </thead>
                <tbody>
                  {agreements.map((a, i) => {
                    const endYear = a.end_date ? new Date(a.end_date + "T00:00:00").getFullYear() : null;
                    const isExpiringSoon = endYear === new Date().getFullYear();
                    return (
                    <tr key={a.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.03)" }}>
                      <td style={{ padding: "8px 10px", color: "#2D3748", fontWeight: 500 }}>{a.rotation}</td>
                      <td style={{ padding: "8px 10px", color: "#5F7285" }}>{a.program}</td>
                      <td style={{ padding: "8px 10px", color: "#2D3748" }}>{a.rotation_supervisor || "—"}</td>
                      <td style={{ padding: "8px 10px", color: "#5F7285", fontSize: 11 }}>{a.supervisor_email || "—"}</td>
                      <td style={{ padding: "8px 10px", color: "#5F7285", whiteSpace: "nowrap" }}>{a.contact_number || "—"}</td>
                      <td style={{ padding: "8px 10px", color: "#5F7285", textAlign: "center", whiteSpace: "nowrap" }}>{formatDate(a.start_date)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap", color: isExpiringSoon ? "#854F0B" : "#5F7285", fontWeight: isExpiringSoon ? 600 : 400, background: isExpiringSoon ? "#FAEEDA" : undefined, borderRadius: isExpiringSoon ? 4 : 0 }}>{formatDate(a.end_date)}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PLATracking;
