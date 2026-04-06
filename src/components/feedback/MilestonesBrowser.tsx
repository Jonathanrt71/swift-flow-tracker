import { useState } from "react";
import { ChevronDown, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { useACGMECompetencies } from "@/hooks/useACGMECompetencies";
import { useAdmin } from "@/hooks/useAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";

const MilestonesBrowser = () => {
  const { data: categories } = useACGMECompetencies();
  const { isAdmin } = useAdmin();
  const { has: hasPerm } = usePermissions();
  const canEditMilestones = isAdmin || hasPerm("feedback.milestones", "full");
  const queryClient = useQueryClient();
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [expandedMileId, setExpandedMileId] = useState<string | null>(null);

  // Inline editing state
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [addText, setAddText] = useState("");
  const [editingIdx, setEditingIdx] = useState<{ mileId: string; idx: number } | null>(null);
  const [editText, setEditText] = useState("");

  const cats = categories || [];

  const updateExamples = async (milestoneId: string, examples: string[]) => {
    await (supabase as any)
      .from("competency_milestones_acgme")
      .update({ examples })
      .eq("id", milestoneId);
    queryClient.invalidateQueries({ queryKey: ["acgme-competencies"] });
  };

  const handleAddSave = (milestoneId: string, currentExamples: string[]) => {
    if (!addText.trim()) return;
    updateExamples(milestoneId, [...currentExamples, addText.trim()]);
    setAddText("");
    setAddingFor(null);
  };

  const handleEditSave = (milestoneId: string, currentExamples: string[], idx: number) => {
    if (!editText.trim()) return;
    const updated = [...currentExamples];
    updated[idx] = editText.trim();
    updateExamples(milestoneId, updated);
    setEditingIdx(null);
    setEditText("");
  };

  const handleDelete = (milestoneId: string, currentExamples: string[], idx: number) => {
    const updated = currentExamples.filter((_, i) => i !== idx);
    updateExamples(milestoneId, updated);
  };

  return (
    <div className="flex flex-col gap-1">
      {cats.map((cat) => {
        const isCatExpanded = expandedCatId === cat.id;
        return (
          <div key={cat.id}>
            <button
              onClick={() => {
                setExpandedCatId(isCatExpanded ? null : cat.id);
                setExpandedSubId(null);
                setExpandedMileId(null);
              }}
              className="w-full flex items-center gap-2.5 rounded-lg px-3.5 py-3 text-left"
              style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4" }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: "#2D3748" }}>
                {cat.code}
              </span>
              <span className="flex-1 min-w-0" style={{ fontSize: 13, color: "#2D3748" }}>
                {cat.name}
              </span>
              <ChevronDown
                className="h-3.5 w-3.5 shrink-0 transition-transform"
                style={{
                  color: "#8A9AAB",
                  transform: isCatExpanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {isCatExpanded && (
              <div className="flex flex-col gap-0.5 mt-1" style={{ paddingLeft: 16 }}>
                {cat.subcategories.map((sub) => {
                  const isSubExpanded = expandedSubId === sub.id;
                  return (
                    <div key={sub.id}>
                      <button
                        onClick={() => {
                          setExpandedSubId(isSubExpanded ? null : sub.id);
                          setExpandedMileId(null);
                        }}
                        className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left"
                        style={{
                          background: isSubExpanded ? "#EEF0F2" : "#E7EBEF",
                          border: "0.5px solid #C9CED4",
                        }}
                      >
                        <span className="flex-1 text-xs" style={{ color: "#2D3748" }}>
                          {sub.code} — {sub.name}
                        </span>
                        <ChevronDown
                          className="h-3.5 w-3.5 shrink-0 transition-transform"
                          style={{
                            color: "#8A9AAB",
                            transform: isSubExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        />
                      </button>

                      {isSubExpanded && (
                        <div className="flex flex-col gap-0.5 mt-1 ml-2">
                          {sub.milestones.map((mile) => {
                            const isMileExpanded = expandedMileId === mile.id;
                            const bullets = mile.description
                              .split(". ")
                              .map((s) => s.replace(/\.$/, "").trim())
                              .filter(Boolean);
                            const exCount = mile.examples.length;

                            return (
                              <div key={mile.id}>
                                <button
                                  onClick={() =>
                                    setExpandedMileId(isMileExpanded ? null : mile.id)
                                  }
                                  className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-left"
                                  style={{ background: "#F5F3EE" }}
                                >
                                  <div
                                    className="flex items-center justify-center shrink-0"
                                    style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: "50%",
                                      background: "#F5F3EE",
                                      border: "1px solid #C9CED4",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: "#5F7285",
                                    }}
                                  >
                                    {mile.level}
                                  </div>

                                  <span
                                    className="flex-1 min-w-0"
                                    style={{ fontSize: 12, color: "#2D3748" }}
                                  >
                                    {mile.summary || `Level ${mile.level}`}
                                  </span>

                                  {exCount > 0 && (
                                    <span style={{ fontSize: 11, color: "#5E9E82", whiteSpace: "nowrap" }}>
                                      {exCount} example{exCount !== 1 ? "s" : ""}
                                    </span>
                                  )}

                                  <ChevronDown
                                    className="h-3.5 w-3.5 shrink-0 transition-transform"
                                    style={{
                                      color: "#8A9AAB",
                                      transform: isMileExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                    }}
                                  />
                                </button>

                                {isMileExpanded && (
                                  <div style={{ margin: "4px 12px 10px 32px" }} className="flex flex-col gap-1.5">
                                    {/* ACGME description card */}
                                    <div
                                      style={{
                                        background: "#fff",
                                        border: "0.5px solid #C9CED4",
                                        borderLeft: `2px solid ${cat.color}`,
                                        borderRadius: 8,
                                        padding: "10px 14px",
                                      }}
                                    >
                                      {bullets.map((b, i) => (
                                        <div
                                          key={i}
                                          className="flex items-start"
                                          style={{
                                            fontSize: 12,
                                            lineHeight: 1.7,
                                            padding: "4px 0",
                                            gap: 6,
                                          }}
                                        >
                                          <span className="shrink-0" style={{ color: "#415162" }}>•</span>
                                          <span style={{ color: "#5F7285" }}>{b}</span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Program examples card */}
                                    <div
                                      style={{
                                        background: "#fff",
                                        border: "0.5px solid #C9CED4",
                                        borderLeft: "2px solid #5E9E82",
                                        borderRadius: 8,
                                        padding: "10px 14px",
                                      }}
                                    >
                                      {/* Header */}
                                      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                                        <span style={{ fontSize: 10, fontWeight: 600, color: "#8A9AAB", letterSpacing: 0.5, textTransform: "uppercase" as const }}>
                                          Program Examples
                                        </span>
                                        {canEditMilestones && (
                                          <button
                                            onClick={() => { setAddingFor(mile.id); setAddText(""); }}
                                            className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                                            style={{ fontSize: 11, color: "#415162" }}
                                          >
                                            <Plus className="h-3 w-3" /> Add
                                          </button>
                                        )}
                                      </div>

                                      {/* Examples list */}
                                      {mile.examples.length === 0 ? (
                                        <p style={{ fontSize: 12, color: "#8A9AAB", fontStyle: "italic" }}>
                                          {canEditMilestones ? "No examples yet — click Add to create one" : "No program examples yet"}
                                        </p>
                                      ) : (
                                        mile.examples.map((ex, idx) => (
                                          <div key={idx}>
                                            {idx > 0 && <div style={{ borderTop: "0.5px solid #E7EBEF" }} />}
                                            {editingIdx?.mileId === mile.id && editingIdx.idx === idx ? (
                                              <div style={{ padding: "6px 0" }}>
                                                <Textarea
                                                  value={editText}
                                                  onChange={(e) => setEditText(e.target.value)}
                                                  className="border-none shadow-none focus-visible:ring-0 p-2"
                                                  style={{ background: "#F5F3EE", border: "1px solid #C9CED4", borderRadius: 6, minHeight: 60, fontSize: 12 }}
                                                />
                                                <div className="flex justify-end gap-1.5 mt-1.5">
                                                  <button onClick={() => setEditingIdx(null)} className="flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: "50%", background: "#E7EBEF" }}>
                                                    <X className="h-3 w-3" style={{ color: "#5F7285" }} />
                                                  </button>
                                                  <button onClick={() => handleEditSave(mile.id, mile.examples, idx)} className="flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: "50%", background: "#415162" }}>
                                                    <Check className="h-3 w-3" style={{ color: "#fff" }} />
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex items-start group" style={{ padding: "6px 0", gap: 6 }}>
                                                <span className="shrink-0" style={{ color: "#5E9E82" }}>•</span>
                                                <span className="flex-1" style={{ fontSize: 12, color: "#2D3748" }}>{ex}</span>
                                                {canEditMilestones && (
                                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    <button onClick={() => { setEditingIdx({ mileId: mile.id, idx }); setEditText(ex); }} className="flex items-center justify-center hover:opacity-70" style={{ width: 24, height: 24 }}>
                                                      <Pencil className="h-3 w-3" style={{ color: "#8A9AAB" }} />
                                                    </button>
                                                    <button onClick={() => handleDelete(mile.id, mile.examples, idx)} className="flex items-center justify-center hover:opacity-70" style={{ width: 24, height: 24 }}>
                                                      <Trash2 className="h-3 w-3" style={{ color: "#8A9AAB" }} />
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ))
                                      )}

                                      {/* Add textarea */}
                                      {addingFor === mile.id && (
                                        <div style={{ marginTop: 8 }}>
                                          <Textarea
                                            value={addText}
                                            onChange={(e) => setAddText(e.target.value)}
                                            placeholder="Describe a program-specific example of this milestone level..."
                                            className="border-none shadow-none focus-visible:ring-0 p-2"
                                            style={{ background: "#F5F3EE", border: "1px solid #C9CED4", borderRadius: 6, minHeight: 60, fontSize: 12 }}
                                          />
                                          <div className="flex justify-end gap-1.5 mt-1.5">
                                            <button onClick={() => setAddingFor(null)} className="flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: "50%", background: "#E7EBEF" }}>
                                              <X className="h-3 w-3" style={{ color: "#5F7285" }} />
                                            </button>
                                            <button onClick={() => handleAddSave(mile.id, mile.examples)} className="flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: "50%", background: "#415162" }}>
                                              <Check className="h-3 w-3" style={{ color: "#fff" }} />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MilestonesBrowser;
