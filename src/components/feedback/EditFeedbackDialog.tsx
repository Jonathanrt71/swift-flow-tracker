import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, ThumbsUp, ThumbsDown } from "lucide-react";
import { formatPersonName } from "@/lib/dateFormat";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { Feedback } from "@/hooks/useFeedback";

interface EditFeedbackDialogProps {
  feedback: Feedback;
  residents: { id: string; first_name: string | null; last_name: string | null }[];
  onSubmit: (data: {
    resident_id: string;
    comment: string;
    sentiment: "positive" | "negative";
  }) => void;
}

const EditFeedbackDialog = ({ feedback, residents, onSubmit }: EditFeedbackDialogProps) => {
  const [open, setOpen] = useState(false);
  const [residentId, setResidentId] = useState(feedback.resident_id);
  const [sentiment, setSentiment] = useState<"positive" | "negative">(feedback.sentiment);

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
        className="rounded-lg border-0 p-5 max-w-[calc(100vw-2rem)] w-full sm:max-w-md"
        style={{ background: "#F5F3EE" }}
      >
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
                {formatLastFirst(r.display_name)}
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
        <div className="mb-5">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSentiment("positive")}
              className="flex-1 flex items-center justify-center py-2.5 rounded-lg transition-opacity"
              style={{
                background: "#5E9E82",
                opacity: sentiment === "positive" ? 1 : 0.3,
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
                opacity: sentiment === "negative" ? 1 : 0.3,
              }}
            >
              <ThumbsDown className="h-5 w-5" style={{ color: "#F5F3EE" }} />
            </button>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSubmit}
          disabled={!residentId}
          className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "#415162" }}
        >
          Save changes
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default EditFeedbackDialog;
