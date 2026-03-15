import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Star, MoreVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/hooks/useTasks";
import CreateTaskDialog from "./CreateTaskDialog";
import TaskDetailSheet from "./TaskDetailSheet";
import NotesEditorDialog from "./NotesEditorDialog";

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

/** Extract first block of content (p or li) as HTML, preserving inline formatting */
const getNotesPreviewHtml = (html: string) => {
  const liMatch = html.match(/<li>(.*?)<\/li>/);
  if (liMatch) return "• " + (liMatch[1] || "");
  const pMatch = html.match(/<p>(.*?)<\/p>/);
  if (pMatch) return pMatch[1] || "";
  return html.replace(/<\/?(?:p|ul|ol|li|br|div)[^>]*>/gi, " ").trim();
};

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
  const cardRef = useRef<HTMLDivElement>(null);
  const hasChildren = task.subtasks && task.subtasks.length > 0;
  const canAddSubtasks =
    depth < MAX_DEPTH && (!task.subtasks || task.subtasks.length < 10);
  const hasNotes = !!task.description?.trim();

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  // ── Subtask row (depth > 0) ──
  if (depth > 0) {
    return (
      <div style={{ marginLeft: `${depth * 24}px` }} ref={cardRef}>
        <div className="flex items-center min-h-[44px]">
          <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
            <Checkbox
              checked={task.completed}
              onCheckedChange={(checked) =>
                onToggleComplete({ id: task.id, completed: !!checked })
              }
            />
          </div>
          <div
            className={cn(
              "flex-1 min-w-0 min-h-[44px] flex items-center px-2",
              task.completed && "line-through text-muted-foreground"
            )}
          >
            <span className="text-sm truncate">{task.title}</span>
          </div>
          <div className="flex items-center shrink-0">
            <button
              className="flex items-center justify-center min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setExpanded(!expanded)}
              aria-label="Task actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
        {expanded && (
          <div className="flex items-center justify-end min-h-[36px] px-2">
            <NotesEditorDialog task={task} onUpdate={onUpdate} />
            <TaskDetailSheet task={task} onUpdate={onUpdate} onDelete={onDelete} />
          </div>
        )}
      </div>
    );
  }

  // ── Root-level card ──
  return (
    <Card
      ref={cardRef}
      className={cn(
        "transition-all overflow-hidden",
        task.starred && "border-starred/40 bg-starred/25",
        !task.starred && "bg-muted"
      )}
    >
      {/* Row: checkbox · name · kebab · star */}
      <div className="flex items-center min-h-[48px] px-2">
        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) =>
              onToggleComplete({ id: task.id, completed: !!checked })
            }
          />
        </div>

        <button
          className={cn(
            "flex-1 min-w-0 text-left min-h-[44px] flex items-center px-2",
            task.completed && "line-through text-muted-foreground"
          )}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="font-medium text-sm truncate">{task.title}</span>
        </button>

        <div className="flex items-center shrink-0">
          <button
            className="flex items-center justify-center min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded(!expanded)}
            aria-label="Task actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
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

      {/* Expanded content */}
      {expanded && (
        <div className="pb-2">
          {/* Notes preview + action icons — single row, aligned with checkbox */}
          <div className="flex items-center min-h-[40px] px-2">
            {/* Spacer matching checkbox column width */}
            <div className="min-w-[44px] shrink-0" />
            <div className="flex-1 min-w-0 min-h-[40px] flex items-center px-2">
              {hasNotes && (
                <p
                  className="text-xs text-muted-foreground truncate leading-none [&_strong]:font-bold [&_em]:italic [&_a]:underline [&_a]:text-primary"
                  dangerouslySetInnerHTML={{
                    __html: getNotesPreviewHtml(task.description!) + "…",
                  }}
                />
              )}
            </div>
            <div className="flex items-center shrink-0">
              {canAddSubtasks && onCreateSubtask && (
                <CreateTaskDialog
                  onSubmit={onCreateSubtask}
                  parentId={task.id}
                  iconOnly
                />
              )}
              <NotesEditorDialog task={task} onUpdate={onUpdate} />
              <TaskDetailSheet task={task} onUpdate={onUpdate} onDelete={onDelete} />
            </div>
          </div>

          {/* Subtasks */}
          {hasChildren &&
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
            ))}
        </div>
      )}
    </Card>
  );
};

export default TaskCard;
