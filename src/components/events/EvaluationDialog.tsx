import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

type Rating = "red" | "yellow" | "green";

const RATING_CARDS: {
  value: Rating;
  label: string;
  bg: string;
  borderDefault: string;
  borderSelected: string;
  dotColor: string;
  labelColor: string;
}[] = [
  {
    value: "red",
    label: "Needs work",
    bg: "#FCEBEB",
    borderDefault: "#D5DAE0",
    borderSelected: "#E24B4A",
    dotColor: "#E24B4A",
    labelColor: "#A32D2D",
  },
  {
    value: "yellow",
    label: "Adequate",
    bg: "#FAEEDA",
    borderDefault: "#D5DAE0",
    borderSelected: "#EF9F27",
    dotColor: "#EF9F27",
    labelColor: "#854F0B",
  },
  {
    value: "green",
    label: "Excellent",
    bg: "#EAF3DE",
    borderDefault: "#D5DAE0",
    borderSelected: "#639922",
    dotColor: "#639922",
    labelColor: "#3B6D11",
  },
];

interface EvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventDescription?: string | null;
}

export default function EvaluationDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  eventDate,
  eventDescription,
}: EvaluationDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editorProps: {
      attributes: {
        style:
          "background: white; border: 0.5px solid #C9CED4; border-radius: 6px; padding: 10px 12px; min-height: 72px; font-size: 13px; color: #2D3748; outline: none;",
        "data-placeholder": "Add optional notes...",
      },
    },
  });

  // Load existing evaluation when dialog opens
  useEffect(() => {
    if (!open || !user || loaded) return;
    (async () => {
      const { data } = await supabase
        .from("event_evaluations")
        .select("*")
        .eq("event_id", eventId)
        .eq("evaluator_id", user.id)
        .maybeSingle();
      if (data) {
        setSelectedRating(data.rating as Rating);
        setExistingId(data.id);
        if (data.notes && editor) {
          editor.commands.setContent(data.notes);
        }
      }
      setLoaded(true);
    })();
  }, [open, user, eventId, editor, loaded]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedRating(null);
      setExistingId(null);
      setLoaded(false);
      if (editor) editor.commands.setContent("");
    }
  }, [open, editor]);

  const formattedDate = (() => {
    try {
      return format(parseISO(eventDate), "EEEE, MMMM d, yyyy");
    } catch {
      return eventDate;
    }
  })();

  const handleSubmit = useCallback(async () => {
    if (!user || !selectedRating || submitting) return;
    setSubmitting(true);
    const notes = editor?.getHTML() || "";
    const { error } = await supabase.from("event_evaluations").upsert(
      {
        event_id: eventId,
        evaluator_id: user.id,
        rating: selectedRating,
        notes: notes === "<p></p>" ? "" : notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,evaluator_id" }
    );
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Evaluation submitted" });
      queryClient.invalidateQueries({ queryKey: ["event-evaluations-all"] });
      queryClient.invalidateQueries({ queryKey: ["event-evaluation-status"] });
      onOpenChange(false);
    }
  }, [user, selectedRating, editor, eventId, submitting, toast, queryClient, onOpenChange]);

  const buttonDisabled = !selectedRating || submitting;
  const buttonText = existingId ? "Update evaluation" : "Submit evaluation";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-muted border-border rounded-xl p-0 [&>button[class*='absolute']]:hidden max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <DialogHeader className="p-0 space-y-0">
            <DialogTitle style={{ fontSize: 16, fontWeight: 500 }}>
              Evaluate session
            </DialogTitle>
          </DialogHeader>
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-4 pb-4 space-y-4">
          {/* Event info */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#2D3748" }}>
              {eventTitle}
            </div>
            <div style={{ fontSize: 11, color: "#8A9AAB" }}>
              {formattedDate}
              {eventDescription ? ` · ${eventDescription}` : ""}
            </div>
          </div>

          {/* Rating cards */}
          <div>
            <div style={{ fontSize: 11, color: "#8A9AAB", fontWeight: 500, marginBottom: 8 }}>
              Rating
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {RATING_CARDS.map((card) => {
                const isSelected = selectedRating === card.value;
                return (
                  <div
                    key={card.value}
                    role="button"
                    onClick={() => setSelectedRating(card.value)}
                    style={{
                      flex: 1,
                      background: isSelected ? card.bg : card.bg,
                      border: isSelected
                        ? `2px solid ${card.borderSelected}`
                        : `1.5px solid ${card.borderDefault}`,
                      borderRadius: 8,
                      padding: "10px 0",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: card.dotColor,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontSize: 11, color: "#8A9AAB", fontWeight: 500, marginBottom: 8 }}>
              Notes
            </div>
            <EditorContent editor={editor} />
          </div>

          {/* Submit */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              disabled={buttonDisabled}
              onClick={handleSubmit}
              style={{
                background: buttonDisabled ? "#A0AEC0" : "#415162",
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "8px 24px",
                fontSize: 13,
                fontWeight: 500,
                cursor: buttonDisabled ? "default" : "pointer",
              }}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
