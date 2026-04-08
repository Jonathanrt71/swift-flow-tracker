import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import { Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BlockEntry {
  id: string;
  resident_name: string;
  pgy_level: number | null;
  block_number: number;
  block_start: string;
  block_end: string;
  rotation: string;
  academic_year: string;
}

const formatDate = (d: string) => {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return d; }
};

const BlockSchedule = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();

  const [filterResident, setFilterResident] = useState<string>("all");
  const [filterPgy, setFilterPgy] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("latest");
  const [viewMode, setViewMode] = useState<"table" | "cards" | "evals">("table");
  const showEvalCoverage = viewMode === "evals";
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rotationTooltip, setRotationTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const scheduleQuery = useQuery({
    queryKey: ["block_schedule"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("block_schedule")
        .select("*")
        .order("block_number")
        .order("resident_name");
      if (error) throw error;
      return (data || []) as BlockEntry[];
    },
  });

  // Fetch evaluations for coverage overlay
  const evaluationsQuery = useQuery({
    queryKey: ["evaluations_for_schedule"],
    enabled: !!user && showEvalCoverage,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("evaluations")
        .select("resident_name, rotation, session_date, eval_start_date, eval_end_date");
      if (error) throw error;
      return (data || []) as { resident_name: string; rotation: string | null; session_date: string | null; eval_start_date: string | null; eval_end_date: string | null }[];
    },
  });

  // Build a set of "resident::pgy::blockNum::rotation" keys that have evaluations
  const evalCoverageSet = useMemo(() => {
    const set = new Set<string>();
    if (!showEvalCoverage || !evaluationsQuery.data) return set;
    const evals = evaluationsQuery.data;
    const scheduleEntries = scheduleQuery.data || [];

    evals.forEach(ev => {
      if (!ev.resident_name) return;
      const evName = ev.resident_name.trim();
      const dateStr = ev.session_date || ev.eval_start_date;
      if (!dateStr) return;
      const evDate = new Date(dateStr + "T00:00:00");

      scheduleEntries.forEach(se => {
        if (se.resident_name.trim() !== evName) return;
        const blockStart = new Date(se.block_start + "T00:00:00");
        const blockEnd = new Date(se.block_end + "T23:59:59");
        if (evDate >= blockStart && evDate <= blockEnd) {
          set.add(`${se.resident_name}::${se.pgy_level}::${se.block_number}::${se.rotation}`);
        }
      });
    });
    return set;
  }, [showEvalCoverage, evaluationsQuery.data, scheduleQuery.data]);

  const entries = scheduleQuery.data || [];

  // Unique academic years
  const academicYears = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => { if (e.academic_year) set.add(e.academic_year); });
    return Array.from(set).sort();
  }, [entries]);

  // Default to latest academic year
  const activeYear = filterYear === "latest"
    ? (academicYears.length > 0 ? academicYears[academicYears.length - 1] : "")
    : filterYear;

  // Year-filtered entries (base for all other filters/computations)
  const yearEntries = useMemo(() => {
    if (!activeYear) return entries;
    return entries.filter(e => e.academic_year === activeYear);
  }, [entries, activeYear]);

  // Unique residents (from year-filtered)
  const residents = useMemo(() => {
    const set = new Set<string>();
    yearEntries.forEach(e => set.add(e.resident_name));
    return Array.from(set).sort();
  }, [yearEntries]);

  // Unique PGY levels (from year-filtered)
  const pgyLevels = useMemo(() => {
    const set = new Set<number>();
    yearEntries.forEach(e => { if (e.pgy_level) set.add(e.pgy_level); });
    return Array.from(set).sort();
  }, [yearEntries]);

  // Unique blocks (from year-filtered, ordered)
  const blocks = useMemo(() => {
    const map = new Map<number, { start: string; end: string }>();
    yearEntries.forEach(e => {
      if (!map.has(e.block_number)) {
        map.set(e.block_number, { start: e.block_start, end: e.block_end });
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([num, dates]) => ({ num, ...dates }));
  }, [yearEntries]);

  // Filter (resident, PGY, search — all on top of year filter)
  const filtered = useMemo(() => {
    let data = yearEntries;
    console.log("Filter running — filterResident:", filterResident, "filterPgy:", filterPgy, "yearEntries count:", yearEntries.length);
    if (filterResident !== "all") {
      data = data.filter(e => e.resident_name === filterResident);
      console.log("After resident filter:", data.length, "rows");
    }
    if (filterPgy !== "all") {
      data = data.filter(e => e.pgy_level === parseInt(filterPgy, 10));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(e =>
        e.resident_name.toLowerCase().includes(q) ||
        e.rotation.toLowerCase().includes(q)
      );
    }
    return data;
  }, [yearEntries, filterResident, filterPgy, searchQuery]);

  // Group by resident, then by block
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; pgy: number | null; blocks: Map<number, string[]> }>();
    filtered.forEach(e => {
      const key = `${e.resident_name}::${e.pgy_level}`;
      if (!map.has(key)) {
        map.set(key, { name: e.resident_name, pgy: e.pgy_level, blocks: new Map() });
      }
      const entry = map.get(key)!;
      if (!entry.blocks.has(e.block_number)) {
        entry.blocks.set(e.block_number, []);
      }
      entry.blocks.get(e.block_number)!.push(e.rotation);
    });
    return Array.from(map.values())
      .sort((a, b) => {
        const pgyA = a.pgy ?? 99;
        const pgyB = b.pgy ?? 99;
        if (pgyA !== pgyB) return pgyA - pgyB;
        return a.name.localeCompare(b.name);
      });
  }, [filtered]);

  // Determine current block
  const today = new Date();
  const currentBlock = blocks.find(b => {
    const start = new Date(b.start + "T00:00:00");
    const end = new Date(b.end + "T23:59:59");
    return today >= start && today <= end;
  });

  // Rotation color mapping — all unique colors
  const rotationColors: Record<string, string> = {
    "*LOA": "#8A9AAB",
    "*VAC": "#B4B2A9",
    "FM: Business Office": "#5F5E5A",
    "FM: PEDS- WHITE'S Urgent Care": "#BA7517",
    "FM: POCUS": "#0F6E56",
    "FM: PODIATRY": "#444441",
    "FM: Sleep Med": "#3C3489",
    "FM:CLINIC": "#4A846C",
    "FM:DERM": "#D85A30",
    "FM:DEV PEDS": "#EF9F27",
    "FM:ENT": "#993C1D",
    "FM:GERIATRICS": "#72243E",
    "FM:GYN": "#D4537E",
    "FM:NICU/NEWBORN CARE-HMC": "#639922",
    "FM:NIGHTS-HMC": "#2C2C2A",
    "FM:OB": "#E24B4A",
    "FM:OPTHAMOLOGY": "#7F77DD",
    "FM:ORTHO": "#534AB7",
    "FM:PEDS ED": "#D4A017",
    "FM:PEDS-ERLANGER": "#854F0B",
    "FM:PEDS-PRIME": "#A32D2D",
    "FM:PEDS-WHITE'S": "#C87533",
    "FM:PSYCH": "#26215C",
    "FM:PUB HLTH": "#085041",
    "FM:PULM-HMC": "#712B13",
    "FM:SPORTS MED": "#1D9E75",
    "FM:SURG-HMC": "#993556",
    "FM:WARDS-HMC": "#378ADD",
    "Family Medicine (Unspecified)": "#888780",
    "IM:CARD-HMC": "#185FA5",
    "IM:CROSS COVER-HMC": "#5F7285",
    "IM:ENDO-HMC": "#633806",
    "IM:ER-HMC": "#c44444",
    "IM:GI-HMC": "#3B6D11",
    "IM:HOSPITALIST": "#0C447C",
    "IM:ICU-HMC": "#791F1F",
    "IM:ID-HMC": "#4B1528",
    "IM:NEURO OP": "#1D6B8A",
    "IM:PALLIATIVE CARE": "#6B3A5D",
    "IM:RHEUM-HMC": "#7B5B3A",
    "IM:WOUND CARE-HMC": "#4A6741",
  };

  const getRotationColor = (rot: string): string => {
    if (rotationColors[rot]) return rotationColors[rot];
    const base = rot.split("(")[0].trim();
    if (rotationColors[base]) return rotationColors[base];
    for (const [key, color] of Object.entries(rotationColors)) {
      if (rot.startsWith(key)) return color;
    }
    return "#5F7285";
  };

  const abbreviateRotation = (rot: string): string => {
    const base = rot.split("(")[0].trim();
    const abbrevs: Record<string, string> = {
      "*LOA": "LOA",
      "*VAC": "VAC",
      "FM: Business Office": "BUSOF",
      "FM: PEDS- WHITE'S Urgent Care": "PEDUC",
      "FM: POCUS": "POCUS",
      "FM: PODIATRY": "POD",
      "FM: Sleep Med": "SLEEP",
      "FM:CLINIC": "CLNC",
      "FM:DERM": "DERM",
      "FM:DEV PEDS": "DEVPD",
      "FM:ENT": "ENT",
      "FM:GERIATRICS": "GERI",
      "FM:GYN": "GYN",
      "FM:NICU/NEWBORN CARE-HMC": "NICU",
      "FM:NIGHTS-HMC": "NIGHT",
      "FM:OB": "OB",
      "FM:OPTHAMOLOGY": "OPHTH",
      "FM:ORTHO": "ORTHO",
      "FM:PEDS ED": "PEDED",
      "FM:PEDS-ERLANGER": "PED-E",
      "FM:PEDS-PRIME": "PED-P",
      "FM:PEDS-WHITE'S": "PED-W",
      "FM:PSYCH": "PSYCH",
      "FM:PUB HLTH": "PUBHL",
      "FM:PULM-HMC": "PULM",
      "FM:SPORTS MED": "SPORT",
      "FM:SURG-HMC": "SURG",
      "FM:WARDS-HMC": "WARDS",
      "Family Medicine (Unspecified)": "FM",
      "IM:CROSS COVER-HMC": "XCOVR",
      "IM:ER-HMC": "ER",
      "IM:GI-HMC": "GI",
      "IM:HOSPITALIST": "HOSP",
      "IM:ICU-HMC": "ICU",
      "IM:ID-HMC": "ID",
      "IM:NEURO OP": "NEURO",
      "IM:PALLIATIVE CARE": "PALL",
      "IM:RHEUM-HMC": "RHEUM",
      "IM:WOUND CARE-HMC": "WOUND",
    };
    if (abbrevs[rot]) return abbrevs[rot];
    if (abbrevs[base]) return abbrevs[base];
    if (base.startsWith("IM:CARD-HMC")) return "CARDS";
    if (base.startsWith("IM:ENDO-HMC")) return "ENDO";
    if (rot.startsWith("*VAC")) return "VAC";
    if (rot.startsWith("*LOA")) return "LOA";
    const fallback = base.replace("FM:", "").replace("IM:", "").trim();
    return fallback.length > 5 ? fallback.slice(0, 5) : fallback;
  };

  return (
    <div style={{ height: "100vh", background: "#F5F3EE", width: "100vw", marginLeft: "calc(-50vw + 50%)", position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <header style={{ flexShrink: 0, zIndex: 40, background: "#415162" }}>
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
              placeholder="Search residents or rotations..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}
      </header>

      <main style={{ flex: 1, padding: "12px 24px 0", paddingBottom: "env(safe-area-inset-bottom, 4px)", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap", flexShrink: 0 }}>
          {academicYears.length > 1 && (
            <Select value={filterYear === "latest" ? activeYear : filterYear} onValueChange={(v) => { setFilterYear(v); setFilterResident("all"); setFilterPgy("all"); }}>
              <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff", maxWidth: 160 }}>
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={filterResident} onValueChange={(v) => { console.log("filterResident changed to:", v); setFilterResident(v); }}>
            <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff", maxWidth: 280 }}>
              <SelectValue placeholder="All residents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All residents</SelectItem>
              {residents.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "0.5px solid #C9CED4" }}>
            <button
              onClick={() => setFilterPgy("all")}
              style={{
                padding: "5px 10px", fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer",
                background: filterPgy === "all" ? "#415162" : "#fff",
                color: filterPgy === "all" ? "#fff" : "#5F7285",
              }}
            >
              All
            </button>
            {pgyLevels.map(pgy => (
              <button
                key={pgy}
                onClick={() => setFilterPgy(String(pgy))}
                style={{
                  padding: "5px 10px", fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer",
                  background: filterPgy === String(pgy) ? "#415162" : "#fff",
                  color: filterPgy === String(pgy) ? "#fff" : "#5F7285",
                }}
              >
                PGY-{pgy}
              </button>
            ))}
          </div>

          {/* View toggle — 3 modes */}
          <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "0.5px solid #C9CED4" }}>
            {([
              { mode: "table" as const, label: "Table" },
              { mode: "cards" as const, label: "List" },
              { mode: "evals" as const, label: "Evals" },
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

        {/* Schedule grid */}
        {scheduleQuery.isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#8A9AAB", fontSize: 14 }}>
            No schedule data
          </div>
        ) : (viewMode === "table" || viewMode === "evals") ? (
          // Table view — frozen headers and first column, solid color backgrounds
          <div
            style={{
              overflow: "auto",
              border: "0.5px solid #C9CED4",
              borderRadius: 8,
              flex: 1,
              minHeight: 0,
              overscrollBehaviorX: "contain",
            }}
          >
            <table style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{
                    position: "sticky", left: 0, top: 0, zIndex: 4,
                    background: "#415162", color: "#fff", fontSize: 11, fontWeight: 500,
                    padding: "6px 8px", textAlign: "left", minWidth: 100, maxWidth: 100,
                    borderRight: "1px solid rgba(255,255,255,0.2)",
                  }}>
                    Resident
                  </th>
                  {blocks.map(block => {
                    return (
                      <th key={block.num} style={{
                        position: "sticky", top: 0, zIndex: 3,
                        background: "#415162",
                        color: "#fff", fontSize: 10, fontWeight: 500,
                        padding: "4px 3px", textAlign: "center", whiteSpace: "nowrap",
                        borderLeft: "0.5px solid rgba(255,255,255,0.15)",
                        minWidth: 72,
                      }}>
                        B{block.num}<br />{formatDate(block.start).replace(" ", "\u00A0")}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const pgyGroups: { pgy: number | null; residents: typeof grouped }[] = [];
                  let currentPgy: number | null = null;
                  grouped.forEach(r => {
                    if (r.pgy !== currentPgy) {
                      currentPgy = r.pgy;
                      pgyGroups.push({ pgy: r.pgy, residents: [] });
                    }
                    pgyGroups[pgyGroups.length - 1].residents.push(r);
                  });

                  const pillStyle = (bg: string): React.CSSProperties => ({
                    display: "inline-block",
                    borderRadius: 3,
                    padding: "2px 0",
                    fontSize: 9,
                    fontWeight: 500,
                    color: "#fff",
                    width: 34,
                    textAlign: "center" as const,
                    letterSpacing: "0.01em",
                  });

                  return pgyGroups.flatMap((group, gi) => {
                    const rows: React.ReactNode[] = [];
                    rows.push(
                      <tr key={`pgy-${gi}`}>
                        <td
                          colSpan={blocks.length + 1}
                          style={{
                            position: "sticky", left: 0, zIndex: 2,
                            background: "#D5DAE0", fontSize: 11, fontWeight: 600,
                            color: "#415162", padding: "5px 8px",
                            borderTop: gi > 0 ? "1px solid #C9CED4" : undefined,
                          }}
                        >
                          PGY-{group.pgy || "?"}
                        </td>
                      </tr>
                    );

                    group.residents.forEach((resident, ri) => {
                      const isEven = ri % 2 === 0;
                      const rowBg = isEven ? "#F5F3EE" : "#E7EBEF";
                      rows.push(
                        <tr key={resident.name}>
                          <td style={{
                            position: "sticky", left: 0, zIndex: 2,
                            background: rowBg, fontSize: 11, fontWeight: 500,
                            color: "#2D3748", padding: "4px 8px", textAlign: "left",
                            minWidth: 100, maxWidth: 100, whiteSpace: "nowrap",
                            overflow: "hidden", textOverflow: "ellipsis",
                            borderRight: "1px solid #C9CED4",
                            borderBottom: "0.5px solid #D5DAE0",
                          }}>
                            {resident.name}
                          </td>
                          {blocks.map(block => {
                            const rotations = resident.blocks.get(block.num) || [];
                            const isSplit = rotations.length > 1;

                            const showRotationTooltip = (rot: string, e: React.MouseEvent) => {
                              e.stopPropagation();
                              const rect = (e.target as HTMLElement).getBoundingClientRect();
                              setRotationTooltip({
                                text: rot,
                                x: rect.left + rect.width / 2,
                                y: rect.top - 8,
                              });
                              setTimeout(() => setRotationTooltip(null), 2500);
                            };

                            const abbrev = (rot: string) => {
                              const full = abbreviateRotation(rot);
                              return isSplit ? full.slice(0, 3) : full;
                            };

                            if (showEvalCoverage) {
                              // Per-rotation eval check
                              const evalStatuses = rotations.map(rot =>
                                evalCoverageSet.has(`${resident.name}::${resident.pgy}::${block.num}::${rot}`)
                              );
                              const greenBg = "#97C459";
                              const whiteBg = "#fff";

                              let bgStyle: string;
                              if (rotations.length === 2) {
                                const leftColor = evalStatuses[0] ? greenBg : whiteBg;
                                const rightColor = evalStatuses[1] ? greenBg : whiteBg;
                                bgStyle = `linear-gradient(to right, ${leftColor} 50%, ${rightColor} 50%)`;
                              } else if (rotations.length === 1) {
                                bgStyle = evalStatuses[0] ? greenBg : whiteBg;
                              } else {
                                bgStyle = whiteBg;
                              }

                              return (
                                <td key={block.num} style={{
                                  background: bgStyle,
                                  borderLeft: "1px solid #D5DAE0",
                                  borderRight: "1px solid #D5DAE0",
                                  borderBottom: "1px solid #D5DAE0",
                                  padding: "4px 3px",
                                  textAlign: "center",
                                  verticalAlign: "middle",
                                  whiteSpace: "nowrap",
                                }}>
                                  {rotations.map((rot, i) => (
                                    <span key={i} onClick={(e) => showRotationTooltip(rot, e)} style={{
                                      fontSize: 9,
                                      fontWeight: 500,
                                      color: evalStatuses[i] ? "#27500A" : "#8A9AAB",
                                      marginRight: isSplit && i === 0 ? 3 : 0,
                                      cursor: "pointer",
                                    }}>
                                      {abbrev(rot)}
                                    </span>
                                  ))}
                                </td>
                              );
                            }

                            // Normal color mode
                            const colors = rotations.map(r => getRotationColor(r));
                            let bgStyle: string;
                            if (rotations.length === 2) {
                              bgStyle = `linear-gradient(to right, ${colors[0]} 50%, ${colors[1]} 50%)`;
                            } else if (rotations.length === 1) {
                              bgStyle = colors[0];
                            } else {
                              bgStyle = rowBg;
                            }

                            return (
                              <td key={block.num} style={{
                                background: bgStyle,
                                borderLeft: "1px solid rgba(255,255,255,0.4)",
                                borderRight: "1px solid rgba(255,255,255,0.4)",
                                borderBottom: "1px solid rgba(255,255,255,0.4)",
                                padding: "4px 3px",
                                textAlign: "center",
                                verticalAlign: "middle",
                                whiteSpace: "nowrap",
                              }}>
                                {rotations.map((rot, i) => (
                                  <span key={i} onClick={(e) => showRotationTooltip(rot, e)} style={{ ...pillStyle(colors[i]), marginRight: isSplit && i === 0 ? 3 : 0, cursor: "pointer" }}>
                                    {abbrev(rot)}
                                  </span>
                                ))}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });

                    return rows;
                  });
                })()}
              </tbody>
            </table>
          </div>
        ) : filterResident !== "all" ? (
          // Single resident view — show blocks as a timeline
          <div>
            {grouped.map(resident => (
              <div key={resident.name}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#2D3748", marginBottom: 4 }}>
                  {resident.name}
                </div>
                <div style={{ fontSize: 12, color: "#8A9AAB", marginBottom: 16 }}>
                  PGY-{resident.pgy || "?"} · 2025–2026
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {blocks.map(block => {
                    const rotations = resident.blocks.get(block.num) || [];
                    const isCurrent = currentBlock?.num === block.num;
                    return (
                      <div
                        key={block.num}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 12px",
                          background: isCurrent ? "rgba(55,138,221,0.08)" : "#E7EBEF",
                          border: isCurrent ? "1.5px solid #378ADD" : "0.5px solid #C9CED4",
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ width: 32, fontSize: 11, fontWeight: 600, color: isCurrent ? "#378ADD" : "#8A9AAB", flexShrink: 0 }}>
                          B{block.num}
                        </div>
                        <div style={{ fontSize: 11, color: "#8A9AAB", width: 100, flexShrink: 0 }}>
                          {formatDate(block.start)} – {formatDate(block.end)}
                        </div>
                        <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {rotations.length > 0 ? rotations.map((rot, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: 12, fontWeight: 500,
                                color: "#fff",
                                background: getRotationColor(rot),
                                borderRadius: 4,
                                padding: "2px 8px",
                              }}
                            >
                              {rot}
                            </span>
                          )) : (
                            <span style={{ fontSize: 12, color: "#C9CED4", fontStyle: "italic" }}>—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // All residents view — compact grid showing current + next few blocks
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {grouped.map(resident => {
                // Show current block and next 2
                const startBlock = currentBlock ? currentBlock.num : 1;
                const visibleBlocks = blocks.filter(b => b.num >= startBlock && b.num <= startBlock + 2);

                return (
                  <div
                    key={resident.name}
                    className="rounded-lg"
                    style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4", padding: "10px 12px", cursor: "pointer" }}
                    onClick={() => { setFilterResident(resident.name); setViewMode("cards"); }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#2D3748" }}>
                        {resident.name}
                      </span>
                      <span style={{ fontSize: 11, color: "#8A9AAB" }}>
                        PGY-{resident.pgy || "?"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {visibleBlocks.map(block => {
                        const rotations = resident.blocks.get(block.num) || [];
                        const isCurrent = currentBlock?.num === block.num;
                        return (
                          <div key={block.num} style={{ flex: 1, minWidth: 120 }}>
                            <div style={{ fontSize: 9, fontWeight: 600, color: isCurrent ? "#378ADD" : "#8A9AAB", textTransform: "uppercase", marginBottom: 2 }}>
                              {isCurrent ? "Current" : `Block ${block.num}`} · {formatDate(block.start)}
                            </div>
                            {rotations.map((rot, i) => (
                              <span
                                key={i}
                                style={{
                                  display: "inline-block",
                                  fontSize: 11, fontWeight: 500,
                                  color: "#fff",
                                  background: getRotationColor(rot),
                                  borderRadius: 3,
                                  padding: "1px 6px",
                                  marginRight: 3,
                                  marginBottom: 2,
                                }}
                              >
                                {rot.split("(")[0].trim()}
                              </span>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Rotation name tooltip */}
      {rotationTooltip && (
        <div
          onClick={() => setRotationTooltip(null)}
          style={{
            position: "fixed",
            left: rotationTooltip.x,
            top: rotationTooltip.y,
            transform: "translate(-50%, -100%)",
            background: "#415162",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: "nowrap",
            zIndex: 100,
            pointerEvents: "auto",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          {rotationTooltip.text}
        </div>
      )}
    </div>
  );
};

export default BlockSchedule;
