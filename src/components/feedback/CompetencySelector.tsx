import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useACGMECompetencies, type ACGMECategory } from "@/hooks/useACGMECompetencies";

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

const CompetencySelector = ({ value, onChange }: CompetencySelectorProps) => {
  const { data: categories } = useACGMECompetencies();
  const [activeCatId, setActiveCatId] = useState<string | null>(value?.categoryId ?? null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  const cats = categories || [];

  const select = (sel: CompetencySelection) => {
    onChange(sel);
    setExpandedSubId(null);
    // Keep activeCatId so pill stays highlighted
  };

  const clear = () => {
    onChange(null);
    setActiveCatId(null);
    setExpandedSubId(null);
  };

  const handlePillTap = (cat: ACGMECategory) => {
    if (activeCatId === cat.id) {
      // Deactivate
      setActiveCatId(null);
      setExpandedSubId(null);
      // If current selection belongs to this category, keep it
    } else {
      setActiveCatId(cat.id);
      setExpandedSubId(null);
      // Set category-level selection (user can drill deeper)
      onChange({
        categoryId: cat.id,
        subcategoryId: null,
        milestoneId: null,
        label: cat.code,
        color: cat.color,
      });
    }
  };

  const activeCat = cats.find((c) => c.id === activeCatId);

  return (
    <div className="mb-4">
      {/* Category pills - always visible */}
      <div className="flex flex-wrap gap-1.5">
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
                  onClick={() => setExpandedSubId(isSubExpanded ? null : sub.id)}
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
                    {/* Select without level */}
                    <button
                      type="button"
                      onClick={() =>
                        select({
                          categoryId: activeCat.id,
                          subcategoryId: sub.id,
                          milestoneId: null,
                          label: `${activeCat.code} > ${sub.code}`,
                          color: activeCat.color,
                        })
                      }
                      className="text-xs px-3 py-2 block"
                      style={{ color: activeCat.color, paddingLeft: 64 }}
                    >
                      Select "{sub.code}" without level
                    </button>

                    {/* Milestone levels */}
                    {sub.milestones.map((mile, idx) => (
                      <button
                        key={mile.id}
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
                        className="w-full flex items-start gap-2 text-left py-2"
                        style={{
                          paddingLeft: 64,
                          paddingRight: 12,
                          borderTop: "0.5px solid #E7EBEF",
                        }}
                      >
                        <span
                          className="shrink-0"
                          style={{ fontSize: 12, fontWeight: 500, color: "#415162" }}
                        >
                          {mile.level}
                        </span>
                        <span style={{ fontSize: 12, color: "#5F7285" }}>
                          {mile.description}
                        </span>
                      </button>
                    ))}
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
