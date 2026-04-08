import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useCategoryUserIds } from "@/hooks/useCategoryUserIds";

export type AnnouncementCategory = "general" | "schedule_change" | "deadline" | "event" | "policy_update";
export type AnnouncementAudience = "all" | "faculty" | "residents" | "pgy1" | "pgy2" | "pgy3";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  audience: AnnouncementAudience;
  is_pinned: boolean;
  is_action_required: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // from view
  read_count?: number;
  ack_count?: number;
  reply_count?: number;
  author_name?: string;
}

export interface AnnouncementReply {
  id: string;
  announcement_id: string;
  user_id: string;
  body: string;
  created_at: string;
  // joined
  author_name?: string;
}

export interface AnnouncementRead {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
  acknowledged_at: string | null;
  // joined
  user_name?: string;
}

export const CATEGORY_OPTIONS: { key: AnnouncementCategory; label: string }[] = [
  { key: "general", label: "General" },
  { key: "schedule_change", label: "Schedule Change" },
  { key: "deadline", label: "Deadline" },
  { key: "event", label: "Event" },
  { key: "policy_update", label: "Policy Update" },
];

export const AUDIENCE_OPTIONS: { key: AnnouncementAudience; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "faculty", label: "Faculty Only" },
  { key: "residents", label: "Residents Only" },
  { key: "pgy1", label: "PGY-1" },
  { key: "pgy2", label: "PGY-2" },
  { key: "pgy3", label: "PGY-3" },
];

export const CATEGORY_COLORS: Record<AnnouncementCategory, { bg: string; text: string }> = {
  general: { bg: "#D6DEE6", text: "#52657A" },
  schedule_change: { bg: "#FBF3E0", text: "#D4A017" },
  deadline: { bg: "#F5D6D6", text: "#A04040" },
  event: { bg: "#E4F0EB", text: "#4A846C" },
  policy_update: { bg: "#E7EBEF", text: "#415162" },
};

export function useAnnouncements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { categoryUserIds, activeCategory } = useCategoryUserIds();

  // Fetch all announcements with counts
  const query = useQuery({
    queryKey: ["announcements", activeCategory],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements_with_counts" as any)
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as unknown as Announcement[]).filter(a => categoryUserIds.has(a.created_by));
    },
    enabled: !!user && categoryUserIds.size > 0,
  });

  // Realtime subscription for new announcements
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("announcements-realtime")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "announcements" },
        () => { queryClient.invalidateQueries({ queryKey: ["announcements"] }); }
      )
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "announcement_reads" },
        () => { queryClient.invalidateQueries({ queryKey: ["announcements"] }); }
      )
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "announcement_replies" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["announcements"] });
          queryClient.invalidateQueries({ queryKey: ["announcement-replies"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Create announcement
  const createAnnouncement = useMutation({
    mutationFn: async (input: {
      title: string;
      body: string;
      category: AnnouncementCategory;
      audience: AnnouncementAudience;
      is_pinned: boolean;
      is_action_required: boolean;
    }) => {
      const { error } = await supabase
        .from("announcements" as any)
        .insert({ ...input, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  // Delete announcement
  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("announcements" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  // Mark as read
  const markAsRead = useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase
        .from("announcement_reads" as any)
        .upsert(
          { announcement_id: announcementId, user_id: user!.id, read_at: new Date().toISOString() },
          { onConflict: "announcement_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  // Acknowledge
  const acknowledge = useMutation({
    mutationFn: async (announcementId: string) => {
      // First ensure a read record exists
      await supabase
        .from("announcement_reads" as any)
        .upsert(
          { announcement_id: announcementId, user_id: user!.id, read_at: new Date().toISOString(), acknowledged_at: new Date().toISOString() },
          { onConflict: "announcement_id,user_id" }
        );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  // Unacknowledge
  const unacknowledge = useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase
        .from("announcement_reads" as any)
        .update({ acknowledged_at: null })
        .eq("announcement_id", announcementId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  return {
    announcements: query.data || [],
    isLoading: query.isLoading,
    createAnnouncement,
    deleteAnnouncement,
    markAsRead,
    acknowledge,
    unacknowledge,
  };
}

// Hook for fetching replies for a specific announcement
export function useAnnouncementReplies(announcementId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["announcement-replies", announcementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcement_replies" as any)
        .select("*, profiles!announcement_replies_user_id_fkey(first_name, last_name, email)")
        .eq("announcement_id", announcementId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data || []) as any[]).map((r: any) => ({
        id: r.id,
        announcement_id: r.announcement_id,
        user_id: r.user_id,
        body: r.body,
        created_at: r.created_at,
        author_name: r.profiles
          ? [r.profiles.first_name, r.profiles.last_name].filter(Boolean).join(" ") || r.profiles.email
          : "Unknown",
      })) as AnnouncementReply[];
    },
    enabled: !!user && !!announcementId,
  });
}

// Hook for creating a reply
export function useCreateReply() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { announcement_id: string; body: string }) => {
      const { error } = await supabase
        .from("announcement_replies" as any)
        .insert({ ...input, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcement-replies"] });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

// Hook for fetching read/ack status for admin tracking
export function useAnnouncementReads(announcementId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["announcement-reads", announcementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcement_reads" as any)
        .select("*, profiles!announcement_reads_user_id_fkey(first_name, last_name, email)")
        .eq("announcement_id", announcementId!);
      if (error) throw error;
      return ((data || []) as any[]).map((r: any) => ({
        id: r.id,
        announcement_id: r.announcement_id,
        user_id: r.user_id,
        read_at: r.read_at,
        acknowledged_at: r.acknowledged_at,
        user_name: r.profiles
          ? [r.profiles.first_name, r.profiles.last_name].filter(Boolean).join(" ") || r.profiles.email
          : "Unknown",
      })) as AnnouncementRead[];
    },
    enabled: !!user && !!announcementId,
  });
}

// Hook to check if current user has acknowledged
export function useMyAck(announcementId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-ack", announcementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcement_reads" as any)
        .select("acknowledged_at")
        .eq("announcement_id", announcementId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!(data as any)?.acknowledged_at;
    },
    enabled: !!user,
  });
}
