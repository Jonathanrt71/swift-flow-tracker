import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { X, CheckSquare } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import type { Competency } from "@/hooks/useCompetencies";

const getInitials = (name: string | null): string => {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
};

const getColor = (name: string | null): string => {
  const cols = ["#378ADD", "#1D9E75", "#D85A30", "#534AB7", "#993556"];
  let h = 0;
  if (name) for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return cols[Math.abs(h) % cols.length];
};

const FaceNeutral = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="9" cy="10" r="1" fill="#999" stroke="none"/>
    <circle cx="15" cy="10" r="1" fill="#999" stroke="none"/>
    <line x1="8" y1="15" x2="16" y2="15"/>
  </svg>
);
const FaceModerate = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="9" cy="10" r="1" fill="#999" stroke="none"/>
    <circle cx="15" cy="10" r="1" fill="#999" stroke="none"/>
    <path d="M8 14.5Q12 17 16 14.5" fill="none"/>
  </svg>
);
const FaceHappy = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="9" cy="10" r="1" fill="#999" stroke="none"/>
    <circle cx="15" cy="10" r="1" fill="#999" stroke="none"/>
    <path d="M7 14Q12 19 17 14" fill="none"/>
  </svg>
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
  const members = teamMembers || [];

  const resident = members.find((m) => m.id === selectedResident);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md overflow-y-auto bg-background border-border rounded-xl p-0 max-h-[90vh] [&>button[class*='absolute']]:hidden"
        overlayClassName="bg-background/60 backdrop-blur-sm"
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
                  <span className="text-sm font-medium text-foreground">{m.display_name}</span>
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
            <div className="flex items-center gap-2 px-4 pb-3 border-b border-border">
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
              <span className="text-[13px] font-medium">{resident?.display_name}</span>
            </div>

            {/* Column headers */}
            <div className="flex items-center px-4 py-2 border-b border-border">
              <div className="flex-1" />
              <div className="flex gap-3">
                <div className="w-6 flex justify-center"><FaceNeutral /></div>
                <div className="w-6 flex justify-center"><FaceModerate /></div>
                <div className="w-6 flex justify-center"><FaceHappy /></div>
              </div>
            </div>

            {/* Sections + tasks */}
            {competency.sections.map((sec) => (
              <div key={sec.id}>
                <div className="px-4 pt-2.5 pb-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                  {sec.name}
                </div>
                {sec.tasks.map((task) => {
                  const isDetailOpen = expandedDetailId === task.id;
                  return (
                    <div
                      key={task.id}
                      className={`border-b border-muted ${isDetailOpen ? "bg-primary/[0.03]" : ""}`}
                    >
                      <div
                        onClick={() => task.detail ? setExpandedDetailId(isDetailOpen ? null : task.id) : null}
                        className={`flex items-start px-4 py-2 ${task.detail ? "cursor-pointer" : ""}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px]">{task.title}</div>
                          {task.detail && !isDetailOpen && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{task.detail}...</div>
                          )}
                        </div>
                        <div className="flex gap-3 shrink-0 pt-0.5">
                          {[1, 2, 3].map((level) => (
                            <button
                              key={level}
                              onClick={(e) => { e.stopPropagation(); setGrade(task.id, level); }}
                              className="w-6 h-6 flex items-center justify-center bg-transparent border-none cursor-pointer p-0"
                            >
                              <div
                                className="w-4 h-4 rounded-full transition-all"
                                style={{
                                  border: `1.5px solid ${grades[task.id] === level ? "#415162" : "#C9CED4"}`,
                                  background: grades[task.id] === level ? "#415162" : "#FFF",
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      {isDetailOpen && task.detail && (
                        <div className="px-4 pb-2 text-[11px] text-muted-foreground leading-relaxed">
                          {task.detail}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Overall Assessment */}
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-start mb-2.5">
                <span className="flex-1 text-xs font-semibold text-primary uppercase tracking-wider pt-0.5">
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
                          border: `1.5px solid ${overallGrade === level ? "#415162" : "#C9CED4"}`,
                          background: overallGrade === level ? "#415162" : "#FFF",
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
                className="w-full px-2.5 py-2 bg-muted border border-border rounded-md text-xs outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Footer */}
            <div className="px-4 pb-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{graded}/{totalTasks} graded</span>
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
                className="px-5 py-2 bg-primary text-primary-foreground border-none rounded-md text-[13px] font-medium cursor-pointer"
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
