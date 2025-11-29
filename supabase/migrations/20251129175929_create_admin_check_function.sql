/*
  # Create Admin Check Function

  ## Purpose
  Create a secure function to check if a user is an admin without causing RLS recursion.

  ## Solution
  - Create a SECURITY DEFINER function that bypasses RLS
  - This function can safely check the profiles table
  - Update all policies to use this function instead of direct queries

  ## Changes
  1. Create is_admin() function
  2. Recreate all policies using this function
*/

-- Create function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Recreate policies using the function
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Update clients policies
DROP POLICY IF EXISTS "Admins can manage all clients" ON clients;

CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (is_admin() OR user_id = auth.uid());

CREATE POLICY "Admins can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (is_admin());

-- Update app_forms policies
DROP POLICY IF EXISTS "Admins can read all forms" ON app_forms;
DROP POLICY IF EXISTS "Admins can insert forms" ON app_forms;

CREATE POLICY "Admins can view all forms"
  ON app_forms FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = app_forms.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert forms"
  ON app_forms FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update all forms"
  ON app_forms FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = app_forms.client_id
      AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = app_forms.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete forms"
  ON app_forms FOR DELETE
  TO authenticated
  USING (is_admin());

-- Update form_images policies
DROP POLICY IF EXISTS "Admins can read all images" ON form_images;

CREATE POLICY "Admins can view all images"
  ON form_images FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM app_forms
      JOIN clients ON clients.id = app_forms.client_id
      WHERE app_forms.id = form_images.form_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete all images"
  ON form_images FOR DELETE
  TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM app_forms
      JOIN clients ON clients.id = app_forms.client_id
      WHERE app_forms.id = form_images.form_id
      AND clients.user_id = auth.uid()
    )
  );
