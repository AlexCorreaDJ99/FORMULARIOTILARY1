/*
  # Add Company Terms Field to App Forms

  1. Changes
    - Add `company_terms` column to `app_forms` table
    - Column is nullable text type to store company terms of use

  2. Notes
    - This field will store the general company terms of use
    - Separate from driver and passenger specific terms
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'company_terms'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN company_terms text;
  END IF;
END $$;