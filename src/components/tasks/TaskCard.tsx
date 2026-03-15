import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Star, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
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

const hasNotes = (desc: string | null): boolean =>
  !!desc && desc.trim() !== "" && desc.trim() !== "<p></p>";

/* ── Swipeable wrapper ── */
interface SwipeWrapProps {
  id: string;
  children: React.ReactNode;
  leftActions?: React.ReactNode;
  rightAction?: React.ReactNode;
  maxLeft?: number;
  maxRight?: number;
  className?: string;
}

const SwipeWrap = ({
  id,
  children,
  leftActions,
  rightAction,
  maxLeft = -180,
  maxRight = 0,
  className = "",
}: SwipeWrapProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const state = useRef({ sx: 0, dragging: false, didSwipe: false, _current: 0 });

  const snap = useCallback(
    (target: number) => {
      const el = contentRef.current;
      if (!el) return;
      el.style.transition = "transform 0.25s ease";
      el.style.transform = `translateX(${target}px)`;
      state.current._current = target;
      setIsOpen(target !== 0);
    },
    []
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const el = contentRef.current!;

    const isInteractive = (t: EventTarget | null) => {
      if (!t || !(t instanceof HTMLElement)) return false;
      return !!t.closest("button, input, [data-no-swipe], .checkbox-area, .close-overlay");
    };

    const onStart = (x: number) => {
      state.current.sx = x;
      state.current.dragging = true;
      state.current.didSwipe = false;
      el.style.transition = "none";
    };

    const onMove = (x: number) => {
      if (!state.current.dragging) return;
      const dx = x - state.current.sx;
      const clamped = Math.max(maxLeft, Math.min(maxRight, dx));
      if (Math.abs(dx) > 5) state.current.didSwipe = true;
      el.style.transform = `translateX(${clamped}px)`;
      state.current._current = clamped;
    };

    const onEnd = () => {
      if (!state.current.dragging) return;
      state.current.dragging = false;
      const cx = state.current._current ?? 0;
      let target = 0;
      if (cx < -60) target = maxLeft;
      else if (cx > 30 && maxRight > 0) target = maxRight;
      snap(target);
    };

    const ts = (e: TouchEvent) => {
      if (isInteractive(e.target)) return;
      onStart(e.touches[0].clientX);
      e.stopPropagation();
    };
    const tm = (e: TouchEvent) => {
      if (!state.current.dragging) return;
      onMove(e.touches[0].clientX);
      if (state.current.didSwipe) e.preventDefault();
      e.stopPropagation();
    };
    const te = (e: TouchEvent) => {
      onEnd();
      e.stopPropagation();
    };
    const md = (e: MouseEvent) => {
      if (isInteractive(e.target)) return;
      onStart(e.clientX);
      e.stopPropagation();
    };
    const mm = (e: MouseEvent) => {
      if (!state.current.dragging) return;
      onMove(e.clientX);
      e.preventDefault();
      e.stopPropagation();
    };
    const mu = (e: MouseEvent) => {
      onEnd();
      e.stopPropagation();
    };

    wrap.addEventListener("touchstart", ts, { passive: false });
    wrap.addEventListener("touchmove", tm, { passive: false });
    wrap.addEventListener("touchend", te, { passive: false });
    wrap.addEventListener("mousedown", md);
    wrap.addEventListener("mousemove", mm);
    wrap.addEventListener("mouseup", mu);

    return () => {
      wrap.removeEventListener("touchstart", ts);
      wrap.removeEventListener("touchmove", tm);
      wrap.removeEventListener("touchend", te);
      wrap.removeEventListener("mousedown", md);
      wrap.removeEventListener("mousemove", mm);
      wrap.removeEventListener("mouseup", mu);
    };
  }, [maxLeft, maxRight, snap]);

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden", className)}>
      {rightAction && (
        <div className="absolute left-0 top-0 bottom-0 flex z-[1]">
          {rightAction}
        </div>
      )}
      {leftActions && (
        <div className="absolute right-0 top-0 bottom-0 flex z-[1]">
          {leftActions}
        </div>
      )}
      <div ref={contentRef} className="relative z-[2]">
        {children}
        {isOpen && (
          <div
            className="close-overlay absolute inset-0 z-[10]"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              snap(0);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              snap(0);
            }}
          />
        )}
      </div>
    </div>
  );
};

/* ── Swipe action button ── */
const SwipeBtn = ({
  className,
  onClick,
  children,
}: {
  className: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    data-no-swipe
    className={cn(
      "w-[60px] flex items-center justify-center border-none cursor-pointer",
      className
    )}
    onClick={onClick}
  >
    {children}
  </button>
);

/* ── Subtask row ── */
const SubtaskRow = ({
  task,
  parentId,
  isStarred,
  onToggleComplete,
  onUpdate,
  onDelete,
}: {
  task: Task;
  parentId: string;
  isStarred: boolean;
  onToggleComplete: TaskCardProps["onToggleComplete"];
  onUpdate: TaskCardProps["onUpdate"];
  onDelete: TaskCardProps["onDelete"];
}) => {
  const hn = hasNotes(task.description);

  const leftActions = (
    <>
      <SwipeBtn className="bg-[#378ADD]" onClick={() => {}}>
        <NotesEditorDialog task={task} onUpdate={onUpdate} iconTrigger />
      </SwipeBtn>
      <SwipeBtn className="bg-[#EF9F27]" onClick={() => {}}>
        <TaskDetailSheet task={task} onUpdate={onUpdate} onDelete={onDelete} iconTrigger />
      </SwipeBtn>
      <SwipeBtn
        className="bg-[#E24B4A]"
        onClick={() => onDelete(task.id)}
      >
        <svg
          className="w-4 h-4 stroke-white"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </SwipeBtn>
    </>
  );

  return (
    <SwipeWrap
      id={task.id}
      leftActions={leftActions}
      maxLeft={-180}
      className="rounded-md mb-0.5"
    >
      <div
        className={cn(
          "rounded-md",
          isStarred ? "bg-transparent" : "bg-transparent"
        )}
      >
        <div className="flex items-center min-h-[40px] px-2">
          <div className="checkbox-area flex items-center justify-center min-w-[44px] min-h-[44px]">
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
            {hn && (
              <NotesEditorDialog task={task} onUpdate={onUpdate}>
                <button
                  data-no-swipe
                  className="flex items-center justify-center w-9 h-9 cursor-pointer bg-transparent border-none"
                >
                  <div className="block w-1.5 h-1.5 min-w-[6px] min-h-[6px] rounded-full bg-muted-foreground" />
                </button>
              </NotesEditorDialog>
            )}
          </div>
        </div>
      </div>
    </SwipeWrap>
  );
};

/* ── Main TaskCard ── */
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
  const hasChildren = task.subtasks && task.subtasks.length > 0;
  const canAddSubtasks =
    depth < MAX_DEPTH && (!task.subtasks || task.subtasks.length < 10);
  const hn = hasNotes(task.description);

  // Subtask rows rendered at depth > 0 are handled by SubtaskRow
  if (depth > 0) {
    return (
      <SubtaskRow
        task={task}
        parentId={task.parent_id || ""}
        isStarred={false}
        onToggleComplete={onToggleComplete}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
  }

  const leftActions = (
    <>
      <SwipeBtn className="bg-[#378ADD]" onClick={() => {}}>
        <NotesEditorDialog task={task} onUpdate={onUpdate} iconTrigger />
      </SwipeBtn>
      <SwipeBtn className="bg-[#EF9F27]" onClick={() => {}}>
        <TaskDetailSheet task={task} onUpdate={onUpdate} onDelete={onDelete} iconTrigger />
      </SwipeBtn>
      <SwipeBtn
        className="bg-[#E24B4A]"
        onClick={() => onDelete(task.id)}
      >
        <svg
          className="w-4 h-4 stroke-white"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </SwipeBtn>
    </>
  );

  const rightAction = canAddSubtasks ? (
    <SwipeBtn className="bg-[#1D9E75]" onClick={() => {}}>
      <CreateTaskDialog
        onSubmit={onCreateSubtask}
        parentId={task.id}
        iconTrigger
      />
    </SwipeBtn>
  ) : undefined;

  const cardContent = (
    <Card
      className={cn(
        "transition-all overflow-hidden border",
        task.starred
          ? "bg-[hsl(0,60%,88%)] border-[hsl(0,50%,78%)]"
          : "bg-muted border-border"
      )}
    >
      {/* Main row: checkbox — name — chevron — dot — star */}
      <div className="flex items-center min-h-[48px] px-2">
        <div className="checkbox-area flex items-center justify-center min-w-[44px] min-h-[44px]">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) =>
              onToggleComplete({ id: task.id, completed: !!checked })
            }
          />
        </div>

        <div
          className={cn(
            "flex-1 min-w-0 text-left min-h-[44px] flex items-center px-1 cursor-pointer",
            task.completed && "line-through text-muted-foreground"
          )}
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          <span className="font-medium text-sm truncate">{task.title}</span>
        </div>

        <div className="flex items-center shrink-0">
          {hasChildren && (
            <button
              data-no-swipe
              className="flex items-center justify-center min-w-[44px] min-h-[44px] bg-transparent border-none cursor-pointer"
              onClick={() => setExpanded(!expanded)}
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                  expanded && "rotate-180",
                  task.starred && "text-[hsl(0,30%,55%)]"
                )}
              />
            </button>
          )}

          {hn && (
            <NotesEditorDialog task={task} onUpdate={onUpdate}>
              <button
                data-no-swipe
                className="flex items-center justify-center min-w-[44px] min-h-[44px] bg-transparent border-none cursor-pointer"
              >
                <div
                  className={cn(
                    "block w-[7px] h-[7px] min-w-[7px] min-h-[7px] rounded-full",
                    task.starred
                      ? "bg-[hsl(0,30%,55%)]"
                      : "bg-muted-foreground"
                  )}
                />
              </button>
            </NotesEditorDialog>
          )}

          <button
            data-no-swipe
            className="flex items-center justify-center min-w-[44px] min-h-[44px] bg-transparent border-none cursor-pointer"
            onClick={() =>
              onToggleStar({ id: task.id, starred: !task.starred })
            }
          >
            <Star
              className={cn(
                "h-4 w-4",
                task.starred
                  ? "fill-[hsl(0,70%,45%)] text-[hsl(0,70%,45%)]"
                  : "text-muted-foreground"
              )}
            />
          </button>
        </div>
      </div>

      {/* Expanded: subtasks */}
      {expanded && hasChildren && (
        <div className={cn(
          "pb-2 pl-8 pr-2 pt-1 rounded-b-lg",
          task.starred ? "bg-[hsl(0,50%,91%)]" : "bg-[hsl(210,18%,95%)]"
        )}>
          {task.subtasks!.map((sub) => (
            <SubtaskRow
              key={sub.id}
              task={sub}
              parentId={task.id}
              isStarred={task.starred}
              onToggleComplete={onToggleComplete}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </Card>
  );

  // Only wrap in swipe when collapsed
  if (expanded) {
    return <div className="rounded-lg overflow-hidden">{cardContent}</div>;
  }

  return (
    <SwipeWrap
      id={task.id}
      leftActions={leftActions}
      rightAction={rightAction}
      maxLeft={-180}
      maxRight={canAddSubtasks ? 60 : 0}
      className="rounded-lg"
    >
      {cardContent}
    </SwipeWrap>
  );
};

export default TaskCard;
