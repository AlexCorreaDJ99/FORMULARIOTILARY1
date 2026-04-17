/*
  # Admin Notifications System + Portability Field

  ## Summary
  This migration adds a comprehensive admin notification system and a portability flag for clients.

  ## New Tables
  - `admin_notifications`: Stores admin-targeted notifications for monitoring clients, deadlines, and alerts
    - `id` (uuid, PK)
    - `type` (text): 'info' | 'alert' | 'critical'
    - `title` (text): Short notification title
    - `message` (text): Full notification message
    - `client_id` (uuid, FK -> clients): Related client
    - `form_id` (uuid, FK -> app_forms): Related form
    - `is_read` (boolean): Read status
    - `notification_key` (text): Unique key to prevent duplicates per day/condition
    - `created_at` (timestamptz)

  ## Modified Tables
  - `clients`: Added `is_portability` (boolean, default false) - marks clients as portability type
  - `app_forms`: Added `is_completed` (boolean, default false) and `completed_at` (timestamptz) for deadline tracking

  ## Security
  - RLS enabled on admin_notifications
  - Only authenticated admins can read, insert, and update admin_notifications
*/

CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('info', 'alert', 'critical')),
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  form_id uuid REFERENCES app_forms(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  notification_key text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert admin notifications"
  ON admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update admin notifications"
  ON admin_notifications FOR UPDATE
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

CREATE INDEX IF NOT EXISTS idx_admin_notifications_client_id ON admin_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_notification_key ON admin_notifications(notification_key);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'is_portability'
  ) THEN
    ALTER TABLE clients ADD COLUMN is_portability boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN is_completed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'last_access_at'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN last_access_at timestamptz;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION create_admin_notification_safe(
  p_type text,
  p_title text,
  p_message text,
  p_client_id uuid,
  p_form_id uuid,
  p_notification_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today_key text;
BEGIN
  v_today_key := p_notification_key || '_' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD');

  IF NOT EXISTS (
    SELECT 1 FROM admin_notifications
    WHERE notification_key = v_today_key
  ) THEN
    INSERT INTO admin_notifications (type, title, message, client_id, form_id, is_read, notification_key)
    VALUES (p_type, p_title, p_message, p_client_id, p_form_id, false, v_today_key);
  END IF;
END;
$$;
