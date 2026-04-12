import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import { PreceptingTab, RoomTimeTab } from "@/pages/VisitMetrics";
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

// Compute phase median for run chart
function phaseMedian(rows: VisitDurationRow[], phase: number) {
  const vals = rows.filter((r) => r.phase === phase).map((r) => r.median_minutes).sort((a, b) => a - b);
  if (vals.length === 0) return { median: 0, n: 0 };
  const mid = Math.floor(vals.length / 2);
  const median = vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
  return { median: Math.round(median * 10) / 10, n: vals.length };
}

// Run chart signal detection
type Signal = { startIdx: number; endIdx: number; type: "shift" | "trend" };

function detectRunChartSignals(chartData: { value: number; median: number }[]): Signal[] {
  const signals: Signal[] = [];

  // Shift detection: 6+ consecutive points all above or all below the median
  let runStart = 0;
  let runSide: "above" | "below" | null = null;
  for (let i = 0; i < chartData.length; i++) {
    const d = chartData[i];
    const side = d.value > d.median ? "above" : d.value < d.median ? "below" : null;
    if (side === null) {
      // Point on median — check if prior run qualifies
      if (runSide !== null && i - runStart >= 6) {
        signals.push({ startIdx: runStart, endIdx: i - 1, type: "shift" });
      }
      runStart = i + 1;
      runSide = null;
    } else if (side !== runSide) {
      if (runSide !== null && i - runStart >= 6) {
        signals.push({ startIdx: runStart, endIdx: i - 1, type: "shift" });
      }
      runStart = i;
      runSide = side;
    }
  }
  if (runSide !== null && chartData.length - runStart >= 6) {
    signals.push({ startIdx: runStart, endIdx: chartData.length - 1, type: "shift" });
  }

  // Trend detection: 5+ consecutive points all increasing or all decreasing
  let trendStart = 0;
  let trendDir: "up" | "down" | null = null;
  for (let i = 1; i < chartData.length; i++) {
    const dir = chartData[i].value > chartData[i - 1].value ? "up" : chartData[i].value < chartData[i - 1].value ? "down" : null;
    if (dir === null || (trendDir !== null && dir !== trendDir)) {
      if (trendDir !== null && i - trendStart >= 5) {
        signals.push({ startIdx: trendStart, endIdx: i - 1, type: "trend" });
      }
      trendStart = dir === null ? i : i - 1;
      trendDir = dir;
    } else if (trendDir === null) {
      trendStart = i - 1;
      trendDir = dir;
    }
  }
  if (trendDir !== null && chartData.length - trendStart >= 5) {
    signals.push({ startIdx: trendStart, endIdx: chartData.length - 1, type: "trend" });
  }

  return signals;
}

const VisitDuration = () => {
  const { user, signOut } = useAuth();
  const { isAdmin: isAdminQuery } = useAdmin();
  const isAdmin = !!isAdminQuery.data;
  const { has: hasPerm } = usePermissions();
  const { role } = useUserRole();
  const { data: teamMembers = [] } = useTeamMembers();
  const canEdit = isAdmin || hasPerm("visit_duration.edit");
  const canEditMetrics = isAdmin || hasPerm("visit_metrics.edit");
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"duration" | "precepting" | "room">("duration");

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

  const p1 = phaseMedian(rows, 1);

  // Find the index where phase 2 starts (academic year boundary)
  const phase2StartIdx = rows.findIndex((r) => r.phase === 2);

  // Detect shift point: first run of 6+ consecutive Phase 2 points below Phase 1 median
  // The shift is confirmed at the 6th consecutive point
  // The NEW median starts at the next point (7th onward)
  let shiftConfirmedIdx = -1; // index of the 6th triggering point
  if (phase2StartIdx > 0 && p1.median > 0) {
    let runStart = phase2StartIdx;
    for (let i = phase2StartIdx; i < rows.length; i++) {
      if (rows[i].median_minutes < p1.median) {
        if (i - runStart + 1 >= 6 && shiftConfirmedIdx === -1) {
          shiftConfirmedIdx = i;
          break;
        }
      } else {
        runStart = i + 1;
      }
    }
  }

  // The new baseline starts at the point AFTER the shift is confirmed
  const newBaselineStartIdx = shiftConfirmedIdx >= 0 ? shiftConfirmedIdx + 1 : -1;

  // Phase 2 median is calculated from after the shift (excludes the 6 triggering points)
  const p2 = newBaselineStartIdx >= 0 && newBaselineStartIdx < rows.length
    ? (() => {
        const postShiftVals = rows.slice(newBaselineStartIdx).map(r => r.median_minutes).sort((a, b) => a - b);
        if (postShiftVals.length === 0) return { median: 0, n: 0 };
        const mid = Math.floor(postShiftVals.length / 2);
        const median = postShiftVals.length % 2 === 0 ? (postShiftVals[mid - 1] + postShiftVals[mid]) / 2 : postShiftVals[mid];
        return { median: Math.round(median * 10) / 10, n: postShiftVals.length };
      })()
    : phaseMedian(rows, 2);

  // Build chart data — baseline median extends through shift, new median starts after
  const chartData = rows.map((r, i) => ({
    idx: i,
    label: r.week_label,
    value: r.median_minutes,
    phase: r.phase,
    median: (newBaselineStartIdx >= 0 && i >= newBaselineStartIdx) ? p2.median : p1.median,
    // Baseline median line: from start through the 6th triggering point
    med1: (newBaselineStartIdx >= 0 ? i < newBaselineStartIdx : true) ? p1.median : undefined,
    // Post-shift median line: from the 7th point onward
    med2: (newBaselineStartIdx >= 0 && i >= newBaselineStartIdx) ? p2.median : undefined,
    // Faint baseline reference line extending past shift
    med1ref: (newBaselineStartIdx >= 0 && i >= newBaselineStartIdx) ? p1.median : undefined,
  }));

  // Detect run chart signals within each phase
  const signals = detectRunChartSignals(chartData);

  // Historical shift dots: only the 6 consecutive points that triggered the shift
  const historicalShiftIndices = new Set<number>();
  if (shiftConfirmedIdx >= 0) {
    // The shift was confirmed at shiftConfirmedIdx, meaning points
    // (shiftConfirmedIdx - 5) through shiftConfirmedIdx are the triggering run
    for (let j = shiftConfirmedIdx - 5; j <= shiftConfirmedIdx; j++) {
      if (j >= 0) historicalShiftIndices.add(j);
    }
  }

  const handleAdd = () => {
    if (!weekLabel.trim() || !weekStart || !medianMin) return;
    addRow.mutate({ week_label: weekLabel.trim(), week_start: weekStart, median_minutes: parseInt(medianMin), phase: 2 });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const sig = signals.find(s => d.idx >= s.startIdx && d.idx <= s.endIdx);
    const isHistShift = historicalShiftIndices.has(d.idx);
    return (
      <div style={{ background: "#fff", border: "1px solid #C9CED4", borderRadius: 6, padding: "8px 12px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
        <div style={{ fontWeight: 600, color: "#2D3748", marginBottom: 2 }}>{d.label}</div>
        <div style={{ color: "#415162" }}>Median LOS: <strong>{d.value} min</strong></div>
        <div style={{ color: "#8A9AAB", fontSize: 11 }}>Centerline: {d.median} min</div>
        {d.med1ref != null && (
          <div style={{ color: "#8A9AAB", fontSize: 11 }}>Baseline ref: {d.med1ref} min</div>
        )}
        {isHistShift && (
          <div style={{ fontSize: 10, marginTop: 3, fontWeight: 500, color: "#A04040" }}>
            ⬤ Below baseline median (shift signal)
          </div>
        )}
        {sig && !isHistShift && (
          <div style={{ fontSize: 10, marginTop: 3, fontWeight: 500, color: sig.type === "shift" ? "#A04040" : "#185FA5" }}>
            {sig.type === "shift" ? "⬤ Shift signal" : "⬤ Trend signal"}
          </div>
        )}
      </div>
    );
  };

  // Dot renderer — color by signal type or historical shift
  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const isHistShift = historicalShiftIndices.has(payload.idx);
    const sig = signals.find(s => payload.idx >= s.startIdx && payload.idx <= s.endIdx);
    const fill = isHistShift ? "#A04040" : sig ? (sig.type === "shift" ? "#A04040" : "#185FA5") : "#415162";
    const r = isHistShift || sig ? 4 : 2.5;
    return <circle cx={cx} cy={cy} r={r} fill={fill} stroke="none" />;
  };

  // Y axis range
  const allVals = rows.map((r) => r.median_minutes);
  const yMin = Math.max(0, Math.floor((Math.min(...allVals) - 10) / 10) * 10);
  const yMax = Math.ceil((Math.max(...allVals) + 10) / 10) * 10;

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <NotificationBell />
          </HeaderLogo>
        </div>
      </header>

      <main style={{ padding: "12px 16px 100px", maxWidth: 1200, margin: "0 auto" }}>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
          {([
            { value: "duration" as const, label: "Duration" },
            { value: "precepting" as const, label: "Precepting" },
            { value: "room" as const, label: "Room Time" },
          ]).map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                padding: "1px 0 0 0", marginRight: 20, fontSize: 14, fontWeight: 600, cursor: "pointer",
                background: "transparent", border: "none",
                color: activeTab === tab.value ? "#415162" : "#8A9AAB",
                borderBottom: activeTab === tab.value ? "2px solid #415162" : "2px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "duration" && (
        <>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 20, height: 20, border: "2px solid #C9CED4", borderTopColor: "#415162", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#6B7280", fontSize: 14 }}>No data yet.</div>
        ) : (
          <>
            {/* Summary pills + Add button */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, flex: 1, minWidth: 0 }}>
                <div style={{ background: "#E7EBEF", borderRadius: 8, padding: "10px 16px" }}>
                  <div style={{ fontSize: 11, color: "#5F7285", marginBottom: 2 }}>Baseline</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#415162" }}>
                    Median {p1.median} min <span style={{ fontWeight: 400, fontSize: 12, color: "#5F7285" }}>· n={p1.n}</span>
                  </div>
                </div>
                {shiftConfirmedIdx >= 0 && (
                <div style={{ background: "#E4F0EB", borderRadius: 8, padding: "10px 16px" }}>
                  <div style={{ fontSize: 11, color: "#3B6D11", marginBottom: 2 }}>Post-shift</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#27500A" }}>
                    Median {p2.median} min <span style={{ fontWeight: 400, fontSize: 12, color: "#3B6D11" }}>· n={p2.n}</span>
                  </div>
                </div>
                )}
              </div>
              {canEdit && (
                <span
                  onClick={() => {
                    const form = document.getElementById("add-form");
                    if (form) form.style.display = form.style.display === "none" ? "flex" : "none";
                  }}
                  style={{
                    fontSize: 13, fontWeight: 600, color: "#fff", background: "#415162",
                    padding: "4px 12px", borderRadius: 6, cursor: "pointer", userSelect: "none",
                    flexShrink: 0,
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

            {/* Run chart */}
            <div style={{ background: "#fff", border: "1px solid #D5DAE0", borderRadius: 10, padding: "16px 12px 8px", marginBottom: 20 }}>
              <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <div style={{ minWidth: 900, height: 420 }}>
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 60, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7EBEF" />

                  {/* Phase shading — divides where the new median begins */}
                  {newBaselineStartIdx > 0 && (
                    <>
                      <ReferenceArea x1={0} x2={newBaselineStartIdx - 1} fill="#415162" fillOpacity={0.04} />
                      <ReferenceArea x1={newBaselineStartIdx} x2={chartData.length - 1} fill="#4A846C" fillOpacity={0.04} />
                    </>
                  )}

                  {/* New baseline divider */}
                  {newBaselineStartIdx > 0 && (
                    <ReferenceLine x={newBaselineStartIdx} stroke="#C9CED4" strokeDasharray="4 4" strokeWidth={1} />
                  )}

                  {/* Academic year boundary (lighter reference) */}
                  {phase2StartIdx > 0 && phase2StartIdx !== newBaselineStartIdx && (
                    <ReferenceLine x={phase2StartIdx} stroke="#D5DAE0" strokeDasharray="2 4" strokeWidth={1} />
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

                  {/* Phase 1 median centerline (extends until shift confirmed) */}
                  <Line type="linear" dataKey="med1" stroke="#415162" strokeWidth={2} strokeDasharray="8 4" dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />
                  {/* Phase 1 median faint reference (extends into post-shift territory) */}
                  <Line type="linear" dataKey="med1ref" stroke="#415162" strokeWidth={1} strokeDasharray="4 6" strokeOpacity={0.3} dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />
                  {/* Phase 2 median centerline (starts at shift confirmation) */}
                  <Line type="linear" dataKey="med2" stroke="#4A846C" strokeWidth={2} strokeDasharray="8 4" dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />

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

            {/* Signal legend */}
            {signals.length > 0 && (
              <div style={{ background: "#E7EBEF", border: "1px solid #C9CED4", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#2D3748", marginBottom: 8 }}>Run chart signals detected</div>
                {signals.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < signals.length - 1 ? 6 : 0 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: s.type === "shift" ? "#A04040" : "#185FA5",
                    }} />
                    <span style={{ fontSize: 12, color: "#3D3D3A" }}>
                      <strong style={{ fontWeight: 600 }}>{s.type === "shift" ? "Shift" : "Trend"}</strong>
                      {" — "}
                      {s.type === "shift"
                        ? `${s.endIdx - s.startIdx + 1} consecutive points ${chartData[s.startIdx]?.value > chartData[s.startIdx]?.median ? "above" : "below"} median`
                        : `${s.endIdx - s.startIdx + 1} consecutive points ${chartData[s.endIdx]?.value > chartData[s.startIdx]?.value ? "increasing" : "decreasing"}`
                      }
                      <span style={{ color: "#8A9AAB" }}> (weeks {chartData[s.startIdx]?.label} → {chartData[s.endIdx]?.label})</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Chart legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16, fontSize: 11, color: "#8A9AAB" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#415162" }} /> Data point
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 16, height: 0, borderTop: "2px dashed #415162" }} /> Baseline median
              </span>
              {shiftConfirmedIdx >= 0 && (
                <>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 16, height: 0, borderTop: "1px dashed rgba(65,81,98,0.3)" }} /> Baseline ref
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 16, height: 0, borderTop: "2px dashed #4A846C" }} /> Post-shift median
                  </span>
                </>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#A04040" }} /> Shift signal
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#185FA5" }} /> Trend signal
              </span>
            </div>

            {/* Data table */}
            <div style={{ background: "#E7EBEF", border: "1px solid #C9CED4", borderRadius: 12, padding: "14px 16px", maxWidth: 520 }}>
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
        </>
        )}

        {activeTab === "precepting" && (
          <div style={{ maxWidth: 540 }}>
            <PreceptingTab
              userId={user?.id || ""}
              isAdmin={isAdmin}
              canEdit={canEditMetrics}
              isResident={role === "resident"}
              isFaculty={role === "faculty"}
              attendings={teamMembers.filter(m => m.role === "faculty")}
              residents={teamMembers.filter(m => m.role === "resident")}
              queryClient={queryClient}
            />
          </div>
        )}

        {activeTab === "room" && (
          <div style={{ maxWidth: 540 }}>
            <RoomTimeTab
              userId={user?.id || ""}
              isAdmin={isAdmin}
              canEdit={canEditMetrics}
              isResident={role === "resident"}
              residents={teamMembers.filter(m => m.role === "resident")}
              queryClient={queryClient}
            />
          </div>
        )}

      </main>
    </div>
  );
};

export default VisitDuration;
