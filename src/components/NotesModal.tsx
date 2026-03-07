import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase, Client } from '../lib/supabase';

type NotesModalProps = {
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
};

export default function NotesModal({ client, onClose, onSuccess }: NotesModalProps) {
  const [notes, setNotes] = useState(client.admin_notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ admin_notes: notes })
        .eq('id', client.id);

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Erro ao salvar anotações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
        <div className="flex justify-between items-center px-6 py-4 border-b">
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

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-blue-900">Informações Comerciais</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Vendedor Responsável:</span>
                <p className="text-blue-900 mt-1">{client.sales_person || 'Não informado'}</p>
              </div>

              <div>
                <span className="font-medium text-blue-800">Plano Contratado:</span>
                <p className="text-blue-900 mt-1">{client.plan || 'Não informado'}</p>
              </div>

              <div>
                <span className="font-medium text-blue-800">Tipo de App iOS:</span>
                <p className="text-blue-900 mt-1">
                  {client.ios_app_type === 'P' && 'P - Passageiro'}
                  {client.ios_app_type === 'P/M' && 'P/M - Passageiro e Motorista'}
                  {!client.ios_app_type && 'Não informado'}
                </p>
              </div>
            </div>

            <div>
              <span className="font-medium text-blue-800">Cidades Autorizadas:</span>
              <p className="text-blue-900 mt-1 whitespace-pre-line">{client.authorized_cities || 'Não informado'}</p>
            </div>

            <div>
              <span className="font-medium text-blue-800">Observações do Cadastro:</span>
              <p className="text-blue-900 mt-1 whitespace-pre-line">{client.notes || 'Não informado'}</p>
            </div>

            <div>
              <span className="font-medium text-blue-800">Expectativa:</span>
              <p className="text-blue-900 mt-1 whitespace-pre-line">{client.expectations || 'Não informado'}</p>
            </div>
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

        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
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
        </div>
      </div>
    </div>
  );
}
