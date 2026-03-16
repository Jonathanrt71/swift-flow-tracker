import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Check, X } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import type { Task } from "@/hooks/useTasks";
import type { TeamMember } from "@/hooks/useTeamMembers";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

interface NotesEditorDialogProps {
  task: Task;
  onUpdate: (data: { id: string; description?: string }) => void;
  onSaved?: () => void;
  onTriggerOpen?: () => void;
  children?: ReactNode;
  iconTrigger?: boolean;
  assigneeName?: string;
  assigneeAvatarUrl?: string | null;
  dueDate?: string | null;
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

const formatDueDate = (d: string | null): { text: string; overdue: boolean } | null => {
  if (!d) return null;
  try {
    const dt = parseISO(d.split("T")[0]);
    const days = differenceInCalendarDays(dt, new Date());
    if (days < 0)
      return { text: `Overdue (${format(dt, "MMM d")})`, overdue: true };
    if (days === 0) return { text: "Due today", overdue: false };
    if (days === 1) return { text: "Due tomorrow", overdue: false };
    return { text: `Due ${format(dt, "MMM d")}`, overdue: false };
  } catch {
    return null;
  }
};

const NotesEditorDialog = ({
  task,
  onUpdate,
  onSaved,
  onTriggerOpen,
  children,
  iconTrigger,
  assigneeName,
  assigneeAvatarUrl,
  dueDate,
}: NotesEditorDialogProps) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(task.description || "");

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setDescription(task.description || "");
      onTriggerOpen?.();
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    const trimmed = description.trim();
    setOpen(false);
    // Delay both callbacks to next tick so Dialog fully unmounts first
    requestAnimationFrame(() => {
      onSaved?.();
      onUpdate({ id: task.id, description: trimmed });
    });
  };

  const displayName = assigneeName || "Unassigned";
  const dd = formatDueDate(dueDate ?? task.due_date);

  const trigger = iconTrigger ? (
    <button
      data-no-swipe
      className="flex items-center justify-center w-10 h-10 bg-transparent border-none cursor-pointer"
      aria-label="Edit notes"
      onClick={(e) => e.stopPropagation()}
    >
      <Pencil className="h-4 w-4 text-foreground" />
    </button>
  ) : children ? (
    children
  ) : (
    <button
      data-no-swipe
      className="flex items-center justify-center min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
      aria-label="Edit notes"
    >
      <Pencil className="h-4 w-4" />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg md:max-w-2xl bg-muted border-border rounded-xl p-0 [&>button[class*='absolute']]:hidden"
        overlayClassName="bg-background/60 backdrop-blur-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Avatar + name + due date header */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3">
          {assigneeAvatarUrl ? (
            <img
              src={assigneeAvatarUrl}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
              style={{
                fontSize: 13,
                fontWeight: 500,
                background: getAvatarColor(displayName),
              }}
            >
              {getInitials(displayName)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {displayName}
            </div>
            {dd ? (
              <div
                className={`text-xs font-normal ${
                  dd.overdue ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {dd.text}
              </div>
            ) : (
              <div className="text-xs font-normal text-muted-foreground">
                No due date
              </div>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center min-w-[36px] min-h-[36px] bg-transparent border-none cursor-pointer shrink-0"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-3">
          <div className="[&_.rounded-md]:rounded-lg [&_.rounded-md]:border-border">
            <RichTextEditor content={description} onChange={setDescription} />
          </div>
          <div className="flex items-center justify-end pt-3 border-t border-border">
            <button
              onClick={handleSave}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              aria-label="Save notes"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotesEditorDialog;
