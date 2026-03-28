import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import type { ProgramEvent } from "@/hooks/useEvents";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_COLORS } from "@/hooks/useEvents";
import type { EventCategory } from "@/hooks/useEvents";

interface EventsVerticalTimelineProps {
  events: ProgramEvent[];
}

const formatTime = (t: string | null): string => {
  if (!t) return "";
  try {
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    const ampm = hr >= 12 ? "PM" : "AM";
    const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
    return `${hr12}:${m} ${ampm}`;
  } catch {
    return t;
  }
};

const EventsVerticalTimeline = ({ events }: EventsVerticalTimelineProps) => {
  const grouped = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );

    const groups: { month: string; items: ProgramEvent[] }[] = [];
    sorted.forEach((ev) => {
      try {
        const m = format(parseISO(ev.event_date), "MMMM yyyy");
        const last = groups[groups.length - 1];
        if (last && last.month === m) {
          last.items.push(ev);
        } else {
          groups.push({ month: m, items: [ev] });
        }
      } catch {
        const last = groups[groups.length - 1];
        if (last && last.month === "Other") {
          last.items.push(ev);
        } else {
          groups.push({ month: "Other", items: [ev] });
        }
      }
    });
    return groups;
  }, [events]);

  const getTimeLabel = (ev: ProgramEvent) => {
    if (ev.end_date && ev.end_date !== ev.event_date) {
      const start = parseISO(ev.event_date);
      const end = parseISO(ev.end_date);
      const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
      const startStr = format(start, "MMM d");
      const endStr = sameMonth ? format(end, "d") : format(end, "MMM d");
      return `${startStr} – ${endStr}`;
    }
    if (ev.start_time) {
      const start = formatTime(ev.start_time);
      const end = ev.end_time ? formatTime(ev.end_time) : null;
      return end ? `${start} — ${end}` : start;
    }
    return null;
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: "#8A9AAB" }}>
        <p className="text-sm">No events</p>
      </div>
    );
  }

  // Flatten for rendering with last-in-group tracking
  const allItems = grouped.flatMap((g) => g.items);

  return (
    <div>
      {grouped.map((g) => (
        <div key={g.month}>
          <div
            className="uppercase tracking-wide py-3"
            style={{ fontSize: 11, fontWeight: 600, color: "#8A9AAB" }}
          >
            {g.month}
          </div>
          {g.items.map((ev, idx) => {
            const isLast =
              idx === g.items.length - 1 &&
              g === grouped[grouped.length - 1];
            const dotColor = EVENT_CATEGORY_COLORS[ev.category as EventCategory] || "#415162";
            const timeLabel = getTimeLabel(ev);
            const catLabel = EVENT_CATEGORY_LABELS[ev.category as EventCategory] || ev.category;

            let dayNum = "";
            let dayOfWeek = "";
            try {
              const d = parseISO(ev.event_date);
              dayNum = format(d, "d");
              dayOfWeek = format(d, "EEE");
            } catch {}

            return (
              <div key={ev.id} className="flex gap-3">
                {/* Date column */}
                <div
                  className="shrink-0 text-right flex flex-col items-end justify-start pt-0.5"
                  style={{ width: 44 }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#2D3748" }}>
                    {dayNum}
                  </span>
                  <span style={{ fontSize: 11, color: "#8A9AAB" }}>{dayOfWeek}</span>
                </div>

                {/* Track column */}
                <div
                  className="shrink-0 flex flex-col items-center"
                  style={{ width: 20 }}
                >
                  <div
                    className="rounded-full shrink-0"
                    style={{ width: 10, height: 10, background: dotColor, marginTop: 4 }}
                  />
                  {!isLast && (
                    <div
                      className="flex-1 mt-1"
                      style={{ width: 1.5, background: "#C9CED4" }}
                    />
                  )}
                </div>

                {/* Content column */}
                <div className="flex-1 min-w-0 pb-3">
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#2D3748" }}>
                    {ev.title}
                  </div>
                  {timeLabel && (
                    <div className="mt-0.5" style={{ fontSize: 11, color: "#8A9AAB" }}>
                      {timeLabel}
                    </div>
                  )}
                  <span
                    className="inline-block rounded-full mt-1"
                    style={{
                      fontSize: 11,
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingTop: 2,
                      paddingBottom: 2,
                      background: dotColor + "22",
                      color: dotColor,
                    }}
                  >
                    {catLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default EventsVerticalTimeline;
