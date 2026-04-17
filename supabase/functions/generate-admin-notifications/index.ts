import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const stats = {
      incomplete_form_alerts: 0,
      inactive_alerts: 0,
      project_not_started_alerts: 0,
      project_no_progress_alerts: 0,
      deadline_alerts: 0,
    };

    const CONCLUDED_STATUSES = ['completed', 'panel_delivered'];

    // --- 1. Formulário incompleto (progresso < 100%) ---
    const { data: incompleteForms } = await supabase
      .from('app_forms')
      .select('id, client_id, created_at, progress_percentage, project_status')
      .eq('is_completed', false)
      .lt('progress_percentage', 100)
      .lt('created_at', twoDaysAgo.toISOString())
      .not('project_status', 'in', `(${CONCLUDED_STATUSES.join(',')})`);

    for (const form of incompleteForms || []) {
      const { data: client } = await supabase
        .from('clients')
        .select('name')
        .eq('id', form.client_id)
        .eq('deleted', false)
        .maybeSingle();

      if (!client) continue;

      const createdAt = new Date(form.created_at);
      const daysPending = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const notifKey = `incomplete_form_${form.id}`;

      await supabase.rpc('create_admin_notification_safe', {
        p_type: daysPending >= 7 ? 'critical' : daysPending >= 4 ? 'alert' : 'info',
        p_title: 'Formulário não concluído',
        p_message: `${client.name} não concluiu o formulário. Pendente há ${daysPending} dia${daysPending !== 1 ? 's' : ''} (${form.progress_percentage}% completo).`,
        p_client_id: form.client_id,
        p_form_id: form.id,
        p_notification_key: notifKey,
      });

      stats.incomplete_form_alerts++;
    }

    // --- 2. Cliente inativo no formulário (progresso < 100%) ---
    const { data: inactiveForms } = await supabase
      .from('app_forms')
      .select('id, client_id, last_access_at, last_activity_date, progress_percentage, project_status')
      .eq('is_completed', false)
      .lt('progress_percentage', 100)
      .lt('last_activity_date', twoDaysAgo.toISOString())
      .not('project_status', 'in', `(${CONCLUDED_STATUSES.join(',')})`);

    for (const form of inactiveForms || []) {
      const { data: client } = await supabase
        .from('clients')
        .select('name')
        .eq('id', form.client_id)
        .eq('deleted', false)
        .maybeSingle();

      if (!client) continue;

      const lastActivity = form.last_access_at || form.last_activity_date;
      if (!lastActivity) continue;

      const lastActivityDate = new Date(lastActivity);
      const daysInactive = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
      const notifKey = `inactive_client_${form.client_id}`;

      await supabase.rpc('create_admin_notification_safe', {
        p_type: daysInactive >= 7 ? 'critical' : 'alert',
        p_title: 'Cliente inativo',
        p_message: `${client.name} não acessa o formulário há ${daysInactive} dia${daysInactive !== 1 ? 's' : ''} (${form.progress_percentage}% completo).`,
        p_client_id: form.client_id,
        p_form_id: form.id,
        p_notification_key: notifKey,
      });

      stats.inactive_alerts++;
    }

    // --- 3. Formulário concluído mas projeto ainda não iniciado ---
    const { data: notStartedForms } = await supabase
      .from('app_forms')
      .select('id, client_id, completed_at, project_status')
      .eq('is_completed', true)
      .not('completed_at', 'is', null)
      .eq('project_status', 'pending')
      .lt('completed_at', twoDaysAgo.toISOString());

    for (const form of notStartedForms || []) {
      const { data: client } = await supabase
        .from('clients')
        .select('name')
        .eq('id', form.client_id)
        .eq('deleted', false)
        .maybeSingle();

      if (!client) continue;

      const completedAt = new Date(form.completed_at!);
      const daysWaiting = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
      const notifKey = `project_not_started_${form.id}_${daysWaiting}d`;

      await supabase.rpc('create_admin_notification_safe', {
        p_type: daysWaiting >= 7 ? 'critical' : daysWaiting >= 4 ? 'alert' : 'info',
        p_title: 'Projeto não iniciado',
        p_message: `${client.name} concluiu o formulário há ${daysWaiting} dia${daysWaiting !== 1 ? 's' : ''} e o projeto ainda não foi iniciado.`,
        p_client_id: form.client_id,
        p_form_id: form.id,
        p_notification_key: notifKey,
      });

      stats.project_not_started_alerts++;
    }

    // --- 4. Projeto em andamento sem atualização ---
    const IN_PROGRESS_STATUSES = ['development', 'testing_submission', 'under_review'];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: staleForms } = await supabase
      .from('app_forms')
      .select('id, client_id, project_status, updated_at')
      .eq('is_completed', true)
      .in('project_status', IN_PROGRESS_STATUSES)
      .lt('updated_at', sevenDaysAgo.toISOString());

    for (const form of staleForms || []) {
      const { data: client } = await supabase
        .from('clients')
        .select('name')
        .eq('id', form.client_id)
        .eq('deleted', false)
        .maybeSingle();

      if (!client) continue;

      const updatedAt = new Date(form.updated_at);
      const daysStale = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      const notifKey = `project_stale_${form.id}_${daysStale}d`;

      const statusLabels: Record<string, string> = {
        development: 'em desenvolvimento',
        testing_submission: 'em testes e envio',
        under_review: 'em análise',
      };
      const statusLabel = statusLabels[form.project_status] || form.project_status;

      await supabase.rpc('create_admin_notification_safe', {
        p_type: daysStale >= 14 ? 'critical' : 'alert',
        p_title: 'Projeto sem atualização',
        p_message: `Projeto de ${client.name} está ${statusLabel} há ${daysStale} dia${daysStale !== 1 ? 's' : ''} sem atualização.`,
        p_client_id: form.client_id,
        p_form_id: form.id,
        p_notification_key: notifKey,
      });

      stats.project_no_progress_alerts++;
    }

    // --- 5. Marcos de prazo após conclusão do formulário ---
    const { data: completedForms } = await supabase
      .from('app_forms')
      .select('id, client_id, completed_at, project_status')
      .eq('is_completed', true)
      .not('completed_at', 'is', null)
      .not('project_status', 'in', `(${CONCLUDED_STATUSES.join(',')})`);

    const milestones = [
      { days: 2, type: 'info' as const, label: 'Projeto aguardando início' },
      { days: 7, type: 'alert' as const, label: 'Atenção ao prazo' },
      { days: 10, type: 'alert' as const, label: 'Prazo ideal ultrapassado' },
      { days: 15, type: 'critical' as const, label: 'Prazo máximo atingido' },
    ];

    for (const form of completedForms || []) {
      const { data: client } = await supabase
        .from('clients')
        .select('name')
        .eq('id', form.client_id)
        .eq('deleted', false)
        .maybeSingle();

      if (!client) continue;

      const completedAt = new Date(form.completed_at!);
      const daysElapsed = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));

      const passedMilestones = milestones.filter(m => daysElapsed >= m.days);
      const currentMilestone = passedMilestones[passedMilestones.length - 1];

      if (!currentMilestone) continue;

      const notifKey = `deadline_${form.id}_${daysElapsed}d`;

      await supabase.rpc('create_admin_notification_safe', {
        p_type: currentMilestone.type,
        p_title: `Prazo: ${currentMilestone.label}`,
        p_message: `${client.name} concluiu o formulário há ${daysElapsed} dia${daysElapsed !== 1 ? 's' : ''}. ${currentMilestone.label}.`,
        p_client_id: form.client_id,
        p_form_id: form.id,
        p_notification_key: notifKey,
      });

      stats.deadline_alerts++;
    }

    return new Response(
      JSON.stringify({ success: true, stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
