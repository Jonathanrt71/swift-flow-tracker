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
import { X, ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

type Rating = "yellow" | "green" | "blue";

const RATING_OPTIONS: {
  value: Rating;
  color: string;
  bgLight: string;
  borderColor: string;
  icon: typeof ArrowDown;
}[] = [
  { value: "yellow", color: "#D4A017", borderColor: "#D4A017", bgLight: "#FBF3E0", icon: ArrowDown },
  { value: "green", color: "#4A846C", borderColor: "#4A846C", bgLight: "#E4F0EB", icon: ArrowRight },
  { value: "blue", color: "#52657A", borderColor: "#52657A", bgLight: "#D6DEE6", icon: ArrowUp },
];

const CRITERIA = [
  { key: "rating_preparation", label: "Quality of preparation" },
  { key: "rating_presentation", label: "Quality of presentation" },
  { key: "rating_content", label: "Command of content" },
  { key: "rating_overall", label: "Overall impression" },
] as const;

type CriteriaKey = typeof CRITERIA[number]["key"];

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

  const [ratings, setRatings] = useState<Record<CriteriaKey, Rating | null>>({
    rating_preparation: null,
    rating_presentation: null,
    rating_content: null,
    rating_overall: null,
  });
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
        setRatings({
          rating_preparation: (data as any).rating_preparation as Rating | null,
          rating_presentation: (data as any).rating_presentation as Rating | null,
          rating_content: (data as any).rating_content as Rating | null,
          rating_overall: (data as any).rating_overall as Rating | null,
        });
        setExistingId(data.id);
        if (data.notes && editor) {
          editor.commands.setContent(data.notes);
        }
      }
      setLoaded(true);
    })();
  }, [open, user, eventId, editor, loaded]);

  useEffect(() => {
    if (!open) {
      setRatings({
        rating_preparation: null,
        rating_presentation: null,
        rating_content: null,
        rating_overall: null,
      });
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

  const setRating = (key: CriteriaKey, value: Rating) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const allRated = CRITERIA.every((c) => ratings[c.key] !== null);

  const handleSubmit = useCallback(async () => {
    if (!user || !allRated || submitting) return;
    setSubmitting(true);
    const notes = editor?.getHTML() || "";
    const { error } = await (supabase as any).from("event_evaluations").upsert(
      {
        event_id: eventId,
        evaluator_id: user.id,
        rating: ratings.rating_overall || "green",
        rating_preparation: ratings.rating_preparation,
        rating_presentation: ratings.rating_presentation,
        rating_content: ratings.rating_content,
        rating_overall: ratings.rating_overall,
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
  }, [user, allRated, ratings, editor, eventId, submitting, toast, queryClient, onOpenChange]);

  const buttonDisabled = !allRated || submitting;
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

          {/* Rating grid */}
          <div>
            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 126px", alignItems: "center", marginBottom: 8 }}>
              <span />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", justifyItems: "center" }}>
                {RATING_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <div
                      key={opt.value}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: opt.bgLight,
                        border: `2px solid ${opt.borderColor}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon style={{ width: 14, height: 14, color: opt.color }} strokeWidth={2.5} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Criteria rows */}
            {CRITERIA.map((criterion, idx) => (
              <div
                key={criterion.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 126px",
                  alignItems: "center",
                  padding: "10px 0",
                  borderTop: idx === 0 ? "0.5px solid #D5DAE0" : "none",
                  borderBottom: "0.5px solid #D5DAE0",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: "#2D3748" }}>
                  {criterion.label}
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", justifyItems: "center" }}>
                  {RATING_OPTIONS.map((opt) => {
                    const isSelected = ratings[criterion.key] === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRating(criterion.key, opt.value)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          border: isSelected
                            ? `2px solid ${opt.borderColor}`
                            : "1.5px solid #C9CED4",
                          background: isSelected ? opt.bgLight : "transparent",
                          cursor: "pointer",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s",
                        }}
                      >
                        {isSelected && (
                          <Icon style={{ width: 14, height: 14, color: opt.color }} strokeWidth={2.5} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
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
