import { useState } from "react";
import type { Competency, Assessment } from "@/hooks/useCompetencies";

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

const FaceNeutral = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#415162" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="9" cy="10" r="1" fill="#415162" stroke="none"/>
    <circle cx="15" cy="10" r="1" fill="#415162" stroke="none"/>
    <line x1="8" y1="15" x2="16" y2="15"/>
  </svg>
);
const FaceModerate = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#415162" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="9" cy="10" r="1" fill="#415162" stroke="none"/>
    <circle cx="15" cy="10" r="1" fill="#415162" stroke="none"/>
    <path d="M8 14.5Q12 17 16 14.5" fill="none"/>
  </svg>
);
const FaceHappy = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#415162" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="9" cy="10" r="1" fill="#415162" stroke="none"/>
    <circle cx="15" cy="10" r="1" fill="#415162" stroke="none"/>
    <path d="M7 14Q12 19 17 14" fill="none"/>
  </svg>
);

const GradeIcon = ({ grade }: { grade: number | null }) => {
  if (grade === 3) return <FaceHappy />;
  if (grade === 2) return <FaceModerate />;
  if (grade === 1) return <FaceNeutral />;
  return <span className="text-[11px] text-muted-foreground">—</span>;
};

interface TeamMember {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

const formatLastFirst = (name: string | null): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const firstInitial = parts[0][0];
  return `${last}, ${firstInitial}`;
};

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
                  <div className="flex items-center gap-0.5">
                    <FaceNeutral size={22} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#415162", minWidth: 12, textAlign: "center" }}>{neutralCount}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <FaceModerate size={22} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#415162", minWidth: 12, textAlign: "center" }}>{moderateCount}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <FaceHappy size={22} />
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
