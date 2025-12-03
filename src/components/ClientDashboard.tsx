import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, AppForm, Client } from '../lib/supabase';
import { LogOut, Save, CheckCircle } from 'lucide-react';
import SetupSection from './form-sections/SetupSection';
import PlayStoreSection from './form-sections/PlayStoreSection';
import AppStoreSection from './form-sections/AppStoreSection';
import TermsSection from './form-sections/TermsSection';
import ProjectStatusSection from './ProjectStatusSection';

export default function ClientDashboard() {
  const { signOut, user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [form, setForm] = useState<AppForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('setup');

  useEffect(() => {
    loadClientData();
  }, [user]);

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
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (formData: Partial<AppForm>) => {
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

    const filled = fields.filter((field) => {
      const value = formData[field as keyof AppForm];
      return value && String(value).trim().length > 0;
    }).length;

    return Math.round((filled / fields.length) * 100);
  };

  const handleSaveForm = async (updates: Partial<AppForm>) => {
    if (!form || !client) return;

    setSaving(true);
    try {
      const updatedData = { ...form, ...updates };
      const progress = calculateProgress(updatedData);

      let status = form.status;
      if (progress === 100) {
        status = 'completed';
      } else if (progress > 0) {
        status = 'in_progress';
      }

      const { error } = await supabase
        .from('app_forms')
        .update({
          ...updates,
          progress_percentage: progress,
          status,
        })
        .eq('id', form.id);

      if (error) throw error;

      setForm({ ...form, ...updates, progress_percentage: progress, status });
    } catch (error) {
      console.error('Error saving form:', error);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'setup', label: 'Setup Inicial', icon: '⚙️' },
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
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold" style={{ color: '#e40033' }}>TILARY</span>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-900">Formulário de Submissão</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
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
                <div className="flex items-center gap-2 text-sm" style={{ color: '#e40033' }}>
                  <Save className="w-4 h-4 animate-pulse" />
                  Salvando...
                </div>
              )}
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-24">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Seções</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl flex items-center justify-center">{section.icon}</span>
                    <span>{section.label}</span>
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

          <div className="col-span-9">
            <div className="bg-white rounded-xl shadow-sm p-6">
              {activeSection === 'status' && (
                <ProjectStatusSection projectStatus={form.project_status || 'pending'} />
              )}
              {activeSection === 'setup' && (
                <SetupSection form={form} onSave={handleSaveForm} />
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
