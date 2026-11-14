import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type TableConfig = {
  name: string;
  orderColumn?: string; // column to order by; defaults to "created_at"
};

const TABLES: TableConfig[] = [
  { name: "profiles" },
  { name: "clients" },
  { name: "app_forms" },
  { name: "form_images", orderColumn: "uploaded_at" },
  { name: "notifications" },
  { name: "client_notifications" },
  { name: "admin_activity_logs" },
  { name: "admin_notifications" },
];

const PAGE_SIZE = 1000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Invalid token");
    }

    const { data: profile, error: profileError } = await authClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const snapshot: Record<string, unknown[]> = {};
    const errors: Record<string, string> = {};
    const counts: Record<string, number> = {};

    for (const { name: table, orderColumn } of TABLES) {
      const sortCol = orderColumn ?? "created_at";
      try {
        const allRows: unknown[] = [];
        let from = 0;

        while (true) {
          const to = from + PAGE_SIZE - 1;
          const { data, error } = await adminClient
            .from(table)
            .select("*")
            .order(sortCol, { ascending: true })
            .range(from, to);

          if (error) {
            // If the order column doesn't exist, retry without ordering
            if (
              error.message.includes("does not exist") ||
              error.message.includes("column") && error.message.includes(sortCol)
            ) {
              const { data: unsorted, error: unsortedError } = await adminClient
                .from(table)
                .select("*")
                .range(from, to);

              if (unsortedError) throw unsortedError;
              if (!unsorted || unsorted.length === 0) break;
              allRows.push(...unsorted);
              if (unsorted.length < PAGE_SIZE) break;
              from += PAGE_SIZE;
              continue;
            }
            throw error;
          }

          if (!data || data.length === 0) break;
          allRows.push(...data);
          if (data.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        snapshot[table] = allRows;
        counts[table] = allRows.length;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors[table] = msg;
        snapshot[table] = [];
        counts[table] = 0;
      }
    }

    const payload = {
      exported_at: new Date().toISOString(),
      exported_by: user.id,
      tables: TABLES.map((t) => t.name),
      counts,
      errors: Object.keys(errors).length > 0 ? errors : null,
      data: snapshot,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
