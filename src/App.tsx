import { useState } from 'react';
import { FirebaseProvider, useFirebase } from './components/FirebaseProvider';
import Login from './components/Login';
import Layout from './components/Layout';
import OwnerDashboard from './components/OwnerDashboard';
import KasirDashboard from './components/KasirDashboard';
import TeknisiDashboard from './components/TeknisiDashboard';
import ServiceView from './components/ServiceView';
import PpobView from './components/PpobView';
import KasView from './components/KasView';
import LainnyaView from './components/LainnyaView';
import { Smartphone } from 'lucide-react';

function AppContent() {
  const { user, loading, activeRole } = useFirebase();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center font-sans">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center animate-pulse shadow-lg shadow-amber-500/20">
            <Smartphone className="w-8 h-8 text-black stroke-[2.5]" />
          </div>
          <div className="absolute inset-0 rounded-2xl border border-amber-500/30 animate-ping"></div>
        </div>
        <p className="text-sm font-bold tracking-widest text-amber-500 font-mono uppercase animate-pulse">ALDI SERVICE PHONE</p>
        <p className="text-xs text-slate-500 mt-2">Menghubungkan ke secure ERP cloud...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Determine what view content to render based on user role and active sidebar tab
  const renderContent = () => {
    if (activeRole === 'Owner') {
      switch (activeTab) {
        case 'dashboard':
          return <OwnerDashboard />;
        case 'service':
          return <ServiceView />;
        case 'ppob':
          return <PpobView />;
        case 'kas':
          return <KasView />;
        case 'lainnya':
          return <LainnyaView />;
        default:
          return <OwnerDashboard />;
      }
    } else if (activeRole === 'Kasir') {
      switch (activeTab) {
        case 'dashboard':
          return <KasirDashboard />;
        case 'services':
          return <TeknisiDashboard />;
        default:
          return <KasirDashboard />;
      }
    } else if (activeRole === 'Teknisi') {
      return <TeknisiDashboard />;
    }
    return <div className="text-center py-12 text-slate-400 font-mono">Role tidak dikenali. Hubungi Owner ASP.</div>;
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}
