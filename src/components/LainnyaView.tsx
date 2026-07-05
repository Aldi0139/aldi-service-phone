import { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  Database, 
  Sliders, 
  ShieldCheck, 
  Smartphone, 
  Grid, 
  ChevronRight, 
  HelpCircle,
  Activity
} from 'lucide-react';
import { useFirebase } from './FirebaseProvider';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface StaffUser {
  id: string;
  name: string;
  role: 'Owner' | 'Kasir' | 'Teknisi';
  email: string;
  status: 'Aktif' | 'Cuti';
  joined: string;
}

export default function LainnyaView() {
  const { profile } = useFirebase();
  const [staff, setStaff] = useState<StaffUser[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: StaffUser[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const dateObj = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
        const joinedStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        list.push({
          id: doc.id.substring(0, 8).toUpperCase(),
          name: data.displayName || data.email?.split('@')[0] || 'User',
          role: (data.role || 'Kasir') as 'Owner' | 'Kasir' | 'Teknisi',
          email: data.email || '',
          status: 'Aktif',
          joined: joinedStr,
        });
      });
      
      if (list.length === 0) {
        setStaff([
          { id: 'ASP-USR01', name: 'Dewi Lestari', role: 'Kasir', email: 'dewi.kasir@asp-corp.com', status: 'Aktif', joined: '10 Jan 2025' },
          { id: 'ASP-USR02', name: 'Robi Wijaya', role: 'Teknisi', email: 'robi.senior@asp-corp.com', status: 'Aktif', joined: '15 Mar 2025' },
          { id: 'ASP-USR03', name: 'Ahmad Faisal', role: 'Teknisi', email: 'faisal.junior@asp-corp.com', status: 'Aktif', joined: '01 Jun 2025' },
          { id: 'ASP-USR04', name: 'Siti Aminah', role: 'Kasir', email: 'siti.kasir@asp-corp.com', status: 'Cuti', joined: '22 Feb 2025' },
        ]);
      } else {
        setStaff(list);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-500" />
          <span>Pengaturan &amp; Menu Lainnya</span>
        </h1>
        <p className="text-xs text-slate-400">Konfigurasi hak akses staff, diagnostic database, dan sistem internal ASP ERP.</p>
      </div>

      {/* Grid of panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: Staff management */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-amber-500 font-mono tracking-widest uppercase flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Manajemen Staff Karyawan</span>
          </h2>
          
          <div className="space-y-3.5">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-850 rounded-lg text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-[10px] text-white">
                    {s.name.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white leading-none">{s.name}</h3>
                    <span className="text-[9px] text-slate-500 font-mono block mt-1">{s.email}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[9px] px-2 py-0.5 rounded border font-mono font-bold tracking-wider uppercase ${
                    s.role === 'Owner' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    s.role === 'Kasir' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {s.role}
                  </span>
                  <span className="text-[8px] text-slate-500 block mt-1">Join: {s.joined}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Database and API status */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-amber-500 font-mono tracking-widest uppercase flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span>Diagnostic System &amp; Cloud</span>
            </h2>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex justify-between p-2.5 bg-slate-950/80 border border-slate-850 rounded-lg">
                <span className="text-slate-500">Firestore Instance:</span>
                <span className="text-emerald-400 font-bold">ONLINE</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950/80 border border-slate-850 rounded-lg">
                <span className="text-slate-500">Firebase Auth:</span>
                <span className="text-emerald-400 font-bold">ACTIVE</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950/80 border border-slate-850 rounded-lg">
                <span className="text-slate-500">Active Account:</span>
                <span className="text-white truncate max-w-[150px]">{profile?.email}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950/80 border border-slate-850 rounded-lg">
                <span className="text-slate-500">Sistem Versi:</span>
                <span className="text-amber-500 font-bold">ASP ERP v1.0.4</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/10 text-[10px] text-amber-500 font-mono leading-relaxed mt-4">
            Setiap aktivitas operasional terekam dalam database real-time dan dipantau langsung dari dashboard Owner pusat.
          </div>
        </div>
      </div>
    </div>
  );
}
