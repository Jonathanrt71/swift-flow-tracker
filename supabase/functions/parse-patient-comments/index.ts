const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { pdfBase64, monthLabel } = await req.json();
    if (!pdfBase64 || !monthLabel) {
      return new Response(JSON.stringify({ error: "pdfBase64 and monthLabel are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
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
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
              },
              {
                type: "text",
                text: `Extract ALL individual comment rows from this Press Ganey patient satisfaction PDF. Each comment is a separate row in the "Comments Detail" table.

For each comment extract:
- received_date: the date in YYYY-MM-DD format
- survey_section: the Survey Section value (e.g. "Access", "Care Provider", "Moving Through Your Visit", "Nurse/Assistant", "Personal Issues", "Overall Assessment")
- comment_question: the Comment Question value
- provider_name: the Provider name exactly as shown (e.g. "Cheever, Brian" or "Medina Mieles, Mauricio")
- rating: lowercase rating type (positive, neutral, negative, mixed, or open)
- comment: the full comment text
- survey_barcode: the Survey Barcode number

Return ONLY a JSON array of objects with these exact keys. No markdown, no explanation, just the JSON array. If a field is empty, use an empty string.`,
              },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Anthropic API error: ${resp.status} ${errText}`);
    }

    const data = await resp.json();
    const text = data.content?.map((b: any) => b.text || "").join("") || "";

    let comments;
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      comments = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(comments)) {
      return new Response(JSON.stringify({ error: "Expected array", raw: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add month_label to each comment
    const rows = comments.map((c: any) => ({
      received_date: c.received_date || "",
      survey_section: c.survey_section || "",
      comment_question: c.comment_question || "",
      provider_name: c.provider_name || "",
      rating: (c.rating || "").toLowerCase(),
      comment: c.comment || "",
      survey_barcode: c.survey_barcode || "",
      month_label: monthLabel,
    }));

    return new Response(JSON.stringify({ comments: rows, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
