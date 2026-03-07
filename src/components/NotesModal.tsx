import { useState, useEffect } from 'react';
import { X, Save, CreditCard as Edit2 } from 'lucide-react';
import { supabase, Client } from '../lib/supabase';

type NotesModalProps = {
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
};

export default function NotesModal({ client, onClose, onSuccess }: NotesModalProps) {
  const [notes, setNotes] = useState(client.admin_notes || '');
  const [cezarResponsibility, setCezarResponsibility] = useState<'sim' | 'nao' | null>(client.cezar_images_responsibility || null);
  const [salesPerson, setSalesPerson] = useState(client.sales_person || '');
  const [plan, setPlan] = useState(client.plan || '');
  const [iosAppType, setIosAppType] = useState(client.ios_app_type || '');
  const [authorizedCities, setAuthorizedCities] = useState(client.authorized_cities || '');
  const [clientNotes, setClientNotes] = useState(client.notes || '');
  const [expectations, setExpectations] = useState(client.expectations || '');
  const [saving, setSaving] = useState(false);
  const [isEditingCommercial, setIsEditingCommercial] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          admin_notes: notes,
          cezar_images_responsibility: cezarResponsibility,
          sales_person: salesPerson,
          plan: plan,
          ios_app_type: iosAppType,
          authorized_cities: authorizedCities,
          notes: clientNotes,
          expectations: expectations
        })
        .eq('id', client.id);

      if (error) throw error;

      setIsEditingCommercial(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Erro ao salvar anotações');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setSalesPerson(client.sales_person || '');
    setPlan(client.plan || '');
    setIosAppType(client.ios_app_type || '');
    setAuthorizedCities(client.authorized_cities || '');
    setClientNotes(client.notes || '');
    setExpectations(client.expectations || '');
    setIsEditingCommercial(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Observações e Anotações</h3>
            <p className="text-sm text-gray-600 mt-1">Cliente: {client.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-blue-900">Informações Comerciais</h4>
              {!isEditingCommercial && (
                <button
                  onClick={() => setIsEditingCommercial(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              )}
            </div>

            {!isEditingCommercial ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Vendedor Responsável:</span>
                    <p className="text-blue-900 mt-1">{salesPerson || 'Não informado'}</p>
                  </div>

                  <div>
                    <span className="font-medium text-blue-800">Plano Contratado:</span>
                    <p className="text-blue-900 mt-1">{plan || 'Não informado'}</p>
                  </div>

                  <div>
                    <span className="font-medium text-blue-800">Tipo de App iOS:</span>
                    <p className="text-blue-900 mt-1">
                      {iosAppType === 'P' && 'P - Passageiro'}
                      {iosAppType === 'P/M' && 'P/M - Passageiro e Motorista'}
                      {!iosAppType && 'Não informado'}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="font-medium text-blue-800">Cidades Autorizadas:</span>
                  <p className="text-blue-900 mt-1 whitespace-pre-line">{authorizedCities || 'Não informado'}</p>
                </div>

                <div>
                  <span className="font-medium text-blue-800">Observações do Cadastro:</span>
                  <p className="text-blue-900 mt-1 whitespace-pre-line">{clientNotes || 'Não informado'}</p>
                </div>

                <div>
                  <span className="font-medium text-blue-800">Expectativa:</span>
                  <p className="text-blue-900 mt-1 whitespace-pre-line">{expectations || 'Não informado'}</p>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">
                      Vendedor Responsável
                    </label>
                    <input
                      type="text"
                      value={salesPerson}
                      onChange={(e) => setSalesPerson(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nome do vendedor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">
                      Plano Contratado
                    </label>
                    <input
                      type="text"
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nome do plano"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Tipo de App iOS
                  </label>
                  <select
                    value={iosAppType}
                    onChange={(e) => setIosAppType(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="P">P - Passageiro</option>
                    <option value="P/M">P/M - Passageiro e Motorista</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Cidades Autorizadas
                  </label>
                  <textarea
                    value={authorizedCities}
                    onChange={(e) => setAuthorizedCities(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Digite as cidades autorizadas..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Observações do Cadastro
                  </label>
                  <textarea
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Observações gerais sobre o cadastro..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Expectativa do Cliente
                  </label>
                  <textarea
                    value={expectations}
                    onChange={(e) => setExpectations(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Expectativas e objetivos do cliente..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#e40033' }}
                    onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#c2002a')}
                    onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#e40033')}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Cezar será responsável pelas imagens?
            </label>
            <div className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={() => setCezarResponsibility('sim')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  cezarResponsibility === 'sim'
                    ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                }`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setCezarResponsibility('nao')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  cezarResponsibility === 'nao'
                    ? 'border-red-500 bg-red-50 text-red-700 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                }`}
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => setCezarResponsibility(null)}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  cezarResponsibility === null
                    ? 'border-gray-500 bg-gray-50 text-gray-700 font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Não Definido
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-6">
              Esta informação define se o Cezar será responsável pela criação das imagens do cliente.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anotações Internas do Administrador
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Digite aqui anotações adicionais, acompanhamentos e lembretes sobre este cliente..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Essas anotações são privadas e visíveis apenas para administradores.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
          {!isEditingCommercial && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#e40033' }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#c2002a')}
              onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#e40033')}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
