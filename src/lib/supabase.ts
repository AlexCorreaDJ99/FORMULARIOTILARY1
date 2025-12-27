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
  admin_notes?: string;
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
  completion_date?: string;
  meeting_scheduled?: boolean;
  meeting_date?: string;
  meeting_time?: string;
  play_store_owner?: 'tilary' | 'client';
  app_store_owner?: 'tilary' | 'client';
  image_source?: 'tilary' | 'custom';
  images_uploaded?: boolean;
  review_status?: 'pending' | 'approved' | 'rejected';
  review_feedback?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  corrections_completed?: boolean;
  corrections_completed_at?: string;
  admin_notified_of_changes?: boolean;
  last_activity_date?: string;
  last_client_update?: string;
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

export type Notification = {
  id: string;
  client_id: string;
  type: 'form_completed' | 'inactive_warning' | 'form_updated';
  message: string;
  read: boolean;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  admin_id: string;
  admin_name: string;
  admin_email: string;
  action_type: string;
  action_description: string;
  target_type?: string;
  target_id?: string;
  target_name?: string;
  metadata?: Record<string, any>;
  created_at: string;
};

export async function logAdminAction(
  actionType: string,
  actionDescription: string,
  targetType?: string,
  targetId?: string,
  targetName?: string,
  metadata?: Record<string, any>
) {
  try {
    const { data, error } = await supabase.rpc('log_admin_action', {
      p_action_type: actionType,
      p_action_description: actionDescription,
      p_target_type: targetType || null,
      p_target_id: targetId || null,
      p_target_name: targetName || null,
      p_metadata: metadata || {},
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}
