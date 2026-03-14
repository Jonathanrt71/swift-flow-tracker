import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Trash2, ChevronDown, ChevronRight, AlertTriangle, Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/hooks/useTasks";
import EditTaskDialog from "./EditTaskDialog";
import CreateTaskDialog from "./CreateTaskDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  const assignee = task.assigned_to ?
  members?.find((m) => m.id === task.assigned_to) :
  null;
  const canAddSubtasks = depth < MAX_DEPTH && (!task.subtasks || task.subtasks.length < 10);

  const formattedDue = task.due_date ?
  new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) :
  null;

  const now = new Date();
  const isSubtaskOverdue = (t: Task) =>
  !t.completed && !!t.due_date && new Date(t.due_date) < now;

  // For nested subtasks, use a simpler inline layout
  if (depth > 0) {
    return (
      <div className={cn("space-y-1 rounded", isOverdue && "bg-warning/5")} style={{ marginLeft: `${depth * 5 - 2}px`, backgroundColor: isOverdue ? undefined : parentStarred ? `rgba(220,38,38,${depth * 0.02})` : `rgba(0,0,0,${depth * 0.015})` }}>
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
              {task.description &&
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
              }
              <div className="flex items-center gap-3 mt-1">
                {formattedDue &&
                <span className={cn("text-xs", isOverdue ? "text-warning font-medium flex items-center gap-1" : "text-muted-foreground")}>
                    {isOverdue && <AlertTriangle className="h-3 w-3" />}
                    {formattedDue}
                  </span>
                }
                {assignee &&
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={assignee.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">{(assignee.display_name || "?")[0]}</AvatarFallback>
                    </Avatar>
                    {assignee.display_name || "Unnamed"}
                  </span>
                }
              </div>
            </div>
          </div>
          {expanded &&
          <div className="flex items-center gap-1 shrink-0">
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
            isOverdue={isSubtaskOverdue(sub)}
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
            {canEdit && canAddSubtasks && !hasExpandedChild && !hideAddButton &&
          <div style={{ marginLeft: '2px' }}>
                <CreateTaskDialog onSubmit={onCreateSubtask} parentId={task.id} iconOnly buttonBg={parentStarred ? `rgba(220,38,38,${(depth + 1) * 0.02})` : `rgba(0,0,0,${(depth + 1) * 0.015})`} />
              </div>
          }
          </div>
        }
      </div>);

  }

  // Root-level card
  return (
    <Card className={cn("transition-all", isOverdue && "border-warning/50 bg-warning/5", task.starred && !isOverdue && "border-starred/20 bg-starred/[0.02]", !isOverdue && !task.starred && "bg-muted/40")}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) =>
            onToggleComplete({ id: task.id, completed: !!checked })
            }
            className="mt-1" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 py-[3px]">
              {isExpandable &&
              <button onClick={handleToggleExpand} className="text-muted-foreground hover:text-foreground">
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              }
              <h3
                className={cn(
                  "font-medium text-sm leading-tight",
                  task.completed && "line-through text-muted-foreground"
                )}>
                
                {task.title}
              </h3>
            </div>
            {task.description &&
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            }
            <div className="flex items-center gap-3 mt-2">
              {formattedDue &&
              <span
                className={cn(
                  "text-xs",
                  isOverdue ? "text-warning font-medium flex items-center gap-1" : "text-muted-foreground"
                )}>
                
                  {isOverdue && <AlertTriangle className="h-3 w-3" />}
                  {formattedDue}
                </span>
              }
              {assignee &&
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={assignee.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">{(assignee.display_name || "?")[0]}</AvatarFallback>
                  </Avatar>
                  {assignee.display_name || "Unnamed"}
                </span>
              }
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleStar({ id: task.id, starred: !task.starred })}>
              
              <Star className={cn("h-3.5 w-3.5", task.starred ? "fill-starred text-starred" : "text-muted-foreground")} />
            </Button>
            {expanded &&
            <>
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
              </>
            }
          </div>
        </div>
      </CardHeader>

      {expanded &&
      <CardContent className="px-4 pb-4 pt-0 space-y-1">
          {task.subtasks?.map((sub) =>
        <TaskCard
          key={sub.id}
          task={sub}
          isOverdue={isSubtaskOverdue(sub)}
          depth={depth + 1}
          parentStarred={task.starred}
          onToggleComplete={onToggleComplete}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onCreateSubtask={onCreateSubtask}
          onToggleStar={onToggleStar}
          onExpandChange={handleChildExpandChange} />

        )}

          {canEdit && canAddSubtasks && !hasExpandedChild &&
        <div style={{ marginLeft: '0px' }}>
              <CreateTaskDialog onSubmit={onCreateSubtask} parentId={task.id} iconOnly buttonBg={task.starred ? `rgba(220,38,38,${1 * 0.02})` : `rgba(0,0,0,${1 * 0.015})`} />
            </div>
        }
        </CardContent>
      }
    </Card>);

};

export default TaskCard;