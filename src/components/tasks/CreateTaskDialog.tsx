import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
import { Plus, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { formatPersonName } from "@/lib/dateFormat";
import { Button } from "@/components/ui/button";
import RichTextEditor from "./RichTextEditor";

interface CreateTaskDialogProps {
  onSubmit: (data: { title: string; description?: string; due_date?: string; parent_id?: string; assigned_to?: string; owed_to?: string; meeting_id?: string; operations_section_id?: string }) => void;
  parentId?: string;
  meetingId?: string;
  operationsSectionId?: string;
  loading?: boolean;
  iconOnly?: boolean;
  inlineIcon?: boolean;
  addPill?: boolean;
  iconTrigger?: boolean;
  onTriggerOpen?: () => void;
  children?: React.ReactNode;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

const CreateTaskDialog = ({ onSubmit, parentId, meetingId, operationsSectionId, loading, iconOnly, inlineIcon, addPill, iconTrigger, onTriggerOpen, children, externalOpen, onExternalOpenChange }: CreateTaskDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => { if (onExternalOpenChange) onExternalOpenChange(v); else setInternalOpen(v); };
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
      meeting_id: meetingId,
      operations_section_id: operationsSectionId,
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
      onTriggerOpen?.();
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          {children ? (
            children
          ) : iconTrigger ? (
            <button data-no-swipe className="flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer rounded-md hover:bg-black/5 transition-colors" aria-label="Add subtask">
              <Plus className="h-4 w-4 text-foreground" />
            </button>
          ) : addPill ? (
            <span style={{
              fontSize: 13, fontWeight: 600, color: "#415162", background: "#E7EBEF",
              padding: "4px 12px", borderRadius: 6, cursor: "pointer", userSelect: "none",
            }}>
              Add
            </span>
          ) : (
            <Button variant={inlineIcon ? "ghost" : parentId ? "ghost" : "default"} size={inlineIcon ? "icon" : iconOnly ? "icon" : parentId ? "sm" : "default"} className={inlineIcon ? "h-5 w-5 p-0" : iconOnly ? "min-w-[44px] min-h-[44px] rounded text-muted-foreground hover:text-foreground transition-colors" : ""}>
              <Plus className="h-4 w-4" />
              {!inlineIcon && !iconOnly && (parentId ? "Add subtask" : "New task")}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent
        className="rounded-lg p-5 max-w-[calc(100vw-2rem)] w-full sm:max-w-md overflow-hidden"
        style={{ background: "#F5F3EE", border: "1px solid #C9CED4", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}
        overlayClassName="bg-[rgba(65,81,98,0.45)] backdrop-blur-sm"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="overflow-y-auto max-h-[80vh] overflow-x-hidden">
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-semibold" style={{ color: "#2D3748" }}>
              {parentId ? "Add subtask" : "Create task"}
            </span>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Title</label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
              style={{ borderColor: "#C9CED4", background: "#fff", boxShadow: "none" }}
              required
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
                    className={cn(
                      "flex-1 flex items-center text-left text-sm rounded-lg px-3 py-2",
                      !dueDate && "opacity-60"
                    )}
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
                  className="flex items-center justify-center w-9 h-9"
                  style={{ color: "#5F7285" }}
                  aria-label="Clear due date"
                >
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
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {formatPersonName(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Notes</label>
            <div className="[&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:sm:min-h-[80px] [&_.ProseMirror]:md:min-h-[80px] [&_.tiptap-editor]:min-h-[100px] [&_.tiptap-editor]:sm:min-h-[100px] [&_.tiptap-editor]:md:min-h-[100px] [&_.rounded-md]:bg-white [&_.ProseMirror]:bg-white" style={{ background: "#fff", borderRadius: 8 }}>
              <RichTextEditor content={description} onChange={setDescription} />
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#415162" }}
          >
            {parentId ? "Add subtask" : "Save task"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;