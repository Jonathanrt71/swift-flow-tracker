import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user is faculty or admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("faculty")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { feedback_entries, subcategories } = await req.json();

    if (!feedback_entries?.length || !subcategories?.length) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the prompt
    const subcatInfo = subcategories.map((sc: any) => {
      const milestoneDesc = (sc.milestones || [])
        .map((m: any) => `  Level ${m.level}: ${m.description}`)
        .join("\n");
      return `Sub-competency: ${sc.code} - ${sc.name}\nMilestones:\n${milestoneDesc}`;
    }).join("\n\n");

    const feedbackText = feedback_entries.map((fb: any, i: number) => {
      return `${i + 1}. [${fb.sentiment}] ${fb.comment} (subcategory: ${fb.competency_subcategory_id || "none"})`;
    }).join("\n");

    const systemPrompt = `You are an ACGME milestone assessment expert. Based on faculty feedback observations about a resident, suggest milestone levels and synthesized comments for each sub-competency.

For each sub-competency provided, analyze the relevant feedback and:
1. Suggest a milestone level (0-5) based on the observed behaviors. Use level 0 ("Does not meet level 1") when the resident fails to demonstrate basic competency.
2. Write a brief synthesized comment summarizing the evidence

Return a JSON array with objects containing: subcategory_id, suggested_level (integer 0-5), suggested_comment (string).
Only include sub-competencies that have relevant feedback. Return ONLY the JSON array, no markdown or other text.`;

    const userPrompt = `Here are the ACGME sub-competencies and their milestone levels:\n\n${subcatInfo}\n\nHere are the feedback observations:\n\n${feedbackText}\n\nAnalyze the feedback and suggest milestone levels for each relevant sub-competency.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          { role: "user", content: `${systemPrompt}\n\n${userPrompt}` },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.content?.[0]?.text || "[]";

    // Parse the JSON from Claude's response
    let suggestions;
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error("Failed to parse AI response:", content);
      suggestions = [];
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
