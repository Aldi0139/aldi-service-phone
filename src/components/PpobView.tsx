import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Search, 
  Plus, 
  Calendar, 
  Coins, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Edit, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  User, 
  Hash, 
  DollarSign, 
  X,
  Filter,
  Layers,
  HelpCircle
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
import { PpobRecord, OperationType } from '../types';

export default function PpobView() {
  const { user, profile } = useFirebase();
  const [records, setRecords] = useState<PpobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search and Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');

  // Modal Control States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Active items for editing or deleting
  const [selectedRecord, setSelectedRecord] = useState<PpobRecord | null>(null);

  // Form Field States
  const [shiftName, setShiftName] = useState('Shift Pagi');
  const [transactionCount, setTransactionCount] = useState<string>('0');
  const [sellingPrice, setSellingPrice] = useState<string>('0');
  const [cashWithdrawal, setCashWithdrawal] = useState<string>('0');
  const [incomingBalance, setIncomingBalance] = useState<string>('0');
  const [endingBalance, setEndingBalance] = useState<string>('0');
  const [customStartingBalance, setCustomStartingBalance] = useState<string>('176691'); // Default fallback for first record

  // Subscribe to real-time updates from Firestore ppob_records collection
  useEffect(() => {
    const q = query(collection(db, 'ppob_records'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: PpobRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        const createdAtVal = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
        const updatedAtVal = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date();

        list.push({
          id: doc.id,
          shiftName: data.shiftName || '',
          transactionCount: Number(data.transactionCount) || 0,
          sellingPrice: Number(data.sellingPrice) || 0,
          cashWithdrawal: Number(data.cashWithdrawal) || 0,
          incomingBalance: Number(data.incomingBalance) || 0,
          startingBalance: Number(data.startingBalance) || 0,
          endingBalance: Number(data.endingBalance) || 0,
          basicPrice: Number(data.basicPrice) || 0,
          fee: Number(data.fee) || 0,
          physicalBalance: Number(data.physicalBalance) || 0,
          status: data.status || 'Normal',
          createdBy: data.createdBy || '',
          createdAt: createdAtVal,
          updatedAt: updatedAtVal,
        });
      });
      setRecords(list);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Subscribe Error:", error);
      setErrorMsg("Gagal memuat data dari database. Silakan periksa koneksi atau hak akses.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Determine starting balance automatically
  // If there are prior records, the Saldo Awal is the endingBalance of the most recent record
  const getAutomaticStartingBalance = () => {
    if (records.length > 0) {
      // records are sorted desc by createdAt, so records[0] is the most recent
      return records[0].endingBalance;
    }
    return Number(customStartingBalance) || 0;
  };

  const autoStartingBalance = getAutomaticStartingBalance();

  // Calculations for real-time display in ADD modal
  const addTxCount = Number(transactionCount) || 0;
  const addSellingPrice = Number(sellingPrice) || 0;
  const addCashWithdrawal = Number(cashWithdrawal) || 0;
  const addIncomingBalance = Number(incomingBalance) || 0;
  const addEndingBalance = Number(endingBalance) || 0;

  // Rumus:
  // Harga Dasar PPOB = Harga Jual - Tarik Tunai - Saldo Masuk
  const addBasicPrice = addSellingPrice - addCashWithdrawal - addIncomingBalance;
  // Fee PPOB = Harga Jual - Harga Dasar - Saldo Masuk
  const addFee = addSellingPrice - addBasicPrice - addIncomingBalance;
  // Saldo Fisik PPOB otomatis:
  // Saldo Fisik PPOB = Saldo Awal - Harga Dasar PPOB
  const addPhysicalBalance = autoStartingBalance - addBasicPrice;

  // Status PPOB: Normal, Fee Terlalu Rendah, Fee Terlalu Tinggi
  const calculateStatus = (feeVal: number, txCount: number): 'Normal' | 'Fee Terlalu Rendah' | 'Fee Terlalu Tinggi' => {
    if (txCount <= 0) return 'Normal';
    const averageFee = feeVal / txCount;
    if (averageFee < 1500) {
      return 'Fee Terlalu Rendah';
    } else if (averageFee > 5500) {
      return 'Fee Terlalu Tinggi';
    }
    return 'Normal';
  };

  const addStatus = calculateStatus(addFee, addTxCount);

  // Form states for EDIT Modal
  const [editShiftName, setEditShiftName] = useState('');
  const [editTxCount, setEditTxCount] = useState<string>('0');
  const [editSellingPrice, setEditSellingPrice] = useState<string>('0');
  const [editCashWithdrawal, setEditCashWithdrawal] = useState<string>('0');
  const [editIncomingBalance, setEditIncomingBalance] = useState<string>('0');
  const [editEndingBalance, setEditEndingBalance] = useState<string>('0');
  const [editStartingBalance, setEditStartingBalance] = useState<number>(0);

  const editBasicPriceVal = (Number(editSellingPrice) || 0) - (Number(editCashWithdrawal) || 0) - (Number(editIncomingBalance) || 0);
  const editFeeVal = (Number(editSellingPrice) || 0) - editBasicPriceVal - (Number(editIncomingBalance) || 0);
  const editPhysicalBalanceVal = editStartingBalance - editBasicPriceVal;
  const editStatusVal = calculateStatus(editFeeVal, Number(editTxCount) || 0);

  // Open add modal
  const openAddModal = () => {
    setShiftName('Shift Pagi');
    setTransactionCount('0');
    setSellingPrice('0');
    setCashWithdrawal('0');
    setIncomingBalance('0');
    setEndingBalance('0');
    setErrorMsg(null);
    setShowAddModal(true);
  };

  // Open edit modal
  const openEditModal = (record: PpobRecord) => {
    setSelectedRecord(record);
    setEditShiftName(record.shiftName);
    setEditTxCount(record.transactionCount.toString());
    setEditSellingPrice(record.sellingPrice.toString());
    setEditCashWithdrawal(record.cashWithdrawal.toString());
    setEditIncomingBalance(record.incomingBalance.toString());
    setEditEndingBalance(record.endingBalance.toString());
    setEditStartingBalance(record.startingBalance);
    setErrorMsg(null);
    setShowEditModal(true);
  };

  // Handle Save (Create) PPOB Record
  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName) {
      setErrorMsg("Nama Shift wajib diisi.");
      return;
    }

    const txNum = Number(transactionCount) || 0;
    const sellNum = Number(sellingPrice) || 0;
    const withdrawNum = Number(cashWithdrawal) || 0;
    const incomingNum = Number(incomingBalance) || 0;
    const endNum = Number(endingBalance) || 0;

    const calculatedBasic = sellNum - withdrawNum - incomingNum;
    const calculatedFee = sellNum - calculatedBasic - incomingNum;
    const calculatedPhysical = autoStartingBalance - calculatedBasic;
    const statusVal = calculateStatus(calculatedFee, txNum);

    const recordId = `PPOB-${Date.now()}`;

    try {
      const payload = {
        shiftName,
        transactionCount: txNum,
        sellingPrice: sellNum,
        cashWithdrawal: withdrawNum,
        incomingBalance: incomingNum,
        startingBalance: autoStartingBalance,
        endingBalance: endNum,
        basicPrice: calculatedBasic,
        fee: calculatedFee,
        physicalBalance: calculatedPhysical,
        status: statusVal,
        createdBy: user?.displayName || user?.email || 'Kasir',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(doc(db, 'ppob_records', recordId), payload);
      setShowAddModal(false);
    } catch (err) {
      console.error("Error creating PPOB record:", err);
      handleFirestoreError(err, OperationType.CREATE, 'ppob_records');
    }
  };

  // Handle Update PPOB Record
  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    if (!editShiftName) {
      setErrorMsg("Nama Shift wajib diisi.");
      return;
    }

    const txNum = Number(editTxCount) || 0;
    const sellNum = Number(editSellingPrice) || 0;
    const withdrawNum = Number(editCashWithdrawal) || 0;
    const incomingNum = Number(editIncomingBalance) || 0;
    const endNum = Number(editEndingBalance) || 0;

    const calculatedBasic = sellNum - withdrawNum - incomingNum;
    const calculatedFee = sellNum - calculatedBasic - incomingNum;
    const calculatedPhysical = editStartingBalance - calculatedBasic;
    const statusVal = calculateStatus(calculatedFee, txNum);

    try {
      const payload = {
        shiftName: editShiftName,
        transactionCount: txNum,
        sellingPrice: sellNum,
        cashWithdrawal: withdrawNum,
        incomingBalance: incomingNum,
        startingBalance: editStartingBalance,
        endingBalance: endNum,
        basicPrice: calculatedBasic,
        fee: calculatedFee,
        physicalBalance: calculatedPhysical,
        status: statusVal,
        createdBy: selectedRecord.createdBy,
        createdAt: Timestamp.fromDate(selectedRecord.createdAt),
        updatedAt: Timestamp.now()
      };

      await setDoc(doc(db, 'ppob_records', selectedRecord.id), payload);
      setShowEditModal(false);
    } catch (err) {
      console.error("Error updating PPOB record:", err);
      handleFirestoreError(err, OperationType.UPDATE, `ppob_records/${selectedRecord.id}`);
    }
  };

  // Handle Delete PPOB Record
  const handleDeleteRecord = async () => {
    if (!selectedRecord) return;
    try {
      await deleteDoc(doc(db, 'ppob_records', selectedRecord.id));
      setShowDeleteModal(false);
      setSelectedRecord(null);
    } catch (err) {
      console.error("Error deleting PPOB record:", err);
      handleFirestoreError(err, OperationType.DELETE, `ppob_records/${selectedRecord.id}`);
    }
  };

  // Filter records
  const filteredRecords = records.filter((rec) => {
    const matchesSearch = 
      rec.shiftName.toLowerCase().includes(search.toLowerCase()) || 
      rec.createdBy.toLowerCase().includes(search.toLowerCase()) ||
      rec.id.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = statusFilter === 'Semua' ? true : rec.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Aggregated Stats
  const totalTx = filteredRecords.reduce((sum, r) => sum + r.transactionCount, 0);
  const totalSelling = filteredRecords.reduce((sum, r) => sum + r.sellingPrice, 0);
  const totalWithdrawals = filteredRecords.reduce((sum, r) => sum + r.cashWithdrawal, 0);
  const totalIncoming = filteredRecords.reduce((sum, r) => sum + r.incomingBalance, 0);
  const totalBasicPrice = filteredRecords.reduce((sum, r) => sum + r.basicPrice, 0);
  const totalFeeEarned = filteredRecords.reduce((sum, r) => sum + r.fee, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Buku Catatan PPOB (Ledger Shift)</span>
          </h1>
          <p className="text-xs text-slate-400">Pencatatan saldo harian, setoran kasir, tarik tunai, fee transaksi, dan verifikasi saldo fisik otomatis.</p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
            title="SOP &amp; Petunjuk Rumus"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          
          <button
            onClick={openAddModal}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-2.5 px-5 rounded-xl shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5 stroke-[3]" />
            <span>Catat Buku PPOB Baru</span>
          </button>
        </div>
      </div>

      {/* ERROR MSG BANNER */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Terjadi Kesalahan:</span> {errorMsg}
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400/80 hover:text-rose-400 font-bold font-mono text-xs">OK</button>
        </div>
      )}

      {/* METRICS DASHBOARD (Bento Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Total Transaksi</span>
          <span className="text-lg font-bold text-slate-200 font-mono mt-1">{totalTx} Kali</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Total Jual PPOB</span>
          <span className="text-sm font-bold text-amber-400 font-mono mt-1">{formatCurrency(totalSelling)}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Total Tarik Tunai</span>
          <span className="text-sm font-bold text-sky-400 font-mono mt-1">{formatCurrency(totalWithdrawals)}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Saldo Masuk</span>
          <span className="text-sm font-bold text-indigo-400 font-mono mt-1">{formatCurrency(totalIncoming)}</span>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-emerald-400 font-bold block uppercase tracking-wider font-mono">Fee / Laba PPOB</span>
          <span className="text-sm font-extrabold text-emerald-400 font-mono mt-1">{formatCurrency(totalFeeEarned)}</span>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-amber-500 font-bold block uppercase tracking-wider font-mono">Saldo Terakhir</span>
          <span className="text-sm font-extrabold text-amber-500 font-mono mt-1">
            {records.length > 0 ? formatCurrency(records[0].endingBalance) : 'Rp 0'}
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari Nama Shift, ID Pencatatan, atau Kasir..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
          />
        </div>

        {/* Status Filter Badges */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['Semua', 'Normal', 'Fee Terlalu Rendah', 'Fee Terlalu Tinggi'].map((statusOption) => {
            const isActive = statusFilter === statusOption;
            const count = statusOption === 'Semua' 
              ? records.length 
              : records.filter(r => r.status === statusOption).length;

            return (
              <button
                key={statusOption}
                onClick={() => setStatusFilter(statusOption)}
                className={`text-[10px] md:text-xs font-bold py-2 px-3.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
                  isActive 
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/10' 
                    : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:text-white hover:border-slate-800'
                }`}
              >
                {statusOption} <span className={`ml-1 px-1.5 py-0.2 text-[9px] rounded-full ${isActive ? 'bg-slate-950 text-amber-500 font-bold' : 'bg-slate-900 text-slate-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RECORD LEDGER RENDER */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-mono">Menyelaraskan buku ledger PPOB dari database...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((rec) => {
            const discrepancy = rec.endingBalance - rec.physicalBalance;
            const averageFee = rec.transactionCount > 0 ? rec.fee / rec.transactionCount : 0;
            
            return (
              <div 
                key={rec.id} 
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 hover:bg-slate-900/90 transition-all duration-300 relative group"
              >
                {/* Record Header row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-850">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-colors shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-extrabold text-slate-400 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-lg">
                          {rec.id}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Mulai: {formatDate(rec.createdAt)}</span>
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-white mt-1">
                        {rec.shiftName} <span className="text-slate-500 font-medium text-xs">| Dicatat oleh: {rec.createdBy}</span>
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <span className={`text-[9px] px-2.5 py-1 rounded-lg border font-extrabold font-mono uppercase tracking-wider ${
                      rec.status === 'Normal' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      rec.status === 'Fee Terlalu Rendah' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {rec.status}
                    </span>
                  </div>
                </div>

                {/* Ledger Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4">
                  {/* Left Specs */}
                  <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">Jml Transaksi</span>
                      <p className="text-xs text-slate-200 font-mono font-bold mt-1">{rec.transactionCount} Kali</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">Harga Jual PPOB</span>
                      <p className="text-xs text-amber-400 font-mono font-bold mt-1">{formatCurrency(rec.sellingPrice)}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">Tarik Tunai</span>
                      <p className="text-xs text-sky-400 font-mono font-bold mt-1">{formatCurrency(rec.cashWithdrawal)}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">Saldo Masuk</span>
                      <p className="text-xs text-indigo-400 font-mono font-bold mt-1">{formatCurrency(rec.incomingBalance)}</p>
                    </div>
                  </div>

                  {/* Right Dynamic Formulas Output */}
                  <div className="md:col-span-4 bg-slate-950/20 p-4 rounded-xl border border-slate-850/60 space-y-2 text-xs">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-500">Harga Dasar PPOB:</span>
                      <span className="text-slate-300 font-bold">{formatCurrency(rec.basicPrice)}</span>
                    </div>
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-500">Fee PPOB:</span>
                      <span className="text-emerald-400 font-extrabold">{formatCurrency(rec.fee)}</span>
                    </div>
                    {rec.transactionCount > 0 && (
                      <div className="text-[9px] text-slate-500 font-mono text-right">
                        (Rerata: {formatCurrency(averageFee)} / tx)
                      </div>
                    )}
                  </div>
                </div>

                {/* Balance Verification Banner (Otomatis) */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/50 p-3.5 rounded-xl border border-slate-850 font-mono text-xs">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block mb-0.5">SALDO AWAL (OTOMATIS)</span>
                    <span className="text-slate-200 font-bold text-xs">{formatCurrency(rec.startingBalance)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block mb-0.5">SALDO FISIK PPOB (DARI RUMUS)</span>
                    <span className="text-amber-500 font-extrabold text-xs">{formatCurrency(rec.physicalBalance)}</span>
                  </div>
                  <div className="border-t sm:border-t-0 sm:border-l border-slate-850 pt-2 sm:pt-0 sm:pl-3">
                    <span className="text-[9px] text-slate-500 font-bold block mb-0.5">SALDO AKHIR (INPUT KASIR)</span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200 font-extrabold">{formatCurrency(rec.endingBalance)}</span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        discrepancy === 0 ? 'bg-emerald-500/10 text-emerald-400' :
                        discrepancy < 0 ? 'bg-rose-500/10 text-rose-400' :
                        'bg-sky-500/10 text-sky-400'
                      }`}>
                        {discrepancy === 0 ? 'Cocok' : discrepancy < 0 ? `Selisih: ${formatCurrency(discrepancy)}` : `Lebih: ${formatCurrency(discrepancy)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions bottom row */}
                <div className="flex justify-end gap-2.5 mt-4 pt-3.5 border-t border-slate-850/60">
                  <button
                    onClick={() => openEditModal(rec)}
                    className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Ubah</span>
                  </button>

                  {/* Protect delete */}
                  {(profile?.role === 'Owner' || user?.email === 'sideincomechanel@gmail.com') && (
                    <button
                      onClick={() => { setSelectedRecord(rec); setShowDeleteModal(true); }}
                      className="text-rose-400 hover:text-rose-200 hover:bg-rose-950/20 p-2 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredRecords.length === 0 && (
            <div className="text-center py-16 text-slate-500 border border-slate-800 border-dashed rounded-2xl bg-slate-900/10">
              <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Belum ada catatan transaksi buku PPOB.</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">Tekan tombol 'Catat Buku PPOB Baru' untuk mencatat transaksi shift baru.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: TAMBAH SHIFT PPOB */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative my-8">
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
            
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Plus className="w-4.5 h-4.5 text-amber-500" />
                <span>Pencatatan Buku Shift PPOB Baru</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-850 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4">
              {/* Dynamic Warning if First Entry needing custom balance */}
              {records.length === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3.5 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Konfigurasi Saldo Awal Pertama Kali</span>
                  </div>
                  <p className="leading-relaxed">Belum ada rekam transaksi sebelumnya. Tentukan nominal saldo awal distributor PPOB Anda di bawah ini:</p>
                  <input
                    type="number"
                    value={customStartingBalance}
                    onChange={(e) => setCustomStartingBalance(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    placeholder="Masukkan saldo awal..."
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* COLUMN 1: METADATA & INPUTS */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider border-b border-slate-850 pb-1">Keterangan Shift</h4>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Nama Shift / Buku <span className="text-rose-500">*</span></label>
                    <select
                      value={shiftName}
                      onChange={(e) => setShiftName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Shift Pagi">Shift Pagi</option>
                      <option value="Shift Siang">Shift Siang</option>
                      <option value="Shift Sore">Shift Sore</option>
                      <option value="Shift Malam">Shift Malam</option>
                      <option value="Shift Full-Day">Shift Full-Day</option>
                    </select>
                  </div>

                  <h4 className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider border-b border-slate-850 pt-1 pb-1">Input Transaksi Shift</h4>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Jumlah Transaksi (Qty)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={transactionCount}
                      onChange={(e) => setTransactionCount(e.target.value)}
                      placeholder="Masukkan jumlah sukses..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Harga Jual PPOB (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="Total uang masuk dari pembeli..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Tarik Tunai (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={cashWithdrawal}
                      onChange={(e) => setCashWithdrawal(e.target.value)}
                      placeholder="Total transaksi tarik tunai..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Saldo Masuk (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={incomingBalance}
                      onChange={(e) => setIncomingBalance(e.target.value)}
                      placeholder="Total pengisian saldo/deposit..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* COLUMN 2: AUTOMATIC REALTIME FORMULAS & RECONCILIATION */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider border-b border-slate-850 pb-1">Rumus SOP &amp; Verifikasi Saldo</h4>

                  {/* Saldo Awal (Otomatis) */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/80 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">SALDO AWAL (OTOMATIS)</span>
                    <p className="text-xs text-slate-300 font-mono font-bold">{formatCurrency(autoStartingBalance)}</p>
                    <p className="text-[9px] text-slate-500 leading-normal">
                      {records.length > 0 
                        ? 'Ditetapkan otomatis dari saldo akhir shift sebelumnya.' 
                        : 'Menggunakan saldo awal konfigurasi awal.'}
                    </p>
                  </div>

                  {/* Calculated Harga Dasar */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/80 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">HARGA DASAR PPOB (OTOMATIS)</span>
                    <p className="text-xs text-slate-300 font-mono font-bold">{formatCurrency(addBasicPrice)}</p>
                    <p className="text-[9px] text-slate-500 leading-normal italic">Rumus: Harga Jual ({formatCurrency(addSellingPrice)}) - Tarik Tunai ({formatCurrency(addCashWithdrawal)}) - Saldo Masuk ({formatCurrency(addIncomingBalance)})</p>
                  </div>

                  {/* Calculated Fee and Status */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/80 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">FEE PPOB (LABA)</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${
                        addStatus === 'Normal' ? 'bg-emerald-500/10 text-emerald-400' :
                        addStatus === 'Fee Terlalu Rendah' ? 'bg-rose-500/10 text-rose-400 font-bold' :
                        'bg-amber-500/10 text-amber-400 font-bold'
                      }`}>
                        {addStatus}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-400 font-mono font-bold">{formatCurrency(addFee)}</p>
                    <p className="text-[9px] text-slate-500 leading-normal">
                      Rumus: Harga Jual - Harga Dasar - Saldo Masuk
                    </p>
                  </div>

                  {/* Calculated Saldo Fisik */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/80 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">SALDO FISIK PPOB (OTOMATIS)</span>
                    <p className="text-xs text-amber-400 font-mono font-bold">{formatCurrency(addPhysicalBalance)}</p>
                    <p className="text-[9px] text-slate-500 leading-normal">
                      Rumus: Saldo Awal - Harga Dasar PPOB
                    </p>
                  </div>

                  {/* Cashier final input field */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/20 space-y-2">
                    <label className="text-[10px] font-bold text-amber-400 font-mono uppercase block">MASUKKAN SALDO AKHIR APLIKASI / FISIK <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      required
                      value={endingBalance}
                      onChange={(e) => setEndingBalance(e.target.value)}
                      placeholder="Saldo akhir di aplikasi distributor..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                    
                    {/* Discrepancy feedback live */}
                    <div className="flex justify-between items-center text-[10px] font-mono pt-1">
                      <span className="text-slate-500">Kesesuaian Saldo:</span>
                      <span className={`font-bold ${addEndingBalance - addPhysicalBalance === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {addEndingBalance - addPhysicalBalance === 0 
                          ? 'Sesuai (Match)' 
                          : `Selisih: ${formatCurrency(addEndingBalance - addPhysicalBalance)}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION CTAs */}
              <div className="pt-4 flex gap-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-850 text-slate-400 font-bold rounded-xl text-xs border border-slate-800 transition-colors cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-amber-500/10 transition-colors cursor-pointer text-center"
                >
                  Simpan Buku PPOB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SHIFT PPOB */}
      {showEditModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative my-8">
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
            
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Edit className="w-4.5 h-4.5 text-amber-500" />
                <span>Ubah Catatan Buku PPOB - ID: {selectedRecord.id}</span>
              </h3>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-850 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* COLUMN 1: INPUTS */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider border-b border-slate-850 pb-1">Keterangan Shift</h4>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Nama Shift / Buku <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={editShiftName}
                      onChange={(e) => setEditShiftName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <h4 className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider border-b border-slate-850 pt-1 pb-1">Input Transaksi Shift</h4>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Jumlah Transaksi (Qty)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editTxCount}
                      onChange={(e) => setEditTxCount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Harga Jual PPOB (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editSellingPrice}
                      onChange={(e) => setEditSellingPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Tarik Tunai (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editCashWithdrawal}
                      onChange={(e) => setEditCashWithdrawal(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Saldo Masuk (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editIncomingBalance}
                      onChange={(e) => setEditIncomingBalance(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* COLUMN 2: REALTIME DISPLAY */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider border-b border-slate-850 pb-1">Verifikasi Formula SOP</h4>

                  {/* Saldo Awal */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/80 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">SALDO AWAL (KUNCI)</span>
                    <p className="text-xs text-slate-300 font-mono font-bold">{formatCurrency(editStartingBalance)}</p>
                  </div>

                  {/* Calculated Harga Dasar */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/80 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">HARGA DASAR PPOB (OTOMATIS)</span>
                    <p className="text-xs text-slate-300 font-mono font-bold">{formatCurrency(editBasicPriceVal)}</p>
                    <p className="text-[9px] text-slate-500 leading-normal italic">Jual ({formatCurrency(Number(editSellingPrice) || 0)}) - Tarik Tunai ({formatCurrency(Number(editCashWithdrawal) || 0)}) - Masuk ({formatCurrency(Number(editIncomingBalance) || 0)})</p>
                  </div>

                  {/* Calculated Fee and Status */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/80 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">FEE PPOB (LABA)</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${
                        editStatusVal === 'Normal' ? 'bg-emerald-500/10 text-emerald-400' :
                        editStatusVal === 'Fee Terlalu Rendah' ? 'bg-rose-500/10 text-rose-400 font-bold' :
                        'bg-amber-500/10 text-amber-400 font-bold'
                      }`}>
                        {editStatusVal}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-400 font-mono font-bold">{formatCurrency(editFeeVal)}</p>
                  </div>

                  {/* Calculated Saldo Fisik */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/80 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 font-mono block uppercase">SALDO FISIK PPOB (OTOMATIS)</span>
                    <p className="text-xs text-amber-400 font-mono font-bold">{formatCurrency(editPhysicalBalanceVal)}</p>
                  </div>

                  {/* Ending balance */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/20 space-y-2">
                    <label className="text-[10px] font-bold text-amber-400 font-mono uppercase block">MASUKKAN SALDO AKHIR APLIKASI / FISIK <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      required
                      value={editEndingBalance}
                      onChange={(e) => setEditEndingBalance(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                    
                    <div className="flex justify-between items-center text-[10px] font-mono pt-1">
                      <span className="text-slate-500">Kesesuaian Saldo:</span>
                      <span className={`font-bold ${Number(editEndingBalance) - editPhysicalBalanceVal === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {Number(editEndingBalance) - editPhysicalBalanceVal === 0 
                          ? 'Sesuai (Match)' 
                          : `Selisih: ${formatCurrency(Number(editEndingBalance) - editPhysicalBalanceVal)}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="pt-4 flex gap-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-850 text-slate-400 font-bold rounded-xl text-xs border border-slate-800 transition-colors cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-amber-500/10 transition-colors cursor-pointer text-center"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <span>Konfirmasi Hapus Ledger PPOB</span>
            </h3>
            <p className="text-xs text-slate-400 leading-normal mb-5">
              Apakah Anda yakin ingin menghapus catatan shift PPOB <strong className="text-white">"{selectedRecord.shiftName}"</strong> ({selectedRecord.id})? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 bg-slate-950 text-slate-400 font-bold border border-slate-850 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteRecord}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELP & PETUNJUK SOP MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between mb-4 border-b border-slate-850 pb-2">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <HelpCircle className="w-4.5 h-4.5 text-amber-500" />
                <span>SOP &amp; Standar Rumus PPOB</span>
              </h3>
              <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-white font-bold">×</button>
            </div>
            
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
              <div>
                <h4 className="font-bold text-amber-500 mb-1">1. Alur Buku PPOB</h4>
                <p>Setiap akhir shift, kasir diwajibkan menginput total data transaksi yang terjadi di aplikasi PPOB (deposit, tarikan, total penjualan).</p>
              </div>

              <div>
                <h4 className="font-bold text-amber-500 mb-1">2. Ketentuan Saldo Awal</h4>
                <p><strong>Saldo Awal otomatis</strong> diisi dari nominal <em>Saldo Akhir</em> shift sebelumnya demi menjaga konsistensi keuangan tanpa input manual (terkunci otomatis).</p>
              </div>

              <div>
                <h4 className="font-bold text-amber-500 mb-1">3. Rumus Standar SOP</h4>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 space-y-1 text-[10px] font-mono">
                  <p className="text-slate-200"><span className="text-amber-500">Harga Dasar PPOB</span> = Harga Jual - Tarik Tunai - Saldo Masuk</p>
                  <p className="text-slate-200"><span className="text-amber-500">Fee PPOB (Laba)</span> = Harga Jual - Harga Dasar</p>
                  <p className="text-slate-200"><span className="text-amber-500">Saldo Fisik PPOB</span> = Saldo Awal - Harga Dasar</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-amber-500 mb-1">4. Penentuan Status PPOB</h4>
                <p>Status keuntungan dihitung otomatis berdasarkan pembagian rata-rata <strong>Fee PPOB per Transaksi</strong>:</p>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                  <li><span className="text-rose-400 font-bold">Fee Terlalu Rendah</span> : Jika rata-rata komisi &lt; Rp 1.500 / transaksi.</li>
                  <li><span className="text-amber-400 font-bold">Fee Terlalu Tinggi</span> : Jika rata-rata komisi &gt; Rp 5.500 / transaksi.</li>
                  <li><span className="text-emerald-400 font-bold">Normal</span> : Komisi wajar berkisar antara Rp 1.500 - Rp 5.500 / transaksi.</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-[10px] text-slate-400">
                Pencatatan ini membantu owner mengontrol kebocoran saldo PPOB digital dari kelalaian pencatatan kasir.
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="mt-5 w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Saya Mengerti SOP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
