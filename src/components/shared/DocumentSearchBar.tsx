import { Search, X, FileText, Loader2 } from "lucide-react";
import { SearchResult } from "@/hooks/useDocumentSearch";

interface DocumentSearchBarProps {
  query: string;
  isSearching: boolean;
  results: SearchResult[];
  onSearch: (query: string) => void;
  onClear: () => void;
  onResultClick: (result: SearchResult) => void;
  /** Map of section id → title, used to show parent section name for subsections */
  sectionTitles: Record<string, string>;
}

const DocumentSearchBar = ({
  query, isSearching, results, onSearch, onClear, onResultClick, sectionTitles,
}: DocumentSearchBarProps) => {
  const showResults = query.trim().length > 0;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Search input */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
        background: "#fff",
        border: "1px solid #C9CED4",
        borderRadius: showResults && results.length > 0 ? "8px 8px 0 0" : 8,
        transition: "border-radius 0.15s",
      }}>
        {isSearching ? (
          <Loader2 style={{ width: 15, height: 15, color: "#aaa", flexShrink: 0, animation: "spin 1s linear infinite" }} />
        ) : (
          <Search style={{ width: 15, height: 15, color: "#aaa", flexShrink: 0 }} />
        )}
        <input
          type="text"
          value={query}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search sections…"
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            fontSize: 13, color: "#333", padding: 0,
          }}
        />
        {query && (
          <button
            onClick={onClear}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, color: "#aaa", display: "flex", alignItems: "center" }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      {/* Spinner animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Results dropdown */}
      {showResults && (
        <div style={{
          border: "1px solid #C9CED4", borderTop: "none",
          borderRadius: "0 0 8px 8px",
          background: "#fff",
          maxHeight: 320,
          overflowY: "auto",
        }}>
          {isSearching && results.length === 0 && (
            <div style={{ padding: "16px", fontSize: 13, color: "#999", textAlign: "center" }}>
              Searching…
            </div>
          )}

          {!isSearching && results.length === 0 && query.trim().length > 0 && (
            <div style={{ padding: "16px", fontSize: 13, color: "#999", textAlign: "center" }}>
              No matches for "{query}"
            </div>
          )}

          {results.map(r => {
            const parentTitle = r.parent_id ? sectionTitles[r.parent_id] : null;
            return (
              <button
                key={r.id}
                onClick={() => onResultClick(r)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "10px 14px",
                  background: "transparent", border: "none", borderBottom: "1px solid #F0F0EE",
                  cursor: "pointer",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F5F3EE")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <FileText style={{ width: 12, height: 12, color: "#415162", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{r.title}</span>
                  {parentTitle && (
                    <span style={{ fontSize: 11, color: "#aaa" }}>
                      in {parentTitle}
                    </span>
                  )}
                </div>
                {r.headline && (
                  <div
                    style={{ fontSize: 12, color: "#777", lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{ __html: r.headline }}
                  />
                )}
                <style>{`
                  mark { background: #FFF3CD; color: #333; padding: 0 2px; border-radius: 2px; }
                `}</style>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DocumentSearchBar;
