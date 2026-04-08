import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCategoryUserIds } from "@/hooks/useCategoryUserIds";

/**
 * Lightweight hook for the Home dashboard widget.
 * Queries the announcements table directly (not the announcements_with_counts view)
 * with a limit of 3, no realtime subscriptions, and no read/ack/reply counts.
 */

export interface RecentAnnouncement {
  id: string;
  title: string;
  body: string;
  created_at: string;
  created_by: string;
}

export function useRecentAnnouncements() {
  const { user } = useAuth();
  const { categoryUserIds, activeCategory } = useCategoryUserIds();

  const query = useQuery({
    queryKey: ["recent-announcements", activeCategory],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("announcements" as any)
        .select("id, title, body, created_at, created_by")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10) as any);
      if (error) throw error;
      return ((data || []) as RecentAnnouncement[]).filter((a) => categoryUserIds.has(a.created_by)).slice(0, 3);
    },
    enabled: !!user && categoryUserIds.size > 0,
    staleTime: 60_000,
  });

  return {
    recentAnnouncements: query.data || [],
    isLoading: query.isLoading,
  };
}
