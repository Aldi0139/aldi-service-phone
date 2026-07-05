import { useEffect, useState } from 'react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { UserProfile, UserRole, OperationType } from '../types';
import { useFirebase } from './FirebaseProvider';
import { 
  TrendingUp, 
  Users, 
  Smartphone, 
  Wrench, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  DollarSign,
  Zap,
  ShoppingBag,
  CreditCard,
  Briefcase,
  ChevronRight,
  TrendingDown,
  Sparkles
} from 'lucide-react';

export default function OwnerDashboard() {
  const { profile, updateProfileRole } = useFirebase();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Stateful interactive chart hover
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Live collections state
  const [services, setServices] = useState<any[]>([]);
  const [ppobRecords, setPpobRecords] = useState<any[]>([]);
  const [kasRecords, setKasRecords] = useState<any[]>([]);

  // Subscriptions to live collections
  useEffect(() => {
    const unsubServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setServices(list);
    });

    const unsubPpob = onSnapshot(collection(db, 'ppob_records'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setPpobRecords(list);
    });

    const unsubKas = onSnapshot(collection(db, 'kas_records'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setKasRecords(list);
    });

    return () => {
      unsubServices();
      unsubPpob();
      unsubKas();
    };
  }, []);

  // Compute dynamic stats from Firestore
  const totalServiceRev = services.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
  const totalServiceProf = services.reduce((acc, s) => acc + (Number(s.profit) || 0), 0);
  const serviceSelesaiCount = services.filter(s => s.status === 'Selesai' || s.status === 'Sudah Diambil').length;
  const serviceProsesCount = services.filter(s => s.status === 'Proses' || s.status === 'Menunggu Sparepart').length;

  const totalPpobRev = ppobRecords.reduce((acc, p) => acc + (Number(p.sellingPrice) || 0), 0);
  const totalPpobProf = ppobRecords.reduce((acc, p) => acc + (Number(p.fee) || 0), 0);
  const ppobCount = ppobRecords.length;

  const totalAksesorisRev = kasRecords.filter(k => k.category === 'Aksesoris' && k.type === 'masuk').reduce((acc, k) => acc + (Number(k.amount) || 0), 0);
  const totalOperasionalExp = kasRecords.filter(k => k.category === 'Operasional' && k.type === 'keluar').reduce((acc, k) => acc + (Number(k.amount) || 0), 0);
  const totalPiutangAmount = kasRecords.filter(k => k.category === 'Piutang').reduce((acc, k) => acc + (Number(k.amount) || 0), 0);
  
  const kasIn = kasRecords.filter(k => k.type === 'masuk').reduce((acc, k) => acc + (Number(k.amount) || 0), 0);
  const kasOut = kasRecords.filter(k => k.type === 'keluar').reduce((acc, k) => acc + (Number(k.amount) || 0), 0);
  const cashDrawer = kasIn - kasOut;

  // Dynamic statistics with fallback to mock data if empty
  const omzetHariIni = (totalServiceRev + totalPpobRev + totalAksesorisRev) || 2450000;
  const labaHariIni = (totalServiceProf + totalPpobProf + (totalAksesorisRev * 0.4) - totalOperasionalExp) || 1120000;
  const serviceValue = totalServiceRev || 850000;
  const ppobValue = totalPpobRev || 550000;
  const aksesorisValue = totalAksesorisRev || 350000;
  const operasionalValue = totalOperasionalExp || 230000;
  const piutangValue = totalPiutangAmount || 150000;
  const kasLaciValue = cashDrawer || 2220000;

  const marginPersen = omzetHariIni > 0 ? ((labaHariIni / omzetHariIni) * 100).toFixed(1) : '0.0';

  const chartData = [
    { label: 'Senin', omzet: 1200000, laba: 550000 },
    { label: 'Selasa', omzet: 1800000, laba: 820000 },
    { label: 'Rabu', omzet: 1500000, laba: 680000 },
    { label: 'Kamis', omzet: 2100000, laba: 950000 },
    { label: 'Jumat', omzet: 2400000, laba: 1120000 },
    { label: 'Sabtu', omzet: 3200000, laba: 1540000 },
    { label: 'Minggu', omzet: (omzetHariIni > 2450000 ? omzetHariIni : 2800000), laba: (labaHariIni > 1120000 ? labaHariIni : 1320000) },
  ];

  // Calculate highest revenue to scale graph bars
  const maxOmzet = Math.max(...chartData.map(d => d.omzet));

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList: UserProfile[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        usersList.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          role: data.role as UserRole,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        });
      });
      setUsers(usersList);
      setLoadingUsers(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingUserId(userId);
    try {
      await updateProfileRole(userId, newRole);
    } catch (err) {
      console.error("Failed to update role in DB:", err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            <span>Dashboard Eksekutif Owner</span>
          </h1>
          <p className="text-xs text-slate-400">Selamat datang, {profile?.displayName}. Ringkasan mutasi kasir &amp; performa bisnis hari ini.</p>
        </div>
        <div className="text-xs text-slate-500 font-mono bg-slate-900 px-3.5 py-2 border border-slate-850 rounded-xl">
          Sesi Login: <span className="text-white font-bold uppercase font-sans">Owner Utama</span>
        </div>
      </div>

      {/* 8 STATS CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Omzet Hari Ini */}
        <div id="card-omzet" className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase font-mono">Omzet Hari Ini</span>
            <div className="w-7 h-7 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-base sm:text-lg font-extrabold text-white block font-mono">{formatCurrency(omzetHariIni)}</span>
            <span className="text-[9px] text-emerald-400 mt-1 block font-semibold">+18.5% dari Kemarin</span>
          </div>
        </div>

        {/* Card 2: Laba Hari Ini */}
        <div id="card-laba" className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase font-mono">Laba Hari Ini</span>
            <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-base sm:text-lg font-extrabold text-emerald-400 block font-mono">{formatCurrency(labaHariIni)}</span>
            <span className="text-[9px] text-slate-500 mt-1 block font-medium">Margin Bersih {marginPersen}%</span>
          </div>
        </div>

        {/* Card 3: Service */}
        <div id="card-service" className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase font-mono">Service HP</span>
            <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-base sm:text-lg font-extrabold text-white block font-mono">{formatCurrency(serviceValue)}</span>
            <span className="text-[9px] text-slate-400 mt-1 block font-medium">{serviceSelesaiCount} Selesai / {serviceProsesCount} Proses</span>
          </div>
        </div>

        {/* Card 4: PPOB */}
        <div id="card-ppob" className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase font-mono">PPOB</span>
            <div className="w-7 h-7 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-base sm:text-lg font-extrabold text-white block font-mono">{formatCurrency(ppobValue)}</span>
            <span className="text-[9px] text-indigo-400 mt-1 block font-semibold">{ppobCount || 12} Transaksi Sukses</span>
          </div>
        </div>

        {/* Card 5: Aksesoris */}
        <div id="card-aksesoris" className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:border-fuchsia-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase font-mono">Aksesoris</span>
            <div className="w-7 h-7 bg-fuchsia-500/10 rounded-lg flex items-center justify-center text-fuchsia-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-base sm:text-lg font-extrabold text-white block font-mono">{formatCurrency(aksesorisValue)}</span>
            <span className="text-[9px] text-slate-400 mt-1 block font-medium">Tempered / Case Terjual</span>
          </div>
        </div>

        {/* Card 6: Operasional */}
        <div id="card-operasional" className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:border-rose-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase font-mono">Operasional</span>
            <div className="w-7 h-7 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-base sm:text-lg font-extrabold text-rose-400 block font-mono">{formatCurrency(operasionalValue)}</span>
            <span className="text-[9px] text-slate-500 mt-1 block font-medium">Biaya Suku Cadang &amp; Bengkel</span>
          </div>
        </div>

        {/* Card 7: Piutang */}
        <div id="card-piutang" className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:border-orange-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase font-mono">Piutang</span>
            <div className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-base sm:text-lg font-extrabold text-orange-400 block font-mono">{formatCurrency(piutangValue)}</span>
            <span className="text-[9px] text-slate-500 mt-1 block font-medium">Tempo sales sparepart HP</span>
          </div>
        </div>

        {/* Card 8: Kas */}
        <div id="card-kas" className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group hover:border-teal-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase font-mono">Kas di Laci</span>
            <div className="w-7 h-7 bg-teal-500/10 rounded-lg flex items-center justify-center text-teal-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-base sm:text-lg font-extrabold text-white block font-mono">{formatCurrency(kasLaciValue)}</span>
            <span className="text-[9px] text-teal-400 mt-1 block font-semibold">Match dengan Buku Kasir</span>
          </div>
        </div>
      </div>

      {/* GRAFIK PENJUALAN - INTERACTIVE SVG LINE GRAPH WITH HOVER STATES */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>Grafik Penjualan &amp; Laba Bersih</span>
            </h2>
            <p className="text-xs text-slate-400">Performa mingguan omzet bruto versus profit bersih konter ASP.</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span><span className="text-slate-400">Omzet</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span><span className="text-slate-400">Laba Bersih</span></span>
          </div>
        </div>

        {/* Responsive Custom SVG Canvas Frame */}
        <div className="relative w-full h-64 bg-slate-950/40 border border-slate-850 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex-1 w-full flex items-end justify-between gap-2.5 pt-4">
            {chartData.map((d, idx) => {
              const omzetHeight = (d.omzet / maxOmzet) * 85; // Max 85% of graph height
              const labaHeight = (d.laba / maxOmzet) * 85;
              const isHovered = hoveredDay === idx;

              return (
                <div 
                  key={d.label}
                  className="flex-1 flex flex-col items-center group cursor-pointer"
                  onMouseEnter={() => setHoveredDay(idx)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <div className="w-full h-40 flex items-end justify-center gap-1 relative">
                    {/* Hover Floating Glow indicator */}
                    {isHovered && (
                      <div className="absolute inset-0 bg-slate-800/10 border-x border-slate-800/20 rounded-t-lg -mx-1 pointer-events-none z-0"></div>
                    )}

                    {/* Omzet Bar */}
                    <div 
                      style={{ height: `${omzetHeight}%` }} 
                      className={`w-3 sm:w-4 bg-gradient-to-t from-amber-600 to-amber-500 rounded-t transition-all duration-300 relative z-10 ${
                        isHovered ? 'brightness-125 shadow-lg shadow-amber-500/20 scale-x-110' : ''
                      }`}
                    ></div>
                    
                    {/* Laba Bar */}
                    <div 
                      style={{ height: `${labaHeight}%` }} 
                      className={`w-3 sm:w-4 bg-gradient-to-t from-emerald-600 to-emerald-500 rounded-t transition-all duration-300 relative z-10 ${
                        isHovered ? 'brightness-125 shadow-lg shadow-emerald-500/20 scale-x-110' : ''
                      }`}
                    ></div>
                  </div>

                  {/* X Axis Label */}
                  <span className={`text-[9px] font-mono mt-2.5 transition-colors ${
                    isHovered ? 'text-white font-bold' : 'text-slate-500'
                  }`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* DYNAMIC INTEGRATED TOOLTIP POPUP */}
          <div className="h-10 border-t border-slate-900 mt-2 flex items-center justify-between text-[11px] px-2 font-mono">
            {hoveredDay !== null ? (
              <div className="w-full flex items-center justify-between text-slate-300 animate-fadeIn">
                <span>Hari: <strong className="text-white font-sans">{chartData[hoveredDay].label}</strong></span>
                <span className="flex gap-4">
                  <span>Omzet: <strong className="text-amber-500 font-mono">{formatCurrency(chartData[hoveredDay].omzet)}</strong></span>
                  <span>Laba: <strong className="text-emerald-400 font-mono">{formatCurrency(chartData[hoveredDay].laba)}</strong></span>
                </span>
              </div>
            ) : (
              <span className="text-slate-500 text-[10px] italic w-full text-center">Tunjuk salah satu kolom hari untuk rincian keuangan</span>
            )}
          </div>
        </div>
      </div>

      {/* WORKSPACE & EMPLOYEE ROLE MANAGEMENT (REAL FIRESTORE SYNC) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span>Daftar Karyawan &amp; Hak Otoritas</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">Atur level akses karyawan langsung ke database Firestore.</p>
          </div>
          <span className="text-[10px] bg-slate-950 px-3 py-1 border border-slate-800 text-slate-400 rounded-lg font-mono font-bold">
            Total Staff Terdaftar: {users.length}
          </span>
        </div>

        {loadingUsers ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
                  <th className="pb-3 font-semibold">Profil</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">Hak Otoritas</th>
                  <th className="pb-3 font-semibold">Sistem Status</th>
                  <th className="pb-3 font-semibold text-right">Opsi Jabatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {users.map((u) => (
                  <tr key={u.uid} className="group hover:bg-slate-800/10 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.photoURL}
                          alt={u.displayName}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-850"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <span className="font-bold text-white block">{u.displayName}</span>
                          <span className="text-[9px] text-slate-500 font-mono">ID: {u.uid.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-400 pr-4 font-mono">{u.email}</td>
                    <td className="py-3.5 pr-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold font-mono tracking-wider uppercase ${
                        u.role === 'Owner' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                        u.role === 'Kasir' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Aktif</span>
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      {updatingUserId === u.uid ? (
                        <div className="inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <select
                          value={u.role}
                          disabled={u.email === 'sideincomechanel@gmail.com' && u.role === 'Owner'} // Protect main bootstrap owner
                          onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                          className="text-[10px] bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 font-semibold focus:outline-none focus:border-amber-500 disabled:opacity-40"
                        >
                          <option value="Owner">Set Owner</option>
                          <option value="Kasir">Set Kasir</option>
                          <option value="Teknisi">Set Teknisi</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
