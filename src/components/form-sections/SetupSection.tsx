import { useState, useEffect } from 'react';
import { AppForm } from '../../lib/supabase';
import { Save } from 'lucide-react';

type Props = {
  form: AppForm;
  clientId: string;
  onSave: (updates: Partial<AppForm>) => Promise<void>;
};

export default function SetupSection({ form, clientId, onSave }: Props) {
  const [formData, setFormData] = useState({
    driver_app_name: form.driver_app_name || '',
    passenger_app_name: form.passenger_app_name || '',
    support_email: form.support_email || '',
  });

  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(() => {
      onSave(formData);
    }, 2000);

    setAutoSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [formData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleManualSave = () => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Setup Inicial dos Aplicativos</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Informações básicas sobre os aplicativos</p>
        </div>
        <button
          onClick={handleManualSave}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors whitespace-nowrap"
          style={{ backgroundColor: '#e40033' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c2002a'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e40033'}
        >
          <Save className="w-4 h-4" />
          Salvar Agora
        </button>
      </div>

      <div className="space-y-6 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do App Motorista *
            </label>
            <input
              type="text"
              value={formData.driver_app_name}
              onChange={(e) => handleChange('driver_app_name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: MinhaApp Driver"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do App Passageiro *
            </label>
            <input
              type="text"
              value={formData.passenger_app_name}
              onChange={(e) => handleChange('passenger_app_name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: MinhaApp Passenger"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email para Suporte *
          </label>
          <input
            type="email"
            value={formData.support_email}
            onChange={(e) => handleChange('support_email', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="suporte@minhaempresa.com"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Este email será usado para contato pelos usuários dos apps
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Informação Importante</h4>
          <p className="text-sm text-blue-800">
            As descrições dos aplicativos devem ser preenchidas nas seções Play Store e App Store,
            onde você poderá definir descrições específicas para o app Motorista e o app Passageiro.
          </p>
        </div>
      </div>
    </div>
  );
}
