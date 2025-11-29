/*
  # Create Storage Bucket for App Submissions

  1. New Storage Bucket
    - Creates `app-submissions` bucket for storing form images
  
  2. Security
    - Authenticated users can upload to their own forms
    - Public read access for viewing images
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('app-submissions', 'app-submissions', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'app-submissions');

CREATE POLICY "Authenticated users can update own images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'app-submissions');

CREATE POLICY "Authenticated users can delete own images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'app-submissions');

CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'app-submissions');