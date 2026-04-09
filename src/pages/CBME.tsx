import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompetencies } from "@/hooks/useCompetencies";
import { useCompetencyCategories } from "@/hooks/useCompetencyCategories";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut, Shield, User, Plus, Pencil, Trash2, CheckSquare, Search, X, BarChart2, ListTodo, ClipboardList, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationBell from "@/components/NotificationBell";
import ChecklistEditor from "@/components/cbme/ChecklistEditor";
import AssessmentPopup from "@/components/cbme/AssessmentPopup";
import CBMEDashboard from "@/components/cbme/CBMEDashboard";
import MilestoneLevelsGrid from "@/components/cbme/MilestoneLevelsGrid";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import HeaderLogo from "@/components/HeaderLogo";
import { format, parseISO } from "date-fns";
import { formatCardDate, formatPersonName } , getInitials } from "@/lib/dateFormat";
import { cn } from "@/lib/utils";

const CreateCompetencyDialog = ({
  onSubmit,
  categories,
}: {
  onSubmit: (data: { title: string; category_id?: string | null }) => void;
  categories: { id: string; name: string }[];
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) { setTitle(""); setCategoryId(""); }
    setOpen(isOpen);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), category_id: categoryId || null });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer text-muted-foreground">
          <Plus className="h-[18px] w-[18px]" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-sm overflow-y-auto border-none rounded-xl p-0 [&>button[class*='absolute']]:hidden"
        style={{ background: "#F5F3EE" }}
        overlayClassName="bg-[rgba(65,81,98,0.45)] backdrop-blur-sm"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-[#415162] rounded-t-xl">
          <span className="text-sm font-medium text-white">New competency</span>
          <button onClick={() => setOpen(false)} className="w-9 h-9 flex items-center justify-center bg-transparent border-none cursor-pointer">
            <X className="h-4 w-4 text-white/70" />
          </button>
        </div>
        <div className="px-4 pt-4 pb-4 flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="Competency title..."
            autoFocus
            style={{ width: "100%", padding: "8px 12px", background: "#E7EBEF", border: "0.5px solid #C9CED4", borderRadius: 8, fontSize: 14, color: "#333", outline: "none" }}
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", background: "#E7EBEF", border: "0.5px solid #C9CED4", borderRadius: 8, fontSize: 13, color: "#333", outline: "none" }}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="px-4 pb-4 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            style={{ padding: "8px 20px", background: title.trim() ? "#415162" : "#C9CED4", color: "#FFF", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: title.trim() ? "pointer" : "default" }}
          >
            Create
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


const getColor = (name: string | null): string => {
  const cols = ["#378ADD", "#1D9E75", "#D85A30", "#534AB7", "#993556"];
  let h = 0;
  if (name) for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return cols[Math.abs(h) % cols.length];
};

const AssessmentHistoryCard = ({
  compTitle,
  residentName,
  assessor,
  gradeColor,
  dateInfo,
  comment,
}: {
  compTitle: string;
  residentName: string;
  assessor?: { id: string; display_name: string; avatar_url: string | null } | null;
  gradeColor?: string;
  dateInfo: { text: string; urgent: boolean } | null;
  comment: string | null;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-muted border border-border rounded-[10px] overflow-hidden cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center min-h-[48px] px-2">
        {/* Grade dot */}
        {gradeColor && (
          <div
            className="w-4 h-4 rounded-full shrink-0 ml-1 mr-2"
            style={{ background: gradeColor }}
          />
        )}
        <div className="flex-1 min-w-0 pl-1 pr-1 flex items-center gap-2">
          <span className="font-medium text-sm truncate">{residentName}</span>
          {dateInfo && (
            <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
              {dateInfo.text}
            </span>
          )}
        </div>
        <div className="flex items-center shrink-0 pr-1">
          {assessor ? (
            assessor.avatar_url ? (
              <img
                src={assessor.avatar_url}
                className="w-7 h-7 rounded-full object-cover shrink-0"
                alt=""
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ fontSize: 10, fontWeight: 500, background: getColor(assessor.display_name) }}
              >
                {getInitials(assessor.display_name)}
              </div>
            )
          ) : (
            <div className="w-7 h-7 rounded-full bg-border/50 shrink-0" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="pb-2 pl-3 pr-3 -mt-1">
          <span className="text-xs font-medium text-foreground/70">{compTitle}</span>
          {comment && comment.trim() !== "" && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{comment}</p>
          )}
        </div>
      )}
    </div>
  );
};

const CBME = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { isFaculty } = useUserRole();
  const { has: hasPerm } = usePermissions();
  const canCreate = hasPerm("cbme.assess");
  const { competencies, myAssessments, allAssessments, createCompetency, updateCompetency, deleteCompetency, saveSections, saveAssessment } =
    useCompetencies();
  const { data: teamMembers } = useTeamMembers();
  const { categories } = useCompetencyCategories();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [dashboardView, setDashboardView] = useState<"mine" | "all">("mine");

  const filteredCompetencies = (competencies.data || []).filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-[#415162] sticky top-0 z-40">
        <div className="flex items-center h-14 px-4">
          <HeaderLogo isAdmin={isAdmin} onSignOut={() => signOut()}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                background: "transparent",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                color: "rgba(255,255,255,0.8)",
              }}
              title="Search"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery("");
              }}
            >
              {searchOpen ? <X style={{ width: 17, height: 17 }} /> : <Search style={{ width: 17, height: 17 }} />}
            </button>
            <NotificationBell />
          </HeaderLogo>
        </div>
        {searchOpen && (
          <div className="container px-4 pb-3">
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search competencies..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}
      </header>

      <main className="px-4 pt-2 pb-6" style={{ maxWidth: 900, margin: "0 auto" }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center pb-2.5">
            <TabsList className="gap-1 h-auto p-1 bg-transparent">
              <TabsTrigger value="list" className="h-8 w-8 p-0 data-[state=active]:bg-[#D5DAE0] data-[state=active]:text-[#415162] data-[state=active]:shadow-none data-[state=inactive]:text-[#8A9AAB]" title="Competency List">
                <ListTodo className="h-4 w-4" />
              </TabsTrigger>
              {canCreate && (
                <TabsTrigger value="dashboard" className="h-8 w-8 p-0 data-[state=active]:bg-[#D5DAE0] data-[state=active]:text-[#415162] data-[state=active]:shadow-none data-[state=inactive]:text-[#8A9AAB]" title="Dashboard">
                  <BarChart2 className="h-4 w-4" />
                </TabsTrigger>
              )}
              <TabsTrigger value="history" className="h-8 w-8 p-0 data-[state=active]:bg-[#D5DAE0] data-[state=active]:text-[#415162] data-[state=active]:shadow-none data-[state=inactive]:text-[#8A9AAB]" title="Assessment History">
                <ClipboardList className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
            {activeTab === "list" && canCreate && (
              <div className="ml-auto">
                <CreateCompetencyDialog
                  onSubmit={(data) => createCompetency.mutate(data)}
                  categories={categories.data || []}
                />
              </div>
            )}
          </div>

          <TabsContent value="list" className="mt-0">
            <div className="space-y-2">
              {competencies.isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredCompetencies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">
                    {searchQuery ? "No competencies match your search." : "No competencies yet."}
                  </p>
                </div>
              ) : (
                (() => {
                  const catMap = new Map((categories.data || []).map((c) => [c.id, c.name]));
                  const sorted = [...filteredCompetencies].sort((a, b) => {
                    const catA = a.category_id ? catMap.get(a.category_id) || "zzz" : "zzz";
                    const catB = b.category_id ? catMap.get(b.category_id) || "zzz" : "zzz";
                    if (catA !== catB) return catA.localeCompare(catB);
                    return a.title.localeCompare(b.title);
                  });
                  let prevCat = "";
                  const elements: React.ReactNode[] = [];
                  sorted.forEach((comp) => {
                    const catName = comp.category_id ? catMap.get(comp.category_id) || null : null;
                    const catKey = catName || "__uncategorized__";
                    if (catKey !== prevCat && catName) {
                      elements.push(
                        <div key={`cat-${catKey}`} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider pt-3 pb-1">
                          {catName}
                        </div>
                      );
                    }
                    if (catKey !== prevCat && !catName && prevCat !== "") {
                      elements.push(
                        <div key="cat-uncategorized" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider pt-3 pb-1">
                          Uncategorized
                        </div>
                      );
                    }
                    prevCat = catKey;

                    const isExpanded = expandedId === comp.id;
                    const totalSections = comp.sections.length;
                    const totalTasks = comp.sections.reduce((s, sec) => s + sec.tasks.length, 0);

                    elements.push(
                      <div
                        key={comp.id}
                        className="bg-muted border border-border rounded-[10px] overflow-hidden cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : comp.id)}
                      >
                        <div className="flex items-center min-h-[48px] px-2">
                          <div className="flex-1 min-w-0 pl-2">
                            <span className="font-medium text-sm truncate block">{comp.title}</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-3 pb-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] text-muted-foreground">
                                {totalSections > 0
                                  ? `${totalSections} section${totalSections !== 1 ? "s" : ""} · ${totalTasks} task${totalTasks !== 1 ? "s" : ""}`
                                  : "No checklist yet"}
                              </span>
                              {canCreate && (
                                <div className="flex gap-0.5">
                                  <ChecklistEditor
                                    competencyTitle={comp.title}
                                    initialSections={comp.sections}
                                    categories={categories.data || []}
                                    currentCategoryId={comp.category_id}
                                    onSaveCategory={(catId) => updateCompetency.mutate({ id: comp.id, category_id: catId })}
                                    onSave={(sections) =>
                                      saveSections.mutate({
                                        competencyId: comp.id,
                                        sections: sections.map((s) => ({
                                          name: s.name,
                                          tasks: s.tasks.map((t) => ({
                                            title: t.title,
                                            detail: t.detail,
                                          })),
                                        })),
                                      })
                                    }
                                  >
                                    <button className="w-7 h-7 flex items-center justify-center bg-transparent border-none cursor-pointer text-muted-foreground rounded hover:text-foreground">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  </ChecklistEditor>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <button className="w-7 h-7 flex items-center justify-center bg-transparent border-none cursor-pointer text-destructive rounded hover:bg-destructive/10">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete competency?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete "{comp.title}" and all its sections, tasks, and assessments.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteCompetency.mutate(comp.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                            </div>

                            {totalSections > 0 && canCreate && (
                              <AssessmentPopup
                                competency={comp}
                                onSave={(data) => saveAssessment.mutate(data)}
                              >
                                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground border-none rounded-md text-xs font-medium cursor-pointer">
                                  <CheckSquare className="h-3.5 w-3.5" />
                                  Assess resident
                                </button>
                              </AssessmentPopup>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                  return elements;
                })()
              )}
            </div>
          </TabsContent>

          {canCreate && (
            <TabsContent value="dashboard" className="mt-0">
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => setDashboardView("all")}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium border-none cursor-pointer transition-colors ${
                    dashboardView === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  All assessments
                </button>
                <button
                  onClick={() => setDashboardView("mine")}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium border-none cursor-pointer transition-colors ${
                    dashboardView === "mine"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  My assessments
                </button>
              </div>
              {(dashboardView === "mine" ? myAssessments : allAssessments).isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <CBMEDashboard
                  competencies={competencies.data || []}
                  assessments={(dashboardView === "mine" ? myAssessments.data : allAssessments.data) || []}
                  teamMembers={teamMembers || []}
                />
              )}
            </TabsContent>
          )}

          <TabsContent value="history" className="mt-0">
            {allAssessments.isLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (() => {
              const assessments = allAssessments.data || [];
              const compMap = new Map((competencies.data || []).map((c) => [c.id, c.title]));
              const members = teamMembers || [];
              const GRADE_COLORS: Record<number, string> = { 1: "#D4A017", 2: "#4A846C", 3: "#52657A" };

              const sorted = [...assessments].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );

              // Filter by search
              const filtered = sorted.filter((a) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const compTitle = (compMap.get(a.competency_id) || "").toLowerCase();
                const resident = members.find((m) => m.id === a.resident_id);
                const assessor = members.find((m) => m.id === a.assessor_id);
                return (
                  compTitle.includes(q) ||
                  (resident?.display_name || "").toLowerCase().includes(q) ||
                  (assessor?.display_name || "").toLowerCase().includes(q) ||
                  (a.overall_comment || "").toLowerCase().includes(q)
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">{searchQuery ? "No assessments match your search." : "No assessments yet."}</p>
                  </div>
                );
              }

              // Group by month
              let prevMonth = "";
              const elements: React.ReactNode[] = [];

              filtered.forEach((a) => {
                let monthKey = "";
                let monthLabel: string | null = null;
                try {
                  const d = parseISO(a.created_at);
                  monthKey = format(d, "yyyy-MM");
                  monthLabel = format(d, "MMMM yyyy");
                } catch {
                  monthKey = "other";
                }

                if (monthKey !== prevMonth && monthLabel) {
                  elements.push(
                    <div key={`month-${monthKey}`} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider pt-3 pb-1">
                      {monthLabel}
                    </div>
                  );
                }
                prevMonth = monthKey;

                const compTitle = compMap.get(a.competency_id) || "Unknown";
                const assessor = members.find((m) => m.id === a.assessor_id);
                const resident = members.find((m) => m.id === a.resident_id);
                const gradeColor = a.overall_grade ? GRADE_COLORS[a.overall_grade] : undefined;
                const dd = formatCardDate(a.created_at);

                elements.push(
                  <AssessmentHistoryCard
                    key={a.id}
                    compTitle={compTitle}
                    residentName={resident ? formatPersonName(resident) : "Unknown"}
                    assessor={assessor}
                    gradeColor={gradeColor}
                    dateInfo={dd}
                    comment={a.overall_comment}
                  />
                );
              });

              return <div className="space-y-2">{elements}</div>;
            })()}
          </TabsContent>

        </Tabs>
      </main>

    </div>
  );
};

export default CBME;
