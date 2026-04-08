import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, Clock, Calendar, Shirt, Users, CheckCircle, XCircle,
  Phone, Pencil, X, Save, User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useRotations, Rotation } from "@/hooks/useRotations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";

/* ── Inline markdown renderer (same as Handbook) ── */
function renderMarkdown(md: string) {
  if (!md || !md.trim()) return null;
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const renderInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const re = /\*\*(.+?)\*\*/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let k = 0;
    while ((match = re.exec(text)) !== null) {
      if (match.index > last) parts.push(text.slice(last, match.index));
      parts.push(<strong key={`b${k++}`} style={{ color: "#333", fontWeight: 500 }}>{match[1]}</strong>);
      last = re.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  };
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }
    if (line.startsWith("## ")) {
      elements.push(<h3 key={key++} style={{ fontSize: 15, fontWeight: 600, color: "#415162", margin: "20px 0 8px" }}>{line.slice(3)}</h3>);
      i++; continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, "")); i++; }
      elements.push(<ol key={key++} style={{ paddingLeft: 20, margin: "6px 0 12px" }}>{items.map((item, j) => <li key={j} style={{ fontSize: 14, lineHeight: 1.7, color: "#555", marginBottom: 3 }}>{renderInline(item)}</li>)}</ol>);
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("  - ")) {
      const items: { text: string; indent: number }[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("  - "))) {
        items.push({ text: lines[i].replace(/^\s*- /, ""), indent: lines[i].startsWith("  - ") ? 1 : 0 });
        i++;
      }
      elements.push(<ul key={key++} style={{ paddingLeft: 20, margin: "6px 0 12px" }}>{items.map((item, j) => <li key={j} style={{ fontSize: 14, lineHeight: 1.7, color: "#555", marginBottom: 3, marginLeft: item.indent * 20 }}>{renderInline(item.text)}</li>)}</ul>);
      continue;
    }
    elements.push(<p key={key++} style={{ fontSize: 14, lineHeight: 1.7, color: "#555", margin: "0 0 10px" }}>{renderInline(line)}</p>);
    i++;
  }
  return <>{elements}</>;
}

/* ── Editable section component ── */
function EditableSection({ label, field, value, rotationId, isAdmin }: {
  label: string; field: string; value: string; rotationId: string; isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rotations").update({
        [field]: draft,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      } as any).eq("id", rotationId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rotations"] }); setEditing(false); toast({ title: "Saved" }); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  if (!value && !isAdmin) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#415162", margin: 0, paddingBottom: 4, borderBottom: "1px solid #E7EBEF", flex: 1 }}>{label}</h3>
        {isAdmin && !editing && (
          <button onClick={() => { setDraft(value); setEditing(true); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#888", padding: 4, marginLeft: 8 }}>
            <Pencil style={{ width: 13, height: 13 }} />
          </button>
        )}
      </div>
      {editing ? (
        <div>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} style={{
            width: "100%", minHeight: 200, padding: 12, fontSize: 13,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            lineHeight: 1.6, color: "#333", background: "#fff",
            border: "1px solid #C9CED4", borderRadius: 6, outline: "none", resize: "vertical",
          }} />
          <div style={{ display: "flex", gap: 8, marginTop: 6, justifyContent: "flex-end" }}>
            <button onClick={() => setEditing(false)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>
              <X style={{ width: 12, height: 12 }} /> Cancel
            </button>
            <button onClick={() => save.mutate()} disabled={save.isPending} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", fontSize: 12, color: "#fff", background: save.isPending ? "#8a9baa" : "#415162", border: "none", borderRadius: 5, cursor: save.isPending ? "not-allowed" : "pointer" }}>
              <Save style={{ width: 12, height: 12 }} /> {save.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : value ? renderMarkdown(value) : (
        <p style={{ fontSize: 13, color: "#bbb", fontStyle: "italic" }}>No content yet. Click the pencil to add.</p>
      )}
    </div>
  );
}

/* ── Metadata card ── */
function MetaCard({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.FC<{ style?: React.CSSProperties }> }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E7EBEF", borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: "#999", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: 0.3, display: "flex", alignItems: "center", gap: 4 }}>
        {Icon && <Icon style={{ width: 11, height: 11 }} />}
        {label}
      </div>
      <div style={{ fontSize: 13, color: "#444", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const Rotations = () => {
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { data: rotations, isLoading } = useRotations();
  const [filter, setFilter] = useState<"all" | "required" | "elective" | "vacation">("all");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const filtered = (rotations?.filter((r) => {
    if (filter === "required") return r.rotation_type === "required";
    if (filter === "elective") return r.rotation_type === "elective";
    if (filter === "vacation") return r.vacation_eligible;
    return true;
  }) || []).sort((a, b) => a.name.localeCompare(b.name));

  const selected = selectedSlug ? rotations?.find((r) => r.slug === selectedSlug) : null;

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 14px", fontSize: 12, borderRadius: 20, cursor: "pointer",
    border: active ? "1px solid #415162" : "1px solid #C9CED4",
    background: active ? "#415162" : "#fff",
    color: active ? "#fff" : "#666",
  });

  const narrativeSections: { label: string; field: keyof Rotation }[] = [
    { label: "Rotation overview", field: "overview" },
    { label: "Pre-rotation preparation", field: "preparation" },
    { label: "Schedule details", field: "schedule_details" },
    { label: "Attendings & providers", field: "attendings_notes" },
    { label: "Procedures & logging", field: "procedures" },
    { label: "EMR & documentation", field: "emr_notes" },
    { label: "Things to learn", field: "learning_goals" },
    { label: "Logistics & notes", field: "logistics" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#F5F3EE" }}>
      <header className="sticky top-0 z-40" style={{ background: "#415162" }}>
        <div className="flex items-center h-14 px-4">
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <NotificationBell />
          </HeaderLogo>
        </div>
      </header>

      <main className="px-4 py-5 pb-24" style={{ maxWidth: 1200, margin: "0 auto" }}>
        {selected ? (
          /* ── Detail View ── */
          <div>
            <button onClick={() => setSelectedSlug(null)} style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#415162",
              background: "transparent", border: "none", cursor: "pointer", padding: 0, marginBottom: 16,
            }}>
              <ArrowLeft style={{ width: 16, height: 16 }} /> Back to rotations
            </button>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: "#333", margin: 0 }}>{selected.name}</h1>
              <span style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 10, fontWeight: 500,
                background: selected.rotation_type === "required" ? "#E6F1FB" : "#FAEEDA",
                color: selected.rotation_type === "required" ? "#0C447C" : "#633806",
              }}>
                {selected.rotation_type === "required" ? "Required" : "Elective"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>
              Updated {new Date(selected.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>

            {/* Metadata grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 24 }}>
              {selected.location && <MetaCard label="Location" value={selected.location} icon={MapPin} />}
              {selected.hours && <MetaCard label="Hours" value={selected.hours} icon={Clock} />}
              {selected.duration && <MetaCard label="Duration" value={selected.duration} icon={Calendar} />}
              {selected.attire && <MetaCard label="Attire" value={selected.attire} icon={Shirt} />}
              <MetaCard label="PGY levels" value={selected.pgy_levels.map((p) => `PGY-${p}`).join(", ")} icon={Users} />
              <MetaCard label="Vacation eligible" value={
                selected.vacation_eligible
                  ? <span style={{ color: "#0F6E56", fontWeight: 500 }}>Yes</span>
                  : <span style={{ color: "#A32D2D", fontWeight: 500 }}>No</span>
              } />
              {selected.rotation_director && <MetaCard label="Rotation director" value={selected.rotation_director} icon={User} />}
              {selected.contact_info && <MetaCard label="Contact" value={selected.contact_info} icon={Phone} />}
            </div>

            {/* Narrative sections */}
            {narrativeSections.map(({ label, field }) => (
              <EditableSection
                key={field}
                label={label}
                field={field}
                value={selected[field] as string}
                rotationId={selected.id}
                isAdmin={!!isAdmin}
              />
            ))}
          </div>
        ) : (
          /* ── List View ── */
          <div>
            {isLoading && <p style={{ fontSize: 14, color: "#999" }}>Loading rotations...</p>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {filtered.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedSlug(r.slug)}
                  style={{
                    background: "#fff", border: "1px solid #E7EBEF", borderRadius: 10,
                    padding: 16, cursor: "pointer", transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#C9CED4")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E7EBEF")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "#333" }}>{r.name}</span>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 500,
                      background: r.rotation_type === "required" ? "#E6F1FB" : "#FAEEDA",
                      color: r.rotation_type === "required" ? "#0C447C" : "#633806",
                    }}>
                      {r.rotation_type === "required" ? "Required" : "Elective"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    {r.location && (
                      <span style={{ fontSize: 11, color: "#888", display: "flex", alignItems: "center", gap: 3 }}>
                        <MapPin style={{ width: 12, height: 12, color: "#aaa" }} />
                        {r.location.split(",")[0].split("\n")[0]}
                      </span>
                    )}
                    {r.hours && (
                      <span style={{ fontSize: 11, color: "#888", display: "flex", alignItems: "center", gap: 3 }}>
                        <Clock style={{ width: 12, height: 12, color: "#aaa" }} />
                        {r.hours.length > 30 ? r.hours.slice(0, 30) + "…" : r.hours}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 13, color: "#777", lineHeight: 1.5,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden",
                  }}>
                    {r.overview || "Details pending."}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

    </div>
  );
};

export default Rotations;
