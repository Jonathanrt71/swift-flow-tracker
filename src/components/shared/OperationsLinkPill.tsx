import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { useOperations } from "@/hooks/useOperations";

/** Clickable pill that navigates to a specific Operations Manual section.
 *  Renders nothing if sectionId is null/undefined or section not found. */
export default function OperationsLinkPill({ sectionId }: { sectionId: string | null | undefined }) {
  const navigate = useNavigate();
  const { data: sections } = useOperations();

  if (!sectionId || !sections) return null;
  const section = sections.find(s => s.id === sectionId);
  if (!section) return null;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigate(`/operations?section=${sectionId}`); }}
      title={`Operations Manual: ${section.title}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", fontSize: 10, fontWeight: 500,
        color: "#415162", background: "#E7EBEF",
        border: "1px solid #D5DAE0", borderRadius: 12,
        cursor: "pointer", whiteSpace: "nowrap" as const,
        maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis",
      }}
    >
      <FileText style={{ width: 10, height: 10, flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{section.title}</span>
    </button>
  );
}
