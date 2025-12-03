/*
  # Add project status tracking

  1. Changes
    - Add `project_status` column to `app_forms` table to track project development stage
    - Possible statuses: 
      - 'pending' (initial state)
      - 'preparing_images' (preparing images)
      - 'configuring_firebase' (setting up Firebase)
      - 'admin_panel_delivered' (admin panel delivered to client)
      - 'testing_app' (testing the app)
      - 'submitted_playstore' (submitted to Play Store)
      - 'submitted_appstore' (submitted to App Store)
      - 'completed' (fully completed)
    - Default value is 'pending'

  2. Notes
    - This allows admins to track and update project stages
    - Clients can view their project status to reduce anxiety
    - Status updates are restricted to admins only via RLS
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_forms' AND column_name = 'project_status'
  ) THEN
    ALTER TABLE app_forms ADD COLUMN project_status text DEFAULT 'pending';
  END IF;
END $$;

-- Create policy for admins to update project status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'app_forms' 
    AND policyname = 'Admins can update all forms'
  ) THEN
    CREATE POLICY "Admins can update all forms"
      ON app_forms FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;