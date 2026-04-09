import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useAdmin } from "@/hooks/useAdmin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";

interface PatientComment {
  id: string;
  received_date: string;
  survey_section: string;
  comment_question: string;
  provider_name: string;
  profile_id: string | null;
  rating: string;
  comment: string;
  survey_barcode: string;
  month_label: string;
}

interface ProfileRef {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  ni_names: string | null;
}

const RATING_STYLE: Record<string, { bg: string; color: string }> = {
  positive: { bg: "#E4F0EB", color: "#27500A" },
  neutral: { bg: "#D6DEE6", color: "#415162" },
  negative: { bg: "#FBF3E0", color: "#854F0B" },
  mixed: { bg: "#FAEEDA", color: "#633806" },
  open: { bg: "#E7EBEF", color: "#5F7285" },
};

const SECTION_ORDER = ["Access", "Moving Through Your Visit", "Nurse/Assistant", "Care Provider", "Personal Issues", "Overall Assessment"];

// Match a provider_name against profiles (excluding faculty)
function matchProfile(providerName: string, profiles: ProfileRef[]): string | null {
  const pn = providerName.toLowerCase().trim();
  for (const p of profiles) {
    const fn = (p.first_name || "").toLowerCase();
    const ln = (p.last_name || "").toLowerCase();
    // "Last, First..." pattern
    if (pn.startsWith(ln + ", " + fn) || pn.startsWith(ln + "," + fn)) return p.id;
    if (fn && ln && pn.includes(ln) && pn.includes(fn)) return p.id;
    // Check ni_names variants
    if (p.ni_names) {
      const variants = p.ni_names.split(";").map((s) => s.toLowerCase().trim()).filter(Boolean);
      for (const v of variants) {
        if (v === pn || pn.startsWith(v) || v.startsWith(pn)) return p.id;
      }
    }
  }
  return null;
}

function displayName(comment: PatientComment, profileMap: Map<string, ProfileRef>): string {
  if (comment.profile_id && profileMap.has(comment.profile_id)) {
    const p = profileMap.get(comment.profile_id)!;
    if (p.last_name && p.first_name) return `${p.last_name}, ${p.first_name}`;
    return p.display_name || comment.provider_name;
  }
  return comment.provider_name;
}

const PatientSatisfaction = () => {
  const { user, signOut } = useAuth();
  const { isAdmin: isAdminQuery } = useAdmin();
  const isAdmin = !!isAdminQuery.data;
  const { has: hasPerm } = usePermissions();
  const canEdit = isAdmin || hasPerm("patient_satisfaction.edit");
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [monthFilter, setMonthFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Fetch all comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["patient_comments"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("patient_comments" as any).select("*").order("received_date", { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as PatientComment[];
    },
  });

  // Fetch profiles (non-faculty only) for matching and display
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_for_comments"],
    queryFn: async () => {
      // Get all profiles, then exclude faculty via user_roles
      const { data: roles } = await (supabase.from("user_roles" as any).select("user_id, role").eq("role", "faculty") as any);
      const facultyIds = new Set((roles || []).map((r: any) => r.user_id));

      const { data, error } = await (supabase.from("profiles" as any).select("id, first_name, last_name, display_name, ni_names") as any);
      if (error) throw error;
      return ((data || []) as ProfileRef[]).filter((p) => !facultyIds.has(p.id));
    },
  });

  // Also get faculty IDs to filter out their comments
  const { data: facultyProfileIds = new Set<string>() } = useQuery({
    queryKey: ["faculty_profile_ids"],
    queryFn: async () => {
      const { data: roles } = await (supabase.from("user_roles" as any).select("user_id, role").eq("role", "faculty") as any);
      return new Set((roles || []).map((r: any) => r.user_id));
    },
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileRef>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  // Filter out faculty comments
  const nonFacultyComments = useMemo(() => {
    return comments.filter((c) => !c.profile_id || !facultyProfileIds.has(c.profile_id));
  }, [comments, facultyProfileIds]);

  // Available months (sorted newest first)
  const months = useMemo(() => {
    const set = new Set(nonFacultyComments.map((c) => c.month_label));
    return Array.from(set).sort((a, b) => {
      const pa = parseMonthLabel(a);
      const pb = parseMonthLabel(b);
      return pb.getTime() - pa.getTime();
    });
  }, [nonFacultyComments]);

  // Available providers (non-faculty, from filtered comments)
  const providers = useMemo(() => {
    const map = new Map<string, string>();
    nonFacultyComments.forEach((c) => {
      const key = c.profile_id || c.provider_name;
      if (!map.has(key)) {
        map.set(key, displayName(c, profileMap));
      }
    });
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [nonFacultyComments, profileMap]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = nonFacultyComments;
    if (monthFilter !== "all") {
      result = result.filter((c) => c.month_label === monthFilter);
    }
    if (providerFilter !== "all") {
      result = result.filter((c) => (c.profile_id || c.provider_name) === providerFilter);
    }
    return result;
  }, [nonFacultyComments, monthFilter, providerFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const pos = filtered.filter((c) => c.rating === "positive").length;
    const neu = filtered.filter((c) => c.rating === "neutral").length;
    const neg = filtered.filter((c) => c.rating === "negative").length;
    return { total, pos, neu, neg };
  }, [filtered]);

  // Import handler
  const handleImport = async (file: File) => {
    setImporting(true);
    setImportStatus("Reading PDF...");

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      // Determine month label from filename or prompt
      // Try to extract from filename like "Press_Ganey_-_Feb_2026.pdf"
      const monthMatch = file.name.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s_-]+(\d{4})/i);
      let monthLabel = "";
      if (monthMatch) {
        const monthNames: Record<string, string> = {
          jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr", may: "May", jun: "Jun",
          jul: "Jul", aug: "Aug", sep: "Sep", oct: "Oct", nov: "Nov", dec: "Dec",
        };
        monthLabel = `${monthNames[monthMatch[1].toLowerCase().slice(0, 3)] || monthMatch[1].slice(0, 3)} ${monthMatch[2]}`;
      }

      if (!monthLabel) {
        const input = prompt("Enter the month label (e.g. Feb 2026):");
        if (!input) { setImporting(false); setImportStatus(null); return; }
        monthLabel = input.trim();
      }

      setImportStatus("Parsing PDF with AI...");

      // Call edge function
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const resp = await supabase.functions.invoke("parse-patient-comments", {
        body: { pdfBase64: base64, monthLabel },
      });

      if (resp.error) {
        const msg = resp.error.message || resp.error?.context?.body || JSON.stringify(resp.error);
        throw new Error(msg);
      }
      const parsed = resp.data as { comments?: any[]; count?: number; error?: string };
      if (parsed.error) throw new Error(parsed.raw ? `${parsed.error}\n\nRaw: ${parsed.raw.slice(0, 300)}` : parsed.error);
      if (!parsed.comments?.length) {
        setImportStatus("No comments found in PDF.");

        setImporting(false);
        return;
      }

      setImportStatus(`Found ${parsed.count} comments. Matching providers...`);

      // Match provider names to profiles and insert
      const rows = parsed.comments.map((c: any) => ({
        received_date: c.received_date,
        survey_section: c.survey_section,
        comment_question: c.comment_question,
        provider_name: c.provider_name,
        profile_id: matchProfile(c.provider_name, profiles),
        rating: c.rating,
        comment: c.comment,
        survey_barcode: c.survey_barcode,
        month_label: c.month_label,
      }));

      setImportStatus(`Saving ${rows.length} comments...`);

      const { error } = await (supabase.from("patient_comments" as any).insert(rows as any) as any);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["patient_comments"] });
      setImportStatus(`Imported ${rows.length} comments for ${monthLabel}`);

    } catch (err: any) {
      setImportStatus(`Error: ${err.message}`);

    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <NotificationBell />
          </HeaderLogo>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "12px 24px 100px" }}>
        {/* Summary pills */}
        {!isLoading && filtered.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div style={{ background: "#E7EBEF", borderRadius: 8, padding: "8px 14px" }}>
              <div style={{ fontSize: 11, color: "#5F7285" }}>Comments</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#415162" }}>{stats.total}</div>
            </div>
            <div style={{ background: "#E4F0EB", borderRadius: 8, padding: "8px 14px" }}>
              <div style={{ fontSize: 11, color: "#3B6D11" }}>Positive</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#27500A" }}>
                {stats.pos} {stats.total > 0 && <span style={{ fontWeight: 400, fontSize: 12 }}>({Math.round(stats.pos / stats.total * 100)}%)</span>}
              </div>
            </div>
            {stats.neu > 0 && (
              <div style={{ background: "#D6DEE6", borderRadius: 8, padding: "8px 14px" }}>
                <div style={{ fontSize: 11, color: "#52657A" }}>Neutral</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#415162" }}>
                  {stats.neu} {stats.total > 0 && <span style={{ fontWeight: 400, fontSize: 12 }}>({Math.round(stats.neu / stats.total * 100)}%)</span>}
                </div>
              </div>
            )}
            {stats.neg > 0 && (
              <div style={{ background: "#FBF3E0", borderRadius: 8, padding: "8px 14px" }}>
                <div style={{ fontSize: 11, color: "#854F0B" }}>Negative</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#854F0B" }}>
                  {stats.neg} {stats.total > 0 && <span style={{ fontWeight: 400, fontSize: 12 }}>({Math.round(stats.neg / stats.total * 100)}%)</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 12 }}>
          {canEdit && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                }}
              />
              <span
                onClick={() => !importing && fileRef.current?.click()}
                style={{
                  fontSize: 13, fontWeight: 600, color: "#415162", background: "#E7EBEF",
                  padding: "4px 12px", borderRadius: 6, cursor: importing ? "wait" : "pointer",
                  userSelect: "none", opacity: importing ? 0.6 : 1,
                }}
              >
                {importing ? "Importing..." : "Import"}
              </span>
            </>
          )}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            style={{ fontSize: 13, padding: "6px 28px 6px 10px", border: "1px solid #C9CED4", borderRadius: 6, background: "#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\") no-repeat right 8px center", color: "#333", outline: "none", maxWidth: 160, WebkitAppearance: "none", MozAppearance: "none", appearance: "none" } as any}
          >
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            style={{ fontSize: 13, padding: "6px 28px 6px 10px", border: "1px solid #C9CED4", borderRadius: 6, background: "#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\") no-repeat right 8px center", color: "#333", outline: "none", maxWidth: 200, WebkitAppearance: "none", MozAppearance: "none", appearance: "none" } as any}
          >
            <option value="all">All providers</option>
            {providers.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Import status */}
        {importStatus && (
          <div style={{
            fontSize: 12, padding: "8px 12px", marginBottom: 12, borderRadius: 6,
            background: importStatus.startsWith("Error") ? "#FBF3E0" : "#E4F0EB",
            color: importStatus.startsWith("Error") ? "#854F0B" : "#27500A",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          }}>
            <span>{importStatus}</span>
            <button onClick={() => setImportStatus(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontSize: 16, padding: "0 2px", lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Comments list */}
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 20, height: 20, border: "2px solid #C9CED4", borderTopColor: "#415162", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#6B7280", fontSize: 14 }}>
            {comments.length === 0 ? "No comments yet. Import a Press Ganey PDF to get started." : "No comments match the current filters."}
          </div>
        ) : (
          <div>
            {filtered.map((c) => {
              const rs = RATING_STYLE[c.rating] || RATING_STYLE.open;
              return (
                <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid #E7EBEF" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 10px", marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#415162" }}>
                      {displayName(c, profileMap)}
                    </span>
                    <span style={{ fontSize: 11, color: "#8A9AAB" }}>{formatDate(c.received_date)}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#E7EBEF", color: "#5F7285", fontWeight: 500 }}>
                      {c.survey_section}
                    </span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: rs.bg, color: rs.color, fontWeight: 500 }}>
                      {c.rating.charAt(0).toUpperCase() + c.rating.slice(1)}
                    </span>
                  </div>
                  {c.comment && (
                    <div style={{ fontSize: 13, color: "#2D3748", lineHeight: 1.5 }}>{c.comment}</div>
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

function parseMonthLabel(label: string): Date {
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const parts = label.split(" ");
  const m = monthMap[(parts[0] || "").toLowerCase()] ?? 0;
  const y = parseInt(parts[1] || "2026");
  return new Date(y, m, 1);
}

function formatDate(d: string): string {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

export default PatientSatisfaction;
