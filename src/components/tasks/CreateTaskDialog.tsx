import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "./RichTextEditor";
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
import { Plus, CalendarIcon, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useTeamMembers } from "@/hooks/useTeamMembers";

interface CreateTaskDialogProps {
  onSubmit: (data: { title: string; description?: string; due_date?: string; parent_id?: string; assigned_to?: string }) => void;
  parentId?: string;
  loading?: boolean;
  iconOnly?: boolean;
  inlineIcon?: boolean;
}

const CreateTaskDialog = ({ onSubmit, parentId, loading, iconOnly, inlineIcon }: CreateTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("unassigned");
  const { data: members } = useTeamMembers();

  const selectedDate = dueDate ? parseISO(dueDate) : undefined;

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      parent_id: parentId,
      assigned_to: assignedTo === "unassigned" ? undefined : assignedTo,
    });
    setTitle("");
    setDescription("");
    setDueDate("");
    setAssignedTo("unassigned");
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setDueDate("");
      setAssignedTo("unassigned");
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={inlineIcon ? "ghost" : parentId ? "ghost" : "default"} size={inlineIcon ? "icon" : iconOnly ? "icon" : parentId ? "sm" : "default"} className={inlineIcon ? "h-8 w-8 p-0" : iconOnly ? "min-w-[44px] min-h-[44px] rounded" : ""}>
          <Plus className="h-4 w-4" />
          {!inlineIcon && !iconOnly && (parentId ? "Add subtask" : "New task")}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md overflow-y-auto bg-muted border-border rounded-xl p-0 max-h-[85vh]" overlayClassName="bg-background/60 backdrop-blur-sm">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle>{parentId ? "Add Subtask" : "Create Task"}</DialogTitle>
          </DialogHeader>
        </div>
        <div className="space-y-5 px-6 pb-6">
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-xs text-muted-foreground">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="bg-background rounded-lg"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <div className="bg-background rounded-lg border border-input overflow-hidden">
              <RichTextEditor content={description} onChange={setDescription} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Due date</Label>
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
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear due date"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Assign to</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="bg-background rounded-lg">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.display_name || "Unnamed"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-border">
            <button
              onClick={handleSubmit}
              disabled={loading || !title.trim()}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Create task"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;