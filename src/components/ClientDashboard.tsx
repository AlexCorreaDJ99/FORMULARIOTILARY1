import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, AppForm, Client } from '../lib/supabase';
import { LogOut, Save, CheckCircle, Menu, X } from 'lucide-react';
import SetupSection from './form-sections/SetupSection';
import PlayStoreSection from './form-sections/PlayStoreSection';
import AppStoreSection from './form-sections/AppStoreSection';
import TermsSection from './form-sections/TermsSection';
import StoreOwnerSection from './form-sections/StoreOwnerSection';
import ProjectStatusSection from './ProjectStatusSection';

export default function ClientDashboard() {
  const { signOut, user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [form, setForm] = useState<AppForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('setup');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadClientData();
  }, [user]);

  useEffect(() => {
    if (!form?.id) return;

    const checkForUpdates = setInterval(async () => {
      const { data: updatedForm } = await supabase
        .from('app_forms')
        .select('images_uploaded')
        .eq('id', form.id)
        .single();

      if (updatedForm && updatedForm.images_uploaded !== form.images_uploaded) {
        await recalculateProgress();
      }
    }, 3000);

    return () => clearInterval(checkForUpdates);
  }, [form?.id, form?.images_uploaded]);

  const loadClientData = async () => {
    if (!user) return;

    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clientError) throw clientError;
      setClient(clientData);

      if (clientData) {
        const { data: formData, error: formError } = await supabase
          .from('app_forms')
          .select('*')
          .eq('client_id', clientData.id)
          .maybeSingle();

        if (formError) throw formError;
        setForm(formData);

        if (formData) {
          await supabase
            .from('app_forms')
            .update({ last_activity_date: new Date().toISOString() })
            .eq('id', formData.id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = async (formData: Partial<AppForm>) => {
    const fields = [
      'driver_app_name',
      'passenger_app_name',
      'support_email',
      'playstore_driver_short_description',
      'playstore_driver_long_description',
      'playstore_passenger_short_description',
      'playstore_passenger_long_description',
      'appstore_driver_description',
      'appstore_passenger_description',
      'driver_terms',
      'passenger_terms',
    ];

    let filled = fields.filter((field) => {
      const value = formData[field as keyof AppForm];
      return value && String(value).trim().length > 0;
    }).length;

    if (formData.image_source === 'tilary') {
      filled += 1;
    } else if (formData.image_source === 'custom') {
      if (!formData.id) {
        return Math.round((filled / (fields.length + 1)) * 100);
      }

      const { data: images } = await supabase
        .from('form_images')
        .select('image_type, app_type, store_type')
        .eq('form_id', formData.id);

      const requiredImages = {
        driver_playstore_logo_1024: false,
        driver_playstore_logo_352: false,
        passenger_playstore_logo_1024: false,
        passenger_playstore_logo_352: false,
        driver_playstore_feature: false,
        driver_appstore_feature: false,
        passenger_playstore_feature: false,
        passenger_appstore_feature: false,
      };

      if (images && images.length > 0) {
        images.forEach((img) => {
          const key = `${img.app_type}_${img.store_type}_${img.image_type}`;
          if (key in requiredImages) {
            requiredImages[key as keyof typeof requiredImages] = true;
          }
        });
      }

      const allImagesUploaded = Object.values(requiredImages).every((uploaded) => uploaded);

      if (allImagesUploaded) {
        filled += 1;

        if (!formData.images_uploaded) {
          await supabase
            .from('app_forms')
            .update({ images_uploaded: true })
            .eq('id', formData.id);
        }
      } else {
        if (formData.images_uploaded) {
          await supabase
            .from('app_forms')
            .update({ images_uploaded: false })
            .eq('id', formData.id);
        }
      }
    }

    const total = fields.length + 1;
    return Math.round((filled / total) * 100);
  };

  const handleSaveForm = async (updates: Partial<AppForm>) => {
    if (!form || !client) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_forms')
        .update({
          ...updates,
          last_activity_date: new Date().toISOString(),
          last_client_update: new Date().toISOString(),
          admin_notified_of_changes: false,
        })
        .eq('id', form.id);

      if (error) throw error;

      await recalculateProgress();

      if (form.review_status === 'rejected' || form.review_status === 'approved') {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_admin', true);

        if (admins && admins.length > 0) {
          for (const admin of admins) {
            await supabase.from('notifications').insert({
              client_id: admin.id,
              type: 'form_updated',
              message: `${client.name} fez alterações no formulário`,
            });
          }
        }

        await supabase
          .from('app_forms')
          .update({
            admin_notified_of_changes: true,
            corrections_completed: false,
          })
          .eq('id', form.id);
      }
    } catch (error) {
      console.error('Error saving form:', error);
    } finally {
      setSaving(false);
    }
  };

  const recalculateProgress = async () => {
    if (!form || !client) return;

    try {
      const { data: updatedForm } = await supabase
        .from('app_forms')
        .select('*')
        .eq('id', form.id)
        .single();

      if (!updatedForm) return;

      const progress = await calculateProgress(updatedForm);
      const oldProgress = form.progress_percentage || 0;

      let status = updatedForm.status;
      if (progress === 100) {
        status = 'completed';
      } else if (progress > 0) {
        status = 'in_progress';
      }

      const { error } = await supabase
        .from('app_forms')
        .update({
          progress_percentage: progress,
          status,
        })
        .eq('id', form.id);

      if (error) throw error;

      if (progress === 100 && oldProgress < 100) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_admin', true);

        if (admins && admins.length > 0) {
          for (const admin of admins) {
            await supabase.from('notifications').insert({
              client_id: admin.id,
              type: 'form_completed',
              message: `${client.name} completou o formulário (100%)`,
            });
          }
        }
      } else if (progress > oldProgress && progress >= 25 && oldProgress < 25) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_admin', true);

        if (admins && admins.length > 0) {
          for (const admin of admins) {
            await supabase.from('notifications').insert({
              client_id: admin.id,
              type: 'form_updated',
              message: `${client.name} atualizou o formulário (${progress}%)`,
            });
          }
        }
      }

      setForm({ ...updatedForm, progress_percentage: progress, status });
    } catch (error) {
      console.error('Error recalculating progress:', error);
    }
  };

  const handleMarkCorrectionsComplete = async () => {
    if (!form || !client) return;

    try {
      await supabase
        .from('app_forms')
        .update({
          corrections_completed: true,
          corrections_completed_at: new Date().toISOString(),
        })
        .eq('id', form.id);

      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_admin', true);

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            client_id: admin.id,
            type: 'form_updated',
            message: `${client.name} marcou as correções como concluídas`,
          });
        }
      }

      setForm({ ...form, corrections_completed: true });
    } catch (error) {
      console.error('Error marking corrections complete:', error);
    }
  };

  const handleUpdateCompletionDate = async (date: string) => {
    if (!form) return;

    try {
      await supabase
        .from('app_forms')
        .update({ completion_date: date })
        .eq('id', form.id);

      setForm({ ...form, completion_date: date });
    } catch (error) {
      console.error('Error updating completion date:', error);
      throw error;
    }
  };

  const sections = [
    { id: 'setup', label: 'Setup Inicial', icon: '⚙️' },
    { id: 'store', label: 'Lojas', icon: '🏪' },
    { id: 'playstore', label: 'Play Store', icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
      </svg>
    ) },
    { id: 'appstore', label: 'App Store', icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
      </svg>
    ) },
    { id: 'terms', label: 'Termos de Uso', icon: '📄' },
    { id: 'status', label: 'Status do Projeto', icon: '📊' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!client || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Erro ao carregar dados do cliente</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <span className="text-xl sm:text-2xl font-bold" style={{ color: '#e40033' }}>TILARY</span>
              <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
              <h1 className="hidden sm:block text-xl font-bold text-gray-900">Formulário</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden md:flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{client.name}</p>
                  <p className="text-xs text-gray-500">{form.progress_percentage}% completo</p>
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${form.progress_percentage}%`,
                      backgroundColor: '#e40033'
                    }}
                  />
                </div>
              </div>
              {saving && (
                <div className="hidden sm:flex items-center gap-2 text-sm" style={{ color: '#e40033' }}>
                  <Save className="w-4 h-4 animate-pulse" />
                  <span className="hidden md:inline">Salvando...</span>
                </div>
              )}
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-2 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="md:hidden mb-4 p-3 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{client.name}</p>
              <p className="text-xs text-gray-500">{form.progress_percentage}% completo</p>
            </div>
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${form.progress_percentage}%`,
                  backgroundColor: '#e40033'
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <div className={`lg:col-span-3 ${mobileMenuOpen ? 'fixed inset-y-0 left-0 w-64 z-20 transform translate-x-0' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-xl shadow-sm p-4 lg:sticky lg:top-24 h-full lg:h-auto overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase">Seções</h3>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="lg:hidden p-1 rounded hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl flex items-center justify-center">{section.icon}</span>
                    <span className="text-sm lg:text-base">{section.label}</span>
                  </button>
                ))}
              </nav>

              {form.status === 'completed' && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Formulário Completo!</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-9">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              {activeSection === 'status' && (
                <ProjectStatusSection
                  projectStatus={form.project_status || 'pending'}
                  reviewStatus={form.review_status}
                  reviewFeedback={form.review_feedback}
                  correctionsCompleted={form.corrections_completed}
                  completionDate={form.completion_date}
                  onMarkCorrectionsComplete={handleMarkCorrectionsComplete}
                  onUpdateCompletionDate={handleUpdateCompletionDate}
                />
              )}
              {activeSection === 'setup' && (
                <SetupSection form={form} onSave={handleSaveForm} />
              )}
              {activeSection === 'store' && (
                <StoreOwnerSection form={form} onSave={handleSaveForm} />
              )}
              {activeSection === 'playstore' && (
                <PlayStoreSection form={form} onSave={handleSaveForm} />
              )}
              {activeSection === 'appstore' && (
                <AppStoreSection form={form} onSave={handleSaveForm} />
              )}
              {activeSection === 'terms' && (
                <TermsSection form={form} onSave={handleSaveForm} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
