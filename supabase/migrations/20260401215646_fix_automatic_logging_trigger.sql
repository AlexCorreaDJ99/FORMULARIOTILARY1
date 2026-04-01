/*
  # Fix automatic logging trigger

  1. Changes
    - Add admin_notes column to app_forms table
    - Fix update_updated_at_column function to work correctly
    
  2. Notes
    - The previous migration referenced a column that didn't exist
    - This migration adds the column and ensures the trigger works properly
*/

-- Add admin_notes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_forms' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN admin_notes TEXT DEFAULT '';
  END IF;
END $$;

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
DECLARE
  log_entry TEXT;
  original_date_text TEXT;
BEGIN
  NEW.updated_at = now();
  
  -- Check if form is at 100% completion
  IF NEW.progress_percentage = 100 THEN
    -- Check if this is a modification (OLD exists and completion_date is changing)
    IF OLD.completion_date IS NOT NULL AND OLD.completion_date != CURRENT_DATE THEN
      -- This is a modification of an already completed form
      
      -- Initialize admin_notes if null
      IF NEW.admin_notes IS NULL THEN
        NEW.admin_notes = '';
      END IF;
      
      -- Check if log section exists
      IF NEW.admin_notes NOT LIKE '%[LOG AUTOMÁTICO]%' THEN
        -- First modification - add original completion date and first modification
        original_date_text := to_char(OLD.completion_date, 'DD/MM/YYYY');
        log_entry := E'\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n[LOG AUTOMÁTICO]\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' ||
                     '📅 Conclusão original: ' || original_date_text || E'\n' ||
                     E'\n🔄 Modificações:\n' ||
                     '  • ' || to_char(CURRENT_DATE, 'DD/MM/YYYY') || ': Formulário modificado';
        
        -- Append to existing notes or create new
        IF NEW.admin_notes = '' THEN
          NEW.admin_notes = log_entry;
        ELSE
          NEW.admin_notes = NEW.admin_notes || log_entry;
        END IF;
      ELSE
        -- Subsequent modification - just add new entry
        log_entry := E'\n  • ' || to_char(CURRENT_DATE, 'DD/MM/YYYY') || ': Formulário modificado';
        NEW.admin_notes = NEW.admin_notes || log_entry;
      END IF;
      
      -- Update completion_date to today
      NEW.completion_date = CURRENT_DATE;
    ELSIF OLD.completion_date IS NULL OR OLD.progress_percentage < 100 THEN
      -- This is the first time reaching 100% - just set completion_date
      NEW.completion_date = CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;