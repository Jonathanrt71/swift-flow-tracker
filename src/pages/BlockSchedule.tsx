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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const entries = scheduleQuery.data || [];

  // Unique residents
  const residents = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => set.add(e.resident_name));
    return Array.from(set).sort();
  }, [entries]);

  // Unique PGY levels
  const pgyLevels = useMemo(() => {
    const set = new Set<number>();
    entries.forEach(e => { if (e.pgy_level) set.add(e.pgy_level); });
    return Array.from(set).sort();
  }, [entries]);

  // Unique blocks (ordered)
  const blocks = useMemo(() => {
    const map = new Map<number, { start: string; end: string }>();
    entries.forEach(e => {
      if (!map.has(e.block_number)) {
        map.set(e.block_number, { start: e.block_start, end: e.block_end });
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([num, dates]) => ({ num, ...dates }));
  }, [entries]);

  // Filter
  const filtered = useMemo(() => {
    let data = entries;
    if (filterResident !== "all") {
      data = data.filter(e => e.resident_name === filterResident);
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
  }, [entries, filterResident, filterPgy, searchQuery]);

  // Group by resident, then by block
  const grouped = useMemo(() => {
    const map = new Map<string, { pgy: number | null; blocks: Map<number, string[]> }>();
    filtered.forEach(e => {
      if (!map.has(e.resident_name)) {
        map.set(e.resident_name, { pgy: e.pgy_level, blocks: new Map() });
      }
      const entry = map.get(e.resident_name)!;
      if (!entry.blocks.has(e.block_number)) {
        entry.blocks.set(e.block_number, []);
      }
      entry.blocks.get(e.block_number)!.push(e.rotation);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, data]) => ({ name, pgy: data.pgy, blocks: data.blocks }));
  }, [filtered]);

  // Determine current block
  const today = new Date();
  const currentBlock = blocks.find(b => {
    const start = new Date(b.start + "T00:00:00");
    const end = new Date(b.end + "T23:59:59");
    return today >= start && today <= end;
  });

  // Rotation color mapping
  const rotationColors: Record<string, string> = {
    "FM:CLINIC": "#4A846C",
    "FM:WARDS-HMC": "#378ADD",
    "FM:NIGHTS-HMC": "#415162",
    "FM:OB": "#D85A30",
    "FM:SPORTS MED": "#1D9E75",
    "FM:ORTHO": "#534AB7",
    "FM:SURG-HMC": "#993556",
    "FM:PEDS-PRIME": "#D4A017",
    "FM:PEDS-ERLANGER": "#D4A017",
    "FM:PEDS-WHITE'S": "#D4A017",
    "FM:NICU/NEWBORN CARE-HMC": "#D4A017",
    "FM:DEV PEDS": "#D4A017",
    "IM:ER-HMC": "#c44444",
    "IM:CARD-HMC": "#854F0B",
    "IM:ENDO-HMC": "#854F0B",
    "IM:PALLIATIVE CARE": "#72243E",
    "FM: PODIATRY": "#5F5E5A",
  };

  const getRotationColor = (rot: string): string => {
    // Try exact match first, then prefix match
    if (rotationColors[rot]) return rotationColors[rot];
    const base = rot.split("(")[0].split(" ")[0].trim();
    for (const [key, color] of Object.entries(rotationColors)) {
      if (rot.startsWith(key) || base === key) return color;
    }
    if (rot.startsWith("*VAC") || rot.startsWith("*LOA")) return "#8A9AAB";
    if (rot.startsWith("FM:")) return "#52657A";
    if (rot.startsWith("IM:")) return "#854F0B";
    return "#5F7285";
  };

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
              placeholder="Search residents or rotations..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "12px 16px 100px" }}>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <Select value={filterResident} onValueChange={setFilterResident}>
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
                    onClick={() => setFilterResident(resident.name)}
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
    </div>
  );
};

export default BlockSchedule;
