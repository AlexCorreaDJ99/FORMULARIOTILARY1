import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import ClientDashboard from './components/ClientDashboard';
import ExportSnapshot from './components/ExportSnapshot';
import SiteInterdicao from './components/SiteInterdicao';

function SystemApp() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
  }

  if (window.location.pathname === '/admin/export-snapshot') {
    return profile.role === 'admin' ? <ExportSnapshot /> : <ClientDashboard />;
  }

  return profile.role === 'admin' ? <AdminDashboard /> : <ClientDashboard />;
}

function App() {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <SiteInterdicao onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <AuthProvider>
      <SystemApp />
    </AuthProvider>
  );
}

export default App;
