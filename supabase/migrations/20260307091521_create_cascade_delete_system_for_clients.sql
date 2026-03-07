/*
  # Sistema de Exclusão em Cascata para Clientes

  ## Problema
  Quando um cliente é excluído (marcado como deleted=true), seus dados permanecem no banco:
  - Imagens no storage (ocupando espaço)
  - Registros em form_images (metadados)
  - Formulários em app_forms
  - Notificações em notifications e client_notifications
  
  Isso desperdiça espaço e viola LGPD/GDPR.

  ## Solução
  Criar uma função que automaticamente:
  1. Deleta todos os arquivos físicos do storage
  2. Remove registros de form_images
  3. Remove app_forms
  4. Remove notifications
  5. Remove client_notifications
  6. Mantém logs de atividade para auditoria

  ## Segurança
  - Apenas admins podem executar a exclusão
  - Log completo da exclusão é mantido
  - Operação é irreversível (hard delete)
*/

-- Função para excluir todos os dados de um cliente
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
BEGIN
  -- Só executar se o cliente foi marcado como deletado
  IF OLD.deleted = false AND NEW.deleted = true THEN
    
    -- Buscar nome do admin para o log
    SELECT name INTO v_admin_name
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin';

    -- 1. DELETAR ARQUIVOS FÍSICOS DO STORAGE
    -- Buscar todos os arquivos deste cliente
    FOR v_file_record IN 
      SELECT file_url, file_name
      FROM form_images
      WHERE client_id = NEW.id
    LOOP
      -- Extrair o caminho do arquivo da URL
      -- URLs são como: https://[project].supabase.co/storage/v1/object/public/app-submissions/[path]
      DECLARE
        v_storage_path TEXT;
      BEGIN
        -- Extrair apenas o path após 'app-submissions/'
        v_storage_path := SUBSTRING(v_file_record.file_url FROM 'app-submissions/(.*)$');
        
        IF v_storage_path IS NOT NULL THEN
          -- Deletar arquivo do storage
          PERFORM storage.delete_object('app-submissions', v_storage_path);
          v_deleted_files_count := v_deleted_files_count + 1;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- Se falhar, continuar com próximo arquivo
          RAISE WARNING 'Erro ao deletar arquivo %: %', v_file_record.file_name, SQLERRM;
      END;
    END LOOP;

    -- 2. DELETAR METADADOS DE IMAGENS
    DELETE FROM form_images WHERE client_id = NEW.id;
    GET DIAGNOSTICS v_deleted_images_count = ROW_COUNT;

    -- 3. DELETAR FORMULÁRIOS
    DELETE FROM app_forms WHERE client_id = NEW.id;
    GET DIAGNOSTICS v_deleted_forms_count = ROW_COUNT;

    -- 4. DELETAR NOTIFICAÇÕES ANTIGAS
    DELETE FROM notifications WHERE client_id = NEW.id;
    GET DIAGNOSTICS v_deleted_notifications_count = ROW_COUNT;

    -- 5. DELETAR NOTIFICAÇÕES DO CLIENTE
    DELETE FROM client_notifications WHERE client_id = NEW.id;

    -- 6. REGISTRAR NO LOG
    PERFORM log_admin_action(
      'client_data_deleted',
      'Admin ' || COALESCE(v_admin_name, 'System') || ' excluiu todos os dados do cliente ' || OLD.name,
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

    RAISE NOTICE 'Cliente % excluído: % arquivos, % imagens, % formulários, % notificações',
      OLD.name, v_deleted_files_count, v_deleted_images_count, 
      v_deleted_forms_count, v_deleted_notifications_count;

  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função DEPOIS do track_client_changes
-- (assim o log de exclusão acontece primeiro, depois a limpeza de dados)
DROP TRIGGER IF EXISTS trigger_delete_client_data ON clients;
CREATE TRIGGER trigger_delete_client_data
  AFTER UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION delete_client_data();

-- Garantir que o trigger de deleção rode DEPOIS do trigger de log
-- (triggers AFTER rodam em ordem alfabética)
COMMENT ON TRIGGER trigger_delete_client_data ON clients IS 
  'Deleta todos os dados (arquivos, formulários, notificações) quando cliente é marcado como deleted';
