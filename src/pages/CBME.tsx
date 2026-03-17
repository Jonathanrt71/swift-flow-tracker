import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompetencies } from "@/hooks/useCompetencies";
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
import { LogOut, Shield, User, Plus, Pencil, Trash2, CheckSquare, Search, X, BarChart2, ListTodo } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import ChecklistEditor from "@/components/cbme/ChecklistEditor";
import AssessmentPopup from "@/components/cbme/AssessmentPopup";
import CBMEDashboard from "@/components/cbme/CBMEDashboard";
import { useTeamMembers } from "@/hooks/useTeamMembers";

const CreateCompetencyDialog = ({
  onSubmit,
}: {
  onSubmit: (title: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setTitle("");
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center justify-center w-8 h-8 bg-transparent border-none cursor-pointer text-muted-foreground">
          <Plus className="h-[18px] w-[18px]" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-sm overflow-y-auto bg-background border-border rounded-xl p-0 [&>button[class*='absolute']]:hidden"
        overlayClassName="bg-background/60 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-[#415162] rounded-t-xl">
          <span className="text-sm font-medium text-white">New competency</span>
          <button onClick={() => setOpen(false)} className="w-9 h-9 flex items-center justify-center bg-transparent border-none cursor-pointer">
            <X className="h-4 w-4 text-white/70" />
          </button>
        </div>
        <div className="px-4 pb-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) {
                onSubmit(title.trim());
                setOpen(false);
              }
            }}
            placeholder="Competency title..."
            autoFocus
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm outline-none"
          />
        </div>
        <div className="px-4 pb-4 flex justify-end">
          <button
            onClick={() => {
              if (title.trim()) {
                onSubmit(title.trim());
                setOpen(false);
              }
            }}
            disabled={!title.trim()}
            className="px-5 py-2 bg-primary text-primary-foreground border-none rounded-md text-[13px] font-medium cursor-pointer disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CBME = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { isFaculty } = useUserRole();
  const { competencies, myAssessments, allAssessments, createCompetency, deleteCompetency, saveSections, saveAssessment } =
    useCompetencies();
  const { data: teamMembers } = useTeamMembers();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [dashboardView, setDashboardView] = useState<"mine" | "all">("mine");

  const canCreate = isAdmin || isFaculty;

  const filteredCompetencies = (competencies.data || []).filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="bg-[#415162]">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-semibold text-white">CBME</h1>
          <div className="flex items-center gap-1 text-white">
            <Button
              variant="ghost"
              size="icon"
              title="Search"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery("");
              }}
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
            <NotificationBell />
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="icon" title="Admin Panel">
                  <Shield className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link to="/profile">
              <Button variant="ghost" size="icon" title="Profile">
                <User className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" title="Sign out" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
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

      <main className="container max-w-2xl px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center pb-2.5">
            <TabsList className="gap-1 h-auto p-1 bg-transparent">
              <TabsTrigger value="list" className="h-8 w-8 p-0" title="Competency List">
                <ListTodo className="h-4 w-4" />
              </TabsTrigger>
              {canCreate && (
                <TabsTrigger value="dashboard" className="h-8 w-8 p-0" title="Dashboard">
                  <BarChart2 className="h-4 w-4" />
                </TabsTrigger>
              )}
            </TabsList>
            {activeTab === "list" && canCreate && (
              <div className="ml-auto">
                <CreateCompetencyDialog
                  onSubmit={(title) => createCompetency.mutate(title)}
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
                filteredCompetencies.map((comp) => {
                  const isExpanded = expandedId === comp.id;
                  const totalSections = comp.sections.length;
                  const totalTasks = comp.sections.reduce((s, sec) => s + sec.tasks.length, 0);

                  return (
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
                })
              )}
            </div>
          </TabsContent>

          {canCreate && (
            <TabsContent value="dashboard" className="mt-0">
              <div className="flex gap-1 mb-3">
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
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default CBME;
