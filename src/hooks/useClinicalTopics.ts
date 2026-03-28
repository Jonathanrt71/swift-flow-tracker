import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface TopicTag {
  id: string;
  name: string;
  color: string;
  tag_type: "domain" | "custom";
}

export interface TopicCheckoff {
  id: string;
  topic_id: string;
  resident_id: string;
  faculty_id: string;
  checked_off_at: string;
  notes: string | null;
}

export interface ClinicalTopic {
  id: string;
  title: string;
  url: string | null;
  notes: string | null;
  is_required: boolean;
  last_reviewed: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tags?: TopicTag[];
  checkoffs?: TopicCheckoff[];
}

export function useClinicalTopics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["clinical-topics"] });

  const topics = useQuery<ClinicalTopic[]>({
    queryKey: ["clinical-topics"],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: topicsData, error: te }, { data: tagsData, error: tge }, { data: linksData, error: le }, { data: checkoffsData, error: ce }] =
        await Promise.all([
          supabase.from("clinical_topics").select("*").order("sort_order", { ascending: true }),
          supabase.from("topic_tags").select("*").order("name"),
          supabase.from("topic_tag_links").select("*"),
          supabase.from("topic_checkoffs").select("*").order("checked_off_at", { ascending: false }),
        ]);
      if (te) throw te;
      if (tge) throw tge;
      if (le) throw le;

      const tagMap = new Map((tagsData || []).map((t: any) => [t.id, t]));
      return (topicsData || []).map((t: any) => ({
        ...t,
        tags: (linksData || [])
          .filter((l: any) => l.topic_id === t.id)
          .map((l: any) => tagMap.get(l.tag_id))
          .filter(Boolean) as TopicTag[],
        checkoffs: (checkoffsData || []).filter((c: any) => c.topic_id === t.id),
      })) as ClinicalTopic[];
    },
  });

  const allTags = useQuery<TopicTag[]>({
    queryKey: ["topic-tags"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("topic_tags").select("*").order("tag_type").order("name");
      if (error) throw error;
      return data as TopicTag[];
    },
  });

  const createTopic = useMutation({
    mutationFn: async (data: { title: string; url?: string; notes?: string; is_required?: boolean; tagIds?: string[] }) => {
      const maxOrder = (topics.data || []).reduce((m, t) => Math.max(m, t.sort_order), 0);
      const { data: inserted, error } = await supabase.from("clinical_topics")
        .insert({ title: data.title, url: data.url || null, notes: data.notes || null, is_required: data.is_required || false, sort_order: maxOrder + 10, created_by: user!.id })
        .select().single();
      if (error) throw error;
      if (data.tagIds?.length) {
        const { error: le } = await supabase.from("topic_tag_links")
          .insert(data.tagIds.map(tag_id => ({ topic_id: inserted.id, tag_id })));
        if (le) throw le;
      }
    },
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ["topic-tags"] }); toast({ title: "Topic added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateTopic = useMutation({
    mutationFn: async (data: { id: string; title?: string; url?: string | null; notes?: string | null; is_required?: boolean; last_reviewed?: string | null; tagIds?: string[] }) => {
      const { id, tagIds, ...rest } = data;
      const { error } = await supabase.from("clinical_topics").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      if (tagIds !== undefined) {
        await supabase.from("topic_tag_links").delete().eq("topic_id", id);
        if (tagIds.length) {
          const { error: le } = await supabase.from("topic_tag_links").insert(tagIds.map(tag_id => ({ topic_id: id, tag_id })));
          if (le) throw le;
        }
      }
    },
    onSuccess: () => { invalidate(); toast({ title: "Topic updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteTopic = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clinical_topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Topic deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createTag = useMutation({
    mutationFn: async (data: { name: string; color: string; tag_type: "domain" | "custom" }) => {
      const { error } = await supabase.from("topic_tags").insert(data);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["topic-tags"] }); invalidate(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addCheckoff = useMutation({
    mutationFn: async (data: { topic_id: string; resident_id: string; notes?: string }) => {
      const { error } = await supabase.from("topic_checkoffs").insert({
        topic_id: data.topic_id,
        resident_id: data.resident_id,
        faculty_id: user!.id,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Checkoff recorded" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCheckoff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topic_checkoffs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Checkoff removed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { topics, allTags, createTopic, updateTopic, deleteTopic, createTag, addCheckoff, deleteCheckoff };
}
