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
        .from('client_notifications')
        .select('id, created_at')
        .eq('client_id', form.client_id)
        .eq('notification_type', 'inactive_2_days')
        .gte('created_at', twoDaysAgo.toISOString());

      if (!existingNotifications || existingNotifications.length === 0) {
        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', form.client_id)
          .maybeSingle();

        if (client) {
          const { error: notificationError } = await supabase
            .from('client_notifications')
            .insert({
              client_id: form.client_id,
              notification_type: 'inactive_2_days',
              message: `Cliente ${client.name} não acessa o formulário há 2 dias (${form.progress_percentage}% completo)`,
              metadata: {
                form_id: form.id,
                progress: form.progress_percentage,
                last_activity: form.last_activity_date
              }
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