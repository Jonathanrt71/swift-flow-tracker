/**
 * DeidentifyReview.tsx
 * 
 * Review UI for the de-identification step during document import.
 * Shows detected names with confidence levels, allows user to confirm/reject/redact,
 * and provides inline "Add to known names" for unknown names.
 */

import { useState } from "react";
import { Plus, Check, X, AlertTriangle, HelpCircle, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { NameDetection, ProfileEntry } from "@/lib/deidentify";

interface ParsedCommentRow {
  survey_barcode: string;
  received_date: string;
  site: string;
  survey_section: string;
  comment_question: string;
  provider_name: string;
  provider_profile_id: string | null;
  rating: string;
  comment: string;
  detections: NameDetection[];
}

interface DeidentifyReviewProps {
  monthLabel: string;
  rows: ParsedCommentRow[];
  onCancel: () => void;
  onSave: (rows: ParsedCommentRow[]) => void;
  saving: boolean;
}

const CONFIDENCE_CONFIG: Record<string, { bg: string; border: string; label: string; icon: React.ReactNode }> = {
  high: { bg: "#E4F0EB", border: "#4A846C", label: "Auto-matched", icon: <Check style={{ width: 10, height: 10 }} /> },
  medium: { bg: "#FDF8ED", border: "#D4A017", label: "Likely match", icon: <HelpCircle style={{ width: 10, height: 10 }} /> },
  low: { bg: "#FBF3E0", border: "#C4820B", label: "Fuzzy match", icon: <HelpCircle style={{ width: 10, height: 10 }} /> },
  unknown: { bg: "#FAEEDA", border: "#9F2929", label: "Unknown name", icon: <AlertTriangle style={{ width: 10, height: 10 }} /> },
};

const RATING_STYLE: Record<string, { bg: string; color: string }> = {
  positive: { bg: "#E4F0EB", color: "#27500A" },
  neutral: { bg: "#D6DEE6", color: "#415162" },
  negative: { bg: "#FBF3E0", color: "#854F0B" },
  mixed: { bg: "#FAEEDA", color: "#633806" },
  open: { bg: "#E7EBEF", color: "#5F7285" },
};

export default function DeidentifyReview({ monthLabel, rows, onCancel, onSave, saving }: DeidentifyReviewProps) {
  const { user } = useAuth();

  // Flatten all detections for the review list
  const [detections, setDetections] = useState<(NameDetection & { rowIndex: number; commentSnippet: string; section: string; provider: string })[]>(() => {
    const flat: any[] = [];
    rows.forEach((row, ri) => {
      row.detections.forEach((d) => {
        flat.push({
          ...d,
          rowIndex: ri,
          commentSnippet: row.comment,
          section: row.survey_section,
          provider: row.provider_name,
        });
      });
    });
    return flat;
  });

  // Add-to-known-names inline form state
  const [addingNameKey, setAddingNameKey] = useState<string | null>(null);
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addCategory, setAddCategory] = useState("staff");
  const [addSaving, setAddSaving] = useState(false);

  const pendingCount = detections.filter((d) => d.action === "pending").length;
  const totalNames = detections.length;
  const resolvedCount = detections.filter((d) => d.action !== "pending").length;
  const totalComments = rows.length;

  const handleAction = (key: string, action: NameDetection["action"]) => {
    setDetections((prev) => prev.map((d) => (d.key === key ? { ...d, action } : d)));
  };

  const handleAddKnownName = async (detectionKey: string) => {
    if (!addFirstName.trim() || !addLastName.trim()) return;
    setAddSaving(true);
    try {
      const { error } = await (supabase.from("known_names" as any).insert({
        first_name: addFirstName.trim(),
        last_name: addLastName.trim(),
        category: addCategory,
        created_by: user?.id,
      } as any) as any);

      if (error) throw error;

      // Auto-redact this detection since we've now registered the name
      handleAction(detectionKey, "redact");
      setAddingNameKey(null);
      setAddFirstName("");
      setAddLastName("");
      setAddCategory("staff");
    } catch (err: any) {
      console.error("Failed to add known name:", err);
    } finally {
      setAddSaving(false);
    }
  };

  const handleSave = () => {
    // Apply detection actions back to rows
    const updatedRows = rows.map((row, ri) => {
      const rowDetections = detections.filter((d) => d.rowIndex === ri);
      return { ...row, detections: rowDetections };
    });
    onSave(updatedRows);
  };

  // Highlight a name within the full comment text
  const renderHighlightedComment = (comment: string, nameText: string) => {
    const idx = comment.toLowerCase().indexOf(nameText.toLowerCase());
    if (idx === -1) return <span>{comment}</span>;
    const before = comment.slice(0, idx);
    const highlighted = comment.slice(idx, idx + nameText.length);
    const after = comment.slice(idx + nameText.length);

    return (
      <span>
        {before}
        <span style={{ background: "#FDF8ED", padding: "1px 3px", borderRadius: 2, fontWeight: 600, color: "#633806" }}>{highlighted}</span>
        {after}
      </span>
    );
  };

  const pendingItems = detections.filter((d) => d.action === "pending");
  const resolvedItems = detections.filter((d) => d.action !== "pending");

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, padding: "0 16px" }}>
          <span style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>Import — Review Names</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onCancel}
              style={{ padding: "5px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={pendingCount > 0 || saving}
              style={{
                padding: "5px 14px",
                background: pendingCount > 0 ? "rgba(255,255,255,0.15)" : "#4A846C",
                color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none",
                cursor: pendingCount > 0 || saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving..." : `Save ${totalComments} Comments`}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "12px 16px 100px" }}>
        {/* Status bar */}
        <div style={{ background: "#E7EBEF", borderRadius: 10, border: "1px solid #D5DAE0", padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <span style={{ fontSize: 13, color: "#3D3D3A", fontWeight: 600 }}>{monthLabel}</span>
            <span style={{ fontSize: 12, color: "#8A9AAB", marginLeft: 12 }}>{totalComments} comments parsed</span>
            <span style={{ fontSize: 12, color: "#8A9AAB", marginLeft: 12 }}>{totalNames} names detected</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {resolvedCount > 0 && (
              <span style={{ fontSize: 12, color: "#4A846C", fontWeight: 500 }}>
                <Check style={{ width: 12, height: 12, display: "inline", verticalAlign: -2 }} /> {resolvedCount} resolved
              </span>
            )}
            {pendingCount > 0 && (
              <span style={{ fontSize: 12, color: "#D4A017", fontWeight: 500 }}>
                <AlertTriangle style={{ width: 12, height: 12, display: "inline", verticalAlign: -2 }} /> {pendingCount} need review
              </span>
            )}
          </div>
        </div>

        {/* Privacy note */}
        <div style={{ background: "#F0F7F4", borderRadius: 8, border: "1px solid #C9CED4", borderTop: "3px solid #4A846C", padding: "10px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "#4A846C", fontWeight: 600 }}>Privacy: </span>
          <span style={{ fontSize: 12, color: "#5F7285" }}>
            All names below will be removed before data is saved. Original names are resolved from the personnel database at display time only. The uploaded file is never stored.
          </span>
        </div>

        {/* No names detected */}
        {totalNames === 0 && (
          <div style={{ background: "#E4F0EB", borderRadius: 10, border: "1px solid #4A846C", padding: "24px", textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#27500A", marginBottom: 4 }}>No names detected in comments</div>
            <div style={{ fontSize: 12, color: "#4A846C" }}>Comments are ready to save. Provider names in the structured column will be linked to profiles automatically.</div>
          </div>
        )}

        {/* Legend */}
        {totalNames > 0 && (
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            {Object.entries(CONFIDENCE_CONFIG).map(([key, cfg]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#5F7285" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 18, height: 18, background: cfg.bg, border: `1px solid ${cfg.border}`,
                  borderRadius: 4, color: cfg.border,
                }}>{cfg.icon}</span>
                {cfg.label}
              </div>
            ))}
          </div>
        )}

        {/* Pending review cards */}
        {pendingItems.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#415162", marginBottom: 8 }}>Needs Review</div>
            {pendingItems.map((item) => {
              const cfg = CONFIDENCE_CONFIG[item.confidence] || CONFIDENCE_CONFIG.unknown;
              const isAddingThis = addingNameKey === item.key;

              return (
                <div key={item.key} style={{
                  background: "#fff", borderRadius: 8,
                  border: `1px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.border}`,
                  padding: "12px 14px", marginBottom: 8,
                }}>
                  {/* Name and match info */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#3D3D3A" }}>"{item.text}"</span>
                      {item.matched_profile && (
                        <span style={{ fontSize: 12, color: "#8A9AAB", marginLeft: 8 }}>
                          → {item.matched_profile.display_name || `${item.matched_profile.last_name}, ${item.matched_profile.first_name}`}?
                        </span>
                      )}
                      {!item.matched_profile && (
                        <span style={{ fontSize: 12, color: "#9F2929", marginLeft: 8 }}>No match found</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10, padding: "2px 6px",
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      borderRadius: 4, color: cfg.border, fontWeight: 600, whiteSpace: "nowrap",
                    }}>{cfg.label}</span>
                  </div>

                  {/* Comment with provider and highlighted name */}
                  <div style={{ fontSize: 12, color: "#5F7285", marginBottom: 8, lineHeight: 1.5 }}>
                    <span style={{ color: "#415162", fontWeight: 600 }}>{item.provider}</span>
                    <span style={{ color: "#C9CED4" }}> · </span>
                    <span style={{ color: "#8A9AAB" }}>{item.section}</span>
                    <div style={{ marginTop: 4 }}>
                      {renderHighlightedComment(item.commentSnippet, item.text)}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {item.matched_profile && (
                      <button
                        onClick={() => handleAction(item.key, "replace")}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", fontSize: 11, fontWeight: 500,
                          background: "#E4F0EB", color: "#4A846C",
                          border: "1px solid #4A846C", borderRadius: 6, cursor: "pointer",
                        }}
                      >
                        <Check style={{ width: 11, height: 11 }} /> Replace with code
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(item.key, "redact")}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "4px 10px", fontSize: 11, fontWeight: 500,
                        background: "#FBF3E0", color: "#854F0B",
                        border: "1px solid #D4A017", borderRadius: 6, cursor: "pointer",
                      }}
                    >
                      <X style={{ width: 11, height: 11 }} /> Redact
                    </button>
                    <button
                      onClick={() => handleAction(item.key, "keep")}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "4px 10px", fontSize: 11, fontWeight: 500,
                        background: "#fff", color: "#8A9AAB",
                        border: "1px solid #D5DAE0", borderRadius: 6, cursor: "pointer",
                      }}
                    >
                      Not a name
                    </button>
                    {!item.matched_profile && (
                      <button
                        onClick={() => {
                          setAddingNameKey(isAddingThis ? null : item.key);
                          // Pre-fill with the detected text
                          if (!isAddingThis) {
                            const parts = item.text.replace(/^dr\.?\s*/i, "").split(/\s+/);
                            if (parts.length >= 2) {
                              setAddFirstName(parts.slice(0, -1).join(" "));
                              setAddLastName(parts[parts.length - 1]);
                            } else {
                              setAddFirstName(parts[0] || "");
                              setAddLastName("");
                            }
                          }
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", fontSize: 11, fontWeight: 500,
                          background: isAddingThis ? "#415162" : "#fff",
                          color: isAddingThis ? "#fff" : "#415162",
                          border: "1px solid #415162", borderRadius: 6, cursor: "pointer",
                        }}
                      >
                        <UserPlus style={{ width: 11, height: 11 }} /> Add to known names
                      </button>
                    )}
                  </div>

                  {/* Inline add-to-known-names form */}
                  {isAddingThis && (
                    <div style={{
                      marginTop: 8, padding: "10px 12px",
                      background: "#F5F3EE", borderRadius: 6, border: "1px solid #D5DAE0",
                    }}>
                      <div style={{ fontSize: 11, color: "#5F7285", marginBottom: 8, fontWeight: 600 }}>
                        Add this person so future imports will catch their name automatically
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div>
                          <label style={{ display: "block", fontSize: 10, color: "#5F7285", marginBottom: 3 }}>First Name</label>
                          <input
                            value={addFirstName}
                            onChange={(e) => setAddFirstName(e.target.value)}
                            style={{
                              padding: "5px 8px", fontSize: 12, border: "1px solid #C9CED4",
                              borderRadius: 6, width: 120, background: "#fff", color: "#3D3D3A",
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10, color: "#5F7285", marginBottom: 3 }}>Last Name</label>
                          <input
                            value={addLastName}
                            onChange={(e) => setAddLastName(e.target.value)}
                            style={{
                              padding: "5px 8px", fontSize: 12, border: "1px solid #C9CED4",
                              borderRadius: 6, width: 120, background: "#fff", color: "#3D3D3A",
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10, color: "#5F7285", marginBottom: 3 }}>Category</label>
                          <select
                            value={addCategory}
                            onChange={(e) => setAddCategory(e.target.value)}
                            style={{
                              padding: "5px 8px", fontSize: 12, border: "1px solid #C9CED4",
                              borderRadius: 6, background: "#fff", color: "#3D3D3A", height: 28,
                            }}
                          >
                            <option value="staff">Staff</option>
                            <option value="external">External Provider</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <button
                          onClick={() => handleAddKnownName(item.key)}
                          disabled={!addFirstName.trim() || !addLastName.trim() || addSaving}
                          style={{
                            padding: "5px 12px", fontSize: 11, fontWeight: 600,
                            background: addFirstName.trim() && addLastName.trim() ? "#415162" : "#C9CED4",
                            color: "#fff", border: "none", borderRadius: 6,
                            cursor: addFirstName.trim() && addLastName.trim() && !addSaving ? "pointer" : "not-allowed",
                          }}
                        >
                          {addSaving ? "Saving..." : "Save & Redact"}
                        </button>
                        <button
                          onClick={() => { setAddingNameKey(null); setAddFirstName(""); setAddLastName(""); }}
                          style={{
                            padding: "5px 8px", fontSize: 11, background: "none",
                            border: "none", color: "#8A9AAB", cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Resolved items */}
        {resolvedItems.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#415162", marginBottom: 8, marginTop: 20 }}>
              Resolved ({resolvedCount})
            </div>
            {resolvedItems.map((item) => {
              const actionLabel = item.action === "replace" ? "Will replace" : item.action === "redact" ? "Will redact" : "Kept as-is";
              const actionColor = item.action === "replace" ? "#4A846C" : item.action === "redact" ? "#854F0B" : "#8A9AAB";

              return (
                <div key={item.key} style={{
                  background: "#E7EBEF", borderRadius: 8,
                  border: "1px solid #D5DAE0", padding: "8px 14px",
                  marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ fontSize: 12, color: "#5F7285" }}>
                    <span style={{ fontWeight: 600, color: "#3D3D3A" }}>"{item.text}"</span>
                    {item.matched_profile && (
                      <span style={{ marginLeft: 6 }}>
                        → {item.matched_profile.display_name || `${item.matched_profile.last_name}, ${item.matched_profile.first_name}`}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: actionColor, fontWeight: 500 }}>{actionLabel}</span>
                    <button
                      onClick={() => handleAction(item.key, "pending")}
                      style={{ fontSize: 10, color: "#8A9AAB", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                    >
                      undo
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
