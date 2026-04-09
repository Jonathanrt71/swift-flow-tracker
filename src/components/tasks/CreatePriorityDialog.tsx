import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { formatPersonName } from "@/lib/dateFormat";
import { Button } from "@/components/ui/button";
import RichTextEditor from "./RichTextEditor";

interface CreatePriorityDialogProps {
  onSubmit: (data: { title: string; notes?: string; assigned_to?: string | null }) => void;
  loading?: boolean;
  inlineIcon?: boolean;
  addPill?: boolean;
}

const CreatePriorityDialog = ({ onSubmit, loading, inlineIcon, addPill }: CreatePriorityDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("unassigned");
  const { data: members } = useTeamMembers();

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      notes: notes.trim() || undefined,
      assigned_to: assignedTo === "unassigned" ? null : assignedTo,
    });
    setTitle("");
    setNotes("");
    setAssignedTo("unassigned");
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) { setTitle(""); setNotes(""); setAssignedTo("unassigned"); }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {addPill ? (
          <span style={{
            fontSize: 13, fontWeight: 600, color: "#415162", background: "#E7EBEF",
            padding: "4px 12px", borderRadius: 6, cursor: "pointer", userSelect: "none",
          }}>
            Add
          </span>
        ) : (
        <Button variant={inlineIcon ? "ghost" : "default"} size={inlineIcon ? "icon" : "default"} className={inlineIcon ? "h-5 w-5 p-0" : ""}>
          <Plus className="h-4 w-4" />
          {!inlineIcon && "Add priority"}
        </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="rounded-lg p-5 max-w-[calc(100vw-2rem)] w-full sm:max-w-md overflow-hidden"
        style={{ background: "#F5F3EE", border: "1px solid #C9CED4", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}
        overlayClassName="bg-[rgba(65,81,98,0.45)] backdrop-blur-sm"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="overflow-y-auto max-h-[80vh] overflow-x-hidden">
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-semibold" style={{ color: "#2D3748" }}>
              Add priority
            </span>
          </div>

          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the priority?"
              className="rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
              style={{ borderColor: "#C9CED4", background: "#fff", boxShadow: "none" }}
              required
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
            <div className="[&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:sm:min-h-[80px] [&_.ProseMirror]:md:min-h-[80px] [&_.tiptap-editor]:min-h-[100px] [&_.tiptap-editor]:sm:min-h-[100px] [&_.tiptap-editor]:md:min-h-[100px] [&_.rounded-md]:bg-white [&_.ProseMirror]:bg-white" style={{ background: "#fff", borderRadius: 8 }}>
              <RichTextEditor content={notes} onChange={setNotes} />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#415162" }}
          >
            Save priority
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePriorityDialog;
