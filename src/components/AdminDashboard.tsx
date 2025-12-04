import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Client, AppForm } from '../lib/supabase';
import { Plus, LogOut, Users, Eye, Trash2, RefreshCw, Download, UserPlus, Shield, Key, Calendar, X, Check, CheckCircle, FileText, Mail } from 'lucide-react';
import CreateClientModal from './CreateClientModal';
import CreateAdminModal from './CreateAdminModal';
import EditAdminPasswordModal from './EditAdminPasswordModal';
import EditAdminEmailModal from './EditAdminEmailModal';
import NotificationBell from './NotificationBell';
import NotesModal from './NotesModal';

type ClientWithForm = Client & {
  form?: AppForm;
};

type AdminProfile = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export default function AdminDashboard() {
  const { signOut, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'clients' | 'admins'>('clients');
  const [clients, setClients] = useState<ClientWithForm[]>([]);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithForm | null>(null);
  const [editPasswordAdmin, setEditPasswordAdmin] = useState<AdminProfile | null>(null);
  const [editEmailAdmin, setEditEmailAdmin] = useState<AdminProfile | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<string | null>(null);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [notesClient, setNotesClient] = useState<ClientWithForm | null>(null);

  useEffect(() => {
    loadClients();
    loadAdmins();
  }, []);

  const loadClients = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      const clientsWithForms = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { data: formData } = await supabase
            .from('app_forms')
            .select('*')
            .eq('client_id', client.id)
            .maybeSingle();

          return {
            ...client,
            form: formData || undefined,
          };
        })
      );

      setClients(clientsWithForms);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, created_at')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error loading admins:', error);
    }
  };

  const handleToggleStatus = async (clientId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('clients')
        .update({ status: newStatus })
        .eq('id', clientId);

      if (error) throw error;
      loadClients();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleUpdateProjectStatus = async (formId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('app_forms')
        .update({ project_status: newStatus })
        .eq('id', formId);

      if (error) throw error;
      loadClients();
    } catch (error) {
      console.error('Error updating project status:', error);
    }
  };

  const handleStartEditMeeting = (formId: string, currentDate?: string, currentTime?: string) => {
    setEditingMeeting(formId);
    setMeetingDate(currentDate || '');
    setMeetingTime(currentTime || '');
  };

  const handleCancelEditMeeting = () => {
    setEditingMeeting(null);
    setMeetingDate('');
    setMeetingTime('');
  };

  const handleSaveMeeting = async (formId: string) => {
    if (!meetingDate || !meetingTime) {
      alert('Por favor, preencha data e horário da reunião');
      return;
    }

    try {
      const { error } = await supabase
        .from('app_forms')
        .update({
          meeting_scheduled: true,
          meeting_date: meetingDate,
          meeting_time: meetingTime
        })
        .eq('id', formId);

      if (error) throw error;
      handleCancelEditMeeting();
      loadClients();
    } catch (error) {
      console.error('Error saving meeting:', error);
      alert('Erro ao salvar reunião');
    }
  };

  const handleRemoveMeeting = async (formId: string) => {
    if (!confirm('Deseja remover esta reunião?')) return;

    try {
      const { error } = await supabase
        .from('app_forms')
        .update({
          meeting_scheduled: false,
          meeting_date: null,
          meeting_time: null
        })
        .eq('id', formId);

      if (error) throw error;
      loadClients();
    } catch (error) {
      console.error('Error removing meeting:', error);
      alert('Erro ao remover reunião');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente? Todos os dados e arquivos relacionados serão removidos permanentemente.')) return;

    try {
      const { data: formData } = await supabase
        .from('app_forms')
        .select('id')
        .eq('client_id', clientId)
        .maybeSingle();

      if (formData) {
        const { data: images } = await supabase
          .from('form_images')
          .select('file_url')
          .eq('form_id', formData.id);

        if (images && images.length > 0) {
          for (const image of images) {
            const filePath = image.file_url.split('/').pop();
            if (filePath) {
              await supabase.storage
                .from('app-images')
                .remove([filePath]);
            }
          }
        }

        await supabase
          .from('form_images')
          .delete()
          .eq('form_id', formData.id);

        await supabase
          .from('app_forms')
          .delete()
          .eq('id', formData.id);
      }

      const { data: clientData } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single();

      await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (clientData?.user_id) {
        await supabase
          .from('profiles')
          .delete()
          .eq('id', clientData.user_id);

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
          await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: clientData.user_id }),
          });
        }
      }

      loadClients();
      alert('Cliente excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Erro ao excluir cliente. Por favor, tente novamente.');
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Não iniciado
        </span>
      );
    }

    const badges = {
      not_started: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
    };

    const labels = {
      not_started: 'Não iniciado',
      in_progress: 'Em andamento',
      completed: 'Concluído',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold" style={{ color: '#e40033' }}>TILARY</span>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-900">Painel Administrativo</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{profile?.name}</span>
              <button
                onClick={() => setShowCreateAdminModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border"
                style={{ color: '#e40033', borderColor: '#e40033' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(228, 0, 51, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Cadastrar Administrador"
              >
                <UserPlus className="w-4 h-4" />
                Novo Admin
              </button>
              <NotificationBell />
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
              activeTab === 'clients'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5" />
            Clientes
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
              activeTab === 'admins'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="w-5 h-5" />
            Administradores
          </button>
        </div>

        {activeTab === 'clients' ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
                <p className="text-gray-600 mt-1">Gerencie os clientes e seus formulários</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#e40033' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c2002a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e40033'}
              >
                <Plus className="w-5 h-5" />
                Novo Cliente
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código de Acesso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Formulário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progresso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Projeto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lojas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reunião
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Cliente
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          <div className="text-sm text-gray-500">{client.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-mono">
                          {client.access_code}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(client.form?.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${client.form?.progress_percentage || 0}%`,
                                backgroundColor: '#e40033'
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {client.form?.progress_percentage || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {client.form?.id ? (
                          <select
                            value={client.form?.project_status || 'pending'}
                            onChange={(e) => handleUpdateProjectStatus(client.form!.id, e.target.value)}
                            className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="pending">Pendente</option>
                            <option value="development">Desenvolvimento</option>
                            <option value="panel_delivered">Painel Entregue</option>
                            <option value="testing_submission">Testes e Envio</option>
                            <option value="under_review">Em Análise</option>
                            <option value="completed">Concluído</option>
                          </select>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.form?.store_owner ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            client.form.store_owner === 'tilary'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {client.form.store_owner === 'tilary' ? 'Tilary' : 'Cliente'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {client.form?.id ? (
                          editingMeeting === client.form.id ? (
                            <div className="flex flex-col gap-2">
                              <input
                                type="date"
                                value={meetingDate}
                                onChange={(e) => setMeetingDate(e.target.value)}
                                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:border-blue-500"
                                style={{ focusRingColor: '#e40033' }}
                              />
                              <input
                                type="time"
                                value={meetingTime}
                                onChange={(e) => setMeetingTime(e.target.value)}
                                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:border-blue-500"
                                style={{ focusRingColor: '#e40033' }}
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleSaveMeeting(client.form!.id)}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-white rounded"
                                  style={{ backgroundColor: '#e40033' }}
                                  title="Salvar"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={handleCancelEditMeeting}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                                  title="Cancelar"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : client.form.meeting_scheduled ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1 text-xs text-gray-700">
                                <Calendar className="w-3 h-3" style={{ color: '#e40033' }} />
                                <span>{new Date(client.form.meeting_date!).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <div className="text-xs text-gray-600">
                                {client.form.meeting_time}
                              </div>
                              <div className="flex gap-1 mt-1">
                                <button
                                  onClick={() => handleStartEditMeeting(client.form!.id, client.form!.meeting_date!, client.form!.meeting_time!)}
                                  className="text-xs px-2 py-0.5 rounded"
                                  style={{ color: '#e40033', borderColor: '#e40033', border: '1px solid' }}
                                  title="Editar"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleRemoveMeeting(client.form!.id)}
                                  className="text-xs text-gray-500 hover:text-red-600 px-2 py-0.5 rounded border border-gray-300"
                                  title="Remover"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEditMeeting(client.form.id)}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                              style={{ color: '#e40033', borderColor: '#e40033', border: '1px solid' }}
                              title="Marcar Reunião"
                            >
                              <Calendar className="w-3 h-3" />
                              Marcar
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          client.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {client.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedClient(client)}
                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setNotesClient(client)}
                            className="text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-50 rounded"
                            title="Observações"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(client.id, client.status)}
                            className="text-yellow-600 hover:text-yellow-800 p-1 hover:bg-yellow-50 rounded"
                            title={client.status === 'active' ? 'Desativar' : 'Reativar'}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        Nenhum cliente cadastrado ainda
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Administradores</h2>
                <p className="text-gray-600 mt-1">Gerencie os administradores do sistema</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Criação
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{admin.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditEmailAdmin(admin)}
                            className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded inline-flex items-center gap-1"
                            title="Alterar Email"
                          >
                            <Mail className="w-4 h-4" />
                            <span className="text-sm">Alterar Email</span>
                          </button>
                          <button
                            onClick={() => setEditPasswordAdmin(admin)}
                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded inline-flex items-center gap-1"
                            title="Alterar Senha"
                          >
                            <Key className="w-4 h-4" />
                            <span className="text-sm">Alterar Senha</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {admins.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        Nenhum administrador cadastrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateClientModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadClients();
          }}
        />
      )}

      {showCreateAdminModal && (
        <CreateAdminModal
          onClose={() => setShowCreateAdminModal(false)}
          onSuccess={() => {
            setShowCreateAdminModal(false);
            loadAdmins();
            alert('Administrador criado com sucesso!');
          }}
        />
      )}

      {editPasswordAdmin && (
        <EditAdminPasswordModal
          adminId={editPasswordAdmin.id}
          adminName={editPasswordAdmin.name}
          onClose={() => setEditPasswordAdmin(null)}
          onSuccess={() => {
            setEditPasswordAdmin(null);
            alert('Senha alterada com sucesso!');
          }}
        />
      )}

      {editEmailAdmin && (
        <EditAdminEmailModal
          adminId={editEmailAdmin.id}
          adminName={editEmailAdmin.name}
          currentEmail={editEmailAdmin.email}
          onClose={() => setEditEmailAdmin(null)}
          onSuccess={() => {
            setEditEmailAdmin(null);
            loadAdmins();
            alert('Email alterado com sucesso!');
          }}
        />
      )}

      {selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}

      {notesClient && (
        <NotesModal
          client={notesClient}
          onClose={() => setNotesClient(null)}
          onSuccess={() => {
            setNotesClient(null);
            loadClients();
          }}
        />
      )}
    </div>
  );
}

function ClientDetailsModal({ client, onClose }: { client: ClientWithForm; onClose: () => void }) {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (client.form?.id) {
      loadImages();
    } else {
      setLoading(false);
    }
  }, [client.form?.id]);

  const loadImages = async () => {
    if (!client.form?.id) return;

    try {
      const { data, error } = await supabase
        .from('form_images')
        .select('*')
        .eq('form_id', client.form.id);

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!client.form) return;

    setDownloading(true);
    try {
      const { downloadFormDataAsZip } = await import('../lib/downloadZip');
      await downloadFormDataAsZip(
        {
          name: client.name,
          email: client.email,
          access_code: client.access_code,
        },
        client.form,
        images
      );
    } catch (error) {
      console.error('Error downloading ZIP:', error);
      alert('Erro ao gerar arquivo ZIP');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Detalhes do Cliente</h3>
          <div className="flex items-center gap-3">
            {client.form?.status === 'completed' && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                {downloading ? 'Gerando...' : 'Baixar ZIP'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Nome</label>
              <p className="text-gray-900 mt-1">{client.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900 mt-1">{client.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Código de Acesso</label>
              <p className="text-gray-900 mt-1 font-mono">{client.access_code}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p className="text-gray-900 mt-1">{client.status === 'active' ? 'Ativo' : 'Inativo'}</p>
            </div>
          </div>

          {client.form ? (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 border-b pb-2">Dados do Formulário</h4>

              {client.form.store_owner && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="text-sm font-medium text-blue-900 block mb-1">
                    Proprietário das Lojas
                  </label>
                  <p className="text-blue-900 font-semibold">
                    {client.form.store_owner === 'tilary'
                      ? 'Lojas da Tilary'
                      : 'Lojas do Cliente'}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {client.form.store_owner === 'tilary'
                      ? 'Os apps serão publicados nas lojas da Tilary'
                      : 'Os apps serão publicados nas lojas do próprio cliente'}
                  </p>
                </div>
              )}

              {client.form.driver_app_name && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome App Motorista</label>
                  <p className="text-gray-900 mt-1">{client.form.driver_app_name}</p>
                </div>
              )}

              {client.form.passenger_app_name && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome App Passageiro</label>
                  <p className="text-gray-900 mt-1">{client.form.passenger_app_name}</p>
                </div>
              )}

              {client.form.support_email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Email de Suporte</label>
                  <p className="text-gray-900 mt-1">{client.form.support_email}</p>
                </div>
              )}

              {client.form.short_description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Descrição Curta</label>
                  <p className="text-gray-900 mt-1">{client.form.short_description}</p>
                </div>
              )}

              {client.form.image_source === 'tilary' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Imagens Padrão da Tilary Selecionadas
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        O cliente optou por usar as imagens padrão da Tilary.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {images.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">
                    {client.form.image_source === 'custom' ? 'Imagens Personalizadas Enviadas' : 'Imagens Enviadas'}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((img) => (
                      <div key={img.id} className="border rounded p-2">
                        <img src={img.file_url} alt={img.file_name} className="w-full h-20 object-cover rounded" />
                        <p className="text-xs text-gray-600 mt-1 truncate">{img.file_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Cliente ainda não iniciou o formulário</p>
          )}
        </div>
      </div>
    </div>
  );
}
