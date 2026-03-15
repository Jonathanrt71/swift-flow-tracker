import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/hooks/useTasks";
import CreateTaskDialog from "./CreateTaskDialog";
import TaskDetailSheet from "./TaskDetailSheet";
import NotesEditorDialog from "./NotesEditorDialog";
import { useAuth } from "@/contexts/AuthContext";

const MAX_DEPTH = 1;

interface TaskCardProps {
  task: Task;
  isOverdue: boolean;
  depth?: number;
  onToggleComplete: (data: { id: string; completed: boolean }) => void;
  onUpdate: (data: {
    id: string;
    title?: string;
    description?: string;
    due_date?: string | null;
    assigned_to?: string | null;
  }) => void;
  onDelete: (id: string) => void;
  onCreateSubtask: (data: {
    title: string;
    description?: string;
    due_date?: string;
    parent_id?: string;
  }) => void;
  onToggleStar: (data: { id: string; starred: boolean }) => void;
}

const TaskCard = ({
  task,
  isOverdue,
  depth = 0,
  onToggleComplete,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onToggleStar,
}: TaskCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();
  const hasChildren = task.subtasks && task.subtasks.length > 0;
  const canAddSubtasks =
    depth < MAX_DEPTH && (!task.subtasks || task.subtasks.length < 10);

  // Subtask row (depth > 0): checkbox, name, pencil icon
  if (depth > 0) {
    return (
      <div style={{ marginLeft: `${depth * 24}px` }}>
        <div className="flex items-center min-h-[44px]">
          {/* Checkbox */}
          <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
            <Checkbox
              checked={task.completed}
              onCheckedChange={(checked) =>
                onToggleComplete({ id: task.id, completed: !!checked })
              }
            />
          </div>

          {/* Subtask name */}
          <div
            className={cn(
              "flex-1 min-w-0 min-h-[44px] flex items-center px-2",
              task.completed && "line-through text-muted-foreground"
            )}
          >
            <span className="text-sm truncate">{task.title}</span>
          </div>

          {/* Pencil icon — right-justified */}
          <div className="flex items-center shrink-0">
            <NotesEditorDialog task={task} onUpdate={onUpdate} />
          </div>
        </div>
      </div>
    );
  }

  // Root-level card
  return (
    <Card
      className={cn(
        "transition-all overflow-hidden",
        task.starred && "border-starred/40 bg-starred/25",
        !task.starred && "bg-muted"
      )}
    >
      {/* Collapsed row — checkbox, name, star */}
      <div className="flex items-center min-h-[48px] px-2">
        {/* Checkbox */}
        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) =>
              onToggleComplete({ id: task.id, completed: !!checked })
            }
          />
        </div>

        {/* Tappable name area — expand/collapse */}
        <button
          className={cn(
            "flex-1 min-w-0 text-left min-h-[44px] flex items-center px-2",
            task.completed && "line-through text-muted-foreground"
          )}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="font-medium text-sm truncate">{task.title}</span>
        </button>

        {/* Star icon only in collapsed row */}
        <div className="flex items-center shrink-0">
          <button
            className="flex items-center justify-center min-w-[44px] min-h-[44px] hover:text-foreground transition-colors"
            onClick={() =>
              onToggleStar({ id: task.id, starred: !task.starred })
            }
          >
            <Star
              className={cn(
                "h-4 w-4",
                task.starred
                  ? "fill-starred text-starred"
                  : "text-muted-foreground"
              )}
            />
          </button>
        </div>
      </div>

      {/* Expanded state */}
      {expanded && (
        <div className="pb-2">
          {/* Action row: +, pencil, info — right-justified */}
          <div className="flex items-center justify-end px-2">
            {canAddSubtasks && (
              <CreateTaskDialog
                onSubmit={onCreateSubtask}
                parentId={task.id}
                iconOnly
              />
            )}
            <NotesEditorDialog task={task} onUpdate={onUpdate} />
            <TaskDetailSheet task={task} onUpdate={onUpdate} onDelete={onDelete} />
          </div>

          {/* Subtask list */}
          {hasChildren ? (
            task.subtasks!.map((sub) => (
              <TaskCard
                key={sub.id}
                task={sub}
                isOverdue={false}
                depth={1}
                onToggleComplete={onToggleComplete}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onCreateSubtask={onCreateSubtask}
                onToggleStar={onToggleStar}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground px-6 py-2">
              No subtasks yet
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

export default TaskCard;
