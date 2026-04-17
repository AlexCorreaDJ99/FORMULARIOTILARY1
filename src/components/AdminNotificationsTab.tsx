import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, BellOff, CheckCheck, AlertTriangle, Info, AlertOctagon, ChevronLeft, ChevronRight, RefreshCw, Volume2, VolumeX } from 'lucide-react';

export type AdminNotification = {
  id: string;
  type: 'info' | 'alert' | 'critical';
  title: string;
  message: string;
  client_id: string | null;
  form_id: string | null;
  is_read: boolean;
  notification_key: string;
  created_at: string;
};

type Props = {
  onUnreadCountChange: (count: number) => void;
  onOpenClient?: (clientId: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
};

const PAGE_SIZE = 30;

function playNotificationSound(critical: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (critical) {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.6);
    } else {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, ctx.currentTime);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    }
  } catch {
  }
}

export default function AdminNotificationsTab({ onUnreadCountChange, onOpenClient, soundEnabled, onToggleSound }: Props) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<'all' | 'info' | 'alert' | 'critical'>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let countQ = supabase.from('admin_notifications').select('*', { count: 'exact', head: true });
      if (filterType !== 'all') countQ = countQ.eq('type', filterType);
      if (filterRead === 'unread') countQ = countQ.eq('is_read', false);
      if (filterRead === 'read') countQ = countQ.eq('is_read', true);
      const { count } = await countQ;
      setTotal(count || 0);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let dataQ = supabase.from('admin_notifications').select('*').order('created_at', { ascending: false }).range(from, to);
      if (filterType !== 'all') dataQ = dataQ.eq('type', filterType);
      if (filterRead === 'unread') dataQ = dataQ.eq('is_read', false);
      if (filterRead === 'read') dataQ = dataQ.eq('is_read', true);
      const { data, error } = await dataQ;
      if (error) throw error;

      const fresh = data || [];

      if (!isFirstLoad.current && soundEnabled) {
        const newItems = fresh.filter(n => !knownIdsRef.current.has(n.id) && !n.is_read);
        if (newItems.length > 0) {
          const hasCritical = newItems.some(n => n.type === 'critical');
          playNotificationSound(hasCritical);
        }
      }

      fresh.forEach(n => knownIdsRef.current.add(n.id));
      isFirstLoad.current = false;
      setNotifications(fresh);

      const { count: unreadCount } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      onUnreadCountChange(unreadCount || 0);
    } catch (err) {
      console.error('Error loading admin notifications:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, filterType, filterRead, soundEnabled, onUnreadCountChange]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const interval = setInterval(() => loadNotifications(true), 20000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markRead = async (id: string) => {
    await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    onUnreadCountChange(Math.max(0, notifications.filter(n => !n.is_read).length - 1));
  };

  const markAllRead = async () => {
    await supabase.from('admin_notifications').update({ is_read: true }).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    onUnreadCountChange(0);
  };

  const triggerGeneration = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-admin-notifications`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      await loadNotifications();
    } catch (err) {
      console.error('Error triggering generation:', err);
    } finally {
      setGenerating(false);
    }
  };

  const typeIcon = (type: AdminNotification['type']) => {
    if (type === 'critical') return <AlertOctagon className="w-4 h-4 text-red-600 flex-shrink-0" />;
    if (type === 'alert') return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
    return <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />;
  };

  const typeBadge = (type: AdminNotification['type']) => {
    if (type === 'critical') return 'bg-red-100 text-red-800 border border-red-200';
    if (type === 'alert') return 'bg-amber-100 text-amber-800 border border-amber-200';
    return 'bg-blue-100 text-blue-800 border border-blue-200';
  };

  const typeLabel = (type: AdminNotification['type']) => {
    if (type === 'critical') return 'Crítico';
    if (type === 'alert') return 'Alerta';
    return 'Info';
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Notificações Administrativas</h2>
          <p className="text-sm text-gray-600 mt-1">Alertas automáticos de prazo, inatividade e formulários pendentes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Desativar som' : 'Ativar som'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
            style={{ borderColor: soundEnabled ? '#e40033' : '#d1d5db', color: soundEnabled ? '#e40033' : '#6b7280' }}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Som On' : 'Som Off'}</span>
          </button>
          <button
            onClick={triggerGeneration}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Verificar Agora</span>
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Marcar todas como lidas</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'info', 'alert', 'critical'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setFilterType(t); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterType === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {t === 'all' ? 'Todos' : t === 'info' ? 'Info' : t === 'alert' ? 'Alerta' : 'Crítico'}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {(['all', 'unread', 'read'] as const).map(r => (
            <button
              key={r}
              onClick={() => { setFilterRead(r); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterRead === r ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {r === 'all' ? 'Todos' : r === 'unread' ? 'Não lidas' : 'Lidas'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Carregando...</div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Bell className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">Nenhuma notificação encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`rounded-xl border px-4 py-3 flex items-start gap-3 transition-colors ${
                n.is_read ? 'bg-white border-gray-200' : 'bg-white border-l-4 shadow-sm ' + (
                  n.type === 'critical' ? 'border-l-red-500' :
                  n.type === 'alert' ? 'border-l-amber-400' : 'border-l-blue-400'
                )
              }`}
            >
              <div className="mt-0.5">{typeIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${typeBadge(n.type)}`}>
                    {typeLabel(n.type)}
                  </span>
                  <span className="text-xs font-semibold text-gray-900">{n.title}</span>
                  {!n.is_read && (
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-snug">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleDateString('pt-BR')} às {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {n.client_id && onOpenClient && (
                  <button
                    onClick={() => onOpenClient(n.client_id!)}
                    className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-2 py-1 transition-colors"
                  >
                    Ver cliente
                  </button>
                )}
                {!n.is_read && (
                  <button
                    onClick={() => markRead(n.id)}
                    title="Marcar como lida"
                    className="text-gray-400 hover:text-gray-700 transition-colors p-1"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {((page - 1) * PAGE_SIZE) + 1} a {Math.min(page * PAGE_SIZE, total)} de {total} registros
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: page === 1 ? '#9ca3af' : '#e40033', borderColor: page === 1 ? '#d1d5db' : '#e40033' }}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>
            <span className="px-3 py-2 text-sm text-gray-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: page >= totalPages ? '#9ca3af' : '#e40033', borderColor: page >= totalPages ? '#d1d5db' : '#e40033' }}
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
