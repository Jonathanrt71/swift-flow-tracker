import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

export interface CompetencyTask {
  id: string;
  title: string;
  detail: string | null;
  position: number;
  section_id: string;
}

export interface CompetencySection {
  id: string;
  name: string;
  position: number;
  competency_id: string;
  tasks: CompetencyTask[];
}

export interface Competency {
  id: string;
  title: string;
  created_by: string;
  created_at: string;
  category_id: string | null;
  sections: CompetencySection[];
}

export interface Assessment {
  id: string;
  competency_id: string;
  resident_id: string;
  assessor_id: string;
  overall_grade: number | null;
  overall_comment: string | null;
  created_at: string;
  grades: AssessmentGrade[];
}

export interface AssessmentGrade {
  id: string;
  assessment_id: string;
  task_id: string;
  grade: number;
}

export function useCompetencies() {
  const { user } = useAuth();
  const { isResident, isFaculty } = useUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const competencies = useQuery({
    queryKey: ["competencies"],
    enabled: !!user,
    queryFn: async () => {
      const { data: comps, error: compErr } = await supabase
        .from("competencies")
        .select("*")
        .order("created_at", { ascending: true });
      if (compErr) throw compErr;

      const { data: sections, error: secErr } = await supabase
        .from("competency_sections")
        .select("*")
        .order("position", { ascending: true });
      if (secErr) throw secErr;

      const { data: tasks, error: taskErr } = await supabase
        .from("competency_tasks")
        .select("*")
        .order("position", { ascending: true });
      if (taskErr) throw taskErr;

      return (comps || []).map((c) => ({
        ...c,
        sections: (sections || [])
          .filter((s) => s.competency_id === c.id)
          .map((s) => ({
            ...s,
            tasks: (tasks || []).filter((t) => t.section_id === s.id),
          })),
      })) as Competency[];
    },
  });

  const createCompetency = useMutation({
    mutationFn: async ({ title, category_id }: { title: string; category_id?: string | null }) => {
      const { error } = await supabase
        .from("competencies")
        .insert({ title, created_by: user!.id, category_id: category_id || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competencies"] });
      toast({ title: "Competency created" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateCompetency = useMutation({
    mutationFn: async ({ id, category_id }: { id: string; category_id: string | null }) => {
      const { error } = await supabase
        .from("competencies")
        .update({ category_id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competencies"] });
      toast({ title: "Category updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCompetency = useMutation({
    mutationFn: async (id: string) => {
      // Delete tasks, sections, then competency
      const { data: sections } = await supabase
        .from("competency_sections")
        .select("id")
        .eq("competency_id", id);
      if (sections && sections.length > 0) {
        const secIds = sections.map((s) => s.id);
        await supabase.from("competency_tasks").delete().in("section_id", secIds);
        await supabase.from("competency_sections").delete().eq("competency_id", id);
      }
      // Delete assessments and grades
      const { data: assessments } = await supabase
        .from("competency_assessments")
        .select("id")
        .eq("competency_id", id);
      if (assessments && assessments.length > 0) {
        const assIds = assessments.map((a) => a.id);
        await supabase.from("competency_assessment_grades").delete().in("assessment_id", assIds);
        await supabase.from("competency_assessments").delete().eq("competency_id", id);
      }
      const { error } = await supabase.from("competencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competencies"] });
      toast({ title: "Competency deleted" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveSections = useMutation({
    mutationFn: async ({
      competencyId,
      sections,
    }: {
      competencyId: string;
      sections: { id?: string; name: string; tasks: { id?: string; title: string; detail: string | null }[] }[];
    }) => {
      // Get existing sections
      const { data: existingSections } = await supabase
        .from("competency_sections")
        .select("id")
        .eq("competency_id", competencyId);
      const existingSecIds = (existingSections || []).map((s) => s.id);

      // Delete tasks for existing sections, then delete sections
      if (existingSecIds.length > 0) {
        await supabase.from("competency_tasks").delete().in("section_id", existingSecIds);
        await supabase.from("competency_sections").delete().eq("competency_id", competencyId);
      }

      // Insert new sections and tasks
      for (let si = 0; si < sections.length; si++) {
        const sec = sections[si];
        const { data: newSec, error: secErr } = await supabase
          .from("competency_sections")
          .insert({ competency_id: competencyId, name: sec.name, position: si })
          .select()
          .single();
        if (secErr) throw secErr;

        if (sec.tasks.length > 0) {
          const taskRows = sec.tasks.map((t, ti) => ({
            section_id: newSec.id,
            title: t.title,
            detail: t.detail || null,
            position: ti,
          }));
          const { error: taskErr } = await supabase
            .from("competency_tasks")
            .insert(taskRows);
          if (taskErr) throw taskErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competencies"] });
      toast({ title: "Checklist saved" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveAssessment = useMutation({
    mutationFn: async ({
      competencyId,
      residentId,
      grades,
      overallGrade,
      overallComment,
    }: {
      competencyId: string;
      residentId: string;
      grades: Record<string, number>;
      overallGrade: number | null;
      overallComment: string;
    }) => {
      const { data: assessment, error: assErr } = await supabase
        .from("competency_assessments")
        .insert({
          competency_id: competencyId,
          resident_id: residentId,
          assessor_id: user!.id,
          overall_grade: overallGrade,
          overall_comment: overallComment || null,
        })
        .select()
        .single();
      if (assErr) throw assErr;

      const gradeRows = Object.entries(grades)
        .filter(([, v]) => v != null)
        .map(([taskId, grade]) => ({
          assessment_id: assessment.id,
          task_id: taskId,
          grade,
        }));

      if (gradeRows.length > 0) {
        const { error: gradeErr } = await supabase
          .from("competency_assessment_grades")
          .insert(gradeRows);
        if (gradeErr) throw gradeErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_assessments"] });
      toast({ title: "Assessment saved" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // For residents: show assessments about them (as the resident being assessed)
  // For faculty/admin: show assessments they created
  const myAssessments = useQuery({
    queryKey: ["my_assessments", user?.id, isResident],
    enabled: !!user,
    queryFn: async () => {
      const query = supabase
        .from("competency_assessments")
        .select("*")
        .order("created_at", { ascending: false });

      if (isResident) {
        // Residents see assessments about themselves
        const { data, error } = await query.eq("resident_id", user!.id);
        if (error) throw error;
        return (data || []) as Assessment[];
      } else {
        // Faculty/admin see assessments they performed
        const { data, error } = await query.eq("assessor_id", user!.id);
        if (error) throw error;
        return (data || []) as Assessment[];
      }
    },
  });

  // Only faculty and admin can see all assessments
  const allAssessments = useQuery({
    queryKey: ["all_assessments"],
    enabled: !!user && !isResident,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competency_assessments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Assessment[];
    },
  });

  return { competencies, myAssessments, allAssessments, createCompetency, updateCompetency, deleteCompetency, saveSections, saveAssessment };
}
