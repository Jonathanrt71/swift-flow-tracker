import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Check } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import type { Task } from "@/hooks/useTasks";

interface NotesEditorDialogProps {
  task: Task;
  onUpdate: (data: { id: string; description?: string }) => void;
}

const NotesEditorDialog = ({ task, onUpdate }: NotesEditorDialogProps) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(task.description || "");

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setDescription(task.description || "");
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    onUpdate({
      id: task.id,
      description: description.trim(),
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="flex items-center justify-center min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Edit notes"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md overflow-y-auto bg-muted border-border rounded-xl p-0 max-h-[85vh]"
        overlayClassName="bg-background/60 backdrop-blur-sm"
      >
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle>Notes</DialogTitle>
          </DialogHeader>
        </div>
        <div className="px-6 pb-6 space-y-5">
          <div className="bg-background rounded-lg border border-input overflow-hidden min-h-[200px]">
            <RichTextEditor content={description} onChange={setDescription} />
          </div>
          <div className="flex items-center justify-end pt-4 border-t border-border">
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
