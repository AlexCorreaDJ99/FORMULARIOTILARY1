/*
  # Add Notifications System and Store Owner Selection

  ## Changes Made
  
  1. New Table: `notifications`
    - `id` (uuid, primary key) - Unique identifier
    - `client_id` (uuid, FK to clients) - Related client
    - `type` (text) - Type of notification: 'form_completed', 'inactive_warning'
    - `message` (text) - Notification message
    - `read` (boolean) - Whether admin has read it
    - `created_at` (timestamptz) - When notification was created
  
  2. New Columns in `app_forms` table:
    - `store_owner` (text) - Who owns the stores: 'tilary' or 'client'
    - `last_activity_date` (timestamptz) - Last time client accessed the form
  
  3. Security:
    - RLS enabled on notifications table
    - Only admins can read notifications
  
  ## Purpose
  Allow administrators to receive notifications about client activity and store ownership selection.
*/

-- Add new columns to app_forms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'store_owner'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN store_owner text CHECK (store_owner IN ('tilary', 'client'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'last_activity_date'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN last_activity_date timestamptz DEFAULT now();
  END IF;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('form_completed', 'inactive_warning', 'form_updated')),
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can read all notifications
CREATE POLICY "Admins can read all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update notifications
CREATE POLICY "Admins can update notifications"
  ON notifications FOR UPDATE
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

-- Allow system to insert notifications (will be done via edge functions)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_client_id ON notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_app_forms_last_activity ON app_forms(last_activity_date);