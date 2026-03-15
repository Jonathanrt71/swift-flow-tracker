import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !caller) throw new Error("Unauthorized");

    const { data: isAdmin } = await anonClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const { user_id, role } = await req.json();
    if (!user_id || !role) throw new Error("user_id and role are required");
    if (!["admin", "user"].includes(role)) throw new Error("Invalid role");
    if (user_id === caller.id) throw new Error("Cannot change your own role");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert the role
    const { error } = await adminClient
      .from("user_roles")
      .upsert({ user_id, role }, { onConflict: "user_id,role" });

    if (error) {
      // If changing role, delete old and insert new
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      const { error: insertErr } = await adminClient
        .from("user_roles")
        .insert({ user_id, role });
      if (insertErr) throw insertErr;
    }

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
