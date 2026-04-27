import { CheckCircle, Circle, Clock, AlertTriangle, Check } from 'lucide-react';
import { useState } from 'react';

interface ProjectStatusSectionProps {
  projectStatus: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewFeedback?: string;
  correctionsCompleted?: boolean;
  onMarkCorrectionsComplete?: () => Promise<void>;
}

type StatusStep = {
  id: string;
  label: string;
  description: string;
};

const statusSteps: StatusStep[] = [
  {
    id: 'pending',
    label: 'Pendente',
    description: 'Seu projeto foi iniciado e está aguardando o início dos trabalhos',
  },
  {
    id: 'development',
    label: 'Desenvolvimento',
    description: 'Estamos preparando as imagens e desenvolvendo seu aplicativo',
  },
  {
    id: 'panel_delivered',
    label: 'Painel Entregue',
    description: 'Painel administrativo foi entregue e está pronto para uso',
  },
  {
    id: 'testing_submission',
    label: 'Testes e Envio',
    description: 'Testando os aplicativos e enviando para Play Store e App Store',
  },
  {
    id: 'under_review',
    label: 'Em Análise',
    description: 'Aplicativos estão em análise pelas lojas (Play Store e App Store)',
  },
  {
    id: 'completed',
    label: 'Concluído',
    description: 'Projeto finalizado! Seus aplicativos estão publicados e disponíveis',
  },
];

export default function ProjectStatusSection({
  projectStatus,
  reviewStatus,
  reviewFeedback,
  correctionsCompleted,
  onMarkCorrectionsComplete
}: ProjectStatusSectionProps) {
  const [marking, setMarking] = useState(false);
  const currentStatusIndex = statusSteps.findIndex(step => step.id === projectStatus);

  const handleMarkComplete = async () => {
    if (!onMarkCorrectionsComplete) return;
    setMarking(true);
    try {
      await onMarkCorrectionsComplete();
    } finally {
      setMarking(false);
    }
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStatusIndex) return 'completed';
    if (stepIndex === currentStatusIndex) {
      if (projectStatus === 'completed') return 'completed';
      return 'current';
    }
    return 'pending';
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Status do Projeto</h2>
        <p className="text-gray-600 mt-2">
          Acompanhe o progresso do desenvolvimento do seu aplicativo em tempo real
        </p>
      </div>

      {reviewStatus === 'rejected' && reviewFeedback && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Formulário Precisa de Correções</h3>
              <p className="text-red-800 text-sm leading-relaxed whitespace-pre-wrap">
                {reviewFeedback}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <p className="text-red-700 text-xs font-medium flex-1">
                  Por favor, corrija os pontos mencionados acima e salve as alterações. Seu progresso será atualizado automaticamente.
                </p>
                {!correctionsCompleted && onMarkCorrectionsComplete && (
                  <button
                    onClick={handleMarkComplete}
                    disabled={marking}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    <Check className="w-4 h-4" />
                    {marking ? 'Notificando...' : 'Marcar como Feito'}
                  </button>
                )}
                {correctionsCompleted && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Correções concluídas
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewStatus === 'approved' && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-500 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 mb-1">Formulário Aprovado!</h3>
              <p className="text-green-800 text-sm leading-relaxed">
                Seu formulário foi revisado e aprovado. O desenvolvimento está em andamento!
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-400 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-amber-900 mb-1">Importante!</h3>
            <p className="text-amber-800 text-sm leading-relaxed">
              O desenvolvimento do seu aplicativo só será iniciado após o preenchimento completo de todos os requisitos (100%). Certifique-se de preencher todas as seções: Setup Inicial, Play Store, App Store e Termos de Uso.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {statusSteps.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === statusSteps.length - 1;

          return (
            <div key={step.id} className="relative">
              <div className={`flex items-start gap-4 p-4 rounded-lg transition-all ${
                status === 'current'
                  ? 'bg-blue-50 border-2 border-blue-500'
                  : status === 'completed'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex-shrink-0 mt-1">
                  {status === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : status === 'current' ? (
                    <Clock className="w-6 h-6 text-blue-600 animate-pulse" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className={`text-lg font-semibold ${
                      status === 'current'
                        ? 'text-blue-900'
                        : status === 'completed'
                        ? 'text-green-900'
                        : 'text-gray-500'
                    }`}>
                      {step.label}
                    </h3>
                    {status === 'current' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Em andamento
                      </span>
                    )}
                    {status === 'completed' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Concluído
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-sm ${
                    status === 'current'
                      ? 'text-blue-700'
                      : status === 'completed'
                      ? 'text-green-700'
                      : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </div>

              {!isLast && (
                <div className="ml-7 pl-0.5">
                  <div className={`w-0.5 h-2 ${
                    status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                  }`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Precisa de ajuda?
        </h3>
        <p className="text-blue-700 text-sm">
          Se você tiver alguma dúvida sobre o status do seu projeto ou precisar de informações adicionais,
          entre em contato conosco. Estamos aqui para ajudar!
        </p>
      </div>
    </div>
  );
}
