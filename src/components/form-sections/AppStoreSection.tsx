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

  const handleImageSourceChange = async (source: 'tilary' | 'custom') => {
    if (source === 'custom') {
      await onSave({
        image_source: source,
        images_uploaded: false
      });
    } else {
      await onSave({
        image_source: source,
        images_uploaded: true
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">App Store (iOS)</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Informações e imagens para publicação na Apple App Store</p>
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

          <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-lg">
            <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
              <Save className="w-5 h-5" />
              Templates e Recursos de Imagem
            </h4>
            <p className="text-sm text-orange-800 mb-3">
              Acesse nossa pasta com templates e exemplos de imagens para facilitar a criação dos seus assets:
            </p>
            <a
              href="https://drive.google.com/drive/folders/1YkpUrF1SUKaR6fFhvmjnTkLuFMiU6Wur?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
            >
              Acessar Google Drive
            </a>
          </div>

          <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-3">Onde essas screenshots aparecem na App Store:</h4>
            <div className="space-y-3 text-sm text-purple-800">
              <p className="leading-relaxed">
                As screenshots aparecem na <strong>GALERIA DE PRÉVIA</strong> da página do seu app na App Store. São as imagens que os usuários veem ao rolar a página, mostrando as principais telas e funcionalidades do aplicativo.
              </p>
              <div className="bg-white/60 p-3 rounded-lg border border-purple-200">
                <p className="font-medium mb-1">Por que dois tamanhos diferentes?</p>
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="font-bold">6.5" (1242x2688):</span>
                    <span>Para iPhones com tela de 6.5 polegadas (iPhone 11 Pro Max, 12 Pro Max, 13 Pro Max, 14 Plus)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">6.9" (1320x2868):</span>
                    <span>Para iPhones com tela de 6.9 polegadas (iPhone 15 Pro Max, 16 Plus, 16 Pro Max - modelos mais recentes)</span>
                  </div>
                </div>
              </div>
              <p className="text-xs italic">
                💡 A Apple exige screenshots para diferentes tamanhos de tela para garantir que as imagens fiquem perfeitas em todos os modelos de iPhone.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">App Motorista</h4>
              <div className="space-y-4">
                <ImageUpload
                  formId={form.id}
                  label='Screenshots 1242x2688 PX - 6.5" (4-8 imagens, PNG)'
                  imageType="feature"
                  appType="driver"
                  storeType="appstore"
                  requiredDimensions={{ width: 1242, height: 2688 }}
                  requiredFormat="png"
                  multiple={true}
                  minImages={4}
                  maxImages={8}
                  imageSource={form.image_source}
                  onImageSourceChange={handleImageSourceChange}
                />
                <ImageUpload
                  formId={form.id}
                  label='Screenshots 1320x2868 PX - 6.9" (4-8 imagens, PNG)'
                  imageType="feature"
                  appType="driver"
                  storeType="appstore"
                  requiredDimensions={{ width: 1320, height: 2868 }}
                  requiredFormat="png"
                  multiple={true}
                  minImages={4}
                  maxImages={8}
                  imageSource={form.image_source}
                  onImageSourceChange={handleImageSourceChange}
                />
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">App Passageiro</h4>
              <div className="space-y-4">
                <ImageUpload
                  formId={form.id}
                  label='Screenshots 1242x2688 PX - 6.5" (4-8 imagens, PNG)'
                  imageType="feature"
                  appType="passenger"
                  storeType="appstore"
                  requiredDimensions={{ width: 1242, height: 2688 }}
                  requiredFormat="png"
                  multiple={true}
                  minImages={4}
                  maxImages={8}
                  imageSource={form.image_source}
                  onImageSourceChange={handleImageSourceChange}
                />
                <ImageUpload
                  formId={form.id}
                  label='Screenshots 1320x2868 PX - 6.9" (4-8 imagens, PNG)'
                  imageType="feature"
                  appType="passenger"
                  storeType="appstore"
                  requiredDimensions={{ width: 1320, height: 2868 }}
                  requiredFormat="png"
                  multiple={true}
                  minImages={4}
                  maxImages={8}
                  imageSource={form.image_source}
                  onImageSourceChange={handleImageSourceChange}
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
