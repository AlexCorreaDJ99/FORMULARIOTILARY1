/*
  # Fix Profile Insert Policy

  ## Problem
  When an admin creates a new client, the profile insert fails because:
  - The admin is trying to insert a profile for a NEW user (not themselves)
  - The current policy only checks if the inserter is an admin
  - But the check happens in the context of the NEW user who doesn't have a profile yet

  ## Solution
  - Allow profile inserts during signup (when user doesn't have a profile yet)
  - Keep admin insert capability

  ## Changes
  - Drop existing insert policy
  - Create new policy that allows:
    1. Admins to insert any profile
    2. New users to insert their own profile (during signup)
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Create new insert policy that handles both admin creation and self-signup
CREATE POLICY "Allow profile creation"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is creating their own profile
    auth.uid() = id
    OR
    -- Allow if user is an admin (checked via function)
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );
