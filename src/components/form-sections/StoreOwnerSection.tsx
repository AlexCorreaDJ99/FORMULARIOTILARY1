import { useState, useEffect } from 'react';
import { AppForm } from '../../lib/supabase';
import { AlertCircle, Store, Building2 } from 'lucide-react';

type Props = {
  form: AppForm;
  onSave: (updates: Partial<AppForm>) => Promise<void>;
};

export default function StoreOwnerSection({ form, onSave }: Props) {
  const [storeOwner, setStoreOwner] = useState<'tilary' | 'client' | undefined>(form.store_owner);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStoreOwner(form.store_owner);
  }, [form]);

  const handleSave = async (value: 'tilary' | 'client') => {
    setSaving(true);
    try {
      await onSave({ store_owner: value });
      setStoreOwner(value);
    } catch (error) {
      console.error('Error saving store owner:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Publicação nas Lojas</h2>
        <p className="text-gray-600">
          Selecione onde os aplicativos serão publicados
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => handleSave('tilary')}
          disabled={saving}
          className={`p-6 border-2 rounded-lg transition-all ${
            storeOwner === 'tilary'
              ? 'border-red-500 bg-red-50'
              : 'border-gray-300 hover:border-red-300 bg-white'
          }`}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <Store className="w-12 h-12" style={{ color: storeOwner === 'tilary' ? '#e40033' : '#9ca3af' }} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Lojas da Tilary
              </h3>
              <p className="text-sm text-gray-600">
                Os aplicativos serão publicados nas contas da Tilary
              </p>
            </div>
            {storeOwner === 'tilary' && (
              <div className="flex items-center gap-2 text-sm" style={{ color: '#e40033' }}>
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Selecionado</span>
              </div>
            )}
          </div>
        </button>

        <button
          onClick={() => handleSave('client')}
          disabled={saving}
          className={`p-6 border-2 rounded-lg transition-all ${
            storeOwner === 'client'
              ? 'border-red-500 bg-red-50'
              : 'border-gray-300 hover:border-red-300 bg-white'
          }`}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <Building2 className="w-12 h-12" style={{ color: storeOwner === 'client' ? '#e40033' : '#9ca3af' }} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Minha Própria Conta
              </h3>
              <p className="text-sm text-gray-600">
                Os aplicativos serão publicados na minha conta de desenvolvedor
              </p>
            </div>
            {storeOwner === 'client' && (
              <div className="flex items-center gap-2 text-sm" style={{ color: '#e40033' }}>
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Selecionado</span>
              </div>
            )}
          </div>
        </button>
      </div>

      {storeOwner === 'tilary' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-2">
                Importante: Prazo de 6 meses
              </h4>
              <p className="text-sm text-yellow-800">
                Ao escolher publicar nas lojas da Tilary, você terá um prazo de <strong>6 meses</strong> para criar suas próprias contas de desenvolvedor na Play Store e Apple App Store.
              </p>
              <p className="text-sm text-yellow-800 mt-2">
                Após esse período, será necessário transferir os aplicativos para suas próprias contas. A Tilary fornecerá todo o suporte necessário para essa transição.
              </p>
            </div>
          </div>
        </div>
      )}

      {storeOwner === 'client' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">
                Requisitos para publicação
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Conta de desenvolvedor ativa na Google Play Store (US$ 25)</li>
                <li>Conta de desenvolvedor ativa na Apple App Store (US$ 99/ano)</li>
                <li>Acesso administrativo para publicação dos aplicativos</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
