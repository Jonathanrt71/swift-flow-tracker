import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, Clock, Calendar, Shirt, Users,
  Phone, Pencil, X, Save, User, Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useRotations, Rotation } from "@/hooks/useRotations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";
import SectionTipTapEditor from "@/components/shared/SectionTipTapEditor";
import { usePermissions } from "@/hooks/usePermissions";

/* ── Editable TipTap section ── */
function EditableSection({ label, field, value, rotationId, canEdit }: {
  label: string; field: string; value: string; rotationId: string; canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const draftRef = useRef("");
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("rotations").update({
        [field]: draftRef.current,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      }).eq("id", rotationId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rotations"] }); setEditing(false); toast({ title: "Saved" }); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  if (!value && !canEdit) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#415162", margin: 0, paddingBottom: 4, borderBottom: "1px solid #E7EBEF", flex: 1 }}>{label}</h3>
        {canEdit && !editing && (
          <button onClick={() => { draftRef.current = value || ""; setEditing(true); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, color: "#415162", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer", marginLeft: 8 }}>
            <Pencil style={{ width: 12, height: 12 }} /> Edit
          </button>
        )}
      </div>
      {editing ? (
        <>
          <SectionTipTapEditor
            content={draftRef.current}
            onChange={(html) => { draftRef.current = html; }}
            minHeight={200}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={() => setEditing(false)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 5, cursor: "pointer" }}>
              <X style={{ width: 12, height: 12 }} /> Cancel
            </button>
            <button onClick={() => save.mutate()} disabled={save.isPending} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 12, color: "#fff", background: save.isPending ? "#8a9baa" : "#415162", border: "none", borderRadius: 5, cursor: save.isPending ? "not-allowed" : "pointer" }}>
              <Save style={{ width: 12, height: 12 }} /> {save.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      ) : value ? (
        <SectionTipTapEditor content={value} onChange={() => {}} readOnly />
      ) : (
        <p style={{ fontSize: 13, color: "#bbb", fontStyle: "italic" }}>No content yet. {canEdit && "Click Edit to add content."}</p>
      )}
    </div>
  );
}

/* ── Editable metadata card ── */
function EditableMetaCard({ label, value, field, rotationId, canEdit, icon: Icon }: {
  label: string; value: string; field: string; rotationId: string; canEdit: boolean; icon?: React.FC<{ style?: React.CSSProperties }>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("rotations").update({
        [field]: draft.trim() || null,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      }).eq("id", rotationId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rotations"] }); setEditing(false); toast({ title: "Saved" }); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  return (
    <div
      onClick={() => { if (canEdit && !editing) { setDraft(value || ""); setEditing(true); } }}
      style={{ background: "#E7EBEF", borderRadius: 8, padding: "10px 12px", cursor: canEdit ? "pointer" : "default", minHeight: 52 }}
    >
      <div style={{ fontSize: 11, color: "#5F7285", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
        {Icon && <Icon style={{ width: 11, height: 11 }} />}
        <span style={{ flex: 1 }}>{label}</span>
        {editing && (
          <div style={{ display: "flex", gap: 3 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setEditing(false)} style={{ padding: "1px 6px", fontSize: 10, color: "#777", background: "#fff", border: "0.5px solid #C9CED4", borderRadius: 3, cursor: "pointer" }}>Cancel</button>
            <button onClick={() => save.mutate()} style={{ padding: "1px 6px", fontSize: 10, color: "#fff", background: "#415162", border: "none", borderRadius: 3, cursor: "pointer" }}>Save</button>
          </div>
        )}
      </div>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save.mutate(); if (e.key === "Escape") setEditing(false); }}
          onClick={e => e.stopPropagation()}
          style={{ width: "100%", padding: "5px 8px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 4, outline: "none", background: "#fff", boxSizing: "border-box", marginTop: 2 }}
        />
      ) : (
        <div style={{ fontSize: 13, color: value ? "#333" : "#bbb", fontWeight: 500, fontStyle: value ? "normal" : "italic" }}>
          {value || (canEdit ? "Tap to edit" : "—")}
        </div>
      )}
    </div>
  );
}

/* ── Vacation toggle card ── */
function VacationCard({ value, rotationId, canEdit }: { value: boolean; rotationId: string; canEdit: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("rotations").update({ vacation_eligible: !value, updated_at: new Date().toISOString(), updated_by: user?.id || null }).eq("id", rotationId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rotations"] }); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
  return (
    <div onClick={() => { if (canEdit) toggle.mutate(); }} style={{ background: "#E7EBEF", borderRadius: 8, padding: "10px 12px", cursor: canEdit ? "pointer" : "default", minHeight: 52 }}>
      <div style={{ fontSize: 11, color: "#5F7285", marginBottom: 2 }}>Vacation eligible</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: value ? "#0F6E56" : "#A32D2D" }}>{value ? "Yes" : "No"}{canEdit ? " (tap to toggle)" : ""}</div>
    </div>
  );
}

/* ── PGY Levels card ── */
function PgyCard({ value, rotationId, canEdit }: { value: string[]; rotationId: string; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("rotations").update({ pgy_levels: draft, updated_at: new Date().toISOString(), updated_by: user?.id || null }).eq("id", rotationId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rotations"] }); setEditing(false); toast({ title: "Saved" }); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
  return (
    <div onClick={() => { if (canEdit && !editing) { setDraft([...value]); setEditing(true); } }} style={{ background: "#E7EBEF", borderRadius: 8, padding: "10px 12px", cursor: canEdit ? "pointer" : "default", minHeight: 52 }}>
      <div style={{ fontSize: 11, color: "#5F7285", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}><Users style={{ width: 11, height: 11 }} /> PGY levels</div>
      {editing ? (
        <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }} onClick={e => e.stopPropagation()}>
          {["1", "2", "3"].map(l => (
            <button key={l} onClick={() => setDraft(prev => prev.includes(l) ? prev.filter(p => p !== l) : [...prev, l].sort())}
              style={{ padding: "2px 10px", fontSize: 12, borderRadius: 4, cursor: "pointer", border: "1px solid #C9CED4", background: draft.includes(l) ? "#415162" : "#fff", color: draft.includes(l) ? "#fff" : "#333" }}>
              {l}
            </button>
          ))}
          <button onClick={() => save.mutate()} style={{ padding: "2px 8px", fontSize: 11, color: "#fff", background: "#415162", border: "none", borderRadius: 4, cursor: "pointer", marginLeft: 4 }}><Save style={{ width: 10, height: 10 }} /></button>
          <button onClick={() => setEditing(false)} style={{ padding: "2px 6px", fontSize: 11, color: "#777", background: "#fff", border: "1px solid #C9CED4", borderRadius: 4, cursor: "pointer" }}><X style={{ width: 10, height: 10 }} /></button>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>{value.map(p => `PGY-${p}`).join(", ") || "—"}</div>
      )}
    </div>
  );
}

/* ── Type card ── */
function TypeCard({ value, rotationId, canEdit }: { value: string; rotationId: string; canEdit: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("rotations").update({ rotation_type: value === "required" ? "elective" : "required", updated_at: new Date().toISOString(), updated_by: user?.id || null }).eq("id", rotationId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rotations"] }); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });
  return (
    <div onClick={() => { if (canEdit) toggle.mutate(); }} style={{ background: "#E7EBEF", borderRadius: 8, padding: "10px 12px", cursor: canEdit ? "pointer" : "default", minHeight: 52 }}>
      <div style={{ fontSize: 11, color: "#5F7285", marginBottom: 2 }}>Type</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: value === "required" ? "#0C447C" : "#633806" }}>{value === "required" ? "Required" : "Elective"}{canEdit ? " (tap to toggle)" : ""}</div>
    </div>
  );
}

const Rotations = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { has: hasPerm } = usePermissions();
  const canEdit = isAdmin || hasPerm("rotations.edit");
  const { data: rotations, isLoading } = useRotations();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"required" | "elective">("required");
  const [newPgy, setNewPgy] = useState<string[]>(["1", "2", "3"]);

  const createRotation = useMutation({
    mutationFn: async () => {
      const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
      const maxOrder = (rotations || []).reduce((m, r) => Math.max(m, r.display_order), 0);
      const { data, error } = await (supabase as any).from("rotations").insert({
        name: newName.trim(), slug, rotation_type: newType, pgy_levels: newPgy,
        display_order: maxOrder + 10, overview: "", goals_objectives: "", preparation: "",
        schedule_details: "", attendings_notes: "", patient_care: "", procedures: "",
        emr_notes: "", evaluation_methods: "", logistics: "", vacation_eligible: false,
        updated_by: user?.id || null,
      }).select("slug").single();
      if (error) throw error;
      return data.slug;
    },
    onSuccess: (slug: string) => {
      qc.invalidateQueries({ queryKey: ["rotations"] });
      setShowCreate(false); setNewName(""); setNewType("required"); setNewPgy(["1", "2", "3"]);
      toast({ title: "Rotation created" });
      setTimeout(() => setSelectedSlug(slug), 300);
    },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  const filtered = (rotations || []).sort((a, b) => a.name.localeCompare(b.name));
  const selected = selectedSlug ? rotations?.find((r) => r.slug === selectedSlug) : null;

  const narrativeSections: { label: string; field: keyof Rotation }[] = [
    { label: "Rotation overview", field: "overview" },
    { label: "Goals & objectives", field: "goals_objectives" },
    { label: "Daily schedule & expectations", field: "schedule_details" },
    { label: "Clinical team & supervision", field: "attendings_notes" },
    { label: "Patient care responsibilities", field: "patient_care" },
    { label: "Procedures & logging", field: "procedures" },
    { label: "EMR & documentation", field: "emr_notes" },
    { label: "Evaluation methods", field: "evaluation_methods" },
    { label: "Pre-rotation preparation", field: "preparation" },
    { label: "Logistics & tips", field: "logistics" },
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

      <main className="px-4 py-5 pb-24" style={{ maxWidth: 900, margin: "0 auto" }}>
        {selected ? (
          <div>
            <button onClick={() => setSelectedSlug(null)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#415162", background: "transparent", border: "none", cursor: "pointer", padding: 0, marginBottom: 16 }}>
              <ArrowLeft style={{ width: 16, height: 16 }} /> Back to rotations
            </button>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: "#333", margin: 0 }}>{selected.name}</h1>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, fontWeight: 500, background: selected.rotation_type === "required" ? "#E6F1FB" : "#FAEEDA", color: selected.rotation_type === "required" ? "#0C447C" : "#633806" }}>
                {selected.rotation_type === "required" ? "Required" : "Elective"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>
              Updated {new Date(selected.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 24 }}>
              <EditableMetaCard label="Location" value={selected.location || ""} field="location" rotationId={selected.id} canEdit={canEdit} icon={MapPin} />
              <EditableMetaCard label="Hours" value={selected.hours || ""} field="hours" rotationId={selected.id} canEdit={canEdit} icon={Clock} />
              <EditableMetaCard label="Duration" value={selected.duration || ""} field="duration" rotationId={selected.id} canEdit={canEdit} icon={Calendar} />
              <EditableMetaCard label="Attire" value={selected.attire || ""} field="attire" rotationId={selected.id} canEdit={canEdit} icon={Shirt} />
              <PgyCard value={selected.pgy_levels} rotationId={selected.id} canEdit={canEdit} />
              <VacationCard value={selected.vacation_eligible} rotationId={selected.id} canEdit={canEdit} />
              <EditableMetaCard label="Rotation director" value={selected.rotation_director || ""} field="rotation_director" rotationId={selected.id} canEdit={canEdit} icon={User} />
              <EditableMetaCard label="Contact" value={selected.contact_info || ""} field="contact_info" rotationId={selected.id} canEdit={canEdit} icon={Phone} />
              <TypeCard value={selected.rotation_type} rotationId={selected.id} canEdit={canEdit} />
            </div>
            {narrativeSections.map(({ label, field }) => (
              <EditableSection key={field} label={label} field={field} value={selected[field] as string} rotationId={selected.id} canEdit={canEdit} />
            ))}
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: "#2D3748", margin: 0 }}>Rotations</h1>
              {canEdit && (
                <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "transparent", border: "none", cursor: "pointer", color: "#415162" }}>
                  <Plus style={{ width: 20, height: 20 }} />
                </button>
              )}
            </div>
            {isLoading && <p style={{ fontSize: 14, color: "#999" }}>Loading rotations...</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {filtered.map((r) => (
                <div key={r.id} onClick={() => setSelectedSlug(r.slug)}
                  style={{ background: "#E7EBEF", border: "1px solid #D5DAE0", borderRadius: 10, padding: 16, cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#C9CED4")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#D5DAE0")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "#333" }}>{r.name}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 500, background: r.rotation_type === "required" ? "#E6F1FB" : "#FAEEDA", color: r.rotation_type === "required" ? "#0C447C" : "#633806" }}>
                      {r.rotation_type === "required" ? "Required" : "Elective"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    {r.location && <span style={{ fontSize: 11, color: "#888", display: "flex", alignItems: "center", gap: 3 }}><MapPin style={{ width: 12, height: 12, color: "#aaa" }} />{r.location.split(",")[0].split("\n")[0]}</span>}
                    {r.hours && <span style={{ fontSize: 11, color: "#888", display: "flex", alignItems: "center", gap: 3 }}><Clock style={{ width: 12, height: 12, color: "#aaa" }} />{r.hours.length > 30 ? r.hours.slice(0, 30) + "…" : r.hours}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showCreate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(65,81,98,0.45)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#F5F3EE", borderRadius: 10, padding: 20, maxWidth: 400, width: "100%", border: "1px solid #C9CED4" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#2D3748", margin: 0 }}>New rotation</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, color: "#aaa" }}><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>Title</label>
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && newName.trim()) createRotation.mutate(); }}
                  placeholder="Rotation name"
                  style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["required", "elective"] as const).map(t => (
                    <button key={t} onClick={() => setNewType(t)}
                      style={{ flex: 1, padding: "7px 0", fontSize: 13, borderRadius: 6, cursor: "pointer", border: "1px solid #C9CED4", background: newType === t ? "#415162" : "#fff", color: newType === t ? "#fff" : "#333", fontWeight: newType === t ? 500 : 400 }}>
                      {t === "required" ? "Required" : "Elective"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#5F7285", display: "block", marginBottom: 4 }}>PGY levels</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["1", "2", "3"].map(l => (
                    <button key={l} onClick={() => setNewPgy(prev => prev.includes(l) ? prev.filter(p => p !== l) : [...prev, l].sort())}
                      style={{ flex: 1, padding: "7px 0", fontSize: 13, borderRadius: 6, cursor: "pointer", border: "1px solid #C9CED4", background: newPgy.includes(l) ? "#415162" : "#fff", color: newPgy.includes(l) ? "#fff" : "#333", fontWeight: newPgy.includes(l) ? 500 : 400 }}>
                      PGY-{l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => createRotation.mutate()} disabled={!newName.trim() || createRotation.isPending}
              className="w-full rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "#415162", marginTop: 16 }}>
              {createRotation.isPending ? "Creating…" : "Save rotation"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rotations;
