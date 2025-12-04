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

        <div className="p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anotações Internas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Digite aqui suas observações, anotações e lembretes sobre este cliente..."
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
