import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw } from 'lucide-react';

export default function RecalculateProgressButton() {
  const [loading, setLoading] = useState(false);

  const calculateProgress = (formData: any) => {
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
    } else if (formData.image_source === 'custom' && formData.images_uploaded) {
      filled += 1;
    }

    const total = fields.length + 1;
    return Math.round((filled / total) * 100);
  };

  const handleRecalculate = async () => {
    if (!confirm('Deseja recalcular o progresso de todos os formulários? Isso pode levar alguns segundos.')) {
      return;
    }

    setLoading(true);
    try {
      const { data: forms, error } = await supabase
        .from('app_forms')
        .select('*');

      if (error) throw error;

      if (!forms) {
        alert('Nenhum formulário encontrado');
        return;
      }

      let updated = 0;
      for (const form of forms) {
        const { data: images } = await supabase
          .from('form_images')
          .select('id')
          .eq('form_id', form.id);

        const hasImages = images && images.length > 0;

        await supabase
          .from('app_forms')
          .update({
            images_uploaded: hasImages,
          })
          .eq('id', form.id);

        const updatedFormData = { ...form, images_uploaded: hasImages };
        const progress = calculateProgress(updatedFormData);

        let status = form.status;
        if (progress === 100) {
          status = 'completed';
        } else if (progress > 0) {
          status = 'in_progress';
        }

        await supabase
          .from('app_forms')
          .update({
            progress_percentage: progress,
            status,
          })
          .eq('id', form.id);

        updated++;
      }

      alert(`Progresso recalculado com sucesso! ${updated} formulários atualizados.`);
      window.location.reload();
    } catch (error) {
      console.error('Error recalculating progress:', error);
      alert('Erro ao recalcular progresso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRecalculate}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Recalcular progresso de todos os formulários"
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Recalculando...' : 'Recalcular Progresso'}
    </button>
  );
}
