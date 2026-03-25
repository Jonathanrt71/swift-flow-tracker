import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type Rating = "red" | "yellow" | "green";

const DOT_STYLES: Record<Rating, { unselected: string; selected: string; hover: string }> = {
  red: {
    unselected: "background: #F5C4C4; border: 2px solid #C9CED4;",
    selected: "background: #E24B4A; border: 2px solid #A32D2D;",
    hover: "background: #F09595; border: 2px solid #C9CED4;",
  },
  yellow: {
    unselected: "background: #FAE4A8; border: 2px solid #C9CED4;",
    selected: "background: #EF9F27; border: 2px solid #BA7517;",
    hover: "background: #FAC775; border: 2px solid #C9CED4;",
  },
  green: {
    unselected: "background: #C0DD97; border: 2px solid #C9CED4;",
    selected: "background: #639922; border: 2px solid #3B6D11;",
    hover: "background: #97C459; border: 2px solid #C9CED4;",
  },
};

const RATINGS: Rating[] = ["red", "yellow", "green"];

interface EventEvaluationProps {
  eventId: string;
}

export default function EventEvaluation({ eventId }: EventEvaluationProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredDot, setHoveredDot] = useState<Rating | null>(null);
  const [loaded, setLoaded] = useState(false);

  const isLocked = submitted && !editing;

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editable: !isLocked,
    editorProps: {
      attributes: {
        style:
          `background: ${isLocked ? "#F5F3EE" : "white"}; border: 0.5px solid #C9CED4; border-radius: 6px; padding: 10px 12px; min-height: 72px; font-size: 13px; color: #2D3748; outline: none;`,
        "data-placeholder": "Add optional notes...",
      },
    },
  });

  // Update editor editable + style when lock state changes
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!isLocked);
    editor.view.dom.style.background = isLocked ? "#F5F3EE" : "white";
  }, [isLocked, editor]);

  // Load existing evaluation
  useEffect(() => {
    if (!user || loaded) return;
    (async () => {
      const { data } = await supabase
        .from("event_evaluations")
        .select("*")
        .eq("event_id", eventId)
        .eq("evaluator_id", user.id)
        .maybeSingle();
      if (data) {
        setSelectedRating(data.rating as Rating);
        if (data.notes && editor) {
          editor.commands.setContent(data.notes);
        }
        setSubmitted(true);
      }
      setLoaded(true);
    })();
  }, [user, eventId, editor, loaded]);

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
      setSubmitted(true);
      setEditing(false);
    }
  }, [user, selectedRating, editor, eventId, submitting, toast]);

  if (!loaded) return null;

  const buttonDisabled = !selectedRating || submitting || isLocked;
  const buttonText = isLocked ? "Submitted" : editing ? "Update evaluation" : "Submit evaluation";
  const buttonBg = isLocked ? "#5E9E82" : buttonDisabled ? "#A0AEC0" : "#415162";

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div style={{ borderTop: "0.5px solid #C9CED4", margin: "14px 0" }} />

      {/* Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 12 }}>
        {RATINGS.map((r) => {
          const isSelected = selectedRating === r;
          const isHovered = hoveredDot === r && !isSelected && !isLocked;
          const style = isSelected
            ? DOT_STYLES[r].selected
            : isHovered
            ? DOT_STYLES[r].hover
            : DOT_STYLES[r].unselected;
          return (
            <div
              key={r}
              role="button"
              onMouseEnter={() => setHoveredDot(r)}
              onMouseLeave={() => setHoveredDot(null)}
              onClick={() => {
                if (!isLocked) setSelectedRating(r);
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                cursor: isLocked ? "default" : "pointer",
                transition: "all 0.15s",
                ...Object.fromEntries(style.split(";").filter(Boolean).map((s) => {
                  const [k, v] = s.split(":").map((x) => x.trim());
                  return [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v];
                })),
              }}
            />
          );
        })}
      </div>

      {/* Notes editor */}
      <div style={{ marginBottom: 10 }}>
        <EditorContent editor={editor} />
      </div>

      {/* Button row */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {submitted && !editing && (
          <button
            onClick={() => setEditing(true)}
            style={{
              background: "none",
              border: "none",
              fontSize: 12,
              color: "#5F7285",
              textDecoration: "underline",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Edit
          </button>
        )}
        <button
          disabled={buttonDisabled}
          onClick={handleSubmit}
          style={{
            background: buttonBg,
            color: "white",
            border: "none",
            borderRadius: 6,
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 500,
            cursor: buttonDisabled ? "default" : "pointer",
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
