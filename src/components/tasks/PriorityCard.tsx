import { useState } from "react";
import { GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Priority } from "@/hooks/usePriorities";
import type { TeamMember } from "@/hooks/useTeamMembers";
import EditPriorityDialog from "./EditPriorityDialog";

const getInitials = (name: string | null): string => {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
};
const getAvatarColor = (name: string | null): string => {
  const cols = ["#378ADD", "#1D9E75", "#D85A30", "#534AB7", "#993556"];
  let h = 0;
  if (name) for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return cols[Math.abs(h) % cols.length];
};

interface PriorityCardProps {
  priority: Priority;
  rank: number;
  teamMembers: TeamMember[];
  linkedTaskCount?: number;
  linkedTasksDone?: number;
  suppressClick?: boolean;
  onUpdate: (data: { id: string; title?: string; notes?: string; assigned_to?: string | null }) => void;
  onDelete: (id: string) => void;
}

const PriorityCard = ({ priority, rank, teamMembers, linkedTaskCount = 0, linkedTasksDone = 0, suppressClick, onUpdate, onDelete }: PriorityCardProps) => {
  const [editOpen, setEditOpen] = useState(false);
  const member = teamMembers.find((m) => m.id === priority.assigned_to);
  const assignedName = priority.assigned_name || (member ? [member.first_name, member.last_name].filter(Boolean).join(" ") : null);

  return (
    <>
      <Card
        className={cn("cursor-pointer hover:shadow-md transition-shadow border-border")}
        onClick={() => { if (!suppressClick) setEditOpen(true); }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="h-4 w-4" />
          </div>

          <div
            className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0"
            style={{ background: "#415162" }}
          >
            {rank}
          </div>

          <span className="flex-1 text-sm font-medium truncate" style={{ color: "#2D3748" }}>{priority.title}</span>

          <div className="shrink-0">
            {assignedName ? (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                style={{ background: getAvatarColor(assignedName) }}
                title={assignedName}
              >
                {getInitials(assignedName)}
              </div>
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border"
                style={{ color: "#A0AEC0", borderColor: "#CBD5E0" }}
              >
                ?
              </div>
            )}
          </div>
        </div>
        {linkedTaskCount > 0 && (
          <div style={{ padding: "0 12px 8px 52px", display: "flex", alignItems: "center", gap: 6 }}>
            <svg style={{ width: 14, height: 14, color: "#8A9AAB" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            <span style={{ fontSize: 11, color: "#5F7285" }}>{linkedTasksDone} of {linkedTaskCount} tasks done</span>
          </div>
        )}
      </Card>
      <EditPriorityDialog priority={priority} open={editOpen} onOpenChange={setEditOpen} onUpdate={onUpdate} onDelete={onDelete} />
    </>
  );
};

export default PriorityCard;
