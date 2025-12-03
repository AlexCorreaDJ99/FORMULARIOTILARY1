import { useState, useEffect } from 'react';
import { AppForm } from '../../lib/supabase';
import { Save, Upload, AlertCircle } from 'lucide-react';
import ImageUpload from '../ImageUpload';

type Props = {
  form: AppForm;
  onSave: (updates: Partial<AppForm>) => Promise<void>;
};

export default function PlayStoreSection({ form, onSave }: Props) {
  const [formData, setFormData] = useState({
    playstore_driver_short_description: form.playstore_driver_short_description || '',
    playstore_driver_long_description: form.playstore_driver_long_description || '',
    playstore_passenger_short_description: form.playstore_passenger_short_description || '',
    playstore_passenger_long_description: form.playstore_passenger_long_description || '',
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
          <h2 className="text-2xl font-bold text-gray-900">Play Store (Android)</h2>
          <p className="text-gray-600 mt-1">Informações e imagens para publicação na Google Play Store</p>
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição Curta (Slogan) *
                <span className="text-gray-500 font-normal ml-2">
                  ({formData.playstore_driver_short_description.length}/80 caracteres)
                </span>
              </label>
              <input
                type="text"
                value={formData.playstore_driver_short_description}
                onChange={(e) => handleChange('playstore_driver_short_description', e.target.value.slice(0, 80))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Slogan impactante para motoristas"
                maxLength={80}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição Longa *
                <span className="text-gray-500 font-normal ml-2">
                  ({formData.playstore_driver_long_description.length}/4000 caracteres)
                </span>
              </label>
              <textarea
                value={formData.playstore_driver_long_description}
                onChange={(e) => handleChange('playstore_driver_long_description', e.target.value.slice(0, 4000))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[200px]"
                placeholder="Descrição completa do app para motoristas (aceitar corridas, ganhar dinheiro, etc.)"
                maxLength={4000}
                required
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">App Passageiro</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição Curta (Slogan) *
                <span className="text-gray-500 font-normal ml-2">
                  ({formData.playstore_passenger_short_description.length}/80 caracteres)
                </span>
              </label>
              <input
                type="text"
                value={formData.playstore_passenger_short_description}
                onChange={(e) => handleChange('playstore_passenger_short_description', e.target.value.slice(0, 80))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Slogan impactante para passageiros"
                maxLength={80}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição Longa *
                <span className="text-gray-500 font-normal ml-2">
                  ({formData.playstore_passenger_long_description.length}/4000 caracteres)
                </span>
              </label>
              <textarea
                value={formData.playstore_passenger_long_description}
                onChange={(e) => handleChange('playstore_passenger_long_description', e.target.value.slice(0, 4000))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[200px]"
                placeholder="Descrição completa do app para passageiros (solicitar corrida, segurança, facilidade, etc.)"
                maxLength={4000}
                required
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Logos dos Aplicativos
          </h3>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">App Motorista</h4>
              <div className="grid grid-cols-2 gap-4">
                <ImageUpload
                  formId={form.id}
                  label="Logo 1024x1024 (PNG transparente)"
                  imageType="logo_1024"
                  appType="driver"
                  storeType="playstore"
                  requiredDimensions={{ width: 1024, height: 1024 }}
                  requiredFormat="png"
                  transparent={true}
                />
                <ImageUpload
                  formId={form.id}
                  label="Logo 352x68 (PNG transparente)"
                  imageType="logo_352"
                  appType="driver"
                  storeType="playstore"
                  requiredDimensions={{ width: 352, height: 68 }}
                  requiredFormat="png"
                  transparent={true}
                />
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">App Passageiro</h4>
              <div className="grid grid-cols-2 gap-4">
                <ImageUpload
                  formId={form.id}
                  label="Logo 1024x1024 (PNG transparente)"
                  imageType="logo_1024"
                  appType="passenger"
                  storeType="playstore"
                  requiredDimensions={{ width: 1024, height: 1024 }}
                  requiredFormat="png"
                  transparent={true}
                />
                <ImageUpload
                  formId={form.id}
                  label="Logo 352x68 (PNG transparente)"
                  imageType="logo_352"
                  appType="passenger"
                  storeType="playstore"
                  requiredDimensions={{ width: 352, height: 68 }}
                  requiredFormat="png"
                  transparent={true}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Imagens de Funcionalidades</h3>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">App Motorista</h4>
              <ImageUpload
                formId={form.id}
                label="Screenshots 1243x2486 (4-8 imagens, PNG)"
                imageType="feature"
                appType="driver"
                storeType="playstore"
                requiredDimensions={{ width: 1243, height: 2486 }}
                requiredFormat="png"
                multiple={true}
                minImages={4}
                maxImages={8}
              />
              <ImageUpload
                formId={form.id}
                label="Banner 1024x500 (PNG)"
                imageType="banner_1024"
                appType="driver"
                storeType="playstore"
                requiredDimensions={{ width: 1024, height: 500 }}
                requiredFormat="png"
              />
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">App Passageiro</h4>
              <ImageUpload
                formId={form.id}
                label="Screenshots 1243x2486 (4-8 imagens, PNG)"
                imageType="feature"
                appType="passenger"
                storeType="playstore"
                requiredDimensions={{ width: 1243, height: 2486 }}
                requiredFormat="png"
                multiple={true}
                minImages={4}
                maxImages={8}
              />
              <ImageUpload
                formId={form.id}
                label="Banner 1024x500 (PNG)"
                imageType="banner_1024"
                appType="passenger"
                storeType="playstore"
                requiredDimensions={{ width: 1024, height: 500 }}
                requiredFormat="png"
              />
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Restrições da Play Store
          </h4>
          <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
            <li>NÃO use marketing agressivo ou promessas exageradas</li>
            <li>Foque APENAS nas funcionalidades reais do app</li>
            <li>NÃO use logos da Apple, iPhone ou outras empresas</li>
            <li>NÃO use PNG para screenshots (apenas JPEG)</li>
            <li>Respeite EXATAMENTE as dimensões exigidas</li>
            <li>As logos do motorista e passageiro devem ser DIFERENTES</li>
            <li>Garanta bom contraste das logos em fundo branco</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
