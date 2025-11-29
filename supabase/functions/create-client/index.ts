import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateClientRequest {
  name: string;
  email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Invalid token");
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const { name, email }: CreateClientRequest = await req.json();

    if (!name || !email) {
      throw new Error("Name and email are required");
    }

    const generateAccessCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 9; i++) {
        if (i > 0 && i % 3 === 0) code += "-";
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const accessCode = generateAccessCode();
    const tempPassword = `temp_${accessCode.replace(/-/g, "")}`;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role: "client",
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Failed to create user");

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        email,
        name,
        role: "client",
      });

    if (profileError) throw profileError;

    const { data: clientData, error: clientError } = await supabaseAdmin
      .from("clients")
      .insert({
        user_id: authData.user.id,
        name,
        email,
        access_code: accessCode,
        status: "active",
        created_by: user.id,
      })
      .select()
      .single();

    if (clientError) throw clientError;

    const { error: formError } = await supabaseAdmin
      .from("app_forms")
      .insert({
        client_id: clientData.id,
        status: "not_started",
        progress_percentage: 0,
      });

    if (formError) throw formError;

    return new Response(
      JSON.stringify({
        success: true,
        client: clientData,
        accessCode,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
