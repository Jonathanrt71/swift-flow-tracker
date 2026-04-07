import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";

interface ComboSearchItem {
  id: string;
  label: string;
  rank?: number;
}

interface ComboSearchProps {
  items: ComboSearchItem[];
  placeholder: string;
  createLabel: string; // e.g. "priority" or "task"
  onSelect: (id: string) => void;
  onCreate: (title: string) => void;
}

const ComboSearch = ({ items, placeholder, createLabel, onSelect, onCreate }: ComboSearchProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  const showCreate = query.trim().length > 0 && !items.some(i => i.label.toLowerCase() === query.toLowerCase());

  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    onSelect(id);
    setQuery("");
    setOpen(false);
  };

  const handleCreate = () => {
    if (!query.trim()) return;
    onCreate(query.trim());
    setQuery("");
    setOpen(false);
  };

  const totalOptions = filtered.length + (showCreate ? 1 : 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(prev + 1, totalOptions - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx < filtered.length) {
        handleSelect(filtered[highlightIdx].id);
      } else if (showCreate) {
        handleCreate();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 12px",
          fontSize: 13,
          borderRadius: 8,
          border: open ? "1px solid #415162" : "0.5px solid #C9CED4",
          background: "#fff",
          outline: "none",
        }}
      />
      {open && totalOptions > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          background: "#fff",
          border: "0.5px solid #C9CED4",
          borderRadius: 8,
          marginTop: 4,
          overflow: "hidden",
          zIndex: 50,
          maxHeight: 200,
          overflowY: "auto",
        }}>
          {filtered.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item.id)}
              onMouseEnter={() => setHighlightIdx(idx)}
              style={{
                padding: "9px 12px",
                fontSize: 13,
                color: "#2D3748",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: highlightIdx === idx ? "#E7EBEF" : "transparent",
              }}
            >
              {item.rank !== undefined && (
                <span style={{
                  width: 20, height: 20, borderRadius: "50%", background: "#415162",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 500, flexShrink: 0,
                }}>
                  {item.rank}
                </span>
              )}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
            </div>
          ))}
          {showCreate && (
            <div
              onClick={handleCreate}
              onMouseEnter={() => setHighlightIdx(filtered.length)}
              style={{
                padding: "9px 12px",
                fontSize: 13,
                color: "#415162",
                fontWeight: 500,
                cursor: "pointer",
                borderTop: filtered.length > 0 ? "0.5px solid #C9CED4" : undefined,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: highlightIdx === filtered.length ? "#E7EBEF" : "transparent",
              }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Create "{query.trim()}" as new {createLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComboSearch;
