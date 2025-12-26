import { useState } from 'react';
import { supabase, logAdminAction } from '../lib/supabase';
import { CheckCircle, XCircle, X } from 'lucide-react';

type Props = {
  clientId: string;
  clientName: string;
  formId: string;
  currentStatus?: 'pending' | 'approved' | 'rejected';
  currentFeedback?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ReviewFormModal({
  clientId,
  clientName,
  formId,
  currentStatus = 'pending',
  currentFeedback = '',
  onClose,
  onSuccess,
}: Props) {
  const [feedback, setFeedback] = useState(currentFeedback);
  const [loading, setLoading] = useState(false);

  const calculateProgress = async (formData: any) => {
    const fields = [
      'driver_app_name',
      'passenger_app_name',
      'support_email',
      'playstore_driver_short_description',
      'playstore_driver_long_description',
      'playstore_passenger_short_description',
      'playstore_passenger_long_description',
      'appstore_driver_description',
      'appstore_passenger_description',
      'driver_terms',
      'passenger_terms',
    ];

    let filled = fields.filter((field) => {
      const value = formData[field];
      return value && String(value).trim().length > 0;
    }).length;

    if (formData.image_source === 'tilary') {
      filled += 1;
    } else if (formData.image_source === 'custom') {
      const { data: images } = await supabase
        .from('form_images')
        .select('image_type, app_type, store_type')
        .eq('form_id', formData.id);

      const requiredImages = {
        driver_playstore_logo_1024: false,
        driver_playstore_logo_352: false,
        driver_appstore_logo_1024: false,
        driver_appstore_logo_352: false,
        passenger_playstore_logo_1024: false,
        passenger_playstore_logo_352: false,
        passenger_appstore_logo_1024: false,
        passenger_appstore_logo_352: false,
        driver_playstore_feature: false,
        driver_appstore_feature: false,
        passenger_playstore_feature: false,
        passenger_appstore_feature: false,
      };

      if (images && images.length > 0) {
        images.forEach((img) => {
          const key = `${img.app_type}_${img.store_type}_${img.image_type}`;
          if (key in requiredImages) {
            requiredImages[key as keyof typeof requiredImages] = true;
          }
        });
      }

      const allImagesUploaded = Object.values(requiredImages).every((uploaded) => uploaded);

      if (allImagesUploaded) {
        filled += 1;
      }
    }

    const total = fields.length + 1;
    return Math.round((filled / total) * 100);
  };

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !feedback.trim()) {
      alert('Por favor, informe o que precisa ser corrigido');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Usuário não autenticado');

      const { data: formData } = await supabase
        .from('app_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (!formData) throw new Error('Formulário não encontrado');

      const progress = await calculateProgress(formData);

      let finalProgress = progress;
      let formStatus = formData.status;

      if (status === 'approved') {
        if (progress >= 95) {
          finalProgress = 100;
          formStatus = 'completed';
        }
      }

      await supabase
        .from('app_forms')
        .update({
          review_status: status,
          review_feedback: feedback.trim() || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          progress_percentage: finalProgress,
          status: formStatus,
          corrections_completed: false,
          admin_notified_of_changes: false,
        })
        .eq('id', formId);

      if (status === 'rejected') {
        await supabase.from('notifications').insert({
          client_id: clientId,
          type: 'form_updated',
          message: `Seu formulário precisa de correções. Verifique a seção Status do Projeto.`,
        });
      } else {
        await supabase.from('notifications').insert({
          client_id: clientId,
          type: 'form_completed',
          message: `Seu formulário foi aprovado! 🎉`,
        });
      }

      await logAdminAction(
        `form_review_${status}`,
        `${status === 'approved' ? 'Aprovou' : 'Rejeitou'} o formulário de ${clientName}`,
        'form',
        formId,
        clientName,
        { review_status: status, feedback: feedback.trim() || null }
      );

      onSuccess();
    } catch (error) {
      console.error('Error reviewing form:', error);
      alert('Erro ao revisar formulário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Revisar Formulário</h3>
            <p className="text-sm text-gray-600 mt-1">Cliente: {clientName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {currentStatus !== 'pending' && (
            <div className={`p-4 rounded-lg border ${
              currentStatus === 'approved'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <p className="text-sm font-medium">
                Status atual: {currentStatus === 'approved' ? 'Aprovado' : 'Rejeitado'}
              </p>
              {currentFeedback && (
                <p className="text-sm mt-1 text-gray-700">
                  Feedback anterior: {currentFeedback}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feedback / O que precisa ser corrigido *
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
              placeholder="Descreva o que precisa ser corrigido ou aprovado..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Este feedback será mostrado ao cliente na seção Status do Projeto
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Ao rejeitar o formulário, o cliente receberá uma notificação
              e poderá ver seu feedback na seção Status do Projeto.
            </p>
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleReview('rejected')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XCircle className="w-4 h-4" />
            {loading ? 'Processando...' : 'Rejeitar'}
          </button>
          <button
            onClick={() => handleReview('approved')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            {loading ? 'Processando...' : 'Aprovar'}
          </button>
        </div>
      </div>
    </div>
  );
}
