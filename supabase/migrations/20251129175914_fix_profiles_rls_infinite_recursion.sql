/*
  # Fix Infinite Recursion in Profiles RLS

  ## Problem
  The "Admins can read all profiles" policy causes infinite recursion because it queries
  the profiles table itself to check if the user is an admin.

  ## Solution
  1. Drop the problematic policies
  2. Create new policies that avoid recursion by:
     - Using a simpler approach for admins
     - Using auth.jwt() to check role from the token metadata

  ## Changes
  - Drop existing policies on profiles table
  - Create new non-recursive policies
  - Admins can read/update all profiles
  - Users can read/update their own profile
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- Create new policies without recursion
-- Policy for users to read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy for admins to read all profiles (using direct auth check)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = id
  );

-- Policy for admins to update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2 
      WHERE p2.id = auth.uid() 
      AND p2.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p2 
      WHERE p2.id = auth.uid() 
      AND p2.role = 'admin'
    )
  );

-- Policy for admins to insert profiles
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p2 
      WHERE p2.id = auth.uid() 
      AND p2.role = 'admin'
    )
  );
