import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ThumbsUp, ThumbsDown } from "lucide-react";
import { formatPersonName } from "@/lib/dateFormat";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CompetencySelector, { type CompetencySelection } from "./CompetencySelector";

interface CreateFeedbackDialogProps {
  onSubmit: (data: {
    resident_id: string;
    comment: string;
    sentiment: "positive" | "negative";
    competency_category_id?: string | null;
    competency_subcategory_id?: string | null;
    competency_milestone_id?: string | null;
  }) => void;
  residents: { id: string; first_name: string | null; last_name: string | null }[];
}

const CreateFeedbackDialog = ({ onSubmit, residents }: CreateFeedbackDialogProps) => {
  const [open, setOpen] = useState(false);
  const [residentId, setResidentId] = useState("");
  const [sentiment, setSentiment] = useState<"positive" | "negative" | null>(null);
  const [competency, setCompetency] = useState<CompetencySelection | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: {
        class: "outline-none min-h-[80px] text-sm px-3 py-2",
        style: "color: #2D3748;",
      },
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setResidentId("");
      setSentiment(null);
      setCompetency(null);
      editor?.commands.clearContent();
    }
    setOpen(isOpen);
  };

  const handleSubmit = () => {
    if (!residentId || !sentiment || !editor) return;
    const html = editor.getHTML();
    if (!html || html === "<p></p>" || html.trim() === "") return;
    onSubmit({
      resident_id: residentId,
      comment: html,
      sentiment,
      competency_category_id: competency?.categoryId || null,
      competency_subcategory_id: competency?.subcategoryId || null,
      competency_milestone_id: competency?.milestoneId || null,
    });
    setOpen(false);
  };

  const sortedResidents = [...residents].sort((a, b) =>
    formatPersonName(a).localeCompare(formatPersonName(b))
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="p-1 text-[#8A9AAB]">
          <Plus className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="rounded-lg border-0 p-5 max-w-[calc(100vw-2rem)] w-full sm:max-w-md"
        style={{ background: "#F5F3EE" }}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-semibold" style={{ color: "#2D3748" }}>
            Add feedback
          </span>
        </div>

        {/* Resident selector */}
        <div className="mb-4">
          <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>
            Resident
          </label>
          <select
            value={residentId}
            onChange={(e) => setResidentId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm bg-white"
            style={{ borderColor: "#C9CED4", color: "#2D3748" }}
          >
            <option value="">Select resident...</option>
            {sortedResidents.map((r) => (
              <option key={r.id} value={r.id}>
                {formatPersonName(r)}
              </option>
            ))}
          </select>
        </div>

        {/* Comment (TipTap, no toolbar) */}
        <div className="mb-4">
          <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>
            Comment
          </label>
          <div
            className="rounded-lg bg-white overflow-hidden"
            style={{ border: "0.5px solid #C9CED4", minHeight: 100 }}
          >
            {editor && <EditorContent editor={editor} />}
          </div>
        </div>

        {/* Competency selector */}
        <CompetencySelector value={competency} onChange={setCompetency} commentText={editor?.getText() || ""} sentiment={sentiment ?? undefined} />

        {/* Sentiment buttons */}
        <div className="mb-5">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSentiment("positive")}
              className="flex-1 flex items-center justify-center py-2.5 rounded-lg transition-opacity"
              style={{
                background: "#5E9E82",
                opacity: sentiment === null || sentiment === "positive" ? 1 : 0.3,
              }}
            >
              <ThumbsUp className="h-5 w-5" style={{ color: "#F5F3EE" }} />
            </button>
            <button
              type="button"
              onClick={() => setSentiment("negative")}
              className="flex-1 flex items-center justify-center py-2.5 rounded-lg transition-opacity"
              style={{
                background: "#A63333",
                opacity: sentiment === null || sentiment === "negative" ? 1 : 0.3,
              }}
            >
              <ThumbsDown className="h-5 w-5" style={{ color: "#F5F3EE" }} />
            </button>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSubmit}
          disabled={!residentId || !sentiment}
          className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "#415162" }}
        >
          Save feedback
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFeedbackDialog;
