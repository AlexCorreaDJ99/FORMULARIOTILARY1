import { CheckCircle, Circle, Clock } from 'lucide-react';

interface ProjectStatusSectionProps {
  projectStatus: string;
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
    description: 'Projeto foi iniciado e aguardando início dos trabalhos',
  },
  {
    id: 'preparing_images',
    label: 'Preparando Imagens',
    description: 'Equipe está preparando e otimizando todas as imagens necessárias',
  },
  {
    id: 'configuring_firebase',
    label: 'Configurando Firebase',
    description: 'Configuração do Firebase e integração com os serviços',
  },
  {
    id: 'admin_panel_delivered',
    label: 'Painel Admin Entregue',
    description: 'Painel administrativo foi entregue e está pronto para uso',
  },
  {
    id: 'testing_app',
    label: 'Testando App',
    description: 'Aplicativos estão sendo testados para garantir qualidade',
  },
  {
    id: 'submitted_playstore',
    label: 'Enviado para Play Store',
    description: 'Aplicativo Android foi submetido à Play Store',
  },
  {
    id: 'submitted_appstore',
    label: 'Enviado para App Store',
    description: 'Aplicativo iOS foi submetido à App Store',
  },
  {
    id: 'completed',
    label: 'Completo',
    description: 'Projeto finalizado e aplicativos publicados nas lojas',
  },
];

export default function ProjectStatusSection({ projectStatus }: ProjectStatusSectionProps) {
  const currentStatusIndex = statusSteps.findIndex(step => step.id === projectStatus);

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStatusIndex) return 'completed';
    if (stepIndex === currentStatusIndex) return 'current';
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
