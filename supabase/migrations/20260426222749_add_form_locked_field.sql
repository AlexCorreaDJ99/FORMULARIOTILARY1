/*
  # Add form_locked field to app_forms

  1. Modified Tables
    - `app_forms`: Added `form_locked` (boolean, default false) - controls whether the client can edit the form
      When true, the client-side form becomes read-only.
      Admins can toggle this per client.

  2. Behavior
    - Forms auto-lock when progress reaches 100%
    - Admins can manually unlock/lock forms from the admin panel
    - When locked, clients see a message directing them to contact support

  3. Important Notes
    - Default is false so existing clients are not affected
    - No data is lost or modified by this migration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'form_locked'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN form_locked boolean NOT NULL DEFAULT false;
  END IF;
END $$;
