import { useState } from "react";
import { ChevronDown, ChevronUp, X, Sparkles, Loader2 } from "lucide-react";
import { useACGMECompetencies, type ACGMECategory, type ACGMEMilestone } from "@/hooks/useACGMECompetencies";
import { useCompetencySuggestion, type CompetencySuggestion } from "@/hooks/useCompetencySuggestion";

export interface CompetencySelection {
  categoryId: string | null;
  subcategoryId: string | null;
  milestoneId: string | null;
  label: string;
  color: string;
}

interface CompetencySelectorProps {
  value: CompetencySelection | null;
  onChange: (value: CompetencySelection | null) => void;
  commentText?: string;
  sentiment?: "positive" | "negative";
}

export function buildSelectionFromFeedback(
  categories: ACGMECategory[],
  categoryId: string | null,
  subcategoryId: string | null,
  milestoneId: string | null,
): CompetencySelection | null {
  if (!categoryId) return null;
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return null;

  let label = cat.code;
  if (subcategoryId) {
    const sub = cat.subcategories.find((s) => s.id === subcategoryId);
    if (sub) {
      label += ` > ${sub.code}`;
      if (milestoneId) {
        const mile = sub.milestones.find((m) => m.id === milestoneId);
        if (mile) label += ` > Level ${mile.level}`;
      }
    }
  }

  return { categoryId, subcategoryId, milestoneId, label, color: cat.color };
}

function matchSuggestion(
  suggestion: CompetencySuggestion,
  categories: ACGMECategory[],
): CompetencySelection | null {
  for (const cat of categories) {
    const sub = cat.subcategories.find((s) => s.code === suggestion.subcategoryCode);
    if (sub) {
      const milestone = sub.milestones.find((m) => m.level === suggestion.level);
      return {
        categoryId: cat.id,
        subcategoryId: sub.id,
        milestoneId: milestone?.id || null,
        label: milestone
          ? `${cat.code} > ${sub.code} > Level ${suggestion.level}`
          : `${cat.code} > ${sub.code}`,
        color: cat.color,
      };
    }
  }
  return null;
}

function getCategoryColorForSuggestion(
  suggestion: CompetencySuggestion,
  categories: ACGMECategory[],
): string {
  for (const cat of categories) {
    if (cat.subcategories.some((s) => s.code === suggestion.subcategoryCode)) {
      return cat.color;
    }
  }
  return "#8A9AAB";
}

function splitIntoBullets(description: string): string[] {
  return description
    .split(". ")
    .map((s) => s.replace(/\.+$/, "").trim())
    .filter((s) => s.length > 0);
}

/** Expandable milestone description shown as bullet points */
function MilestoneDescription({ milestone }: { milestone: ACGMEMilestone }) {
  const bullets = splitIntoBullets(milestone.description);
  return (
    <div style={{ paddingLeft: 56, paddingRight: 12, paddingBottom: 6 }}>
      {bullets.map((b, i) => (
        <div
          key={i}
          className="flex items-start"
          style={{ fontSize: 11, color: "#5F7285", lineHeight: 1.7, gap: 6 }}
        >
          <span className="shrink-0">•</span>
          <span>{b}</span>
        </div>
      ))}
    </div>
  );
}

const CompetencySelector = ({ value, onChange, commentText, sentiment }: CompetencySelectorProps) => {
  const { data: categories } = useACGMECompetencies();
  const { suggestions, loading, suggest, clearSuggestions } = useCompetencySuggestion();
  const [activeCatId, setActiveCatId] = useState<string | null>(value?.categoryId ?? null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [expandedMileId, setExpandedMileId] = useState<string | null>(null);
  const [autoActive, setAutoActive] = useState(false);

  const cats = categories || [];

  const select = (sel: CompetencySelection) => {
    onChange(sel);
    setExpandedSubId(null);
    setExpandedMileId(null);
  };

  const clear = () => {
    onChange(null);
    setActiveCatId(null);
    setExpandedSubId(null);
    setExpandedMileId(null);
    clearSuggestions();
    setAutoActive(false);
  };

  const handlePillTap = (cat: ACGMECategory) => {
    clearSuggestions();
    setAutoActive(false);

    if (activeCatId === cat.id) {
      setActiveCatId(null);
      setExpandedSubId(null);
      setExpandedMileId(null);
    } else {
      setActiveCatId(cat.id);
      setExpandedSubId(null);
      setExpandedMileId(null);
      onChange({
        categoryId: cat.id,
        subcategoryId: null,
        milestoneId: null,
        label: cat.code,
        color: cat.color,
      });
    }
  };

  const handleAutoTap = () => {
    if (autoActive && suggestions.length > 0) {
      clearSuggestions();
      setAutoActive(false);
      return;
    }
    if (loading) return;

    onChange(null);
    setActiveCatId(null);
    setExpandedSubId(null);
    setExpandedMileId(null);
    setAutoActive(true);
    suggest(commentText || "", sentiment);
  };

  const handleSuggestionTap = (suggestion: CompetencySuggestion) => {
    const sel = matchSuggestion(suggestion, cats);
    if (sel) {
      onChange(sel);
      setActiveCatId(null);
      setExpandedSubId(null);
      setExpandedMileId(null);
    }
    clearSuggestions();
    setAutoActive(false);
  };

  const activeCat = cats.find((c) => c.id === activeCatId);
  const showSuggestions = autoActive && suggestions.length > 0;

  return (
    <div className="mb-4">
      {/* Pills row: Auto + Category pills */}
      <div className="flex flex-wrap gap-1.5">
        {/* Auto pill */}
        <button
          type="button"
          onClick={handleAutoTap}
          disabled={loading}
          className="rounded-full transition-colors flex items-center gap-1"
          style={{
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 500,
            background: autoActive || loading ? "#415162" : "#E7EBEF",
            color: autoActive || loading ? "white" : "#5F7285",
          }}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Auto
        </button>

        {/* Category pills */}
        {cats.map((cat) => {
          const isActive = activeCatId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handlePillTap(cat)}
              className="rounded-full transition-colors"
              style={{
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 500,
                background: isActive ? cat.color : "#E7EBEF",
                color: isActive ? "white" : "#5F7285",
              }}
            >
              {cat.code}
            </button>
          );
        })}
      </div>

      {/* Selection breadcrumb pill */}
      {value && (
        <div className="mt-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1"
            style={{ background: "#E7EBEF" }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: value.color }}
            />
            <span style={{ fontSize: 12, color: "#2D3748" }}>{value.label}</span>
            <button
              type="button"
              onClick={clear}
              className="p-0.5 shrink-0"
            >
              <X className="h-3 w-3" style={{ color: "#8A9AAB" }} />
            </button>
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {showSuggestions && (
        <div className="mt-2 flex flex-col gap-2">
          {suggestions.map((s, idx) => {
            const catColor = getCategoryColorForSuggestion(s, cats);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestionTap(s)}
                className="text-left rounded-lg px-3 py-2"
                style={{
                  background: "#E7EBEF",
                  border: "1px dashed #C9CED4",
                  borderLeft: `2px solid ${catColor}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500, color: "#2D3748" }}>
                  {s.subcategoryCode} &gt; Level {s.level}
                </div>
                <div style={{ fontSize: 11, color: "#8A9AAB" }}>
                  {s.reason}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Subcompetencies */}
      {activeCat && activeCat.subcategories.length > 0 && (
        <div
          className="mt-2 rounded-lg overflow-hidden"
          style={{ border: "0.5px solid #C9CED4" }}
        >
          {activeCat.subcategories.map((sub) => {
            const isSubExpanded = expandedSubId === sub.id;
            return (
              <div key={sub.id}>
                <button
                  type="button"
                  onClick={() => {
                    setExpandedSubId(isSubExpanded ? null : sub.id);
                    setExpandedMileId(null);
                    onChange({
                      categoryId: activeCat.id,
                      subcategoryId: sub.id,
                      milestoneId: null,
                      label: `${activeCat.code} > ${sub.code}`,
                      color: activeCat.color,
                    });
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                  style={{
                    background: isSubExpanded ? "#EEF0F2" : "transparent",
                  }}
                >
                  <span
                    className="shrink-0"
                    style={{ fontSize: 12, fontWeight: 500, color: "#415162", minWidth: 40 }}
                  >
                    {sub.code}
                  </span>
                  <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, color: "#2D3748" }}>
                    {sub.name}
                  </span>
                  {isSubExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0" style={{ color: "#8A9AAB" }} />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: "#8A9AAB" }} />
                  )}
                </button>

                {isSubExpanded && (
                  <div style={{ background: "#EEF0F2" }}>
                    {sub.milestones.map((mile) => {
                      const isMileExpanded = expandedMileId === mile.id;
                      const displayLabel = mile.summary || `Level ${mile.level}`;
                      return (
                        <div key={mile.id}>
                          <div
                            className="w-full flex items-center gap-2"
                            style={{
                              paddingLeft: 64,
                              paddingRight: 12,
                              borderTop: "0.5px solid #E7EBEF",
                              paddingTop: 8,
                              paddingBottom: isMileExpanded ? 4 : 8,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                select({
                                  categoryId: activeCat.id,
                                  subcategoryId: sub.id,
                                  milestoneId: mile.id,
                                  label: `${activeCat.code} > ${sub.code} > Level ${mile.level}`,
                                  color: activeCat.color,
                                })
                              }
                              className="flex items-start gap-2 flex-1 min-w-0 text-left"
                            >
                              <span
                                className="shrink-0"
                                style={{ fontSize: 12, fontWeight: 500, color: "#415162" }}
                              >
                                {mile.level}
                              </span>
                              <span
                                className="min-w-0"
                                style={{ fontSize: 12, color: "#5F7285" }}
                              >
                                {displayLabel}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedMileId(isMileExpanded ? null : mile.id);
                              }}
                              className="p-0.5 shrink-0"
                            >
                              {isMileExpanded ? (
                                <ChevronUp className="h-3 w-3" style={{ color: "#8A9AAB" }} />
                              ) : (
                                <ChevronDown className="h-3 w-3" style={{ color: "#8A9AAB" }} />
                              )}
                            </button>
                          </div>
                          {isMileExpanded && <MilestoneDescription milestone={mile} />}
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
};

export default CompetencySelector;
