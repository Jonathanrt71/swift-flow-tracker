import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useACGMECompetencies } from "@/hooks/useACGMECompetencies";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import ABFMCompetencies from "@/components/ABFMCompetencies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try {
    const date = new Date(d.includes("T") ? d : d + "T00:00:00");
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return "—"; }
};

const catColors: Record<string, string> = {
  PC: "#4A846C", MK: "#378ADD", SBP: "#534AB7", PBLI: "#D85A30", PROF: "#D4A017", ICS: "#993556",
};

const ResidentSummary = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const [selectedResident, setSelectedResident] = useState<string>("none");
  const [logbookUploading, setLogbookUploading] = useState(false);
  const [logbookUploadMsg, setLogbookUploadMsg] = useState<string | null>(null);
  const logbookFileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const canUploadQuery = useQuery({
    queryKey: ["can_upload_logbook", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("can_upload_logbook")
        .eq("id", user!.id)
        .single();
      return data?.can_upload_logbook === true;
    },
  });
  const canUploadLogbook = canUploadQuery.data === true;

  const handleLogbookUpload = async (file: File) => {
    if (!selectedResident || selectedResident === "none") return;
    setLogbookUploading(true);
    setLogbookUploadMsg(null);
    try {
      // Resize image to reduce payload size
      const base64 = await new Promise<string>((res, rej) => {
        const img = new Image();
        img.onload = () => {
          const maxW = 1600;
          const scale = img.width > maxW ? maxW / img.width : 1;
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          res(dataUrl.split(",")[1]);
        };
        img.onerror = () => rej(new Error("Failed to load image"));
        img.src = URL.createObjectURL(file);
      });

      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("extract-logbook-counts", {
        body: {
          imageBase64: base64,
          mediaType: "image/jpeg",
          profileId: selectedResident,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      console.log("Edge function response:", res);
      if (res.error) {
        const msg = typeof res.error === "object" && "message" in res.error
          ? res.error.message
          : String(res.error);
        throw new Error(msg || "Upload failed");
      }
      const result = res.data;
      if (result?.error) throw new Error(result.error);
      setLogbookUploadMsg(result.message || `Saved ${result.rows?.length || 0} entries`);
      queryClient.invalidateQueries({ queryKey: ["summary_logbook", selectedResident] });
    } catch (e: any) {
      console.error("Logbook upload error:", e);
      setLogbookUploadMsg(`Error: ${e.message}`);
    } finally {
      setLogbookUploading(false);
      if (logbookFileRef.current) logbookFileRef.current.value = "";
    }
  };
  const residentsQuery = useQuery({
    queryKey: ["summary_residents"],
    enabled: !!user,
    queryFn: async () => {
      const { data: ml } = await (supabase as any).from("milestone_levels").select("resident_id");
      const ids = [...new Set((ml || []).map((m: any) => m.resident_id))];
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, graduation_year")
        .in("id", ids as string[]);
      if (error) throw error;
      return ((data || []) as ResidentProfile[]).sort((a, b) => {
        const lastA = (a.last_name || "").toLowerCase();
        const lastB = (b.last_name || "").toLowerCase();
        return lastA.localeCompare(lastB);
      });
    },
  });

  // Auto-select first resident when data loads
  useEffect(() => {
    if (selectedResident === "none" && residentsQuery.data?.length) {
      setSelectedResident(residentsQuery.data[0].id);
    }
  }, [residentsQuery.data, selectedResident]);

  const resident = (residentsQuery.data || []).find(r => r.id === selectedResident);
  const residentName = resident ? (resident.display_name || `${resident.first_name} ${resident.last_name}`) : "";
  const pgy = resident ? getPgyLevel(resident.graduation_year) : null;
  const initials = resident ? `${(resident.first_name || "")[0] || ""}${(resident.last_name || "")[0] || ""}`.toUpperCase() : "";

  // Milestone levels
  const { data: competencies } = useACGMECompetencies();
  const milestonesQuery = useQuery({
    queryKey: ["summary_milestones", selectedResident],
    enabled: !!selectedResident && selectedResident !== "none",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("milestone_levels")
        .select("subcategory_id, level")
        .eq("resident_id", selectedResident);
      if (error) throw error;
      return (data || []) as { subcategory_id: string; level: number }[];
    },
  });

  const allSubcategories = useMemo(() => {
    if (!competencies) return [];
    return competencies.flatMap(cat =>
      cat.subcategories.map(sub => ({
        id: sub.id, code: sub.code, name: sub.name,
        catCode: cat.code, color: catColors[cat.code] || "#5F7285",
      }))
    );
  }, [competencies]);

  const milestoneMap = useMemo(() => {
    const map = new Map<string, number>();
    (milestonesQuery.data || []).forEach(m => map.set(m.subcategory_id, m.level));
    return map;
  }, [milestonesQuery.data]);

  const avgMilestone = useMemo(() => {
    const vals = Array.from(milestoneMap.values());
    if (vals.length === 0) return 0;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }, [milestoneMap]);

  // Feedback
  const feedbackQuery = useQuery({
    queryKey: ["summary_feedback", selectedResident],
    enabled: !!selectedResident && selectedResident !== "none",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feedback")
        .select("id, comment, sentiment, created_at, faculty_id")
        .eq("resident_id", selectedResident)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as { id: string; comment: string; sentiment: string; created_at: string; faculty_id: string }[];
    },
  });

  // Faculty names for feedback
  const facultyIds = useMemo(() => {
    return [...new Set((feedbackQuery.data || []).map(f => f.faculty_id).filter(Boolean))];
  }, [feedbackQuery.data]);

  const facultyNamesQuery = useQuery({
    queryKey: ["summary_faculty_names", facultyIds],
    enabled: facultyIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, first_name, last_name").in("id", facultyIds);
      const map = new Map<string, string>();
      (data || []).forEach((p: any) => map.set(p.id, p.display_name || `${p.first_name || ""} ${p.last_name || ""}`));
      return map;
    },
  });

  // Evaluations
  const evalsQuery = useQuery({
    queryKey: ["summary_evals", selectedResident],
    enabled: !!selectedResident && selectedResident !== "none",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("evaluations")
        .select("id, rotation, overall_rating, date_completed, evaluator_name")
        .eq("resident_id", selectedResident)
        .order("date_completed", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as { id: string; rotation: string | null; overall_rating: number | null; date_completed: string | null; evaluator_name: string }[];
    },
  });

  // Procedures
  const procsQuery = useQuery({
    queryKey: ["summary_procs", selectedResident],
    enabled: !!selectedResident && selectedResident !== "none",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("procedure_logs")
        .select("id, procedure_name, role, date_performed")
        .eq("resident_id", selectedResident)
        .order("date_performed", { ascending: false });
      if (error) throw error;
      return (data || []) as { id: string; procedure_name: string; role: string | null; date_performed: string | null }[];
    },
  });

  // Schedule
  const scheduleQuery = useQuery({
    queryKey: ["summary_schedule", selectedResident],
    enabled: !!selectedResident && selectedResident !== "none",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("block_schedule")
        .select("block_number, block_start, block_end, rotation")
        .eq("resident_id", selectedResident)
        .order("block_number");
      if (error) throw error;
      return (data || []) as { block_number: number; block_start: string; block_end: string; rotation: string }[];
    },
  });

  // Logbook counts
  const logbookQuery = useQuery({
    queryKey: ["summary_logbook", selectedResident],
    enabled: !!selectedResident && selectedResident !== "none",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("logbook_counts")
        .select("encounter_type, total")
        .eq("profile_id", selectedResident)
        .order("encounter_type");
      if (error) throw error;
      return (data || []) as { encounter_type: string; total: number }[];
    },
  });

  // Computed values
  const feedbackList = feedbackQuery.data || [];
  const posCount = feedbackList.filter(f => f.sentiment === "positive").length;
  const negCount = feedbackList.filter(f => f.sentiment === "negative").length;

  const evalsList = evalsQuery.data || [];

  const procsList = procsQuery.data || [];
  const procPerform = procsList.filter(p => (p.role || "").toLowerCase() === "perform" || !p.role).length;
  const procAssist = procsList.filter(p => (p.role || "").toLowerCase() === "assist").length;
  const procObserve = procsList.filter(p => (p.role || "").toLowerCase() === "observe").length;

  // Procedure counts with role breakdown
  const procCounts = useMemo(() => {
    const map = new Map<string, { perf: number; asst: number; obs: number; none: number; total: number }>();
    procsList.forEach(p => {
      const entry = map.get(p.procedure_name) || { perf: 0, asst: 0, obs: 0, none: 0, total: 0 };
      const role = (p.role || "").toLowerCase();
      if (role === "perform") entry.perf++;
      else if (role === "assist") entry.asst++;
      else if (role === "observe") entry.obs++;
      else entry.none++;
      entry.total++;
      map.set(p.procedure_name, entry);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [procsList]);

  const logbookList = logbookQuery.data || [];

  // Current + next blocks
  const scheduleBlocks = useMemo(() => {
    const blocks = scheduleQuery.data || [];
    const today = new Date();
    const currentIdx = blocks.findIndex(b => {
      const start = new Date(b.block_start + "T00:00:00");
      const end = new Date(b.block_end + "T23:59:59");
      return today >= start && today <= end;
    });
    const startIdx = currentIdx >= 0 ? currentIdx : 0;
    return blocks.slice(startIdx, startIdx + 3).map((b, i) => ({ ...b, isCurrent: i === 0 && currentIdx >= 0 }));
  }, [scheduleQuery.data]);

  const ratingLabel = (r: number | null) => {
    if (r === null) return "—";
    if (r >= 3) return "Exceeds";
    if (r >= 2) return "Meets";
    return "Needs Improvement";
  };
  const ratingStyle = (r: number | null) => {
    if (r === null) return { background: "#E7EBEF", color: "#8A9AAB" };
    if (r >= 3) return { background: "#E4F0EB", color: "#27500A" };
    if (r >= 2) return { background: "#E4F0EB", color: "#27500A" };
    return { background: "#FCEBEB", color: "#791F1F" };
  };

  const pillColors = [
    { bg: "#E6F1FB", fg: "#0C447C" },
    { bg: "#E1F5EE", fg: "#085041" },
    { bg: "#FAEEDA", fg: "#633806" },
    { bg: "#EEEDFE", fg: "#3C3489" },
    { bg: "#FAECE7", fg: "#712B13" },
    { bg: "#FBEAF0", fg: "#72243E" },
  ];

  const secStyle: React.CSSProperties = {
    background: "#E7EBEF", border: "0.5px solid #C9CED4", borderRadius: 12, padding: "14px 16px", marginBottom: 12,
  };
  const secTitle: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: "#2D3748", marginBottom: 10 };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <NotificationBell />
          </HeaderLogo>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "12px 16px 100px" }}>
        {/* Resident selector */}
        <div style={{ marginBottom: 16 }}>
          <Select value={selectedResident} onValueChange={setSelectedResident}>
            <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff", fontSize: 14 }}>
              <SelectValue placeholder="Select a resident" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>Select a resident</SelectItem>
              {(residentsQuery.data || []).map(r => {
                const last = r.last_name || "";
                const firstInitial = r.first_name ? r.first_name.charAt(0) + "." : "";
                const label = last && firstInitial ? `${last}, ${firstInitial}` : r.display_name || `${r.first_name || ""} ${last}`;
                return (
                  <SelectItem key={r.id} value={r.id}>{label}</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {selectedResident === "none" ? (
          <div style={{ textAlign: "center", padding: 60, color: "#8A9AAB", fontSize: 14 }}>
            Select a resident to view their summary
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 0 16px" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#415162", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 500, fontSize: 16, color: "#fff", flexShrink: 0 }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 500, color: "#2D3748" }}>{residentName}</div>
                <div style={{ fontSize: 13, color: "#8A9AAB" }}>
                  {pgy ? `PGY-${pgy}` : ""}{resident?.graduation_year ? ` · Class of ${resident.graduation_year}` : ""} · Family Medicine
                </div>
              </div>
            </div>

            {/* Metric cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "#E7EBEF", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#8A9AAB", marginBottom: 2 }}>Feedback</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: "#2D3748" }}>{feedbackList.length}</div>
                <div style={{ fontSize: 11, color: "#4A846C" }}>{posCount} positive</div>
              </div>
              <div style={{ background: "#E7EBEF", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#8A9AAB", marginBottom: 2 }}>Evaluations</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: "#2D3748" }}>{evalsList.length}</div>
                <div style={{ fontSize: 11, color: "#8A9AAB" }}>rotations</div>
              </div>
              <div style={{ background: "#E7EBEF", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#8A9AAB", marginBottom: 2 }}>Procedures</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: "#2D3748" }}>{procsList.length}</div>
                <div style={{ fontSize: 11, color: "#8A9AAB" }}>{procPerform} performed</div>
              </div>
              <div style={{ background: "#E7EBEF", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#8A9AAB", marginBottom: 2 }}>Avg milestone</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: "#2D3748" }}>{avgMilestone.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: "#8A9AAB" }}>{milestoneMap.size} of 19</div>
              </div>
            </div>

            {/* Milestone levels */}
            <div style={secStyle}>
              <div style={secTitle}>Milestone levels</div>
              {allSubcategories.map(sub => {
                const level = milestoneMap.get(sub.id);
                const pct = level != null ? (level / 5) * 100 : 0;
                return (
                  <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <div style={{ fontSize: 11, color: "#8A9AAB", width: 42, textAlign: "right", flexShrink: 0 }}>{sub.code}</div>
                    <div style={{ flex: 1, height: 14, background: "#D5DAE0", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: sub.color, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "#5F7285", width: 26, flexShrink: 0 }}>
                      {level != null ? level.toFixed(1) : "—"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current rotation */}
            {scheduleBlocks.length > 0 && (
              <div style={secStyle}>
                <div style={secTitle}>Current rotation</div>
                {scheduleBlocks.map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "#8A9AAB", width: 24 }}>B{b.block_number}</div>
                    <span style={{ fontSize: 10, fontWeight: 500, color: "#fff", background: "#415162", borderRadius: 3, padding: "2px 6px" }}>
                      {b.rotation.split("(")[0].replace("FM:", "").replace("IM:", "").trim().slice(0, 10)}
                    </span>
                    <span style={{ fontSize: 11, color: "#8A9AAB" }}>{formatDate(b.block_start)} – {formatDate(b.block_end)}</span>
                    {b.isCurrent && (
                      <span style={{ fontSize: 9, fontWeight: 500, color: "#378ADD", background: "#E6F1FB", borderRadius: 3, padding: "1px 5px" }}>current</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Recent feedback */}
            {feedbackList.length > 0 && (
              <div style={secStyle}>
                <div style={secTitle}>Recent feedback</div>
                {feedbackList.slice(0, 5).map(fb => (
                  <div key={fb.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: "0.5px solid #D5DAE0" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0, background: fb.sentiment === "positive" ? "#4A846C" : "#E24B4A" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "#2D3748", lineHeight: 1.5 }}>{fb.comment}</div>
                      <div style={{ fontSize: 11, color: "#8A9AAB" }}>
                        {facultyNamesQuery.data?.get(fb.faculty_id) || "Faculty"} · {formatDate(fb.created_at?.split("T")[0])}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent evaluations */}
            {evalsList.length > 0 && (
              <div style={secStyle}>
                <div style={secTitle}>Recent evaluations</div>
                {evalsList.slice(0, 5).map(ev => (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "0.5px solid #D5DAE0" }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#2D3748", flex: 1 }}>{ev.rotation || "—"}</div>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, ...ratingStyle(ev.overall_rating) }}>
                      {ratingLabel(ev.overall_rating)}
                    </span>
                    <span style={{ fontSize: 11, color: "#8A9AAB" }}>{formatDate(ev.date_completed)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Procedures */}
            {procsList.length > 0 && (
              <div style={secStyle}>
                <div style={secTitle}>Procedures</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "4px 6px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>Procedure</th>
                        <th style={{ textAlign: "center", padding: "4px 6px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0", width: 40 }}>Perf</th>
                        <th style={{ textAlign: "center", padding: "4px 6px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0", width: 40 }}>Asst</th>
                        <th style={{ textAlign: "center", padding: "4px 6px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0", width: 40 }}>Obs</th>
                        {procCounts.some(([, c]) => c.none > 0) && (
                          <th style={{ textAlign: "center", padding: "4px 6px", fontSize: 11, color: "#D4A017", fontWeight: 500, borderBottom: "1px solid #D5DAE0", width: 30 }}>—</th>
                        )}
                        <th style={{ textAlign: "center", padding: "4px 6px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0", width: 40 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {procCounts.map(([proc, counts], i) => (
                        <tr key={proc} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.03)" }}>
                          <td style={{ padding: "4px 6px", color: "#2D3748", fontWeight: 500 }}>{proc.replace("*", "")}</td>
                          <td style={{ textAlign: "center", padding: "4px 6px", color: counts.perf > 0 ? "#4A846C" : "#D5DAE0" }}>{counts.perf || "—"}</td>
                          <td style={{ textAlign: "center", padding: "4px 6px", color: counts.asst > 0 ? "#378ADD" : "#D5DAE0" }}>{counts.asst || "—"}</td>
                          <td style={{ textAlign: "center", padding: "4px 6px", color: counts.obs > 0 ? "#8A9AAB" : "#D5DAE0" }}>{counts.obs || "—"}</td>
                          {procCounts.some(([, c]) => c.none > 0) && (
                            <td style={{ textAlign: "center", padding: "4px 6px", color: counts.none > 0 ? "#D4A017" : "#D5DAE0" }}>{counts.none || "—"}</td>
                          )}
                          <td style={{ textAlign: "center", padding: "4px 6px", color: "#2D3748", fontWeight: 500 }}>{counts.total}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ padding: "6px 6px 4px", color: "#5F7285", fontWeight: 500, borderTop: "1px solid #D5DAE0" }}>Total</td>
                        <td style={{ textAlign: "center", padding: "6px 6px 4px", color: "#4A846C", fontWeight: 500, borderTop: "1px solid #D5DAE0" }}>{procPerform}</td>
                        <td style={{ textAlign: "center", padding: "6px 6px 4px", color: "#378ADD", fontWeight: 500, borderTop: "1px solid #D5DAE0" }}>{procAssist}</td>
                        <td style={{ textAlign: "center", padding: "6px 6px 4px", color: "#8A9AAB", fontWeight: 500, borderTop: "1px solid #D5DAE0" }}>{procObserve}</td>
                        {procCounts.some(([, c]) => c.none > 0) && (
                          <td style={{ textAlign: "center", padding: "6px 6px 4px", color: "#D4A017", fontWeight: 500, borderTop: "1px solid #D5DAE0" }}>{procsList.filter(p => !p.role || (p.role || "").toLowerCase() === "").length}</td>
                        )}
                        <td style={{ textAlign: "center", padding: "6px 6px 4px", color: "#2D3748", fontWeight: 500, borderTop: "1px solid #D5DAE0" }}>{procsList.length}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Log book counts */}
            {(logbookList.length > 0 || canUploadLogbook) && (
              <div style={secStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={secTitle as any}>Log book counts</div>
                  {canUploadLogbook && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {logbookUploadMsg && (
                        <span style={{ fontSize: 11, color: logbookUploadMsg.startsWith("Error") ? "#9F2929" : "#4A846C" }}>
                          {logbookUploadMsg}
                        </span>
                      )}
                      <input
                        ref={logbookFileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleLogbookUpload(f);
                        }}
                      />
                      <button
                        onClick={() => logbookFileRef.current?.click()}
                        disabled={logbookUploading}
                        style={{
                          fontSize: 11, fontWeight: 500, color: "#fff", background: "#415162",
                          border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer",
                          opacity: logbookUploading ? 0.6 : 1,
                        }}
                      >
                        {logbookUploading ? "Extracting..." : "Upload screenshot"}
                      </button>
                    </div>
                  )}
                </div>
                {logbookList.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "4px 6px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>Encounter type</th>
                          <th style={{ textAlign: "center", padding: "4px 6px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0", width: 50 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logbookList.map((row, i) => (
                          <tr key={row.encounter_type} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.03)" }}>
                            <td style={{ padding: "4px 6px", color: "#2D3748", fontWeight: 500 }}>{row.encounter_type}</td>
                            <td style={{ textAlign: "center", padding: "4px 6px", color: "#2D3748", fontWeight: 500 }}>{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#8A9AAB", padding: "8px 0" }}>
                    No log book data yet. Upload a screenshot from New Innovations to populate.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ABFM Core Competencies */}
        {selectedResident && selectedResident !== "none" && (
          <ABFMCompetencies profileId={selectedResident} isAdmin={!!isAdmin.data} />
        )}
      </main>
    </div>
  );
};

export default ResidentSummary;
