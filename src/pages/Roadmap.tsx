import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import HeaderLogo from "@/components/HeaderLogo";
import NotificationBell from "@/components/NotificationBell";

const TIER = { EASY: "easy", MODERATE: "moderate", HARD: "hard", OUTSIDE: "outside" } as const;
type Tier = typeof TIER[keyof typeof TIER];

type AcgmeLevel = "critical" | "high" | "medium" | "low" | "none";

interface RoadmapItem {
  name: string;
  category: string;
  status: "missing" | "partial" | "external" | "scrapped";
  difficulty: Tier;
  estimate: string;
  acgme: AcgmeLevel;
  rationale: string;
  externalTool?: string;
}

const items: RoadmapItem[] = [
  // ── EASY ──
  { name: "Advisor / Mentorship Assignments", category: "Personnel", status: "missing", difficulty: TIER.EASY, estimate: "2–3 hrs", acgme: "medium", rationale: "Add a mentor_id FK on profiles, a dropdown on Resident Summary, and display it. Minimal UI, no new page needed." },
  { name: "Faculty Roster / Directory", category: "Personnel", status: "partial", difficulty: TIER.EASY, estimate: "3–4 hrs", acgme: "medium", rationale: "Query existing profiles filtered to faculty role. New page with card layout showing credentials, role, teaching areas. Data already exists." },
  { name: "Resident Evaluations of Faculty (Import)", category: "Assessment", status: "external", difficulty: TIER.EASY, estimate: "3–4 hrs", acgme: "high", rationale: "Import anonymized summary data from New Innovations export. Display as read-only cards on a faculty profile view. No new forms needed. ACGME requires programs to use resident feedback for faculty development." },
  { name: "Resident Evaluations of Rotations (Import)", category: "Assessment", status: "external", difficulty: TIER.EASY, estimate: "3–4 hrs", acgme: "high", rationale: "Same pattern as faculty eval import. Parse NI export, store in a table, display on the Rotations page per rotation. Required by ACGME for program evaluation." },
  { name: "Wellness Resource Directory", category: "Wellness", status: "partial", difficulty: TIER.EASY, estimate: "2–3 hrs", acgme: "medium", rationale: "Static content page with EAP contacts, mental health resources, fitness info. Could be a Handbook section or standalone page. Mostly content entry." },
  { name: "Faculty Development Tracking", category: "Personnel", status: "missing", difficulty: TIER.EASY, estimate: "3–4 hrs", acgme: "high", rationale: "Simple log table: faculty_id, date, activity_type, description. List view with add/edit. No complex relationships. ACGME explicitly requires programs to support and document faculty development." },
  { name: "ACGME Survey Data Tracking", category: "Compliance", status: "missing", difficulty: TIER.EASY, estimate: "3–4 hrs", acgme: "critical", rationale: "Annual data entry — store survey year, flagged items, scores. Display as year-over-year table. Small dataset, simple schema. Survey results directly trigger ACGME follow-up actions." },
  { name: "Conference Presentation Tracking", category: "Scholarly", status: "missing", difficulty: TIER.EASY, estimate: "2–3 hrs", acgme: "medium", rationale: "Part of Scholarly Activity module, but standalone it's just a log: resident, title, conference, date, type (poster/oral). Simple CRUD." },
  { name: "Orientation Materials / Welcome Package", category: "Recruitment", status: "partial", difficulty: TIER.EASY, estimate: "2–3 hrs", acgme: "low", rationale: "Curate existing Handbook and Rotation content into a dedicated 'New Resident' landing page with quick links. Content assembly, not new features." },
  { name: "Site Visit Preparation", category: "Compliance", status: "partial", difficulty: TIER.EASY, estimate: "3–4 hrs", acgme: "high", rationale: "Checklist page linked to Compliance module. Template-driven: list of documents to stage, interview prep items. Mostly static with checkbox tracking." },
  { name: "Simulation / Skills Lab Tracking", category: "Curriculum", status: "missing", difficulty: TIER.EASY, estimate: "3–4 hrs", acgme: "low", rationale: "Filter/view within existing Procedure Logs for sim entries. Add a sim-specific summary card. Minimal new code — mostly a filtered view of existing data." },
  { name: "App Badge Count (Client-Side)", category: "Operations", status: "scrapped", difficulty: TIER.EASY, estimate: "4–6 hrs", acgme: "none", rationale: "Scrapped — navigator.setAppBadge() only fires when app is in foreground, making it redundant with the in-app notification bell. Would need push notifications for background badge updates, which is a much larger lift." },
  { name: "Site-Wide Search", category: "Operations", status: "missing", difficulty: TIER.EASY, estimate: "4–6 hrs", acgme: "none", rationale: "Search input in the header that queries across handbook_sections, events, tasks, announcements, and other key tables using ilike matching. Returns grouped results by section. No AI needed — fully deterministic. Quick win for navigation across growing content." },
  { name: "AI Read-Only Query Box", category: "Operations", status: "missing", difficulty: TIER.MODERATE, estimate: "8–12 hrs", acgme: "none", rationale: "Natural language input on Home page. New Supabase edge function pulls relevant data for the logged-in user (tasks, feedback, procedures, block schedule, milestones) scoped by RLS, sends data + question to Claude, returns plain-English answer. Read-only — no mutations. Two approaches: simple (always send all user data) or smart (classify question first, targeted query). Iterative prompt tuning required." },

  // ── MODERATE ──
  { name: "ITE Score Tracking", category: "Assessment", status: "missing", difficulty: TIER.MODERATE, estimate: "6–8 hrs", acgme: "high", rationale: "New table for annual scores per resident. Import from spreadsheet/PDF. Trend chart (Recharts already in stack). Subject-area breakdown view. ACGME reviews board pass rates and ITE trends as program quality indicators." },
  { name: "Integrated Evaluations (Native Build)", category: "Assessment", status: "partial", difficulty: TIER.MODERATE, estimate: "10–14 hrs", acgme: "critical", rationale: "Currently imported from New Innovations. Plan to build native evaluation forms, distribution, collection, and scoring within the app. Moderate-to-hard depending on form builder complexity. Core ACGME requirement — evaluations drive milestone assignments." },
  { name: "Journal Club / Case Conference Tracking", category: "Curriculum", status: "missing", difficulty: TIER.MODERATE, estimate: "4–6 hrs", acgme: "medium", rationale: "Extend Events with conference subtypes, presenter assignment, attendance tracking per session. Touches existing Events code but adds new data relationships." },
  { name: "Didactic Curriculum Calendar Enhancement", category: "Curriculum", status: "partial", difficulty: TIER.MODERATE, estimate: "6–8 hrs", acgme: "high", rationale: "Add topic mapping, speaker assignments, and per-session attendance to Events. Curriculum year template for repeating schedules. ACGME requires structured didactic curriculum with documented attendance." },
  { name: "Notification Center", category: "Operations", status: "partial", difficulty: TIER.MODERATE, estimate: "8–12 hrs", acgme: "low", rationale: "New notifications table, triggers from multiple modules (tasks, evaluations, compliance). In-app badge + dropdown. Optional email via Resend. Cross-cutting concern touching many modules. Operational value, not ACGME-driven." },
  { name: "Document Repository / File Storage", category: "Operations", status: "partial", difficulty: TIER.MODERATE, estimate: "6–8 hrs", acgme: "medium", rationale: "Supabase storage bucket, upload UI, category/tag organization, search. File preview for PDFs/images. Useful for storing policies, meeting minutes, and site visit evidence." },
  { name: "Onboarding Checklist", category: "Recruitment", status: "missing", difficulty: TIER.MODERATE, estimate: "6–8 hrs", acgme: "medium", rationale: "Checklist template (admin-configurable items), per-resident instance with completion tracking, deadline management. New page + two tables. Reusable annually." },
  { name: "Scholarly Activity Module", category: "Scholarly", status: "missing", difficulty: TIER.MODERATE, estimate: "8–12 hrs", acgme: "critical", rationale: "Project registry with status workflow, type categorization, mentor assignment, milestone dates. Presentation/publication sub-records. ACGME requires documented scholarly activity for every resident." },
  { name: "QI Project Management", category: "Scholarly", status: "missing", difficulty: TIER.MODERATE, estimate: "6–8 hrs", acgme: "high", rationale: "Could share the Scholarly Activity page as a project type. PDSA cycle tracking adds structured workflow. ACGME expects resident participation in QI as part of practice-based learning." },
  { name: "Direct Observation / Mini-CEX Forms", category: "Assessment", status: "missing", difficulty: TIER.MODERATE, estimate: "6–8 hrs", acgme: "high", rationale: "Mobile-friendly form with competency ratings, free-text feedback, and link to milestone subcategories. New table + form UI. ACGME requires direct observation as an assessment method." },
  { name: "Remediation / Probation Tracking", category: "Wellness", status: "missing", difficulty: TIER.MODERATE, estimate: "8–10 hrs", acgme: "critical", rationale: "Admin-only confidential module. Remediation plan creation with milestones, timeline, progress documentation. ACGME requires due process documentation; poor tracking creates legal and accreditation risk." },
  { name: "Wellness Pulse Surveys", category: "Wellness", status: "missing", difficulty: TIER.MODERATE, estimate: "6–8 hrs", acgme: "medium", rationale: "Anonymous survey creation, distribution, response collection, aggregate reporting. Anonymity requires careful design. Demonstrates commitment to ACGME wellness requirements." },
  { name: "360° / Multi-Source Feedback", category: "Assessment", status: "external", difficulty: TIER.MODERATE, estimate: "8–10 hrs", acgme: "high", rationale: "If importing from NI, moderate. If building native: multi-rater form distribution, collection, anonymized aggregation. ACGME requires multi-source feedback as part of milestone assessment." },
  { name: "Rotation Goals & Objectives PDFs", category: "Curriculum", status: "partial", difficulty: TIER.MODERATE, estimate: "6–10 hrs", acgme: "critical", rationale: "Google Sheets data source → batch PDF generation for ~40 rotations. ACGME requires written G&Os for every rotation with competency mapping. Site visitors ask for these." },
  { name: "Self-Study / 10-Year Review Prep", category: "Compliance", status: "partial", difficulty: TIER.MODERATE, estimate: "8–10 hrs", acgme: "critical", rationale: "Chapter-by-chapter data collection tracker, document assembly workflow, timeline management. Extends Compliance module. The self-study is the most consequential accreditation document a program produces." },

  // ── HARD ──
  { name: "Leave / Absence Tracking", category: "Personnel", status: "missing", difficulty: TIER.HARD, estimate: "12–16 hrs", acgme: "critical", rationale: "Request/approval workflow, multiple leave types with different balance rules, impact on training time calculations, integration with block schedule. ACGME requires programs to track time away and determine impact on meeting training requirements for graduation." },
  { name: "Graduation Readiness Dashboard", category: "Recruitment", status: "missing", difficulty: TIER.HARD, estimate: "12–16 hrs", acgme: "critical", rationale: "Aggregates completion status from procedures, evaluations, milestones, scholarly activity, leave/time, and rotations into a single per-resident view. Programs must verify all requirements are met before graduation." },
  { name: "Annual Program Evaluation (APE) Module", category: "Compliance", status: "missing", difficulty: TIER.HARD, estimate: "14–18 hrs", acgme: "critical", rationale: "Structured template with required data points pulled from multiple sources. Action plan tracking with responsible parties and deadlines. Year-over-year comparison. The APE is a required annual deliverable reviewed by ACGME." },
  { name: "CCC Meeting Workflow", category: "Assessment", status: "partial", difficulty: TIER.HARD, estimate: "12–16 hrs", acgme: "critical", rationale: "Auto-generate agenda from resident data across milestones, evaluations, procedures, and feedback. Capture committee decisions per milestone. Generate meeting minutes. CCC is a required ACGME committee." },
  { name: "Continuity Clinic Module", category: "Curriculum", status: "missing", difficulty: TIER.HARD, estimate: "14–18 hrs", acgme: "critical", rationale: "Patient panel assignment, session scheduling, panel size metrics, continuity rate calculations. ACGME Family Medicine requirements mandate longitudinal continuity with measurable metrics. Site visitors expect data." },
  { name: "Internal Messaging / Chat", category: "Operations", status: "missing", difficulty: TIER.HARD, estimate: "20+ hrs", acgme: "none", rationale: "Real-time messaging requires WebSocket/Supabase Realtime subscriptions, conversation threads, read receipts. High complexity, ongoing maintenance. No ACGME relevance. Low ROI given existing communication channels." },
  { name: "Budget / Financial Tracking", category: "Operations", status: "missing", difficulty: TIER.MODERATE, estimate: "6–8 hrs", acgme: "low", rationale: "If kept simple (expense log + category totals), moderate. Most PDs don't manage budgets directly. No direct ACGME requirement." },

  // ── OUTSIDE TOOLS ──
  { name: "Duty Hour Monitoring", category: "Compliance", status: "external", difficulty: TIER.OUTSIDE, estimate: "—", acgme: "critical", externalTool: "New Innovations", rationale: "Residents log hours weekly in New Innovations. Coordinator reviews for violations. NI provides rolling averages, violation detection, and ACGME-formatted reports. Keeping in NI avoids duplicating complex time-series rule calculations." },
  { name: "Applicant Review / Rank List", category: "Recruitment", status: "external", difficulty: TIER.OUTSIDE, estimate: "—", acgme: "medium", externalTool: "ERAS / Thalamus", rationale: "Applicant database, scoring, interview scheduling, and rank list managed through ERAS and interview management platforms. Purpose-built tools with Match integration. Building custom would be high effort for low ROI." },
];

const difficultyConfig: Record<Tier, { label: string; color: string; bg: string; description: string }> = {
  [TIER.EASY]: { label: "Easy", color: "#4A846C", bg: "#E4F0EB", description: "< 5 hours • Extends existing patterns" },
  [TIER.MODERATE]: { label: "Moderate", color: "#B8860B", bg: "#FFF8E1", description: "5–14 hours • New pages + data models" },
  [TIER.HARD]: { label: "Hard", color: "#9F2929", bg: "#FCEAEA", description: "12+ hours • Complex multi-module work" },
  [TIER.OUTSIDE]: { label: "Outside Tool", color: "#415162", bg: "#E7EBEF", description: "Managed externally • No build planned" },
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  missing: { label: "Not Built", color: "#9F2929", bg: "#FCEAEA" },
  partial: { label: "Partial", color: "#B8860B", bg: "#FFF8E1" },
  external: { label: "External", color: "#52657A", bg: "#E7EBEF" },
  scrapped: { label: "Scrapped", color: "#8A9AAB", bg: "#F0F0F0" },
};

const acgmeConfig: Record<AcgmeLevel, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "#fff", bg: "#9F2929" },
  high: { label: "High", color: "#fff", bg: "#D4A017" },
  medium: { label: "Medium", color: "#fff", bg: "#52657A" },
  low: { label: "Low", color: "#fff", bg: "#8A9AAB" },
  none: { label: "None", color: "#8A9AAB", bg: "#E7EBEF" },
};

// ── Rollout Plan ──
interface RolloutPhase {
  phase: number;
  title: string;
  timing: string;
  audience: string;
  rationale: string;
  features: { name: string; description: string }[];
}

const rolloutPlan: RolloutPhase[] = [
  {
    phase: 0,
    title: "Early Adoption",
    timing: "May – June 2026",
    audience: "Current PGY-1s & PGY-2s (rising PGY-2s & PGY-3s)",
    rationale: "Introduce core reference features before the academic year turns over. Rising seniors become familiar with the app and can model usage for incoming interns. No new workflows — just consumption.",
    features: [
      { name: "Handbook & Operations", description: "Program policies, protocols, and reference material available in-app." },
      { name: "Block Schedule", description: "Rotation schedule visible to all residents." },
      { name: "Announcements", description: "Program communications delivered through the app — establishes the habit of opening it." },
      { name: "Feedback (Faculty)", description: "Faculty begin submitting short coaching notes with thumbs up/down sentiment. Residents see feedback about themselves." },
    ],
  },
  {
    phase: 1,
    title: "Resident Home & Learning Plan",
    timing: "July 2026 (New Academic Year)",
    audience: "All residents + faculty",
    rationale: "New interns arrive to a platform that rising residents already use. Replace the default landing page with My Learning Plan — rotation header, focus topics, quick actions. Introduce topic selection for the first rotation. Residents experience agency from day one.",
    features: [
      { name: "My Learning Plan (Home)", description: "Resident-facing dashboard showing current rotation, focus topics, progress, and upcoming items." },
      { name: "Topic Selection", description: "Core topics locked, elective topics selectable. Residents choose focus areas for each rotation block." },
      { name: "Clinical Stakes Framing", description: "\"What's at stake for the patient\" context on every topic — connects learning to patient outcomes." },
    ],
  },
  {
    phase: 2,
    title: "Peer Layer & Self-Directed Learning",
    timing: "August – September 2026",
    audience: "All residents",
    rationale: "With learning plans established, activate the social and self-directed learning features. Peer practice creates relatedness. ILP tracking gives residents ownership of board prep. Both features require minimal faculty involvement.",
    features: [
      { name: "Peer Practice", description: "Residents pair up to practice clinical skills. Structured feedback with consequence-awareness prompt. \"Peers Looking for Partners\" board for self-organizing." },
      { name: "ILP / Practice Questions", description: "Self-reported board prep tracking. Residents choose source, volume, and schedule. Monthly log with weak-area identification." },
      { name: "Self-Assessment Layer", description: "First layer of the 4-tier assessment model (Self → Peer → Chief → Faculty). Residents self-assess on selected topics." },
    ],
  },
  {
    phase: 3,
    title: "Faculty Integration & Precepting",
    timing: "October – November 2026",
    audience: "Faculty + residents",
    rationale: "Faculty are now seeing resident feedback in the app. Layer in the precepting prompt and coaching note workflow. Faculty features should feel like teaching aids, not documentation burden. Start with the consequence question as an optional prompt during precepting.",
    features: [
      { name: "Precepting Prompt", description: "\"What happens to this patient if we get this wrong?\" — teaching moment prompt visible to faculty during precepting. Shows resident's current focus topics for context." },
      { name: "Faculty Coaching Notes", description: "Quick micro-feedback tied to specific topics. 30 seconds, not 15 minutes. Notes route to the resident's topic detail." },
      { name: "Peer Assessment Layer", description: "Second assessment tier activated. Peer practice sessions generate peer assessment data." },
    ],
  },
  {
    phase: 4,
    title: "Assessment Progression & AHD",
    timing: "December 2026 – January 2027",
    audience: "All residents + chief residents + faculty",
    rationale: "By now residents understand the platform philosophy. Activate the full assessment ladder and the AHD presentation template. Chief residents begin conducting reviews. Faculty assessment becomes the final validation layer.",
    features: [
      { name: "Chief Resident Review Layer", description: "Third assessment tier. Chief residents review topic competency after peer assessment is complete." },
      { name: "Faculty Assessment Layer", description: "Fourth and final assessment tier. Faculty validate competency demonstrations. Unlocks after chief review." },
      { name: "AHD Template with \"What's at Stake\"", description: "Structured AHD presentation template with required clinical consequences section. Residents choose topic, format, and style." },
      { name: "Scholarly Activity Tracking", description: "Project registry with status workflow — QI, case report, research, community health. Progress milestones with clinical stakes framing." },
    ],
  },
  {
    phase: 5,
    title: "Contribution & Community",
    timing: "February – March 2027",
    audience: "All residents",
    rationale: "Residents now have enough context to make meaningful choices about where to invest beyond clinical training. The reflection-before-commitment model ensures intentional engagement rather than checkbox participation.",
    features: [
      { name: "\"How Can I Contribute?\"", description: "Reflection prompt, program committee opportunities, community outreach, and resident-initiated ideas with \"Express Interest\" model." },
      { name: "Resident-Initiated Proposals", description: "Residents propose new initiatives. Peers signal interest. Program leadership reviews and approves." },
    ],
  },
];

const phaseColors = [
  { bg: "#E7EBEF", border: "#415162", text: "#415162" },
  { bg: "#DBEAFE", border: "#1E40AF", text: "#1E40AF" },
  { bg: "#E4F0EB", border: "#2D6A4F", text: "#2D6A4F" },
  { bg: "#FEF3C7", border: "#B45309", text: "#92400E" },
  { bg: "#FCEAEA", border: "#9F2929", text: "#9F2929" },
  { bg: "#EEEDFE", border: "#3C3489", text: "#3C3489" },
];

const allCategories = [...new Set(items.map((i) => i.category))].sort();
const allAcgmeLevels: AcgmeLevel[] = ["critical", "high", "medium", "low", "none"];

const Roadmap = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"rollout" | "features">("rollout");
  const [tierFilter, setTierFilter] = useState<Tier | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [acgmeFilter, setAcgmeFilter] = useState<AcgmeLevel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0]));

  const filtered = useMemo(() => {
    let result = items;
    if (tierFilter !== "all") result = result.filter((i) => i.difficulty === tierFilter);
    if (categoryFilter !== "all") result = result.filter((i) => i.category === categoryFilter);
    if (acgmeFilter !== "all") result = result.filter((i) => i.acgme === acgmeFilter);
    if (statusFilter !== "all") result = result.filter((i) => i.status === statusFilter);
    return result;
  }, [tierFilter, categoryFilter, acgmeFilter, statusFilter]);

  const counts = useMemo(() => ({
    easy: items.filter((i) => i.difficulty === TIER.EASY).length,
    moderate: items.filter((i) => i.difficulty === TIER.MODERATE).length,
    hard: items.filter((i) => i.difficulty === TIER.HARD).length,
    outside: items.filter((i) => i.difficulty === TIER.OUTSIDE).length,
  }), []);

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const togglePhase = (phase: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      next.has(phase) ? next.delete(phase) : next.add(phase);
      return next;
    });
  };

  const clearFilters = () => {
    setTierFilter("all");
    setCategoryFilter("all");
    setAcgmeFilter("all");
    setStatusFilter("all");
  };

  const hasActiveFilters = tierFilter !== "all" || categoryFilter !== "all" || acgmeFilter !== "all" || statusFilter !== "all";

  const tiers: Tier[] = tierFilter === "all"
    ? [TIER.EASY, TIER.MODERATE, TIER.HARD, TIER.OUTSIDE]
    : [tierFilter];

  return (
    <div style={{ background: "#F5F3EE", minHeight: "100vh" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "#415162" }}>
        <div className="flex items-center h-14 px-4">
          <HeaderLogo isAdmin={true} onSignOut={signOut}>
            <NotificationBell />
          </HeaderLogo>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px 40px" }}>
        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#2D3748", margin: 0 }}>Roadmap</h1>
          <p style={{ fontSize: 13, color: "#5F7285", margin: "4px 0 0" }}>
            Release plan and feature inventory
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #D5DAE0" }}>
          {([
            { key: "rollout" as const, label: "Release Plan" },
            { key: "features" as const, label: "Feature Inventory" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 18px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: activeTab === tab.key ? 600 : 500,
                color: activeTab === tab.key ? "#415162" : "#8A9AAB",
                borderBottom: activeTab === tab.key ? "2px solid #415162" : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ ROLLOUT PLAN TAB ═══ */}
        {activeTab === "rollout" && (
          <div>
            {/* Strategy summary */}
            <div style={{
              background: "#415162",
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 20,
              color: "#C9CED4",
              fontSize: 13,
              lineHeight: 1.7,
            }}>
              <div style={{ fontWeight: 700, color: "#fff", marginBottom: 6, fontSize: 14 }}>
                Rollout Strategy
              </div>
              <div style={{ fontSize: 12, color: "#C9CED4", lineHeight: 1.7 }}>
                Launch core reference features to current residents before the academic year ends so rising PGY-2s and PGY-3s
                build familiarity first. They become the model users when new interns arrive in July. Each phase builds on the
                previous one — no phase requires understanding features that haven't been introduced yet.
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 11, color: "#8A9AAB" }}>
                  <span style={{ color: "#fff", fontWeight: 600 }}>Phase 0:</span> Pre-launch (current residents)
                </div>
                <div style={{ fontSize: 11, color: "#8A9AAB" }}>
                  <span style={{ color: "#fff", fontWeight: 600 }}>Phases 1–5:</span> Academic year rollout
                </div>
                <div style={{ fontSize: 11, color: "#8A9AAB" }}>
                  <span style={{ color: "#fff", fontWeight: 600 }}>Total span:</span> ~10 months
                </div>
              </div>
            </div>

            {/* Timeline */}
            {rolloutPlan.map((phase) => {
              const pc = phaseColors[phase.phase] || phaseColors[0];
              const isExpanded = expandedPhases.has(phase.phase);

              return (
                <div key={phase.phase} style={{ marginBottom: 10 }}>
                  <div
                    onClick={() => togglePhase(phase.phase)}
                    style={{
                      background: "#fff",
                      borderRadius: 10,
                      border: `1px solid #D5DAE0`,
                      borderLeft: `4px solid ${pc.border}`,
                      overflow: "hidden",
                      cursor: "pointer",
                    }}
                  >
                    {/* Phase header */}
                    <div style={{
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: pc.border,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {phase.phase}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#2D3748" }}>
                          {phase.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#8A9AAB", marginTop: 2 }}>
                          {phase.timing} · {phase.audience}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: pc.text,
                          background: pc.bg,
                          padding: "3px 8px",
                          borderRadius: 4,
                        }}>
                          {phase.features.length} feature{phase.features.length !== 1 ? "s" : ""}
                        </span>
                        <span style={{
                          fontSize: 10,
                          color: "#8A9AAB",
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                          transition: "transform 0.15s",
                        }}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div style={{ padding: "0 16px 16px", borderTop: "1px solid #E7EBEF" }}>
                        {/* Rationale */}
                        <p style={{
                          fontSize: 12,
                          color: "#5F7285",
                          lineHeight: 1.6,
                          margin: "12px 0",
                          fontStyle: "italic",
                        }}>
                          {phase.rationale}
                        </p>

                        {/* Features list */}
                        {phase.features.map((feature, i) => (
                          <div key={i} style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: "8px 0",
                            borderBottom: i < phase.features.length - 1 ? "1px solid #E7EBEF" : "none",
                          }}>
                            <div style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: pc.border,
                              flexShrink: 0,
                              marginTop: 6,
                            }} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#2D3748" }}>
                                {feature.name}
                              </div>
                              <div style={{ fontSize: 12, color: "#5F7285", marginTop: 2, lineHeight: 1.5 }}>
                                {feature.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ FEATURE INVENTORY TAB ═══ */}
        {activeTab === "features" && (
          <div>

        {/* Tier summary cards */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {([TIER.EASY, TIER.MODERATE, TIER.HARD, TIER.OUTSIDE] as Tier[]).map((d) => {
            const c = difficultyConfig[d];
            const active = tierFilter === d;
            return (
              <button
                key={d}
                onClick={() => setTierFilter(tierFilter === d ? "all" : d)}
                style={{
                  flex: "1 1 110px",
                  background: active ? c.color : "#fff",
                  border: `1.5px solid ${c.color}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 700, color: active ? "#fff" : c.color }}>
                  {counts[d]}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: active ? "#fff" : c.color }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 10, color: active ? "rgba(255,255,255,0.75)" : "#8A9AAB", marginTop: 1 }}>
                  {c.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          {/* ACGME Importance */}
          <select
            value={acgmeFilter}
            onChange={(e) => setAcgmeFilter(e.target.value as AcgmeLevel | "all")}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1.5px solid ${acgmeFilter !== "all" ? acgmeConfig[acgmeFilter as AcgmeLevel]?.bg || "#C9CED4" : "#C9CED4"}`,
              background: acgmeFilter !== "all" ? acgmeConfig[acgmeFilter as AcgmeLevel]?.bg || "#fff" : "#fff",
              color: acgmeFilter !== "all" ? acgmeConfig[acgmeFilter as AcgmeLevel]?.color || "#3D3D3A" : "#3D3D3A",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">ACGME: All</option>
            {allAcgmeLevels.map((l) => (
              <option key={l} value={l}>ACGME: {acgmeConfig[l].label}</option>
            ))}
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1.5px solid ${categoryFilter !== "all" ? "#52657A" : "#C9CED4"}`,
              background: categoryFilter !== "all" ? "#E7EBEF" : "#fff",
              color: "#3D3D3A",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">Category: All</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1.5px solid ${statusFilter !== "all" ? "#52657A" : "#C9CED4"}`,
              background: statusFilter !== "all" ? "#E7EBEF" : "#fff",
              color: "#3D3D3A",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">Status: All</option>
            <option value="missing">Not Built</option>
            <option value="partial">Partial</option>
            <option value="external">External</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                color: "#9F2929",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear filters
            </button>
          )}

          <span style={{ fontSize: 11, color: "#8A9AAB", marginLeft: "auto" }}>
            {filtered.length} of {items.length}
          </span>
        </div>

        {/* Tier sections */}
        {tiers.map((tier) => {
          const tierItems = filtered.filter((i) => i.difficulty === tier);
          if (tierItems.length === 0) return null;
          const dc = difficultyConfig[tier];

          return (
            <div key={tier} style={{ marginBottom: 24 }}>
              <div style={{
                padding: "8px 0 6px",
                borderBottom: `2px solid ${dc.color}`,
                marginBottom: 8,
                display: "flex",
                alignItems: "baseline",
                gap: 8,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: dc.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {dc.label}
                </span>
                <span style={{ fontSize: 11, color: "#8A9AAB" }}>
                  {tierItems.length} item{tierItems.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {tierItems.map((item) => {
                  const sc = statusConfig[item.status];
                  const ac = acgmeConfig[item.acgme];
                  const isExpanded = expandedItems.has(item.name);

                  return (
                    <div
                      key={item.name}
                      style={{
                        background: "#fff",
                        borderRadius: 8,
                        border: "1px solid #D5DAE0",
                        borderLeft: `3px solid ${dc.color}`,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        onClick={() => toggleExpand(item.name)}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#2D3748", flex: "1 1 170px" }}>
                          {item.name}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: ac.color,
                            background: ac.bg,
                            padding: "2px 7px",
                            borderRadius: 4,
                            letterSpacing: "0.02em",
                          }}>
                            ACGME: {ac.label}
                          </span>
                          {item.estimate !== "—" && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: "#52657A",
                              background: "#E7EBEF",
                              padding: "2px 7px",
                              borderRadius: 4,
                            }}>
                              {item.estimate}
                            </span>
                          )}
                          {item.externalTool && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: "#415162",
                              background: "#D5DAE0",
                              padding: "2px 7px",
                              borderRadius: 4,
                            }}>
                              {item.externalTool}
                            </span>
                          )}
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: sc.color,
                            background: sc.bg,
                            padding: "2px 7px",
                            borderRadius: 4,
                          }}>
                            {sc.label}
                          </span>
                          <span style={{
                            fontSize: 10,
                            color: "#8A9AAB",
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                            transition: "transform 0.15s",
                            marginLeft: 2,
                          }}>
                            ▼
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: "0 14px 12px", borderTop: "1px solid #E7EBEF" }}>
                          <div style={{ fontSize: 11, color: "#5F7285", marginTop: 8, marginBottom: 6 }}>
                            <span style={{ fontWeight: 600 }}>Category:</span> {item.category}
                            {item.externalTool && (
                              <span style={{ marginLeft: 12 }}>
                                <span style={{ fontWeight: 600 }}>Tool:</span> {item.externalTool}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 13, color: "#3D3D3A", lineHeight: 1.55, margin: 0 }}>
                            {item.rationale}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#8A9AAB", fontSize: 13 }}>
            No items match the current filters.
          </div>
        )}

        {/* Bottom summary */}
        <div style={{
          background: "#415162",
          borderRadius: 10,
          padding: "16px 20px",
          marginTop: 8,
          color: "#C9CED4",
          fontSize: 13,
          lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 700, color: "#fff", marginBottom: 8, fontSize: 14 }}>
            Build Summary
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 10 }}>
            <div><span style={{ color: "#4A846C", fontWeight: 700 }}>Easy ({counts.easy}):</span> ~28–38 hrs</div>
            <div><span style={{ color: "#D4A017", fontWeight: 700 }}>Moderate ({counts.moderate}):</span> ~100–140 hrs</div>
            <div><span style={{ color: "#9F2929", fontWeight: 700 }}>Hard ({counts.hard}):</span> ~80–110 hrs</div>
            <div><span style={{ color: "#8A9AAB", fontWeight: 700 }}>Outside ({counts.outside}):</span> kept external</div>
          </div>
          <div style={{ color: "#8A9AAB", fontSize: 12 }}>
            Prioritize by cross-referencing difficulty with ACGME importance. The highest-value targets are ACGME Critical items in the Easy tier (ACGME Survey Tracking) and ACGME Critical items in Moderate (Scholarly Activity, Rotation G&Os, Remediation, Self-Study, Integrated Evaluations). Hard-tier Critical items (Leave, Graduation, APE, CCC, Continuity) are essential but can be sequenced across multiple build sessions.
          </div>
        </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Roadmap;
