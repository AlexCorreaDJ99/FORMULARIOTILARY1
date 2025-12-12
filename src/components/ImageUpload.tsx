import { useState, useEffect } from 'react';
import { supabase, FormImage, AppForm } from '../lib/supabase';
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon, Info } from 'lucide-react';

type Props = {
  formId: string;
  label: string;
  imageType: 'logo_1024' | 'logo_352' | 'feature' | 'banner_1024';
  appType: 'driver' | 'passenger';
  storeType: 'playstore' | 'appstore' | 'both';
  requiredDimensions: { width: number; height: number };
  requiredFormat: 'png' | 'jpeg';
  transparent?: boolean;
  multiple?: boolean;
  minImages?: number;
  maxImages?: number;
  imageSource?: 'tilary' | 'custom';
  onImageSourceChange?: (source: 'tilary' | 'custom') => Promise<void>;
};

export default function ImageUpload({
  formId,
  label,
  imageType,
  appType,
  storeType,
  requiredDimensions,
  requiredFormat,
  transparent = false,
  multiple = false,
  minImages = 1,
  maxImages = 1,
  imageSource = 'custom',
  onImageSourceChange,
}: Props) {
  const [images, setImages] = useState<FormImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [localImageSource, setLocalImageSource] = useState<'tilary' | 'custom'>(imageSource);
  const [showTilaryConfirmation, setShowTilaryConfirmation] = useState(false);
  const [tilaryConfirmed, setTilaryConfirmed] = useState(false);

  useEffect(() => {
    loadImages();
  }, [formId, imageType, appType, storeType]);

  useEffect(() => {
    setLocalImageSource(imageSource);
    if (imageSource === 'tilary') {
      setShowTilaryConfirmation(false);
      setTilaryConfirmed(false);
    }
  }, [imageSource]);

  const handleImageSourceClick = (source: 'tilary' | 'custom') => {
    if (source === 'tilary' && localImageSource !== 'tilary') {
      setShowTilaryConfirmation(true);
      setTilaryConfirmed(false);
    } else if (source === 'custom') {
      setShowTilaryConfirmation(false);
      setTilaryConfirmed(false);
      handleImageSourceChange('custom');
    }
  };

  const handleConfirmTilaryImages = async () => {
    if (!tilaryConfirmed) {
      setError('Você precisa marcar a confirmação para continuar');
      return;
    }

    setShowTilaryConfirmation(false);
    await handleImageSourceChange('tilary');
  };

  const handleCancelTilaryImages = () => {
    setShowTilaryConfirmation(false);
    setTilaryConfirmed(false);
  };

  const handleImageSourceChange = async (source: 'tilary' | 'custom') => {
    if (onImageSourceChange) {
      await onImageSourceChange(source);
    }
    setLocalImageSource(source);
    setError('');
  };

  const hasTilaryImages = () => {
    return (storeType === 'playstore' && (imageType === 'feature' || imageType === 'banner_1024')) || storeType === 'appstore';
  };

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('form_images')
        .select('*')
        .eq('form_id', formId)
        .eq('image_type', imageType)
        .eq('app_type', appType)
        .eq('store_type', storeType);

      if (error) throw error;
      setImages(data || []);
    } catch (err) {
      console.error('Error loading images:', err);
    }
  };

  const validateImage = (file: File): Promise<{ valid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const validTypes = requiredFormat === 'png' ? ['image/png'] : ['image/jpeg', 'image/jpg'];

      if (!validTypes.includes(file.type)) {
        resolve({
          valid: false,
          error: `Formato inválido. Use ${requiredFormat.toUpperCase()}`,
        });
        return;
      }

      const img = new window.Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        if (img.width !== requiredDimensions.width || img.height !== requiredDimensions.height) {
          resolve({
            valid: false,
            error: `Dimensões incorretas. Esperado: ${requiredDimensions.width}x${requiredDimensions.height}, Recebido: ${img.width}x${img.height}`,
          });
          return;
        }

        resolve({ valid: true });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ valid: false, error: 'Erro ao carregar imagem' });
      };

      img.src = url;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!multiple && files.length > 1) {
      setError('Selecione apenas uma imagem');
      return;
    }

    if (multiple && images.length + files.length > maxImages) {
      setError(`Máximo de ${maxImages} imagens permitido`);
      return;
    }

    setError('');
    setUploading(true);

    try {
      for (const file of files) {
        const validation = await validateImage(file);

        if (!validation.valid) {
          setError(validation.error || 'Imagem inválida');
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${formId}/${imageType}_${appType}_${storeType}_${Date.now()}.${fileExt}`;
        const filePath = `form-images/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('app-submissions')
          .upload(filePath, file, {
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('app-submissions')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase.from('form_images').insert({
          form_id: formId,
          image_type: imageType,
          app_type: appType,
          store_type: storeType,
          file_url: publicUrl,
          file_name: file.name,
          dimensions: `${requiredDimensions.width}x${requiredDimensions.height}`,
          size_bytes: file.size,
        });

        if (dbError) throw dbError;
      }

      await loadImages();
    } catch (err) {
      console.error('Error uploading:', err);
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (imageId: string, fileUrl: string) => {
    if (!confirm('Deseja excluir esta imagem?')) return;

    try {
      const filePath = fileUrl.split('/').slice(-2).join('/');

      await supabase.storage.from('app-submissions').remove([`form-images/${filePath}`]);

      const { error } = await supabase.from('form_images').delete().eq('id', imageId);

      if (error) throw error;
      await loadImages();
    } catch (err) {
      console.error('Error deleting image:', err);
      setError('Erro ao excluir imagem');
    }
  };

  const canUploadMore = multiple ? images.length < maxImages : images.length === 0;
  const imageCount = images.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {multiple && (
          <span className="text-xs text-gray-500">
            {imageCount}/{maxImages} imagens
            {minImages > 0 && ` (mínimo ${minImages})`}
          </span>
        )}
      </div>

      {hasTilaryImages() && onImageSourceChange && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Info className="w-4 h-4" />
            <span>Escolha a origem das imagens:</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleImageSourceClick('tilary')}
              disabled={showTilaryConfirmation}
              className={`p-3 border-2 rounded-lg transition-all ${
                localImageSource === 'tilary'
                  ? 'border-red-500 bg-red-50'
                  : showTilaryConfirmation
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-red-300 bg-white'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="w-6 h-6" style={{ color: localImageSource === 'tilary' || showTilaryConfirmation ? '#e40033' : '#9ca3af' }} />
                <span className="text-sm font-medium">Imagens da Tilary</span>
                <span className="text-xs text-gray-500">Use nossas imagens padrão</span>
              </div>
            </button>

            <button
              onClick={() => handleImageSourceClick('custom')}
              disabled={showTilaryConfirmation}
              className={`p-3 border-2 rounded-lg transition-all ${
                localImageSource === 'custom'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 hover:border-red-300 bg-white'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6" style={{ color: localImageSource === 'custom' ? '#e40033' : '#9ca3af' }} />
                <span className="text-sm font-medium">Minhas Imagens</span>
                <span className="text-xs text-gray-500">Faça upload personalizado</span>
              </div>
            </button>
          </div>

          {showTilaryConfirmation && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium mb-2">
                    Confirmar uso de Imagens Padrão da Tilary
                  </p>
                  <p className="text-xs text-blue-800 mb-3">
                    Você pode visualizar exemplos das imagens que serão utilizadas:
                  </p>
                  <a
                    href="https://drive.google.com/drive/folders/1YkpUrF1SUKaR6fFhvmjnTkLuFMiU6Wur?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm mb-3"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Visualizar Exemplos no Google Drive
                  </a>

                  <div className="border-t border-blue-200 pt-3 mt-3">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={tilaryConfirmed}
                        onChange={(e) => setTilaryConfirmed(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-blue-900 group-hover:text-blue-700">
                        Confirmo que desejo usar as imagens padrão da Tilary para este tipo de conteúdo. Esta escolha será contabilizada no progresso do formulário.
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleConfirmTilaryImages}
                      className="flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium"
                      style={{ backgroundColor: '#e40033' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c2002a'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e40033'}
                    >
                      Confirmar Escolha
                    </button>
                    <button
                      onClick={handleCancelTilaryImages}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {localImageSource === 'tilary' && !showTilaryConfirmation && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-green-900 font-medium mb-2">
                    Imagens padrão da Tilary selecionadas
                  </p>
                  <p className="text-xs text-green-800 mb-3">
                    Usaremos nossas imagens padrão para este tipo de conteúdo. Você pode visualizar exemplos das imagens que serão utilizadas:
                  </p>
                  <a
                    href="https://drive.google.com/drive/folders/1YkpUrF1SUKaR6fFhvmjnTkLuFMiU6Wur?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Visualizar Exemplos no Google Drive
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {localImageSource === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          {images.map((image) => (
          <div key={image.id} className="relative group border-2 border-green-200 rounded-lg overflow-hidden bg-green-50">
            <img
              src={image.file_url}
              alt={image.file_name}
              className="w-full h-32 object-cover"
            />
            <div className="absolute top-2 right-2 flex gap-1">
              <div className="bg-green-600 text-white p-1 rounded-full">
                <CheckCircle className="w-4 h-4" />
              </div>
              <button
                onClick={() => handleDelete(image.id, image.file_url)}
                className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="truncate">{image.file_name}</p>
              <p className="text-gray-300">{image.dimensions}</p>
            </div>
          </div>
        ))}

        {canUploadMore && (
          <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all h-32">
            <input
              type="file"
              accept={requiredFormat === 'png' ? 'image/png' : 'image/jpeg,image/jpg'}
              onChange={handleFileSelect}
              className="hidden"
              multiple={multiple}
              disabled={uploading}
            />
            {uploading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <span className="text-sm text-gray-600">Enviando...</span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600 text-center">
                  {multiple ? 'Adicionar imagens' : 'Adicionar imagem'}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  {requiredDimensions.width}x{requiredDimensions.height}
                </span>
              </>
            )}
          </label>
        )}
        </div>
      )}

      {localImageSource === 'custom' && (
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Dimensões: {requiredDimensions.width}x{requiredDimensions.height} pixels</p>
          <p>• Formato: {requiredFormat.toUpperCase()}</p>
          {transparent && <p></p>}
        </div>
      )}
    </div>
  );
}
