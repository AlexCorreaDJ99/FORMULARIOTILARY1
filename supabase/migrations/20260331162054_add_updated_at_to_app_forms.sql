/*
  # Add updated_at tracking to app_forms table

  1. Changes
    - Add `updated_at` column to track last modification time
    - Add trigger to automatically update `updated_at` on any row change
    - Modify completion_date logic to update when form is modified at 100%

  2. Purpose
    - Track when forms are last modified
    - Update completion_date to reflect the most recent modification date when at 100%
    - Detect logo changes, text changes, and any other field updates
*/

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- If form is at 100% completion, update completion_date to current date
  IF NEW.progress_percentage = 100 THEN
    NEW.completion_date = CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS set_updated_at ON app_forms;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON app_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Initialize updated_at for existing rows
UPDATE app_forms 
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;
