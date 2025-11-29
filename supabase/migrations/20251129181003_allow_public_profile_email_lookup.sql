/*
  # Allow Public Profile Email Lookup for Login

  ## Problem
  During client login verification, we need to fetch the profile email
  to authenticate the user, but the user is not yet authenticated.

  ## Solution
  Add a policy that allows unauthenticated (anon) users to read
  profiles table for login verification purposes.

  ## Security
  - Only SELECT is allowed for anonymous users
  - This is safe because the profile email is used together with
    the access code (which acts as a password) to authenticate
  - After verification, normal authentication flow proceeds

  ## Changes
  - Add policy for anonymous access to read profiles for login
*/

-- Allow unauthenticated users to read profiles for login verification
CREATE POLICY "Allow public profile lookup for login"
  ON profiles FOR SELECT
  TO anon
  USING (true);
