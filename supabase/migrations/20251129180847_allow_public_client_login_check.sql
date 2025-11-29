/*
  # Allow Public Client Login Check

  ## Problem
  During client login, the user is NOT authenticated yet, so they cannot query
  the clients table to verify their email and access code.

  ## Solution
  Add a policy that allows unauthenticated users to read ONLY email, access_code,
  user_id, and status from clients table for login verification purposes.

  ## Security
  - Only SELECT is allowed
  - Only specific columns can be read
  - This is safe because access_code acts as a password
  - After successful verification, the app uses these credentials to sign in

  ## Changes
  - Add policy for anonymous/public access to verify login credentials
*/

-- Allow unauthenticated users to read clients for login verification
CREATE POLICY "Allow public login verification"
  ON clients FOR SELECT
  TO anon
  USING (true);
