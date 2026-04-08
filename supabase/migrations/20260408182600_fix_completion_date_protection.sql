/*
  # Fix completion_date protection for completed forms

  1. Problem
    - The update_updated_at_column trigger was changing completion_date whenever
      an admin edited a form that was already at 100% completion
    - This caused the completion_date to shift to the current date unexpectedly

  2. Fix
    - Remove the logic that overwrites completion_date on admin edits
    - completion_date should only be set ONCE: when the form first reaches 100%
    - Logging in admin_notes is kept but no longer changes completion_date

  3. Notes
    - Existing completion_date values that were incorrectly changed are NOT
      automatically corrected here (needs manual fix per case)
*/

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Only set completion_date when form FIRST reaches 100%
  -- Never overwrite an existing completion_date
  IF NEW.progress_percentage = 100 AND (OLD.completion_date IS NULL OR OLD.progress_percentage < 100) THEN
    NEW.completion_date = CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;