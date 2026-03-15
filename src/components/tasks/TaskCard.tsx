import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Trash2, ChevronDown, ChevronRight, Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/hooks/useTasks";
import EditTaskDialog from "./EditTaskDialog";
import CreateTaskDialog from "./CreateTaskDialog";
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
  AlertDialogTrigger } from
"@/components/ui/alert-dialog";

const MAX_DEPTH = 2;

interface TaskCardProps {
  task: Task;
  isOverdue: boolean;
  depth?: number;
  parentStarred?: boolean;
  onToggleComplete: (data: {id: string;completed: boolean;}) => void;
  onUpdate: (data: {id: string;title?: string;description?: string;due_date?: string | null;assigned_to?: string | null;}) => void;
  onDelete: (id: string) => void;
  onCreateSubtask: (data: {title: string;description?: string;due_date?: string;parent_id?: string;}) => void;
  onToggleStar: (data: {id: string;starred: boolean;}) => void;
  onExpandChange?: (id: string, expanded: boolean) => void;
  hideAddButton?: boolean;
}

const TaskCard = ({
  task,
  isOverdue,
  depth = 0,
  parentStarred = false,
  onToggleComplete,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onToggleStar,
  onExpandChange,
  hideAddButton = false
}: TaskCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);

  const handleToggleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onExpandChange?.(task.id, newExpanded);
    if (!newExpanded) setExpandedChildId(null);
  };

  const handleChildExpandChange = (childId: string, childExpanded: boolean) => {
    setExpandedChildId(childExpanded ? childId : null);
  };

  const hasExpandedChild = expandedChildId !== null;
  const { user } = useAuth();
  const { data: members } = useTeamMembers();
  const canEdit = user?.id === task.created_by || user?.id === task.assigned_to;
  const hasChildren = task.subtasks && task.subtasks.length > 0;
  const isExpandable = hasChildren || canEdit && depth < MAX_DEPTH;
  const canAddSubtasks = depth < MAX_DEPTH && (!task.subtasks || task.subtasks.length < 10);

  // For nested subtasks, use a simpler inline layout
  if (depth > 0) {
    return (
      <div className={cn("space-y-1 rounded", isOverdue && "bg-warning/5")} style={{ marginLeft: `${depth * 8}px` }}>
        <div className="flex items-start gap-3 py-1">
          <div className="flex-1 min-w-0 flex items-start gap-2" style={{ paddingLeft: '2px' }}>
            <Checkbox
              checked={task.completed}
              onCheckedChange={(checked) =>
              onToggleComplete({ id: task.id, completed: !!checked })
              }
              className="mt-0.5" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isExpandable ?
                <button onClick={handleToggleExpand} className="text-muted-foreground hover:text-foreground">
                    {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button> :

                <span className="w-3.5 shrink-0 text-muted-foreground text-center text-xs">–</span>
                }
                <span className={cn("text-sm", task.completed && "line-through text-muted-foreground")}>
                  {task.title}
                </span>
              </div>
            </div>
          </div>
          {(expanded || !isExpandable) &&
          <div className="flex items-center gap-1 shrink-0">
              {canEdit && canAddSubtasks && !hasExpandedChild && !hideAddButton &&
                <CreateTaskDialog onSubmit={onCreateSubtask} parentId={task.id} iconOnly buttonBg={parentStarred ? `rgba(220,38,38,${(depth + 1) * 0.02})` : `rgba(0,0,0,${(depth + 1) * 0.015})`} />
              }
              <EditTaskDialog task={task} onSubmit={onUpdate} />
              <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(task.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          }
        </div>

        {expanded &&
        <div className="space-y-1">
            {task.subtasks?.map((sub) =>
          <TaskCard
            key={sub.id}
            task={sub}
            isOverdue={false}
            depth={depth + 1}
            parentStarred={parentStarred}
            onToggleComplete={onToggleComplete}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onCreateSubtask={onCreateSubtask}
            onToggleStar={onToggleStar}
            onExpandChange={handleChildExpandChange}
            hideAddButton={hideAddButton} />
          )}
          </div>
        }
      </div>);

  }

  // Root-level card
  return (
    <Card className={cn("transition-all", isOverdue && "border-warning/50 bg-warning/5", task.starred && !isOverdue && "border-starred/20 bg-starred/[0.02]", !isOverdue && !task.starred && "bg-muted/40")}>
      <CardHeader className="px-3 py-1.5">
        <div className="flex items-center gap-3 w-full">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) =>
            onToggleComplete({ id: task.id, completed: !!checked })
            } />
          
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {isExpandable &&
            <button onClick={handleToggleExpand} className="text-muted-foreground hover:text-foreground">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            }
            <h3
              className={cn(
                "flex-1 min-w-0 font-medium text-sm leading-none",
                task.completed && "line-through text-muted-foreground"
              )}>
              {task.title}
            </h3>
          </div>
          <div className="flex items-center shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="p-1"
              onClick={() => onToggleStar({ id: task.id, starred: !task.starred })}>
              <Star className={cn("h-3.5 w-3.5", task.starred ? "fill-starred text-starred" : "text-muted-foreground")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded &&
      <CardContent className="px-4 pb-3 pt-0 space-y-2">
          <div className="flex items-center justify-between gap-2 pl-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {task.due_date && <span>{new Date(task.due_date).toLocaleDateString()}</span>}
              {task.assigned_to && members && (() => {
                const member = members.find(m => m.id === task.assigned_to);
                return member ? <span>{member.display_name || "Unnamed"}</span> : null;
              })()}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {canEdit && canAddSubtasks && !hasExpandedChild &&
                <CreateTaskDialog onSubmit={onCreateSubtask} parentId={task.id} iconOnly buttonBg={task.starred ? `rgba(220,38,38,${1 * 0.02})` : `rgba(0,0,0,${1 * 0.015})`} />
              }
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
                      This will permanently delete "{task.title}" and all its subtasks.
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
          {task.description && <div className="mt-2 pl-1 prose prose-xs text-xs text-muted-foreground leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1" dangerouslySetInnerHTML={{ __html: task.description }} />}
          {task.subtasks?.map((sub) =>
        <TaskCard
          key={sub.id}
          task={sub}
          isOverdue={false}
          depth={depth + 1}
          parentStarred={task.starred}
          onToggleComplete={onToggleComplete}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onCreateSubtask={onCreateSubtask}
          onToggleStar={onToggleStar}
          onExpandChange={handleChildExpandChange} />
        )}

        </CardContent>
      }
    </Card>);

};

export default TaskCard;