import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Trash2, ChevronDown, ChevronRight, AlertTriangle, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/hooks/useTasks";
import EditTaskDialog from "./EditTaskDialog";
import CreateTaskDialog from "./CreateTaskDialog";
import MilestoneList from "./MilestoneList";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MAX_DEPTH = 3;

interface TaskCardProps {
  task: Task;
  isOverdue: boolean;
  depth?: number;
  onToggleComplete: (data: { id: string; completed: boolean }) => void;
  onUpdate: (data: { id: string; title?: string; description?: string; due_date?: string | null; assigned_to?: string | null }) => void;
  onDelete: (id: string) => void;
  onCreateSubtask: (data: { title: string; description?: string; due_date?: string; parent_id?: string }) => void;
  onCreateMilestone: (data: { task_id: string; title: string }) => void;
  onToggleMilestone: (data: { id: string; completed: boolean }) => void;
  onDeleteMilestone: (id: string) => void;
}

const TaskCard = ({
  task,
  isOverdue,
  depth = 0,
  onToggleComplete,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onCreateMilestone,
  onToggleMilestone,
  onDeleteMilestone,
}: TaskCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();
  const { data: members } = useTeamMembers();
  const canEdit = user?.id === task.created_by || user?.id === task.assigned_to;
  const hasChildren = (task.subtasks && task.subtasks.length > 0) || (task.milestones && task.milestones.length > 0);
  const isExpandable = hasChildren || (canEdit && depth < MAX_DEPTH);
  const assigneeName = task.assigned_to
    ? members?.find((m) => m.id === task.assigned_to)?.display_name || "Unnamed"
    : null;
  const canAddSubtasks = depth < MAX_DEPTH && (!task.subtasks || task.subtasks.length < 10);

  const formattedDue = task.due_date
    ? new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const now = new Date();
  const isSubtaskOverdue = (t: Task) =>
    !t.completed && !!t.due_date && new Date(t.due_date) < now;

  // For nested subtasks, use a simpler inline layout
  if (depth > 0) {
    return (
      <div className={cn("border rounded-md p-3 space-y-2", isOverdue && "border-warning/50 bg-warning/5")}>
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) =>
              onToggleComplete({ id: task.id, completed: !!checked })
            }
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isExpandable && (
                <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
                  {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              )}
              <span className={cn("text-sm", task.completed && "line-through text-muted-foreground")}>
                {task.title}
              </span>
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1">
              {formattedDue && (
                <span className={cn("text-xs", isOverdue ? "text-warning font-medium flex items-center gap-1" : "text-muted-foreground")}>
                  {isOverdue && <AlertTriangle className="h-3 w-3" />}
                  {formattedDue}
                </span>
              )}
              {task.subtasks && task.subtasks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtasks
                </span>
              )}
              {assigneeName && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {assigneeName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <EditTaskDialog task={task} onSubmit={onUpdate} />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="ml-6 space-y-2">
            {task.milestones && (
              <MilestoneList
                milestones={task.milestones}
                taskId={task.id}
                onCreateMilestone={onCreateMilestone}
                onToggleMilestone={onToggleMilestone}
                onDeleteMilestone={onDeleteMilestone}
                canEdit={canEdit}
              />
            )}
            {task.subtasks?.map((sub) => (
              <TaskCard
                key={sub.id}
                task={sub}
                isOverdue={isSubtaskOverdue(sub)}
                depth={depth + 1}
                onToggleComplete={onToggleComplete}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onCreateSubtask={onCreateSubtask}
                onCreateMilestone={onCreateMilestone}
                onToggleMilestone={onToggleMilestone}
                onDeleteMilestone={onDeleteMilestone}
              />
            ))}
            {canEdit && canAddSubtasks && (
              <CreateTaskDialog onSubmit={onCreateSubtask} parentId={task.id} />
            )}
          </div>
        )}
      </div>
    );
  }

  // Root-level card
  return (
    <Card className={cn("transition-all", isOverdue && "border-warning/50 bg-warning/5")}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) =>
              onToggleComplete({ id: task.id, completed: !!checked })
            }
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isExpandable && (
                <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
              <h3
                className={cn(
                  "font-medium text-sm leading-tight",
                  task.completed && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </h3>
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {formattedDue && (
                <span
                  className={cn(
                    "text-xs",
                    isOverdue ? "text-warning font-medium flex items-center gap-1" : "text-muted-foreground"
                  )}
                >
                  {isOverdue && <AlertTriangle className="h-3 w-3" />}
                  {formattedDue}
                </span>
              )}
              {task.subtasks && task.subtasks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtasks
                </span>
              )}
              {assigneeName && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {assigneeName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <EditTaskDialog task={task} onSubmit={onUpdate} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{task.title}" and all its subtasks and milestones.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(task.id)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 pt-0 ml-8 space-y-3">
          {task.milestones && (
            <MilestoneList
              milestones={task.milestones}
              taskId={task.id}
              onCreateMilestone={onCreateMilestone}
              onToggleMilestone={onToggleMilestone}
              onDeleteMilestone={onDeleteMilestone}
              canEdit={canEdit}
            />
          )}

          {task.subtasks?.map((sub) => (
            <TaskCard
              key={sub.id}
              task={sub}
              isOverdue={isSubtaskOverdue(sub)}
              depth={depth + 1}
              onToggleComplete={onToggleComplete}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onCreateSubtask={onCreateSubtask}
              onCreateMilestone={onCreateMilestone}
              onToggleMilestone={onToggleMilestone}
              onDeleteMilestone={onDeleteMilestone}
            />
          ))}

          {canEdit && canAddSubtasks && (
            <CreateTaskDialog onSubmit={onCreateSubtask} parentId={task.id} />
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default TaskCard;
