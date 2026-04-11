import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import { Search, X, ChevronDown, ChevronUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProcedureLog {
  id: string;
  case_id: string | null;
  resident_name: string;
  pgy_level: number | null;
  date_performed: string | null;
  procedure_name: string;
  role: string | null;
  diagnosis_text: string | null;
  supervisor_name: string | null;
  passed: boolean | null;
  confirmation_status: string | null;
  confirmed_by: string | null;
  date_confirmed: string | null;
  resident_comments: string | null;
  supervisor_comments: string | null;
  patient_gender: string | null;
  location: string | null;
  patient_type: string | null;
}

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "—"; }
};

const roleColor = (role: string | null): string => {
  if (!role) return "#8A9AAB";
  switch (role.toLowerCase()) {
    case "perform": return "#4A846C";
    case "assist": return "#378ADD";
    case "observe": return "#8A9AAB";
    case "participant - sim": return "#534AB7";
    default: return "#5F7285";
  }
};

const ProcedureLogs = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();

  const [filterResident, setFilterResident] = useState<string>("all");
  const [filterProcedure, setFilterProcedure] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "summary">("summary");

  const logsQuery = useQuery({
    queryKey: ["procedure_logs"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedure_logs")
        .select("*")
        .order("date_performed", { ascending: false });
      if (error) throw error;
      return (data || []) as ProcedureLog[];
    },
  });

  const logs = logsQuery.data || [];

  const residents = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => set.add(l.resident_name));
    return Array.from(set).sort();
  }, [logs]);

  const procedures = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => set.add(l.procedure_name));
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    let data = logs;
    if (filterResident !== "all") data = data.filter(l => l.resident_name === filterResident);
    if (filterProcedure !== "all") data = data.filter(l => l.procedure_name === filterProcedure);
    if (filterRole !== "all") data = data.filter(l => (l.role || "").toLowerCase() === filterRole);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(l =>
        l.resident_name.toLowerCase().includes(q) ||
        l.procedure_name.toLowerCase().includes(q) ||
        (l.diagnosis_text || "").toLowerCase().includes(q) ||
        (l.supervisor_name || "").toLowerCase().includes(q)
      );
    }
    return data;
  }, [logs, filterResident, filterProcedure, filterRole, searchQuery]);

  // Summary: per-resident procedure counts
  const summary = useMemo(() => {
    const map = new Map<string, Map<string, { perform: number; assist: number; observe: number; sim: number; total: number }>>();
    const targetLogs = filterProcedure !== "all" || filterRole !== "all" || searchQuery.trim() ? filtered : logs;
    const residentFilter = filterResident !== "all" ? filterResident : null;

    targetLogs.forEach(l => {
      if (residentFilter && l.resident_name !== residentFilter) return;
      if (!map.has(l.resident_name)) map.set(l.resident_name, new Map());
      const procMap = map.get(l.resident_name)!;
      if (!procMap.has(l.procedure_name)) procMap.set(l.procedure_name, { perform: 0, assist: 0, observe: 0, sim: 0, untagged: 0, total: 0 });
      const entry = procMap.get(l.procedure_name)!;
      entry.total++;
      const role = (l.role || "").toLowerCase();
      if (role === "perform") entry.perform++;
      else if (role === "assist") entry.assist++;
      else if (role === "observe") entry.observe++;
      else if (role === "participant - sim") entry.sim++;
      else entry.untagged++;
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, procMap]) => ({
        name,
        procedures: Array.from(procMap.entries())
          .sort((a, b) => b[1].total - a[1].total)
          .map(([proc, counts]) => ({ proc, ...counts })),
        totalCount: Array.from(procMap.values()).reduce((s, c) => s + c.total, 0),
      }));
  }, [logs, filtered, filterResident, filterProcedure, filterRole, searchQuery]);

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
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
              placeholder="Search procedures, residents, supervisors..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "12px 16px 100px" }}>

        {/* Filters — row 1: dropdowns */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Select value={filterResident} onValueChange={setFilterResident}>
            <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff", flex: 1, minWidth: 0, maxWidth: 160, fontSize: 12 }}>
              <SelectValue placeholder="Residents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Residents</SelectItem>
              {residents.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterProcedure} onValueChange={setFilterProcedure}>
            <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff", flex: 1, minWidth: 0, maxWidth: 160, fontSize: 12 }}>
              <SelectValue placeholder="Procedures" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Procedures</SelectItem>
              {procedures.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filters — row 2: toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #C9CED4" }}>
            {([
              { value: "all", label: "All" },
              { value: "perform", label: "Perform" },
              { value: "assist", label: "Assist" },
              { value: "observe", label: "Observe" },
            ]).map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterRole(opt.value)}
                style={{
                  padding: "5px 8px", fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer",
                  background: filterRole === opt.value ? "#415162" : "#fff",
                  color: filterRole === opt.value ? "#fff" : "#5F7285",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #C9CED4" }}>
            {([
              { mode: "summary" as const, label: "Summary" },
              { mode: "list" as const, label: "List" },
            ]).map(opt => (
              <button
                key={opt.mode}
                onClick={() => setViewMode(opt.mode)}
                style={{
                  padding: "5px 10px", fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer",
                  background: viewMode === opt.mode ? "#415162" : "#fff",
                  color: viewMode === opt.mode ? "#fff" : "#5F7285",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {logsQuery.isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <div style={{ width: 20, height: 20, border: "2px solid #C9CED4", borderTopColor: "#415162", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          </div>
        ) : viewMode === "summary" ? (
          // Summary view
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {summary.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "#8A9AAB", fontSize: 14 }}>No data</div>
            ) : summary.map(resident => (
              <div key={resident.name} className="rounded-lg" style={{ background: "#E7EBEF", border: "1px solid #C9CED4", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #D5DAE0" }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#2D3748" }}>{resident.name}</span>
                  <span style={{ fontSize: 12, color: "#8A9AAB" }}>{resident.totalCount} total</span>
                </div>
                <div style={{ padding: "6px 14px 10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto auto", gap: "2px 12px", fontSize: 11 }}>
                    <div style={{ fontWeight: 600, color: "#5F7285", padding: "4px 0", borderBottom: "1px solid #D5DAE0" }}>Procedure</div>
                    <div style={{ fontWeight: 600, color: "#4A846C", padding: "4px 0", textAlign: "center", borderBottom: "1px solid #D5DAE0" }}>Perf</div>
                    <div style={{ fontWeight: 600, color: "#378ADD", padding: "4px 0", textAlign: "center", borderBottom: "1px solid #D5DAE0" }}>Asst</div>
                    <div style={{ fontWeight: 600, color: "#8A9AAB", padding: "4px 0", textAlign: "center", borderBottom: "1px solid #D5DAE0" }}>Obs</div>
                    <div style={{ fontWeight: 600, color: "#D4A017", padding: "4px 0", textAlign: "center", borderBottom: "1px solid #D5DAE0" }}>—</div>
                    <div style={{ fontWeight: 600, color: "#2D3748", padding: "4px 0", textAlign: "center", borderBottom: "1px solid #D5DAE0" }}>Total</div>
                    {resident.procedures.map(p => (
                      <>
                        <div key={p.proc + "-name"} style={{ color: "#2D3748", padding: "3px 0" }}>{p.proc}</div>
                        <div key={p.proc + "-perf"} style={{ color: "#4A846C", textAlign: "center", padding: "3px 0" }}>{p.perform || "—"}</div>
                        <div key={p.proc + "-asst"} style={{ color: "#378ADD", textAlign: "center", padding: "3px 0" }}>{p.assist || "—"}</div>
                        <div key={p.proc + "-obs"} style={{ color: "#8A9AAB", textAlign: "center", padding: "3px 0" }}>{p.observe || "—"}</div>
                        <div key={p.proc + "-untag"} style={{ color: "#D4A017", textAlign: "center", padding: "3px 0" }}>{p.untagged || "—"}</div>
                        <div key={p.proc + "-total"} style={{ color: "#2D3748", fontWeight: 500, textAlign: "center", padding: "3px 0" }}>{p.total}</div>
                      </>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List view
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "#8A9AAB", fontSize: 14 }}>No procedure logs</div>
            ) : filtered.map(log => {
              const isExpanded = expandedId === log.id;
              return (
                <div
                  key={log.id}
                  className="rounded-lg overflow-hidden"
                  style={{ background: "#E7EBEF", border: "1px solid #C9CED4" }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer" }}
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#2D3748" }}>{log.procedure_name}</span>
                        {log.role && (
                          <span style={{
                            fontSize: 9, fontWeight: 600, color: "#fff",
                            background: roleColor(log.role),
                            borderRadius: 3, padding: "1px 5px",
                            textTransform: "uppercase",
                          }}>
                            {log.role === "Participant - SIM" ? "SIM" : log.role}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#8A9AAB" }}>
                        {log.resident_name} · {formatDate(log.date_performed)} {log.supervisor_name ? `· ${log.supervisor_name}` : ""}
                      </div>
                    </div>

                    {log.passed === true && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4A846C", flexShrink: 0 }} />
                    )}
                    {log.passed === false && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c44444", flexShrink: 0 }} />
                    )}

                    {isExpanded ? (
                      <ChevronUp style={{ width: 14, height: 14, color: "#8A9AAB", flexShrink: 0 }} />
                    ) : (
                      <ChevronDown style={{ width: 14, height: 14, color: "#8A9AAB", flexShrink: 0 }} />
                    )}
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "0 12px 10px" }} onClick={(e) => e.stopPropagation()}>
                      {log.diagnosis_text && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 2 }}>Diagnosis / Notes</div>
                          <div style={{ fontSize: 12, color: "#2D3748", lineHeight: 1.5 }}>{log.diagnosis_text}</div>
                        </div>
                      )}
                      {log.resident_comments && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 2 }}>Resident Comments</div>
                          <div style={{ fontSize: 12, color: "#2D3748", lineHeight: 1.5 }}>{log.resident_comments}</div>
                        </div>
                      )}
                      {log.supervisor_comments && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 2 }}>Supervisor Comments</div>
                          <div style={{ fontSize: 12, color: "#2D3748", lineHeight: 1.5 }}>{log.supervisor_comments}</div>
                        </div>
                      )}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: "#5F7285" }}>
                        {log.patient_gender && log.patient_gender !== " " && <span>Gender: {log.patient_gender}</span>}
                        {log.confirmation_status && <span>Status: {log.confirmation_status}</span>}
                        {log.confirmed_by && <span>Confirmed by: {log.confirmed_by}</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProcedureLogs;
