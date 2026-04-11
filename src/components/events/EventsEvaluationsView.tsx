import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronUp, ClipboardCheck } from "lucide-react";
import type { ProgramEvent } from "@/hooks/useEvents";

interface EvaluationRow {
  id: string;
  event_id: string;
  evaluator_id: string;
  rating: string;
  rating_preparation: string | null;
  rating_presentation: string | null;
  rating_content: string | null;
  rating_overall: string | null;
  notes: string | null;
  created_at: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
  } | null;
}

const ratingColor: Record<string, string> = {
  blue: "#52657A",
  green: "#4A846C",
  yellow: "#D4A017",
};

const formatName = (p: EvaluationRow["profiles"]): string => {
  if (!p) return "Unknown";
  if (p.first_name && p.last_name) return `${p.first_name} ${p.last_name}`;
  return p.display_name || "Unknown";
};

const CRITERIA_LABELS: { key: keyof Pick<EvaluationRow, "rating_preparation" | "rating_presentation" | "rating_content" | "rating_overall">; label: string }[] = [
  { key: "rating_preparation", label: "Preparation" },
  { key: "rating_presentation", label: "Presentation" },
  { key: "rating_content", label: "Content" },
  { key: "rating_overall", label: "Overall" },
];

const EvaluationCard = ({
  event,
  evaluations,
}: {
  event: ProgramEvent;
  evaluations: EvaluationRow[];
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasEvals = evaluations.length > 0;

  // Aggregate counts per criteria
  const aggregateCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    CRITERIA_LABELS.forEach((c) => {
      counts[c.key] = { blue: 0, green: 0, yellow: 0 };
    });
    evaluations.forEach((e) => {
      CRITERIA_LABELS.forEach((c) => {
        const val = e[c.key];
        if (val && val in counts[c.key]) counts[c.key][val]++;
      });
    });
    return counts;
  }, [evaluations]);

  // Fallback to old single rating for legacy data
  const legacyCounts = useMemo(() => {
    const c = { blue: 0, green: 0, yellow: 0 };
    evaluations.forEach((e) => {
      if (e.rating in c) c[e.rating as keyof typeof c]++;
    });
    return c;
  }, [evaluations]);

  const hasNewRatings = evaluations.some((e) => e.rating_overall);

  const dateStr = (() => {
    try {
      return format(parseISO(event.event_date), "MMM d, yyyy");
    } catch {
      return event.event_date;
    }
  })();

  return (
    <div
      className="rounded-lg overflow-hidden mb-3 cursor-pointer"
      style={{ background: "#E7EBEF", border: "1px solid #C9CED4" }}
      onClick={() => hasEvals && setExpanded(!expanded)}
    >
      {/* Header */}
      <div style={{ padding: "12px 14px" }}>
        <div className="flex items-start justify-between gap-2">
          <span style={{ fontSize: 14, fontWeight: 500, color: "#2D3748" }}>
            {event.title}
          </span>
          <span
            className="shrink-0"
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "#185FA5",
              background: "#E6F1FB",
              padding: "2px 8px",
              borderRadius: 4,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Didactic
          </span>
        </div>

        <div style={{ fontSize: 11, color: "#8A9AAB", marginTop: 2 }}>
          {dateStr}
        </div>

        {/* Aggregate row */}
        <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            {hasNewRatings ? (
              // Show overall rating counts from new columns
              (["blue", "green", "yellow"] as const).map((r) => (
                <div key={r} className="flex items-center gap-1">
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: ratingColor[r],
                    }}
                  />
                  <span style={{ fontSize: 11, color: "#5F7285" }}>
                    {aggregateCounts.rating_overall[r]}
                  </span>
                </div>
              ))
            ) : (
              (["blue", "green", "yellow"] as const).map((r) => (
                <div key={r} className="flex items-center gap-1">
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: ratingColor[r],
                    }}
                  />
                  <span style={{ fontSize: 11, color: "#5F7285" }}>{legacyCounts[r]}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-1">
            <span style={{ fontSize: 11, color: "#8A9AAB", fontStyle: "italic" }}>
              {hasEvals ? `${evaluations.length} evaluation${evaluations.length !== 1 ? "s" : ""}` : "No evaluations yet"}
            </span>
            {hasEvals && (
              expanded ? (
                <ChevronUp className="h-3.5 w-3.5" style={{ color: "#8A9AAB" }} />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" style={{ color: "#8A9AAB" }} />
              )
            )}
          </div>
        </div>
      </div>

      {/* Individual evaluations */}
      {expanded && hasEvals && (
        <>
          <div style={{ borderTop: "1px solid #C9CED4" }} />
          <div style={{ padding: "0 14px 12px" }}>
            {evaluations.map((ev, i) => (
              <div key={ev.id}>
                {i > 0 && <div style={{ borderTop: "1px solid #D5DAE0" }} />}
                <div className="py-2.5" style={{ alignItems: "flex-start" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#2D3748", marginBottom: 4 }}>
                    {formatName(ev.profiles)}
                  </div>
                  {ev.rating_overall ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ marginBottom: ev.notes ? 4 : 0 }}>
                      {CRITERIA_LABELS.map((c) => {
                        const val = ev[c.key];
                        return val ? (
                          <div key={c.key} className="flex items-center gap-1">
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: ratingColor[val] || "#8A9AAB",
                              }}
                            />
                            <span style={{ fontSize: 11, color: "#5F7285" }}>{c.label}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1" style={{ marginBottom: ev.notes ? 4 : 0 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: ratingColor[ev.rating] || "#8A9AAB",
                        }}
                      />
                      <span style={{ fontSize: 11, color: "#5F7285" }}>Overall</span>
                    </div>
                  )}
                  {ev.notes && (
                    <div
                      style={{ fontSize: 12, color: "#5F7285", lineHeight: 1.4 }}
                      dangerouslySetInnerHTML={{ __html: ev.notes }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const EventsEvaluationsView = ({ events }: { events: ProgramEvent[] }) => {
  const { data: evaluations, isLoading } = useQuery({
    queryKey: ["event-evaluations-all"],
    queryFn: async () => {
      const { data: evals } = await supabase
        .from("event_evaluations")
        .select("*")
        .order("created_at", { ascending: false });
      if (!evals || evals.length === 0) return [] as EvaluationRow[];

      const evaluatorIds = [...new Set(evals.map((e) => e.evaluator_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, display_name")
        .in("id", evaluatorIds);

      const profileMap: Record<string, EvaluationRow["profiles"]> = {};
      (profiles || []).forEach((p) => {
        profileMap[p.id] = { first_name: p.first_name, last_name: p.last_name, display_name: p.display_name };
      });

      return evals.map((e) => ({
        ...e,
        rating_preparation: (e as any).rating_preparation || null,
        rating_presentation: (e as any).rating_presentation || null,
        rating_content: (e as any).rating_content || null,
        rating_overall: (e as any).rating_overall || null,
        profiles: profileMap[e.evaluator_id] || null,
      })) as EvaluationRow[];
    },
  });

  const didacticEvents = useMemo(() => {
    return events
      .filter((e) => e.category === "didactic")
      .sort((a, b) => b.event_date.localeCompare(a.event_date));
  }, [events]);

  const evalsByEvent = useMemo(() => {
    const map: Record<string, EvaluationRow[]> = {};
    (evaluations || []).forEach((ev) => {
      if (!map[ev.event_id]) map[ev.event_id] = [];
      map[ev.event_id].push(ev);
    });
    return map;
  }, [evaluations]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (didacticEvents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No didactic events</p>
      </div>
    );
  }

  return (
    <div>
      {didacticEvents.map((event) => (
        <EvaluationCard
          key={event.id}
          event={event}
          evaluations={evalsByEvent[event.id] || []}
        />
      ))}
    </div>
  );
};

export default EventsEvaluationsView;
