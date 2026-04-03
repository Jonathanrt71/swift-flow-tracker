import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Star, Trash2, CalendarIcon, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { formatPersonName } from "@/lib/dateFormat";
import RichTextEditor from "./RichTextEditor";
import CreateTaskDialog from "./CreateTaskDialog";
import type { Task } from "@/hooks/useTasks";
import type { TeamMember } from "@/hooks/useTeamMembers";

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: TeamMember[];
  meetingNames?: Map<string, string>;
  onUpdate: (data: { id: string; title?: string; description?: string; due_date?: string | null; assigned_to?: string | null }) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (data: { id: string; completed: boolean }) => void;
  onCreateSubtask: (data: { title: string; description?: string; due_date?: string; parent_id?: string }) => void;
  onToggleStar: (data: { id: string; starred: boolean }) => void;
}

const EditTaskDialog = ({ task, open, onOpenChange, teamMembers, meetingNames, onUpdate, onDelete, onToggleComplete, onCreateSubtask, onToggleStar }: EditTaskDialogProps) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.split("T")[0] : "");
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || "unassigned");

  const selectedDate = dueDate ? parseISO(dueDate) : undefined;
  const meetingName = task.meeting_id && meetingNames ? meetingNames.get(task.meeting_id) : null;

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) { setTitle(task.title); setDescription(task.description || ""); setDueDate(task.due_date ? task.due_date.split("T")[0] : ""); setAssignedTo(task.assigned_to || "unassigned"); }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onUpdate({ id: task.id, title: title.trim(), description: description.trim(), due_date: dueDate || null, assigned_to: assignedTo === "unassigned" ? null : assignedTo });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="rounded-lg p-5 max-w-[calc(100vw-2rem)] w-full sm:max-w-md overflow-hidden"
        style={{ background: "#F5F3EE", border: "1px solid #C9CED4", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}
        overlayClassName="bg-[rgba(65,81,98,0.45)] backdrop-blur-sm"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="overflow-y-auto max-h-[80vh] overflow-x-hidden">
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-semibold" style={{ color: "#2D3748" }}>
              Edit task
            </span>
            <button onClick={() => onToggleStar({ id: task.id, starred: !task.starred })} className="flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer rounded-md hover:bg-black/5">
              <Star className={cn("h-4 w-4", task.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
            </button>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
              style={{ borderColor: "#C9CED4", background: "#fff", boxShadow: "none" }}
            />
          </div>

          {/* Due date */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Due date</label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn("flex-1 flex items-center text-left text-sm rounded-lg px-3 py-2", !dueDate && "opacity-60")}
                    style={{ border: "1px solid #C9CED4", background: "#fff", color: "#2D3748" }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" style={{ color: "#5F7285" }} />
                    {dueDate ? format(selectedDate!, "PPP") : "No due date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setDueDate(date ? format(date, "yyyy-MM-dd") : "")}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {dueDate && (
                <button type="button" onClick={() => setDueDate("")} className="flex items-center justify-center w-9 h-9" style={{ color: "#5F7285" }} aria-label="Clear due date">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Assign to */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Assign to</label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff" }}>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{formatPersonName(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Notes</label>
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #C9CED4", background: "#fff" }}>
              <RichTextEditor content={description} onChange={setDescription} />
            </div>
          </div>

          {/* Meeting link */}
          {meetingName && (
            <div className="mb-4">
              <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Meeting link</label>
              <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ background: "#fff", border: "1px solid #C9CED4", color: "#2D3748" }}>
                <Users className="h-4 w-4 shrink-0" style={{ color: "#5F7285" }} />
                {meetingName}
              </div>
            </div>
          )}

          {/* Subtasks */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs" style={{ color: "#5F7285" }}>Subtasks</label>
              <CreateTaskDialog parentId={task.id} onSubmit={onCreateSubtask} iconTrigger />
            </div>
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="space-y-1.5">
                {task.subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: "#fff", border: "1px solid #E2E8F0" }}>
                    <Checkbox checked={sub.completed} onCheckedChange={(checked) => onToggleComplete({ id: sub.id, completed: !!checked })} />
                    <span className={cn("text-sm flex-1", sub.completed && "line-through opacity-50")}>{sub.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#415162" }}
          >
            Save task
          </button>

          {/* Delete */}
          <div className="mt-4 flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-destructive hover:underline bg-transparent border-none cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" /> Delete this task
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete task?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete "{task.title}" and all its subtasks.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { onDelete(task.id); onOpenChange(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;
