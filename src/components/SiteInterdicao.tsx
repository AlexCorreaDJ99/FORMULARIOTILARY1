import { AlertTriangle, ExternalLink, Lock } from 'lucide-react';

const NEW_URL = 'http://formulario.tilary.com.br/';

export default function SiteInterdicao() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-red-600 px-6 py-8 sm:px-10 sm:py-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full mb-5">
              <AlertTriangle className="w-9 h-9 sm:w-11 sm:h-11 text-white" strokeWidth={2.2} />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight mb-3">
              SITE INTERDITADO
            </h1>
            <p className="text-red-100 text-sm sm:text-base font-medium">
              Este endereço não está mais disponível
            </p>
          </div>

          <div className="px-6 py-8 sm:px-10 sm:py-10 text-center">
            <p className="text-gray-800 text-base sm:text-lg leading-relaxed mb-2">
              O acesso ao sistema foi movido para um novo endereço.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              A partir de agora, utilize o link abaixo para acessar o formulário.
            </p>

            <a
              href={NEW_URL}
              className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
            >
              <ExternalLink className="w-5 h-5" />
              formulario.tilary.com.br
            </a>

            <div className="mt-8 flex items-center justify-center gap-2 text-gray-400 text-xs">
              <Lock className="w-3.5 h-3.5" />
              <span>Todas as funcionalidades desta página estão bloqueadas</span>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Atualize seus favoritos para o novo endereço.
        </p>
      </div>
    </div>
  );
}
