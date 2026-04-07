import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCardDate } from "@/lib/dateFormat";
import type { Task } from "@/hooks/useTasks";
import type { TeamMember } from "@/hooks/useTeamMembers";

interface TaskCardProps {
  task: Task;
  isOverdue: boolean;
  teamMembers: TeamMember[];
  priorityName?: string | null;
  onToggleComplete: (data: { id: string; completed: boolean }) => void;
  onToggleStar: (data: { id: string; starred: boolean }) => void;
  onCardClick: (task: Task) => void;
}

/* ── Avatar helpers ── */
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

const AssigneeAvatar = ({
  assignedTo,
  teamMembers,
  size = 28,
}: {
  assignedTo: string | null;
  teamMembers: TeamMember[];
  size?: number;
}) => {
  if (!assignedTo) return null;
  const member = teamMembers.find((m) => m.id === assignedTo);
  const name = member?.display_name || "?";
  const avatarUrl = member?.avatar_url;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        fontWeight: 500,
        background: getAvatarColor(name),
      }}
    >
      {getInitials(name)}
    </div>
  );
};

/* ── Main TaskCard ── */
const TaskCard = ({
  task,
  isOverdue,
  teamMembers,
  priorityName,
  onToggleComplete,
  onToggleStar,
  onCardClick,
}: TaskCardProps) => {
  return (
    <Card
      className="transition-all overflow-hidden border cursor-pointer bg-muted border-border"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button, input, .checkbox-area")) return;
        onCardClick(task);
      }}
    >
      <div className="flex min-h-[48px] px-1.5 items-center">
        <div className="checkbox-area flex items-center justify-center min-w-[32px] min-h-[44px]">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) =>
              onToggleComplete({ id: task.id, completed: !!checked })
            }
          />
        </div>

        <div
          className={cn(
            "flex-1 min-w-0 text-left min-h-[44px] flex flex-col justify-center px-1",
            task.completed && "line-through text-muted-foreground"
          )}
        >
          <span className="font-medium text-sm truncate">{task.title}</span>
          {priorityName && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
              <svg style={{ width: 12, height: 12, color: "#8A9AAB", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>
              <span style={{ fontSize: 11, color: "#415162", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{priorityName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center shrink-0">
          {(() => {
            const dd = formatCardDate(task.due_date);
            return dd ? (
              <span className={cn("text-[11px] whitespace-nowrap mr-1.5", dd.urgent ? "text-destructive" : "text-muted-foreground")}>
                {dd.text}
              </span>
            ) : null;
          })()}
          <div className="mr-1.5 flex items-center">
            {task.starred && (
              <Star className="h-3.5 w-3.5 fill-[#9F2929] text-[#9F2929] shrink-0 mr-2" />
            )}
            <AssigneeAvatar
              assignedTo={task.assigned_to || task.created_by}
              teamMembers={teamMembers}
              size={28}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TaskCard;
