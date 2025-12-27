/*
  # Add Completion Date Field

  1. Changes
    - Add `completion_date` column to `app_forms` table
      - Type: date (nullable)
      - Allows storing the completion date for each app submission
      - Can be null if not yet completed

  2. Notes
    - This field will be manually set/edited by admins or clients
    - Uses date type (YYYY-MM-DD format) for easier date handling
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'completion_date'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN completion_date date;
  END IF;
END $$;