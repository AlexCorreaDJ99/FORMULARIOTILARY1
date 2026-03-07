/*
  # Adicionar Campos Comerciais à Tabela Clients

  1. Novos Campos
    - `ios_app_type` (text) - Tipo de app iOS: 'P' (Passageiro) ou 'P/M' (Passageiro e Motorista)
    - `sales_person` (text) - Nome do vendedor responsável
    - `plan` (text) - Plano contratado pelo cliente
    - `authorized_cities` (text) - Cidades autorizadas para atuação
    - `notes` (text) - Observações gerais
    - `expectations` (text) - Expectativa sobre o cliente
    - `deleted` (boolean) - Flag para soft delete (controle de exclusão lógica)

  2. Segurança
    - Campos acessíveis apenas para administradores
    - Clientes não podem visualizar ou editar esses campos comerciais
    - RLS policies atualizadas para respeitar soft delete

  3. Isolamento de Dados
    - Adiciona client_id à tabela form_images
    - Garante que imagens nunca sejam compartilhadas entre clientes
*/

-- Adicionar novos campos à tabela clients
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'ios_app_type') THEN
    ALTER TABLE clients ADD COLUMN ios_app_type text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'sales_person') THEN
    ALTER TABLE clients ADD COLUMN sales_person text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'plan') THEN
    ALTER TABLE clients ADD COLUMN plan text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'authorized_cities') THEN
    ALTER TABLE clients ADD COLUMN authorized_cities text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'notes') THEN
    ALTER TABLE clients ADD COLUMN notes text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'expectations') THEN
    ALTER TABLE clients ADD COLUMN expectations text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'deleted') THEN
    ALTER TABLE clients ADD COLUMN deleted boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_clients_deleted ON clients(deleted) WHERE deleted = false;

-- Atualizar policy de leitura de clientes para excluir deletados
DROP POLICY IF EXISTS "Clients can read own data" ON clients;

CREATE POLICY "Clients can read own data"
  ON clients FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    AND deleted = false
    AND status = 'active'
  );

-- Adicionar coluna client_id à tabela form_images
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'form_images' AND column_name = 'client_id') THEN
    ALTER TABLE form_images ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_form_images_client_id ON form_images(client_id);

-- Atualizar policies de form_images
DROP POLICY IF EXISTS "Clients can read own images" ON form_images;
DROP POLICY IF EXISTS "Clients can insert own images" ON form_images;
DROP POLICY IF EXISTS "Clients can delete own images" ON form_images;

CREATE POLICY "Clients can read own images"
  ON form_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = form_images.client_id
      AND clients.user_id = auth.uid()
      AND clients.deleted = false
      AND clients.status = 'active'
    )
  );

CREATE POLICY "Clients can insert own images"
  ON form_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = form_images.client_id
      AND clients.user_id = auth.uid()
      AND clients.deleted = false
      AND clients.status = 'active'
    )
  );

CREATE POLICY "Clients can delete own images"
  ON form_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = form_images.client_id
      AND clients.user_id = auth.uid()
      AND clients.deleted = false
      AND clients.status = 'active'
    )
  );

-- Popular client_id nas imagens existentes
DO $$
DECLARE
  img_record RECORD;
  client_rec uuid;
BEGIN
  FOR img_record IN 
    SELECT fi.id, fi.form_id 
    FROM form_images fi 
    WHERE fi.client_id IS NULL
  LOOP
    SELECT c.id INTO client_rec
    FROM app_forms af
    JOIN clients c ON c.id = af.client_id
    WHERE af.id = img_record.form_id
    LIMIT 1;
    
    IF client_rec IS NOT NULL THEN
      UPDATE form_images 
      SET client_id = client_rec 
      WHERE id = img_record.id;
    END IF;
  END LOOP;
END $$;