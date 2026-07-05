import { useState, useEffect } from 'react';
import { useFirebase } from './FirebaseProvider';
import { 
  Wrench, 
  Smartphone, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User, 
  CornerDownRight, 
  FileText 
} from 'lucide-react';
import { db, handleFirestoreError } from '../lib/firebase';
import { 
  collection, 
  doc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { OperationType } from '../types';

interface RepairTask {
  id: string;
  customerName: string;
  phoneModel: string;
  issue: string;
  status: 'DALAM ANTRIAN' | 'SEDANG DIPERBAIKI' | 'SELESAI';
  timeReceived: string;
  technicianNote: string;
}

export default function TeknisiDashboard() {
  const { profile, user } = useFirebase();
  const [activeTaskFilter, setActiveTaskFilter] = useState<'semua' | 'antrian' | 'pengerjaan'>('semua');
  const [repairTasks, setRepairTasks] = useState<RepairTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to services collection
  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks: RepairTask[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const statusVal = data.status;

        // Only include active repair workshop items (skip Sudah Diambil if completed)
        if (statusVal === 'Sudah Diambil') return;

        let statusStr: 'DALAM ANTRIAN' | 'SEDANG DIPERBAIKI' | 'SELESAI' = 'DALAM ANTRIAN';
        if (statusVal === 'Selesai') {
          statusStr = 'SELESAI';
        } else if (data.technician && data.technician !== 'Belum Ditunjuk') {
          statusStr = 'SEDANG DIPERBAIKI';
        }

        const dateObj = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

        tasks.push({
          id: doc.id,
          customerName: data.customerName || '',
          phoneModel: data.phoneModel || '',
          issue: data.issue || '',
          status: statusStr,
          timeReceived: timeStr,
          technicianNote: data.notes || '',
        });
      });
      setRepairTasks(tasks);
      setLoading(false);
    }, (error) => {
      console.error("Error loading services for teknisi:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleTakeJob = async (id: string) => {
    const name = profile?.displayName || user?.email || 'Teknisi';
    try {
      await updateDoc(doc(db, 'services', id), {
        technician: name,
        updatedAt: new Date(),
      });
      alert(`Job ${id} berhasil diambil oleh Anda!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `services/${id}`);
    }
  };

  const handleEditNote = async (id: string) => {
    const currentTask = repairTasks.find(t => t.id === id);
    const note = window.prompt("Edit Catatan Teknisi / Progress:", currentTask?.technicianNote || '');
    if (note === null) return; // cancelled

    try {
      await updateDoc(doc(db, 'services', id), {
        notes: note,
        updatedAt: new Date(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `services/${id}`);
    }
  };

  const handleFinishJob = async (id: string) => {
    try {
      await updateDoc(doc(db, 'services', id), {
        status: 'Selesai',
        updatedAt: new Date(),
      });
      alert(`Job ${id} telah ditandai SELESAI dan siap diambil!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `services/${id}`);
    }
  };

  const filteredTasks = repairTasks.filter(t => {
    if (activeTaskFilter === 'antrian') return t.status === 'DALAM ANTRIAN';
    if (activeTaskFilter === 'pengerjaan') return t.status === 'SEDANG DIPERBAIKI';
    return true; // semua
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Bengkel &amp; Meja Teknisi (ASP)</h1>
        <p className="text-xs text-slate-400">Selamat bekerja, {profile?.displayName}. Kelola antrian perbaikan handphone, tulis diagnosa, dan selesaikan pekerjaan.</p>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTaskFilter('semua')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeTaskFilter === 'semua'
              ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          Semua Job ({repairTasks.length})
        </button>
        <button
          onClick={() => setActiveTaskFilter('antrian')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeTaskFilter === 'antrian'
              ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          Antrian Baru ({repairTasks.filter(t => t.status === 'DALAM ANTRIAN').length})
        </button>
        <button
          onClick={() => setActiveTaskFilter('pengerjaan')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeTaskFilter === 'pengerjaan'
              ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          Sedang Dikerjakan ({repairTasks.filter(t => t.status === 'SEDANG DIPERBAIKI').length})
        </button>
      </div>

      {/* ACTIVE REPAIR QUEUE LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LIST SECTION */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xs font-bold text-amber-500 font-mono tracking-widest uppercase mb-4 flex items-center gap-2">
            <span>●</span> DAFTAR PEKERJAAN AKTIF
          </h2>

          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {filteredTasks.map((t) => (
              <div 
                key={t.id} 
                className={`p-4 bg-slate-950 border rounded-xl transition-all ${
                  t.status === 'SEDANG DIPERBAIKI' ? 'border-amber-500/40 bg-slate-950/90 shadow-lg shadow-amber-500/5' :
                  t.status === 'SELESAI' ? 'border-emerald-500/20 opacity-70' :
                  'border-slate-850'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-500 font-mono">{t.id}</span>
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t.timeReceived}
                    </span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    t.status === 'SEDANG DIPERBAIKI' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    t.status === 'DALAM ANTRIAN' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {t.status}
                  </span>
                </div>

                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4.5 h-4.5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">{t.phoneModel}</h3>
                    <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      Pelanggan: {t.customerName}
                    </p>
                  </div>
                </div>

                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-850/40 text-[10px] mb-3">
                  <span className="text-slate-400 font-bold block mb-0.5">Kerusakan Utama:</span>
                  <span className="text-slate-300 block">{t.issue}</span>
                </div>

                {t.technicianNote && (
                  <div className="flex items-start gap-1.5 text-[9px] text-amber-400/90 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                    <CornerDownRight className="w-3 h-3 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase font-mono tracking-wider block">Catatan Teknisi:</span>
                      <span>{t.technicianNote}</span>
                    </div>
                  </div>
                )}

                {/* Technician controls */}
                {t.status !== 'SELESAI' && (
                  <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-slate-850/50">
                    {t.status === 'DALAM ANTRIAN' ? (
                      <button 
                        onClick={() => handleTakeJob(t.id)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] transition-all"
                      >
                        Ambil Job &amp; Kerjakan
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEditNote(t.id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold rounded-lg text-[10px] transition-all"
                        >
                          Edit Catatan
                        </button>
                        <button 
                          onClick={() => handleFinishJob(t.id)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[10px] transition-all flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Selesai Repair</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* REPAIR LOGS & QUALITY ASSURANCE */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-amber-500 font-mono tracking-widest uppercase mb-4 flex items-center gap-2">
              <span>●</span> STANDAR OPERASIONAL PROSEDUR (SOP)
            </h2>

            <div className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
                  <span className="text-xs font-bold font-mono">1</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Cek Kondisi Fisik Awal</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Uji layar, kamera, fingerprint, tombol volume, dan wifi sebelum membongkar unit handphone pelanggan.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
                  <span className="text-xs font-bold font-mono">2</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Catat No. Seri / IMEI &amp; Kerusakan</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Selalu catat IMEI dan pastikan suku cadang yang akan diganti sesuai kode pabrik HP agar terhindar dari ketidakcocokan part.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
                  <span className="text-xs font-bold font-mono">3</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Quality Control (QC) &amp; Cleaning</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Setelah perbaikan selesai, lakukan test ulang fungsi utama, bersihkan lem sisa casing belakang, lalu serahkan status ke Kasir.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-[10px] text-slate-400 leading-normal">
              Butuh komponen atau IC khusus yang kosong di laci stok? Beritahu Owner segera untuk dicarikan dari distributor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
