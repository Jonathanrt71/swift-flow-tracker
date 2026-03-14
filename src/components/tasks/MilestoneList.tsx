import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import type { Milestone } from "@/hooks/useTasks";

interface MilestoneListProps {
  milestones: Milestone[];
  taskId: string;
  onCreateMilestone: (data: { task_id: string; title: string }) => void;
  onToggleMilestone: (data: { id: string; completed: boolean }) => void;
  onDeleteMilestone: (id: string) => void;
  canEdit: boolean;
}

const MilestoneList = ({
  milestones,
  taskId,
  onCreateMilestone,
  onToggleMilestone,
  onDeleteMilestone,
  canEdit,
}: MilestoneListProps) => {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const handleAdd = () => {
    if (!title.trim()) return;
    onCreateMilestone({ task_id: taskId, title: title.trim() });
    setTitle("");
    setAdding(false);
  };

  const completedCount = milestones.filter((m) => m.completed).length;

  return (
    <div className="space-y-2">
      {milestones.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all rounded-full"
              style={{ width: `${(completedCount / milestones.length) * 100}%` }}
            />
          </div>
          <span>{completedCount}/{milestones.length}</span>
        </div>
      )}
      {milestones.map((m) => (
        <div key={m.id} className="flex items-center gap-2 group">
          <Checkbox
            checked={m.completed}
            onCheckedChange={(checked) =>
              onToggleMilestone({ id: m.id, completed: !!checked })
            }
            disabled={!canEdit}
          />
          <span className={`text-sm flex-1 ${m.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {m.title}
          </span>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDeleteMilestone(m.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
      {canEdit && milestones.length < 10 && (
        adding ? (
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Milestone title"
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={handleAdd}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setTitle(""); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" /> Add milestone
          </Button>
        )
      )}
    </div>
  );
};

export default MilestoneList;
