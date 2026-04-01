import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Client, AppForm, ActivityLog, ClientNotification, logAdminAction } from '../lib/supabase';
import { Plus, LogOut, Users, Eye, Trash2, RefreshCw, Download, UserPlus, Shield, Key, Calendar, X, Check, CheckCircle, FileText, Mail, ChevronLeft, ChevronRight, ClipboardList, CreditCard as Edit2, Bell } from 'lucide-react';
import CreateClientModal from './CreateClientModal';
import CreateAdminModal from './CreateAdminModal';
import EditAdminPasswordModal from './EditAdminPasswordModal';
import EditAdminEmailModal from './EditAdminEmailModal';
import NotificationBell from './NotificationBell';
import NotesModal from './NotesModal';
import ReviewFormModal from './ReviewFormModal';
import RecalculateProgressButton from './RecalculateProgressButton';

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
  const [activeTab, setActiveTab] = useState<'clients' | 'admins' | 'logs' | 'notifications'>('clients');
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
  const [editingCompletionDate, setEditingCompletionDate] = useState<string | null>(null);
  const [completionDate, setCompletionDate] = useState('');
  const [notesClient, setNotesClient] = useState<ClientWithForm | null>(null);
  const [reviewClient, setReviewClient] = useState<ClientWithForm | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalClients, setTotalClients] = useState(0);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [filterNotificationType, setFilterNotificationType] = useState<string>('all');
  const [filterNotificationRead, setFilterNotificationRead] = useState<string>('all');
  const [filterFormStatus, setFilterFormStatus] = useState<string>('all');
  const [filterProjectStatus, setFilterProjectStatus] = useState<string>('all');
  const [sortByCompletionDate, setSortByCompletionDate] = useState<string>('none');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const itemsPerPage = 40;
  const logsPerPage = 50;
  const notificationsPerPage = 50;

  useEffect(() => {
    loadClients();
    loadAdmins();
  }, [currentPage, filterFormStatus, filterProjectStatus, sortByCompletionDate]);

  const loadClients = async () => {
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      let clientsWithForms = await Promise.all(
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

      let filteredClients = clientsWithForms;

      if (filterFormStatus !== 'all') {
        if (filterFormStatus === 'not_started') {
          filteredClients = filteredClients.filter(c => !c.form || c.form.status === 'not_started');
        } else if (filterFormStatus === 'incomplete') {
          filteredClients = filteredClients.filter(c => !c.form || c.form.status !== 'completed');
        } else {
          filteredClients = filteredClients.filter(c => c.form?.status === filterFormStatus);
        }
      }

      if (filterProjectStatus !== 'all') {
        filteredClients = filteredClients.filter(c => c.form?.project_status === filterProjectStatus);
      }

      if (sortByCompletionDate === 'oldest') {
        filteredClients.sort((a, b) => {
          const dateA = a.form?.completion_date;
          const dateB = b.form?.completion_date;

          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;

          return new Date(dateA).getTime() - new Date(dateB).getTime();
        });
      } else if (sortByCompletionDate === 'newest') {
        filteredClients.sort((a, b) => {
          const dateA = a.form?.completion_date;
          const dateB = b.form?.completion_date;

          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;

          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
      } else if (sortByCompletionDate === 'no_date') {
        filteredClients.sort((a, b) => {
          const hasDateA = !!a.form?.completion_date;
          const hasDateB = !!b.form?.completion_date;

          if (hasDateA === hasDateB) return 0;
          return hasDateA ? 1 : -1;
        });
      }

      setTotalClients(filteredClients.length);
      setClients(filteredClients.slice(from, to + 1));
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

  const loadLogs = async () => {
    try {
      const { count } = await supabase
        .from('admin_activity_logs')
        .select('*', { count: 'exact', head: true });

      setTotalLogs(count || 0);

      const from = (logsPage - 1) * logsPerPage;
      const to = from + logsPerPage - 1;

      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    } else if (activeTab === 'notifications') {
      loadNotifications();
    }
  }, [activeTab, logsPage, notificationsPage, filterNotificationType, filterNotificationRead]);

  const loadNotifications = async () => {
    try {
      let query = supabase
        .from('client_notifications')
        .select('*, clients!inner(name)', { count: 'exact' });

      if (filterNotificationType !== 'all') {
        query = query.eq('notification_type', filterNotificationType);
      }

      if (filterNotificationRead === 'read') {
        query = query.eq('is_read', true);
      } else if (filterNotificationRead === 'unread') {
        query = query.eq('is_read', false);
      }

      const { count } = await query;
      setTotalNotifications(count || 0);

      const from = (notificationsPage - 1) * notificationsPerPage;
      const to = from + notificationsPerPage - 1;

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const notificationsWithClientName = (data || []).map((notif: any) => ({
        ...notif,
        client_name: notif.clients?.name || 'Cliente desconhecido'
      }));

      setNotifications(notificationsWithClientName);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('client_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      const { error } = await supabase
        .from('client_notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
      loadNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
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
      const client = clients.find(c => c.form?.id === formId);

      const { error } = await supabase
        .from('app_forms')
        .update({ project_status: newStatus })
        .eq('id', formId);

      if (error) throw error;

      await logAdminAction(
        'project_status_update',
        `Alterou status do projeto para: ${newStatus}`,
        'form',
        formId,
        client?.name,
        { new_status: newStatus }
      );

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

  const handleEditCompletionDate = (formId: string, currentDate?: string) => {
    setEditingCompletionDate(formId);
    setCompletionDate(currentDate || '');
  };

  const handleCancelEditCompletionDate = () => {
    setEditingCompletionDate(null);
    setCompletionDate('');
  };

  const handleSaveCompletionDate = async (formId: string) => {
    try {
      const client = clients.find(c => c.form?.id === formId);

      const { error } = await supabase
        .from('app_forms')
        .update({ completion_date: completionDate || null })
        .eq('id', formId);

      if (error) throw error;

      await logAdminAction(
        'completion_date_update',
        completionDate
          ? `Atualizou data de conclusão para ${new Date(completionDate).toLocaleDateString('pt-BR')}`
          : 'Removeu data de conclusão',
        'form',
        formId,
        client?.name,
        { completion_date: completionDate }
      );

      handleCancelEditCompletionDate();
      loadClients();
    } catch (error) {
      console.error('Error saving completion date:', error);
      alert('Erro ao salvar data de conclusão');
    }
  };

  const handleSaveMeeting = async (formId: string) => {
    if (!meetingDate || !meetingTime) {
      alert('Por favor, preencha data e horário da reunião');
      return;
    }

    try {
      const client = clients.find(c => c.form?.id === formId);

      const { error } = await supabase
        .from('app_forms')
        .update({
          meeting_scheduled: true,
          meeting_date: meetingDate,
          meeting_time: meetingTime
        })
        .eq('id', formId);

      if (error) throw error;

      await logAdminAction(
        'meeting_scheduled',
        `Agendou reunião para ${new Date(meetingDate).toLocaleDateString('pt-BR')} às ${meetingTime}`,
        'form',
        formId,
        client?.name,
        { meeting_date: meetingDate, meeting_time: meetingTime }
      );

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
      const client = clients.find(c => c.form?.id === formId);

      const { error } = await supabase
        .from('app_forms')
        .update({
          meeting_scheduled: false,
          meeting_date: null,
          meeting_time: null
        })
        .eq('id', formId);

      if (error) throw error;

      await logAdminAction(
        'meeting_removed',
        'Removeu agendamento de reunião',
        'form',
        formId,
        client?.name
      );

      loadClients();
    } catch (error) {
      console.error('Error removing meeting:', error);
      alert('Erro ao remover reunião');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      alert('Cliente não encontrado.');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o cliente "${client.name}"?\n\nEsta ação marcará o cliente como excluído e ele não poderá mais acessar o sistema.`)) {
      return;
    }

    try {
      console.log('Iniciando exclusão do cliente:', clientId);

      const { data, error: updateError } = await supabase
        .from('clients')
        .update({
          deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)
        .select();

      if (updateError) {
        console.error('Erro RLS ou permissão ao excluir:', updateError);
        throw updateError;
      }

      console.log('Cliente marcado como excluído:', data);

      try {
        await logAdminAction(
          'client_deleted',
          `Excluiu o cliente: ${client.name}`,
          'client',
          clientId,
          client.name,
          { email: client.email }
        );
      } catch (logError) {
        console.error('Erro ao registrar log (não crítico):', logError);
      }

      if (clients.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        await loadClients();
      }

      alert('Cliente excluído com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir cliente:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });

      let errorMessage = 'Erro ao excluir cliente.';

      if (error?.message) {
        errorMessage += `\n\nDetalhes: ${error.message}`;
      }

      if (error?.hint) {
        errorMessage += `\n\nDica: ${error.hint}`;
      }

      alert(errorMessage);
    }
  };

  const handleToggleSelection = (clientId: string) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClientIds.length === clients.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(clients.map(c => c.id));
    }
  };

  const handleDeleteSelectedForms = async () => {
    const selectedClients = clients.filter(c => selectedClientIds.includes(c.id));

    if (selectedClients.length === 0) {
      alert('Nenhum cliente selecionado.');
      return;
    }

    const confirmMessage = `Tem certeza que deseja deletar ${selectedClients.length} cliente(s)?\n\nClientes:\n${selectedClients.map(c => `- ${c.name}`).join('\n')}\n\nEsta ação marcará os clientes como excluídos e eles não poderão mais acessar o sistema.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      let deletedCount = 0;
      let errorCount = 0;

      for (const client of selectedClients) {
        try {
          const { error: updateError } = await supabase
            .from('clients')
            .update({
              deleted: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', client.id);

          if (updateError) {
            console.error(`Erro ao deletar cliente ${client.id}:`, updateError);
            errorCount++;
            continue;
          }

          await logAdminAction(
            'client_deleted',
            `Excluiu o cliente: ${client.name}`,
            'client',
            client.id,
            client.name,
            { email: client.email }
          );

          deletedCount++;
        } catch (error) {
          console.error(`Erro ao processar cliente ${client.name}:`, error);
          errorCount++;
        }
      }

      setSelectedClientIds([]);
      setSelectionMode(false);
      await loadClients();

      if (errorCount === 0) {
        alert(`${deletedCount} cliente(s) deletado(s) com sucesso!`);
      } else {
        alert(`${deletedCount} cliente(s) deletado(s) com sucesso.\n${errorCount} erro(s) encontrado(s).`);
      }
    } catch (error) {
      console.error('Erro ao deletar clientes:', error);
      alert('Erro ao deletar clientes selecionados.');
    }
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedClientIds([]);
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
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl font-bold" style={{ color: '#e40033' }}>TILARY</span>
              <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
              <h1 className="hidden md:block text-xl font-bold text-gray-900">Painel Administrativo</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:block text-sm text-gray-600">{profile?.name}</span>
              <button
                onClick={() => setShowCreateAdminModal(true)}
                className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg transition-colors border"
                style={{ color: '#e40033', borderColor: '#e40033' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(228, 0, 51, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Cadastrar Administrador"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Admin</span>
              </button>
              <NotificationBell />
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-2 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex gap-2 sm:gap-4 mb-6 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'clients'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-sm sm:text-base">Clientes</span>
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'admins'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-sm sm:text-base">Administradores</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-sm sm:text-base">Log de Alterações</span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bell className="w-5 h-5" />
            <span className="text-sm sm:text-base">Notificações</span>
          </button>
        </div>

        {activeTab === 'clients' && (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Clientes</h2>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Gerencie os clientes e seus formulários</p>
              </div>
              <div className="flex items-center gap-2">
                {!selectionMode && <RecalculateProgressButton />}
                {!selectionMode ? (
                  <>
                    <button
                      onClick={() => setSelectionMode(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap border"
                      style={{ color: '#e40033', borderColor: '#e40033' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(228, 0, 51, 0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <CheckCircle className="w-5 h-5" />
                      Selecionar
                    </button>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                      style={{ backgroundColor: '#e40033' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c2002a'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e40033'}
                    >
                      <Plus className="w-5 h-5" />
                      Novo Cliente
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-700">
                      {selectedClientIds.length} selecionado(s)
                    </span>
                    <button
                      onClick={handleDeleteSelectedForms}
                      disabled={selectedClientIds.length === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#dc2626', color: 'white' }}
                      onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#b91c1c')}
                      onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#dc2626')}
                    >
                      <Trash2 className="w-5 h-5" />
                      Deletar Clientes
                    </button>
                    <button
                      onClick={handleCancelSelection}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <X className="w-5 h-5" />
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mb-6 bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtros e Ordenação</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status Formulário</label>
                  <select
                    value={filterFormStatus}
                    onChange={(e) => {
                      setFilterFormStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value="not_started">Não Iniciado</option>
                    <option value="incomplete">Incompletos</option>
                    <option value="in_progress">Em Andamento</option>
                    <option value="completed">Concluído</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status Projeto</label>
                  <select
                    value={filterProjectStatus}
                    onChange={(e) => {
                      setFilterProjectStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value="pending">Pendente</option>
                    <option value="development">Desenvolvimento</option>
                    <option value="panel_delivered">Painel Entregue</option>
                    <option value="testing_submission">Testes e Envio</option>
                    <option value="under_review">Em Análise</option>
                    <option value="completed">Concluído</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ordenar por Data de Conclusão</label>
                  <select
                    value={sortByCompletionDate}
                    onChange={(e) => {
                      setSortByCompletionDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">Padrão (Mais Recentes)</option>
                    <option value="oldest">Data Mais Antiga (Prazo mais curto)</option>
                    <option value="newest">Data Mais Nova</option>
                    <option value="no_date">Sem Data Definida</option>
                  </select>
                </div>
              </div>

              {(filterFormStatus !== 'all' || filterProjectStatus !== 'all' || sortByCompletionDate !== 'none') && (
                <button
                  onClick={() => {
                    setFilterFormStatus('all');
                    setFilterProjectStatus('all');
                    setSortByCompletionDate('none');
                    setCurrentPage(1);
                  }}
                  className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Limpar Filtros
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {selectionMode && (
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedClientIds.length === clients.length && clients.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 focus:ring-2 cursor-pointer"
                          style={{ accentColor: '#e40033' }}
                        />
                      </th>
                    )}
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
                      Data Conclusão
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lojas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reunião
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revisão
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Cliente
                    </th>
                    {!selectionMode && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      {selectionMode && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedClientIds.includes(client.id)}
                            onChange={() => handleToggleSelection(client.id)}
                            className="w-4 h-4 rounded border-gray-300 focus:ring-2 cursor-pointer"
                            style={{ accentColor: '#e40033' }}
                          />
                        </td>
                      )}
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
                      <td className="px-6 py-4">
                        {client.form?.id ? (
                          editingCompletionDate === client.form.id ? (
                            <div className="flex flex-col gap-2">
                              <input
                                type="date"
                                value={completionDate}
                                onChange={(e) => setCompletionDate(e.target.value)}
                                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:border-blue-500"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleSaveCompletionDate(client.form!.id)}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-white rounded"
                                  style={{ backgroundColor: '#e40033' }}
                                  title="Salvar"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={handleCancelEditCompletionDate}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                                  title="Cancelar"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : client.form.completion_date ? (
                            <div className="flex items-center gap-1">
                              <div className="flex items-center gap-1 text-xs text-gray-700">
                                <Calendar className="w-3 h-3" style={{ color: '#e40033' }} />
                                <span>{(() => {
                                  const [year, month, day] = client.form.completion_date.split('-');
                                  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('pt-BR');
                                })()}</span>
                              </div>
                              <button
                                onClick={() => handleEditCompletionDate(client.form!.id, client.form!.completion_date)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Editar data"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditCompletionDate(client.form!.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                            >
                              <Calendar className="w-3 h-3" />
                              Definir
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {(client.form?.play_store_owner || client.form?.app_store_owner) ? (
                          <div className="flex flex-col gap-1">
                            {client.form?.play_store_owner && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">Play:</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  client.form.play_store_owner === 'tilary'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {client.form.play_store_owner === 'tilary' ? 'Tilary' : 'Cliente'}
                                </span>
                              </div>
                            )}
                            {client.form?.app_store_owner && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">App:</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  client.form.app_store_owner === 'tilary'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {client.form.app_store_owner === 'tilary' ? 'Tilary' : 'Cliente'}
                                </span>
                              </div>
                            )}
                          </div>
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
                                <span>{(() => {
                                  const [year, month, day] = client.form.meeting_date!.split('-');
                                  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('pt-BR');
                                })()}</span>
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
                      <td className="px-6 py-4">
                        {client.form?.id ? (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => setReviewClient(client)}
                              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                                client.form?.review_status === 'approved'
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : client.form?.review_status === 'rejected'
                                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              }`}
                              title="Revisar formulário"
                            >
                              {client.form?.review_status === 'approved'
                                ? 'Aprovado'
                                : client.form?.review_status === 'rejected'
                                ? 'Rejeitado'
                                : 'Pendente'}
                            </button>
                            {client.form?.review_status === 'rejected' && client.form?.corrections_completed && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                <CheckCircle className="w-3 h-3" />
                                Cliente concluiu
                              </span>
                            )}
                          </div>
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
                      {!selectionMode && (
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
                      )}
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                        Nenhum cliente cadastrado ainda
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalClients > itemsPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-6 px-4 gap-4">
                <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalClients)} de {totalClients} clientes
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1 text-xs sm:text-sm"
                    style={{
                      color: currentPage === 1 ? '#9ca3af' : '#e40033',
                      borderColor: currentPage === 1 ? '#d1d5db' : '#e40033'
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage >= Math.ceil(totalClients / itemsPerPage)}
                    className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1 text-xs sm:text-sm"
                    style={{
                      color: currentPage >= Math.ceil(totalClients / itemsPerPage) ? '#9ca3af' : '#e40033',
                      borderColor: currentPage >= Math.ceil(totalClients / itemsPerPage) ? '#d1d5db' : '#e40033'
                    }}
                  >
                    <span className="hidden sm:inline">Próxima</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'admins' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Administradores</h2>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Gerencie os administradores do sistema</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
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

        {activeTab === 'logs' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Log de Alterações</h2>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Histórico de ações dos administradores</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Administrador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alvo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(log.created_at).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.admin_name}</div>
                        <div className="text-xs text-gray-500">{log.admin_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.action_type.includes('delete') ? 'bg-red-100 text-red-800' :
                          log.action_type.includes('create') ? 'bg-green-100 text-green-800' :
                          log.action_type.includes('update') || log.action_type.includes('review') ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md">{log.action_description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.target_name && (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{log.target_name}</div>
                            {log.target_type && (
                              <div className="text-xs text-gray-500">{log.target_type}</div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Nenhum log encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalLogs > logsPerPage && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {((logsPage - 1) * logsPerPage) + 1} a {Math.min(logsPage * logsPerPage, totalLogs)} de {totalLogs} registros
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                    disabled={logsPage === 1}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      color: logsPage === 1 ? '#9ca3af' : '#e40033',
                      borderColor: logsPage === 1 ? '#d1d5db' : '#e40033'
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Página {logsPage} de {Math.ceil(totalLogs / logsPerPage)}
                  </span>
                  <button
                    onClick={() => setLogsPage(p => Math.min(Math.ceil(totalLogs / logsPerPage), p + 1))}
                    disabled={logsPage >= Math.ceil(totalLogs / logsPerPage)}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      color: logsPage >= Math.ceil(totalLogs / logsPerPage) ? '#9ca3af' : '#e40033',
                      borderColor: logsPage >= Math.ceil(totalLogs / logsPerPage) ? '#d1d5db' : '#e40033'
                    }}
                  >
                    <span className="hidden sm:inline">Próxima</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'notifications' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Notificações de Atividade</h2>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Acompanhe a atividade dos clientes no formulário</p>
              </div>
              <button
                onClick={handleMarkAllNotificationsAsRead}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#e40033' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c2002a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e40033'}
              >
                <CheckCircle className="w-4 h-4" />
                Marcar Todas como Lidas
              </button>
            </div>

            <div className="mb-6 flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select
                  value={filterNotificationType}
                  onChange={(e) => {
                    setFilterNotificationType(e.target.value);
                    setNotificationsPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="first_access">Primeiro Acesso</option>
                  <option value="form_submitted">Formulário Enviado</option>
                  <option value="form_updated">Formulário Atualizado</option>
                  <option value="form_completed">Formulário Completo</option>
                  <option value="inactive_2_days">Inativo 2 Dias</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filterNotificationRead}
                  onChange={(e) => {
                    setFilterNotificationRead(e.target.value);
                    setNotificationsPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="unread">Não Lidas</option>
                  <option value="read">Lidas</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mensagem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {notifications.map((notification: any) => (
                    <tr key={notification.id} className={notification.is_read ? 'bg-white' : 'bg-blue-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {notification.is_read ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Lida
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Nova
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(notification.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{notification.client_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {notification.notification_type === 'first_access' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Primeiro Acesso
                          </span>
                        )}
                        {notification.notification_type === 'form_submitted' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Formulário Enviado
                          </span>
                        )}
                        {notification.notification_type === 'form_updated' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Atualizado
                          </span>
                        )}
                        {notification.notification_type === 'form_completed' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Completo
                          </span>
                        )}
                        {notification.notification_type === 'inactive_2_days' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inativo 2 Dias
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{notification.message}</div>
                        {notification.metadata && notification.metadata.progress !== undefined && (
                          <div className="text-xs text-gray-500 mt-1">
                            Progresso: {notification.metadata.progress}%
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkNotificationAsRead(notification.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Marcar como Lida
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {notifications.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Nenhuma notificação encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalNotifications > notificationsPerPage && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {((notificationsPage - 1) * notificationsPerPage) + 1} a {Math.min(notificationsPage * notificationsPerPage, totalNotifications)} de {totalNotifications} notificações
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNotificationsPage(p => Math.max(1, p - 1))}
                    disabled={notificationsPage === 1}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      color: notificationsPage === 1 ? '#9ca3af' : '#e40033',
                      borderColor: notificationsPage === 1 ? '#d1d5db' : '#e40033'
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Página {notificationsPage} de {Math.ceil(totalNotifications / notificationsPerPage)}
                  </span>
                  <button
                    onClick={() => setNotificationsPage(p => Math.min(Math.ceil(totalNotifications / notificationsPerPage), p + 1))}
                    disabled={notificationsPage >= Math.ceil(totalNotifications / notificationsPerPage)}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      color: notificationsPage >= Math.ceil(totalNotifications / notificationsPerPage) ? '#9ca3af' : '#e40033',
                      borderColor: notificationsPage >= Math.ceil(totalNotifications / notificationsPerPage) ? '#d1d5db' : '#e40033'
                    }}
                  >
                    <span className="hidden sm:inline">Próxima</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateClientModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            setCurrentPage(1);
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

      {reviewClient && reviewClient.form?.id && (
        <ReviewFormModal
          clientId={reviewClient.id}
          clientName={reviewClient.name}
          formId={reviewClient.form.id}
          currentStatus={reviewClient.form.review_status}
          currentFeedback={reviewClient.form.review_feedback}
          onClose={() => setReviewClient(null)}
          onSuccess={() => {
            setReviewClient(null);
            loadClients();
            alert('Revisão salva com sucesso!');
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
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Detalhes do Cliente</h3>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {(client.form?.status === 'completed' || client.form?.progress_percentage === 100) && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{downloading ? 'Gerando...' : 'Baixar ZIP'}</span>
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              {client.form.admin_notes && (() => {
                const logMatch = client.form.admin_notes.match(/\n-{3,}\n\[LOG AUTOMÁTICO\]([\s\S]+)$/);
                if (logMatch) {
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <label className="text-sm font-bold text-amber-900 block mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Histórico de Modificações
                      </label>
                      <div className="text-sm text-amber-900 whitespace-pre-line font-mono">
                        {logMatch[1].trim()}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {(client.form.play_store_owner || client.form.app_store_owner) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="text-sm font-medium text-blue-900 block mb-2">
                    Publicação nas Lojas
                  </label>
                  <div className="space-y-2">
                    {client.form.play_store_owner && (
                      <div>
                        <p className="text-sm font-semibold text-blue-900">
                          Play Store (Android): {client.form.play_store_owner === 'tilary' ? 'Conta da Tilary' : 'Conta do Cliente'}
                        </p>
                      </div>
                    )}
                    {client.form.app_store_owner && (
                      <div>
                        <p className="text-sm font-semibold text-blue-900">
                          App Store (iOS): {client.form.app_store_owner === 'tilary' ? 'Conta da Tilary' : 'Conta do Cliente'}
                        </p>
                      </div>
                    )}
                  </div>
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
