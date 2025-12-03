import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  access_code: string;
  status: 'active' | 'inactive';
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AppForm = {
  id: string;
  client_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percentage: number;
  project_status?: string;
  driver_app_name?: string;
  passenger_app_name?: string;
  support_email?: string;
  playstore_driver_short_description?: string;
  playstore_driver_long_description?: string;
  playstore_passenger_short_description?: string;
  playstore_passenger_long_description?: string;
  appstore_driver_description?: string;
  appstore_passenger_description?: string;
  driver_terms?: string;
  passenger_terms?: string;
  company_terms?: string;
  created_at: string;
  updated_at: string;
};

export type FormImage = {
  id: string;
  form_id: string;
  image_type: 'logo_1024' | 'logo_352' | 'feature' | 'banner_1024';
  app_type: 'driver' | 'passenger';
  store_type: 'playstore' | 'appstore' | 'both';
  file_url: string;
  file_name: string;
  dimensions: string;
  size_bytes: number;
  uploaded_at: string;
};
