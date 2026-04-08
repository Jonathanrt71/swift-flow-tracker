import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, X } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useTasks } from "@/hooks/useTasks";
import { formatPersonName } from "@/lib/dateFormat";
import RichTextEditor from "./RichTextEditor";
import ComboSearch from "@/components/shared/ComboSearch";
import type { Priority } from "@/hooks/usePriorities";
import type { Task } from "@/hooks/useTasks";

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
  const { tasks: allTaskTrees, createTask, updateTask } = useTasks();

  // Flatten task tree to get all tasks
  const flattenTasks = (trees: Task[]): Task[] => {
    const result: Task[] = [];
    const walk = (t: Task) => { result.push(t); t.subtasks?.forEach(walk); };
    trees.forEach(walk);
    return result;
  };
  const allTasks = flattenTasks(allTaskTrees);
  const linkedTasks = allTasks.filter(t => (t as any).priority_id === priority.id);
  const unlinkableTasks = allTasks.filter(t => !(t as any).priority_id);

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
            <div className="[&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:sm:min-h-[80px] [&_.ProseMirror]:md:min-h-[80px] [&_.tiptap-editor]:min-h-[100px] [&_.tiptap-editor]:sm:min-h-[100px] [&_.tiptap-editor]:md:min-h-[100px] [&_.rounded-md]:bg-white [&_.ProseMirror]:bg-white" style={{ background: "#fff", borderRadius: 8 }}>
              <RichTextEditor content={notes} onChange={setNotes} />
            </div>
          </div>

          {/* Linked tasks */}
          <div className="mb-4">
            <div style={{ background: "#E7EBEF", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <svg style={{ width: 14, height: 14, color: "#8A9AAB" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                <span style={{ fontSize: 11, fontWeight: 500, color: "#5F7285", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Tasks {linkedTasks.length > 0 ? `(${linkedTasks.length})` : ""}
                </span>
              </div>
              {linkedTasks.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "0.5px solid #D5DAE0" }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                    border: t.completed ? "none" : "1.5px solid #C9CED4",
                    background: t.completed ? "#4A846C" : "transparent",
                  }} />
                  <span style={{ fontSize: 12, color: t.completed ? "#8A9AAB" : "#2D3748", flex: 1, textDecoration: t.completed ? "line-through" : "none" }}>
                    {t.title}
                  </span>
                  <button
                    onClick={() => updateTask.mutate({ id: t.id, priority_id: null })}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                  >
                    <X style={{ width: 14, height: 14, color: "#C9CED4" }} />
                  </button>
                </div>
              ))}
              <div style={{ marginTop: linkedTasks.length > 0 ? 8 : 0 }}>
                <ComboSearch
                  items={unlinkableTasks.map(t => ({ id: t.id, label: t.title }))}
                  placeholder="Search or create task..."
                  createLabel="task"
                  onSelect={(id) => updateTask.mutate({ id, priority_id: priority.id })}
                  onCreate={async (title) => {
                    await createTask.mutateAsync({ title, assigned_to: priority.assigned_to || undefined, priority_id: priority.id });
                  }}
                />
              </div>
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
