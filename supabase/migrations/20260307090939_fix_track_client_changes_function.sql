/*
  # Correção da função track_client_changes

  ## Problema
  A função estava tentando acessar o campo `company_name` que não existe na tabela `clients`,
  causando erro "record 'old' has no field 'company_name'" ao tentar excluir clientes.

  ## Alterações
  - Remove todas as referências ao campo inexistente `company_name`
  - Mantém rastreamento apenas dos campos que realmente existem na tabela
  - Corrige tanto INSERT quanto UPDATE para não falhar
*/

CREATE OR REPLACE FUNCTION public.track_client_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
        'email', NEW.email
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

    IF OLD.admin_notes IS DISTINCT FROM NEW.admin_notes THEN
      v_changes := v_changes || jsonb_build_object('admin_notes', jsonb_build_object('old', OLD.admin_notes, 'new', NEW.admin_notes));
    END IF;

    IF OLD.cezar_images_responsibility IS DISTINCT FROM NEW.cezar_images_responsibility THEN
      v_changes := v_changes || jsonb_build_object('cezar_images_responsibility', jsonb_build_object('old', OLD.cezar_images_responsibility, 'new', NEW.cezar_images_responsibility));
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;

    IF OLD.ios_app_type IS DISTINCT FROM NEW.ios_app_type THEN
      v_changes := v_changes || jsonb_build_object('ios_app_type', jsonb_build_object('old', OLD.ios_app_type, 'new', NEW.ios_app_type));
    END IF;

    IF OLD.sales_person IS DISTINCT FROM NEW.sales_person THEN
      v_changes := v_changes || jsonb_build_object('sales_person', jsonb_build_object('old', OLD.sales_person, 'new', NEW.sales_person));
    END IF;

    IF OLD.plan IS DISTINCT FROM NEW.plan THEN
      v_changes := v_changes || jsonb_build_object('plan', jsonb_build_object('old', OLD.plan, 'new', NEW.plan));
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
$function$;
