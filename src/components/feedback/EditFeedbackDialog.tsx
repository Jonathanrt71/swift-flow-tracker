import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { formatPersonName } from "@/lib/dateFormat";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { Feedback } from "@/hooks/useFeedback";
import CompetencySelector, {
  type CompetencySelection,
  buildSelectionFromFeedback,
} from "./CompetencySelector";
import { useACGMECompetencies } from "@/hooks/useACGMECompetencies";

interface EditFeedbackDialogProps {
  feedback: Feedback;
  residents: { id: string; first_name: string | null; last_name: string | null; graduation_year?: number | null }[];
  onSubmit: (data: {
    resident_id: string;
    comment: string;
    sentiment: "positive" | "negative" | "neutral";
    competency_category_id?: string | null;
    competency_subcategory_id?: string | null;
    competency_milestone_id?: string | null;
  }) => void;
}

const EditFeedbackDialog = ({ feedback, residents, onSubmit }: EditFeedbackDialogProps) => {
  const { data: categories } = useACGMECompetencies();
  const [open, setOpen] = useState(false);
  const [residentId, setResidentId] = useState(feedback.resident_id);
  const [sentiment, setSentiment] = useState<"positive" | "negative" | "neutral">(feedback.sentiment);
  const [competency, setCompetency] = useState<CompetencySelection | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: feedback.comment,
    editorProps: {
      attributes: {
        class: "outline-none min-h-[80px] text-sm px-3 py-2",
        style: "color: #2D3748;",
      },
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setResidentId(feedback.resident_id);
      setSentiment(feedback.sentiment);
      editor?.commands.setContent(feedback.comment);
      // Build initial competency selection
      const sel = buildSelectionFromFeedback(
        categories || [],
        feedback.competency_category_id,
        feedback.competency_subcategory_id,
        feedback.competency_milestone_id,
      );
      setCompetency(sel);
    }
    setOpen(isOpen);
  };

  const handleSubmit = () => {
    if (!residentId || !editor) return;
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
        <button className="p-1 text-[#8A9AAB] hover:text-[#415162]">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="rounded-lg p-5 max-w-[calc(100vw-2rem)] w-full sm:max-w-md overflow-hidden"
        style={{ background: "#F5F3EE", border: "1px solid #C9CED4", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}
        overlayClassName="bg-[rgba(65,81,98,0.45)] backdrop-blur-sm"
      >
        <div className="overflow-y-auto max-h-[80vh] overflow-x-hidden">
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-semibold" style={{ color: "#2D3748" }}>
            Edit feedback
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

        {/* Sentiment buttons */}
        <div className="mb-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSentiment("negative")}
              className="flex-1 flex items-center justify-center py-2.5 rounded-lg transition-opacity"
              style={{
                background: "#D4A017",
                border: "2px solid #B0850F",
                opacity: sentiment === "negative" ? 1 : 0.3,
              }}
            >
              <ArrowDown className="h-5 w-5" style={{ color: "#FFFFFF" }} />
            </button>
            <button
              type="button"
              onClick={() => setSentiment("neutral")}
              className="flex-1 flex items-center justify-center py-2.5 rounded-lg transition-opacity"
              style={{
                background: "#4A846C",
                border: "2px solid #3A6B56",
                opacity: sentiment === "neutral" ? 1 : 0.3,
              }}
            >
              <ArrowRight className="h-5 w-5" style={{ color: "#FFFFFF" }} />
            </button>
            <button
              type="button"
              onClick={() => setSentiment("positive")}
              className="flex-1 flex items-center justify-center py-2.5 rounded-lg transition-opacity"
              style={{
                background: "#52657A",
                border: "2px solid #415162",
                opacity: sentiment === "positive" ? 1 : 0.3,
              }}
            >
              <ArrowUp className="h-5 w-5" style={{ color: "#FFFFFF" }} />
            </button>
          </div>
        </div>

        {/* Competency selector */}
        <CompetencySelector value={competency} onChange={setCompetency} commentText={editor?.getText() || ""} sentiment={sentiment} pgyLevel={(() => {
          const r = residents.find((r) => r.id === residentId);
          if (!r?.graduation_year) return undefined;
          const now = new Date();
          const academicYear = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
          const pgy = academicYear - (r.graduation_year - 3);
          return pgy >= 1 ? pgy : undefined;
        })()} residentId={residentId} />

        {/* Save */}
        <button
          onClick={handleSubmit}
          disabled={!residentId}
          className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "#415162" }}
        >
          Save changes
        </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditFeedbackDialog;
