import { useState, useRef, useEffect, useMemo } from "react";
import { format, parseISO, getDaysInMonth } from "date-fns";
import type { ProgramEvent } from "@/hooks/useEvents";
import { useIsMobile } from "@/hooks/use-mobile";

interface EventsTimelineProps {
  events: ProgramEvent[];
}

const MONTH_ABBRS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface TimelineRow {
  title: string;
  occurrences: { startDate: Date; endDate: Date }[];
  isMultiDay: boolean;
  earliestStart: Date;
}

const EventsTimeline = ({ events }: EventsTimelineProps) => {
  const isMobile = useIsMobile();
  const labelWidth = isMobile ? 70 : 130;
  const rowHeight = isMobile ? 34 : 40;
  const dotSize = isMobile ? 8 : 9;
  const monthCount = 12;
  const now = new Date();
  const startMonth = 6; // July — academic year start
  const startYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();

  const [tooltip, setTooltip] = useState<{ title: string; dateStr: string; x: number; y: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build months array
  const months = useMemo(() => {
    const result: { month: number; year: number; days: number; label: string }[] = [];
    for (let i = 0; i < monthCount; i++) {
      const m = (startMonth + i) % 12;
      const y = startYear + Math.floor((startMonth + i) / 12);
      result.push({ month: m, year: y, days: getDaysInMonth(new Date(y, m)), label: MONTH_ABBRS[m] });
    }
    return result;
  }, [startMonth, startYear, monthCount]);

  // Group events by title
  const rows = useMemo(() => {
    const map = new Map<string, { startDate: Date; endDate: Date }[]>();
    events.forEach((ev) => {
      const start = parseISO(ev.event_date);
      const end = ev.end_date && ev.end_date !== ev.event_date ? parseISO(ev.end_date) : start;
      const arr = map.get(ev.title) || [];
      arr.push({ startDate: start, endDate: end });
      map.set(ev.title, arr);
    });

    const rows: TimelineRow[] = [];
    map.forEach((occurrences, title) => {
      const isMultiDay = occurrences.some((o) => o.startDate.getTime() !== o.endDate.getTime());
      const earliestStart = occurrences.reduce((a, b) => (a.startDate < b.startDate ? a : b)).startDate;
      rows.push({ title, occurrences, isMultiDay, earliestStart });
    });

    // Sort: multi-day first by earliest start, then dots by earliest
    rows.sort((a, b) => {
      if (a.isMultiDay && !b.isMultiDay) return -1;
      if (!a.isMultiDay && b.isMultiDay) return 1;
      return a.earliestStart.getTime() - b.earliestStart.getTime();
    });

    return rows;
  }, [events]);

  useEffect(() => {
    return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
  }, []);

  const showTooltip = (title: string, dateStr: string, el: HTMLElement) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    const rect = el.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setTooltip({
      title,
      dateStr,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
    });
    tooltipTimer.current = setTimeout(() => setTooltip(null), 2000);
  };

  const dismissTooltip = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip(null);
  };

  // Calculate position of a date within the months grid
  const getPosition = (date: Date): number | null => {
    for (let i = 0; i < months.length; i++) {
      const m = months[i];
      if (date.getFullYear() === m.year && date.getMonth() === m.month) {
        const dayFrac = (date.getDate() - 1) / m.days;
        return (i + dayFrac) / months.length;
      }
    }
    return null;
  };

  const formatOccurrenceDate = (o: { startDate: Date; endDate: Date }) => {
    if (o.startDate.getTime() === o.endDate.getTime()) {
      return format(o.startDate, "MMM d");
    }
    if (o.startDate.getMonth() === o.endDate.getMonth()) {
      return `${format(o.startDate, "MMM d")} – ${format(o.endDate, "d")}`;
    }
    return `${format(o.startDate, "MMM d")} – ${format(o.endDate, "MMM d")}`;
  };

  const truncateLabel = (s: string) => s.length > 16 ? s.slice(0, 15) + "…" : s;

  return (
    <div ref={containerRef} className="relative select-none" onClick={dismissTooltip}>
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 px-3 py-2 rounded-lg text-white text-xs pointer-events-none"
          style={{
            background: "#415162",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
            whiteSpace: "nowrap",
          }}
        >
          <div className="font-semibold">{tooltip.title}</div>
          <div>{tooltip.dateStr}</div>
        </div>
      )}

      {/* Scrollable area */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: isMobile ? 900 : undefined }}>
          {/* Month headers */}
          <div className="flex" style={{ borderBottom: "1px solid #E7EBEF" }}>
            <div className="shrink-0" style={{ width: labelWidth }} />
            <div className="flex flex-1">
              {months.map((m, i) => (
                <div
                  key={`${m.year}-${m.month}`}
                  className="flex-1 text-center py-2"
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#8A9AAB",
                    borderLeft: i > 0 ? "1px solid #C9CED4" : undefined,
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Event rows */}
          {rows.length === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: "#8A9AAB" }}>
              No program events in this period
            </div>
          )}
          {rows.map((row, rowIdx) => (
            <div
              key={row.title}
              className="flex items-center"
              style={{
                minHeight: rowHeight,
                background: rowIdx % 2 === 1 ? "#F0EEE8" : "transparent",
                borderBottom: "0.5px solid #E7EBEF",
              }}
            >
              {/* Label */}
              <div
                className="shrink-0 px-2 sticky left-0 z-10"
                style={{
                  width: labelWidth,
                  fontSize: isMobile ? 11 : 13,
                  fontWeight: 500,
                  color: "#2D3748",
                  background: rowIdx % 2 === 1 ? "#F0EEE8" : "var(--background, #fff)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={row.title}
              >
                {truncateLabel(row.title)}
              </div>

              {/* Track */}
              <div className="flex-1 relative" style={{ height: rowHeight }}>
                {/* Month separators */}
                {months.map((m, i) =>
                  i > 0 ? (
                    <div
                      key={`sep-${i}`}
                      className="absolute top-0 bottom-0"
                      style={{ left: `${(i / months.length) * 100}%`, width: 1, background: "#C9CED4", opacity: 0.4 }}
                    />
                  ) : null
                )}

                {/* Dots and bars */}
                {row.occurrences.map((o, oi) => {
                  const startPos = getPosition(o.startDate);
                  if (startPos === null) return null;

                  const isSingleDay = o.startDate.getTime() === o.endDate.getTime();

                  if (isSingleDay) {
                    return (
                      <div
                        key={oi}
                        className="absolute rounded-full cursor-pointer"
                        style={{
                          width: dotSize,
                          height: dotSize,
                          background: "#378ADD",
                          left: `${startPos * 100}%`,
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          showTooltip(row.title, formatOccurrenceDate(o), e.currentTarget);
                        }}
                      />
                    );
                  }

                  const endPos = getPosition(o.endDate);
                  if (endPos === null) return null;
                  const widthPct = Math.max((endPos - startPos) * 100, 0.5);

                  return (
                    <div
                      key={oi}
                      className="absolute cursor-pointer"
                      style={{
                        height: dotSize,
                        borderRadius: dotSize / 2,
                        background: "#378ADD",
                        left: `${startPos * 100}%`,
                        width: `${widthPct}%`,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        showTooltip(row.title, formatOccurrenceDate(o), e.currentTarget);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventsTimeline;
