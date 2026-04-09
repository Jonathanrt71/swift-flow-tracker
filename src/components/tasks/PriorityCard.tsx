import { getInitials } from "@/lib/dateFormat";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUp, ArrowDown, Pencil, X, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Priority } from "@/hooks/usePriorities";
import type { TeamMember } from "@/hooks/useTeamMembers";
import type { Task } from "@/hooks/useTasks";
import EditPriorityDialog from "./EditPriorityDialog";
import ComboSearch from "@/components/shared/ComboSearch";

const getAvatarColor = (name: string | null): string => {
  const cols = ["#378ADD", "#1D9E75", "#D85A30", "#534AB7", "#993556"];
  let h = 0;
  if (name) for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return cols[Math.abs(h) % cols.length];
};

interface PriorityCardProps {
  priority: Priority;
  rank: number;
  secondaryRank?: number | null;
  secondaryLabel?: string;
  teamMembers: TeamMember[];
  linkedTasks: Task[];
  unlinkableTasks: Task[];
  showArrows?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onUpdate?: (data: { id: string; title?: string; notes?: string; assigned_to?: string | null }) => void;
  onDelete?: (id: string) => void;
  onToggleTaskComplete: (data: { id: string; completed: boolean }) => void;
  onUnlinkTask: (taskId: string) => void;
  onLinkTask: (taskId: string) => void;
  onCreateTask: (title: string) => void;
}

const PriorityCard = ({
  priority, rank, secondaryRank, secondaryLabel, teamMembers,
  linkedTasks, unlinkableTasks,
  showArrows = true, isFirst, isLast, onMoveUp, onMoveDown,
  onUpdate, onDelete, onToggleTaskComplete, onUnlinkTask, onLinkTask, onCreateTask,
}: PriorityCardProps) => {
  const [editOpen, setEditOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const navigate = useNavigate();
  const member = teamMembers.find((m) => m.id === priority.assigned_to);
  const assignedName = priority.assigned_name || (member ? [member.first_name, member.last_name].filter(Boolean).join(" ") : null);

  const doneCount = linkedTasks.filter(t => t.completed).length;
  const totalCount = linkedTasks.length;
  const hasRealNotes = !!(priority.notes && priority.notes.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim());

  return (
    <>
      <Card
        className={cn("border-border select-none overflow-hidden")}
        style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
      >
        {/* Header row — tap to expand */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {showArrows && (
            <div className="flex flex-col gap-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onMoveUp?.()}
                disabled={isFirst}
                style={{ padding: 2, background: "transparent", border: "none", cursor: isFirst ? "default" : "pointer", color: isFirst ? "#D5DAE0" : "#8A9AAB", display: "flex" }}
              >
                <ArrowUp style={{ width: 14, height: 14 }} />
              </button>
              <button
                onClick={() => onMoveDown?.()}
                disabled={isLast}
                style={{ padding: 2, background: "transparent", border: "none", cursor: isLast ? "default" : "pointer", color: isLast ? "#D5DAE0" : "#8A9AAB", display: "flex" }}
              >
                <ArrowDown style={{ width: 14, height: 14 }} />
              </button>
            </div>
          )}

          <div
            className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0"
            style={{ background: "#415162" }}
          >
            {rank}
          </div>

          <span className="flex-1 text-sm font-medium truncate" style={{ color: "#2D3748" }}>{priority.title}</span>

          {secondaryRank != null && (
            <span
              title={secondaryLabel || ""}
              style={{ fontSize: 10, fontWeight: 600, color: "#8A9AAB", background: "#E7EBEF", borderRadius: 10, padding: "2px 7px", whiteSpace: "nowrap", flexShrink: 0 }}
            >
              P{secondaryRank}
            </span>
          )}

          {(totalCount > 0 || hasRealNotes) && (
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#9F2929", flexShrink: 0 }} />
          )}

          <div className="shrink-0">
            {member?.avatar_url ? (
              <img src={member.avatar_url} alt={assignedName || ""} className="w-7 h-7 rounded-full object-cover shrink-0" title={assignedName || ""} />
            ) : assignedName ? (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white" style={{ background: getAvatarColor(assignedName) }} title={assignedName}>
                {getInitials(assignedName)}
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border" style={{ color: "#A0AEC0", borderColor: "#CBD5E0" }}>?</div>
            )}
          </div>

          {/* Pencil — opens edit dialog */}
          {onUpdate && (
          <button
            onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
            style={{ padding: 4, background: "transparent", border: "none", cursor: "pointer", color: "#8A9AAB", display: "flex", flexShrink: 0 }}
          >
            <Pencil style={{ width: 14, height: 14 }} />
          </button>
          )}
        </div>

        {/* Expanded: linked tasks */}
        {expanded && (
          <div style={{ padding: "0 12px 10px 58px", display: "flex", flexDirection: "column", gap: 4 }}>
            {linkedTasks.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "#F5F3EE", borderRadius: 6 }}>
                <div
                  onClick={(e) => { e.stopPropagation(); onToggleTaskComplete({ id: t.id, completed: !t.completed }); }}
                  style={{
                    width: 16, height: 16, borderRadius: 3, flexShrink: 0, cursor: "pointer",
                    border: t.completed ? "none" : "1.5px solid #C9CED4",
                    background: t.completed ? "#4A846C" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {t.completed && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  )}
                </div>
                <span
                  onClick={(e) => { e.stopPropagation(); navigate(`/tasks?tab=myTasks&highlight=${t.id}`); }}
                  style={{
                    fontSize: 12, color: t.completed ? "#8A9AAB" : "#415162", flex: 1,
                    textDecoration: t.completed ? "line-through" : "none",
                    cursor: "pointer",
                  }}
                >
                  {t.title}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onUnlinkTask(t.id); }}
                  style={{ padding: 2, background: "transparent", border: "none", cursor: "pointer", display: "flex", color: "#C9CED4", flexShrink: 0 }}
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}

            {/* Link or create task */}
            {showLinkInput ? (
              <div onClick={(e) => e.stopPropagation()}>
                <ComboSearch
                  items={unlinkableTasks.map(t => ({ id: t.id, label: t.title }))}
                  placeholder="Search or create task..."
                  createLabel="task"
                  onSelect={(id) => { onLinkTask(id); setShowLinkInput(false); }}
                  onCreate={(title) => { onCreateTask(title); setShowLinkInput(false); }}
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setShowLinkInput(true); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
                  border: "1px dashed #C9CED4", borderRadius: 6, background: "#F5F3EE",
                  cursor: "pointer", marginTop: 2, color: "#8A9AAB", fontSize: 12,
                }}
              >
                <Plus style={{ width: 14, height: 14 }} />
                Link or create task
              </button>
            )}
          </div>
        )}
      </Card>
      {onUpdate && onDelete && (
        <EditPriorityDialog priority={priority} open={editOpen} onOpenChange={setEditOpen} onUpdate={onUpdate} onDelete={onDelete} />
      )}
    </>
  );
};

export default PriorityCard;
