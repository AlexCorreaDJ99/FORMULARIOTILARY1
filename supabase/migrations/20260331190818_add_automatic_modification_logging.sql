/*
  # Add automatic modification logging to admin notes

  1. Changes
    - Create function to log completion date changes in admin_notes
    - Update trigger to automatically append modification logs
    - Track original completion date and all subsequent modifications

  2. Log Format
    - Records original completion date when form first reaches 100%
    - Records each modification date when changes are made at 100%
    - Maintains chronological history in admin_notes field

  3. Example Output
    ```
    [LOG AUTOMÁTICO]
    Conclusão original: 28/03/2026
    Modificações:
    - 31/03/2026: Formulário modificado
    - 05/04/2026: Formulário modificado
    ```
*/

-- Create or replace function to update updated_at and log modifications
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
      
      -- Check if admin_notes already contains the log header
      IF NEW.admin_notes IS NULL OR NEW.admin_notes = '' THEN
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

-- Recreate the trigger to use the updated function
DROP TRIGGER IF EXISTS set_updated_at ON app_forms;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON app_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
