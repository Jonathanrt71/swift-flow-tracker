import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Pencil, BookMarked } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCardDate } from "@/lib/dateFormat";
import type { Task } from "@/hooks/useTasks";
import type { TeamMember } from "@/hooks/useTeamMembers";

interface TaskCardProps {
  task: Task;
  isOverdue: boolean;
  teamMembers: TeamMember[];
  priorityName?: string | null;
  sectionName?: string | null;
  onToggleComplete: (data: { id: string; completed: boolean }) => void;
  onToggleStar: (data: { id: string; starred: boolean }) => void;
  onCardClick: (task: Task) => void;
}

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

const TaskCard = ({
  task,
  isOverdue,
  teamMembers,
  priorityName,
  sectionName,
  onToggleComplete,
  onToggleStar,
  onCardClick,
}: TaskCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const member = teamMembers.find((m) => m.id === (task.assigned_to || task.created_by));
  const assignedName = member ? [member.first_name, member.last_name].filter(Boolean).join(" ") || member.display_name : null;
  const dd = formatCardDate(task.due_date);
  const hasDetails = !!priorityName || !!sectionName || !!task.description;

  return (
    <Card
      className={cn("border-border select-none overflow-hidden")}
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("button, .checkbox-hit")) return;
          if (hasDetails) setExpanded(!expanded);
          else onCardClick(task);
        }}
      >
        {/* Checkbox */}
        <div
          className="checkbox-hit"
          onClick={(e) => { e.stopPropagation(); onToggleComplete({ id: task.id, completed: !task.completed }); }}
          style={{
            width: 20, height: 20, borderRadius: 4, flexShrink: 0, cursor: "pointer",
            border: task.completed ? "none" : "1.5px solid #C9CED4",
            background: task.completed ? "#4A846C" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {task.completed && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          )}
        </div>

        {/* Title */}
        <span
          className="flex-1 min-w-0 text-sm font-medium truncate"
          style={{ color: task.completed ? "#8A9AAB" : "#2D3748", textDecoration: task.completed ? "line-through" : "none" }}
        >
          {task.title}
        </span>

        {/* Due date */}
        {dd && (
          <span style={{ fontSize: 11, color: dd.urgent ? "#9F2929" : "#8A9AAB", whiteSpace: "nowrap", flexShrink: 0 }}>
            {dd.text}
          </span>
        )}

        {/* Star */}
        {task.starred && (
          <Star style={{ width: 14, height: 14, fill: "#9F2929", color: "#9F2929", flexShrink: 0 }} />
        )}

        {/* Assignee avatar */}
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

        {/* Edit pencil */}
        <button
          onClick={(e) => { e.stopPropagation(); onCardClick(task); }}
          style={{ padding: 4, background: "transparent", border: "none", cursor: "pointer", color: "#8A9AAB", display: "flex", flexShrink: 0 }}
        >
          <Pencil style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: "0 12px 10px 50px", display: "flex", flexDirection: "column", gap: 6 }}>
          {priorityName && (
            <div
              onClick={(e) => { e.stopPropagation(); navigate(`/tasks?tab=priorities&highlight=${(task as any).priority_id}`); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", background: "#F5F3EE", borderRadius: 6, cursor: "pointer" }}
            >
              <svg style={{ width: 14, height: 14, color: "#415162", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>
              <span style={{ fontSize: 12, color: "#415162", fontWeight: 500, textDecoration: "underline", textDecorationColor: "#C9CED4" }}>{priorityName}</span>
            </div>
          )}
          {sectionName && (
            <div
              onClick={(e) => { e.stopPropagation(); navigate(`/handbook?section=${(task as any).operations_section_id}`); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", background: "#F5F3EE", borderRadius: 6, cursor: "pointer" }}
            >
              <BookMarked style={{ width: 14, height: 14, color: "#415162", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#415162", fontWeight: 500, textDecoration: "underline", textDecorationColor: "#C9CED4" }}>{sectionName}</span>
            </div>
          )}
          {task.description && (
            <div style={{ fontSize: 12, color: "#5F7285", lineHeight: 1.5, padding: "2px 8px" }}
              dangerouslySetInnerHTML={{ __html: task.description }}
            />
          )}
        </div>
      )}
    </Card>
  );
};

export default TaskCard;
