import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { supabase } from "@/integrations/supabase/client";
import { formatPersonName } from "@/lib/dateFormat";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import { Upload, Check, ChevronDown, ChevronUp, Search, X, Trash2, Flag } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

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

interface RotationEvaluation {
  id: string;
  resident_name: string;
  resident_id: string | null;
  pgy_level: number | null;
  rotation: string;
  session_date: string | null;
  eval_start_date: string | null;
  eval_end_date: string | null;
  date_completed: string | null;
  form_type: string | null;
  quality_overall: number | null;
  teaching_feedback: number | null;
  workload: number | null;
  equitable_access: number | null;
  safe_environment: number | null;
  primary_preceptor: string | null;
  preceptor_available: number | null;
  preceptor_communication: number | null;
  strengths_comment: string | null;
  improvement_comment: string | null;
  source: string | null;
  created_at: string;
}

interface PeerEvaluation {
  id: string;
  evaluator_name: string;
  evaluator_id: string | null;
  subject_name: string;
  subject_id: string | null;
  evaluator_pgy: number | null;
  subject_pgy: number | null;
  overall_rating: number | null;
  comment: string | null;
  session_date: string | null;
  eval_start_date: string | null;
  eval_end_date: string | null;
  date_completed: string | null;
  form_type: string | null;
  source: string | null;
  created_at: string;
}

interface EvaluationView {
  id: string;
  evaluation_id: string;
  user_id: string;
  viewed_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const ratingLabel = (val: number | null): string => {
  if (val === 1) return "Needs improvement";
  if (val === 2) return "Meets expectations";
  if (val === 3) return "Exceeds expectations";
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

const rotRatingLabel = (val: number | null): string => {
  if (val === 1) return "Needs improvement";
  if (val === 2) return "Meets expectations";
  if (val === 3) return "Exceeds expectations";
  if (val === 4) return "N/A";
  return "—";
};

const rotRatingColor = (val: number | null): string => {
  if (val === 1) return "#D4A017";
  if (val === 2) return "#4A846C";
  if (val === 3) return "#52657A";
  if (val === 4) return "#8A9AAB";
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

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "—"; }
};

const hasText = (s: string | null | undefined): boolean =>
  !!(s && s.trim() && s.trim() !== "." && s.trim().toLowerCase() !== "n/a");

const nativeSelectStyle = {
  fontSize: 13,
  padding: "6px 28px 6px 10px",
  border: "1px solid #C9CED4",
  borderRadius: 6,
  background: "#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\") no-repeat right 8px center",
  color: "#333",
  outline: "none",
  WebkitAppearance: "none" as const,
  MozAppearance: "none" as const,
  appearance: "none" as const,
};

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════

const Evaluations = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { has: hasPerm } = usePermissions();
  const { data: teamMembers } = useTeamMembers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Page-level state ──
  const [activePage, setActivePage] = useState<"attending" | "rotation" | "peer">("attending");

  // ── Attending eval state ──
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterResident, setFilterResident] = useState<string>("all");
  const [filterEvaluator, setFilterEvaluator] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "unread" | "read" | "flagged">("unread");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importing, setImporting] = useState(false);

  // ── Rotation eval state ──
  const [rotExpandedId, setRotExpandedId] = useState<string | null>(null);
  const [rotFilterResident, setRotFilterResident] = useState<string>("all");
  const [rotFilterRotation, setRotFilterRotation] = useState<string>("all");
  const [rotFilterStatus, setRotFilterStatus] = useState<"all" | "unread" | "read" | "flagged">("unread");
  const [rotImportPreview, setRotImportPreview] = useState<any[] | null>(null);
  const [rotImporting, setRotImporting] = useState(false);
  const [rotFlashId, setRotFlashId] = useState<string | null>(null);
  const [rotPendingViewId, setRotPendingViewId] = useState<string | null>(null);

  // ── Peer eval state ──
  const [peerExpandedId, setPeerExpandedId] = useState<string | null>(null);
  const [peerFilterSubject, setPeerFilterSubject] = useState<string>("all");
  const [peerFilterStatus, setPeerFilterStatus] = useState<"all" | "unread" | "read" | "flagged">("unread");
  const [peerImportPreview, setPeerImportPreview] = useState<any[] | null>(null);
  const [peerImporting, setPeerImporting] = useState(false);
  const [peerFlashId, setPeerFlashId] = useState<string | null>(null);
  const [peerPendingViewId, setPeerPendingViewId] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════
  // Attending evaluations queries
  // ═══════════════════════════════════════════════════════════════════════

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

  const flagsQuery = useQuery({
    queryKey: ["evaluation_flags", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("evaluation_flags")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as { id: string; evaluation_id: string; user_id: string }[];
    },
  });

  const flaggedSet = useMemo(() => {
    const s = new Set<string>();
    (flagsQuery.data || []).forEach(f => s.add(f.evaluation_id));
    return s;
  }, [flagsQuery.data]);

  const toggleFlag = async (evalId: string) => {
    if (flaggedSet.has(evalId)) {
      const flag = (flagsQuery.data || []).find(f => f.evaluation_id === evalId);
      if (flag) await (supabase as any).from("evaluation_flags").delete().eq("id", flag.id);
    } else {
      await (supabase as any).from("evaluation_flags").insert({ evaluation_id: evalId, user_id: user!.id });
    }
    queryClient.invalidateQueries({ queryKey: ["evaluation_flags"] });
  };

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

  const evaluators = useMemo(() => {
    const evals = evaluationsQuery.data || [];
    const set = new Set<string>();
    evals.forEach(e => { if (e.evaluator_name) set.add(e.evaluator_name); });
    return Array.from(set).sort();
  }, [evaluationsQuery.data]);

  const filtered = useMemo(() => {
    let evals = evaluationsQuery.data || [];
    if (filterResident !== "all") evals = evals.filter(e => e.resident_name === filterResident);
    if (filterEvaluator !== "all") evals = evals.filter(e => e.evaluator_name === filterEvaluator);
    if (filterStatus === "unread") evals = evals.filter(e => !viewedSet.has(e.id) || pendingViewId === e.id);
    else if (filterStatus === "read") evals = evals.filter(e => viewedSet.has(e.id));
    else if (filterStatus === "flagged") evals = evals.filter(e => flaggedSet.has(e.id));
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

  const baseFiltered = useMemo(() => {
    let evals = evaluationsQuery.data || [];
    if (filterResident !== "all") evals = evals.filter(e => e.resident_name === filterResident);
    if (filterEvaluator !== "all") evals = evals.filter(e => e.evaluator_name === filterEvaluator);
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
  }, [evaluationsQuery.data, filterResident, filterEvaluator, searchQuery]);

  const unviewedCount = useMemo(() => baseFiltered.filter(e => !viewedSet.has(e.id)).length, [baseFiltered, viewedSet]);
  const viewedCount = useMemo(() => baseFiltered.filter(e => viewedSet.has(e.id)).length, [baseFiltered, viewedSet]);
  const flaggedCount = useMemo(() => baseFiltered.filter(e => flaggedSet.has(e.id)).length, [baseFiltered, flaggedSet]);

  // ── Attending import handler ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    let text: string;
    try { text = new TextDecoder("utf-16le").decode(buffer); } catch { text = new TextDecoder("utf-8").decode(buffer); }
    const rows = parseTabFile(text);
    if (rows.length === 0) { toast({ title: "No data found in file", variant: "destructive" }); return; }
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
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!importPreview || importPreview.length === 0) return;
    setImporting(true);
    try {
      const { data: profiles } = await (supabase as any).from("profiles").select("id, first_name, last_name, ni_names");
      const matchByNiNames = (name: string): string | null => {
        const n = name.toLowerCase().trim().replace(/\s+/g, " ");
        for (const p of (profiles || [])) {
          const niNames = (p.ni_names || "").split(";").map((s: string) => s.toLowerCase().trim()).filter(Boolean);
          for (const ni of niNames) { if (ni === n || n.startsWith(ni) || ni.startsWith(n)) return p.id; }
        }
        return null;
      };
      const records = importPreview.map(row => ({
        ...row,
        resident_id: matchByNiNames(row.resident_name),
        evaluator_id: matchByNiNames(row.evaluator_name),
        source: "new_innovations",
      }));
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
    } finally { setImporting(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Rotation evaluations queries
  // ═══════════════════════════════════════════════════════════════════════

  const rotEvalsQuery = useQuery({
    queryKey: ["rotation_evaluations"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("rotation_evaluations")
        .select("*")
        .order("date_completed", { ascending: false });
      if (error) throw error;
      return (data || []) as RotationEvaluation[];
    },
  });

  const rotViewsQuery = useQuery({
    queryKey: ["rotation_evaluation_views", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("rotation_evaluation_views")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as EvaluationView[];
    },
  });

  const rotViewedSet = useMemo(() => {
    const s = new Set<string>();
    (rotViewsQuery.data || []).forEach(v => s.add(v.evaluation_id));
    return s;
  }, [rotViewsQuery.data]);

  const rotFlagsQuery = useQuery({
    queryKey: ["rotation_evaluation_flags", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("rotation_evaluation_flags")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as { id: string; evaluation_id: string; user_id: string }[];
    },
  });

  const rotFlaggedSet = useMemo(() => {
    const s = new Set<string>();
    (rotFlagsQuery.data || []).forEach(f => s.add(f.evaluation_id));
    return s;
  }, [rotFlagsQuery.data]);

  const toggleRotFlag = async (evalId: string) => {
    if (rotFlaggedSet.has(evalId)) {
      const flag = (rotFlagsQuery.data || []).find(f => f.evaluation_id === evalId);
      if (flag) await (supabase as any).from("rotation_evaluation_flags").delete().eq("id", flag.id);
    } else {
      await (supabase as any).from("rotation_evaluation_flags").insert({ evaluation_id: evalId, user_id: user!.id });
    }
    queryClient.invalidateQueries({ queryKey: ["rotation_evaluation_flags"] });
  };

  const toggleRotView = async (evalId: string) => {
    if (rotViewedSet.has(evalId)) {
      const view = (rotViewsQuery.data || []).find(v => v.evaluation_id === evalId);
      if (view) {
        await (supabase as any).from("rotation_evaluation_views").delete().eq("id", view.id);
      }
      queryClient.invalidateQueries({ queryKey: ["rotation_evaluation_views"] });
    } else {
      setRotFlashId(evalId);
      setRotPendingViewId(evalId);
      await (supabase as any).from("rotation_evaluation_views").insert({
        evaluation_id: evalId,
        user_id: user!.id,
      });
      setTimeout(() => {
        setRotFlashId(null);
        setRotPendingViewId(null);
        queryClient.invalidateQueries({ queryKey: ["rotation_evaluation_views"] });
      }, 800);
    }
  };

  const rotResidents = useMemo(() => {
    const evals = rotEvalsQuery.data || [];
    const set = new Set<string>();
    evals.forEach(e => { if (e.resident_name) set.add(e.resident_name); });
    return Array.from(set).sort();
  }, [rotEvalsQuery.data]);

  const rotRotations = useMemo(() => {
    const evals = rotEvalsQuery.data || [];
    const set = new Set<string>();
    evals.forEach(e => { if (e.rotation) set.add(e.rotation); });
    return Array.from(set).sort();
  }, [rotEvalsQuery.data]);

  const rotBaseFiltered = useMemo(() => {
    let evals = rotEvalsQuery.data || [];
    if (rotFilterResident !== "all") evals = evals.filter(e => e.resident_name === rotFilterResident);
    if (rotFilterRotation !== "all") evals = evals.filter(e => e.rotation === rotFilterRotation);
    return evals;
  }, [rotEvalsQuery.data, rotFilterResident, rotFilterRotation]);

  const rotFiltered = useMemo(() => {
    let evals = rotBaseFiltered;
    if (rotFilterStatus === "unread") evals = evals.filter(e => !rotViewedSet.has(e.id) || rotPendingViewId === e.id);
    else if (rotFilterStatus === "read") evals = evals.filter(e => rotViewedSet.has(e.id));
    else if (rotFilterStatus === "flagged") evals = evals.filter(e => rotFlaggedSet.has(e.id));
    return evals;
  }, [rotBaseFiltered, rotFilterStatus, rotViewedSet, rotPendingViewId]);

  const rotUnviewedCount = useMemo(() => rotBaseFiltered.filter(e => !rotViewedSet.has(e.id)).length, [rotBaseFiltered, rotViewedSet]);
  const rotViewedCount = useMemo(() => rotBaseFiltered.filter(e => rotViewedSet.has(e.id)).length, [rotBaseFiltered, rotViewedSet]);
  const rotFlaggedCount = useMemo(() => rotBaseFiltered.filter(e => rotFlaggedSet.has(e.id)).length, [rotBaseFiltered, rotFlaggedSet]);

  // ── Rotation import handler ──
  const handleRotFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    let text: string;
    try { text = new TextDecoder("utf-16le").decode(buffer); } catch { text = new TextDecoder("utf-8").decode(buffer); }
    const rows = parseTabFile(text);
    if (rows.length === 0) { toast({ title: "No data found in file", variant: "destructive" }); return; }
    const parsed = rows.map(row => ({
      resident_name: row["Evaluator Name"] || "",
      pgy_level: parsePgy(row["Evaluator Status"] || ""),
      rotation: row["Subject Name"] || "",
      session_date: parseDateOnly(row["Session Date"] || ""),
      eval_start_date: parseDateOnly(row["Evaluation Start Date"] || ""),
      eval_end_date: parseDateOnly(row["Evaluation End Date"] || ""),
      date_completed: parseDate(row["Date Completed"] || ""),
      form_type: row["Evaluation Form"] || null,
      quality_overall: parseRating(row["[Question 1 Response]"] || ""),
      teaching_feedback: parseRating(row["[Question 2 Response]"] || ""),
      workload: parseRating(row["[Question 3 Response]"] || ""),
      equitable_access: parseRating(row["[Question 4 Response]"] || ""),
      safe_environment: parseRating(row["[Question 5 Response]"] || ""),
      primary_preceptor: row["[Question 6 Drop Down List]"] || row["[Question 6 Comment]"] || null,
      preceptor_available: parseRating(row["[Question 7 Response]"] || ""),
      preceptor_communication: parseRating(row["[Question 8 Response]"] || ""),
      strengths_comment: row["[Question 9 Comment]"] || null,
      improvement_comment: row["[Question 10 Comment]"] || null,
    })).filter(r => r.resident_name && r.rotation);
    setRotImportPreview(parsed);
    e.target.value = "";
  };

  const handleRotImport = async () => {
    if (!rotImportPreview || rotImportPreview.length === 0) return;
    setRotImporting(true);
    try {
      const { data: profiles } = await (supabase as any).from("profiles").select("id, first_name, last_name, ni_names");
      const matchByNiNames = (name: string): string | null => {
        const n = name.toLowerCase().trim().replace(/\s+/g, " ");
        for (const p of (profiles || [])) {
          const niNames = (p.ni_names || "").split(";").map((s: string) => s.toLowerCase().trim()).filter(Boolean);
          for (const ni of niNames) { if (ni === n || n.startsWith(ni) || ni.startsWith(n)) return p.id; }
        }
        return null;
      };
      const records = rotImportPreview.map(row => ({
        ...row,
        resident_id: matchByNiNames(row.resident_name),
        source: "new_innovations",
      }));
      const { error } = await (supabase as any)
        .from("rotation_evaluations")
        .upsert(records, { onConflict: "resident_name,rotation,date_completed", ignoreDuplicates: true });
      if (error) throw error;
      toast({ title: `Imported ${records.length} rotation evaluations` });
      setRotImportPreview(null);
      queryClient.invalidateQueries({ queryKey: ["rotation_evaluations"] });
    } catch (err: any) {
      console.error("Import error:", err);
      toast({ title: "Import failed: " + (err.message || "Unknown error"), variant: "destructive" });
    } finally { setRotImporting(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Peer evaluations queries
  // ═══════════════════════════════════════════════════════════════════════

  const peerEvalsQuery = useQuery({
    queryKey: ["peer_evaluations"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("peer_evaluations")
        .select("*")
        .order("date_completed", { ascending: false });
      if (error) throw error;
      return (data || []) as PeerEvaluation[];
    },
  });

  const peerViewsQuery = useQuery({
    queryKey: ["peer_evaluation_views", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("peer_evaluation_views")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as EvaluationView[];
    },
  });

  const peerViewedSet = useMemo(() => {
    const s = new Set<string>();
    (peerViewsQuery.data || []).forEach(v => s.add(v.evaluation_id));
    return s;
  }, [peerViewsQuery.data]);

  const peerFlagsQuery = useQuery({
    queryKey: ["peer_evaluation_flags", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("peer_evaluation_flags")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as { id: string; evaluation_id: string; user_id: string }[];
    },
  });

  const peerFlaggedSet = useMemo(() => {
    const s = new Set<string>();
    (peerFlagsQuery.data || []).forEach(f => s.add(f.evaluation_id));
    return s;
  }, [peerFlagsQuery.data]);

  const togglePeerView = async (evalId: string) => {
    if (peerViewedSet.has(evalId)) {
      const view = (peerViewsQuery.data || []).find(v => v.evaluation_id === evalId);
      if (view) await (supabase as any).from("peer_evaluation_views").delete().eq("id", view.id);
      queryClient.invalidateQueries({ queryKey: ["peer_evaluation_views"] });
    } else {
      setPeerFlashId(evalId);
      setPeerPendingViewId(evalId);
      await (supabase as any).from("peer_evaluation_views").insert({ evaluation_id: evalId, user_id: user!.id });
      setTimeout(() => {
        setPeerFlashId(null);
        setPeerPendingViewId(null);
        queryClient.invalidateQueries({ queryKey: ["peer_evaluation_views"] });
      }, 800);
    }
  };

  const togglePeerFlag = async (evalId: string) => {
    if (peerFlaggedSet.has(evalId)) {
      const flag = (peerFlagsQuery.data || []).find(f => f.evaluation_id === evalId);
      if (flag) await (supabase as any).from("peer_evaluation_flags").delete().eq("id", flag.id);
    } else {
      await (supabase as any).from("peer_evaluation_flags").insert({ evaluation_id: evalId, user_id: user!.id });
    }
    queryClient.invalidateQueries({ queryKey: ["peer_evaluation_flags"] });
  };

  const peerSubjects = useMemo(() => {
    const evals = peerEvalsQuery.data || [];
    const set = new Set<string>();
    evals.forEach(e => { if (e.subject_name) set.add(e.subject_name); });
    return Array.from(set).sort();
  }, [peerEvalsQuery.data]);

  const peerBaseFiltered = useMemo(() => {
    let evals = peerEvalsQuery.data || [];
    if (peerFilterSubject !== "all") evals = evals.filter(e => e.subject_name === peerFilterSubject);
    return evals;
  }, [peerEvalsQuery.data, peerFilterSubject]);

  const peerFiltered = useMemo(() => {
    let evals = peerBaseFiltered;
    if (peerFilterStatus === "unread") evals = evals.filter(e => !peerViewedSet.has(e.id) || peerPendingViewId === e.id);
    else if (peerFilterStatus === "read") evals = evals.filter(e => peerViewedSet.has(e.id));
    else if (peerFilterStatus === "flagged") evals = evals.filter(e => peerFlaggedSet.has(e.id));
    return evals;
  }, [peerBaseFiltered, peerFilterStatus, peerViewedSet, peerPendingViewId, peerFlaggedSet]);

  const peerUnviewedCount = useMemo(() => peerBaseFiltered.filter(e => !peerViewedSet.has(e.id)).length, [peerBaseFiltered, peerViewedSet]);
  const peerViewedCount = useMemo(() => peerBaseFiltered.filter(e => peerViewedSet.has(e.id)).length, [peerBaseFiltered, peerViewedSet]);
  const peerFlaggedCount = useMemo(() => peerBaseFiltered.filter(e => peerFlaggedSet.has(e.id)).length, [peerBaseFiltered, peerFlaggedSet]);

  // ── Peer import handler ──
  const handlePeerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    let text: string;
    try { text = new TextDecoder("utf-16le").decode(buffer); } catch { text = new TextDecoder("utf-8").decode(buffer); }
    const rows = parseTabFile(text);
    if (rows.length === 0) { toast({ title: "No data found in file", variant: "destructive" }); return; }
    const parsed = rows.map(row => ({
      evaluator_name: row["Evaluator Name"] || "",
      subject_name: row["Subject Name"] || "",
      evaluator_pgy: parsePgy(row["Evaluator Status"] || ""),
      subject_pgy: parsePgy(row["Subject Status"] || ""),
      overall_rating: parseRating(row["[Question 1 Response]"] || ""),
      comment: row["[Question 1 Comment]"] || null,
      session_date: parseDateOnly(row["Session Date"] || ""),
      eval_start_date: parseDateOnly(row["Evaluation Start Date"] || ""),
      eval_end_date: parseDateOnly(row["Evaluation End Date"] || ""),
      date_completed: parseDate(row["Date Completed"] || ""),
      form_type: row["Evaluation Form"] || null,
    })).filter(r => r.evaluator_name && r.subject_name);
    setPeerImportPreview(parsed);
    e.target.value = "";
  };

  const handlePeerImport = async () => {
    if (!peerImportPreview || peerImportPreview.length === 0) return;
    setPeerImporting(true);
    try {
      const { data: profiles } = await (supabase as any).from("profiles").select("id, first_name, last_name, ni_names");
      const matchByNiNames = (name: string): string | null => {
        const n = name.toLowerCase().trim().replace(/\s+/g, " ");
        for (const p of (profiles || [])) {
          const niNames = (p.ni_names || "").split(";").map((s: string) => s.toLowerCase().trim()).filter(Boolean);
          for (const ni of niNames) { if (ni === n || n.startsWith(ni) || ni.startsWith(n)) return p.id; }
        }
        return null;
      };
      const records = peerImportPreview.map(row => ({
        ...row,
        evaluator_id: matchByNiNames(row.evaluator_name),
        subject_id: matchByNiNames(row.subject_name),
        source: "new_innovations",
      }));
      const { error } = await (supabase as any)
        .from("peer_evaluations")
        .upsert(records, { onConflict: "evaluator_name,subject_name,date_completed", ignoreDuplicates: true });
      if (error) throw error;
      toast({ title: `Imported ${records.length} peer evaluations` });
      setPeerImportPreview(null);
      queryClient.invalidateQueries({ queryKey: ["peer_evaluations"] });
    } catch (err: any) {
      console.error("Import error:", err);
      toast({ title: "Import failed: " + (err.message || "Unknown error"), variant: "destructive" });
    } finally { setPeerImporting(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════

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

        {/* ── Page selector tabs ── */}
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E7EBEF", marginBottom: 12 }}>
          {([
            { value: "attending" as const, label: "Attending" },
            { value: "rotation" as const, label: "Resident" },
            { value: "peer" as const, label: "Peer" },
          ]).map(tab => (
            <button
              key={tab.value}
              onClick={() => setActivePage(tab.value)}
              style={{
                padding: "8px 0", marginRight: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: "transparent", border: "none",
                color: activePage === tab.value ? "#415162" : "#999",
                borderBottom: activePage === tab.value ? "2px solid #415162" : "2px solid transparent",
                marginBottom: -2,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ATTENDING EVALUATION OF RESIDENTS                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activePage === "attending" && (
          <>
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
                  { value: "read" as const, label: `Read${viewedCount > 0 ? ` (${viewedCount})` : ""}` },
                  { value: "flagged" as const, label: `Flagged${flaggedCount > 0 ? ` (${flaggedCount})` : ""}` },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterStatus(opt.value)}
                    style={{
                      padding: "5px 10px", fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer",
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
                      {row.resident_name} — {row.evaluator_name} — {row.rotation || "No rotation"} — {fmtDate(row.date_completed)}
                    </div>
                  ))}
                  {importPreview.length > 20 && (
                    <div style={{ fontSize: 12, color: "#8A9AAB", fontStyle: "italic" }}>...and {importPreview.length - 20} more</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleImport} disabled={importing}
                    style={{ padding: "8px 20px", background: "#415162", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: importing ? 0.5 : 1 }}
                  >{importing ? "Importing..." : "Confirm Import"}</button>
                  <button onClick={() => setImportPreview(null)}
                    style={{ padding: "8px 20px", background: "transparent", color: "#5F7285", border: "1px solid #C9CED4", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                  >Cancel</button>
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
                  const groups: { month: string; items: Evaluation[] }[] = [];
                  filtered.forEach(ev => {
                    let monthLabel = "Unknown";
                    try { if (ev.date_completed) monthLabel = format(parseISO(ev.date_completed), "MMMM yyyy"); } catch {}
                    const last = groups[groups.length - 1];
                    if (last && last.month === monthLabel) last.items.push(ev);
                    else groups.push({ month: monthLabel, items: [ev] });
                  });
                  return groups.map(g => (
                    <div key={g.month}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "#8A9AAB", textTransform: "uppercase", letterSpacing: "0.05em", padding: "12px 0 4px" }}>{g.month}</div>
                      {g.items.map(ev => {
                        const isExpanded = expandedId === ev.id;
                        const isViewed = viewedSet.has(ev.id) || pendingViewId === ev.id;
                        return (
                          <div key={ev.id} className="rounded-lg overflow-hidden"
                            style={{ background: flashId === ev.id ? "rgba(74,132,108,0.15)" : "#E7EBEF", border: "0.5px solid #C9CED4", transition: "background 0.4s ease", marginBottom: 8 }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer" }}
                              onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 14, fontWeight: 500, color: "#2D3748" }}>{ev.resident_name}</span>
                                  <span style={{ fontSize: 11, color: "#8A9AAB" }}>{ev.rotation || ""}</span>
                                </div>
                                <div style={{ fontSize: 11, color: "#8A9AAB" }}>{ev.evaluator_name} · {fmtDate(ev.date_completed)}</div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                <div onClick={(e) => { e.stopPropagation(); toggleFlag(ev.id); }}
                                  style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, background: flaggedSet.has(ev.id) ? "#D4A017" : "#D5DAE0", cursor: "pointer" }}
                                >
                                  <Flag style={{ width: 11, height: 11, color: flaggedSet.has(ev.id) ? "#fff" : "#5F7285" }} />
                                  <span style={{ fontSize: 10, fontWeight: 500, color: flaggedSet.has(ev.id) ? "#fff" : "#5F7285" }}>Flag</span>
                                </div>
                                <div onClick={(e) => { e.stopPropagation(); toggleView(ev.id); }}
                                  style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, background: isViewed ? "#4A846C" : "#D5DAE0", cursor: "pointer" }}
                                >
                                  <Check style={{ width: 11, height: 11, color: isViewed ? "#fff" : "#5F7285" }} />
                                  <span style={{ fontSize: 10, fontWeight: 500, color: isViewed ? "#fff" : "#5F7285" }}>Read</span>
                                </div>
                              </div>
                              {isExpanded ? <ChevronUp style={{ width: 16, height: 16, color: "#8A9AAB" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "#8A9AAB" }} />}
                            </div>
                            {isExpanded && (
                              <div style={{ padding: "0 14px 14px" }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12, fontSize: 11, color: "#5F7285" }}>
                                  <span>PGY-{ev.pgy_level || "?"}</span>
                                  <span>{ev.session_type || ""}</span>
                                  <span>{fmtDate(ev.eval_start_date)} – {fmtDate(ev.eval_end_date)}</span>
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 4 }}>Overall</div>
                                  <span style={{ fontSize: 13, fontWeight: 500, color: ratingColor(ev.overall_rating) }}>{ratingLabel(ev.overall_rating)}</span>
                                </div>
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
                                {ev.observation_types && ev.observation_types.length > 0 && ev.observation_types[0] !== "" && (
                                  <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 4 }}>Observed</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                      {ev.observation_types.map((t, i) => (
                                        <span key={i} style={{ fontSize: 11, background: "#F5F3EE", border: "0.5px solid #D5DAE0", borderRadius: 4, padding: "2px 8px", color: "#2D3748" }}>{t}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 4 }}>Patient Care Comment</div>
                                  <div style={{ fontSize: 13, color: hasText(ev.patient_care_comment) ? "#2D3748" : "#C9CED4", lineHeight: 1.5 }}>
                                    {hasText(ev.patient_care_comment) ? ev.patient_care_comment : "None"}
                                  </div>
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 4 }}>Professionalism Comment</div>
                                  <div style={{ fontSize: 13, color: hasText(ev.professionalism_comment) ? "#2D3748" : "#C9CED4", lineHeight: 1.5 }}>
                                    {hasText(ev.professionalism_comment) ? ev.professionalism_comment : "None"}
                                  </div>
                                </div>
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
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* RESIDENT EVALUATION OF ROTATIONS                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activePage === "rotation" && (
          <>
            {/* Filter bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <select
                value={rotFilterResident}
                onChange={(e) => setRotFilterResident(e.target.value)}
                style={{ ...nativeSelectStyle, flex: 1, minWidth: 0, maxWidth: 180 } as any}
              >
                <option value="all">All residents</option>
                {rotResidents.map(name => <option key={name} value={name}>{name}</option>)}
              </select>

              <select
                value={rotFilterRotation}
                onChange={(e) => setRotFilterRotation(e.target.value)}
                style={{ ...nativeSelectStyle, flex: 1, minWidth: 0, maxWidth: 180 } as any}
              >
                <option value="all">All rotations</option>
                {rotRotations.map(name => <option key={name} value={name}>{name}</option>)}
              </select>

              {isAdmin && (
                <label
                  className="hidden sm:flex"
                  style={{ alignItems: "center", gap: 6, padding: "6px 12px", background: "#415162", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", marginLeft: "auto" }}
                >
                  <Upload style={{ width: 14, height: 14 }} /> Import
                  <input type="file" accept=".tab,.tsv,.txt" onChange={handleRotFileUpload} style={{ display: "none" }} />
                </label>
              )}
            </div>

            {/* Filter bar — row 2: read/unread toggles */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "0.5px solid #C9CED4" }}>
                {([
                  { value: "all" as const, label: "All" },
                  { value: "unread" as const, label: `Unread${rotUnviewedCount > 0 ? ` (${rotUnviewedCount})` : ""}` },
                  { value: "read" as const, label: `Read${rotViewedCount > 0 ? ` (${rotViewedCount})` : ""}` },
                  { value: "flagged" as const, label: `Flagged${rotFlaggedCount > 0 ? ` (${rotFlaggedCount})` : ""}` },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setRotFilterStatus(opt.value)}
                    style={{
                      padding: "5px 10px", fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer",
                      background: rotFilterStatus === opt.value ? "#415162" : "#fff",
                      color: rotFilterStatus === opt.value ? "#fff" : "#5F7285",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Import preview */}
            {rotImportPreview && (
              <div style={{ background: "#E7EBEF", border: "1px solid #C9CED4", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#2D3748", marginBottom: 8 }}>
                  Import Preview — {rotImportPreview.length} rotation evaluations
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                  {rotImportPreview.slice(0, 20).map((row, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#5F7285", padding: "2px 0" }}>
                      {row.resident_name} — {row.rotation} — {fmtDate(row.date_completed)}
                    </div>
                  ))}
                  {rotImportPreview.length > 20 && (
                    <div style={{ fontSize: 12, color: "#8A9AAB", fontStyle: "italic" }}>...and {rotImportPreview.length - 20} more</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleRotImport} disabled={rotImporting}
                    style={{ padding: "8px 20px", background: "#415162", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: rotImporting ? 0.5 : 1 }}
                  >{rotImporting ? "Importing..." : "Confirm Import"}</button>
                  <button onClick={() => setRotImportPreview(null)}
                    style={{ padding: "8px 20px", background: "transparent", color: "#5F7285", border: "1px solid #C9CED4", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                  >Cancel</button>
                </div>
              </div>
            )}

            {/* Rotation evaluations list */}
            {rotEvalsQuery.isLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : rotFiltered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "#8A9AAB", fontSize: 14 }}>
                {(rotEvalsQuery.data || []).length === 0 ? "No rotation evaluations imported yet" : "No evaluations match filters"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(() => {
                  const groups: { month: string; items: RotationEvaluation[] }[] = [];
                  rotFiltered.forEach(ev => {
                    let monthLabel = "Unknown";
                    try { if (ev.date_completed) monthLabel = format(parseISO(ev.date_completed), "MMMM yyyy"); } catch {}
                    const last = groups[groups.length - 1];
                    if (last && last.month === monthLabel) last.items.push(ev);
                    else groups.push({ month: monthLabel, items: [ev] });
                  });
                  return groups.map(g => (
                    <div key={g.month}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "#8A9AAB", textTransform: "uppercase", letterSpacing: "0.05em", padding: "12px 0 4px" }}>{g.month}</div>
                      {g.items.map(ev => {
                        const isExpanded = rotExpandedId === ev.id;
                        const isViewed = rotViewedSet.has(ev.id) || rotPendingViewId === ev.id;
                        return (
                          <div key={ev.id} className="rounded-lg overflow-hidden"
                            style={{ background: rotFlashId === ev.id ? "rgba(74,132,108,0.15)" : "#E7EBEF", border: "0.5px solid #C9CED4", transition: "background 0.4s ease", marginBottom: 8 }}
                          >
                            {/* Collapsed row */}
                            <div
                              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer" }}
                              onClick={() => setRotExpandedId(isExpanded ? null : ev.id)}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 14, fontWeight: 500, color: "#2D3748" }}>{ev.rotation}</span>
                                </div>
                                <div style={{ fontSize: 11, color: "#8A9AAB" }}>
                                  {ev.resident_name} · PGY-{ev.pgy_level || "?"} · {fmtDate(ev.date_completed)}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                <div onClick={(e) => { e.stopPropagation(); toggleRotFlag(ev.id); }}
                                  style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, background: rotFlaggedSet.has(ev.id) ? "#D4A017" : "#D5DAE0", cursor: "pointer" }}
                                >
                                  <Flag style={{ width: 11, height: 11, color: rotFlaggedSet.has(ev.id) ? "#fff" : "#5F7285" }} />
                                  <span style={{ fontSize: 10, fontWeight: 500, color: rotFlaggedSet.has(ev.id) ? "#fff" : "#5F7285" }}>Flag</span>
                                </div>
                                <div onClick={(e) => { e.stopPropagation(); toggleRotView(ev.id); }}
                                  style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, background: isViewed ? "#4A846C" : "#D5DAE0", cursor: "pointer" }}
                                >
                                  <Check style={{ width: 11, height: 11, color: isViewed ? "#fff" : "#5F7285" }} />
                                  <span style={{ fontSize: 10, fontWeight: 500, color: isViewed ? "#fff" : "#5F7285" }}>Read</span>
                                </div>
                              </div>
                              {isExpanded ? <ChevronUp style={{ width: 16, height: 16, color: "#8A9AAB" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "#8A9AAB" }} />}
                            </div>

                            {/* Expanded content */}
                            {isExpanded && (
                              <div style={{ padding: "0 14px 14px" }} onClick={(e) => e.stopPropagation()}>
                                {/* Metadata */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12, fontSize: 11, color: "#5F7285" }}>
                                  <span>{fmtDate(ev.eval_start_date)} – {fmtDate(ev.eval_end_date)}</span>
                                  {hasText(ev.primary_preceptor) && <span>Preceptor: {ev.primary_preceptor}</span>}
                                </div>

                                {/* Rotation quality ratings */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                                  {[
                                    { label: "Quality Overall", val: ev.quality_overall },
                                    { label: "Teaching & Feedback", val: ev.teaching_feedback },
                                    { label: "Workload", val: ev.workload },
                                    { label: "Equitable Access", val: ev.equitable_access },
                                    { label: "Safe Environment", val: ev.safe_environment },
                                    { label: "Preceptor Available", val: ev.preceptor_available },
                                    { label: "Preceptor Communication", val: ev.preceptor_communication },
                                  ].map(d => (
                                    <div key={d.label} style={{ background: "#F5F3EE", borderRadius: 6, padding: "6px 10px" }}>
                                      <div style={{ fontSize: 10, color: "#8A9AAB", marginBottom: 2 }}>{d.label}</div>
                                      <div style={{ fontSize: 12, fontWeight: 500, color: rotRatingColor(d.val) }}>{rotRatingLabel(d.val)}</div>
                                    </div>
                                  ))}
                                </div>

                                {/* Comments */}
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 4 }}>Strengths</div>
                                  <div style={{ fontSize: 13, color: hasText(ev.strengths_comment) ? "#2D3748" : "#C9CED4", lineHeight: 1.5 }}>
                                    {hasText(ev.strengths_comment) ? ev.strengths_comment : "None"}
                                  </div>
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 4 }}>Suggestions for Improvement</div>
                                  <div style={{ fontSize: 13, color: hasText(ev.improvement_comment) ? "#2D3748" : "#C9CED4", lineHeight: 1.5 }}>
                                    {hasText(ev.improvement_comment) ? ev.improvement_comment : "None"}
                                  </div>
                                </div>

                                {/* Admin delete */}
                                {isAdmin && (
                                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                                    <button
                                      onClick={async () => {
                                        if (!confirm("Delete this rotation evaluation?")) return;
                                        await (supabase as any).from("rotation_evaluations").delete().eq("id", ev.id);
                                        queryClient.invalidateQueries({ queryKey: ["rotation_evaluations"] });
                                        setRotExpandedId(null);
                                        toast({ title: "Rotation evaluation deleted" });
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
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* RESIDENT PEER TO PEER                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activePage === "peer" && (
          <>
            {/* Filter bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <select
                value={peerFilterSubject}
                onChange={(e) => setPeerFilterSubject(e.target.value)}
                style={{ ...nativeSelectStyle, flex: 1, minWidth: 0, maxWidth: 200 } as any}
              >
                <option value="all">All residents</option>
                {peerSubjects.map(name => <option key={name} value={name}>{name}</option>)}
              </select>

              {isAdmin && (
                <label
                  className="hidden sm:flex"
                  style={{ alignItems: "center", gap: 6, padding: "6px 12px", background: "#415162", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", marginLeft: "auto" }}
                >
                  <Upload style={{ width: 14, height: 14 }} /> Import
                  <input type="file" accept=".tab,.tsv,.txt" onChange={handlePeerFileUpload} style={{ display: "none" }} />
                </label>
              )}
            </div>

            {/* Filter bar — row 2: read/unread/flagged toggles */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "0.5px solid #C9CED4" }}>
                {([
                  { value: "all" as const, label: "All" },
                  { value: "unread" as const, label: `Unread${peerUnviewedCount > 0 ? ` (${peerUnviewedCount})` : ""}` },
                  { value: "read" as const, label: `Read${peerViewedCount > 0 ? ` (${peerViewedCount})` : ""}` },
                  { value: "flagged" as const, label: `Flagged${peerFlaggedCount > 0 ? ` (${peerFlaggedCount})` : ""}` },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPeerFilterStatus(opt.value)}
                    style={{
                      padding: "5px 10px", fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer",
                      background: peerFilterStatus === opt.value ? "#415162" : "#fff",
                      color: peerFilterStatus === opt.value ? "#fff" : "#5F7285",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Import preview */}
            {peerImportPreview && (
              <div style={{ background: "#E7EBEF", border: "1px solid #C9CED4", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#2D3748", marginBottom: 8 }}>
                  Import Preview — {peerImportPreview.length} peer evaluations
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                  {peerImportPreview.slice(0, 20).map((row, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#5F7285", padding: "2px 0" }}>
                      {row.subject_name} — by {row.evaluator_name} — {fmtDate(row.date_completed)}
                    </div>
                  ))}
                  {peerImportPreview.length > 20 && (
                    <div style={{ fontSize: 12, color: "#8A9AAB", fontStyle: "italic" }}>...and {peerImportPreview.length - 20} more</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handlePeerImport} disabled={peerImporting}
                    style={{ padding: "8px 20px", background: "#415162", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: peerImporting ? 0.5 : 1 }}
                  >{peerImporting ? "Importing..." : "Confirm Import"}</button>
                  <button onClick={() => setPeerImportPreview(null)}
                    style={{ padding: "8px 20px", background: "transparent", color: "#5F7285", border: "1px solid #C9CED4", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                  >Cancel</button>
                </div>
              </div>
            )}

            {/* Peer evaluations list */}
            {peerEvalsQuery.isLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : peerFiltered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "#8A9AAB", fontSize: 14 }}>
                {(peerEvalsQuery.data || []).length === 0 ? "No peer evaluations imported yet" : "No evaluations match filters"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(() => {
                  const groups: { month: string; items: PeerEvaluation[] }[] = [];
                  peerFiltered.forEach(ev => {
                    let monthLabel = "Unknown";
                    try { if (ev.date_completed) monthLabel = format(parseISO(ev.date_completed), "MMMM yyyy"); } catch {}
                    const last = groups[groups.length - 1];
                    if (last && last.month === monthLabel) last.items.push(ev);
                    else groups.push({ month: monthLabel, items: [ev] });
                  });
                  return groups.map(g => (
                    <div key={g.month}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "#8A9AAB", textTransform: "uppercase", letterSpacing: "0.05em", padding: "12px 0 4px" }}>{g.month}</div>
                      {g.items.map(ev => {
                        const isExpanded = peerExpandedId === ev.id;
                        const isViewed = peerViewedSet.has(ev.id) || peerPendingViewId === ev.id;
                        return (
                          <div key={ev.id} className="rounded-lg overflow-hidden"
                            style={{ background: peerFlashId === ev.id ? "rgba(74,132,108,0.15)" : "#E7EBEF", border: "0.5px solid #C9CED4", transition: "background 0.4s ease", marginBottom: 8 }}
                          >
                            {/* Collapsed row */}
                            <div
                              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer" }}
                              onClick={() => setPeerExpandedId(isExpanded ? null : ev.id)}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 14, fontWeight: 500, color: "#2D3748" }}>{ev.subject_name}</span>
                                </div>
                                <div style={{ fontSize: 11, color: "#8A9AAB" }}>
                                  {isAdmin ? ev.evaluator_name : "Anonymous peer"} · {fmtDate(ev.date_completed)}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                <div onClick={(e) => { e.stopPropagation(); togglePeerFlag(ev.id); }}
                                  style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, background: peerFlaggedSet.has(ev.id) ? "#D4A017" : "#D5DAE0", cursor: "pointer" }}
                                >
                                  <Flag style={{ width: 11, height: 11, color: peerFlaggedSet.has(ev.id) ? "#fff" : "#5F7285" }} />
                                  <span style={{ fontSize: 10, fontWeight: 500, color: peerFlaggedSet.has(ev.id) ? "#fff" : "#5F7285" }}>Flag</span>
                                </div>
                                <div onClick={(e) => { e.stopPropagation(); togglePeerView(ev.id); }}
                                  style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, background: isViewed ? "#4A846C" : "#D5DAE0", cursor: "pointer" }}
                                >
                                  <Check style={{ width: 11, height: 11, color: isViewed ? "#fff" : "#5F7285" }} />
                                  <span style={{ fontSize: 10, fontWeight: 500, color: isViewed ? "#fff" : "#5F7285" }}>Read</span>
                                </div>
                              </div>
                              {isExpanded ? <ChevronUp style={{ width: 16, height: 16, color: "#8A9AAB" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "#8A9AAB" }} />}
                            </div>

                            {/* Expanded content */}
                            {isExpanded && (
                              <div style={{ padding: "0 14px 14px" }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12, fontSize: 11, color: "#5F7285" }}>
                                  <span>Subject: PGY-{ev.subject_pgy || "?"}</span>
                                  {isAdmin && <span>Evaluator: PGY-{ev.evaluator_pgy || "?"}</span>}
                                  <span>{fmtDate(ev.eval_start_date)} – {fmtDate(ev.eval_end_date)}</span>
                                </div>

                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 4 }}>Overall</div>
                                  <span style={{ fontSize: 13, fontWeight: 500, color: ratingColor(ev.overall_rating) }}>{ratingLabel(ev.overall_rating)}</span>
                                </div>

                                {hasText(ev.comment) && (
                                  <div style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8A9AAB", marginBottom: 4 }}>Comment</div>
                                    <div style={{ fontSize: 13, color: "#2D3748", lineHeight: 1.5 }}>{ev.comment}</div>
                                  </div>
                                )}

                                {isAdmin && (
                                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                                    <button
                                      onClick={async () => {
                                        if (!confirm("Delete this peer evaluation?")) return;
                                        await (supabase as any).from("peer_evaluations").delete().eq("id", ev.id);
                                        queryClient.invalidateQueries({ queryKey: ["peer_evaluations"] });
                                        setPeerExpandedId(null);
                                        toast({ title: "Peer evaluation deleted" });
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
          </>
        )}
      </main>
    </div>
  );
};

export default Evaluations;
