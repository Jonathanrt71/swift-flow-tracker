const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { comment, sentiment, guidanceLevel, currentLevels } = await req.json();
    if (!comment || typeof comment !== "string" || comment.trim().length < 10) {
      return new Response(JSON.stringify({ milestones: [], evalDomains: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const guidanceCap = guidanceLevel === "substantial"
      ? "CRITICAL: The faculty reported the resident needed SUBSTANTIAL assistance. This means the milestone level MUST NOT exceed 2, regardless of how complex the task sounds. Substantial assistance = Level 0-2 only."
      : guidanceLevel === "some"
      ? "IMPORTANT: The faculty reported the resident needed SOME assistance. This means the milestone level should generally be capped at 3. Some assistance = Level 1-3 typically."
      : guidanceLevel === "minimal"
      ? "The faculty reported the resident needed MINIMAL assistance. The resident was largely independent. Levels 3-5 are appropriate based on task complexity."
      : "No guidance level was provided. Use the comment content to infer the level.";

    const systemPrompt = `You are an ACGME Family Medicine milestone classifier and evaluation assistant. Given a faculty feedback comment about a resident and its sentiment (positive or negative), do TWO things:

1. MILESTONE MAPPING: Identify the 1-2 most relevant subcompetencies and milestone levels. Only return 2 if the comment genuinely covers two distinct areas. Do not force a second if the comment only relates to one.

2. EVALUATION DOMAIN MAPPING: Map the comment to the relevant evaluation domains with a rating.

Current milestone levels: ${currentLevels ? JSON.stringify(currentLevels) : "Not provided."}
Feedback sentiment: ${sentiment || "not specified"}

${guidanceCap}

Return ONLY a JSON object with two arrays, no other text:

{
  "milestones": [
    {"subcategoryCode": "PC1", "level": 3, "reason": "brief 5-8 word explanation"}
  ],
  "evalDomains": [
    {"domain": "medical_knowledge", "rating": "meets"}
  ]
}

MILESTONE RULES:
- Return 1-2 milestone objects (never 0, never more than 2)
- subcategoryCode must be one of: PC1, PC2, PC3, PC4, PC5, MK1, MK2, SBP1, SBP2, SBP3, SBP4, PBLI1, PBLI2, PROF1, PROF2, PROF3, ICS1, ICS2, ICS3
- level is integer 0-5
- Levels: 0=critical deficiency/unacceptable, 1=novice/recognizes, 2=developing/applies basics, 3=competent/manages independently, 4=advanced/complex cases, 5=expert/teaches/leads
- Use Level 0 for clearly unacceptable behavior (unprofessional conduct, patient safety violations, repeated tardiness, dishonesty)
- The guidance level (substantial/some/minimal assistance) is the PRIMARY factor for determining milestone level. Task complexity is secondary. A resident doing a complex task with substantial help is NOT at a high milestone level.
- If sentiment is positive, level should generally be at or above current level (but still respect the guidance cap)
- If sentiment is negative, level may be below current level

EVAL DOMAIN RULES:
- Return 1-3 eval domain objects
- domain must be one of: direct_patient_care, medical_knowledge, clinical_reasoning, evidence_based, communication, care_transitions, professionalism_flag
- For domains other than professionalism_flag, rating must be: needs_improvement, meets, exceeds, or na
- For professionalism_flag, rating must be: none, minor, or significant
- If the comment has ANY professionalism or patient safety relevance, always include a professionalism_flag entry
- If sentiment is positive, rating is typically "meets" or "exceeds"
- If sentiment is negative, rating is typically "needs_improvement"`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [
          { role: "user", content: comment },
        ],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Anthropic API error [${response.status}]`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const milestones = Array.isArray(parsed.milestones) ? parsed.milestones.slice(0, 2) : [];
    const evalDomains = Array.isArray(parsed.evalDomains) ? parsed.evalDomains.slice(0, 4) : [];

    return new Response(JSON.stringify({ milestones, evalDomains }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const error = e as Error;
    console.error("suggest-competency error:", error);
    return new Response(
      JSON.stringify({ milestones: [], evalDomains: [], error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
