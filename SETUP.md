# Sistema de Gestão de Formulários - Guia de Configuração

## 🎯 Visão Geral

Sistema completo para gerenciar formulários de submissão de aplicativos para Play Store e App Store, com painel administrativo e área do cliente.

## ✨ Funcionalidades Implementadas

### Painel do Administrador
- ✅ Criar novos clientes com código de acesso único
- ✅ Visualizar progresso de preenchimento dos formulários
- ✅ Acompanhar status: "Não iniciado", "Em andamento", "Concluído"
- ✅ Visualizar todos os dados preenchidos pelos clientes
- ✅ Reativar ou excluir clientes
- ✅ Dashboard com tabela organizada

### Painel do Cliente
- ✅ Login com email e código de acesso
- ✅ Formulário dividido em seções
- ✅ Barra de progresso em tempo real
- ✅ Auto-save a cada 2 segundos
- ✅ Validação automática de imagens

### Formulário Completo
**Setup Inicial:**
- Nome dos apps (Motorista e Passageiro)
- Email de suporte
- Descrição curta (80 caracteres)
- Descrição longa (4000 caracteres)

**Play Store:**
- Descrições específicas
- Logos 1024x1024 e 352x68 (PNG transparente)
- Screenshots 1243x2486 (4-8 imagens, JPEG)
- Banner 1024x500 (JPEG)

**App Store:**
- Descrição do app
- Screenshots 1242x2688 - 6.5" (4-8 imagens, JPEG)
- Screenshots 1320x2868 - 6.9" (4 imagens, JPEG)

**Termos de Uso:**
- Termos para App Motorista
- Termos para App Passageiro

### Validações de Imagens
- ✅ Validação automática de dimensões
- ✅ Validação de formato (PNG/JPEG)
- ✅ Validação de quantidade de imagens
- ✅ Mensagens de erro detalhadas
- ✅ Preview das imagens enviadas
- ✅ Remoção de imagens

## 🚀 Como Usar

### 1. Login de Administrador

O administrador principal já está criado e pronto para usar:

**Credenciais de Admin:**
- Email: alexcorreagomess@hotmail.com
- Senha: dj99310321

### 2. Fazer Login como Admin

1. Acesse o sistema
2. Clique em "Administrador"
3. Email: alexcorreagomess@hotmail.com
4. Senha: dj99310321

### 3. Criar Mais Administradores (Opcional)

Se precisar criar mais administradores, execute no Supabase SQL Editor:

```sql
-- Primeiro crie o usuário no Supabase Dashboard > Authentication > Users
-- Depois execute este SQL substituindo os valores:

INSERT INTO profiles (id, email, name, role)
VALUES
  ('UUID_DO_USUARIO_CRIADO', 'email@exemplo.com', 'Nome do Admin', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

### 4. Criar Clientes

No painel do admin:
1. Clique em "Novo Cliente"
2. Preencha nome e email
3. Um código de acesso será gerado automaticamente
4. Anote o código gerado

### 5. Cliente Acessa o Formulário

1. Acesse o sistema
2. Clique em "Cliente"
3. Digite o email cadastrado
4. Digite o código de acesso fornecido
5. Preencha o formulário em cada seção

### 6. Acompanhamento

O admin pode:
- Ver progresso em tempo real
- Visualizar dados preenchidos
- Ver imagens enviadas
- Reativar ou desativar clientes

## 📋 Estrutura do Banco de Dados

- **profiles**: Usuários do sistema (admin/cliente)
- **clients**: Informações dos clientes e códigos de acesso
- **app_forms**: Dados dos formulários
- **form_images**: Imagens enviadas (logos, screenshots, banners)
- **storage.app-submissions**: Bucket para armazenar as imagens

## 🎨 Características da UI

- Design responsivo e moderno
- Cores neutras e profissionais (azul e cinza)
- Auto-save automático
- Indicadores de progresso visuais
- Validação em tempo real
- Feedback claro para usuários
- Interface intuitiva e limpa

## 🔒 Segurança

- Row Level Security (RLS) em todas as tabelas
- Admins podem gerenciar tudo
- Clientes só acessam seus próprios dados
- Autenticação via Supabase Auth
- Storage com políticas apropriadas

## 🛠️ Tecnologias Usadas

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth
- **Icons**: Lucide React

## 📝 Próximos Passos Sugeridos (Opcionais)

1. **Notificações por Email**
   - Enviar email com código ao criar cliente
   - Notificar admin quando formulário for concluído

2. **Exportação**
   - Exportar formulário completo em PDF
   - Baixar todas as imagens em ZIP

3. **Histórico de Mudanças**
   - Log de alterações no formulário
   - Auditoria de ações do admin

4. **Preview de Lojas**
   - Visualizar como ficará nas lojas
   - Simular aparência final

5. **Múltiplos Admins**
   - Sistema de permissões
   - Diferentes níveis de acesso

## 🐛 Solução de Problemas

**Erro ao criar cliente:**
- Verifique se você está logado como admin
- Confirme que o email não está duplicado

**Erro ao fazer upload:**
- Verifique as dimensões da imagem
- Confirme o formato (PNG ou JPEG)
- Verifique o tamanho do arquivo

**Cliente não consegue logar:**
- Confirme o email correto
- Verifique se o código foi digitado corretamente
- Certifique-se que o cliente está ativo

## 📧 Suporte

Para dúvidas ou problemas, verifique:
1. Logs do navegador (Console)
2. Logs do Supabase
3. Políticas RLS
4. Configurações de storage
