import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const REQUIRED_PROCEDURES = [
  "Initial certification in ACLS, ALSO, and NRP/NALS",
  "Biopsy, skin (such as excisional, punch, or shave)",
  "Bracing/splinting of upper extremity or ankle",
  "Destruction of skin lesions, acrochordon removal",
  "EKG interpretation",
  "I&D superficial abscess",
  "Interpretation of basic x-rays including chest, KUB, spine, and extremities",
  "Joint injection/aspiration of large joints such as knee or shoulder",
  "Long-acting Reversible Contraception: IUD insertion and removal or implant insertion and removal",
  "Pap smear sampling and interpretation of results",
  "Simple laceration repair with sutures; suture and staple removal",
  "Toenail procedures including excision of ingrown nails and the management of onychomycosis",
  "Trigger point or other therapeutic injections",
];

interface ProcStatus {
  id: string;
  profile_id: string;
  procedure_index: number;
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

const ABFMProcedures = ({ profileId, isAdmin }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: statuses = [] } = useQuery({
    queryKey: ["abfm_procedure_status", profileId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("abfm_procedure_status" as any).select("*").eq("profile_id", profileId) as any);
      if (error) throw error;
      return (data || []) as ProcStatus[];
    },
    enabled: !!profileId,
  });

  const statusMap = useMemo(() => {
    const m = new Map<number, { id: string; status: string }>();
    statuses.forEach((s) => m.set(s.procedure_index, { id: s.id, status: s.status }));
    return m;
  }, [statuses]);

  const upsertStatus = useMutation({
    mutationFn: async ({ procedureIndex, status }: { procedureIndex: number; status: string }) => {
      const existing = statusMap.get(procedureIndex);
      if (existing) {
        const { error } = await (supabase.from("abfm_procedure_status" as any).update({ status, updated_at: new Date().toISOString(), updated_by: user?.id } as any).eq("id", existing.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("abfm_procedure_status" as any).insert({ profile_id: profileId, procedure_index: procedureIndex, status, updated_by: user?.id } as any) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abfm_procedure_status", profileId] });
    },
  });

  const handleCycleStatus = (procedureIndex: number) => {
    if (!isAdmin) return;
    const current = statusMap.get(procedureIndex)?.status || "not_assessed";
    const currentIdx = STATUS_CYCLE.findIndex((s) => s.key === current);
    const next = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    upsertStatus.mutate({ procedureIndex, status: next.key });
  };

  const competentCount = REQUIRED_PROCEDURES.filter((_, i) => statusMap.get(i)?.status === "competent").length;

  return (
    <div style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#2D3748" }}>ABFM Required Procedures</div>
        <span style={{ fontSize: 11, color: "#8A9AAB" }}>
          {competentCount} / {REQUIRED_PROCEDURES.length} competent
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0", width: 24 }}>#</th>
              <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0" }}>Procedure</th>
              <th style={{ textAlign: "center", padding: "6px 10px", fontSize: 11, color: "#8A9AAB", fontWeight: 500, borderBottom: "1px solid #D5DAE0", width: 110 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {REQUIRED_PROCEDURES.map((proc, i) => {
              const currentStatus = statusMap.get(i)?.status || "not_assessed";
              const statusInfo = STATUS_CYCLE.find((s) => s.key === currentStatus) || STATUS_CYCLE[0];

              return (
                <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.03)" }}>
                  <td style={{ padding: "8px 10px", color: "#8A9AAB", verticalAlign: "top" }}>{i + 1}</td>
                  <td style={{ padding: "8px 10px", color: "#2D3748", fontWeight: 500, lineHeight: 1.5, verticalAlign: "top" }}>{proc}</td>
                  <td style={{ padding: "8px 10px", textAlign: "center", verticalAlign: "top" }}>
                    <button
                      type="button"
                      onClick={() => handleCycleStatus(i)}
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

export default ABFMProcedures;
