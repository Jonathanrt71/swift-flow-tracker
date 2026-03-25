import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useACGMECompetencies } from "@/hooks/useACGMECompetencies";

const MilestonesBrowser = () => {
  const { data: categories } = useACGMECompetencies();
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [expandedMileId, setExpandedMileId] = useState<string | null>(null);

  const cats = categories || [];

  return (
    <div className="flex flex-col gap-1">
      {cats.map((cat) => {
        const isCatExpanded = expandedCatId === cat.id;
        return (
          <div key={cat.id}>
            {/* Category row */}
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

            {/* Subcategories */}
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

                      {/* Milestones */}
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
                                <button
                                  onClick={() =>
                                    setExpandedMileId(isMileExpanded ? null : mile.id)
                                  }
                                  className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-left"
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

                                  <span
                                    className="flex-1 min-w-0"
                                    style={{ fontSize: 12, color: "#2D3748" }}
                                  >
                                    {mile.summary || `Level ${mile.level}`}
                                  </span>

                                  <ChevronDown
                                    className="h-3.5 w-3.5 shrink-0 transition-transform"
                                    style={{
                                      color: "#8A9AAB",
                                      transform: isMileExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                    }}
                                  />
                                </button>

                                {isMileExpanded && (
                                  <div
                                    style={{
                                      background: "#fff",
                                      border: "0.5px solid #C9CED4",
                                      borderLeft: `2px solid ${cat.color}`,
                                      borderRadius: 8,
                                      padding: "10px 14px",
                                      margin: "4px 12px 10px 32px",
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
