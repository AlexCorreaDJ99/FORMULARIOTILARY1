/*
  # Fix trigger to permanently protect completion_date on completed forms

  1. Problem
    - Trigger was overwriting completion_date to CURRENT_DATE every time
      a completed form (progress = 100) was edited by admin
    - This caused dates to "jump" to the current day on any modification

  2. Fix
    - completion_date is ONLY set once: when progress first reaches 100%
    - If progress is already at 100% and completion_date is already set, preserve it
    - Log modifications in admin_notes without touching completion_date
*/

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
DECLARE
  log_entry TEXT;
  original_date_text TEXT;
BEGIN
  NEW.updated_at = now();

  IF NEW.progress_percentage = 100 THEN
    IF OLD.completion_date IS NULL OR OLD.progress_percentage < 100 THEN
      -- First time reaching 100%: set completion_date now
      NEW.completion_date = CURRENT_DATE;
    ELSE
      -- Already completed: NEVER touch completion_date, only log the edit
      NEW.completion_date = OLD.completion_date;

      IF NEW.admin_notes IS NULL THEN
        NEW.admin_notes = '';
      END IF;

      IF NEW.admin_notes NOT LIKE '%[LOG AUTOMÁTICO]%' THEN
        original_date_text := to_char(OLD.completion_date, 'DD/MM/YYYY');
        log_entry := E'\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n[LOG AUTOMÁTICO]\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' ||
                     '📅 Conclusão original: ' || original_date_text || E'\n' ||
                     E'\n🔄 Modificações:\n' ||
                     '  • ' || to_char(CURRENT_DATE, 'DD/MM/YYYY') || ': Formulário modificado';
        IF NEW.admin_notes = '' THEN
          NEW.admin_notes = log_entry;
        ELSE
          NEW.admin_notes = NEW.admin_notes || log_entry;
        END IF;
      ELSE
        log_entry := E'\n  • ' || to_char(CURRENT_DATE, 'DD/MM/YYYY') || ': Formulário modificado';
        NEW.admin_notes = NEW.admin_notes || log_entry;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
