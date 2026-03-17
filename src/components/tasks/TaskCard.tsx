import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Star, Trash2, X, Users } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
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
import type { Task } from "@/hooks/useTasks";
import type { TeamMember } from "@/hooks/useTeamMembers";
import CreateTaskDialog from "./CreateTaskDialog";
import TaskDetailSheet from "./TaskDetailSheet";
import NotesEditorDialog from "./NotesEditorDialog";

interface TaskCardProps {
  task: Task;
  isOverdue: boolean;
  depth?: number;
  teamMembers: TeamMember[];
  meetingNames?: Map<string, string>;
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

const hasNotes = (desc: string | null): boolean =>
  !!desc && desc.trim() !== "" && desc.trim() !== "<p></p>";

const hasContent = (task: Task): boolean =>
  hasNotes(task.description) || (task.subtasks?.length ?? 0) > 0;

const isExpandable = (task: Task): boolean =>
  hasNotes(task.description) || (task.subtasks?.length ?? 0) > 0 || !!task.due_date || !!task.meeting_id;

const formatDueDate = (d: string | null): { text: string; urgent: boolean } | null => {
  if (!d) return null;
  try {
    const dt = parseISO(d.split("T")[0]);
    const days = differenceInCalendarDays(dt, new Date());
    if (days < 0) return { text: `Overdue (${format(dt, "MMM d")})`, urgent: true };
    if (days === 0) return { text: "Due today", urgent: true };
    if (days === 1) return { text: "Due tomorrow", urgent: true };
    if (days <= 7) return { text: `Due ${format(dt, "EEE, MMM d")}`, urgent: false };
    return { text: `Due ${format(dt, "MMM d")}`, urgent: false };
  } catch {
    return null;
  }
};

const getNotesPreview = (desc: string | null): string | null => {
  if (!hasNotes(desc)) return null;
  const firstBlock = desc!.split(/<\/(?:p|li|h[1-6]|div|br\s*\/?)>/i)[0];
  return firstBlock.replace(/<[^>]*>/g, "").trim().slice(0, 120) || null;
};

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

/* ── Slide-in Action Bar ── */
const ActionBar = ({
  task,
  isSubtask,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onToggleStar,
  teamMembers,
  parentTask,
}: {
  task: Task;
  isSubtask: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: TaskCardProps["onUpdate"];
  onDelete: TaskCardProps["onDelete"];
  onCreateSubtask: TaskCardProps["onCreateSubtask"];
  onToggleStar: TaskCardProps["onToggleStar"];
  teamMembers: TeamMember[];
  parentTask?: Task;
}) => {
  const sourceTask = parentTask || task;
  const member = teamMembers.find((m) => m.id === sourceTask.assigned_to);
  const assigneeName = member?.display_name || (sourceTask.assigned_to ? "Unknown" : undefined);
  const assigneeAvatarUrl = member?.avatar_url;

  const btnClass =
    "flex items-center justify-center w-10 h-10 bg-transparent border-none cursor-pointer rounded-md hover:bg-black/5";

  return (
    <div
      className={cn(
        "absolute top-0 right-0 bottom-0 flex items-center gap-0.5 px-1.5 z-[5] transition-transform duration-200 ease-out",
        isSubtask ? "rounded-r-md" : "rounded-r-[10px]",
        isOpen ? "translate-x-0" : "translate-x-full",
        "bg-[#D5DAE0]"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {!isSubtask && (
        <button
          className={btnClass}
          onClick={() => {
            onToggleStar({ id: task.id, starred: !task.starred });
            onClose();
          }}
        >
          <Star
            className={cn(
              "h-4 w-4",
              task.starred ? "fill-[#9F2929] text-[#9F2929]" : "text-foreground"
            )}
          />
        </button>
      )}

      <div className="w-10 h-10 flex items-center justify-center">
        <NotesEditorDialog
          task={task}
          onUpdate={onUpdate}
          onTriggerOpen={onClose}
          iconTrigger
          assigneeName={assigneeName}
          assigneeAvatarUrl={assigneeAvatarUrl}
          dueDate={sourceTask.due_date}
        />
      </div>
      <div className="w-10 h-10 flex items-center justify-center">
        <TaskDetailSheet task={task} onUpdate={onUpdate} onDelete={onDelete} onTriggerOpen={onClose} iconTrigger />
      </div>

      {!isSubtask && (
        <div className="w-10 h-10 flex items-center justify-center">
          <CreateTaskDialog onSubmit={onCreateSubtask} parentId={task.id} onTriggerOpen={onClose} iconTrigger />
        </div>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            className={btnClass}
            onClick={onClose}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{task.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(task.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <button
        className="flex items-center justify-center w-10 h-10 bg-transparent border-none cursor-pointer rounded-md"
        onClick={onClose}
      >
        <X className="h-3.5 w-3.5 text-foreground" />
      </button>
    </div>
  );
};

/* ── Subtask Row ── */
const SubtaskRow = ({
  task,
  parentId,
  isStarred,
  openBarId,
  onToggleBar,
  teamMembers,
  onToggleComplete,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onToggleStar,
}: {
  task: Task;
  parentId: string;
  isStarred: boolean;
  openBarId: string | null;
  onToggleBar: (id: string) => void;
  teamMembers: TeamMember[];
  onToggleComplete: TaskCardProps["onToggleComplete"];
  onUpdate: TaskCardProps["onUpdate"];
  onDelete: TaskCardProps["onDelete"];
  onCreateSubtask: TaskCardProps["onCreateSubtask"];
  onToggleStar: TaskCardProps["onToggleStar"];
}) => {
  return (
    <div
      className="rounded-md mb-0.5 overflow-hidden relative bg-muted"
    >
      <div className="flex items-center min-h-[40px] px-2 relative">
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
            "flex-1 min-w-0 text-[13px] px-1",
            task.completed && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </div>
        <div className="flex items-center shrink-0">
          <button
            className="bg-transparent border-none cursor-pointer p-0 mr-1"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBar(task.id);
            }}
          >
            <AssigneeAvatar
              assignedTo={task.assigned_to || task.created_by}
              teamMembers={teamMembers}
              size={22}
            />
          </button>
        </div>

        <ActionBar
          task={task}
          isSubtask
          isOpen={openBarId === task.id}
          onClose={() => onToggleBar(task.id)}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onCreateSubtask={onCreateSubtask}
          onToggleStar={onToggleStar}
          teamMembers={teamMembers}
        />
      </div>
    </div>
  );
};

/* ── Main TaskCard ── */
const TaskCard = ({
  task,
  isOverdue,
  depth = 0,
  teamMembers,
  meetingNames,
  onToggleComplete,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onToggleStar,
}: TaskCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [openBarId, setOpenBarId] = useState<string | null>(null);
  const barToggleIntentRef = useRef<string | null>(null);
  const blockReopenUntilRef = useRef(0);

  const hasChildren = task.subtasks && task.subtasks.length > 0;

  const toggleBar = (id: string) => {
    if (Date.now() < blockReopenUntilRef.current) return;
    setOpenBarId((prev) => (prev === id ? null : id));
  };

  const closeBar = () => {
    setOpenBarId(null);
    barToggleIntentRef.current = null;
    blockReopenUntilRef.current = Date.now() + 500;
  };

  if (depth > 0) {
    return (
      <SubtaskRow
        task={task}
        parentId={task.parent_id || ""}
        isStarred={false}
        openBarId={openBarId}
        onToggleBar={toggleBar}
        teamMembers={teamMembers}
        onToggleComplete={onToggleComplete}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onCreateSubtask={onCreateSubtask}
        onToggleStar={onToggleStar}
      />
    );
  }

  return (
    <Card
      className="transition-all overflow-hidden border cursor-pointer bg-muted border-border"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button, input, .checkbox-area, [data-no-swipe]")) return;
        if (openBarId) {
          closeBar();
          return;
        }
        if (isExpandable(task)) setExpanded(!expanded);
      }}
    >
      <div className="flex items-center min-h-[48px] px-1.5 relative">
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
            "flex-1 min-w-0 text-left min-h-[44px] flex items-center px-1",
            task.completed && "line-through text-muted-foreground"
          )}
        >
          <span className="font-medium text-sm truncate">{task.title}</span>
        </div>

        <div className="flex items-center shrink-0">
          <button
            className="bg-transparent border-none cursor-pointer p-0 mr-1.5 flex items-center"
            onPointerDown={(e) => {
              e.stopPropagation();
              barToggleIntentRef.current = task.id;
            }}
            onClick={(e) => {
              e.stopPropagation();
              const isKeyboardActivation = e.detail === 0;
              if (!isKeyboardActivation && barToggleIntentRef.current !== task.id) return;
              if (Date.now() < blockReopenUntilRef.current) {
                barToggleIntentRef.current = null;
                return;
              }
              barToggleIntentRef.current = null;
              toggleBar(task.id);
            }}
          >
            {/* Star indicator */}
            {task.starred && (
              <Star className="h-3.5 w-3.5 fill-[#9F2929] text-[#9F2929] shrink-0 mr-2" />
            )}

            {/* Avatar */}
            <AssigneeAvatar
              assignedTo={task.assigned_to || task.created_by}
              teamMembers={teamMembers}
              size={28}
            />
          </button>
        </div>

        <ActionBar
          task={task}
          isSubtask={false}
          isOpen={openBarId === task.id}
          onClose={closeBar}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onCreateSubtask={onCreateSubtask}
          onToggleStar={onToggleStar}
          teamMembers={teamMembers}
        />
      </div>

      {expanded && isExpandable(task) && (
        <>
          {/* Due date + notes preview + meeting link */}
          {(task.due_date || hasNotes(task.description) || task.meeting_id) && (
            <div className="pb-2 pl-[52px] pr-3">
              {(() => {
                const dd = formatDueDate(task.due_date);
                return dd ? (
                  <div className={cn("text-[11px] mb-1", dd.urgent ? "text-destructive" : "text-muted-foreground")}>
                    {dd.text}
                  </div>
                ) : null;
              })()}
              {(() => {
                const preview = getNotesPreview(task.description);
                return preview ? (
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {preview}
                  </div>
                ) : null;
              })()}
              {task.meeting_id && meetingNames?.get(task.meeting_id) && (
                <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1.5 bg-[#D5DAE0] rounded-md">
                  <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">
                    {meetingNames.get(task.meeting_id)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Subtasks */}
          {hasChildren && (
            <div className="pb-2 pl-8 pr-2">
              {task.subtasks!.map((sub) => (
                <SubtaskRow
                  key={sub.id}
                  task={sub}
                  parentId={task.id}
                  isStarred={task.starred}
                  openBarId={openBarId}
                  onToggleBar={toggleBar}
                  teamMembers={teamMembers}
                  onToggleComplete={onToggleComplete}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onCreateSubtask={onCreateSubtask}
                  onToggleStar={onToggleStar}
                />
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default TaskCard;
