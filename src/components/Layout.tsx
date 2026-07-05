import { useState, ReactNode } from 'react';
import { useFirebase } from './FirebaseProvider';
import { 
  Smartphone, 
  UserCheck, 
  LogOut, 
  Menu, 
  X, 
  TrendingUp, 
  PlusCircle, 
  Wrench, 
  Users, 
  Sliders,
  Zap,
  Coins,
  Settings
} from 'lucide-react';
import { UserRole } from '../types';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { user, profile, logout, activeRole, simulatedRole, setSimulatedRole } = useFirebase();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  // Define navigation based on the active role
  const getNavItems = () => {
    switch (activeRole) {
      case 'Owner':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
          { id: 'service', label: 'Service HP', icon: Wrench },
          { id: 'ppob', label: 'PPOB', icon: Zap },
          { id: 'kas', label: 'Buku Kas', icon: Coins },
          { id: 'lainnya', label: 'Lainnya', icon: Settings },
        ];
      case 'Kasir':
        return [
          { id: 'dashboard', label: 'Kasir Utama', icon: PlusCircle },
          { id: 'services', label: 'Status Perbaikan', icon: Wrench },
        ];
      case 'Teknisi':
        return [
          { id: 'dashboard', label: 'Layanan & Service', icon: Wrench },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const getRoleBadgeStyle = (role: UserRole | null) => {
    switch (role) {
      case 'Owner':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Kasir':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Teknisi':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans relative selection:bg-amber-500 selection:text-black">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950 to-black pointer-events-none z-0"></div>

      {/* MOBILE HEADER */}
      <header className="md:hidden z-30 relative bg-slate-900 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-none">ALDI SERVICE PHONE</h1>
            <span className="text-[8px] font-mono tracking-wider text-amber-500 font-bold">ASP SYSTEM</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Active Role Badge */}
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase font-mono tracking-wider ${getRoleBadgeStyle(activeRole)}`}>
            {activeRole}
          </span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 border border-slate-700/50 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* SIDEBAR - DESKTOP & MOBILE TRANSITION */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 transform z-40
        md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-amber-500 rounded flex items-center justify-center font-bold text-slate-950 text-xl">ASP</div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white leading-none">Aldi Service Phone</h1>
              <p className="text-[10px] text-amber-500 uppercase font-semibold tracking-widest mt-1">ERP System v1.0</p>
            </div>
          </div>

          {/* User Profile Summary */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={profile?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop'}
                alt={profile?.displayName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/20"
                referrerPolicy="no-referrer"
              />
              <div className="overflow-hidden">
                <h2 className="text-xs font-bold text-white truncate">{profile?.displayName}</h2>
                <p className="text-[10px] text-slate-500 truncate">{profile?.email}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500 font-mono tracking-wider uppercase">Hak Akses:</span>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase font-mono tracking-wider ${getRoleBadgeStyle(activeRole)}`}>
                  {activeRole}
                </span>
              </div>
              
              {/* Simulator trigger if user profile says Owner */}
              {profile?.role === 'Owner' && (
                <button
                  onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                  className="mt-2 text-[10px] text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1.5 justify-center py-1.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded transition-colors"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{showRoleSwitcher ? 'Sembunyikan Saklar' : 'Simulasi Role'}</span>
                </button>
              )}
            </div>
          </div>

          {/* SIMULATED ROLE SELECTOR (Owner-only workspace feature) */}
          {profile?.role === 'Owner' && showRoleSwitcher && (
            <div className="p-3 bg-slate-950/80 border border-slate-850 rounded mb-6">
              <span className="text-[9px] font-bold text-amber-500 font-mono uppercase tracking-widest block mb-2 text-center">Simulasi Dashboard</span>
              <div className="grid grid-cols-3 gap-1">
                {(['Owner', 'Kasir', 'Teknisi'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setSimulatedRole(r === profile.role ? null : r);
                    }}
                    className={`text-[9px] font-bold py-1.5 px-1 rounded border transition-all ${
                      (r === activeRole && simulatedRole) || (r === profile.role && !simulatedRole)
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {simulatedRole && (
                <button
                  onClick={() => setSimulatedRole(null)}
                  className="w-full mt-2 text-[8px] text-center text-slate-500 hover:underline block font-mono"
                >
                  Reset ke Role Utama
                </button>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold px-2 py-2 mb-1 block">Menu Utama</span>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 border text-xs font-semibold ${
                    activeTab === item.id
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${activeTab === item.id ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={logout}
            className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-950 border border-slate-800 hover:border-red-900/50 hover:text-red-400 text-slate-400 text-xs font-semibold rounded flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        ></div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col bg-slate-950 relative z-10 min-w-0 w-full pb-16 md:pb-0">
        {/* Top Header Row matching Sleek Interface Theme */}
        <header className="h-16 border-b border-slate-900 px-4 md:px-8 flex items-center justify-between bg-slate-950 shrink-0">
          <div className="flex items-center gap-4 text-slate-400 text-xs md:text-sm">
            <span className="hover:text-white transition-colors cursor-pointer font-medium">System</span>
            <span>/</span>
            <span className="text-white font-medium">
              {activeTab === 'dashboard' ? 'Dashboard Utama' : 
               activeTab === 'service' ? 'Service HP' : 
               activeTab === 'ppob' ? 'PPOB Billing' : 
               activeTab === 'kas' ? 'Buku Kas' : 
               activeTab === 'lainnya' ? 'Lainnya & Pengaturan' : 'Panel Utama'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded text-[10px] md:text-xs text-slate-400 font-medium">
              Firebase Status: <span className="text-green-400 font-mono font-bold animate-pulse">CONNECTED</span>
            </div>
          </div>
        </header>

        {/* Inner Content with padding and grid bounds */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800/80 z-40 flex items-center justify-around md:hidden px-2 backdrop-blur-xl bg-slate-900/95">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] font-bold tracking-wider transition-all ${
                isActive ? 'text-amber-500' : 'text-slate-400'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
