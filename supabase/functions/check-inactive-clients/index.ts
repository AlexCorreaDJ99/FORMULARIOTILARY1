import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: inactiveForms, error: formsError } = await supabase
      .from('app_forms')
      .select('id, client_id, last_activity_date, progress_percentage')
      .lt('last_activity_date', twoDaysAgo.toISOString())
      .lt('progress_percentage', 100);

    if (formsError) throw formsError;

    const notificationsCreated = [];

    for (const form of inactiveForms || []) {
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('id, created_at')
        .eq('client_id', form.client_id)
        .eq('type', 'inactive_warning')
        .gte('created_at', twoDaysAgo.toISOString());

      if (!existingNotifications || existingNotifications.length === 0) {
        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', form.client_id)
          .maybeSingle();

        if (client) {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              client_id: form.client_id,
              type: 'inactive_warning',
              message: `${client.name} está inativo há mais de 2 dias (${form.progress_percentage}% completo)`,
            });

          if (!notificationError) {
            notificationsCreated.push(form.client_id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: inactiveForms?.length || 0,
        notificationsCreated: notificationsCreated.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});