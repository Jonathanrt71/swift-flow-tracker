import { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";

// Generate time slots in 15-min increments
const TIME_SLOTS: { value: string; label: string }[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const value = `${hh}:${mm}`;
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? "AM" : "PM";
    const label = `${hour12}:${mm} ${ampm}`;
    TIME_SLOTS.push({ value, label });
  }
}

function formatTime24to12(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h < 12 ? "AM" : "PM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const TimeSelect = ({ value, onChange, placeholder = "Select time" }: TimeSelectProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll to selected time when opened
  useEffect(() => {
    if (open && listRef.current && value) {
      const idx = TIME_SLOTS.findIndex(s => s.value === value);
      if (idx >= 0) {
        const el = listRef.current.children[idx] as HTMLElement;
        if (el) el.scrollIntoView({ block: "center" });
      }
    }
  }, [open, value]);

  const displayLabel = value ? formatTime24to12(value) : placeholder;

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 6,
          padding: "8px 12px", border: "1px solid #C9CED4", borderRadius: 6,
          background: "#fff", cursor: "pointer", textAlign: "left",
          color: value ? "#2D3748" : "#8A9AAB", fontSize: 13,
        }}
      >
        <Clock style={{ width: 14, height: 14, color: "#5F7285", flexShrink: 0 }} />
        {displayLabel}
      </button>
      {open && (
        <div
          ref={listRef}
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
            background: "#fff", border: "1px solid #C9CED4", borderRadius: 8,
            maxHeight: 200, overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {TIME_SLOTS.map((slot) => (
            <div
              key={slot.value}
              onClick={() => { onChange(slot.value); setOpen(false); }}
              style={{
                padding: "8px 12px", fontSize: 13, cursor: "pointer",
                background: slot.value === value ? "#F0F2F4" : "transparent",
                color: slot.value === value ? "#415162" : "#2D3748",
                fontWeight: slot.value === value ? 500 : 400,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F5F3EE"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = slot.value === value ? "#F0F2F4" : "transparent"; }}
            >
              {slot.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeSelect;
