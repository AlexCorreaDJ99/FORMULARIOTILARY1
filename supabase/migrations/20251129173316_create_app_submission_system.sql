/*
  # App Submission System Database Schema

  ## Overview
  Complete database schema for managing app submission forms with admin and client roles.

  ## Tables Created

  ### 1. profiles
  Extends auth.users with role information
  - `id` (uuid, FK to auth.users)
  - `email` (text)
  - `name` (text)
  - `role` (text: 'admin' or 'client')
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. clients
  Stores client information and access codes
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `name` (text)
  - `email` (text)
  - `access_code` (text, unique)
  - `status` (text: 'active', 'inactive')
  - `created_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. app_forms
  Main form data for each client
  - `id` (uuid, PK)
  - `client_id` (uuid, FK to clients)
  - `status` (text: 'not_started', 'in_progress', 'completed')
  - `progress_percentage` (integer)
  - Form fields for setup, descriptions, terms
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. form_images
  Stores uploaded images with metadata
  - `id` (uuid, PK)
  - `form_id` (uuid, FK to app_forms)
  - `image_type` (text: logo, feature, banner)
  - `app_type` (text: driver, passenger)
  - `store_type` (text: playstore, appstore)
  - `file_url` (text)
  - `file_name` (text)
  - `dimensions` (text)
  - `size_bytes` (integer)
  - `uploaded_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Admins can manage everything
  - Clients can only access their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  access_code text UNIQUE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all clients"
  ON clients FOR ALL
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

CREATE POLICY "Clients can read own data"
  ON clients FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create app_forms table
CREATE TABLE IF NOT EXISTS app_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percentage integer DEFAULT 0,
  
  driver_app_name text,
  passenger_app_name text,
  support_email text,
  short_description text,
  long_description text,
  
  playstore_short_description text,
  playstore_long_description text,
  
  appstore_description text,
  
  driver_terms text,
  passenger_terms text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all forms"
  ON app_forms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can read own forms"
  ON app_forms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = app_forms.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update own forms"
  ON app_forms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = app_forms.client_id
      AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = app_forms.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert forms"
  ON app_forms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create form_images table
CREATE TABLE IF NOT EXISTS form_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES app_forms(id) ON DELETE CASCADE,
  image_type text NOT NULL CHECK (image_type IN ('logo_1024', 'logo_352', 'feature', 'banner_1024')),
  app_type text NOT NULL CHECK (app_type IN ('driver', 'passenger')),
  store_type text NOT NULL CHECK (store_type IN ('playstore', 'appstore', 'both')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  dimensions text NOT NULL,
  size_bytes integer NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE form_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all images"
  ON form_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can read own images"
  ON form_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_forms
      JOIN clients ON clients.id = app_forms.client_id
      WHERE app_forms.id = form_images.form_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can insert own images"
  ON form_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_forms
      JOIN clients ON clients.id = app_forms.client_id
      WHERE app_forms.id = form_images.form_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can delete own images"
  ON form_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_forms
      JOIN clients ON clients.id = app_forms.client_id
      WHERE app_forms.id = form_images.form_id
      AND clients.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_access_code ON clients(access_code);
CREATE INDEX IF NOT EXISTS idx_app_forms_client_id ON app_forms(client_id);
CREATE INDEX IF NOT EXISTS idx_form_images_form_id ON form_images(form_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_app_forms_updated_at
  BEFORE UPDATE ON app_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();