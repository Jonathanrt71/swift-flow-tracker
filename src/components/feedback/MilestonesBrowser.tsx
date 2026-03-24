import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useACGMECompetencies } from "@/hooks/useACGMECompetencies";

const MilestonesBrowser = () => {
  const { data: categories } = useACGMECompetencies();
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [expandedMileId, setExpandedMileId] = useState<string | null>(null);

  const cats = categories || [];
  const selectedCat = cats.find((c) => c.id === selectedCatId);

  return (
    <div>
      {/* Category pills */}
      <div className="flex gap-1.5 mb-3">
        {cats.map((cat) => {
          const isActive = selectedCatId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCatId(isActive ? null : cat.id);
                setExpandedSubId(null);
                setExpandedMileId(null);
              }}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: isActive ? "#E7EBEF" : "#EEF0F2",
                border: isActive ? `1.5px solid ${cat.color}` : "1px solid #C9CED4",
                color: isActive ? "#2D3748" : "#5F7285",
              }}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: cat.color }}
              />
              {cat.code}
            </button>
          );
        })}
      </div>

      {/* Subcategories accordion */}
      {selectedCat && (
        <div className="flex flex-col gap-1">
          {selectedCat.subcategories.map((sub) => {
            const isSubExpanded = expandedSubId === sub.id;
            return (
              <div key={sub.id}>
                <button
                  onClick={() => {
                    setExpandedSubId(isSubExpanded ? null : sub.id);
                    setExpandedMileId(null);
                  }}
                  className="w-full flex items-center gap-2 rounded-md px-3 py-2.5 text-left"
                  style={{ background: "#EEF0F2", border: "0.5px solid #C9CED4" }}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: selectedCat.color }}
                  />
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

                      return (
                        <div key={mile.id}>
                          <div
                            className="flex items-center gap-2.5 rounded-md px-3 py-2"
                            style={{ background: "#F5F3EE" }}
                          >
                            {/* Level circle */}
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

                            {/* Summary */}
                            <span
                              className="flex-1 min-w-0"
                              style={{ fontSize: 12, color: "#2D3748" }}
                            >
                              {mile.summary || `Level ${mile.level}`}
                            </span>

                            {/* Expand chevron */}
                            <button
                              onClick={() =>
                                setExpandedMileId(isMileExpanded ? null : mile.id)
                              }
                              className="p-0.5 shrink-0"
                            >
                              <ChevronDown
                                className="h-3.5 w-3.5 transition-transform"
                                style={{
                                  color: "#8A9AAB",
                                  transform: isMileExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                }}
                              />
                            </button>
                          </div>

                          {/* Expanded description bullets */}
                          {isMileExpanded && (
                            <div style={{ paddingLeft: 56 }} className="py-1.5">
                              {bullets.map((b, i) => (
                                <div
                                  key={i}
                                  style={{
                                    fontSize: 11,
                                    color: "#5F7285",
                                    lineHeight: 1.7,
                                  }}
                                >
                                  • {b}
                                </div>
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
          })}
        </div>
      )}
    </div>
  );
};

export default MilestonesBrowser;
