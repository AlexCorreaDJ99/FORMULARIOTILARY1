/*
  # Correção da função delete_client_data
  
  ## Problema
  A função estava falhando quando não havia admin autenticado porque
  tentava sempre criar um log que requer autenticação.
  
  ## Solução
  - Verificar se há admin autenticado antes de criar log
  - Permitir exclusão funcionar mesmo sem admin (para edge functions, etc)
  - Registrar log apenas quando possível
*/

CREATE OR REPLACE FUNCTION delete_client_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_file_record RECORD;
  v_deleted_files_count INT := 0;
  v_deleted_images_count INT := 0;
  v_deleted_forms_count INT := 0;
  v_deleted_notifications_count INT := 0;
  v_admin_name TEXT;
  v_admin_id UUID;
BEGIN
  -- Só executar se o cliente foi marcado como deletado
  IF OLD.deleted = false AND NEW.deleted = true THEN
    
    -- Buscar nome do admin (se existir)
    SELECT id, name INTO v_admin_id, v_admin_name
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin';

    -- 1. DELETAR ARQUIVOS FÍSICOS DO STORAGE
    FOR v_file_record IN 
      SELECT file_url, file_name
      FROM form_images
      WHERE client_id = NEW.id
    LOOP
      DECLARE
        v_storage_path TEXT;
      BEGIN
        -- Extrair apenas o path após 'app-submissions/'
        v_storage_path := SUBSTRING(v_file_record.file_url FROM 'app-submissions/(.*)$');
        
        IF v_storage_path IS NOT NULL THEN
          PERFORM storage.delete_object('app-submissions', v_storage_path);
          v_deleted_files_count := v_deleted_files_count + 1;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Erro ao deletar arquivo %: %', v_file_record.file_name, SQLERRM;
      END;
    END LOOP;

    -- 2. DELETAR METADADOS DE IMAGENS
    DELETE FROM form_images WHERE client_id = NEW.id;
    GET DIAGNOSTICS v_deleted_images_count = ROW_COUNT;

    -- 3. DELETAR FORMULÁRIOS
    DELETE FROM app_forms WHERE client_id = NEW.id;
    GET DIAGNOSTICS v_deleted_forms_count = ROW_COUNT;

    -- 4. DELETAR NOTIFICAÇÕES
    DELETE FROM notifications WHERE client_id = NEW.id;
    GET DIAGNOSTICS v_deleted_notifications_count = ROW_COUNT;

    -- 5. DELETAR NOTIFICAÇÕES DO CLIENTE
    DELETE FROM client_notifications WHERE client_id = NEW.id;

    -- 6. REGISTRAR NO LOG (apenas se houver admin autenticado)
    IF v_admin_id IS NOT NULL THEN
      BEGIN
        PERFORM log_admin_action(
          'client_data_deleted',
          'Admin ' || v_admin_name || ' excluiu todos os dados do cliente ' || OLD.name,
          'client',
          OLD.id,
          OLD.name,
          jsonb_build_object(
            'email', OLD.email,
            'files_deleted', v_deleted_files_count,
            'image_records_deleted', v_deleted_images_count,
            'forms_deleted', v_deleted_forms_count,
            'notifications_deleted', v_deleted_notifications_count
          )
        );
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Erro ao criar log: %', SQLERRM;
      END;
    END IF;

    RAISE NOTICE 'Cliente % excluído: % arquivos, % imagens, % formulários, % notificações',
      OLD.name, v_deleted_files_count, v_deleted_images_count, 
      v_deleted_forms_count, v_deleted_notifications_count;

  END IF;

  RETURN NEW;
END;
$$;
