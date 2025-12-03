/*
  # Add Meeting Scheduling Fields to App Forms

  ## Changes Made
  
  1. New Columns in `app_forms` table:
    - `meeting_scheduled` (boolean) - Indicates if a meeting has been scheduled
    - `meeting_date` (date) - The date of the scheduled meeting
    - `meeting_time` (time) - The time of the scheduled meeting
  
  2. Defaults:
    - `meeting_scheduled` defaults to `false`
    - `meeting_date` and `meeting_time` are nullable (NULL if no meeting scheduled)
  
  ## Purpose
  Allow administrators to schedule meetings with clients directly from the admin panel.
*/

-- Add meeting fields to app_forms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'meeting_scheduled'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN meeting_scheduled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'meeting_date'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN meeting_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'meeting_time'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN meeting_time time;
  END IF;
END $$;