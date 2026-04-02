import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type EventCategory =
  | "program"
  | "didactic"
  | "committee"
  | "compliance"
  | "administrative"
  | "wellness"
  | "faculty"
  | "community";

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  program:        "Program",
  didactic:       "Didactic",
  committee:      "Committee",
  compliance:     "Compliance",
  administrative: "Administrative",
  wellness:       "Wellness",
  faculty:        "Faculty",
  community:      "Community",
};

export const EVENT_CATEGORY_COLORS: Record<EventCategory, string> = {
  program:        "#415162",
  didactic:       "#52657A",
  committee:      "#4A846C",
  compliance:     "#D4A017",
  administrative: "#7A6052",
  wellness:       "#5A7A6A",
  faculty:        "#6A5A7A",
  community:      "#5A8A9A",
};

export type RecurrencePattern = "none" | "weekly" | "monthly" | "semi_annual" | "annually" | "custom";

export const RECURRENCE_LABELS: Record<RecurrencePattern, string> = {
  none:        "Does not repeat",
  weekly:      "Weekly",
  monthly:     "Monthly",
  semi_annual: "Every 6 months",
  annually:    "Annually",
  custom:      "Custom (manual date)",
};

/** Given a pattern and a base date, returns the suggested next occurrence date string (YYYY-MM-DD).
 *  Returns null for 'none' or 'custom'. */
export function calcNextOccurrence(pattern: RecurrencePattern, fromDate: string): string | null {
  if (pattern === "none" || pattern === "custom") return null;
  const d = new Date(fromDate);
  switch (pattern) {
    case "weekly":      d.setDate(d.getDate() + 7); break;
    case "monthly":     d.setMonth(d.getMonth() + 1); break;
    case "semi_annual": d.setMonth(d.getMonth() + 6); break;
    case "annually":    d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split("T")[0];
}

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
  recurrence_pattern: RecurrencePattern;
  recurrence_confirmed: boolean;
  next_occurrence_date: string | null;
  recurrence_parent_id: string | null;
  archived: boolean;
  operations_section_id: string | null;
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
        .eq("archived", false)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data || []) as ProgramEvent[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async (data: {
      title: string;
      event_date: string;
      end_date?: string;
      start_time?: string;
      end_time?: string;
      description?: string;
      category: EventCategory;
      assigned_to?: string;
      recurrence_pattern?: RecurrencePattern;
      operations_section_id?: string;
    }) => {
      const { error } = await supabase.from("events").insert({
        title: data.title,
        event_date: data.event_date,
        end_date: data.end_date || null,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        description: data.description || null,
        category: data.category,
        assigned_to: data.assigned_to || null,
        created_by: user!.id,
        recurrence_pattern: data.recurrence_pattern || "none",
        recurrence_confirmed: false,
        archived: false,
        operations_section_id: data.operations_section_id || null,
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
      end_date?: string | null;
      start_time?: string | null;
      end_time?: string | null;
      description?: string | null;
      category?: EventCategory;
      assigned_to?: string | null;
      recurrence_pattern?: RecurrencePattern;
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

  const confirmRecurrence = useMutation({
    mutationFn: async ({ event, nextDate }: { event: ProgramEvent; nextDate: string }) => {
      // 1. Archive the original event
      const { error: archiveErr } = await supabase
        .from("events")
        .update({ archived: true, recurrence_confirmed: true })
        .eq("id", event.id);
      if (archiveErr) throw archiveErr;

      // 2. Create next occurrence
      const { error: createErr } = await supabase.from("events").insert({
        title: event.title,
        event_date: nextDate,
        end_date: null,
        start_time: event.start_time,
        end_time: event.end_time,
        description: event.description,
        category: event.category,
        assigned_to: event.assigned_to,
        created_by: user!.id,
        recurrence_pattern: event.recurrence_pattern,
        recurrence_confirmed: false,
        recurrence_parent_id: event.id,
        archived: false,
      });
      if (createErr) throw createErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({ title: "Next occurrence confirmed" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const skipRecurrence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("events")
        .update({ archived: true, recurrence_confirmed: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({ title: "Recurrence skipped" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { events, createEvent, updateEvent, deleteEvent, confirmRecurrence, skipRecurrence };
}
