import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface MeetingTag {
  id: string;
  name: string;
  created_at: string;
}

export function useMeetingTags() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const tags = useQuery({
    queryKey: ["meeting_tags"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_tags")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as MeetingTag[];
    },
  });

  const createTag = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("meeting_tags").insert({ name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting_tags"] });
      toast({ title: "Tag created" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateTag = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("meeting_tags").update({ name: name.trim() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting_tags"] });
      toast({ title: "Tag updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      // First remove from all meeting_tag_links
      await supabase.from("meeting_tag_links").delete().eq("tag_id", id);
      const { error } = await supabase.from("meeting_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting_tags"] });
      queryClient.invalidateQueries({ queryKey: ["meeting_tag_links"] });
      toast({ title: "Tag deleted" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { tags, createTag, updateTag, deleteTag };
}

export function useMeetingTagLinks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const links = useQuery({
    queryKey: ["meeting_tag_links"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("meeting_tag_links").select("*");
      if (error) throw error;
      return (data || []) as { id: string; meeting_id: string; tag_id: string }[];
    },
  });

  const setTagsForMeeting = useMutation({
    mutationFn: async ({ meetingId, tagIds }: { meetingId: string; tagIds: string[] }) => {
      // Delete existing links for this meeting
      await supabase.from("meeting_tag_links").delete().eq("meeting_id", meetingId);
      // Insert new links
      if (tagIds.length > 0) {
        const rows = tagIds.map((tag_id) => ({ meeting_id: meetingId, tag_id }));
        const { error } = await supabase.from("meeting_tag_links").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting_tag_links"] });
    },
  });

  return { links, setTagsForMeeting };
}
