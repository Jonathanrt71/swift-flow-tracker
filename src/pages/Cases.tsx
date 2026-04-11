import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isPast } from "date-fns";
import { Plus, X, Trash2, ChevronLeft, ChevronRight, GripVertical, Eye, EyeOff, Clock, Upload, Pencil, Send, Bold, Italic, List, ListOrdered } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";

// ── Types ────────────────────────────────────────────────────────────────
interface Slide {
  image_url: string;
  caption: string;
  is_reveal: boolean;
}
interface ClinicalCase {
  id: string;
  title: string;
  description: string | null;
  category: string;
  author_id: string | null;
  author_name: string;
  slides: Slide[];
  published: boolean;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ["EKG", "Derm", "Radiology", "Labs", "MSK", "Cardiology", "Pulmonary", "GI", "Neuro", "Other"];
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  EKG:        { bg: "#E6F1FB", text: "#0C447C" },
  Derm:       { bg: "#FAECE7", text: "#712B13" },
  Radiology:  { bg: "#EEEDFE", text: "#3C3489" },
  Labs:       { bg: "#E1F5EE", text: "#085041" },
  MSK:        { bg: "#FAEEDA", text: "#633806" },
  Cardiology: { bg: "#FBEAF0", text: "#72243E" },
  Pulmonary:  { bg: "#E6F1FB", text: "#0C447C" },
  GI:         { bg: "#FAEEDA", text: "#633806" },
  Neuro:      { bg: "#EEEDFE", text: "#3C3489" },
  Other:      { bg: "#F1EFE8", text: "#444441" },
};

const getCatColor = (cat: string) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;

// ── Zoom Overlay with pinch-zoom ─────────────────────────────────────────
// ── Component ────────────────────────────────────────────────────────────
const Cases = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { has: hasPerm } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = hasPerm("cases.edit", "full");

  const [filterCat, setFilterCat] = useState<string>("All");
  const [viewingCase, setViewingCase] = useState<ClinicalCase | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [revealShown, setRevealShown] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCase, setEditingCase] = useState<ClinicalCase | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // ── Queries ──
  const casesQuery = useQuery({
    queryKey: ["clinical_cases"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("clinical_cases" as any).select("*").order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as ClinicalCase[];
    },
  });

  const cases = useMemo(() => {
    if (!casesQuery.data) return [];
    const now = new Date();
    return casesQuery.data.filter(c => {
      if (isAdmin || canEdit) return true;
      if (!c.published) return false;
      if (c.scheduled_at && !isPast(parseISO(c.scheduled_at))) return false;
      return true;
    });
  }, [casesQuery.data, isAdmin, canEdit]);

  const filtered = useMemo(() => {
    if (filterCat === "All") return cases;
    return cases.filter(c => c.category === filterCat);
  }, [cases, filterCat]);

  const activeCats = useMemo(() => {
    const s = new Set(cases.map(c => c.category));
    return ["All", ...CATEGORIES.filter(c => s.has(c))];
  }, [cases]);

  // ── Mutations ──
  const createCase = useMutation({
    mutationFn: async (data: { title: string; description: string; category: string; slides: Slide[]; published: boolean; scheduled_at: string | null }) => {
      const { error } = await (supabase.from("clinical_cases" as any).insert({
        ...data,
        author_id: user?.id,
        author_name: user?.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ""}`.trim() : user?.email || "Unknown",
        slides: data.slides as any,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinical_cases"] }); toast({ title: "Case created" }); setShowCreate(false); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("clinical_cases" as any).delete().eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinical_cases"] }); toast({ title: "Case deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await (supabase.from("clinical_cases" as any).update({ published }).eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clinical_cases"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateCase = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title: string; description: string; category: string; slides: Slide[]; published: boolean; scheduled_at: string | null }) => {
      const { error } = await (supabase.from("clinical_cases" as any).update({
        title: data.title,
        description: data.description,
        category: data.category,
        slides: data.slides as any,
        published: data.published,
        scheduled_at: data.scheduled_at,
      }).eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinical_cases"] }); toast({ title: "Case updated" }); setEditingCase(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const postNow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("clinical_cases" as any).update({ published: true, scheduled_at: null }).eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinical_cases"] }); toast({ title: "Case published" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Viewer logic ──
  const openCase = (c: ClinicalCase) => { setViewingCase(c); setCurrentSlide(0); setRevealShown(false); };

  const advanceSlide = () => {
    if (!viewingCase) return;
    const slide = viewingCase.slides[currentSlide];
    if (slide?.is_reveal && !revealShown) { setRevealShown(true); return; }
    if (currentSlide < viewingCase.slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
      setRevealShown(false);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) { setCurrentSlide(currentSlide - 1); setRevealShown(false); }
  };

  // ── Touch handling ──
  const touchStart = useRef<number>(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (diff > 50) advanceSlide();
    else if (diff < -50) prevSlide();
  };

  const isScheduled = (c: ClinicalCase) => c.scheduled_at && !isPast(parseISO(c.scheduled_at));

  // When expanded image is open: enable zoom in ALL orientations, close on rotate
  useEffect(() => {
    if (!expandedImage) return;
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover");
    }
    const closeOnRotate = () => setExpandedImage(null);
    window.addEventListener("orientationchange", closeOnRotate);
    return () => {
      window.removeEventListener("orientationchange", closeOnRotate);
      // Let the App-level ViewportZoomManager re-apply the correct setting
      if (meta) {
        const isPortrait = window.matchMedia("(orientation: portrait)").matches;
        meta.setAttribute("content", isPortrait
          ? "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover"
          : "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        );
      }
    };
  }, [expandedImage]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <NotificationBell />
          </HeaderLogo>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "12px 16px 100px" }}>

        {/* ── Full-screen case viewer ── */}
        {viewingCase && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 100, background: "#1a1a1a",
            display: "flex", flexDirection: "column",
            height: "100dvh", overflow: "hidden",
          }}>
            {/* Viewer header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(0,0,0,0.3)", flexShrink: 0 }}>
              <div>
                <div style={{ color: "#fff", fontSize: 15, fontWeight: 500 }}>{viewingCase.title}</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{viewingCase.author_name}</div>
              </div>
              <button onClick={() => setViewingCase(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
                <X style={{ width: 24, height: 24, color: "#fff" }} />
              </button>
            </div>

            {/* Slide area */}
            <div
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", cursor: "pointer", minHeight: 0 }}
              onClick={advanceSlide}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {viewingCase.slides[currentSlide] && (
                <>
                  {viewingCase.slides[currentSlide].is_reveal && !revealShown ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 64, height: 64, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontSize: 28, fontWeight: 500 }}>?</span>
                      </div>
                      <div style={{ color: "#fff", fontSize: 20, fontWeight: 500 }}>What's your diagnosis?</div>
                      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Tap to reveal</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "16px 24px", maxWidth: "100%", width: "100%", maxHeight: "100%", overflow: "auto" }}>
                      {viewingCase.slides[currentSlide].image_url && (
                        <img
                          src={viewingCase.slides[currentSlide].image_url}
                          alt=""
                          onClick={(e) => { e.stopPropagation(); setExpandedImage(viewingCase.slides[currentSlide].image_url); }}
                          style={{ maxWidth: "100%", maxHeight: "calc(100% - 40px)", objectFit: "contain", borderRadius: 8, flexShrink: 0, cursor: "pointer" }}
                        />
                      )}
                      {viewingCase.slides[currentSlide].caption && (
                        <div
                          style={{ color: "#fff", fontSize: 15, lineHeight: 1.6, textAlign: "center" }}
                          className="[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-left [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-left [&_li]:my-0.5 [&_p]:my-1"
                          dangerouslySetInnerHTML={{ __html: viewingCase.slides[currentSlide].caption }}
                        />
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Tap zones */}
              {currentSlide > 0 && (
                <div onClick={(e) => { e.stopPropagation(); prevSlide(); }} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "25%", cursor: "pointer" }} />
              )}
            </div>

            {/* Dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "16px 0 24px" }}>
              {viewingCase.slides.map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === currentSlide ? "#fff" : "rgba(255,255,255,0.3)" }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Expanded image view ── */}
        {expandedImage && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 200, background: "#000",
            height: "100dvh", overflow: "auto",
            WebkitOverflowScrolling: "touch",
            display: "flex", alignItems: "center", justifyContent: "center",
          } as any}>
            <button onClick={() => setExpandedImage(null)} style={{
              position: "fixed", top: 16, right: 16, zIndex: 201,
              background: "rgba(0,0,0,0.6)", border: "2px solid rgba(255,255,255,0.5)", borderRadius: "50%",
              width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <X style={{ width: 22, height: 22, color: "#fff" }} />
            </button>
            <img
              src={expandedImage}
              alt=""
              style={{ width: "100%", display: "block", flexShrink: 0 }}
            />
          </div>
        )}

        {/* ── Header row ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#415162" }}>Cases</span>
          {canEdit && !showCreate && !editingCase && (
            <span onClick={() => { setShowCreate(true); setEditingCase(null); }} style={{
              fontSize: 13, fontWeight: 600, color: "#415162", background: "#E7EBEF",
              padding: "4px 12px", borderRadius: 6, cursor: "pointer", userSelect: "none",
            }}>Add</span>
          )}
        </div>

        {/* ── Category filter ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {activeCats.map(cat => (
            <span
              key={cat}
              onClick={() => setFilterCat(cat)}
              style={{
                fontSize: 12, padding: "5px 12px", borderRadius: 6, fontWeight: 500, cursor: "pointer",
                background: filterCat === cat ? "#415162" : "#E7EBEF",
                color: filterCat === cat ? "#fff" : "#5F7285",
              }}
            >{cat}</span>
          ))}
        </div>

        {/* ── Create form ── */}
        {/* ── Create / Edit form ── */}
        {showCreate && <CreateCaseForm onSubmit={(d) => createCase.mutate(d)} onCancel={() => setShowCreate(false)} />}
        {editingCase && !showCreate && (
          <CreateCaseForm
            initialData={editingCase}
            onSubmit={(d) => updateCase.mutate({ id: editingCase.id, ...d })}
            onCancel={() => setEditingCase(null)}
          />
        )}

        {/* ── Case feed ── */}
        {filtered.length === 0 && !showCreate && (
          <div style={{ textAlign: "center", padding: "48px 16px", color: "#8A9AAB" }}>
            <div style={{ fontSize: 14 }}>No cases yet</div>
          </div>
        )}

        {filtered.map(c => {
          const catColor = getCatColor(c.category);
          const scheduled = isScheduled(c);
          return (
            <div key={c.id}
              onClick={() => { if (!scheduled || canEdit) openCase(c); }}
              style={{
                background: "#E7EBEF", borderRadius: 10, padding: 14, marginBottom: 10,
                cursor: scheduled && !canEdit ? "default" : "pointer",
                opacity: scheduled ? 0.7 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, padding: "3px 8px", background: catColor.bg, color: catColor.text, borderRadius: 4 }}>{c.category}</span>
                  <span style={{ fontSize: 11, color: "#8A9AAB" }}>{c.slides.length} slide{c.slides.length !== 1 ? "s" : ""}</span>
                  {scheduled && (
                    <span style={{ fontSize: 11, padding: "2px 6px", background: "#D4A017", color: "#fff", borderRadius: 4, display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock style={{ width: 10, height: 10 }} /> Scheduled
                    </span>
                  )}
                  {!c.published && !scheduled && canEdit && (
                    <span style={{ fontSize: 11, padding: "2px 6px", background: "#C9CED4", color: "#415162", borderRadius: 4 }}>Draft</span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: "#8A9AAB" }}>
                  {c.scheduled_at && scheduled
                    ? format(parseISO(c.scheduled_at), "MMM d")
                    : format(parseISO(c.created_at), "MMM d")}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#2D3748", marginBottom: 4 }}>{c.title}</div>
              {c.description && <div style={{ fontSize: 12, color: "#5F7285", marginBottom: 8 }}>{c.description}</div>}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, color: "#8A9AAB" }}>{c.author_name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Dots preview */}
                  <div style={{ display: "flex", gap: 4 }}>
                    {c.slides.map((_, i) => (
                      <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i === 0 ? "#415162" : "#C9CED4" }} />
                    ))}
                  </div>
                  {/* Admin actions */}
                  {canEdit && (
                    <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setEditingCase(c); setShowCreate(false); }}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#5F7285" }}
                        title="Edit"
                      >
                        <Pencil style={{ width: 14, height: 14 }} />
                      </button>
                      {(!c.published || scheduled) && (
                        <button onClick={() => postNow.mutate(c.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#4A846C" }}
                          title="Post now"
                        >
                          <Send style={{ width: 14, height: 14 }} />
                        </button>
                      )}
                      <button onClick={() => togglePublish.mutate({ id: c.id, published: !c.published })}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#8A9AAB" }}
                        title={c.published ? "Unpublish" : "Publish"}
                      >
                        {c.published ? <Eye style={{ width: 14, height: 14 }} /> : <EyeOff style={{ width: 14, height: 14 }} />}
                      </button>
                      <button onClick={() => { if (confirm("Delete this case?")) deleteCase.mutate(c.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9F2929" }}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Slide Caption TipTap Editor
// ═══════════════════════════════════════════════════════════════════════════
const SlideCaptionEditor = ({ content, onChange, placeholder }: { content: string; onChange: (html: string) => void; placeholder?: string }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    content: content || "",
    editable: true,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync content when initialData changes (edit mode)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, []);

  if (!editor) return null;

  const btnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? "#D5DAE0" : "transparent",
    border: "none", cursor: "pointer", borderRadius: 4,
    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
    color: "#415162",
  });

  return (
    <div style={{ border: "1px solid #C9CED4", borderRadius: 6, background: "#fff", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 2, padding: "4px 6px", borderBottom: "1px solid #E7EBEF" }}>
        <button type="button" style={btnStyle(editor.isActive("bold"))}
          onMouseDown={(e) => { e.preventDefault(); (editor.chain().focus() as any).toggleBold().run(); }}>
          <Bold style={{ width: 14, height: 14 }} />
        </button>
        <button type="button" style={btnStyle(editor.isActive("italic"))}
          onMouseDown={(e) => { e.preventDefault(); (editor.chain().focus() as any).toggleItalic().run(); }}>
          <Italic style={{ width: 14, height: 14 }} />
        </button>
        <button type="button" style={btnStyle(editor.isActive("bulletList"))}
          onMouseDown={(e) => { e.preventDefault(); (editor.chain().focus() as any).toggleBulletList().run(); }}>
          <List style={{ width: 14, height: 14 }} />
        </button>
        <button type="button" style={btnStyle(editor.isActive("orderedList"))}
          onMouseDown={(e) => { e.preventDefault(); (editor.chain().focus() as any).toggleOrderedList().run(); }}>
          <ListOrdered style={{ width: 14, height: 14 }} />
        </button>
      </div>
      <div
        onClick={() => editor.commands.focus()}
        style={{ cursor: "text" }}
      >
        <EditorContent
          editor={editor}
          style={{ fontSize: 12, minHeight: 60 }}
          className={[
            "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[60px] [&_.ProseMirror]:px-2 [&_.ProseMirror]:py-1.5 [&_.ProseMirror]:text-xs",
            "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:my-1",
            "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:my-1",
            "[&_.ProseMirror_p]:my-0.5",
            "[&_.ProseMirror:empty::before]:content-[attr(data-placeholder)] [&_.ProseMirror:empty::before]:text-gray-400 [&_.ProseMirror:empty::before]:pointer-events-none [&_.ProseMirror:empty::before]:h-0 [&_.ProseMirror:empty::before]:float-left",
          ].join(" ")}
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Create Case Form
// ═══════════════════════════════════════════════════════════════════════════
interface CreateFormData {
  title: string;
  description: string;
  category: string;
  slides: Slide[];
  published: boolean;
  scheduled_at: string | null;
}

const CreateCaseForm = ({ initialData, onSubmit, onCancel }: { initialData?: ClinicalCase; onSubmit: (d: CreateFormData) => void; onCancel: () => void }) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.category || "EKG");
  const [slides, setSlides] = useState<Slide[]>(initialData?.slides?.length ? initialData.slides : [{ image_url: "", caption: "", is_reveal: false }]);
  const [published, setPublished] = useState(initialData?.published ?? true);
  const [scheduledAt, setScheduledAt] = useState(initialData?.scheduled_at ? initialData.scheduled_at.slice(0, 16) : "");
  const [uploading, setUploading] = useState<number | null>(null);

  const handleImageUpload = async (file: File, index: number) => {
    setUploading(index);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("case-images").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("case-images").getPublicUrl(path);
      const updated = [...slides];
      updated[index] = { ...updated[index], image_url: data.publicUrl };
      setSlides(updated);
    } catch (e: any) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(null);
    }
  };

  const addSlide = () => setSlides([...slides, { image_url: "", caption: "", is_reveal: false }]);
  const removeSlide = (i: number) => setSlides(slides.filter((_, idx) => idx !== i));
  const updateSlide = (i: number, field: keyof Slide, val: any) => {
    const updated = [...slides];
    updated[i] = { ...updated[i], [field]: val };
    setSlides(updated);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    if (slides.length === 0) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      slides,
      published: scheduledAt ? false : published,
      scheduled_at: scheduledAt || null,
    });
  };

  return (
    <div style={{ background: "#E7EBEF", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #D5DAE0" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#2D3748", marginBottom: 12 }}>{initialData ? "Edit case" : "New case"}</div>

      <input
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, background: "#fff", marginBottom: 8, boxSizing: "border-box" }}
      />

      <input
        placeholder="Short description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, background: "#fff", marginBottom: 8, boxSizing: "border-box" }}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{
            fontSize: 13, padding: "6px 28px 6px 10px", border: "1px solid #C9CED4", borderRadius: 6,
            background: "#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\") no-repeat right 8px center",
            color: "#333", WebkitAppearance: "none", MozAppearance: "none", appearance: "none",
          } as any}
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={e => setScheduledAt(e.target.value)}
          style={{ fontSize: 12, padding: "6px 8px", border: "1px solid #C9CED4", borderRadius: 6, background: "#fff", color: "#333" }}
          title="Schedule publish time (optional)"
        />
      </div>

      {/* Slides */}
      <div style={{ fontSize: 12, fontWeight: 600, color: "#5F7285", marginBottom: 6 }}>Slides</div>
      {slides.map((slide, i) => (
        <div key={i} style={{ background: "#F5F3EE", borderRadius: 8, padding: 12, marginBottom: 8, border: "1px solid #D5DAE0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#415162" }}>Slide {i + 1}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={slide.is_reveal}
                  onChange={e => updateSlide(i, "is_reveal", e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: "#415162" }}
                />
                <span style={{ fontSize: 11, color: "#5F7285" }}>Reveal slide</span>
              </label>
              {slides.length > 1 && (
                <button onClick={() => removeSlide(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#9F2929" }}>
                  <X style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
          </div>

          {/* Image upload */}
          <div style={{ marginBottom: 8 }}>
            {slide.image_url ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={slide.image_url} alt="" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 6, objectFit: "cover" }} />
                <button
                  onClick={() => updateSlide(i, "image_url", "")}
                  style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <X style={{ width: 12, height: 12, color: "#fff" }} />
                </button>
              </div>
            ) : (
              <label style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
                background: "#fff", border: "1px dashed #C9CED4", borderRadius: 6,
                cursor: "pointer", fontSize: 12, color: "#5F7285",
              }}>
                <Upload style={{ width: 14, height: 14 }} />
                {uploading === i ? "Uploading..." : "Upload image"}
                <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], i); }} style={{ display: "none" }} />
              </label>
            )}
          </div>

          <SlideCaptionEditor
            key={`slide-editor-${i}`}
            content={slide.caption}
            onChange={(html) => updateSlide(i, "caption", html)}
            placeholder={slide.is_reveal ? "Diagnosis and teaching points..." : "Caption (optional)"}
          />
        </div>
      ))}

      <button onClick={addSlide} style={{
        width: "100%", padding: "8px", fontSize: 12, color: "#5F7285", background: "#F5F3EE",
        border: "1px dashed #C9CED4", borderRadius: 6, cursor: "pointer", marginBottom: 12,
      }}>
        + Add slide
      </button>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{
          padding: "8px 16px", fontSize: 13, background: "transparent", color: "#5F7285",
          border: "1px solid #C9CED4", borderRadius: 6, cursor: "pointer",
        }}>Cancel</button>
        <button onClick={handleSubmit} disabled={!title.trim() || slides.length === 0} style={{
          padding: "8px 16px", fontSize: 13, background: "#415162", color: "#fff",
          border: "none", borderRadius: 6, cursor: "pointer", opacity: !title.trim() ? 0.5 : 1,
        }}>
          {initialData ? "Save" : scheduledAt ? "Schedule" : "Publish"}
        </button>
      </div>
    </div>
  );
};

export default Cases;
