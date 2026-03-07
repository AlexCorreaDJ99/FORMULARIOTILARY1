/*
  # Configurar verificação automática diária de clientes inativos

  1. Extensões
    - Habilita `pg_cron` para agendamento de tarefas
    - Habilita `http` para fazer chamadas HTTP às Edge Functions

  2. Função de Verificação
    - Cria função `check_inactive_clients_daily()` que:
      - Busca clientes com última atualização há mais de 2 dias
      - Cria notificações automáticas para administradores
      - Registra a execução no log

  3. Cron Job
    - Agenda execução diária às 9h da manhã (horário UTC)
    - Nome do job: 'check-inactive-clients-daily'
    - Executa a função de verificação automaticamente

  4. Segurança
    - Função executada com privilégios de sistema
    - Apenas administradores podem visualizar logs
*/

-- Habilitar extensão pg_cron para agendamento de tarefas
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar extensão http para fazer chamadas HTTP (se necessário)
CREATE EXTENSION IF NOT EXISTS http;

-- Criar função que verifica clientes inativos e cria notificações
CREATE OR REPLACE FUNCTION check_inactive_clients_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inactive_client RECORD;
  notification_count INTEGER := 0;
BEGIN
  -- Buscar clientes que não foram atualizados nos últimos 2 dias
  FOR inactive_client IN
    SELECT 
      id,
      name,
      email,
      updated_at
    FROM clients
    WHERE updated_at < NOW() - INTERVAL '2 days'
      AND project_status != 'completed'
    ORDER BY updated_at ASC
  LOOP
    -- Verificar se já existe uma notificação recente (últimas 24h) para este cliente
    IF NOT EXISTS (
      SELECT 1 
      FROM notifications 
      WHERE client_id = inactive_client.id 
        AND type = 'inactive_warning'
        AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
      -- Criar notificação para todos os administradores
      INSERT INTO notifications (admin_id, client_id, type, message)
      SELECT 
        p.id,
        inactive_client.id,
        'inactive_warning',
        'Cliente "' || inactive_client.name || '" está inativo há mais de 2 dias. Última atualização: ' || 
        TO_CHAR(inactive_client.updated_at, 'DD/MM/YYYY HH24:MI')
      FROM profiles p
      WHERE p.role = 'admin';
      
      notification_count := notification_count + 1;
    END IF;
  END LOOP;

  -- Registrar execução no log (opcional)
  RAISE NOTICE 'Verificação de clientes inativos concluída. % notificações criadas.', notification_count;
END;
$$;

-- Agendar execução diária às 9h da manhã (UTC)
-- Para ajustar para seu fuso horário, modifique o horário:
-- Exemplo: Para horário de Brasília (UTC-3), use '12:00' para executar às 9h BRT
SELECT cron.schedule(
  'check-inactive-clients-daily',  -- Nome do job
  '0 9 * * *',                      -- Cron expression: às 9h todos os dias (UTC)
  $$SELECT check_inactive_clients_daily();$$
);

-- Comentário explicativo sobre o cron job
COMMENT ON FUNCTION check_inactive_clients_daily() IS 
'Função executada diariamente pelo pg_cron para verificar clientes inativos há mais de 2 dias e criar notificações automáticas para administradores.';
