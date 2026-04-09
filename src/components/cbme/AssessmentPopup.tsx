import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { X, CheckSquare } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DetailReadOnly, detailPreviewText } from "./DetailField";
import { formatLastFirst , getInitials } from "@/lib/dateFormat";
import { useQuery } from "@tanstack/react-query";
import type { Competency } from "@/hooks/useCompetencies";


const getColor = (name: string | null): string => {
  const cols = ["#378ADD", "#1D9E75", "#D85A30", "#534AB7", "#993556"];
  let h = 0;
  if (name) for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return cols[Math.abs(h) % cols.length];
};

const GRADE_COLORS = { 1: "#D4A017", 2: "#4A846C", 3: "#52657A" };

const GradeDot = ({ color, size = 16 }: { color: string; size?: number }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }} />
);

const AssessmentPopup = ({
  competency,
  onSave,
  children,
}: {
  competency: Competency;
  onSave: (data: {
    competencyId: string;
    residentId: string;
    grades: Record<string, number>;
    overallGrade: number | null;
    overallComment: string;
  }) => void;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<string | null>(null);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [overallGrade, setOverallGrade] = useState<number | null>(null);
  const [overallComment, setOverallComment] = useState("");
  const [expandedDetailId, setExpandedDetailId] = useState<string | null>(null);
  const { data: teamMembers } = useTeamMembers();
  const { user } = useAuth();

  const { data: residentIds } = useQuery({
    queryKey: ["resident_ids"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "resident");
      if (error) throw error;
      return (data || []).map((r) => r.user_id);
    },
  });

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedResident(null);
      setGrades({});
      setOverallGrade(null);
      setOverallComment("");
      setExpandedDetailId(null);
    }
    setOpen(isOpen);
  };

  const setGrade = (taskId: string, level: number) => {
    setGrades((prev) => ({ ...prev, [taskId]: prev[taskId] === level ? (undefined as any) : level }));
  };

  const totalTasks = competency.sections.reduce((s, sec) => s + sec.tasks.length, 0);
  const graded = Object.values(grades).filter((v) => v != null).length;
  const members = (teamMembers || []).filter((m) => (residentIds || []).includes(m.id));

  const resident = members.find((m) => m.id === selectedResident);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md overflow-y-auto overflow-x-hidden border-none rounded-xl p-0 max-h-[90vh] [&>button[class*='absolute']]:hidden"
        style={{ background: "#F5F3EE" }}
        overlayClassName="bg-[rgba(65,81,98,0.45)] backdrop-blur-sm"
      >
        {!selectedResident ? (
          <>
            <div className="flex items-center justify-between px-4 py-3 bg-[#415162] rounded-t-xl">
              <span className="text-sm font-medium text-white">Select resident</span>
              <button onClick={() => setOpen(false)} className="w-9 h-9 flex items-center justify-center bg-transparent border-none cursor-pointer">
                <X className="h-4 w-4 text-white/70" />
              </button>
            </div>
            <div className="px-2 pb-4">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedResident(m.id)}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-transparent border-none cursor-pointer rounded-lg text-left hover:bg-accent"
                >
                  {m.avatar_url ? (
                    <img src={m.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                      style={{ fontSize: 11, fontWeight: 500, background: getColor(m.display_name) }}
                    >
                      {getInitials(m.display_name)}
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground">{formatLastFirst(m.display_name)}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3 bg-[#415162] rounded-t-xl">
              <span className="text-sm font-medium flex-1 text-white">{competency.title}</span>
              <button onClick={() => setOpen(false)} className="w-9 h-9 flex items-center justify-center bg-transparent border-none cursor-pointer">
                <X className="h-4 w-4 text-white/70" />
              </button>
            </div>

            {/* Resident bar */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "0.5px solid #C9CED4" }}>
              {resident?.avatar_url ? (
                <img src={resident.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                  style={{ fontSize: 10, fontWeight: 500, background: getColor(resident?.display_name || null) }}
                >
                  {getInitials(resident?.display_name || null)}
                </div>
              )}
              <span className="text-[13px] font-medium">{formatLastFirst(resident?.display_name)}</span>
            </div>

            {/* Column headers */}
            <div className="flex items-center px-4 py-2" style={{ borderBottom: "0.5px solid #C9CED4" }}>
              <div className="flex-1" />
              <div className="flex gap-3">
                <div className="w-6 flex justify-center"><GradeDot color="#D4A017" /></div>
                <div className="w-6 flex justify-center"><GradeDot color="#4A846C" /></div>
                <div className="w-6 flex justify-center"><GradeDot color="#52657A" /></div>
              </div>
            </div>

            {/* Sections + tasks */}
            {competency.sections.map((sec) => (
              <div key={sec.id}>
                <div className="px-4 pt-2.5 pb-1" style={{ fontSize: 12, fontWeight: 600, color: "#415162", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {sec.name}
                </div>
                {sec.tasks.map((task) => {
                  const isDetailOpen = expandedDetailId === task.id;
                  const hasDetail = task.detail && task.detail !== "<p></p>" && task.detail.trim() !== "";
                  const previewText = detailPreviewText(task.detail);
                  return (
                    <div
                      key={task.id}
                      className={`${isDetailOpen ? "bg-[#415162]/[0.03]" : ""}`}
                      style={{ borderBottom: "0.5px solid #E7EBEF", overflow: "hidden" }}
                    >
                      <div
                        onClick={() => hasDetail ? setExpandedDetailId(isDetailOpen ? null : task.id) : null}
                        style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, padding: "8px 16px", cursor: hasDetail ? "pointer" : "default" }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
                          {hasDetail && !isDetailOpen && previewText && (
                            <div style={{ fontSize: 11, color: "#888", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewText}</div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 12, flexShrink: 0, paddingTop: 2 }}>
                          {[1, 2, 3].map((level) => (
                            <button
                              key={level}
                              onClick={(e) => { e.stopPropagation(); setGrade(task.id, level); }}
                              className="w-6 h-6 flex items-center justify-center bg-transparent border-none cursor-pointer p-0"
                            >
                              <div
                                className="w-4 h-4 rounded-full transition-all"
                                style={{
                                  border: `1.5px solid ${grades[task.id] === level ? GRADE_COLORS[level as keyof typeof GRADE_COLORS] : "#C9CED4"}`,
                                  background: grades[task.id] === level ? GRADE_COLORS[level as keyof typeof GRADE_COLORS] : "#FFF",
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      {isDetailOpen && hasDetail && (
                        <div style={{ padding: "0 16px 8px" }}>
                          <DetailReadOnly html={task.detail!} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Overall Assessment */}
            <div className="px-4 py-3" style={{ borderTop: "0.5px solid #C9CED4" }}>
              <div className="flex items-start mb-2.5">
                <span className="flex-1 pt-0.5" style={{ fontSize: 12, fontWeight: 600, color: "#415162", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Overall Assessment
                </span>
                <div className="flex gap-3 shrink-0">
                  {[1, 2, 3].map((level) => (
                    <button
                      key={level}
                      onClick={() => setOverallGrade(overallGrade === level ? null : level)}
                      className="w-6 h-6 flex items-center justify-center bg-transparent border-none cursor-pointer p-0"
                    >
                      <div
                        className="w-4 h-4 rounded-full transition-all"
                        style={{
                          border: `1.5px solid ${overallGrade === level ? GRADE_COLORS[level as keyof typeof GRADE_COLORS] : "#C9CED4"}`,
                          background: overallGrade === level ? GRADE_COLORS[level as keyof typeof GRADE_COLORS] : "#FFF",
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
                placeholder="Overall comments..."
                rows={3}
                className="w-full px-2.5 py-2 rounded-md text-xs outline-none resize-none leading-relaxed"
                style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4", color: "#333" }}
              />
            </div>

            {/* Footer */}
            <div className="px-4 pb-4 pt-3 flex items-center justify-between" style={{ borderTop: "0.5px solid #C9CED4" }}>
              <span style={{ fontSize: 11, color: "#888" }}>{graded}/{totalTasks} graded</span>
              <button
                onClick={() => {
                  onSave({
                    competencyId: competency.id,
                    residentId: selectedResident,
                    grades,
                    overallGrade,
                    overallComment,
                  });
                  setOpen(false);
                }}
                className="px-5 py-2 border-none rounded-md text-[13px] font-medium cursor-pointer"
                style={{ background: "#415162", color: "#FFF" }}
              >
                Save assessment
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AssessmentPopup;
