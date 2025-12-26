import JSZip from 'jszip';
import { AppForm } from './supabase';

type FormImage = {
  id: string;
  form_id: string;
  image_type: 'logo_1024' | 'logo_352' | 'feature' | 'banner_1024';
  app_type: 'driver' | 'passenger';
  store_type: 'playstore' | 'appstore' | 'both';
  file_url: string;
  file_name: string;
  dimensions: string;
  size_bytes: number;
  uploaded_at: string;
};

type Client = {
  name: string;
  email: string;
  access_code: string;
};

export async function downloadFormDataAsZip(
  client: Client,
  form: AppForm,
  images: FormImage[]
) {
  const zip = new JSZip();

  const formDataText = `
===========================================
DADOS DO CLIENTE
===========================================

Nome: ${client.name}
Email: ${client.email}
Código de Acesso: ${client.access_code}

===========================================
CONFIGURAÇÃO DOS APPS
===========================================

Nome do App Motorista: ${form.driver_app_name || 'Não preenchido'}
Nome do App Passageiro: ${form.passenger_app_name || 'Não preenchido'}
Email de Suporte: ${form.support_email || 'Não preenchido'}

===========================================
PLAY STORE - APP MOTORISTA
===========================================

Descrição Curta:
${form.playstore_driver_short_description || 'Não preenchido'}

Descrição Longa:
${form.playstore_driver_long_description || 'Não preenchido'}

===========================================
PLAY STORE - APP PASSAGEIRO
===========================================

Descrição Curta:
${form.playstore_passenger_short_description || 'Não preenchido'}

Descrição Longa:
${form.playstore_passenger_long_description || 'Não preenchido'}

===========================================
APP STORE - APP MOTORISTA
===========================================

Descrição:
${form.appstore_driver_description || 'Não preenchido'}

===========================================
APP STORE - APP PASSAGEIRO
===========================================

Descrição:
${form.appstore_passenger_description || 'Não preenchido'}

===========================================
TERMOS DE USO
===========================================

Termos de Uso da Empresa:
${form.company_terms || 'Não preenchido'}

Termos de Uso - App Motorista:
${form.driver_terms || 'Não preenchido'}

Termos de Uso - App Passageiro:
${form.passenger_terms || 'Não preenchido'}

===========================================
INFORMAÇÕES DE PUBLICAÇÃO
===========================================

Titular da Conta Play Store: ${form.playstore_owner_name || 'Não preenchido'}
Email da Conta Play Store: ${form.playstore_owner_email || 'Não preenchido'}

Titular da Conta App Store: ${form.appstore_owner_name || 'Não preenchido'}
Email da Conta App Store: ${form.appstore_owner_email || 'Não preenchido'}

===========================================
IMAGENS
===========================================

Origem das Imagens de Funcionalidades: ${form.image_source === 'tilary' ? 'Imagens Padrão da Tilary' : 'Imagens Personalizadas do Cliente'}

${form.image_source === 'tilary' ?
`NOTA: O cliente optou por usar as imagens padrão da Tilary para screenshots e banners.
Estas imagens não estão incluídas neste ZIP pois serão fornecidas pela equipe Tilary.` :
`NOTA: O cliente fará upload de suas próprias imagens personalizadas.
${form.images_uploaded ? 'As imagens personalizadas estão incluídas neste ZIP.' : 'ATENÇÃO: O cliente ainda não enviou todas as imagens personalizadas.'}`
}

===========================================
PROGRESSO
===========================================

Status: ${form.status}
Progresso: ${form.progress_percentage}%
Criado em: ${new Date(form.created_at).toLocaleString('pt-BR')}
Última atualização: ${new Date(form.updated_at).toLocaleString('pt-BR')}
`;

  zip.file('dados_formulario.txt', formDataText);

  const imagesByCategory: Record<string, FormImage[]> = {};
  images.forEach((img) => {
    const key = `${img.app_type}_${img.store_type}_${img.image_type}`;
    if (!imagesByCategory[key]) {
      imagesByCategory[key] = [];
    }
    imagesByCategory[key].push(img);
  });

  for (const [category, categoryImages] of Object.entries(imagesByCategory)) {
    const [appType, storeType, imageType] = category.split('_');
    const folderName = `imagens/${appType}/${storeType}/${imageType}`;

    for (const img of categoryImages) {
      try {
        const response = await fetch(img.file_url);
        const blob = await response.blob();
        zip.file(`${folderName}/${img.file_name}`, blob);
      } catch (error) {
        console.error(`Error downloading image ${img.file_name}:`, error);
      }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${client.name.replace(/\s+/g, '_')}_formulario.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
