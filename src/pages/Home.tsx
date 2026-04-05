import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import { useRecentAnnouncements } from "@/hooks/useRecentAnnouncements";
import { useFeedback } from "@/hooks/useFeedback";
import { useEvents, EVENT_CATEGORY_LABELS, EVENT_CATEGORY_COLORS, type EventCategory } from "@/hooks/useEvents";
import { useTasks } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import HeaderLogo from "@/components/HeaderLogo";
import {
  Megaphone,
  CalendarDays,
  ClipboardCheck,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  Hash,
} from "lucide-react";
import { usePriorities } from "@/hooks/usePriorities";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startYear = month >= 6 ? year : year - 1;
  return `AY ${startYear}–${(startYear + 1).toString().slice(2)}`;
}

function getDayLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatDate(d: string) {
  const clean = d.split("T")[0];
  const date = new Date(clean + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysUntil(d: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const clean = d.split("T")[0];
  const target = new Date(clean + "T00:00:00");
  const diff = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

// ─── Feedback Pie Colors ─────────────────────────────────────────────────────

const SENTIMENT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof ThumbsUp }> = {
  positive: { label: "Positive", color: "#4A846C", bg: "#E4F0EB", icon: ThumbsUp },
  negative: { label: "Needs Improvement", color: "#E24B4A", bg: "#FCEBEB", icon: ThumbsDown },
};

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, total }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : 0;
  return (
    <div style={{ background: "#fff", padding: "8px 12px", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", fontSize: 13 }}>
      <span style={{ fontWeight: 700, color: d.color }}>{d.name}</span>
      <span style={{ marginLeft: 8, color: "#52657A" }}>{d.value} ({pct}%)</span>
    </div>
  );
};

// ─── Dashboard Component ─────────────────────────────────────────────────────

const Home = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { has: hasPerm, isLoading: permsLoading } = usePermissions();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState<string>("");
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  // Data hooks
  const { recentAnnouncements, isLoading: announcementsLoading } = useRecentAnnouncements();
  const { feedbackQuery } = useFeedback();
  const { events } = useEvents();
  const { tasks, isLoading: tasksLoading } = useTasks();
  const { priorities, isLoading: prioritiesLoading } = usePriorities();

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name, display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setFirstName((data as any).first_name || "");
      });
  }, [user]);

  const isCompact = width < 600;

  // ─── Derived data ────────────────────────────────────────────────────────

  // Feedback distribution
  const feedbackList = feedbackQuery.data || [];
  const sentimentCounts = { positive: 0, negative: 0 };
  feedbackList.forEach((f) => {
    if (f.sentiment in sentimentCounts) sentimentCounts[f.sentiment as keyof typeof sentimentCounts]++;
  });
  const feedbackChartData = Object.entries(SENTIMENT_CONFIG).map(([key, cfg]) => ({
    name: cfg.label,
    value: sentimentCounts[key as keyof typeof sentimentCounts],
    color: cfg.color,
    bg: cfg.bg,
    icon: cfg.icon,
  }));
  const feedbackTotal = feedbackList.length;

  // Events: upcoming (today or future), top 4
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const upcomingEvents = (events.data || [])
    .filter((e) => e.event_date >= todayStr)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 4);

  // Tasks: incomplete, assigned to current user, sorted by due date
  const flattenTasks = (taskList: any[]): any[] => {
    const result: any[] = [];
    for (const t of taskList) {
      result.push(t);
      if (t.subtasks?.length) result.push(...flattenTasks(t.subtasks));
    }
    return result;
  };
  const allTasks = flattenTasks(tasks);
  const myTasks = allTasks
    .filter((t) => !t.completed && (t.assigned_to === user?.id || t.created_by === user?.id))
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    })
    .slice(0, 4);

  const overdueTasks = myTasks.filter((t) => t.due_date && t.due_date < todayStr);

  const myPriorities = priorities.filter((p) => p.assigned_to === user?.id);
  const allPriorities = priorities.slice(0, 4);

  // ─── Loading spinner ────────────────────────────────────────────────────

  const Spinner = () => (
    <div style={{ padding: 24, textAlign: "center" }}>
      <div style={{ width: 18, height: 18, border: "2px solid #C9CED4", borderTopColor: "#415162", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ─── Card wrapper ────────────────────────────────────────────────────────

  const Card = ({ icon, title, action, actionLabel, badge, children }: {
    icon: React.ReactNode;
    title: string;
    action?: () => void;
    actionLabel?: string;
    badge?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div style={{ background: "#E7EBEF", border: "1px solid #D5DAE0", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid #D5DAE0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon}
          <span style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: "#415162" }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {badge}
          {action && (
            <button
              onClick={action}
              style={{ fontSize: 12, color: "#52657A", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 2, background: "none", border: "none", padding: 0 }}
            >
              {actionLabel || "View All"} <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <NotificationBell />
          </HeaderLogo>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px 100px" }}>
        {/* Greeting */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#2D3748", marginBottom: 2 }}>
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </div>
          <div style={{ fontSize: 12, color: "#8A9AAB" }}>{getDayLabel()} · {getAcademicYear()}</div>
        </div>

        {/* Dashboard Grid */}
        <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 16 }}>

          {/* ── Announcements ── */}
          <Card
            icon={<Megaphone size={16} strokeWidth={2.2} color="#415162" />}
            title="Announcements"
            action={() => navigate("/announcements")}
          >
            {announcementsLoading ? <Spinner /> : recentAnnouncements.length === 0 ? (
              <div style={{ fontSize: 13, color: "#8A9AAB", padding: "8px 0" }}>No announcements yet.</div>
            ) : (
              recentAnnouncements.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    padding: "10px 0",
                    borderBottom: i < recentAnnouncements.length - 1 ? "1px solid #D5DAE0" : undefined,
                    cursor: "pointer",
                  }}
                  onClick={() => navigate("/announcements")}
                >
                  <div style={{ fontSize: 11, color: "#52657A", fontWeight: 600, marginBottom: 3 }}>
                    {formatDate(a.created_at.split("T")[0])}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#3D3D3A", marginBottom: 3 }}>{a.title}</div>
                  <div style={{
                    fontSize: 12, color: "#6B7280", lineHeight: 1.45,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden",
                  }}>
                    {a.body.replace(/<[^>]*>/g, "").replace(/https?:\/\/(?:www\.)?(?:loom\.com|youtube\.com|youtu\.be|vimeo\.com)\S*/gi, "").trim() || a.title}
                  </div>
                </div>
              ))
            )}
          </Card>

          {/* ── Feedback Distribution ── */}
          <Card
            icon={<ThumbsUp size={16} strokeWidth={2.2} color="#415162" />}
            title="Feedback Distribution"
            action={() => navigate("/feedback")}
            actionLabel="Details"
          >
            {feedbackQuery.isLoading ? <Spinner /> : feedbackTotal === 0 ? (
              <div style={{ fontSize: 13, color: "#8A9AAB", padding: "8px 0" }}>No feedback recorded yet.</div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexDirection: isCompact ? "column" : "row" }}>
                {/* Donut */}
                <div style={{ position: "relative", width: 150, height: 150, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={feedbackChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={68}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="#E7EBEF"
                        onMouseEnter={(_, i) => setHoveredSlice(i)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      >
                        {feedbackChartData.map((d, i) => (
                          <Cell
                            key={d.name}
                            fill={d.color}
                            opacity={hoveredSlice === null || hoveredSlice === i ? 1 : 0.4}
                            style={{ transition: "opacity 0.2s", cursor: "pointer" }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip total={feedbackTotal} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#415162", lineHeight: 1 }}>{feedbackTotal}</div>
                    <div style={{ fontSize: 10, color: "#52657A", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Total</div>
                  </div>
                </div>
                {/* Legend */}
                <div style={{ flex: 1, width: isCompact ? "100%" : undefined }}>
                  {feedbackChartData.map((d) => {
                    const pct = feedbackTotal > 0 ? ((d.value / feedbackTotal) * 100).toFixed(0) : "0";
                    const Icon = d.icon;
                    return (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: d.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={12} strokeWidth={2.5} color={d.color} />
                        </div>
                        <span style={{ fontSize: 12, color: "#3D3D3A", fontWeight: 500, flex: 1 }}>{d.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#3D3D3A" }}>{d.value}</span>
                        <span style={{ fontSize: 11, color: "#52657A", width: 38, textAlign: "right" }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* ── Upcoming Events ── */}
          <Card
            icon={<CalendarDays size={16} strokeWidth={2.2} color="#415162" />}
            title="Upcoming Events"
            action={() => navigate("/events")}
          >
            {events.isLoading ? <Spinner /> : upcomingEvents.length === 0 ? (
              <div style={{ fontSize: 13, color: "#8A9AAB", padding: "8px 0" }}>No upcoming events.</div>
            ) : (
              upcomingEvents.map((ev, i) => {
                const d = new Date(ev.event_date + "T00:00:00");
                const mo = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                const day = d.getDate();
                const catColor = EVENT_CATEGORY_COLORS[ev.category as EventCategory] || "#52657A";
                const catLabel = EVENT_CATEGORY_LABELS[ev.category as EventCategory] || ev.category;
                return (
                  <div
                    key={ev.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 0",
                      borderBottom: i < upcomingEvents.length - 1 ? "1px solid #D5DAE0" : undefined,
                      cursor: "pointer",
                    }}
                    onClick={() => navigate("/events")}
                  >
                    <div style={{ minWidth: 44, textAlign: "center", background: "#415162", color: "#fff", borderRadius: 7, padding: "6px 6px 4px", lineHeight: 1.1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{mo}</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{day}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#3D3D3A" }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: "#52657A", marginTop: 2 }}>
                        {ev.start_time || ""}
                        <span style={{
                          display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 7px",
                          borderRadius: 4, marginLeft: ev.start_time ? 6 : 0, background: catColor, color: "#fff",
                          textTransform: "uppercase" as const, letterSpacing: "0.03em",
                        }}>{catLabel}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </Card>

          {/* ── My Tasks ── */}
          <Card
            icon={<ClipboardCheck size={16} strokeWidth={2.2} color="#415162" />}
            title="My Tasks"
            action={() => navigate("/tasks")}
            badge={overdueTasks.length > 0 ? (
              <span style={{
                fontSize: 11, fontWeight: 700, background: "#FBF3E0", color: "#D4A017",
                padding: "2px 8px", borderRadius: 5,
              }}>
                {overdueTasks.length} overdue
              </span>
            ) : undefined}
          >
            {tasksLoading ? <Spinner /> : myTasks.length === 0 ? (
              <div style={{ fontSize: 13, color: "#8A9AAB", padding: "8px 0" }}>No pending tasks.</div>
            ) : (
              myTasks.map((task, i) => {
                const isOverdue = task.due_date && task.due_date < todayStr;
                return (
                  <div
                    key={task.id}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "10px 0",
                      borderBottom: i < myTasks.length - 1 ? "1px solid #D5DAE0" : undefined,
                      cursor: "pointer",
                    }}
                    onClick={() => navigate("/tasks")}
                  >
                    <div style={{ marginTop: 2, flexShrink: 0, color: isOverdue ? "#D4A017" : "#4A846C" }}>
                      {isOverdue ? <AlertTriangle size={16} strokeWidth={2.2} /> : <Clock size={16} strokeWidth={2.2} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#3D3D3A" }}>{task.title}</div>
                      <div style={{
                        fontSize: 11, fontWeight: isOverdue ? 700 : 500,
                        color: isOverdue ? "#D4A017" : "#52657A",
                        marginTop: 2, display: "flex", alignItems: "center", gap: 4,
                      }}>
                        {task.due_date ? (isOverdue ? daysUntil(task.due_date) : `Due ${formatDate(task.due_date)}`) : "No due date"}
                        {isOverdue && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: "#FBF3E0", color: "#D4A017", padding: "1px 6px", borderRadius: 4, marginLeft: 4 }}>
                            OVERDUE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </Card>

          {/* ── My Priorities ── */}
          <Card
            icon={<Hash size={16} strokeWidth={2.2} color="#415162" />}
            title="My Priorities"
            action={() => navigate("/tasks")}
          >
            {prioritiesLoading ? <Spinner /> : myPriorities.length === 0 ? (
              <div style={{ fontSize: 13, color: "#8A9AAB", padding: "8px 0" }}>No priorities assigned to you.</div>
            ) : (
              myPriorities.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 0",
                    borderBottom: i < myPriorities.length - 1 ? "1px solid #D5DAE0" : undefined,
                    cursor: "pointer",
                  }}
                  onClick={() => navigate("/tasks")}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", background: "#415162",
                    color: "#fff", fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {p.display_order + 1}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#3D3D3A", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                    {p.title}
                  </div>
                </div>
              ))
            )}
          </Card>

          {/* ── Program Priorities ── */}
          <Card
            icon={<Hash size={16} strokeWidth={2.2} color="#415162" />}
            title="Program Priorities"
            action={() => navigate("/tasks")}
          >
            {prioritiesLoading ? <Spinner /> : allPriorities.length === 0 ? (
              <div style={{ fontSize: 13, color: "#8A9AAB", padding: "8px 0" }}>No program priorities yet.</div>
            ) : (
              allPriorities.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 0",
                    borderBottom: i < allPriorities.length - 1 ? "1px solid #D5DAE0" : undefined,
                    cursor: "pointer",
                  }}
                  onClick={() => navigate("/tasks")}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", background: "#415162",
                    color: "#fff", fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {p.display_order + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#3D3D3A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {p.title}
                    </div>
                    {p.assigned_name && (
                      <div style={{ fontSize: 11, color: "#52657A", marginTop: 2 }}>
                        {p.assigned_name}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </Card>

        </div>
      </main>
    </div>
  );
};

export default Home;
