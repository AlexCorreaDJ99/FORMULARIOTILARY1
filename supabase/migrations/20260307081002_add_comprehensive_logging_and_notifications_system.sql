/*
  # Sistema Completo de Logs e Notificações

  ## Resumo
  Esta migração expande o sistema de logs e notificações para rastrear todas as ações administrativas
  e atividades dos clientes, além de criar alertas automáticos para inatividade.

  ## 1. Novas Tabelas
  
  ### `client_notifications` - Notificações de Atividade dos Clientes
    - `id` (uuid, PK) - Identificador único
    - `client_id` (uuid, FK) - Cliente relacionado
    - `notification_type` (text) - Tipo: 'first_access', 'form_submitted', 'form_updated', 'form_completed', 'inactive_2_days', 'inactive_warning'
    - `message` (text) - Mensagem da notificação
    - `is_read` (boolean) - Se foi lida pelo admin
    - `metadata` (jsonb) - Dados adicionais (progresso, campos alterados, etc)
    - `created_at` (timestamptz) - Data/hora da notificação

  ## 2. Novos Campos

  ### Tabela `clients`
    - `cezar_images_responsibility` (text) - Responsabilidade das imagens: 'sim', 'nao', null (padrão)
    - `admin_notes` (text) - Anotações administrativas editáveis

  ### Tabela `app_forms`
    - `first_access_at` (timestamptz) - Primeira vez que cliente acessou o formulário
    - `last_modified_at` (timestamptz) - Última modificação no formulário
    - `last_modified_by` (text) - Quem fez a última modificação (client/admin)

  ## 3. Funções e Triggers

  ### Função: `track_form_changes()`
    - Trigger que registra todas as alterações em app_forms
    - Captura valores antigos e novos
    - Identifica quem fez a alteração
    - Cria logs detalhados e notificações

  ### Função: `track_client_changes()`
    - Trigger para alterações em clients
    - Registra criação, edição e exclusão
    - Captura mudanças em todos os campos

  ### Função: `create_client_notification()`
    - Cria notificações para atividade do cliente
    - Evita duplicatas
    - Formata mensagens automaticamente

  ## 4. Índices de Performance
    - Índices em client_id, notification_type, is_read, created_at
    - Índices em app_forms para last_activity_date e first_access_at

  ## 5. Segurança RLS
    - Apenas admins podem ler/atualizar notificações
    - Sistema pode inserir notificações automaticamente
    - Triggers têm permissões SECURITY DEFINER
*/

-- ============================================================================
-- 1. CRIAR TABELA DE NOTIFICAÇÕES DE CLIENTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN (
    'first_access',
    'form_submitted', 
    'form_updated',
    'form_completed',
    'inactive_2_days',
    'inactive_warning'
  )),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Admins can read all client notifications"
  ON client_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update client notifications"
  ON client_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert client notifications"
  ON client_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_client_notifications_client_id ON client_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_type ON client_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_client_notifications_is_read ON client_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_client_notifications_created_at ON client_notifications(created_at DESC);

-- ============================================================================
-- 2. ADICIONAR NOVOS CAMPOS
-- ============================================================================

-- Adicionar campos na tabela clients
DO $$
BEGIN
  -- Campo para responsabilidade do Cezar pelas imagens
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'cezar_images_responsibility'
  ) THEN
    ALTER TABLE clients ADD COLUMN cezar_images_responsibility text CHECK (cezar_images_responsibility IN ('sim', 'nao'));
  END IF;

  -- Campo admin_notes já existe, mas garantir que existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE clients ADD COLUMN admin_notes text;
  END IF;
END $$;

-- Adicionar campos na tabela app_forms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'first_access_at'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN first_access_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'last_modified_at'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN last_modified_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'last_modified_by'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN last_modified_by text;
  END IF;
END $$;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_app_forms_first_access_at ON app_forms(first_access_at);
CREATE INDEX IF NOT EXISTS idx_app_forms_last_modified_at ON app_forms(last_modified_at);

-- ============================================================================
-- 3. FUNÇÃO PARA CRIAR NOTIFICAÇÕES DE CLIENTES
-- ============================================================================

CREATE OR REPLACE FUNCTION create_client_notification(
  p_client_id uuid,
  p_notification_type text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
  v_existing_notification uuid;
BEGIN
  -- Para notificações de inatividade, verificar se já existe uma recente (últimas 24h)
  IF p_notification_type IN ('inactive_2_days', 'inactive_warning') THEN
    SELECT id INTO v_existing_notification
    FROM client_notifications
    WHERE client_id = p_client_id
      AND notification_type = p_notification_type
      AND created_at > (now() - interval '24 hours')
    LIMIT 1;
    
    IF v_existing_notification IS NOT NULL THEN
      RETURN v_existing_notification;
    END IF;
  END IF;

  -- Inserir nova notificação
  INSERT INTO client_notifications (
    client_id,
    notification_type,
    message,
    metadata
  ) VALUES (
    p_client_id,
    p_notification_type,
    p_message,
    p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- ============================================================================
-- 4. TRIGGER PARA RASTREAR MUDANÇAS EM APP_FORMS
-- ============================================================================

CREATE OR REPLACE FUNCTION track_form_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_name text;
  v_admin_name text;
  v_admin_email text;
  v_changes jsonb := '{}'::jsonb;
  v_change_description text := '';
  v_is_admin boolean := false;
  v_action_type text;
BEGIN
  -- Buscar nome do cliente
  SELECT name INTO v_client_name
  FROM clients
  WHERE id = COALESCE(NEW.client_id, OLD.client_id);

  -- Verificar se usuário atual é admin
  SELECT role = 'admin' INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF v_is_admin THEN
    SELECT name, email INTO v_admin_name, v_admin_email
    FROM profiles
    WHERE id = auth.uid();
  END IF;

  -- INSERT: Novo formulário criado
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'form_created';
    v_change_description := 'Formulário criado para o cliente ' || v_client_name;
    
    -- Criar notificação
    PERFORM create_client_notification(
      NEW.client_id,
      'form_submitted',
      'Cliente ' || v_client_name || ' iniciou o preenchimento do formulário',
      jsonb_build_object('form_id', NEW.id)
    );

    -- Log admin se foi admin que criou
    IF v_is_admin THEN
      PERFORM log_admin_action(
        v_action_type,
        v_change_description,
        'form',
        NEW.id,
        v_client_name,
        jsonb_build_object('client_id', NEW.client_id)
      );
    END IF;

  -- UPDATE: Formulário modificado
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detectar mudanças significativas
    IF OLD.driver_app_name IS DISTINCT FROM NEW.driver_app_name THEN
      v_changes := v_changes || jsonb_build_object('driver_app_name', jsonb_build_object('old', OLD.driver_app_name, 'new', NEW.driver_app_name));
    END IF;
    
    IF OLD.passenger_app_name IS DISTINCT FROM NEW.passenger_app_name THEN
      v_changes := v_changes || jsonb_build_object('passenger_app_name', jsonb_build_object('old', OLD.passenger_app_name, 'new', NEW.passenger_app_name));
    END IF;
    
    IF OLD.support_email IS DISTINCT FROM NEW.support_email THEN
      v_changes := v_changes || jsonb_build_object('support_email', jsonb_build_object('old', OLD.support_email, 'new', NEW.support_email));
    END IF;

    IF OLD.project_status IS DISTINCT FROM NEW.project_status THEN
      v_changes := v_changes || jsonb_build_object('project_status', jsonb_build_object('old', OLD.project_status, 'new', NEW.project_status));
    END IF;

    IF OLD.progress_percentage IS DISTINCT FROM NEW.progress_percentage THEN
      v_changes := v_changes || jsonb_build_object('progress', jsonb_build_object('old', OLD.progress_percentage, 'new', NEW.progress_percentage));
    END IF;

    -- Se houve mudanças significativas
    IF v_changes != '{}'::jsonb THEN
      NEW.last_modified_at := now();
      NEW.last_modified_by := CASE WHEN v_is_admin THEN 'admin' ELSE 'client' END;

      v_action_type := CASE WHEN v_is_admin THEN 'form_updated_by_admin' ELSE 'form_updated_by_client' END;
      v_change_description := CASE 
        WHEN v_is_admin THEN 'Admin ' || v_admin_name || ' alterou o formulário de ' || v_client_name
        ELSE 'Cliente ' || v_client_name || ' atualizou o formulário'
      END;

      -- Criar log
      IF v_is_admin THEN
        PERFORM log_admin_action(
          v_action_type,
          v_change_description,
          'form',
          NEW.id,
          v_client_name,
          jsonb_build_object('changes', v_changes, 'client_id', NEW.client_id)
        );
      END IF;

      -- Criar notificação apenas se foi o cliente que atualizou
      IF NOT v_is_admin THEN
        PERFORM create_client_notification(
          NEW.client_id,
          'form_updated',
          'Cliente ' || v_client_name || ' atualizou informações do formulário',
          jsonb_build_object('form_id', NEW.id, 'changes', v_changes)
        );
      END IF;
    END IF;

    -- Verificar se formulário foi completado
    IF OLD.progress_percentage < 100 AND NEW.progress_percentage = 100 THEN
      PERFORM create_client_notification(
        NEW.client_id,
        'form_completed',
        'Cliente ' || v_client_name || ' completou o formulário!',
        jsonb_build_object('form_id', NEW.id)
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_track_form_changes ON app_forms;
CREATE TRIGGER trigger_track_form_changes
  BEFORE INSERT OR UPDATE ON app_forms
  FOR EACH ROW
  EXECUTE FUNCTION track_form_changes();

-- ============================================================================
-- 5. TRIGGER PARA RASTREAR MUDANÇAS EM CLIENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION track_client_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_name text;
  v_admin_email text;
  v_changes jsonb := '{}'::jsonb;
  v_action_type text;
  v_action_description text;
BEGIN
  -- Buscar info do admin
  SELECT name, email INTO v_admin_name, v_admin_email
  FROM profiles
  WHERE id = auth.uid() AND role = 'admin';

  -- Se não é admin, retornar sem fazer nada
  IF v_admin_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- INSERT: Cliente criado
  IF TG_OP = 'INSERT' THEN
    PERFORM log_admin_action(
      'client_created',
      'Admin ' || v_admin_name || ' criou o cliente ' || NEW.name,
      'client',
      NEW.id,
      NEW.name,
      jsonb_build_object(
        'email', NEW.email,
        'company_name', NEW.company_name
      )
    );

  -- UPDATE: Cliente modificado
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detectar mudanças
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;

    IF OLD.email IS DISTINCT FROM NEW.email THEN
      v_changes := v_changes || jsonb_build_object('email', jsonb_build_object('old', OLD.email, 'new', NEW.email));
    END IF;

    IF OLD.company_name IS DISTINCT FROM NEW.company_name THEN
      v_changes := v_changes || jsonb_build_object('company_name', jsonb_build_object('old', OLD.company_name, 'new', NEW.company_name));
    END IF;

    IF OLD.admin_notes IS DISTINCT FROM NEW.admin_notes THEN
      v_changes := v_changes || jsonb_build_object('admin_notes', jsonb_build_object('old', OLD.admin_notes, 'new', NEW.admin_notes));
    END IF;

    IF OLD.cezar_images_responsibility IS DISTINCT FROM NEW.cezar_images_responsibility THEN
      v_changes := v_changes || jsonb_build_object('cezar_images_responsibility', jsonb_build_object('old', OLD.cezar_images_responsibility, 'new', NEW.cezar_images_responsibility));
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;

    -- Se cliente foi marcado como deletado
    IF OLD.deleted = false AND NEW.deleted = true THEN
      PERFORM log_admin_action(
        'client_deleted',
        'Admin ' || v_admin_name || ' excluiu o cliente ' || OLD.name,
        'client',
        OLD.id,
        OLD.name,
        jsonb_build_object('email', OLD.email)
      );
    ELSIF v_changes != '{}'::jsonb THEN
      PERFORM log_admin_action(
        'client_updated',
        'Admin ' || v_admin_name || ' atualizou dados do cliente ' || NEW.name,
        'client',
        NEW.id,
        NEW.name,
        jsonb_build_object('changes', v_changes)
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_track_client_changes ON clients;
CREATE TRIGGER trigger_track_client_changes
  AFTER INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION track_client_changes();

-- ============================================================================
-- 6. ATUALIZAR FUNÇÃO log_admin_action PARA ACEITAR MAIS TIPOS
-- ============================================================================

-- A função já existe, apenas garantir que aceita os novos tipos de ação
COMMENT ON FUNCTION log_admin_action IS 'Registra ações administrativas. Tipos: client_created, client_updated, client_deleted, form_created, form_updated_by_admin, admin_created, admin_updated, etc.';