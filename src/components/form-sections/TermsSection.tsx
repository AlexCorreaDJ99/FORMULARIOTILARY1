import { useState, useEffect } from 'react';
import { AppForm } from '../../lib/supabase';
import { Save, FileText } from 'lucide-react';

type Props = {
  form: AppForm;
  onSave: (updates: Partial<AppForm>) => Promise<void>;
};

export default function TermsSection({ form, onSave }: Props) {
  const [formData, setFormData] = useState({
    driver_terms: form.driver_terms || '',
    passenger_terms: form.passenger_terms || '',
    company_terms: form.company_terms || '',
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
          <h2 className="text-2xl font-bold text-gray-900">Termos de Uso</h2>
          <p className="text-gray-600 mt-1">Documentos legais para os aplicativos</p>
        </div>
        <button
          onClick={handleManualSave}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
          style={{ backgroundColor: '#e40033' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c2002a'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e40033'}
        >
          <Save className="w-4 h-4" />
          Salvar Agora
        </button>
      </div>

      <div className="space-y-6 pt-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Importante
          </h4>
          <p className="text-sm text-yellow-800">
            Os termos de uso são documentos legais obrigatórios. Recomendamos consultar um advogado
            especializado para garantir que seus termos estejam completos e adequados às leis vigentes.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Termos de Uso da Empresa *
          </label>
          <textarea
            value={formData.company_terms}
            onChange={(e) => handleChange('company_terms', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[300px] font-mono text-sm"
            placeholder="Cole aqui os termos de uso da empresa..."
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            {formData.company_terms.length} caracteres
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Termos de Uso - App Motorista *
          </label>
          <textarea
            value={formData.driver_terms}
            onChange={(e) => handleChange('driver_terms', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[300px] font-mono text-sm"
            placeholder="Cole aqui os termos de uso completos para o aplicativo do motorista..."
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            {formData.driver_terms.length} caracteres
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Termos de Uso - App Passageiro *
          </label>
          <textarea
            value={formData.passenger_terms}
            onChange={(e) => handleChange('passenger_terms', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[300px] font-mono text-sm"
            placeholder="Cole aqui os termos de uso completos para o aplicativo do passageiro..."
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            {formData.passenger_terms.length} caracteres
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 O que incluir nos Termos de Uso:</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Definição dos serviços oferecidos</li>
            <li>Direitos e responsabilidades dos usuários</li>
            <li>Políticas de privacidade e uso de dados</li>
            <li>Regras de conduta e uso apropriado</li>
            <li>Políticas de pagamento e cancelamento</li>
            <li>Limitações de responsabilidade</li>
            <li>Procedimentos de resolução de conflitos</li>
            <li>Informações de contato para suporte</li>
            <li>Lei aplicável e jurisdição</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">✓ Dica:</h4>
          <p className="text-sm text-green-800">
            Você pode ter URLs hospedadas dos seus termos de uso. Nesse caso, certifique-se de que os
            links estejam sempre acessíveis e atualizados antes de submeter para as lojas.
          </p>
        </div>
      </div>
    </div>
  );
}
