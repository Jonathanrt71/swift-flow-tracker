import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { format, parseISO, getDaysInMonth } from "date-fns";
import type { ProgramEvent } from "@/hooks/useEvents";
import { useIsMobile } from "@/hooks/use-mobile";

interface EventsGanttProps {
  events: ProgramEvent[];
}

const MONTH_ABBRS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface TimelineRow {
  title: string;
  occurrences: { startDate: Date; endDate: Date }[];
  isMultiDay: boolean;
  earliestStart: Date;
}

const EventsGantt = ({ events }: EventsGanttProps) => {
  const isMobile = useIsMobile();
  const labelWidth = isMobile ? 70 : 130;
  const rowHeight = isMobile ? 34 : 40;
  const dotSize = isMobile ? 8 : 9;
  const now = new Date();

  const [tooltip, setTooltip] = useState<{ title: string; dateStr: string; x: number; y: number } | null>(null);
  const [floatingMonth, setFloatingMonth] = useState<string>("");
  const [showFloating, setShowFloating] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // Build rows from ALL events (no date filter)
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

    // Sort by earliest upcoming occurrence, then by earliest start
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    rows.sort((a, b) => {
      const nextA = a.occurrences
        .filter(o => o.endDate >= today)
        .sort((x, y) => x.startDate.getTime() - y.startDate.getTime())[0];
      const nextB = b.occurrences
        .filter(o => o.endDate >= today)
        .sort((x, y) => x.startDate.getTime() - y.startDate.getTime())[0];

      if (nextA && !nextB) return -1;
      if (!nextA && nextB) return 1;
      if (nextA && nextB) {
        return nextA.startDate.getTime() - nextB.startDate.getTime();
      }
      return a.earliestStart.getTime() - b.earliestStart.getTime();
    });

    return rows;
  }, [events]);

  // Compute month range from earliest event to latest event
  const months = useMemo(() => {
    if (rows.length === 0) {
      // Fallback: current month + 12 forward
      const result: { month: number; year: number; days: number; label: string; isCurrent: boolean }[] = [];
      for (let i = 0; i < 13; i++) {
        const m = (now.getMonth() + i) % 12;
        const y = now.getFullYear() + Math.floor((now.getMonth() + i) / 12);
        const isCurrent = m === now.getMonth() && y === now.getFullYear();
        result.push({ month: m, year: y, days: getDaysInMonth(new Date(y, m)), label: MONTH_ABBRS[m], isCurrent });
      }
      return result;
    }

    // Find earliest start and latest end across all occurrences
    let earliest = new Date(9999, 0);
    let latest = new Date(0);
    rows.forEach(row => {
      row.occurrences.forEach(o => {
        if (o.startDate < earliest) earliest = o.startDate;
        if (o.endDate > latest) latest = o.endDate;
      });
    });

    // Start one month before earliest, end one month after latest
    let startM = earliest.getMonth() - 1;
    let startY = earliest.getFullYear();
    if (startM < 0) { startM = 11; startY--; }

    let endM = latest.getMonth() + 1;
    let endY = latest.getFullYear();
    if (endM > 11) { endM = 0; endY++; }

    const result: { month: number; year: number; days: number; label: string; isCurrent: boolean }[] = [];
    let cm = startM;
    let cy = startY;
    while (cy < endY || (cy === endY && cm <= endM)) {
      const isCurrent = cm === now.getMonth() && cy === now.getFullYear();
      result.push({ month: cm, year: cy, days: getDaysInMonth(new Date(cy, cm)), label: MONTH_ABBRS[cm], isCurrent });
      cm++;
      if (cm > 11) { cm = 0; cy++; }
    }

    return result;
  }, [rows]);

  const monthCount = months.length;

  // Find current month index for auto-scroll
  const currentMonthIdx = useMemo(() => {
    return months.findIndex(m => m.month === now.getMonth() && m.year === now.getFullYear());
  }, [months]);

  const todayPosition = useMemo(() => {
    for (let i = 0; i < months.length; i++) {
      const m = months[i];
      if (now.getFullYear() === m.year && now.getMonth() === m.month) {
        const dayFrac = (now.getDate() - 1) / m.days;
        return (i + dayFrac) / months.length;
      }
    }
    return null;
  }, [months]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollLeft = el.scrollLeft;
    const scrollWidth = el.scrollWidth;
    const centerOffset = scrollLeft + el.clientWidth / 2 - labelWidth;
    const timelineWidth = scrollWidth - labelWidth;
    const centerFrac = Math.max(0, centerOffset / timelineWidth);
    const monthIdx = Math.min(Math.floor(centerFrac * monthCount), months.length - 1);

    if (monthIdx >= 0 && monthIdx < months.length) {
      const m = months[monthIdx];
      setFloatingMonth(`${MONTH_ABBRS[m.month]} ${m.year}`);
      setShowFloating(true);
      if (floatingTimer.current) clearTimeout(floatingTimer.current);
      floatingTimer.current = setTimeout(() => setShowFloating(false), 1500);
    }
  }, [months, labelWidth, monthCount]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Auto-scroll to current month on mount
  useEffect(() => {
    if (hasScrolledRef.current || currentMonthIdx < 0) return;
    const el = scrollRef.current;
    if (!el) return;

    // Wait a frame for layout
    requestAnimationFrame(() => {
      const timelineWidth = el.scrollWidth - labelWidth;
      const monthFrac = currentMonthIdx / monthCount;
      const targetScroll = monthFrac * timelineWidth;
      el.scrollLeft = Math.max(0, targetScroll);
      hasScrolledRef.current = true;
    });
  }, [currentMonthIdx, monthCount, labelWidth]);

  useEffect(() => {
    return () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      if (floatingTimer.current) clearTimeout(floatingTimer.current);
    };
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
      return format(o.startDate, "MMM d, yyyy");
    }
    if (o.startDate.getFullYear() === o.endDate.getFullYear() && o.startDate.getMonth() === o.endDate.getMonth()) {
      return `${format(o.startDate, "MMM d")} – ${format(o.endDate, "d, yyyy")}`;
    }
    return `${format(o.startDate, "MMM d, yyyy")} – ${format(o.endDate, "MMM d, yyyy")}`;
  };

  const truncateLabel = (s: string) => s.length > 16 ? s.slice(0, 15) + "\u2026" : s;

  return (
    <div ref={containerRef} className="relative select-none" onClick={dismissTooltip}>
      {/* Floating month label */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 12,
          background: "#415162",
          color: "#fff",
          padding: "4px 10px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          zIndex: 20,
          pointerEvents: "none",
          opacity: showFloating ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      >
        {floatingMonth}
      </div>

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
          <div style={{ opacity: 0.7, fontSize: 11 }}>{tooltip.dateStr}</div>
        </div>
      )}

      <div ref={scrollRef} className="overflow-x-auto">
        <div style={{ minWidth: monthCount * 80, position: "relative" }}>
          {/* Month headers */}
          <div className="flex" style={{ borderBottom: "1px solid #E7EBEF" }}>
            <div className="shrink-0" style={{ width: labelWidth }} />
            <div className="flex flex-1">
              {months.map((m, i) => (
                <div
                  key={`${m.year}-${m.month}`}
                  className="flex-1 text-center py-2"
                  style={{
                    fontSize: isMobile ? 11 : 12,
                    fontWeight: m.isCurrent ? 600 : 500,
                    color: m.isCurrent ? "#378ADD" : "#8A9AAB",
                    borderLeft: i > 0 ? "1px solid #C9CED4" : undefined,
                    background: m.isCurrent ? "rgba(55,138,221,0.06)" : undefined,
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Today line */}
          {todayPosition !== null && (
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `calc(${labelWidth}px + ${todayPosition * 100}% * (1 - ${labelWidth} / ${monthCount * 80}))`,
                width: 2,
                background: "#E24B4A",
                opacity: 0.5,
                zIndex: 5,
                pointerEvents: "none",
              }}
            />
          )}

          {/* Event rows */}
          {rows.length === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: "#8A9AAB" }}>
              No events found
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
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                className="shrink-0 px-2 sticky left-0 z-10 cursor-pointer"
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
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const containerRect = containerRef.current?.getBoundingClientRect();
                  if (!containerRect) return;
                  setTooltip({
                    title: row.title,
                    dateStr: row.occurrences.map(o => formatOccurrenceDate(o)).join(", "),
                    x: rect.left - containerRect.left + rect.width / 2,
                    y: rect.top - containerRect.top - 8,
                  });
                  if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
                  tooltipTimer.current = setTimeout(() => setTooltip(null), 3000);
                }}
              >
                {truncateLabel(row.title)}
              </div>

              <div className="flex-1 relative" style={{ height: rowHeight }}>
                {months.map((_, i) =>
                  i > 0 ? (
                    <div
                      key={`sep-${i}`}
                      className="absolute top-0 bottom-0"
                      style={{ left: `${(i / months.length) * 100}%`, width: 1, background: "#C9CED4", opacity: 0.4 }}
                    />
                  ) : null
                )}

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

export default EventsGantt;
