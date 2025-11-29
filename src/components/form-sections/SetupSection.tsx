import { useState, useEffect } from 'react';
import { AppForm } from '../../lib/supabase';
import { Save } from 'lucide-react';

type Props = {
  form: AppForm;
  onSave: (updates: Partial<AppForm>) => Promise<void>;
};

export default function SetupSection({ form, onSave }: Props) {
  const [formData, setFormData] = useState({
    driver_app_name: form.driver_app_name || '',
    passenger_app_name: form.passenger_app_name || '',
    support_email: form.support_email || '',
    short_description: form.short_description || '',
    long_description: form.long_description || '',
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Setup Inicial dos Aplicativos</h2>
          <p className="text-gray-600 mt-1">Informações básicas sobre os aplicativos</p>
        </div>
        <button
          onClick={handleManualSave}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          Salvar Agora
        </button>
      </div>

      <div className="space-y-6 pt-4">
        <div className="grid grid-cols-2 gap-6">
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição Curta *
            <span className="text-gray-500 font-normal ml-2">
              ({formData.short_description.length}/80 caracteres)
            </span>
          </label>
          <input
            type="text"
            value={formData.short_description}
            onChange={(e) => handleChange('short_description', e.target.value.slice(0, 80))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Slogan ou resumo do app em até 80 caracteres"
            maxLength={80}
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Esta descrição será exibida nas lojas de aplicativos
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição Longa *
            <span className="text-gray-500 font-normal ml-2">
              ({formData.long_description.length}/4000 caracteres)
            </span>
          </label>
          <textarea
            value={formData.long_description}
            onChange={(e) => handleChange('long_description', e.target.value.slice(0, 4000))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[200px]"
            placeholder="Descrição detalhada do app, funcionalidades, diferenciais..."
            maxLength={4000}
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Descreva em detalhes as funcionalidades e benefícios do app
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Dicas Importantes:</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Use nomes claros e memoráveis para os apps</li>
            <li>A descrição curta deve ser impactante e objetiva</li>
            <li>Na descrição longa, foque nas funcionalidades e benefícios</li>
            <li>Evite fazer promessas exageradas ou marketing agressivo</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
