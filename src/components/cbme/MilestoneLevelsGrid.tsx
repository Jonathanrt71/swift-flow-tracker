import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useACGMECompetencies } from "@/hooks/useACGMECompetencies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MilestoneLevel {
  id: string;
  resident_id: string;
  subcategory_id: string;
  level: number;
  review_period: string;
}

interface ResidentProfile {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  graduation_year: number | null;
}

const getPgyLevel = (gradYear: number | null): number | null => {
  if (!gradYear) return null;
  const now = new Date();
  const academicYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const pgy = gradYear - academicYear;
  return pgy >= 1 && pgy <= 5 ? pgy : null;
};

const MilestoneLevelsGrid = () => {
  const [filterPgy, setFilterPgy] = useState<string>("all");
  const [filterResident, setFilterResident] = useState<string>("all");

  const { data: competencies } = useACGMECompetencies();

  const levelsQuery = useQuery({
    queryKey: ["milestone_levels"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("milestone_levels")
        .select("*");
      if (error) throw error;
      return (data || []) as MilestoneLevel[];
    },
  });

  const residentsQuery = useQuery({
    queryKey: ["milestone_residents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, graduation_year");
      if (error) throw error;
      return (data || []) as ResidentProfile[];
    },
  });

  const allSubcategories = useMemo(() => {
    if (!competencies) return [];
    return competencies.flatMap(cat =>
      cat.subcategories.map(sub => ({
        id: sub.id,
        code: sub.code,
        name: sub.name,
        categoryCode: cat.code,
        categoryColor: cat.color,
      }))
    );
  }, [competencies]);

  // Build resident data with milestone levels
  const residents = useMemo(() => {
    const levels = levelsQuery.data || [];
    const profiles = residentsQuery.data || [];

    // Only include residents who have milestone levels
    const residentIds = new Set(levels.map(l => l.resident_id));
    const relevantProfiles = profiles.filter(p => residentIds.has(p.id));

    return relevantProfiles.map(p => {
      const pgy = getPgyLevel(p.graduation_year);
      const levelMap = new Map<string, number>();
      levels.filter(l => l.resident_id === p.id).forEach(l => {
        levelMap.set(l.subcategory_id, l.level);
      });
      const name = p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();
      return { id: p.id, name, pgy, levelMap };
    }).sort((a, b) => {
      const pgyA = a.pgy ?? 99;
      const pgyB = b.pgy ?? 99;
      if (pgyA !== pgyB) return pgyA - pgyB;
      return a.name.localeCompare(b.name);
    });
  }, [levelsQuery.data, residentsQuery.data]);

  const pgyLevels = useMemo(() => {
    const set = new Set<number>();
    residents.forEach(r => { if (r.pgy) set.add(r.pgy); });
    return Array.from(set).sort();
  }, [residents]);

  const filtered = useMemo(() => {
    let data = residents;
    if (filterPgy !== "all") data = data.filter(r => r.pgy === parseInt(filterPgy));
    if (filterResident !== "all") data = data.filter(r => r.id === filterResident);
    return data;
  }, [residents, filterPgy, filterResident]);

  if (levelsQuery.isLoading || residentsQuery.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (residents.length === 0) {
    return <div style={{ textAlign: "center", padding: 48, color: "#8A9AAB", fontSize: 14 }}>No milestone data</div>;
  }

  // Category color map
  const catColors: Record<string, string> = {};
  (competencies || []).forEach(c => { catColors[c.code] = c.color; });

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Select value={filterResident} onValueChange={setFilterResident}>
          <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff", maxWidth: 240, fontSize: 12, height: 32, padding: "0 8px" }}>
            <SelectValue placeholder="All residents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All residents</SelectItem>
            {residents.map(r => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #C9CED4" }}>
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
      </div>

      {/* Grid */}
      <div style={{ overflow: "auto", border: "1px solid #C9CED4", borderRadius: 8, maxHeight: "calc(100vh - 220px)" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{
                position: "sticky", left: 0, top: 0, zIndex: 4,
                background: "#415162", color: "#fff", fontSize: 13, fontWeight: 500,
                padding: "8px 10px", textAlign: "left", minWidth: 150, maxWidth: 180,
                borderRight: "1px solid rgba(255,255,255,0.2)",
              }}>
                Resident
              </th>
              {allSubcategories.map(sub => (
                <th key={sub.id} style={{
                  position: "sticky", top: 0, zIndex: 3,
                  background: "#415162", color: "#fff", fontSize: 11, fontWeight: 500,
                  padding: "6px 4px", textAlign: "center", whiteSpace: "nowrap",
                  borderLeft: "0.5px solid rgba(255,255,255,0.15)",
                  minWidth: 44,
                }}>
                  {sub.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              let lastPgy: number | null = null;
              const rows: React.ReactNode[] = [];

              filtered.forEach((resident, ri) => {
                if (resident.pgy !== lastPgy) {
                  lastPgy = resident.pgy;
                  rows.push(
                    <tr key={`pgy-${resident.pgy}`}>
                      <td
                        colSpan={allSubcategories.length + 1}
                        style={{
                          position: "sticky", left: 0, zIndex: 2,
                          background: "#D5DAE0", fontSize: 12, fontWeight: 600,
                          color: "#415162", padding: "6px 10px",
                        }}
                      >
                        PGY-{resident.pgy || "?"}
                      </td>
                    </tr>
                  );
                }

                const isEven = ri % 2 === 0;
                const rowBg = isEven ? "#F5F3EE" : "#E7EBEF";

                rows.push(
                  <tr key={resident.id}>
                    <td style={{
                      position: "sticky", left: 0, zIndex: 2,
                      background: rowBg, fontSize: 13, fontWeight: 500,
                      color: "#2D3748", padding: "6px 10px", textAlign: "left",
                      minWidth: 150, maxWidth: 180, whiteSpace: "nowrap",
                      overflow: "hidden", textOverflow: "ellipsis",
                      borderRight: "1px solid #C9CED4",
                      borderBottom: "1px solid #D5DAE0",
                    }}>
                      {resident.name}
                    </td>
                    {allSubcategories.map(sub => {
                      const level = resident.levelMap.get(sub.id);
                      return (
                        <td key={sub.id} style={{
                          background: rowBg,
                          borderLeft: "1px solid #D5DAE0",
                          borderBottom: "1px solid #D5DAE0",
                          padding: "4px 2px",
                          textAlign: "center",
                          fontSize: 12,
                          fontWeight: 500,
                          color: level != null ? "#2D3748" : "#C9CED4",
                        }}>
                          {level != null ? level.toFixed(1) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              });

              return rows;
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MilestoneLevelsGrid;
