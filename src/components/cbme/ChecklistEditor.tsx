import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { X, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { DetailEditor } from "./DetailField";

interface Task {
  id: string;
  title: string;
  detail: string | null;
}

interface Section {
  id: string;
  name: string;
  tasks: Task[];
}

let idCounter = 1000;
const genId = () => `local-${idCounter++}`;

const ChecklistEditor = ({
  competencyTitle,
  initialSections,
  onSave,
  categories,
  currentCategoryId,
  onSaveCategory,
  children,
}: {
  competencyTitle: string;
  initialSections: Section[];
  onSave: (sections: Section[]) => void;
  categories?: { id: string; name: string }[];
  currentCategoryId?: string | null;
  onSaveCategory?: (categoryId: string | null) => void;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [categoryId, setCategoryId] = useState<string>(currentCategoryId || "");
  const [newSectionName, setNewSectionName] = useState("");
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({});
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setSections(JSON.parse(JSON.stringify(initialSections)));
      setCategoryId(currentCategoryId || "");
      setNewSectionName("");
      setNewTaskInputs({});
      setExpandedTask(null);
      setEditingSection(null);
    }
    setOpen(isOpen);
  };

  const addSection = () => {
    if (!newSectionName.trim()) return;
    setSections([...sections, { id: genId(), name: newSectionName.trim(), tasks: [] }]);
    setNewSectionName("");
  };

  const deleteSection = (secId: string) => {
    setSections(sections.filter((s) => s.id !== secId));
  };

  const renameSection = (secId: string) => {
    if (!editingSectionName.trim()) return;
    setSections(sections.map((s) => (s.id === secId ? { ...s, name: editingSectionName.trim() } : s)));
    setEditingSection(null);
  };

  const addTask = (secId: string) => {
    const title = (newTaskInputs[secId] || "").trim();
    if (!title) return;
    setSections(
      sections.map((s) =>
        s.id === secId ? { ...s, tasks: [...s.tasks, { id: genId(), title, detail: null }] } : s
      )
    );
    setNewTaskInputs({ ...newTaskInputs, [secId]: "" });
  };

  const deleteTask = (secId: string, taskId: string) => {
    setSections(
      sections.map((s) =>
        s.id === secId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s
      )
    );
  };

  const updateTaskDetail = (secId: string, taskId: string, detail: string) => {
    setSections(
      sections.map((s) =>
        s.id === secId
          ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, detail: detail || null } : t)) }
          : s
      )
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md overflow-y-auto border-none rounded-xl p-0 max-h-[85vh] [&>button[class*='absolute']]:hidden"
        style={{ background: "#F5F3EE" }}
        overlayClassName="bg-[rgba(65,81,98,0.45)] backdrop-blur-sm"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-[#415162] rounded-t-xl">
          <span className="text-sm font-medium text-white">Edit: {competencyTitle}</span>
          <button onClick={() => setOpen(false)} className="w-9 h-9 flex items-center justify-center bg-transparent border-none cursor-pointer">
            <X className="h-4 w-4 text-white/70" />
          </button>
        </div>

        <div className="px-4 pt-4 pb-4">
          {/* Category selector */}
          {categories && categories.length > 0 && (
            <div className="mb-4">
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Category</div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", background: "#E7EBEF", border: "0.5px solid #C9CED4", borderRadius: 6, fontSize: 12, color: "#333", outline: "none" }}
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {sections.map((sec) => (
            <div key={sec.id} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                {editingSection === sec.id ? (
                  <input
                    value={editingSectionName}
                    onChange={(e) => setEditingSectionName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && renameSection(sec.id)}
                    onBlur={() => renameSection(sec.id)}
                    autoFocus
                    className="flex-1 px-2 py-1 text-xs font-semibold text-primary uppercase tracking-wider bg-background border border-border rounded outline-none"
                  />
                ) : (
                  <span className="flex-1 text-xs font-semibold text-primary uppercase tracking-wider">{sec.name}</span>
                )}
                <button
                  onClick={() => { setEditingSection(sec.id); setEditingSectionName(sec.name); }}
                  className="w-6 h-6 flex items-center justify-center bg-transparent border-none cursor-pointer text-muted-foreground rounded"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deleteSection(sec.id)}
                  className="w-6 h-6 flex items-center justify-center bg-transparent border-none cursor-pointer text-destructive rounded"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {sec.tasks.map((task) => (
                <div key={task.id} className="bg-muted border border-border rounded-md mb-1 overflow-hidden">
                  <div
                    onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer"
                  >
                    <GripVertical className="h-3.5 w-3.5 text-border shrink-0" />
                    <span className={`flex-1 text-[13px] ${task.detail ? "font-medium" : ""}`}>{task.title}</span>
                    {task.detail && <div className="w-[5px] h-[5px] rounded-full bg-primary/50 shrink-0" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTask(sec.id, task.id); }}
                      className="w-5 h-5 flex items-center justify-center bg-transparent border-none cursor-pointer text-border rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {expandedTask === task.id && (
                    <div className="px-2.5 pb-2 pl-7">
                      <DetailEditor
                        content={task.detail || ""}
                        onChange={(html) => updateTaskDetail(sec.id, task.id, html)}
                      />
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-1.5 mt-1">
                <input
                  value={newTaskInputs[sec.id] || ""}
                  onChange={(e) => setNewTaskInputs({ ...newTaskInputs, [sec.id]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addTask(sec.id)}
                  placeholder="Add task..."
                  className="flex-1 px-2.5 py-1.5 bg-muted border border-border rounded-md text-xs outline-none"
                />
                <button
                  onClick={() => addTask(sec.id)}
                  className="w-7 h-7 flex items-center justify-center bg-primary text-primary-foreground border-none rounded-md cursor-pointer shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          <div className="h-px bg-border my-3" />

          <div className="flex gap-1.5">
            <input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSection()}
              placeholder="New section name..."
              className="flex-1 px-2.5 py-1.5 bg-muted border border-border rounded-md text-xs outline-none"
            />
            <button
              onClick={addSection}
              className="w-7 h-7 flex items-center justify-center bg-transparent text-muted-foreground border border-border rounded-md cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 flex justify-end border-t border-border pt-3">
          <button
            onClick={() => {
              onSave(sections);
              if (onSaveCategory) onSaveCategory(categoryId || null);
              setOpen(false);
            }}
            className="px-5 py-2 bg-primary text-primary-foreground border-none rounded-md text-[13px] font-medium cursor-pointer"
          >
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistEditor;
