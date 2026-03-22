import { useState, useMemo, useEffect } from "react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useFeedback, Feedback } from "@/hooks/useFeedback";
import { useACGMECompetencies, ACGMECategory, ACGMESubcategory } from "@/hooks/useACGMECompetencies";
import { supabase } from "@/integrations/supabase/client";
import { formatPersonName } from "@/lib/dateFormat";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings } from "@/hooks/useAppSettings";
import { generateReportPdf } from "@/lib/generateMilestoneReportPdf";
import PlainTextEditor from "./PlainTextEditor";
import DOMPurify from "dompurify";

interface Suggestion {
  subcategory_id: string;
  suggested_level: number;
  suggested_comment: string;
}

interface ReportItem {
  subcategoryId: string;
  subcategoryCode: string;
  subcategoryName: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  categoryColor: string;
  milestones: { id: string; level: number; description: string }[];
  selectedLevel: number;
  comment: string;
  finalized: boolean;
  feedbackCount: number;
  positiveCount: number;
  negativeCount: number;
}

const MilestoneReport = () => {
  const { user } = useAuth();
  const { data: teamMembers } = useTeamMembers();
  const { feedbackQuery } = useFeedback();
  const { data: acgmeCategories } = useACGMECompetencies();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useAppSettings();

  const [selectedResident, setSelectedResident] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Fetch resident IDs
  const { data: residentRoles } = useQuery({
    queryKey: ["resident-role-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "resident");
      if (error) throw error;
      return (data || []).map((r: any) => r.user_id);
    },
  });

  const members = teamMembers || [];
  const residentIds = new Set(residentRoles || []);
  const residents = members.filter((m) => residentIds.has(m.id));

  const nameMap = new Map<string, string>();
  members.forEach((m) => nameMap.set(m.id, formatPersonName(m)));

  // Filter feedback
  const filteredFeedback = useMemo(() => {
    if (!selectedResident || !startDate || !endDate || !user) return [];
    const allFb = feedbackQuery.data || [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return allFb.filter((fb) => {
      if (fb.faculty_id !== user.id) return false;
      if (fb.resident_id !== selectedResident) return false;
      try {
        const d = parseISO(fb.created_at.split("T")[0]);
        return isWithinInterval(d, { start, end });
      } catch {
        return false;
      }
    });
  }, [feedbackQuery.data, selectedResident, startDate, endDate, user]);

  // Load existing reports when resident/dates change
  useEffect(() => {
    if (!selectedResident || !startDate || !endDate || !user) return;
    loadExistingReports();
  }, [selectedResident, startDate, endDate, user]);

  const loadExistingReports = async () => {
    if (!user || !selectedResident || !startDate || !endDate) return;
    const { data, error } = await (supabase as any)
      .from("milestone_reports")
      .select("*")
      .eq("faculty_id", user.id)
      .eq("resident_id", selectedResident)
      .eq("date_range_start", startDate)
      .eq("date_range_end", endDate);

    if (error || !data?.length) return;

    const categories = acgmeCategories || [];
    const items: ReportItem[] = [];

    data.forEach((report: any) => {
      for (const cat of categories) {
        const sub = cat.subcategories.find((s) => s.id === report.subcategory_id);
        if (sub) {
          const fbForSub = filteredFeedback.filter(
            (fb) => fb.competency_subcategory_id === sub.id
          );
          items.push({
            subcategoryId: sub.id,
            subcategoryCode: sub.code,
            subcategoryName: sub.name,
            categoryId: cat.id,
            categoryCode: cat.code,
            categoryName: cat.name,
            categoryColor: cat.color,
            milestones: sub.milestones,
            selectedLevel: report.milestone_level,
            comment: report.comment,
            finalized: report.finalized,
            feedbackCount: fbForSub.length,
            positiveCount: fbForSub.filter((f) => f.sentiment === "positive").length,
            negativeCount: fbForSub.filter((f) => f.sentiment === "negative").length,
          });
          break;
        }
      }
    });

    if (items.length > 0) {
      setReportItems(items);
      setGenerated(true);
    }
  };

  const handleGenerate = async () => {
    if (!user || !selectedResident || !startDate || !endDate) return;
    setGenerating(true);

    try {
      const categories = acgmeCategories || [];
      const subcatIds = new Set(
        filteredFeedback
          .map((fb) => fb.competency_subcategory_id)
          .filter(Boolean)
      );

      const relevantSubcategories: any[] = [];
      for (const cat of categories) {
        for (const sub of cat.subcategories) {
          if (subcatIds.has(sub.id)) {
            relevantSubcategories.push({
              id: sub.id,
              code: sub.code,
              name: sub.name,
              category_code: cat.code,
              milestones: sub.milestones,
            });
          }
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await supabase.functions.invoke("generate-milestone-suggestions", {
        body: {
          resident_id: selectedResident,
          date_start: startDate,
          date_end: endDate,
          feedback_entries: filteredFeedback.map((fb) => ({
            comment: fb.comment,
            sentiment: fb.sentiment,
            competency_subcategory_id: fb.competency_subcategory_id,
            created_at: fb.created_at,
          })),
          subcategories: relevantSubcategories,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error) throw res.error;
      const suggestions: Suggestion[] = res.data?.suggestions || [];

      const items: ReportItem[] = [];
      for (const cat of categories) {
        for (const sub of cat.subcategories) {
          const suggestion = suggestions.find((s) => s.subcategory_id === sub.id);
          const fbForSub = filteredFeedback.filter(
            (fb) => fb.competency_subcategory_id === sub.id
          );
          if (suggestion || fbForSub.length > 0) {
            items.push({
              subcategoryId: sub.id,
              subcategoryCode: sub.code,
              subcategoryName: sub.name,
              categoryId: cat.id,
              categoryCode: cat.code,
              categoryName: cat.name,
              categoryColor: cat.color,
              milestones: sub.milestones,
              selectedLevel: suggestion?.suggested_level || 1,
              comment: suggestion?.suggested_comment || "",
              finalized: false,
              feedbackCount: fbForSub.length,
              positiveCount: fbForSub.filter((f) => f.sentiment === "positive").length,
              negativeCount: fbForSub.filter((f) => f.sentiment === "negative").length,
            });
          }
        }
      }

      setReportItems(items);
      setGenerated(true);
    } catch (e) {
      console.error("Generate error:", e);
      toast({ title: "Failed to generate report", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const updateItem = (idx: number, updates: Partial<ReportItem>) => {
    setReportItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...updates } : item))
    );
  };

  const handleFinalize = async (idx: number) => {
    const item = reportItems[idx];
    if (!user || !selectedResident) return;

    const { error } = await (supabase as any).from("milestone_reports").upsert(
      {
        faculty_id: user.id,
        resident_id: selectedResident,
        subcategory_id: item.subcategoryId,
        milestone_level: item.selectedLevel,
        comment: item.comment,
        date_range_start: startDate,
        date_range_end: endDate,
        finalized: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict:
          "faculty_id,resident_id,subcategory_id,date_range_start,date_range_end",
      }
    );

    if (error) {
      toast({ title: "Failed to save", variant: "destructive" });
      return;
    }

    updateItem(idx, { finalized: true });
    toast({ title: "Sub-competency finalized" });
  };

  const handleEdit = (idx: number) => {
    updateItem(idx, { finalized: false });
  };

  const allFinalized =
    reportItems.length > 0 && reportItems.every((item) => item.finalized);

  // Group items by category
  const groupedItems = useMemo(() => {
    const map = new Map<string, { cat: { id: string; code: string; name: string; color: string }; items: { item: ReportItem; idx: number }[] }>();
    reportItems.forEach((item, idx) => {
      if (!map.has(item.categoryId)) {
        map.set(item.categoryId, {
          cat: { id: item.categoryId, code: item.categoryCode, name: item.categoryName, color: item.categoryColor },
          items: [],
        });
      }
      map.get(item.categoryId)!.items.push({ item, idx });
    });
    return Array.from(map.values());
  }, [reportItems]);

  // PDF helpers
  const residentName = nameMap.get(selectedResident) || "?";
  const currentUserName = user ? (nameMap.get(user.id) || "?") : "?";

  const buildGroupedResults = () =>
    groupedItems.map(({ cat, items }) => ({
      categoryName: cat.name,
      categoryCode: cat.code,
      items: items.map(({ item }) => ({
        subcategoryCode: item.subcategoryCode,
        subcategoryName: item.subcategoryName,
        milestoneLevel: item.selectedLevel,
        comment: item.comment,
        feedbackCount: item.feedbackCount,
        positiveCount: item.positiveCount,
        negativeCount: item.negativeCount,
      })),
    }));

  const handleDownloadPdf = () => {
    const doc = generateReportPdf({
      residentName,
      facultyName: currentUserName,
      dateStart: startDate ? format(parseISO(startDate), "MMM d, yyyy") : startDate,
      dateEnd: endDate ? format(parseISO(endDate), "MMM d, yyyy") : endDate,
      groupedResults: buildGroupedResults(),
    });
    doc.save(
      `milestone-report-${residentName.replace(/\s+/g, "-").toLowerCase()}-${startDate}-to-${endDate}.pdf`
    );
  };


  return (
    <div className="flex flex-col gap-4">
      {/* Controls card */}
      <div
        className="rounded-lg p-4"
        style={{ background: "#E7EBEF", border: "0.5px solid #C9CED4" }}
      >
        <div className="flex flex-col gap-3">
          {/* Resident selector */}
          <div>
            <label className="text-[11px] mb-1 block" style={{ color: "#8A9AAB" }}>
              Resident
            </label>
            <select
              value={selectedResident}
              onChange={(e) => {
                setSelectedResident(e.target.value);
                setGenerated(false);
                setReportItems([]);
              }}
              className="w-full h-10 px-3 text-sm rounded-lg"
              style={{ background: "white", border: "1px solid #C9CED4" }}
            >
              <option value="">Select resident...</option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatPersonName(r)}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] mb-1 block" style={{ color: "#8A9AAB" }}>
                From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg"
                style={{ background: "white", border: "1px solid #C9CED4" }}
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] mb-1 block" style={{ color: "#8A9AAB" }}>
                To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg"
                style={{ background: "white", border: "1px solid #C9CED4" }}
              />
            </div>
          </div>

          {/* Feedback count + Generate */}
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "#8A9AAB" }}>
              {filteredFeedback.length} feedback{" "}
              {filteredFeedback.length === 1 ? "entry" : "entries"} in range
            </span>
            <button
              onClick={handleGenerate}
              disabled={
                generating ||
                !selectedResident ||
                !startDate ||
                !endDate ||
                filteredFeedback.length === 0
              }
              className="rounded-lg px-5 py-2 text-sm font-medium text-white flex items-center gap-2"
              style={{
                background:
                  generating ||
                  !selectedResident ||
                  !startDate ||
                  !endDate ||
                  filteredFeedback.length === 0
                    ? "#A0AEC0"
                    : "#415162",
                cursor:
                  generating ||
                  !selectedResident ||
                  !startDate ||
                  !endDate ||
                  filteredFeedback.length === 0
                    ? "default"
                    : "pointer",
              }}
            >
              {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {generating
                ? "Generating..."
                : generated
                ? "Regenerate"
                : "Generate report"}
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {generating && (
        <div className="text-center py-12">
          <Loader2
            className="h-6 w-6 animate-spin mx-auto mb-2"
            style={{ color: "#8A9AAB" }}
          />
          <p className="text-sm" style={{ color: "#8A9AAB" }}>
            Analyzing feedback and generating suggestions...
          </p>
        </div>
      )}

      {/* Results */}
      {generated && !generating && reportItems.length > 0 && (
        <>
          {/* Report header */}
          <div className="flex items-center justify-between">
            <div>
              <span
                className="text-[15px] font-semibold"
                style={{ color: "#2D3748" }}
              >
                {residentName}
              </span>
              <span className="text-[11px] ml-2" style={{ color: "#8A9AAB" }}>
                {startDate && endDate
                  ? `${format(parseISO(startDate), "MMM d, yyyy")} – ${format(
                      parseISO(endDate),
                      "MMM d, yyyy"
                    )}`
                  : ""}
              </span>
            </div>
            {allFinalized && (
              <span
                className="text-[10px] font-semibold rounded px-2 py-0.5"
                style={{ color: "#5E9E82", background: "#D1E7D1" }}
              >
                ALL FINALIZED
              </span>
            )}
          </div>

          {/* Download / Email buttons when all finalized */}
          {allFinalized && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ background: "#415162" }}
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </button>
              <button
                onClick={() => {
                  setEmailTo(defaultEmailSetting || "");
                  setEmailDialogOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: "#E7EBEF", color: "#415162", border: "0.5px solid #C9CED4" }}
              >
                <Mail className="h-3.5 w-3.5" />
                Email report
              </button>
            </div>
          )}

          {/* Grouped by category */}
          {groupedItems.map(({ cat, items }) => (
            <div key={cat.id}>
              <div
                className="text-[11px] font-semibold uppercase tracking-wider pt-3 pb-1"
                style={{ color: "#8A9AAB", letterSpacing: "0.5px" }}
              >
                {cat.name}
              </div>
              <div className="flex flex-col gap-2">
                {items.map(({ item, idx }) => (
                  <SubCompetencyCard
                    key={item.subcategoryId}
                    item={item}
                    onLevelChange={(level) => updateItem(idx, { selectedLevel: level })}
                    onCommentChange={(comment) => updateItem(idx, { comment })}
                    onFinalize={() => handleFinalize(idx)}
                    onEdit={() => handleEdit(idx)}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {generated && !generating && reportItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: "#8A9AAB" }}>
            No sub-competency data found for the selected feedback.
          </p>
        </div>
      )}

      {/* Email dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm bg-muted border-border rounded-xl p-0 [&>button[class*='absolute']]:hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <DialogTitle className="text-base font-medium">Email milestone report</DialogTitle>
          </div>
          <div className="px-5 pb-5 flex flex-col gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">To</label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full h-10 px-3 text-sm rounded-lg bg-background border border-border outline-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The PDF report will be sent as an attachment.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setEmailDialogOpen(false)}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-background border border-border"
                style={{ color: "#415162" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending || !emailTo}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium text-white disabled:opacity-50"
                style={{ background: "#415162" }}
              >
                {sending && <Loader2 className="h-3 w-3 animate-spin" />}
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sub-competency card component
interface SubCompetencyCardProps {
  item: ReportItem;
  onLevelChange: (level: number) => void;
  onCommentChange: (comment: string) => void;
  onFinalize: () => void;
  onEdit: () => void;
}

const SubCompetencyCard = ({
  item,
  onLevelChange,
  onCommentChange,
  onFinalize,
  onEdit,
}: SubCompetencyCardProps) => {
  const selectedMilestone = item.milestones.find(
    (m) => m.level === item.selectedLevel
  );

  return (
    <div
      className="rounded-lg p-3.5"
      style={{
        background: item.finalized ? "#E8F0E8" : "#E7EBEF",
        border: `0.5px solid ${item.finalized ? "#5E9E82" : "#C9CED4"}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold uppercase rounded px-1.5 py-0.5"
            style={{
              color: item.categoryColor,
              background: `${item.categoryColor}1A`,
            }}
          >
            {item.categoryCode}
          </span>
          <span
            className="text-[13px] font-semibold"
            style={{ color: "#2D3748" }}
          >
            {item.subcategoryCode} – {item.subcategoryName}
          </span>
        </div>
        {item.finalized && (
          <span
            className="text-[10px] font-semibold rounded px-2 py-0.5"
            style={{ color: "#5E9E82", background: "#D1E7D1" }}
          >
            FINALIZED
          </span>
        )}
      </div>

      {/* Observation count */}
      <div className="text-[11px] mb-3" style={{ color: "#8A9AAB" }}>
        {item.feedbackCount} observation{item.feedbackCount !== 1 ? "s" : ""} ·{" "}
        {item.positiveCount} positive · {item.negativeCount} negative
      </div>

      {/* Milestone level selector */}
      <div className="mb-3">
        <label className="text-[11px] block mb-1.5" style={{ color: "#8A9AAB" }}>
          Milestone level
        </label>
        <div className="flex gap-2 mb-1.5">
          {[1, 2, 3, 4, 5].map((level) => {
            const milestone = item.milestones.find((m) => m.level === level);
            const isSelected = item.selectedLevel === level;
            return (
              <button
                key={level}
                title={milestone?.description || `Level ${level}`}
                disabled={item.finalized}
                onClick={() => onLevelChange(level)}
                className="w-8 h-8 rounded-full text-sm font-medium flex items-center justify-center transition-colors"
                style={{
                  background: isSelected ? "#415162" : "#F5F3EE",
                  color: isSelected ? "white" : "#5F7285",
                  border: isSelected
                    ? "2px solid #415162"
                    : "1px solid #C9CED4",
                  opacity: item.finalized ? 0.7 : 1,
                  cursor: item.finalized ? "default" : "pointer",
                }}
              >
                {level}
              </button>
            );
          })}
        </div>
        {selectedMilestone && (
          <p className="text-[11px] italic" style={{ color: "#5F7285" }}>
            {selectedMilestone.description}
          </p>
        )}
      </div>

      {/* Comment */}
      <div className="mb-3">
        <label className="text-[11px] block mb-1.5" style={{ color: "#8A9AAB" }}>
          Comment
        </label>
        {item.finalized ? (
          <div
            className="rounded-md px-3 py-2.5 text-sm min-h-[80px] prose prose-sm max-w-none"
            style={{ background: "white", border: "1px solid #C9CED4" }}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(item.comment),
            }}
          />
        ) : (
          <PlainTextEditor
            content={item.comment}
            onChange={onCommentChange}
          />
        )}
      </div>

      {/* Action button */}
      <div className="flex justify-end">
        {item.finalized ? (
          <button
            onClick={onEdit}
            className="rounded-md px-3.5 py-1.5 text-xs font-medium"
            style={{
              background: "white",
              color: "#415162",
              border: "1px solid #C9CED4",
            }}
          >
            Edit
          </button>
        ) : (
          <button
            onClick={onFinalize}
            className="rounded-md px-3.5 py-1.5 text-xs font-medium text-white"
            style={{ background: "#415162" }}
          >
            Finalize
          </button>
        )}
      </div>
    </div>
  );
};

export default MilestoneReport;
