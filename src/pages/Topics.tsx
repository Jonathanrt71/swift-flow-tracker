import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Search, X, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { useClinicalTopics, ClinicalTopic, TopicTag } from "@/hooks/useClinicalTopics";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";

/* ── Source pill ── */
function SourcePill({ tag }: { tag: TopicTag }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 600,
      padding: "2px 7px", borderRadius: 10, background: (tag.color || "#415162") + "18",
      color: tag.color || "#415162", letterSpacing: 0.3, flexShrink: 0,
    }}>
      {tag.name}
    </span>
  );
}

/* ── Add topic form (inline under category) ── */
function AddTopicForm({ categoryTag, sourceTags, onAdd, onClose }: {
  categoryTag: TopicTag;
  sourceTags: TopicTag[];
  onAdd: (data: any) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(
    sourceTags.map(s => s.id)
  );

  const toggleSource = (id: string) => {
    setSelectedSourceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      url: url.trim() || undefined,
      tagIds: [categoryTag.id, ...selectedSourceIds],
    });
    onClose();
  };

  return (
    <div style={{ background: "#F0F2F4", borderTop: "1px solid #E7EBEF", padding: "12px 14px 12px 20px" }}>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Topic title"
          style={{ padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }}
          onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
        />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Resource URL (optional)"
          style={{ padding: "7px 10px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 6, outline: "none", background: "#fff" }} />
        {sourceTags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#8A9AAB" }}>Sources:</span>
            {sourceTags.map(st => (
              <button key={st.id} onClick={() => toggleSource(st.id)}
                style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, cursor: "pointer",
                  border: selectedSourceIds.includes(st.id) ? `1px solid ${st.color || "#415162"}` : "1px solid #C9CED4",
                  background: selectedSourceIds.includes(st.id) ? (st.color || "#415162") + "18" : "#fff",
                  color: selectedSourceIds.includes(st.id) ? (st.color || "#415162") : "#8A9AAB",
                }}>
                {st.name}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" as const }}>
          <button onClick={onClose} style={{ padding: "6px 14px", fontSize: 12, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!title.trim()}
            style={{ padding: "6px 14px", fontSize: 12, color: "#fff", background: "#415162", border: "none", borderRadius: 6, cursor: "pointer" }}>Add</button>
        </div>
      </div>
    </div>
  );
}

/* ── Topic row inside accordion ── */
function TopicRow({ topic, canEdit, isAdmin, onDelete }: {
  topic: ClinicalTopic;
  canEdit: boolean;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <div style={{ borderTop: "1px solid #E7EBEF" }}>
        {/* Row */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px 10px 20px", cursor: isAdmin ? "pointer" : "default" }}
          onClick={() => isAdmin && setExpanded(!expanded)}
        >
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#3D3D3A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {topic.title}
          </span>

          {/* Source tags */}
          {(topic.sourceTags || []).length > 0 && (
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {(topic.sourceTags || []).map(st => <SourcePill key={st.id} tag={st} />)}
            </div>
          )}

          {/* Link icon */}
          {topic.url && (
            <a href={topic.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              style={{ color: "#8A9AAB", flexShrink: 0, display: "flex" }}>
              <ExternalLink style={{ width: 13, height: 13 }} />
            </a>
          )}

          {isAdmin && (
            expanded
              ? <ChevronUp style={{ width: 14, height: 14, color: "#C9CED4", flexShrink: 0 }} />
              : <ChevronDown style={{ width: 14, height: 14, color: "#C9CED4", flexShrink: 0 }} />
          )}
        </div>

        {/* Expanded — admin only */}
        {expanded && isAdmin && (
          <div style={{ padding: "0 14px 12px 32px" }}>
            {topic.notes && <p style={{ fontSize: 13, color: "#5F7285", lineHeight: 1.6, marginBottom: 10 }}>{topic.notes}</p>}

            {canEdit && (
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <button onClick={() => setConfirmDelete(true)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 11, color: "#9F2929", background: "transparent", border: "1px solid #f0c0c0", borderRadius: 5, cursor: "pointer" }}>
                  <Trash2 style={{ width: 11, height: 11 }} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(65,81,98,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 320, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#3D3D3A", marginBottom: 8 }}>Delete topic?</h3>
            <p style={{ fontSize: 13, color: "#5F7285", marginBottom: 20, lineHeight: 1.5 }}>Permanently delete "{topic.title}"?</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#777", background: "transparent", border: "1px solid #C9CED4", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { onDelete(topic.id); setConfirmDelete(false); }} style={{ flex: 1, padding: "8px 0", fontSize: 13, color: "#fff", background: "#9F2929", border: "none", borderRadius: 6, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Main page ── */
const Topics = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { role } = useUserRole();
  const { has: hasPerm } = usePermissions();
  const canEdit = hasPerm("topics.edit");

  const { topics, allTags, createTopic, deleteTopic } = useClinicalTopics();

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [addingInCat, setAddingInCat] = useState<string | null>(null);

  const domainTags = useMemo(() => (allTags.data || []).filter(t => t.tag_type === "domain"), [allTags.data]);
  const sourceTags = useMemo(() => (allTags.data || []).filter(t => t.tag_type === "source"), [allTags.data]);

  const searchLower = search.toLowerCase();

  // Group topics by category
  const categorizedTopics = useMemo(() => {
    const topicList = topics.data || [];
    const map = new Map<string, ClinicalTopic[]>();
    domainTags.forEach(dt => map.set(dt.id, []));
    const uncategorized: ClinicalTopic[] = [];

    topicList.forEach(t => {
      if (t.categoryTag) {
        const bucket = map.get(t.categoryTag.id);
        if (bucket) bucket.push(t);
        else uncategorized.push(t);
      } else {
        uncategorized.push(t);
      }
    });

    return { map, uncategorized };
  }, [topics.data, domainTags]);

  const getFilteredTopics = (catTopics: ClinicalTopic[]) => {
    if (!searchLower) return catTopics;
    return catTopics.filter(t => t.title.toLowerCase().includes(searchLower));
  };

  const filteredCategories = useMemo(() => {
    if (!searchLower) return domainTags;
    return domainTags.filter(dt => {
      const catTopics = categorizedTopics.map.get(dt.id) || [];
      return catTopics.some(t => t.title.toLowerCase().includes(searchLower)) ||
        dt.name.toLowerCase().includes(searchLower);
    });
  }, [domainTags, categorizedTopics, searchLower]);

  const totalTopics = (topics.data || []).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3EE" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, padding: "0 16px" }}>
          <HeaderLogo isAdmin={isAdmin} onSignOut={signOut}>
            <button
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, background: "transparent", border: "none",
                borderRadius: 6, cursor: "pointer", color: "rgba(255,255,255,0.8)",
              }}
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearch(""); }}
            >
              {searchOpen ? <X style={{ width: 17, height: 17 }} /> : <Search style={{ width: 17, height: 17 }} />}
            </button>
            <NotificationBell />
          </HeaderLogo>
        </div>
        {searchOpen && (
          <div style={{ padding: "0 16px 12px" }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search topics…"
              style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: "1px solid #C9CED4", borderRadius: 8, outline: "none", background: "#fff", boxSizing: "border-box" as const }}
            />
          </div>
        )}
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 120px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: "#8A9AAB" }}>
            {filteredCategories.length} categories · {totalTopics} topics
          </span>
        </div>

        {topics.isLoading && <div style={{ color: "#8A9AAB", fontSize: 14, textAlign: "center", padding: "40px 0" }}>Loading…</div>}

        {!topics.isLoading && (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
            {filteredCategories.map(cat => {
              const catTopics = getFilteredTopics(categorizedTopics.map.get(cat.id) || []);
              const isExpanded = expandedCat === cat.id || (!!searchLower && catTopics.length > 0);

              return (
                <div key={cat.id} style={{ borderRadius: 10, overflow: "hidden", border: "0.5px solid #D5DAE0" }}>
                  <button
                    onClick={() => setExpandedCat(isExpanded && !searchLower ? null : cat.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "13px 14px", border: "none", cursor: "pointer",
                      background: "#E7EBEF", textAlign: "left" as const,
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#3D3D3A" }}>{cat.name}</span>
                    <span style={{ fontSize: 11, color: "#8A9AAB", marginRight: 4 }}>{catTopics.length}</span>
                    {isExpanded
                      ? <ChevronUp style={{ width: 14, height: 14, color: "#8A9AAB" }} />
                      : <ChevronDown style={{ width: 14, height: 14, color: "#8A9AAB" }} />
                    }
                  </button>

                  {isExpanded && (
                    <div style={{ background: "#F5F3EE" }}>
                      {catTopics.length === 0 && (
                        <div style={{ padding: "16px 20px", textAlign: "center" }}>
                          <span style={{ fontSize: 12, color: "#C9CED4", fontStyle: "italic" }}>No topics in this category</span>
                        </div>
                      )}
                      {catTopics.map(topic => (
                        <TopicRow
                          key={topic.id}
                          topic={topic}
                          canEdit={canEdit}
                          isAdmin={!!isAdmin}
                          onDelete={id => deleteTopic.mutate(id)}
                        />
                      ))}

                      {canEdit && addingInCat !== cat.id && (
                        <div style={{ borderTop: "1px solid #E7EBEF", padding: "8px 14px 8px 20px" }}>
                          <button onClick={() => setAddingInCat(cat.id)}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 11, color: "#415162", background: "transparent", border: "1px solid #C9CED4", borderRadius: 6, cursor: "pointer" }}>
                            <Plus style={{ width: 11, height: 11 }} /> Add topic
                          </button>
                        </div>
                      )}

                      {canEdit && addingInCat === cat.id && (
                        <AddTopicForm
                          categoryTag={cat}
                          sourceTags={sourceTags}
                          onAdd={data => createTopic.mutate(data)}
                          onClose={() => setAddingInCat(null)}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {categorizedTopics.uncategorized.length > 0 && (
              <div style={{ borderRadius: 10, overflow: "hidden", border: "0.5px solid #D5DAE0" }}>
                <button
                  onClick={() => setExpandedCat(expandedCat === "__uncategorized" ? null : "__uncategorized")}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "13px 14px", border: "none", cursor: "pointer",
                    background: "#E7EBEF", textAlign: "left" as const,
                  }}
                >
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#8A9AAB", fontStyle: "italic" }}>Uncategorized</span>
                  <span style={{ fontSize: 11, color: "#8A9AAB", marginRight: 4 }}>{categorizedTopics.uncategorized.length}</span>
                  {expandedCat === "__uncategorized"
                    ? <ChevronUp style={{ width: 14, height: 14, color: "#8A9AAB" }} />
                    : <ChevronDown style={{ width: 14, height: 14, color: "#8A9AAB" }} />
                  }
                </button>
                {expandedCat === "__uncategorized" && (
                  <div style={{ background: "#F5F3EE" }}>
                    {categorizedTopics.uncategorized.map(topic => (
                      <TopicRow
                        key={topic.id}
                        topic={topic}
                        canEdit={canEdit}
                        isAdmin={!!isAdmin}
                        onDelete={id => deleteTopic.mutate(id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Topics;
