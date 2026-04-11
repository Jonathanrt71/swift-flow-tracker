import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import { Pencil, Trash2, Play, Square } from "lucide-react";
import { formatPersonName } from "@/lib/dateFormat";

/* ── Types ── */
interface PreceptingEntry {
  id: string;
  created_at: string;
  created_by: string;
  attending_id: string;
  resident_id: string;
  visit_level: string;
  attending_in_room: boolean;
  elapsed_seconds: number;
}

interface RoomTimeEntry {
  id: string;
  created_at: string;
  created_by: string;
  resident_id: string;
  visit_level: string;
  elapsed_seconds: number;
}

/* ── Helpers ── */
function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const VISIT_LEVELS = ["99213", "99214", "99215", "99203", "99204", "99205"];

/* ── Main Page ── */
const VisitMetrics = () => {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { isAdmin: isAdminQuery } = useAdmin();
  const isAdmin = !!isAdminQuery.data;
  const { has: hasPerm } = usePermissions();
  const { role } = useUserRole();
  const { data: teamMembers = [] } = useTeamMembers();
  const queryClient = useQueryClient();

  const canEdit = isAdmin || hasPerm("visit_metrics.edit");

  const [activeTab, setActiveTab] = useState<"precepting" | "room">("precepting");

  // Split team members
  const attendings = teamMembers.filter((m) => m.role === "faculty");
  const residents = teamMembers.filter((m) => m.role === "resident");

  const isResident = role === "resident";
  const isFaculty = role === "faculty";

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      <HeaderLogo />
      <NotificationBell />
      <div style={{ maxWidth: 540, margin: "0 auto", padding: "80px 16px 100px" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 24, marginBottom: 20, borderBottom: "1px solid #D5DAE0" }}>
          {(["precepting", "room"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? "#415162" : "#8A9AAB",
                borderBottom: activeTab === tab ? "2px solid #415162" : "2px solid transparent",
                paddingBottom: 8, marginBottom: -1,
              }}
            >
              {tab === "precepting" ? "Precepting time" : "Room time"}
            </button>
          ))}
        </div>

        {activeTab === "precepting" ? (
          <PreceptingTab
            userId={userId} isAdmin={isAdmin} canEdit={canEdit}
            isResident={isResident} isFaculty={isFaculty}
            attendings={attendings} residents={residents}
            queryClient={queryClient}
          />
        ) : (
          <RoomTimeTab
            userId={userId} isAdmin={isAdmin} canEdit={canEdit}
            isResident={isResident}
            residents={residents}
            queryClient={queryClient}
          />
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   PRECEPTING TAB
   ══════════════════════════════════════════════════════════════ */
interface PreceptingTabProps {
  userId: string; isAdmin: boolean; canEdit: boolean;
  isResident: boolean; isFaculty: boolean;
  attendings: { id: string; display_name: string | null; role: string }[];
  residents: { id: string; display_name: string | null; role: string }[];
  queryClient: any;
}

const PreceptingTab = ({ userId, isAdmin, canEdit, isResident, isFaculty, attendings, residents, queryClient }: PreceptingTabProps) => {
  // Timer state
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stopped, setStopped] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form state
  const [attendingId, setAttendingId] = useState("");
  const [residentId, setResidentId] = useState("");
  const [visitLevel, setVisitLevel] = useState("99214");
  const [attendingInRoom, setAttendingInRoom] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVisitLevel, setEditVisitLevel] = useState("");
  const [editAttendingInRoom, setEditAttendingInRoom] = useState(false);
  const [editAttendingId, setEditAttendingId] = useState("");
  const [editResidentId, setEditResidentId] = useState("");

  // Auto-populate based on role
  useEffect(() => {
    if (isFaculty) {
      const me = attendings.find((a) => a.id === userId);
      if (me) setAttendingId(me.id);
    }
    if (isResident) {
      const me = residents.find((r) => r.id === userId);
      if (me) setResidentId(me.id);
    }
  }, [isFaculty, isResident, userId, attendings, residents]);

  // Timer logic
  const startTimer = useCallback(() => {
    setElapsed(0);
    setStopped(false);
    setRunning(true);
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    setRunning(false);
    setStopped(true);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const resetTimer = useCallback(() => {
    setRunning(false);
    setStopped(false);
    setElapsed(0);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Data
  const { data: entries = [] } = useQuery({
    queryKey: ["precepting_entries"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("precepting_entries" as any).select("*").order("created_at", { ascending: false }).limit(50) as any);
      if (error) throw error;
      return (data || []) as PreceptingEntry[];
    },
  });

  const addEntry = useMutation({
    mutationFn: async (entry: Omit<PreceptingEntry, "id" | "created_at">) => {
      const { error } = await (supabase.from("precepting_entries" as any).insert(entry as any) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["precepting_entries"] }); resetTimer(); },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; visit_level?: string; attending_in_room?: boolean; attending_id?: string; resident_id?: string }) => {
      const { error } = await (supabase.from("precepting_entries" as any).update(updates as any).eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["precepting_entries"] }); setEditingId(null); },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("precepting_entries" as any).delete().eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["precepting_entries"] }),
  });

  const handleSave = () => {
    if (!attendingId || !residentId) return;
    addEntry.mutate({
      created_by: userId,
      attending_id: attendingId,
      resident_id: residentId,
      visit_level: visitLevel,
      attending_in_room: attendingInRoom,
      elapsed_seconds: elapsed,
    });
  };

  const canOwn = (entryCreatedBy: string) => isAdmin || entryCreatedBy === userId;

  // Name lookup
  const allMembers = [...attendings, ...residents];
  const nameOf = (id: string) => {
    const m = allMembers.find((x) => x.id === id);
    return m?.display_name || "Unknown";
  };

  return (
    <>
      {/* Timer */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: "monospace", fontSize: 48, fontWeight: 500, color: "#3D3D3A", letterSpacing: 2, marginBottom: 12 }}>
          {fmtTime(elapsed)}
        </div>
        {!running && !stopped && (
          <button onClick={startTimer} style={{ background: "#415162", color: "#fff", border: "none", borderRadius: 8, padding: "10px 32px", fontSize: 15, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Play size={16} fill="#fff" /> Start
          </button>
        )}
        {running && (
          <button onClick={stopTimer} style={{ background: "#9F2929", color: "#fff", border: "none", borderRadius: 8, padding: "10px 32px", fontSize: 15, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Square size={16} fill="#fff" /> Stop
          </button>
        )}
        {stopped && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={resetTimer} style={{ background: "#E7EBEF", color: "#415162", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, cursor: "pointer" }}>Reset</button>
          </div>
        )}
        {running && <p style={{ fontSize: 12, color: "#8A9AAB", marginTop: 8 }}>Timer running…</p>}
      </div>

      {/* Tag form — shown after stop */}
      {stopped && (
        <div style={{ background: "#E7EBEF", borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#5F7285", marginBottom: 12 }}>Tag this entry</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>Attending</label>
              <select
                value={attendingId}
                onChange={(e) => setAttendingId(e.target.value)}
                disabled={isFaculty}
                style={{ width: "100%", fontSize: 13, padding: "7px 8px", borderRadius: 8, border: "1px solid #D5DAE0", background: "#fff", color: "#3D3D3A" }}
              >
                <option value="">Select…</option>
                {attendings.map((a) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>Visit level</label>
              <select value={visitLevel} onChange={(e) => setVisitLevel(e.target.value)} style={{ width: "100%", fontSize: 13, padding: "7px 8px", borderRadius: 8, border: "1px solid #D5DAE0", background: "#fff", color: "#3D3D3A" }}>
                {VISIT_LEVELS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>Resident</label>
              <select
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                disabled={isResident}
                style={{ width: "100%", fontSize: 13, padding: "7px 8px", borderRadius: 8, border: "1px solid #D5DAE0", background: "#fff", color: "#3D3D3A" }}
              >
                <option value="">Select…</option>
                {residents.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>Attending in room?</label>
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button
                  onClick={() => setAttendingInRoom(true)}
                  style={{ flex: 1, padding: 7, fontSize: 13, borderRadius: 8, border: attendingInRoom ? "none" : "1px solid #D5DAE0", background: attendingInRoom ? "#415162" : "#fff", color: attendingInRoom ? "#fff" : "#3D3D3A", cursor: "pointer" }}
                >Yes</button>
                <button
                  onClick={() => setAttendingInRoom(false)}
                  style={{ flex: 1, padding: 7, fontSize: 13, borderRadius: 8, border: !attendingInRoom ? "none" : "1px solid #D5DAE0", background: !attendingInRoom ? "#415162" : "#fff", color: !attendingInRoom ? "#fff" : "#3D3D3A", cursor: "pointer" }}
                >No</button>
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={!attendingId || !residentId || addEntry.isPending}
            style={{ width: "100%", padding: 10, fontSize: 14, fontWeight: 500, borderRadius: 8, border: "none", background: (!attendingId || !residentId) ? "#C9CED4" : "#415162", color: "#fff", cursor: (!attendingId || !residentId) ? "default" : "pointer" }}
          >
            {addEntry.isPending ? "Saving…" : "Save entry"}
          </button>
        </div>
      )}

      {/* Entries log */}
      <p style={{ fontSize: 13, fontWeight: 600, color: "#5F7285", marginBottom: 10 }}>Recent entries</p>
      {entries.length === 0 && <p style={{ fontSize: 13, color: "#8A9AAB" }}>No entries yet</p>}
      {entries.map((entry) => {
        const isEditing = editingId === entry.id;
        const date = new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

        if (isEditing) {
          return (
            <div key={entry.id} style={{ background: "#fff", borderRadius: 8, border: "1px solid #D5DAE0", padding: 12, marginBottom: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#5F7285" }}>Attending</label>
                  <select value={editAttendingId} onChange={(e) => setEditAttendingId(e.target.value)} style={{ width: "100%", fontSize: 12, padding: "5px 6px", borderRadius: 6, border: "1px solid #D5DAE0", background: "#fff" }}>
                    {attendings.map((a) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#5F7285" }}>Resident</label>
                  <select value={editResidentId} onChange={(e) => setEditResidentId(e.target.value)} style={{ width: "100%", fontSize: 12, padding: "5px 6px", borderRadius: 6, border: "1px solid #D5DAE0", background: "#fff" }}>
                    {residents.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#5F7285" }}>Visit level</label>
                  <select value={editVisitLevel} onChange={(e) => setEditVisitLevel(e.target.value)} style={{ width: "100%", fontSize: 12, padding: "5px 6px", borderRadius: 6, border: "1px solid #D5DAE0", background: "#fff" }}>
                    {VISIT_LEVELS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#5F7285" }}>In room?</label>
                  <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                    <button onClick={() => setEditAttendingInRoom(true)} style={{ flex: 1, padding: 5, fontSize: 12, borderRadius: 6, border: editAttendingInRoom ? "none" : "1px solid #D5DAE0", background: editAttendingInRoom ? "#415162" : "#fff", color: editAttendingInRoom ? "#fff" : "#3D3D3A", cursor: "pointer" }}>Yes</button>
                    <button onClick={() => setEditAttendingInRoom(false)} style={{ flex: 1, padding: 5, fontSize: 12, borderRadius: 6, border: !editAttendingInRoom ? "none" : "1px solid #D5DAE0", background: !editAttendingInRoom ? "#415162" : "#fff", color: !editAttendingInRoom ? "#fff" : "#3D3D3A", cursor: "pointer" }}>No</button>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { updateEntry.mutate({ id: entry.id, visit_level: editVisitLevel, attending_in_room: editAttendingInRoom, attending_id: editAttendingId, resident_id: editResidentId }); }} style={{ flex: 1, padding: 7, fontSize: 13, fontWeight: 500, borderRadius: 6, border: "none", background: "#415162", color: "#fff", cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditingId(null)} style={{ padding: 7, fontSize: 13, borderRadius: 6, border: "1px solid #D5DAE0", background: "#fff", color: "#3D3D3A", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          );
        }

        return (
          <div key={entry.id} style={{ background: "#fff", borderRadius: 8, border: "1px solid #D5DAE0", padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 18, fontWeight: 500, fontFamily: "monospace", color: "#3D3D3A" }}>{fmtTime(entry.elapsed_seconds)}</span>
                  <span style={{ fontSize: 11, background: "#E6F1FB", color: "#0C447C", padding: "2px 8px", borderRadius: 6 }}>{entry.visit_level}</span>
                  {entry.attending_in_room && (
                    <span style={{ fontSize: 11, background: "#E1F5EE", color: "#085041", padding: "2px 8px", borderRadius: 6 }}>In room</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#8A9AAB" }}>
                  {nameOf(entry.resident_id)} → {nameOf(entry.attending_id)} · {date}
                </div>
              </div>
              {canOwn(entry.created_by) && (
                <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: 8 }}>
                  <button onClick={() => { setEditingId(entry.id); setEditVisitLevel(entry.visit_level); setEditAttendingInRoom(entry.attending_in_room); setEditAttendingId(entry.attending_id); setEditResidentId(entry.resident_id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#8A9AAB" }} title="Edit"><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm("Delete this entry?")) deleteEntry.mutate(entry.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#8A9AAB" }} title="Delete"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

/* ══════════════════════════════════════════════════════════════
   ROOM TIME TAB
   ══════════════════════════════════════════════════════════════ */
interface RoomTimeTabProps {
  userId: string; isAdmin: boolean; canEdit: boolean;
  isResident: boolean;
  residents: { id: string; display_name: string | null; role: string }[];
  queryClient: any;
}

const RoomTimeTab = ({ userId, isAdmin, canEdit, isResident, residents, queryClient }: RoomTimeTabProps) => {
  // Timer state
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stopped, setStopped] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form state
  const [residentId, setResidentId] = useState("");
  const [visitLevel, setVisitLevel] = useState("99214");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVisitLevel, setEditVisitLevel] = useState("");
  const [editResidentId, setEditResidentId] = useState("");

  // Auto-populate resident
  useEffect(() => {
    if (isResident) {
      const me = residents.find((r) => r.id === userId);
      if (me) setResidentId(me.id);
    }
  }, [isResident, userId, residents]);

  // Timer logic
  const startTimer = useCallback(() => {
    setElapsed(0);
    setStopped(false);
    setRunning(true);
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    setRunning(false);
    setStopped(true);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const resetTimer = useCallback(() => {
    setRunning(false);
    setStopped(false);
    setElapsed(0);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Data
  const { data: entries = [] } = useQuery({
    queryKey: ["room_time_entries"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("room_time_entries" as any).select("*").order("created_at", { ascending: false }).limit(50) as any);
      if (error) throw error;
      return (data || []) as RoomTimeEntry[];
    },
  });

  const addEntry = useMutation({
    mutationFn: async (entry: Omit<RoomTimeEntry, "id" | "created_at">) => {
      const { error } = await (supabase.from("room_time_entries" as any).insert(entry as any) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["room_time_entries"] }); resetTimer(); },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; visit_level?: string; resident_id?: string }) => {
      const { error } = await (supabase.from("room_time_entries" as any).update(updates as any).eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["room_time_entries"] }); setEditingId(null); },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("room_time_entries" as any).delete().eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["room_time_entries"] }),
  });

  const handleSave = () => {
    if (!residentId) return;
    addEntry.mutate({
      created_by: userId,
      resident_id: residentId,
      visit_level: visitLevel,
      elapsed_seconds: elapsed,
    });
  };

  const canOwn = (entryCreatedBy: string) => isAdmin || entryCreatedBy === userId;

  const nameOf = (id: string) => {
    const m = residents.find((x) => x.id === id);
    return m?.display_name || "Unknown";
  };

  return (
    <>
      {/* Timer */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: "monospace", fontSize: 48, fontWeight: 500, color: "#3D3D3A", letterSpacing: 2, marginBottom: 12 }}>
          {fmtTime(elapsed)}
        </div>
        {!running && !stopped && (
          <button onClick={startTimer} style={{ background: "#415162", color: "#fff", border: "none", borderRadius: 8, padding: "10px 32px", fontSize: 15, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Play size={16} fill="#fff" /> Start
          </button>
        )}
        {running && (
          <button onClick={stopTimer} style={{ background: "#9F2929", color: "#fff", border: "none", borderRadius: 8, padding: "10px 32px", fontSize: 15, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Square size={16} fill="#fff" /> Stop
          </button>
        )}
        {stopped && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={resetTimer} style={{ background: "#E7EBEF", color: "#415162", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, cursor: "pointer" }}>Reset</button>
          </div>
        )}
        {running && <p style={{ fontSize: 12, color: "#8A9AAB", marginTop: 8 }}>Timer running…</p>}
      </div>

      {/* Tag form */}
      {stopped && (
        <div style={{ background: "#E7EBEF", borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#5F7285", marginBottom: 12 }}>Tag this entry</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>Resident</label>
              <select
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                disabled={isResident}
                style={{ width: "100%", fontSize: 13, padding: "7px 8px", borderRadius: 8, border: "1px solid #D5DAE0", background: "#fff", color: "#3D3D3A" }}
              >
                <option value="">Select…</option>
                {residents.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>Visit level</label>
              <select value={visitLevel} onChange={(e) => setVisitLevel(e.target.value)} style={{ width: "100%", fontSize: 13, padding: "7px 8px", borderRadius: 8, border: "1px solid #D5DAE0", background: "#fff", color: "#3D3D3A" }}>
                {VISIT_LEVELS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={!residentId || addEntry.isPending}
            style={{ width: "100%", padding: 10, fontSize: 14, fontWeight: 500, borderRadius: 8, border: "none", background: !residentId ? "#C9CED4" : "#415162", color: "#fff", cursor: !residentId ? "default" : "pointer" }}
          >
            {addEntry.isPending ? "Saving…" : "Save entry"}
          </button>
        </div>
      )}

      {/* Entries log */}
      <p style={{ fontSize: 13, fontWeight: 600, color: "#5F7285", marginBottom: 10 }}>Recent entries</p>
      {entries.length === 0 && <p style={{ fontSize: 13, color: "#8A9AAB" }}>No entries yet</p>}
      {entries.map((entry) => {
        const isEditing = editingId === entry.id;
        const date = new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

        if (isEditing) {
          return (
            <div key={entry.id} style={{ background: "#fff", borderRadius: 8, border: "1px solid #D5DAE0", padding: 12, marginBottom: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#5F7285" }}>Resident</label>
                  <select value={editResidentId} onChange={(e) => setEditResidentId(e.target.value)} style={{ width: "100%", fontSize: 12, padding: "5px 6px", borderRadius: 6, border: "1px solid #D5DAE0", background: "#fff" }}>
                    {residents.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#5F7285" }}>Visit level</label>
                  <select value={editVisitLevel} onChange={(e) => setEditVisitLevel(e.target.value)} style={{ width: "100%", fontSize: 12, padding: "5px 6px", borderRadius: 6, border: "1px solid #D5DAE0", background: "#fff" }}>
                    {VISIT_LEVELS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { updateEntry.mutate({ id: entry.id, visit_level: editVisitLevel, resident_id: editResidentId }); }} style={{ flex: 1, padding: 7, fontSize: 13, fontWeight: 500, borderRadius: 6, border: "none", background: "#415162", color: "#fff", cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditingId(null)} style={{ padding: 7, fontSize: 13, borderRadius: 6, border: "1px solid #D5DAE0", background: "#fff", color: "#3D3D3A", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          );
        }

        return (
          <div key={entry.id} style={{ background: "#fff", borderRadius: 8, border: "1px solid #D5DAE0", padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 18, fontWeight: 500, fontFamily: "monospace", color: "#3D3D3A" }}>{fmtTime(entry.elapsed_seconds)}</span>
                  <span style={{ fontSize: 11, background: "#E6F1FB", color: "#0C447C", padding: "2px 8px", borderRadius: 6 }}>{entry.visit_level}</span>
                </div>
                <div style={{ fontSize: 12, color: "#8A9AAB" }}>
                  {nameOf(entry.resident_id)} · {date}
                </div>
              </div>
              {canOwn(entry.created_by) && (
                <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: 8 }}>
                  <button onClick={() => { setEditingId(entry.id); setEditVisitLevel(entry.visit_level); setEditResidentId(entry.resident_id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#8A9AAB" }} title="Edit"><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm("Delete this entry?")) deleteEntry.mutate(entry.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#8A9AAB" }} title="Delete"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default VisitMetrics;
