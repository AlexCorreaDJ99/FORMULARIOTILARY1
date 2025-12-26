import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw } from 'lucide-react';

export default function RecalculateProgressButton() {
  const [loading, setLoading] = useState(false);

  const calculateProgress = async (formData: any, images: any[]) => {
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
          .select('image_type, app_type, store_type')
          .eq('form_id', form.id);

        const progress = await calculateProgress(form, images || []);

        let status = form.status;
        if (progress === 100) {
          status = 'completed';
        } else if (progress > 0) {
          status = 'in_progress';
        }

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
          images.forEach((img: any) => {
            const key = `${img.app_type}_${img.store_type}_${img.image_type}`;
            if (key in requiredImages) {
              requiredImages[key as keyof typeof requiredImages] = true;
            }
          });
        }

        const allImagesUploaded = Object.values(requiredImages).every((uploaded) => uploaded);

        await supabase
          .from('app_forms')
          .update({
            progress_percentage: progress,
            status,
            images_uploaded: allImagesUploaded,
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
