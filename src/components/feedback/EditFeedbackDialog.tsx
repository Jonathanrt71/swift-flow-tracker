import { useState } from "react";
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
import { Pencil, ThumbsUp, ThumbsDown } from "lucide-react";
import { formatPersonName } from "@/lib/dateFormat";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { Feedback } from "@/hooks/useFeedback";
import type { GuidanceLevel } from "./CreateFeedbackDialog";

interface EditFeedbackDialogProps {
  feedback: Feedback;
  residents: { id: string; first_name: string | null; last_name: string | null; graduation_year?: number | null }[];
  onSubmit: (data: {
    resident_id: string;
    comment: string;
    sentiment: "positive" | "negative";
    guidance_level?: GuidanceLevel | null;
  }) => void;
}

const EditFeedbackDialog = ({ feedback, residents, onSubmit }: EditFeedbackDialogProps) => {
  const [open, setOpen] = useState(false);
  const [residentId, setResidentId] = useState(feedback.resident_id);
  const [sentiment, setSentiment] = useState<"positive" | "negative">(
    feedback.sentiment === "negative" ? "negative" : "positive"
  );
  const [guidanceLevel, setGuidanceLevel] = useState<GuidanceLevel | null>(
    (feedback.guidance_level as GuidanceLevel) || null
  );

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
      setSentiment(feedback.sentiment === "negative" ? "negative" : "positive");
      setGuidanceLevel((feedback.guidance_level as GuidanceLevel) || null);
      editor?.commands.setContent(feedback.comment);
    }
    setOpen(isOpen);
  };

  const handleSubmit = () => {
    if (!residentId || !editor) return;
    if (sentiment === "positive" && !guidanceLevel) return;
    const html = editor.getHTML();
    if (!html || html === "<p></p>" || html.trim() === "") return;
    onSubmit({
      resident_id: residentId,
      comment: html,
      sentiment,
      guidance_level: sentiment === "positive" ? guidanceLevel : null,
    });
    setOpen(false);
  };

  const sortedResidents = [...residents].sort((a, b) =>
    formatPersonName(a).localeCompare(formatPersonName(b))
  );

  const guidanceOptions: { value: GuidanceLevel; label: string }[] = [
    { value: "substantial", label: "Substantial" },
    { value: "some", label: "Moderate" },
    { value: "minimal", label: "Minimal" },
  ];

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
          <Select value={residentId || "unselected"} onValueChange={(v) => setResidentId(v === "unselected" ? "" : v)}>
            <SelectTrigger className="rounded-lg focus:ring-0 focus:ring-offset-0" style={{ borderColor: "#C9CED4", background: "#fff" }}>
              <SelectValue placeholder="Select resident..." />
            </SelectTrigger>
            <SelectContent>
              {sortedResidents.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {formatPersonName(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              onClick={() => { setSentiment("negative"); setGuidanceLevel(null); }}
              className="flex-1 flex items-center justify-center py-2.5 rounded-lg transition-opacity"
              style={{
                background: "#c44444",
                border: "2px solid #a33333",
                opacity: sentiment === "negative" ? 1 : 0.3,
              }}
            >
              <ThumbsDown className="h-5 w-5" style={{ color: "#FFFFFF" }} />
            </button>
            <button
              type="button"
              onClick={() => { setSentiment("positive"); setGuidanceLevel(null); }}
              className="flex-1 flex items-center justify-center py-2.5 rounded-lg transition-opacity"
              style={{
                background: "#4A846C",
                border: "2px solid #3A6B56",
                opacity: sentiment === "positive" ? 1 : 0.3,
              }}
            >
              <ThumbsUp className="h-5 w-5" style={{ color: "#FFFFFF" }} />
            </button>
          </div>
        </div>

        {/* Guidance level — only for positive sentiment */}
        {sentiment === "positive" && (
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: "#5F7285" }}>
              Level of assistance needed
            </label>
            <div className="flex gap-2">
              {guidanceOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGuidanceLevel(opt.value)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-opacity"
                  style={{
                    background: guidanceLevel === opt.value ? "#415162" : "#E7EBEF",
                    color: guidanceLevel === opt.value ? "#fff" : "#2D3748",
                    border: "none",
                    opacity: guidanceLevel === null || guidanceLevel === opt.value ? 1 : 0.5,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSubmit}
          disabled={!residentId || (sentiment === "positive" && !guidanceLevel)}
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
