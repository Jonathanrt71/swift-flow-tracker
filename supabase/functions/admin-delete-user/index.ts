const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller identity
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !caller) throw new Error("Unauthorized");

    // Check caller is admin via direct query
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!callerRole) throw new Error("Forbidden: admin role required");

    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id is required");
    if (user_id === caller.id) throw new Error("Cannot delete yourself");

    // Delete the auth user — FK cascades handle all related data
    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    if (error) throw new Error(`Auth delete failed: ${error.message || JSON.stringify(error)}`);

    // Clean up profile if it survived (in case FK is to profiles not auth.users)
    await adminClient.from("profiles").delete().eq("id", user_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    const status = error.message === "Forbidden: admin role required" ? 403 : 400;
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
