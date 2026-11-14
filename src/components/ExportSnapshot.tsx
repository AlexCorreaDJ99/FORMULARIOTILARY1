import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Download, ArrowLeft, AlertTriangle, Loader2, Database, CheckCircle } from 'lucide-react';

type SnapshotResponse = {
  exported_at: string;
  exported_by: string;
  tables: string[];
  counts: Record<string, number>;
  errors: Record<string, string> | null;
  data: Record<string, unknown[]>;
};

export default function ExportSnapshot() {
  const { signOut, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SnapshotResponse | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-snapshot`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Erro ao exportar snapshot');
      }

      setResult(json);
    } catch (err) {
      console.error('Error exporting snapshot:', err);
      setError(err instanceof Error ? err.message : 'Erro ao exportar snapshot');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const blob = new Blob([JSON.stringify(result.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supabase_snapshot_completo.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.assign('/')}
              className="text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1.5 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Exportar Snapshot
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:block">
              {profile?.name}
            </span>
            <button
              onClick={signOut}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Ferramenta temporária</p>
            <p>
              Esta página exporta todos os dados do banco (ignorando filtros de permissão)
              usando privilégios administrativos. Use uma vez e depois remova a rota.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Snapshot completo do banco
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Exporta todos os registros das tabelas: profiles, clients, app_forms,
            form_images, notifications, client_notifications, admin_activity_logs e
            admin_notifications — em um único JSON consistente.
          </p>

          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                Gerar Snapshot
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium text-sm">
                  Snapshot gerado em {new Date(result.exported_at).toLocaleString('pt-BR')}
                </span>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700">Tabela</th>
                      <th className="text-right px-4 py-2 font-semibold text-gray-700">Registros</th>
                      <th className="text-center px-4 py-2 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.tables.map((table) => (
                      <tr key={table} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-gray-800">{table}</td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {result.counts[table] ?? 0}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {result.errors?.[table] ? (
                            <span className="text-red-600 text-xs">{result.errors[table]}</span>
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td className="px-4 py-2 font-semibold text-gray-700">Total</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-700">
                        {Object.values(result.counts).reduce((a, b) => a + b, 0)}
                      </td>
                      <td className="px-4 py-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                <Download className="w-5 h-5" />
                Baixar supabase_snapshot_completo.json
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
