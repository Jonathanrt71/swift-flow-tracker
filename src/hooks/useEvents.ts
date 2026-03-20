import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type EventCategory = "program" | "didactic";

export interface ProgramEvent {
  id: string;
  title: string;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  category: EventCategory;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const events = useQuery({
    queryKey: ["events"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data || []) as ProgramEvent[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async (data: {
      title: string;
      event_date: string;
      start_time?: string;
      end_time?: string;
      description?: string;
      category: EventCategory;
      assigned_to?: string;
    }) => {
      const { error } = await supabase.from("events").insert({
        title: data.title,
        event_date: data.event_date,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        description: data.description || null,
        category: data.category,
        assigned_to: data.assigned_to || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({ title: "Event created" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateEvent = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      event_date?: string;
      start_time?: string | null;
      end_time?: string | null;
      description?: string | null;
      category?: EventCategory;
      assigned_to?: string | null;
    }) => {
      const { error } = await supabase.from("events").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({ title: "Event updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({ title: "Event deleted" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { events, createEvent, updateEvent, deleteEvent };
}
