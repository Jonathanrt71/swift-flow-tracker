const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mediaType, profileId } = await req.json();

    if (!imageBase64 || !profileId) {
      return new Response(
        JSON.stringify({ error: "imageBase64 and profileId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Call Claude vision to extract table data
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/png",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `Extract the Log Book Counts table from this screenshot. Return ONLY a JSON array of objects, no other text. Each object should have "encounter_type" (the log book name exactly as shown) and "total" (the Residency Total number, or if only one total column, use that). Example: [{"encounter_type": "Adult ED Encounters (125 required)", "total": 1}]. If you cannot find a log book counts table, return an empty array [].`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      throw new Error(`Anthropic API error [${response.status}]`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const rows = JSON.parse(clean) as { encounter_type: string; total: number }[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ rows: [], message: "No log book data found in image" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Write to Supabase
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete existing rows for this resident, then insert fresh
    await supabase.from("logbook_counts").delete().eq("profile_id", profileId);

    const inserts = rows.map((r) => ({
      profile_id: profileId,
      encounter_type: r.encounter_type,
      total: r.total,
    }));

    const { error: insertError } = await supabase.from("logbook_counts").insert(inserts);
    if (insertError) throw new Error(`Insert error: ${insertError.message}`);

    return new Response(
      JSON.stringify({ rows, message: `Saved ${rows.length} log book entries` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const error = e as Error;
    console.error("extract-logbook-counts error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
