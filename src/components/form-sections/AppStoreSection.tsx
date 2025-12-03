import { useState, useEffect } from 'react';
import { AppForm } from '../../lib/supabase';
import { Save, AlertCircle } from 'lucide-react';
import ImageUpload from '../ImageUpload';

type Props = {
  form: AppForm;
  onSave: (updates: Partial<AppForm>) => Promise<void>;
};

export default function AppStoreSection({ form, onSave }: Props) {
  const [formData, setFormData] = useState({
    appstore_driver_description: form.appstore_driver_description || '',
    appstore_passenger_description: form.appstore_passenger_description || '',
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
          <h2 className="text-2xl font-bold text-gray-900">App Store (iOS)</h2>
          <p className="text-gray-600 mt-1">Informações e imagens para publicação na Apple App Store</p>
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 mb-1">Importante</h4>
          <p className="text-sm text-amber-800">
            As descrições do app Motorista e do app Passageiro devem ser DIFERENTES, focando nas funcionalidades específicas de cada perfil de usuário.
          </p>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">App Motorista</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição do App *
              <span className="text-gray-500 font-normal ml-2">
                ({formData.appstore_driver_description.length}/4000 caracteres)
              </span>
            </label>
            <textarea
              value={formData.appstore_driver_description}
              onChange={(e) => handleChange('appstore_driver_description', e.target.value.slice(0, 4000))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[200px]"
              placeholder="Descrição completa do app para motoristas (aceitar corridas, ganhar dinheiro, etc.)"
              maxLength={4000}
              required
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">App Passageiro</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição do App *
              <span className="text-gray-500 font-normal ml-2">
                ({formData.appstore_passenger_description.length}/4000 caracteres)
              </span>
            </label>
            <textarea
              value={formData.appstore_passenger_description}
              onChange={(e) => handleChange('appstore_passenger_description', e.target.value.slice(0, 4000))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[200px]"
              placeholder="Descrição completa do app para passageiros (solicitar corrida, segurança, facilidade, etc.)"
              maxLength={4000}
              required
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Screenshots para iPhone</h3>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">App Motorista</h4>
              <div className="space-y-4">
                <ImageUpload
                  formId={form.id}
                  label='Screenshots 1242x2688 - 6.5" (4-8 imagens, PNG)'
                  imageType="feature"
                  appType="driver"
                  storeType="appstore"
                  requiredDimensions={{ width: 1242, height: 2688 }}
                  requiredFormat="png"
                  multiple={true}
                  minImages={4}
                  maxImages={8}
                />
                <ImageUpload
                  formId={form.id}
                  label='Screenshots 1320x2868 - 6.9" (4-8 imagens, PNG)'
                  imageType="feature"
                  appType="driver"
                  storeType="appstore"
                  requiredDimensions={{ width: 1320, height: 2868 }}
                  requiredFormat="png"
                  multiple={true}
                  minImages={4}
                  maxImages={8}
                />
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">App Passageiro</h4>
              <div className="space-y-4">
                <ImageUpload
                  formId={form.id}
                  label='Screenshots 1242x2688 - 6.5" (4-8 imagens, PNG)'
                  imageType="feature"
                  appType="passenger"
                  storeType="appstore"
                  requiredDimensions={{ width: 1242, height: 2688 }}
                  requiredFormat="png"
                  multiple={true}
                  minImages={4}
                  maxImages={8}
                />
                <ImageUpload
                  formId={form.id}
                  label='Screenshots 1320x2868 - 6.9" (4-8 imagens, PNG)'
                  imageType="feature"
                  appType="passenger"
                  storeType="appstore"
                  requiredDimensions={{ width: 1320, height: 2868 }}
                  requiredFormat="png"
                  multiple={true}
                  minImages={4}
                  maxImages={8}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Restrições da App Store
          </h4>
          <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
            <li>Screenshots devem focar APENAS nas funcionalidades</li>
            <li>NÃO use marketing ou promessas exageradas</li>
            <li>NÃO inclua logos de empresas externas</li>
            <li>Use APENAS JPEG/JPG (sem PNG, sem fundo transparente)</li>
            <li>Respeite EXATAMENTE as dimensões exigidas para cada tamanho de tela</li>
            <li>As imagens devem representar fielmente o app</li>
            <li>Evite textos excessivos nas screenshots</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Dicas para Screenshots iOS:</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Capture telas reais do aplicativo funcionando</li>
            <li>Mostre as principais funcionalidades em sequência lógica</li>
            <li>Use dispositivos com as resoluções exatas especificadas</li>
            <li>Mantenha consistência visual entre as screenshots</li>
            <li>Priorize qualidade e clareza das imagens</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
