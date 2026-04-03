import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
}

export function useRecentAnnouncements() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["recent-announcements"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("announcements" as any)
        .select("id, title, body, created_at")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3) as any);
      if (error) throw error;
      return (data || []) as RecentAnnouncement[];
    },
    enabled: !!user,
    staleTime: 60_000, // cache for 1 minute — home page doesn't need instant updates
  });

  return {
    recentAnnouncements: query.data || [],
    isLoading: query.isLoading,
  };
}
