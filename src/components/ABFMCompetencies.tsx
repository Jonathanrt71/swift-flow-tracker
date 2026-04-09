import { useState, useMemo } from "react";
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

const ChevronSVG = ({ open }: { open: boolean }) => (
  <svg
    width={16} height={16} viewBox="0 0 24 24" fill="none"
    stroke="#8A9AAB" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}
  >
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

interface Props {
  profileId: string;
  isAdmin: boolean;
}

const ABFMCompetencies = ({ profileId, isAdmin }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Fetch competencies
  const { data: competencies = [] } = useQuery({
    queryKey: ["abfm_competencies"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("abfm_competencies" as any).select("*").order("number") as any);
      if (error) throw error;
      return (data || []) as ABFMCompetency[];
    },
  });

  // Fetch statuses for this resident
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

  // Upsert status
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

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Summary counts
  const competentCount = competencies.filter((c) => statusMap.get(c.id) === "competent").length;

  if (competencies.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#415162" }}>ABFM Core Competencies</span>
        <span style={{ fontSize: 11, color: "#8A9AAB" }}>
          {competentCount} / {competencies.length} competent
        </span>
      </div>

      <div style={{ background: "#fff", border: "1px solid #D5DAE0", borderRadius: 10, overflow: "hidden" }}>
        {competencies.map((c, i) => {
          const isOpen = expandedIds.has(c.id);
          const currentStatus = statusMap.get(c.id) || "not_assessed";
          const statusInfo = STATUS_CYCLE.find((s) => s.key === currentStatus) || STATUS_CYCLE[0];

          return (
            <div key={c.id} style={{ borderBottom: i < competencies.length - 1 ? "1px solid #E7EBEF" : "none" }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                  cursor: "pointer", background: i % 2 === 0 ? "#E7EBEF" : "#fff",
                }}
                onClick={() => toggleExpand(c.id)}
              >
                <span style={{ fontSize: 11, color: "#8A9AAB", minWidth: 18 }}>{c.number}</span>
                <ChevronSVG open={isOpen} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "#2D3748", flex: 1 }}>{c.title}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); handleCycleStatus(c.id); }}
                  style={{
                    fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 10,
                    background: statusInfo.bg, color: statusInfo.color,
                    cursor: isAdmin ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap",
                  }}
                >
                  {statusInfo.label}
                </span>
              </div>
              {isOpen && (
                <div style={{
                  fontSize: 12, color: "#5F7285", lineHeight: 1.5,
                  padding: "6px 14px 12px 56px",
                  background: i % 2 === 0 ? "#E7EBEF" : "#fff",
                }}>
                  {c.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ABFMCompetencies;
