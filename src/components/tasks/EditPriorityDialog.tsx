import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { formatPersonName } from "@/lib/dateFormat";
import RichTextEditor from "./RichTextEditor";
import type { Priority } from "@/hooks/usePriorities";

interface EditPriorityDialogProps {
  priority: Priority;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (data: { id: string; title?: string; notes?: string; assigned_to?: string | null }) => void;
  onDelete: (id: string) => void;
}

const EditPriorityDialog = ({ priority, open, onOpenChange, onUpdate, onDelete }: EditPriorityDialogProps) => {
  const [title, setTitle] = useState(priority.title);
  const [notes, setNotes] = useState(priority.notes || "");
  const [assignedTo, setAssignedTo] = useState(priority.assigned_to || "unassigned");
  const { data: members } = useTeamMembers();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) { setTitle(priority.title); setNotes(priority.notes || ""); setAssignedTo(priority.assigned_to || "unassigned"); }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onUpdate({ id: priority.id, title: title.trim(), notes: notes.trim(), assigned_to: assignedTo === "unassigned" ? null : assignedTo });
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
              Edit priority
            </span>
          </div>

          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
              style={{ borderColor: "#C9CED4", background: "#fff", boxShadow: "none" }}
            />
          </div>

          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Assign to</label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff" }}>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{formatPersonName(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Notes</label>
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #C9CED4", background: "#fff" }}>
              <RichTextEditor content={notes} onChange={setNotes} />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#415162" }}
          >
            Save priority
          </button>

          <div className="mt-4 flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-destructive hover:underline bg-transparent border-none cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" /> Delete this priority
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete priority?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete "{priority.title}". This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { onDelete(priority.id); onOpenChange(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPriorityDialog;
