import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, ReferenceArea,
  ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";

interface VisitDurationRow {
  id: string;
  week_label: string;
  week_start: string;
  median_minutes: number;
  phase: number;
}

// Compute phase stats from data
function phaseStats(rows: VisitDurationRow[], phase: number) {
  const vals = rows.filter((r) => r.phase === phase).map((r) => r.median_minutes);
  if (vals.length === 0) return { mean: 0, ucl: 0, lcl: 0, n: 0 };
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length - 1);
  const sd = Math.sqrt(variance);
  return { mean: Math.round(mean * 10) / 10, ucl: Math.round((mean + 3 * sd) * 10) / 10, lcl: Math.round((mean - 3 * sd) * 10) / 10, n: vals.length };
}

const VisitDuration = () => {
  const { user, signOut } = useAuth();
  const { isAdmin: isAdminQuery } = useAdmin();
  const isAdmin = !!isAdminQuery.data;
  const { has: hasPerm } = usePermissions();
  const canEdit = isAdmin || hasPerm("visit_duration.edit");
  const queryClient = useQueryClient();

  const [weekLabel, setWeekLabel] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [medianMin, setMedianMin] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["visit_duration"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("visit_duration" as any).select("*").order("week_start", { ascending: true }) as any);
      if (error) throw error;
      return (data || []) as VisitDurationRow[];
    },
  });

  const addRow = useMutation({
    mutationFn: async (row: { week_label: string; week_start: string; median_minutes: number; phase: number }) => {
      const { error } = await (supabase.from("visit_duration" as any).insert(row as any) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visit_duration"] });
      setWeekLabel("");
      setWeekStart("");
      setMedianMin("");
    },
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("visit_duration" as any).delete().eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visit_duration"] }),
  });

  const p1 = phaseStats(rows, 1);
  const p2 = phaseStats(rows, 2);

  // Find the index where phase 2 starts
  const phase2StartIdx = rows.findIndex((r) => r.phase === 2);

  // Build chart data with separate keys per phase for control lines
  const chartData = rows.map((r, i) => ({
    idx: i,
    label: r.week_label,
    value: r.median_minutes,
    phase: r.phase,
    cl: r.phase === 1 ? p1.mean : p2.mean,
    ucl: r.phase === 1 ? p1.ucl : p2.ucl,
    lcl: r.phase === 1 ? p1.lcl : p2.lcl,
    cl1: r.phase === 1 ? p1.mean : undefined,
    ucl1: r.phase === 1 ? p1.ucl : undefined,
    lcl1: r.phase === 1 ? p1.lcl : undefined,
    cl2: r.phase === 2 ? p2.mean : undefined,
    ucl2: r.phase === 2 ? p2.ucl : undefined,
    lcl2: r.phase === 2 ? p2.lcl : undefined,
  }));

  const handleAdd = () => {
    if (!weekLabel.trim() || !weekStart || !medianMin) return;
    addRow.mutate({ week_label: weekLabel.trim(), week_start: weekStart, median_minutes: parseInt(medianMin), phase: 2 });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: "#fff", border: "1px solid #C9CED4", borderRadius: 6, padding: "8px 12px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
        <div style={{ fontWeight: 600, color: "#2D3748", marginBottom: 2 }}>{d.label}</div>
        <div style={{ color: "#415162" }}>Median: <strong>{d.value} min</strong></div>
        <div style={{ color: "#8A9AAB", fontSize: 11 }}>CL: {d.cl} · UCL: {d.ucl} · LCL: {d.lcl}</div>
      </div>
    );
  };

  // Dot renderer — red if outside limits
  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const oob = payload.value > payload.ucl || payload.value < payload.lcl;
    return <circle cx={cx} cy={cy} r={oob ? 4.5 : 2.5} fill={oob ? "#A04040" : "#415162"} stroke="none" />;
  };

  // Y axis range
  const allVals = rows.map((r) => r.median_minutes);
  const yMin = Math.max(0, Math.floor((Math.min(...allVals, p1.lcl, p2.lcl) - 5) / 10) * 10);
  const yMax = Math.ceil((Math.max(...allVals, p1.ucl, p2.ucl) + 5) / 10) * 10;

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <NotificationBell />
          </HeaderLogo>
        </div>
      </header>

      <main style={{ padding: "12px 24px 100px", maxWidth: 1200, margin: "0 auto" }}>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 20, height: 20, border: "2px solid #C9CED4", borderTopColor: "#415162", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#6B7280", fontSize: 14 }}>No data yet.</div>
        ) : (
          <>
            {/* Summary pills + Add button */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#E7EBEF", borderRadius: 8, padding: "10px 16px" }}>
                <div style={{ fontSize: 11, color: "#5F7285", marginBottom: 2 }}>AY 2024-25</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#415162" }}>
                  CL {p1.mean} <span style={{ fontWeight: 400, fontSize: 12, color: "#5F7285" }}>· UCL {p1.ucl} · LCL {p1.lcl} · n={p1.n}</span>
                </div>
              </div>
              <div style={{ background: "#E4F0EB", borderRadius: 8, padding: "10px 16px" }}>
                <div style={{ fontSize: 11, color: "#3B6D11", marginBottom: 2 }}>AY 2025-26</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#27500A" }}>
                  CL {p2.mean} <span style={{ fontWeight: 400, fontSize: 12, color: "#3B6D11" }}>· UCL {p2.ucl} · LCL {p2.lcl} · n={p2.n}</span>
                </div>
              </div>
              {canEdit && (
                <span
                  onClick={() => {
                    const form = document.getElementById("add-form");
                    if (form) form.style.display = form.style.display === "none" ? "flex" : "none";
                  }}
                  style={{
                    fontSize: 13, fontWeight: 600, color: "#415162", background: "#E7EBEF",
                    padding: "4px 12px", borderRadius: 6, cursor: "pointer", userSelect: "none",
                    marginLeft: "auto",
                  }}
                >
                  Add
                </span>
              )}
            </div>

            {/* Add form (hidden by default) */}
            {canEdit && (
              <div id="add-form" style={{ display: "none", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Week label (e.g. 4/7 - 4/11)"
                  value={weekLabel}
                  onChange={(e) => setWeekLabel(e.target.value)}
                  style={{ fontSize: 13, padding: "5px 10px", border: "1px solid #C9CED4", borderRadius: 6, outline: "none", width: 170, background: "#fff", color: "#333" }}
                />
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  style={{ fontSize: 13, padding: "5px 10px", border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", color: "#333" }}
                />
                <input
                  type="number"
                  placeholder="Median (min)"
                  value={medianMin}
                  onChange={(e) => setMedianMin(e.target.value)}
                  style={{ fontSize: 13, padding: "5px 10px", border: "1px solid #C9CED4", borderRadius: 6, outline: "none", width: 110, background: "#fff", color: "#333" }}
                />
                <button
                  onClick={handleAdd}
                  disabled={!weekLabel.trim() || !weekStart || !medianMin || addRow.isPending}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: "6px 16px", borderRadius: 6, border: "none",
                    background: "#415162", color: "#fff", cursor: "pointer", opacity: (!weekLabel.trim() || !weekStart || !medianMin) ? 0.4 : 1,
                  }}
                >
                  {addRow.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            )}

            {/* Control chart */}
            <div style={{ background: "#fff", border: "1px solid #D5DAE0", borderRadius: 10, padding: "16px 12px 8px", marginBottom: 20 }}>
              <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <div style={{ minWidth: 900, height: 420 }}>
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 60, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7EBEF" />

                  {/* Phase shading */}
                  {phase2StartIdx > 0 && (
                    <>
                      <ReferenceArea x1={0} x2={phase2StartIdx - 1} fill="#415162" fillOpacity={0.04} />
                      <ReferenceArea x1={phase2StartIdx} x2={chartData.length - 1} fill="#4A846C" fillOpacity={0.04} />
                    </>
                  )}

                  {/* Phase divider */}
                  {phase2StartIdx > 0 && (
                    <ReferenceLine x={phase2StartIdx} stroke="#C9CED4" strokeDasharray="4 4" strokeWidth={1} />
                  )}

                  <XAxis
                    dataKey="idx"
                    tickFormatter={(i: number) => chartData[i]?.label || ""}
                    tick={{ fontSize: 10, fill: "#8A9AAB" }}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={{ stroke: "#D5DAE0" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    domain={[yMin, yMax]}
                    tick={{ fontSize: 11, fill: "#8A9AAB" }}
                    tickLine={false}
                    axisLine={{ stroke: "#D5DAE0" }}
                    tickFormatter={(v: number) => `${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />

                  {/* Phase 1 CL */}
                  <Line type="linear" dataKey="cl1" stroke="#415162" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />
                  {/* Phase 1 UCL */}
                  <Line type="linear" dataKey="ucl1" stroke="#A04040" strokeWidth={1.2} strokeDasharray="6 4" dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />
                  {/* Phase 1 LCL */}
                  <Line type="linear" dataKey="lcl1" stroke="#A04040" strokeWidth={1.2} strokeDasharray="6 4" dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />
                  {/* Phase 2 CL */}
                  <Line type="linear" dataKey="cl2" stroke="#4A846C" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />
                  {/* Phase 2 UCL */}
                  <Line type="linear" dataKey="ucl2" stroke="#A04040" strokeWidth={1.2} strokeDasharray="6 4" dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />
                  {/* Phase 2 LCL */}
                  <Line type="linear" dataKey="lcl2" stroke="#A04040" strokeWidth={1.2} strokeDasharray="6 4" dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />

                  {/* Data line */}
                  <Line
                    type="linear"
                    dataKey="value"
                    stroke="#415162"
                    strokeWidth={1.5}
                    dot={renderDot}
                    activeDot={{ r: 5, fill: "#415162" }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
              </div>
            </div>

            {/* Data table */}
            <div style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4", borderRadius: 12, padding: "14px 16px", maxWidth: 520 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#2D3748", marginBottom: 10 }}>Data</div>
              <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "30%" }} />
                  {canEdit && <col style={{ width: "10%" }} />}
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>Week</th>
                    <th style={{ textAlign: "center", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>Median</th>
                    <th style={{ textAlign: "center", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>Phase</th>
                    {canEdit && <th style={{ padding: "6px 10px", borderBottom: "1px solid #D5DAE0" }} />}
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().slice(0, 10).map((r, i) => (
                    <tr key={r.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.03)" }}>
                      <td style={{ padding: "8px 10px", color: "#2D3748", fontWeight: 500 }}>{r.week_label}</td>
                      <td style={{ padding: "8px 10px", color: "#2D3748", fontWeight: 500, textAlign: "center" }}>{r.median_minutes}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 500,
                          background: r.phase === 1 ? "#D6DEE6" : "#E4F0EB",
                          color: r.phase === 1 ? "#415162" : "#27500A",
                        }}>
                          {r.phase === 1 ? "AY 24-25" : "AY 25-26"}
                        </span>
                      </td>
                      {canEdit && (
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <button
                            onClick={() => { if (confirm("Delete this entry?")) deleteRow.mutate(r.id); }}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#C9CED4", fontSize: 14, padding: 2 }}
                          >
                            ×
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {rows.length > 10 && (
                <div style={{ fontSize: 11, color: "#8A9AAB", textAlign: "center", padding: "8px 0 0" }}>
                  Showing 10 most recent of {rows.length} entries
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default VisitDuration;
