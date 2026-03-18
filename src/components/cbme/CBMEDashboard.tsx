import { useState } from "react";
import type { Competency, Assessment } from "@/hooks/useCompetencies";
import { formatLastFirst } from "@/lib/dateFormat";

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

const GRADE_COLORS: Record<number, string> = { 1: "#5F7285", 2: "#6B9080", 3: "#8A8A8A" };

const GradeDot = ({ color, size = 16 }: { color: string; size?: number }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }} />
);

const GradeIcon = ({ grade }: { grade: number | null }) => {
  if (grade && GRADE_COLORS[grade]) return <GradeDot color={GRADE_COLORS[grade]} />;
  return <span className="text-[11px] text-muted-foreground">—</span>;
};

interface TeamMember {
  id: string;
  display_name: string;
  avatar_url: string | null;
}


const CBMEDashboard = ({
  competencies,
  assessments,
  teamMembers,
}: {
  competencies: Competency[];
  assessments: Assessment[];
  teamMembers: TeamMember[];
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Get unique residents from assessments
  const residentIds = [...new Set(assessments.map((a) => a.resident_id))];
  const residents = residentIds
    .map((id) => teamMembers.find((m) => m.id === id))
    .filter(Boolean) as TeamMember[];

  // Only show residents who have been assessed
  const sortedResidents = residents.sort((a, b) =>
    (a.display_name || "").localeCompare(b.display_name || "")
  );

  return (
    <div className="space-y-2">
      {sortedResidents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No assessments yet.</p>
        </div>
      ) : (
        sortedResidents.map((resident) => {
          const resAssessments = assessments.filter((a) => a.resident_id === resident.id);
          const neutralCount = resAssessments.filter((a) => a.overall_grade === 1).length;
          const moderateCount = resAssessments.filter((a) => a.overall_grade === 2).length;
          const minimalCount = resAssessments.filter((a) => a.overall_grade === 3).length;
          const isExpanded = expandedId === resident.id;

          // Per-competency breakdown
          const compBreakdown = competencies.map((comp) => {
            const compAssessments = resAssessments.filter((a) => a.competency_id === comp.id);
            const latestGrade = compAssessments.length > 0 ? compAssessments[0].overall_grade : null;
            return {
              id: comp.id,
              title: comp.title,
              count: compAssessments.length,
              latestGrade,
            };
          }).filter((c) => c.count > 0);

          return (
            <div
              key={resident.id}
              className="bg-muted border border-border rounded-[10px] overflow-hidden cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : resident.id)}
            >
              <div className="flex items-center min-h-[48px] px-2.5 gap-2">
                {resident.avatar_url ? (
                  <img src={resident.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ fontSize: 11, fontWeight: 500, background: getColor(resident.display_name) }}
                  >
                    {getInitials(resident.display_name)}
                  </div>
                )}
                <span className="flex-1 min-w-0 text-sm font-medium truncate">{formatLastFirst(resident.display_name)}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <GradeDot color="#5F7285" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#415162", minWidth: 12, textAlign: "center" }}>{neutralCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GradeDot color="#6B9080" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#415162", minWidth: 12, textAlign: "center" }}>{moderateCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GradeDot color="#8A8A8A" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#415162", minWidth: 12, textAlign: "center" }}>{minimalCount}</span>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-2.5 pb-2.5" onClick={(e) => e.stopPropagation()}>
                  {compBreakdown.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground py-2 px-2">No assessments yet</div>
                  ) : (
                    compBreakdown.map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-center px-2 py-1.5 bg-background/50 rounded-md mb-1"
                      >
                        <span className="flex-1 text-xs min-w-0 truncate">{comp.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-medium text-primary">{comp.count}</span>
                          <GradeIcon grade={comp.latestGrade} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default CBMEDashboard;
