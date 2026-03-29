import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  parent_id: string | null;
  doc_type: string;
  display_order: number;
  icon: string;
  updated_at: string;
  rank: number;
  headline: string;
}

export function useDocumentSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string, docType?: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await (supabase.rpc as any)(
        "search_handbook_sections",
        {
          search_query: q.trim(),
          doc_type_filter: docType || null,
        }
      );
      if (error) throw error;
      setResults((data as SearchResult[]) || []);
    } catch (e) {
      console.error("Search error:", e);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useCallback((q: string, docType?: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      search(q, docType);
    }, 300);
  }, [search]);

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    setResults([]);
    setIsSearching(false);
  }, []);

  return { results, isSearching, query, search: debouncedSearch, clear };
}
