import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────
export interface ProgramRequirement {
  id: string;
  requirement_number: string;
  requirement_text: string;
  requirement_type: "core" | "detail" | "outcome";
  section_number: number;
  section_name: string;
  subsection_key: string;
  subsection_name: string;
  parent_requirement_number: string | null;
  sort_order: number;
  compliance_status: "compliant" | "partially_compliant" | "non_compliant" | "not_applicable" | "not_reviewed";
  compliance_narrative: string | null;
  responsible_person_id: string | null;
  evidence_links: { label: string; url: string }[];
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceNarrativeSection {
  id: string;
  slug: string;
  title: string;
  icon: string;
  content: string;
  display_order: number;
  role_visibility: string;
  parent_id: string | null;
  doc_type: string;
  updated_at: string;
  updated_by: string | null;
}

export type ComplianceStatus = ProgramRequirement["compliance_status"];

export const STATUS_CONFIG: Record<ComplianceStatus, { label: string; color: string; bg: string }> = {
  compliant:          { label: "Met",             color: "#4A846C", bg: "#E8F5EE" },
  partially_compliant:{ label: "Partially Met",   color: "#D4A017", bg: "#FDF6E3" },
  non_compliant:      { label: "Not Met",         color: "#C0392B", bg: "#FDECEB" },
  not_applicable:     { label: "N/A",             color: "#888",    bg: "#F0F0F0" },
  not_reviewed:       { label: "Not Reviewed",    color: "#999",    bg: "#F5F5F5" },
};

export const SECTION_NAMES: Record<number, string> = {
  1: "Oversight",
  2: "Personnel",
  3: "Resident Appointments",
  4: "Educational Program",
  5: "Evaluation",
  6: "The Learning and Working Environment",
};

export const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  core:    { label: "Core",    color: "#415162" },
  detail:  { label: "Detail",  color: "#7A8FA0" },
  outcome: { label: "Outcome", color: "#52657A" },
};

// ── Requirements Queries ─────────────────────────────────────────────────
export function useRequirements() {
  return useQuery<ProgramRequirement[]>({
    queryKey: ["program-requirements"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("program_requirements" as any)
        .select("*")
        .order("sort_order", { ascending: true }) as any);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        evidence_links: Array.isArray(r.evidence_links) ? r.evidence_links : [],
      })) as ProgramRequirement[];
    },
  });
}

export function useRequirementsMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["program-requirements"] });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, userId }: { id: string; status: ComplianceStatus; userId: string }) => {
      const { error } = await (supabase
        .from("program_requirements" as any)
        .update({
          compliance_status: status,
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: userId,
        } as any)
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateNarrative = useMutation({
    mutationFn: async ({ id, narrative, userId }: { id: string; narrative: string; userId: string }) => {
      const { error } = await (supabase
        .from("program_requirements" as any)
        .update({
          compliance_narrative: narrative,
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: userId,
        } as any)
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateResponsible = useMutation({
    mutationFn: async ({ id, personId, userId }: { id: string; personId: string | null; userId: string }) => {
      const { error } = await (supabase
        .from("program_requirements" as any)
        .update({
          responsible_person_id: personId,
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: userId,
        } as any)
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateEvidenceLinks = useMutation({
    mutationFn: async ({ id, links, userId }: { id: string; links: { label: string; url: string }[]; userId: string }) => {
      const { error } = await (supabase
        .from("program_requirements" as any)
        .update({
          evidence_links: links,
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: userId,
        } as any)
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { updateStatus, updateNarrative, updateResponsible, updateEvidenceLinks };
}

// ── Narrative Document Queries ───────────────────────────────────────────
export function useComplianceNarrative() {
  return useQuery<ComplianceNarrativeSection[]>({
    queryKey: ["compliance-narrative"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handbook_sections")
        .select("*")
        .eq("doc_type", "compliance")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as ComplianceNarrativeSection[]) || [];
    },
  });
}

export function useComplianceNarrativeMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["compliance-narrative"] });

  const updateSection = useMutation({
    mutationFn: async ({ id, title, content, userId }: { id: string; title: string; content: string; userId: string }) => {
      const { error } = await supabase
        .from("handbook_sections")
        .update({ title, content, updated_at: new Date().toISOString(), updated_by: userId } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addSection = useMutation({
    mutationFn: async ({ title, parentId, maxOrder, userId }: { title: string; parentId: string | null; maxOrder: number; userId: string }) => {
      const slug = `compliance-${Date.now()}`;
      const { error } = await supabase
        .from("handbook_sections")
        .insert([{
          slug,
          title,
          icon: parentId ? "file-text" : "shield-check",
          content: "",
          display_order: maxOrder + 10,
          role_visibility: "admin_only",
          doc_type: "compliance",
          parent_id: parentId,
          updated_by: userId,
        }] as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("handbook_sections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { updateSection, addSection, deleteSection };
}
