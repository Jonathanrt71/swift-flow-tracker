import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { comment } = await req.json();
    if (!comment || typeof comment !== "string" || comment.trim().length < 10) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an ACGME Family Medicine milestone classifier. Given a faculty feedback comment about a resident, identify the top 3 most relevant subcompetencies and milestone levels.

Return ONLY a JSON array with exactly 3 objects, no other text. Each object has:
- "subcategoryCode": the code like "PC1", "MK2", "PROF3", etc.
- "level": integer 1-5 for the milestone level
- "reason": brief 5-8 word explanation

The subcompetency codes are:
PC1 (Acutely ill patient), PC2 (Chronic illness), PC3 (Health promotion), PC4 (Undifferentiated patient), PC5 (Procedural skills),
MK1 (Medical knowledge), MK2 (Clinical reasoning),
SBP1 (Patient safety & QI), SBP2 (System navigation), SBP3 (Physician role in systems), SBP4 (Advocacy),
PBLI1 (Evidence-based practice), PBLI2 (Reflective practice),
PROF1 (Professional behavior), PROF2 (Accountability), PROF3 (Self-awareness),
ICS1 (Patient/family communication), ICS2 (Team communication), ICS3 (Systems communication)

Levels: 1=novice/recognizes, 2=developing/applies basics, 3=competent/manages independently, 4=advanced/complex cases, 5=expert/teaches/leads

Example response:
[{"subcategoryCode":"PC2","level":3,"reason":"Managing multiple chronic conditions independently"},{"subcategoryCode":"MK2","level":3,"reason":"Integrating clinical data for decisions"},{"subcategoryCode":"ICS1","level":2,"reason":"Building rapport with patients"}]`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: comment },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error [${response.status}]`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const suggestions = Array.isArray(parsed) ? parsed.slice(0, 3) : [];

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-competency error:", e);
    return new Response(
      JSON.stringify({ suggestions: [], error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
