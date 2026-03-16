import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  attendees: string[];
}

export function useMeetings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const meetings = useQuery({
    queryKey: ["meetings"],
    enabled: !!user,
    queryFn: async () => {
      // Get all meetings where user is creator or attendee
      const { data: myMeetings, error: mErr } = await (supabase as any)
        .from("meetings")
        .select("*")
        .order("meeting_date", { ascending: false });
      if (mErr) throw mErr;

      // Get attendees for these meetings
      const meetingIds = (myMeetings || []).map((m: any) => m.id);
      if (meetingIds.length === 0) return [];

      const { data: attendees, error: aErr } = await (supabase as any)
        .from("meeting_attendees")
        .select("meeting_id, user_id")
        .in("meeting_id", meetingIds);
      if (aErr) throw aErr;

      const attendeeMap = new Map<string, string[]>();
      (attendees || []).forEach((a: any) => {
        const list = attendeeMap.get(a.meeting_id) || [];
        list.push(a.user_id);
        attendeeMap.set(a.meeting_id, list);
      });

      // Filter: only show meetings where user is creator or attendee
      return (myMeetings || [])
        .map((m: any) => ({
          ...m,
          attendees: attendeeMap.get(m.id) || [],
        }))
        .filter(
          (m: Meeting) =>
            m.created_by === user!.id || m.attendees.includes(user!.id)
        ) as Meeting[];
    },
  });

  const createMeeting = useMutation({
    mutationFn: async (data: {
      title: string;
      meeting_date: string;
      notes?: string;
      attendee_ids: string[];
    }) => {
      // Create meeting
      const { data: meeting, error: mErr } = await (supabase as any)
        .from("meetings")
        .insert({
          title: data.title,
          meeting_date: data.meeting_date,
          notes: data.notes || null,
          created_by: user!.id,
        })
        .select()
        .single();
      if (mErr) throw mErr;

      // Add attendees
      if (data.attendee_ids.length > 0) {
        const rows = data.attendee_ids.map((uid) => ({
          meeting_id: meeting.id,
          user_id: uid,
        }));
        const { error: aErr } = await (supabase as any)
          .from("meeting_attendees")
          .insert(rows);
        if (aErr) throw aErr;
      }

      return meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Meeting created" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMeeting = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      meeting_date?: string;
      notes?: string | null;
      attendee_ids?: string[];
    }) => {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.meeting_date !== undefined) updateData.meeting_date = data.meeting_date;
      if (data.notes !== undefined) updateData.notes = data.notes;

      if (Object.keys(updateData).length > 0) {
        const { error } = await (supabase as any).from("meetings").update(updateData).eq("id", id);
        if (error) throw error;
      }

      // Update attendees if provided
      if (data.attendee_ids !== undefined) {
        await (supabase as any).from("meeting_attendees").delete().eq("meeting_id", id);
        if (data.attendee_ids.length > 0) {
          const rows = data.attendee_ids.map((uid) => ({
            meeting_id: id,
            user_id: uid,
          }));
          const { error: aErr } = await (supabase as any)
            .from("meeting_attendees")
            .insert(rows);
          if (aErr) throw aErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Meeting updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Meeting deleted" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { meetings, createMeeting, updateMeeting, deleteMeeting };
}
