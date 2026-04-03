import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { Info, Trash2, Check, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import type { Task } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { formatPersonName } from "@/lib/dateFormat";

interface TaskDetailSheetProps {
  task: Task;
  onUpdate: (data: {
    id: string;
    title?: string;
    description?: string;
    due_date?: string | null;
    assigned_to?: string | null;
    owed_to?: string | null;
  }) => void;
  onDelete: (id: string) => void;
  onTriggerOpen?: () => void;
  iconTrigger?: boolean;
}

const TaskDetailSheet = ({
  task,
  onUpdate,
  onDelete,
  onTriggerOpen,
  iconTrigger,
}: TaskDetailSheetProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(
    task.due_date ? task.due_date.split("T")[0] : ""
  );
  const [assignedTo, setAssignedTo] = useState<string>(
    task.assigned_to || "unassigned"
  );
  const { data: members } = useTeamMembers();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTitle(task.title);
      setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
      setAssignedTo(task.assigned_to || "unassigned");
      onTriggerOpen?.();
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onUpdate({
      id: task.id,
      title: title.trim(),
      due_date: dueDate || null,
      assigned_to: assignedTo === "unassigned" ? null : assignedTo,
    });
    setOpen(false);
  };

  const selectedDate = dueDate ? parseISO(dueDate) : undefined;

  const trigger = iconTrigger ? (
    <button
      data-no-swipe
      className="flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer rounded-md hover:bg-black/5 transition-colors"
      aria-label="View details"
    >
      <Info className="h-4 w-4 text-foreground" />
    </button>
  ) : (
    <button
      data-no-swipe
      className="flex items-center justify-center min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
      aria-label="View details"
    >
      <Info className="h-4 w-4" />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md overflow-y-auto bg-muted border-border rounded-xl p-0 max-h-[85vh]"
        overlayClassName="bg-[rgba(65,81,98,0.45)] backdrop-blur-sm"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-5 pb-3">
          <DialogHeader>
            <DialogTitle>Task details</DialogTitle>
          </DialogHeader>
        </div>
        <div className="space-y-4 px-5 pb-5">
          <div className="space-y-1.5">
            <Label
              htmlFor="detail-title"
              className="text-xs font-normal text-muted-foreground"
            >
              Title
            </Label>
            <Input
              id="detail-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">
              Due date
            </Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal bg-background rounded-lg",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(selectedDate!, "PPP") : "No due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setDueDate(date ? format(date, "yyyy-MM-dd") : "");
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate("")}
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
                  aria-label="Clear due date"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">
              Assign to
            </Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="bg-background rounded-lg">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {formatPersonName(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  aria-label="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{task.title}" and all its
                    subtasks.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete(task.id);
                      setOpen(false);
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Save task"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailSheet;
