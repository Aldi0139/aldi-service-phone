import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Coins, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  PlusCircle, 
  MinusCircle, 
  AlertCircle 
} from 'lucide-react';
import { db, handleFirestoreError } from '../lib/firebase';
import { 
  collection, 
  setDoc, 
  doc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { useFirebase } from './FirebaseProvider';
import { OperationType } from '../types';

interface LedgerItem {
  id: string;
  type: 'masuk' | 'keluar';
  amount: number;
  description: string;
  time: string;
  category: 'Service' | 'PPOB' | 'Aksesoris' | 'Operasional' | 'Piutang' | 'Lainnya';
}

export default function KasView() {
  const { user } = useFirebase();
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'masuk' | 'keluar'>('masuk');
  
  // Ledger Input Form states
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState<'Service' | 'PPOB' | 'Aksesoris' | 'Operasional' | 'Piutang' | 'Lainnya'>('Service');

  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time updates from Firestore kas_records collection
  useEffect(() => {
    const q = query(collection(db, 'kas_records'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: LedgerItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          type: data.type as 'masuk' | 'keluar',
          amount: Number(data.amount) || 0,
          description: data.description || '',
          time: data.time || '',
          category: data.category as any,
        });
      });
      setLedger(list);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Subscribe Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Aggregate stats based on current list state
  const cashIn = ledger.filter(l => l.type === 'masuk').reduce((acc, l) => acc + l.amount, 0);
  const cashOut = ledger.filter(l => l.type === 'keluar').reduce((acc, l) => acc + l.amount, 0);
  const netBalance = cashIn - cashOut;

  const handleAddLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !desc) return;

    const recordId = 'ASP-K' + Date.now();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const newItem = {
      type: formType,
      amount: Number(amount) || 0,
      description: desc,
      category: cat,
      time: timeStr,
      createdBy: user?.email || 'Anonymous',
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'kas_records', recordId), newItem);
      // reset form
      setAmount('');
      setDesc('');
      setShowForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `kas_records/${recordId}`);
    }
  };

  const handleDeleteLedger = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'kas_records', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `kas_records/${id}`);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <span>Kas Laci &amp; Buku Kasir</span>
          </h1>
          <p className="text-xs text-slate-400">Pantau arus uang masuk, biaya operasional keluar, dan mutasi saldo cash drawer.</p>
        </div>
        <button
          onClick={() => { setFormType('masuk'); setShowForm(true); }}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-amber-500/10 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Tambah Aliran Kas</span>
        </button>
      </div>

      {/* Cash Register Ledger Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Cash Balance */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl relative overflow-hidden">
          <span className="text-[10px] text-slate-500 font-bold block uppercase font-mono mb-1">Total Saldo Kas (Uang Laci)</span>
          <span className="text-2xl font-bold text-white block font-mono">{formatCurrency(netBalance)}</span>
          <span className="text-[10px] text-emerald-400 mt-2 block font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Aliran Kas Surplus Positif</span>
          </span>
          <div className="absolute right-3 top-3 bg-amber-500/10 w-9 h-9 rounded-lg flex items-center justify-center text-amber-500">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Total Cash Inflow */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase font-mono mb-1">Total Kas Masuk</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(cashIn)}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Hari Ini</span>
          </div>
          <div className="bg-emerald-500/10 w-10 h-10 rounded-xl flex items-center justify-center text-emerald-400">
            <ArrowDownCircle className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Total Cash Outflow */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase font-mono mb-1">Total Kas Keluar</span>
            <span className="text-xl font-bold text-red-400 font-mono">{formatCurrency(cashOut)}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Bahan &amp; Operasional</span>
          </div>
          <div className="bg-red-500/10 w-10 h-10 rounded-xl flex items-center justify-center text-red-400">
            <ArrowUpCircle className="w-5.5 h-5.5" />
          </div>
        </div>
      </div>

      {/* Quick Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => { setFormType('masuk'); setShowForm(true); }}
          className="flex-1 py-2.5 px-3 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 text-emerald-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Uang Masuk / Pembayaran</span>
        </button>
        <button
          onClick={() => { setFormType('keluar'); setShowForm(true); }}
          className="flex-1 py-2.5 px-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 text-red-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
        >
          <MinusCircle className="w-4 h-4" />
          <span>Uang Keluar / Operasional</span>
        </button>
      </div>

      {/* Ledger History List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-xs font-bold text-amber-500 font-mono tracking-widest uppercase mb-4 flex items-center gap-2">
          <span>●</span> CATATAN MUTASI TERAKHIR
        </h2>

        <div className="divide-y divide-slate-800/60 text-xs">
          {ledger.map((l) => (
            <div key={l.id} className="py-3.5 flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  l.type === 'masuk' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {l.type === 'masuk' ? <ArrowDownCircle className="w-4.5 h-4.5" /> : <ArrowUpCircle className="w-4.5 h-4.5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-[11px] sm:text-xs leading-none">{l.description}</span>
                    <span className="text-[9px] bg-slate-950 px-2 py-0.5 border border-slate-850 text-slate-400 rounded-full font-mono uppercase tracking-wider">{l.category}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono block mt-1">ID: {l.id} | {l.time}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`font-bold font-mono text-xs sm:text-sm ${
                  l.type === 'masuk' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {l.type === 'masuk' ? '+' : '-'}{formatCurrency(l.amount)}
                </span>
                <button
                  onClick={() => handleDeleteLedger(l.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {ledger.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              <Coins className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs font-mono">Buku kas kosong. Belum ada pencatatan mutasi.</p>
            </div>
          )}
        </div>
      </div>

      {/* STATEFUL MODAL TO WRITE ENTRY */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xs text-white uppercase tracking-widest font-mono flex items-center gap-1">
                <span>●</span> CATAT ALIRAN KAS: <span className={formType === 'masuk' ? 'text-emerald-400' : 'text-red-400'}>{formType}</span>
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white font-mono text-xs">×</button>
            </div>

            <form onSubmit={handleAddLedger} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block mb-1">JUMLAH NOMINAL (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">Rp</span>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-xs text-white placeholder-slate-600 font-bold font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block mb-1">KATEGORI</label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="Service">Service (Pembayaran Repair)</option>
                  <option value="PPOB">PPOB (Pulsa/PLN)</option>
                  <option value="Aksesoris">Aksesoris (Tempered Glass/Casing)</option>
                  <option value="Operasional">Operasional (Alat Bengkel/Uang Makan)</option>
                  <option value="Piutang">Piutang (Setoran Piutang Sales)</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block mb-1">Keterangan / Deskripsi</label>
                <input
                  type="text"
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Contoh: Beli solder baru goot..."
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-850 text-slate-500 text-xs font-semibold rounded-lg border border-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 font-bold rounded-lg text-xs transition-colors ${
                    formType === 'masuk' ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' : 'bg-red-500 hover:bg-red-400 text-slate-950'
                  }`}
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
