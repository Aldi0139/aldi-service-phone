import React, { useState, useEffect } from 'react';
import { useFirebase } from './FirebaseProvider';
import { 
  PlusCircle, 
  Search, 
  Smartphone, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  User, 
  Tag 
} from 'lucide-react';
import { db, handleFirestoreError } from '../lib/firebase';
import { 
  collection, 
  setDoc, 
  doc, 
  addDoc,
  updateDoc,
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { OperationType } from '../types';

interface ServiceItem {
  id: string;
  customerName: string;
  phoneModel: string;
  issue: string;
  cost: number;
  status: string; // 'SIAP DIAMBIL' | 'SEDANG DIPERBAIKI'
  originalStatus: string;
}

export default function KasirDashboard() {
  const { profile, user } = useFirebase();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeServicePickups, setActiveServicePickups] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [phoneModel, setPhoneModel] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('service_ringan');

  // Load active services from Firestore
  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ServiceItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const statusVal = data.status;
        
        // Map Firestore service status to cashier statuses
        let statusStr = 'SEDANG DIPERBAIKI';
        if (statusVal === 'Selesai') {
          statusStr = 'SIAP DIAMBIL';
        } else if (statusVal === 'Sudah Diambil') {
          return; // Skip already picked up & fully settled jobs
        } else if (statusVal === 'Menunggu Sparepart') {
          statusStr = 'SEDANG DIPERBAIKI';
        }

        list.push({
          id: doc.id,
          customerName: data.customerName || '',
          phoneModel: data.phoneModel || '',
          issue: data.issue || '',
          cost: Number(data.price) || 0,
          status: statusStr,
          originalStatus: statusVal,
        });
      });
      setActiveServicePickups(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching services:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phoneModel || !price) {
      alert('Tolong lengkapi semua field!');
      return;
    }

    const priceNum = Number(price) || 0;
    const now = new Date();

    if (category === 'pembelian_aksesoris' || category === 'pembelian_part') {
      // Direct sale: save to kas_records
      const recordId = 'ASP-K' + Date.now();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      const catLabel = category === 'pembelian_aksesoris' ? 'Aksesoris' : 'Operasional'; // match schema categories

      const kasItem = {
        type: 'masuk',
        amount: priceNum,
        description: `${category === 'pembelian_aksesoris' ? 'Aksesoris' : 'Part'}: ${phoneModel} (Pelanggan: ${customerName})`,
        category: catLabel,
        time: timeStr,
        createdBy: user?.email || 'Anonymous',
        createdAt: now,
        updatedAt: now,
      };

      try {
        await setDoc(doc(db, 'kas_records', recordId), kasItem);
        alert(`Transaksi langsung ${catLabel} berhasil disimpan!`);
        setCustomerName('');
        setPhoneModel('');
        setPrice('');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `kas_records/${recordId}`);
      }
    } else {
      // Service job: save to services
      const serviceId = 'ASP-' + Math.floor(1000 + Math.random() * 9000);
      
      const newService = {
        customerName,
        customerPhone: '',
        phoneBrand: 'Generic',
        phoneModel,
        imei: '',
        issue: category === 'service_ringan' ? 'Service Ringan (Software/Baterai)' : 'Service Berat (LCD/IC/Mati Total)',
        estimatedCost: priceNum,
        capitalCost: 0,
        price: priceNum,
        profit: priceNum, // profit starts as price (before capital cost is entered)
        entryDate: now,
        technician: 'Belum Ditunjuk',
        notes: 'Input cepat dari Kasir Utama.',
        status: 'Proses',
        createdBy: user?.email || 'Anonymous',
        createdAt: now,
        updatedAt: now,
      };

      try {
        await setDoc(doc(db, 'services', serviceId), newService);
        alert(`Service HP baru ${serviceId} berhasil dicatat!`);
        setCustomerName('');
        setPhoneModel('');
        setPrice('');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `services/${serviceId}`);
      }
    }
  };

  const handlePay = async (item: ServiceItem) => {
    const now = new Date();
    try {
      // 1. Update status in services
      await updateDoc(doc(db, 'services', item.id), {
        status: 'Sudah Diambil',
        pickupDate: now,
        updatedAt: now,
      });

      // 2. Log payment into kas_records
      const recordId = 'ASP-K' + Date.now();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      
      const kasItem = {
        type: 'masuk',
        amount: item.cost,
        description: `Pelunasan Service Selesai: ${item.id} - ${item.phoneModel} (${item.customerName})`,
        category: 'Service',
        time: timeStr,
        createdBy: user?.email || 'Anonymous',
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'kas_records', recordId), kasItem);
      alert(`Pembayaran ${item.id} sebesar ${formatCurrency(item.cost)} sukses dicatat di Buku Kas!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `services/${item.id}`);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const filteredPickups = activeServicePickups.filter(p => 
    p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phoneModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Kasir Utama (ASP)</h1>
        <p className="text-xs text-slate-400">Selamat bekerja, {profile?.displayName}. Kelola transaksi masuk, pembayaran, dan penyerahan unit service.</p>
      </div>

      {/* QUICK TRANSACTION ACTION (NO OWNER FINANCE LOGS SHOWN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* NEW SALES FORM / QUICK CASHIER DRAFT */}
        <form onSubmit={handleSubmit} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
          <h2 className="text-xs font-bold text-amber-500 font-mono tracking-widest uppercase mb-4 flex items-center gap-2">
            <span>●</span> INPUT TRANSAKSI CEPAT
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-wider block mb-1">Nama Pelanggan</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masukkan nama pelanggan..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-wider block mb-1">Tipe Handphone</label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={phoneModel}
                    onChange={(e) => setPhoneModel(e.target.value)}
                    placeholder="Contoh: iPhone 11"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-wider block mb-1">Biaya / Harga</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">Rp</span>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-wider block mb-1">Kategori Layanan</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="service_ringan">Service Ringan (Software, Ganti Baterai, dll)</option>
                <option value="service_berat">Service Berat (Ganti LCD, IC Power, Mati Total)</option>
                <option value="pembelian_aksesoris">Pembelian Aksesoris / Tempered Glass</option>
                <option value="pembelian_part">Pembelian Suku Cadang</option>
              </select>
            </div>

            <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
              <PlusCircle className="w-4 h-4" />
              <span>Simpan &amp; Cetak Nota</span>
            </button>
          </div>
        </form>

        {/* CUSTOMER PICKUP & SERVICE QUEUE LOOKUP */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-amber-500 font-mono tracking-widest uppercase mb-4 flex items-center gap-2">
              <span>●</span> PENGAMBILAN UNIT SERVICE
            </h2>

            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Nota, Nama Pelanggan, atau Model HP..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {loading ? (
                <p className="text-xs text-slate-500 text-center py-6 font-mono">Memuat antrian dari cloud...</p>
              ) : filteredPickups.map((p) => (
                <div key={p.id} className="p-3.5 bg-slate-950/50 hover:bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-500 font-mono">{p.id}</span>
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        p.status === 'SIAP DIAMBIL' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <span className="font-bold text-white text-xs block mt-1">{p.customerName} - {p.phoneModel}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Diagnosa: {p.issue}</span>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-xs font-bold text-white font-mono block">
                      {formatCurrency(p.cost)}
                    </span>
                    {p.status === 'SIAP DIAMBIL' && (
                      <button 
                        onClick={() => handlePay(p)}
                        className="mt-2 text-[10px] text-slate-950 font-bold bg-amber-500 hover:bg-amber-400 px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ml-auto"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Bayar</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!loading && filteredPickups.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6 font-mono">Tidak ada data penyerahan cocok.</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-850/80 mt-4 text-xs text-slate-500 flex items-center justify-between">
            <span className="font-semibold text-[10px] uppercase font-mono">Nota Aktif di Kasir: {filteredPickups.length}</span>
            <span className="text-[10px] font-mono">Real-time Cloud Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
