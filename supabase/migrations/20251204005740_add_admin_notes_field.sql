/*
  # Add Admin Notes Field to Clients Table

  ## Summary
  This migration adds a notes field for administrators to store observations and annotations about clients.

  ## Changes Made
  1. New Column Added:
    - `admin_notes` (text) - Field for administrators to write notes and observations about the client
      - Nullable, defaults to NULL
      - Can contain any text content (no length limit)
  
  ## Notes
  - This field is exclusively for internal administrative use
  - Clients cannot see or edit these notes
  - Useful for tracking important information, reminders, and observations about each client
*/

-- Add admin_notes column to clients table
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS admin_notes text DEFAULT NULL;