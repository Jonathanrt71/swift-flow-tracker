import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ABFMCompetency {
  id: string;
  number: number;
  title: string;
  description: string;
}

interface ABFMStatus {
  id: string;
  profile_id: string;
  competency_id: string;
  status: string;
  updated_at: string;
}

const STATUS_CYCLE: { key: string; label: string; bg: string; color: string }[] = [
  { key: "not_assessed", label: "Not assessed", bg: "#E7EBEF", color: "#5F7285" },
  { key: "in_progress", label: "In progress", bg: "#FAEEDA", color: "#854F0B" },
  { key: "competent", label: "Competent", bg: "#E4F0EB", color: "#27500A" },
];

interface Props {
  profileId: string;
  isAdmin: boolean;
}

const ABFMCompetencies = ({ profileId, isAdmin }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: competencies = [] } = useQuery({
    queryKey: ["abfm_competencies"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("abfm_competencies" as any).select("*").order("number") as any);
      if (error) throw error;
      return (data || []) as ABFMCompetency[];
    },
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["abfm_competency_status", profileId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("abfm_competency_status" as any).select("*").eq("profile_id", profileId) as any);
      if (error) throw error;
      return (data || []) as ABFMStatus[];
    },
    enabled: !!profileId,
  });

  const statusMap = useMemo(() => {
    const m = new Map<string, string>();
    statuses.forEach((s) => m.set(s.competency_id, s.status));
    return m;
  }, [statuses]);

  const upsertStatus = useMutation({
    mutationFn: async ({ competencyId, status }: { competencyId: string; status: string }) => {
      const existing = statuses.find((s) => s.competency_id === competencyId);
      if (existing) {
        const { error } = await (supabase.from("abfm_competency_status" as any).update({ status, updated_at: new Date().toISOString(), updated_by: user?.id } as any).eq("id", existing.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("abfm_competency_status" as any).insert({ profile_id: profileId, competency_id: competencyId, status, updated_by: user?.id } as any) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abfm_competency_status", profileId] });
    },
  });

  const handleCycleStatus = (competencyId: string) => {
    if (!isAdmin) return;
    const current = statusMap.get(competencyId) || "not_assessed";
    const currentIdx = STATUS_CYCLE.findIndex((s) => s.key === current);
    const next = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    upsertStatus.mutate({ competencyId, status: next.key });
  };

  const competentCount = competencies.filter((c) => statusMap.get(c.id) === "competent").length;

  if (competencies.length === 0) return null;

  return (
    <div style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#2D3748" }}>ABFM Core Competencies</div>
        <span style={{ fontSize: 11, color: "#8A9AAB" }}>
          {competentCount} / {competencies.length} competent
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0", width: 24 }}>#</th>
              <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>Competency</th>
              <th style={{ textAlign: "center", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0", width: 110 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {competencies.map((c, i) => {
              const currentStatus = statusMap.get(c.id) || "not_assessed";
              const statusInfo = STATUS_CYCLE.find((s) => s.key === currentStatus) || STATUS_CYCLE[0];

              return (
                <tr key={c.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.03)" }}>
                  <td style={{ padding: "8px 10px", color: "#8A9AAB", verticalAlign: "top" }}>{c.number}</td>
                  <td style={{ padding: "8px 10px", color: "#2D3748", fontWeight: 500, lineHeight: 1.5, verticalAlign: "top" }}>{c.description}</td>
                  <td style={{ padding: "8px 10px", textAlign: "center", verticalAlign: "top" }}>
                    <button
                      type="button"
                      onClick={() => handleCycleStatus(c.id)}
                      style={{
                        fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 10,
                        background: statusInfo.bg, color: statusInfo.color, border: "none",
                        cursor: isAdmin ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap",
                      }}
                    >
                      {statusInfo.label}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ABFMCompetencies;
