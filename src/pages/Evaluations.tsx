import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { supabase } from "@/integrations/supabase/client";
import { formatPersonName } from "@/lib/dateFormat";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import { Upload, Check, ChevronDown, ChevronUp, Search, X, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Evaluation {
  id: string;
  resident_id: string | null;
  evaluator_id: string | null;
  evaluator_name: string;
  resident_name: string;
  session_date: string | null;
  eval_start_date: string | null;
  eval_end_date: string | null;
  date_completed: string | null;
  session_type: string | null;
  rotation: string | null;
  form_type: string | null;
  pgy_level: number | null;
  overall_rating: number | null;
  observation_types: string[] | null;
  medical_knowledge: number | null;
  clinical_reasoning: number | null;
  evidence_based: number | null;
  communication: number | null;
  care_transitions: number | null;
  patient_care_comment: string | null;
  professionalism_flag: number | null;
  professionalism_comment: string | null;
  overall_comments: string | null;
  subject_comments: string | null;
  created_at: string;
}

interface EvaluationView {
  id: string;
  evaluation_id: string;
  user_id: string;
  viewed_at: string;
}

const ratingLabel = (val: number | null): string => {
  if (val === 1) return "Needs Improvement";
  if (val === 2) return "Meets Expectation";
  if (val === 3) return "Exceeds Expectation";
  if (val === 4) return "N/A";
  return "—";
};

const ratingColor = (val: number | null): string => {
  if (val === 1) return "#D4A017";
  if (val === 2) return "#4A846C";
  if (val === 3) return "#52657A";
  return "#8A9AAB";
};

const profLabel = (val: number | null): string => {
  if (val === 1) return "No Concerns";
  if (val === 2) return "Minor Concerns";
  if (val === 3) return "Significant Concerns";
  return "—";
};

const profColor = (val: number | null): string => {
  if (val === 1) return "#4A846C";
  if (val === 2) return "#D4A017";
  if (val === 3) return "#c44444";
  return "#8A9AAB";
};

const parseTabFile = (text: string): Record<string, string>[] => {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split("\t").map(h => h.replace(/^\uFEFF/, "").trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (cols[idx] || "").trim(); });
    rows.push(row);
  }
  return rows;
};

const parseDate = (s: string): string | null => {
  if (!s || !s.trim()) return null;
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch { return null; }
};

const parseDateOnly = (s: string): string | null => {
  if (!s || !s.trim()) return null;
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  } catch { return null; }
};

const parseRating = (s: string): number | null => {
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
};

const parsePgy = (s: string): number | null => {
  const m = s.match(/PRG\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
};

const Evaluations = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { has: hasPerm } = usePermissions();
  const { data: teamMembers } = useTeamMembers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterResident, setFilterResident] = useState<string>("all");
  const [filterEvaluator, setFilterEvaluator] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "unread" | "read">("unread");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importing, setImporting] = useState(false);

  const evaluationsQuery = useQuery({
    queryKey: ["evaluations"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("evaluations")
        .select("*")
        .order("date_completed", { ascending: false });
      if (error) throw error;
      return (data || []) as Evaluation[];
    },
  });

  const viewsQuery = useQuery({
    queryKey: ["evaluation_views", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("evaluation_views")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as EvaluationView[];
    },
  });

  const viewedSet = useMemo(() => {
    const s = new Set<string>();
    (viewsQuery.data || []).forEach(v => s.add(v.evaluation_id));
    return s;
  }, [viewsQuery.data]);

  const [flashId, setFlashId] = useState<string | null>(null);
  const [pendingViewId, setPendingViewId] = useState<string | null>(null);

  const toggleView = async (evalId: string) => {
    if (viewedSet.has(evalId)) {
      const view = (viewsQuery.data || []).find(v => v.evaluation_id === evalId);
      if (view) {
        await (supabase as any).from("evaluation_views").delete().eq("id", view.id);
      }
      queryClient.invalidateQueries({ queryKey: ["evaluation_views"] });
    } else {
      // Show flash first, then save after animation
      setFlashId(evalId);
      setPendingViewId(evalId);
      await (supabase as any).from("evaluation_views").insert({
        evaluation_id: evalId,
        user_id: user!.id,
      });
      setTimeout(() => {
        setFlashId(null);
        setPendingViewId(null);
        queryClient.invalidateQueries({ queryKey: ["evaluation_views"] });
      }, 800);
    }
  };

  // Build resident list from evaluations
  const residents = useMemo(() => {
    const evals = evaluationsQuery.data || [];
    const map = new Map<string, string>();
    evals.forEach(e => {
      if (e.resident_name && !map.has(e.resident_name)) {
        map.set(e.resident_name, e.resident_id || "");
      }
    });
    return Array.from(map.entries())
      .map(([name, id]) => ({ name, id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [evaluationsQuery.data]);

  // Build evaluator list from evaluations
  const evaluators = useMemo(() => {
    const evals = evaluationsQuery.data || [];
    const set = new Set<string>();
    evals.forEach(e => { if (e.evaluator_name) set.add(e.evaluator_name); });
    return Array.from(set).sort();
  }, [evaluationsQuery.data]);

  // Filter evaluations
  const filtered = useMemo(() => {
    let evals = evaluationsQuery.data || [];
    if (filterResident !== "all") {
      evals = evals.filter(e => e.resident_name === filterResident);
    }
    if (filterEvaluator !== "all") {
      evals = evals.filter(e => e.evaluator_name === filterEvaluator);
    }
    if (filterStatus === "unread") {
      evals = evals.filter(e => !viewedSet.has(e.id) || pendingViewId === e.id);
    } else if (filterStatus === "read") {
      evals = evals.filter(e => viewedSet.has(e.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      evals = evals.filter(e =>
        e.resident_name.toLowerCase().includes(q) ||
        e.evaluator_name.toLowerCase().includes(q) ||
        (e.rotation || "").toLowerCase().includes(q) ||
        (e.patient_care_comment || "").toLowerCase().includes(q) ||
        (e.professionalism_comment || "").toLowerCase().includes(q)
      );
    }
    return evals;
  }, [evaluationsQuery.data, filterResident, filterEvaluator, filterStatus, viewedSet, pendingViewId, searchQuery]);

  // Unviewed count
  const unviewedCount = useMemo(() => {
    return filtered.filter(e => !viewedSet.has(e.id)).length;
  }, [filtered, viewedSet]);

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    let text: string;
    try {
      text = new TextDecoder("utf-16le").decode(buffer);
    } catch {
      text = new TextDecoder("utf-8").decode(buffer);
    }

    const rows = parseTabFile(text);
    if (rows.length === 0) {
      toast({ title: "No data found in file", variant: "destructive" });
      return;
    }

    // Map rows to evaluation records
    const parsed = rows.map(row => ({
      evaluator_name: row["Evaluator Name"] || "",
      resident_name: row["Subject Name"] || "",
      session_date: parseDateOnly(row["Session Date"] || ""),
      eval_start_date: parseDateOnly(row["Evaluation Start Date"] || ""),
      eval_end_date: parseDateOnly(row["Evaluation End Date"] || ""),
      date_completed: parseDate(row["Date Completed"] || ""),
      session_type: row["Session"] || null,
      rotation: row["Subject Rotation"] || null,
      form_type: row["Evaluation Form"] || null,
      pgy_level: parsePgy(row["Subject Status"] || ""),
      overall_rating: parseRating(row["[Question 1 Response]"] || ""),
      observation_types: (row["[Question 2 Response]"] || "").split(",").map(s => s.trim()).filter(Boolean),
      medical_knowledge: parseRating(row["[Question 3 Response]"] || ""),
      clinical_reasoning: parseRating(row["[Question 4 Response]"] || ""),
      evidence_based: parseRating(row["[Question 5 Response]"] || ""),
      communication: parseRating(row["[Question 6 Response]"] || ""),
      care_transitions: parseRating(row["[Question 7 Response]"] || ""),
      patient_care_comment: row["[Question 8 Comment]"] || null,
      professionalism_flag: parseRating(row["[Question 9 Response]"] || ""),
      professionalism_comment: row["[Question 10 Comment]"] || null,
      overall_comments: row["Overall Comments"] || null,
      subject_comments: row["Subject Comments"] || null,
    })).filter(r => r.resident_name && r.evaluator_name);

    setImportPreview(parsed);
    // Reset file input
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!importPreview || importPreview.length === 0) return;
    setImporting(true);

    try {
      // Try to match resident names to profiles via ni_names
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, first_name, last_name, ni_names");

      const matchByNiNames = (name: string): string | null => {
        const n = name.toLowerCase().trim().replace(/\s+/g, " ");
        for (const p of (profiles || [])) {
          const niNames = (p.ni_names || "").split(";").map((s: string) => s.toLowerCase().trim()).filter(Boolean);
          for (const ni of niNames) {
            if (ni === n || n.startsWith(ni) || ni.startsWith(n)) return p.id;
          }
        }
        return null;
      };

      const matchResident = (name: string): string | null => matchByNiNames(name);
      const matchEvaluator = (name: string): string | null => matchByNiNames(name);

      const records = importPreview.map(row => ({
        ...row,
        resident_id: matchResident(row.resident_name),
        evaluator_id: matchEvaluator(row.evaluator_name),
        source: "new_innovations",
      }));

      // Insert with upsert to handle duplicates
      const { error } = await (supabase as any)
        .from("evaluations")
        .upsert(records, { onConflict: "evaluator_name,resident_name,date_completed", ignoreDuplicates: true });

      if (error) throw error;

      toast({ title: `Imported ${records.length} evaluations` });
      setImportPreview(null);
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    } catch (err: any) {
      console.error("Import error:", err);
      toast({ title: "Import failed: " + (err.message || "Unknown error"), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return "—"; }
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
              placeholder="Search evaluations..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "12px 16px 100px" }}>

        {/* Filter bar — row 1: dropdowns */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Select value={filterResident} onValueChange={setFilterResident}>
            <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff", flex: 1, minWidth: 0, maxWidth: 160, fontSize: 12 }}>
              <SelectValue placeholder="Residents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Residents</SelectItem>
              {residents.map(r => (
                <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterEvaluator} onValueChange={setFilterEvaluator}>
            <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff", flex: 1, minWidth: 0, maxWidth: 160, fontSize: 12 }}>
              <SelectValue placeholder="Evaluators" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Evaluators</SelectItem>
              {evaluators.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Admin upload — hidden on mobile */}
          {isAdmin && (
            <label
              className="hidden sm:flex"
              style={{ alignItems: "center", gap: 6, padding: "6px 12px", background: "#415162", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", marginLeft: "auto" }}
            >
              <Upload style={{ width: 14, height: 14 }} /> Import
              <input type="file" accept=".tab,.tsv,.txt" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
          )}
        </div>

        {/* Filter bar — row 2: toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "0.5px solid #C9CED4" }}>
            {([
              { value: "all" as const, label: "All" },
              { value: "unread" as const, label: `Unread${unviewedCount > 0 ? ` (${unviewedCount})` : ""}` },
              { value: "read" as const, label: "Read" },
            ]).map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                style={{
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  background: filterStatus === opt.value ? "#415162" : "#fff",
                  color: filterStatus === opt.value ? "#fff" : "#5F7285",
                  whiteSpace: "nowrap",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Import preview */}
        {importPreview && (
          <div style={{ background: "#E7EBEF", border: "1px solid #C9CED4", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#2D3748", marginBottom: 8 }}>
              Import Preview — {importPreview.length} evaluations
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
              {importPreview.slice(0, 20).map((row, i) => (
                <div key={i} style={{ fontSize: 12, color: "#5F7285", padding: "2px 0" }}>
                  {row.resident_name} — {row.evaluator_name} — {row.rotation || "No rotation"} — {formatDate(row.date_completed)}
                </div>
              ))}
              {importPreview.length > 20 && (
                <div style={{ fontSize: 12, color: "#8A9AAB", fontStyle: "italic" }}>
                  ...and {importPreview.length - 20} more
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleImport}
                disabled={importing}
                style={{ padding: "8px 20px", background: "#415162", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: importing ? 0.5 : 1 }}
              >
                {importing ? "Importing..." : "Confirm Import"}
              </button>
              <button
                onClick={() => setImportPreview(null)}
                style={{ padding: "8px 20px", background: "transparent", color: "#5F7285", border: "1px solid #C9CED4", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Evaluations list */}
        {evaluationsQuery.isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#8A9AAB", fontSize: 14 }}>
            {evaluationsQuery.data?.length === 0 ? "No evaluations imported yet" : "No evaluations match filters"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(() => {
              // Group by month from date_completed (already sorted descending)
              const groups: { month: string; items: Evaluation[] }[] = [];
              filtered.forEach(ev => {
                let monthLabel = "Unknown";
                try {
                  if (ev.date_completed) {
                    monthLabel = format(parseISO(ev.date_completed), "MMMM yyyy");
                  }
                } catch {}
                const last = groups[groups.length - 1];
                if (last && last.month === monthLabel) {
                  last.items.push(ev);
                } else {
                  groups.push({ month: monthLabel, items: [ev] });
                }
              });

              return groups.map(g => (
                <div key={g.month}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#8A9AAB", textTransform: "uppercase", letterSpacing: "0.05em", padding: "12px 0 4px" }}>
                    {g.month}
                  </div>
                  {g.items.map(ev => {
              const isExpanded = expandedId === ev.id;
              const isViewed = viewedSet.has(ev.id) || pendingViewId === ev.id;

              return (
                <div
                  key={ev.id}
                  className="rounded-lg overflow-hidden"
                  style={{
                    background: flashId === ev.id ? "rgba(74,132,108,0.15)" : "#E7EBEF",
                    border: "0.5px solid #C9CED4",
                    transition: "background 0.4s ease",
                    marginBottom: 8,
                  }}
                >
                  {/* Collapsed row */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer" }}
                    onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#2D3748" }}>
                          {ev.resident_name}
                        </span>
                        <span style={{ fontSize: 11, color: "#8A9AAB" }}>
                          {ev.rotation || ""}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#8A9AAB" }}>
                        {ev.evaluator_name} · {formatDate(ev.date_completed)}
                      </div>
                    </div>

                    {/* Viewed checkbox */}
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleView(ev.id); }}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: isViewed ? "none" : "2px solid #C9CED4",
                        background: isViewed ? "#4A846C" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {isViewed && <Check style={{ width: 12, height: 12, color: "#fff" }} />}
                    </div>

                    {isExpanded ? (
                      <ChevronUp style={{ width: 16, height: 16, color: "#8A9AAB" }} />
                    ) : (
                      <ChevronDown style={{ width: 16, height: 16, color: "#8A9AAB" }} />
                    )}
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ padding: "0 14px 14px" }} onClick={(e) => e.stopPropagation()}>
                      {/* Metadata */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12, fontSize: 11, color: "#5F7285" }}>
                        <span>PGY-{ev.pgy_level || "?"}</span>
                        <span>{ev.session_type || ""}</span>
                        <span>{formatDate(ev.eval_start_date)} – {formatDate(ev.eval_end_date)}</span>
                      </div>

                      {/* Overall rating */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 4 }}>
                          Overall
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: ratingColor(ev.overall_rating) }}>
                          {ratingLabel(ev.overall_rating)}
                        </span>
                      </div>

                      {/* Domain ratings */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                        {[
                          { label: "Medical Knowledge", val: ev.medical_knowledge },
                          { label: "Clinical Reasoning", val: ev.clinical_reasoning },
                          { label: "Evidence-Based", val: ev.evidence_based },
                          { label: "Communication", val: ev.communication },
                          { label: "Care Transitions", val: ev.care_transitions },
                        ].map(d => (
                          <div key={d.label} style={{ background: "#F5F3EE", borderRadius: 6, padding: "6px 10px" }}>
                            <div style={{ fontSize: 10, color: "#8A9AAB", marginBottom: 2 }}>{d.label}</div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: ratingColor(d.val) }}>{ratingLabel(d.val)}</div>
                          </div>
                        ))}
                        <div style={{ background: "#F5F3EE", borderRadius: 6, padding: "6px 10px" }}>
                          <div style={{ fontSize: 10, color: "#8A9AAB", marginBottom: 2 }}>Professionalism</div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: profColor(ev.professionalism_flag) }}>{profLabel(ev.professionalism_flag)}</div>
                        </div>
                      </div>

                      {/* Observation types */}
                      {ev.observation_types && ev.observation_types.length > 0 && ev.observation_types[0] !== "" && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 4 }}>
                            Observed
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {ev.observation_types.map((t, i) => (
                              <span key={i} style={{ fontSize: 11, background: "#F5F3EE", border: "0.5px solid #D5DAE0", borderRadius: 4, padding: "2px 8px", color: "#2D3748" }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comments */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 4 }}>
                          Patient Care Comment
                        </div>
                        <div style={{ fontSize: 13, color: ev.patient_care_comment && ev.patient_care_comment !== "." && ev.patient_care_comment.trim() ? "#2D3748" : "#C9CED4", lineHeight: 1.5 }}>
                          {ev.patient_care_comment && ev.patient_care_comment !== "." && ev.patient_care_comment.trim() ? ev.patient_care_comment : "None"}
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 4 }}>
                          Professionalism Comment
                        </div>
                        <div style={{ fontSize: 13, color: ev.professionalism_comment && ev.professionalism_comment !== "." && ev.professionalism_comment.trim() ? "#2D3748" : "#C9CED4", lineHeight: 1.5 }}>
                          {ev.professionalism_comment && ev.professionalism_comment !== "." && ev.professionalism_comment.trim() ? ev.professionalism_comment : "None"}
                        </div>
                      </div>

                      {/* Admin delete */}
                      {isAdmin && (
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                          <button
                            onClick={async () => {
                              if (!confirm("Delete this evaluation?")) return;
                              await (supabase as any).from("evaluations").delete().eq("id", ev.id);
                              queryClient.invalidateQueries({ queryKey: ["evaluations"] });
                              setExpandedId(null);
                              toast({ title: "Evaluation deleted" });
                            }}
                            style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", color: "#c44444", fontSize: 12 }}
                          >
                            <Trash2 style={{ width: 14, height: 14 }} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
                </div>
              ));
            })()}
          </div>
        )}
      </main>
    </div>
  );
};

export default Evaluations;
