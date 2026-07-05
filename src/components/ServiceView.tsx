import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Search, 
  Plus, 
  Smartphone, 
  User, 
  Phone, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Share2, 
  X, 
  TrendingUp, 
  Coins, 
  MessageSquare,
  Edit,
  Trash2,
  Filter,
  Check
} from 'lucide-react';
import { db, handleFirestoreError } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { useFirebase } from './FirebaseProvider';
import { ServiceJob, OperationType } from '../types';

export default function ServiceView() {
  const { user, profile } = useFirebase();
  const [services, setServices] = useState<ServiceJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search and Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');

  // Modal Control States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Active items for editing or deleting
  const [selectedJob, setSelectedJob] = useState<ServiceJob | null>(null);

  // Form Field States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneBrand, setPhoneBrand] = useState('');
  const [phoneModel, setPhoneModel] = useState('');
  const [imei, setImei] = useState('');
  const [issue, setIssue] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<string>('0');
  const [capitalCost, setCapitalCost] = useState<string>('0');
  const [price, setPrice] = useState<string>('0');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [pickupDate, setPickupDate] = useState<string>('');
  const [technician, setTechnician] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Proses' | 'Menunggu Sparepart' | 'Selesai' | 'Sudah Diambil'>('Proses');

  // Quick Brand recommendations
  const BRANDS = ['iPhone', 'Samsung', 'Oppo', 'Vivo', 'Xiaomi', 'Realme', 'Infinix', 'Asus'];

  // Subscribe to real-time updates from Firestore services collection
  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs: ServiceJob[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Safety checks for Dates
        const entryDateVal = data.entryDate instanceof Timestamp ? data.entryDate.toDate() : (data.entryDate ? new Date(data.entryDate) : new Date());
        const pickupDateVal = data.pickupDate instanceof Timestamp ? data.pickupDate.toDate() : (data.pickupDate ? new Date(data.pickupDate) : null);
        const createdAtVal = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
        const updatedAtVal = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date();

        jobs.push({
          id: doc.id,
          customerName: data.customerName || '',
          customerPhone: data.customerPhone || '',
          phoneBrand: data.phoneBrand || '',
          phoneModel: data.phoneModel || '',
          imei: data.imei || '',
          issue: data.issue || '',
          estimatedCost: Number(data.estimatedCost) || 0,
          capitalCost: Number(data.capitalCost) || 0,
          price: Number(data.price) || 0,
          profit: Number(data.profit) || 0,
          entryDate: entryDateVal,
          pickupDate: pickupDateVal,
          technician: data.technician || '',
          notes: data.notes || '',
          status: data.status || 'Proses',
          createdBy: data.createdBy || '',
          createdAt: createdAtVal,
          updatedAt: updatedAtVal,
        });
      });
      setServices(jobs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Subscribe Error:", error);
      setErrorMsg("Gagal memuat data dari database. Silakan periksa koneksi atau hak akses.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Set default technician based on logged in user display name
  useEffect(() => {
    if (showAddModal && profile?.displayName && !technician) {
      setTechnician(profile.displayName);
    }
  }, [showAddModal, profile, technician]);

  // Handle Opening Add Modal with clean state
  const openAddModal = () => {
    setCustomerName('');
    setCustomerPhone('');
    setPhoneBrand('');
    setPhoneModel('');
    setImei('');
    setIssue('');
    setEstimatedCost('0');
    setCapitalCost('0');
    setPrice('0');
    setEntryDate(new Date().toISOString().slice(0, 16));
    setPickupDate('');
    setTechnician(profile?.displayName || '');
    setNotes('');
    setStatus('Proses');
    setErrorMsg(null);
    setShowAddModal(true);
  };

  // Handle Opening Edit Modal with existing data prefilled
  const openEditModal = (job: ServiceJob) => {
    setSelectedJob(job);
    setCustomerName(job.customerName);
    setCustomerPhone(job.customerPhone);
    setPhoneBrand(job.phoneBrand);
    setPhoneModel(job.phoneModel);
    setImei(job.imei);
    setIssue(job.issue);
    setEstimatedCost(job.estimatedCost.toString());
    setCapitalCost(job.capitalCost.toString());
    setPrice(job.price.toString());
    
    // Formatting Dates for datetime-local inputs
    if (job.entryDate) {
      const offsetDate = new Date(job.entryDate.getTime() - job.entryDate.getTimezoneOffset() * 60000);
      setEntryDate(offsetDate.toISOString().slice(0, 16));
    }
    
    if (job.pickupDate) {
      const offsetDate = new Date(job.pickupDate.getTime() - job.pickupDate.getTimezoneOffset() * 60000);
      setPickupDate(offsetDate.toISOString().slice(0, 16));
    } else {
      setPickupDate('');
    }
    
    setTechnician(job.technician);
    setNotes(job.notes);
    setStatus(job.status);
    setErrorMsg(null);
    setShowEditModal(true);
  };

  // Handle form submit for adding new service job
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phoneBrand || !phoneModel || !issue) {
      setErrorMsg("Mohon lengkapi kolom-kolom wajib (Nama Pelanggan, Merk, Tipe HP, dan Kerusakan).");
      return;
    }

    const estCostNum = Number(estimatedCost) || 0;
    const capCostNum = Number(capitalCost) || 0;
    const priceNum = Number(price) || 0;
    const profitNum = priceNum - capCostNum;

    // Generate readable ID
    const shortRandom = Math.floor(1000 + Math.random() * 9000);
    const customDocId = `SV-${shortRandom}`;

    try {
      const newJobPayload = {
        customerName,
        customerPhone,
        phoneBrand,
        phoneModel,
        imei,
        issue,
        estimatedCost: estCostNum,
        capitalCost: capCostNum,
        price: priceNum,
        profit: profitNum,
        entryDate: Timestamp.fromDate(new Date(entryDate)),
        pickupDate: pickupDate ? Timestamp.fromDate(new Date(pickupDate)) : null,
        technician,
        notes,
        status,
        createdBy: user?.uid || 'Unknown',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'services', customDocId), newJobPayload);
      setShowAddModal(false);
    } catch (err) {
      console.error("Error creating service job:", err);
      handleFirestoreError(err, OperationType.CREATE, 'services');
    }
  };

  // Handle form submit for updating a service job
  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    if (!customerName || !phoneBrand || !phoneModel || !issue) {
      setErrorMsg("Mohon lengkapi kolom-kolom wajib.");
      return;
    }

    const estCostNum = Number(estimatedCost) || 0;
    const capCostNum = Number(capitalCost) || 0;
    const priceNum = Number(price) || 0;
    const profitNum = priceNum - capCostNum;

    try {
      const updatedPayload = {
        customerName,
        customerPhone,
        phoneBrand,
        phoneModel,
        imei,
        issue,
        estimatedCost: estCostNum,
        capitalCost: capCostNum,
        price: priceNum,
        profit: profitNum,
        entryDate: Timestamp.fromDate(new Date(entryDate)),
        pickupDate: pickupDate ? Timestamp.fromDate(new Date(pickupDate)) : null,
        technician,
        notes,
        status,
        createdBy: selectedJob.createdBy,
        createdAt: Timestamp.fromDate(selectedJob.createdAt),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'services', selectedJob.id), updatedPayload);
      setShowEditModal(false);
    } catch (err) {
      console.error("Error updating service job:", err);
      handleFirestoreError(err, OperationType.UPDATE, `services/${selectedJob.id}`);
    }
  };

  // Handle deleting a service job
  const handleDeleteService = async () => {
    if (!selectedJob) return;
    try {
      await deleteDoc(doc(db, 'services', selectedJob.id));
      setShowDeleteModal(false);
      setSelectedJob(null);
    } catch (err) {
      console.error("Error deleting service job:", err);
      handleFirestoreError(err, OperationType.DELETE, `services/${selectedJob.id}`);
    }
  };

  // Quick State trigger to set state to "Selesai" or "Sudah Diambil"
  const handleQuickStatusChange = async (job: ServiceJob, newStatus: typeof status) => {
    try {
      const updatedFields: any = {
        ...job,
        status: newStatus,
        entryDate: Timestamp.fromDate(job.entryDate),
        createdAt: Timestamp.fromDate(job.createdAt),
        updatedAt: Timestamp.now()
      };

      // Auto-set pickup date if completed/handed over now
      if (newStatus === 'Sudah Diambil') {
        updatedFields.pickupDate = Timestamp.now();
      } else if (job.pickupDate) {
        updatedFields.pickupDate = Timestamp.fromDate(job.pickupDate);
      } else {
        updatedFields.pickupDate = null;
      }

      await setDoc(doc(db, 'services', job.id), updatedFields);
    } catch (err) {
      console.error("Error updating quick status:", err);
      handleFirestoreError(err, OperationType.UPDATE, `services/${job.id}`);
    }
  };

  // Filter and search logic
  const filteredServices = services.filter((job) => {
    const matchesSearch = 
      job.customerName.toLowerCase().includes(search.toLowerCase()) || 
      job.customerPhone.includes(search) || 
      job.phoneBrand.toLowerCase().includes(search.toLowerCase()) || 
      job.phoneModel.toLowerCase().includes(search.toLowerCase()) || 
      job.imei.includes(search) || 
      job.id.toLowerCase().includes(search.toLowerCase()) ||
      job.technician.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = statusFilter === 'Semua' ? true : job.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Financial Summary stats
  const totalJobsCount = services.length;
  const processJobsCount = services.filter(j => j.status === 'Proses').length;
  const sparepartJobsCount = services.filter(j => j.status === 'Menunggu Sparepart').length;
  const finishedJobsCount = services.filter(j => j.status === 'Selesai').length;
  const pickedJobsCount = services.filter(j => j.status === 'Sudah Diambil').length;

  // Calculate overall realized and projected profits
  const totalOmzet = services.reduce((sum, j) => sum + j.price, 0);
  const totalCapital = services.reduce((sum, j) => sum + j.capitalCost, 0);
  const totalProfitRealized = services.reduce((sum, j) => sum + j.profit, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const formatDateTime = (date: Date | null | undefined) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  // WhatsApp helper
  const sendWhatsAppNotification = (job: ServiceJob) => {
    const cleanPhone = job.customerPhone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    
    let templateText = `Halo Bpk/Ibu *${job.customerName}*,\n\n`;
    templateText += `Kami dari *Konter ASP HP* ingin menginformasikan perihal unit service Anda:\n`;
    templateText += `*ID Service:* ${job.id}\n`;
    templateText += `*Unit HP:* ${job.phoneBrand} ${job.phoneModel}\n`;
    
    if (job.status === 'Selesai') {
      templateText += `*Status:* ✅ *SELESAI (SUDAH SIAP DIAMBIL)*\n`;
      templateText += `*Total Biaya:* ${formatCurrency(job.price)}\n\n`;
      templateText += `Silakan datang ke toko kami untuk pengambilan unit HP Anda. Terima kasih! 🙏`;
    } else if (job.status === 'Menunggu Sparepart') {
      templateText += `*Status:* ⏳ *MENUNGGU SPAREPART*\n`;
      templateText += `Kami sedang memesan suku cadang yang diperlukan untuk perbaikan unit Anda. Estimasi selesai akan kami infokan kembali.`;
    } else if (job.status === 'Sudah Diambil') {
      templateText += `*Status:* 👍 *SUDAH DIAMBIL*\n`;
      templateText += `Unit HP telah diserahkan dengan baik. Terima kasih atas kepercayaan Anda kepada kami! 🙏`;
    } else {
      templateText += `*Status:* 🛠️ *SEDANG DIPROSES*\n`;
      templateText += `Unit Anda sedang dalam penanganan teknisi kami.`;
    }

    const encodedText = encodeURIComponent(templateText);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodedText}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500 animate-pulse" />
            <span>Manajemen Service Handphone</span>
          </h1>
          <p className="text-xs text-slate-400">Pencatatan tanda terima unit masuk, estimasi harga, modal suku cadang, laba otomatis, &amp; status servis HP.</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-2.5 px-5 rounded-xl shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5 stroke-[3]" />
          <span>Terima Service HP Baru</span>
        </button>
      </div>

      {/* ERROR MESSAGE ALERT BANNER */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Terjadi Kesalahan:</span> {errorMsg}
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400/80 hover:text-rose-400 font-bold font-mono text-xs">OK</button>
        </div>
      )}

      {/* STATS SUMMARY GRID (8 cards of HP service context) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Total Servis</span>
          <span className="text-lg font-bold text-slate-200 font-mono mt-1.5">{totalJobsCount} Unit</span>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-amber-500/80 font-bold block uppercase tracking-wider font-mono">Sedang Proses</span>
          <span className="text-lg font-bold text-amber-400 font-mono mt-1.5">{processJobsCount} Unit</span>
        </div>
        <div className="bg-indigo-500/5 border border-indigo-500/10 p-3.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-indigo-400 font-bold block uppercase tracking-wider font-mono">Menunggu Part</span>
          <span className="text-lg font-bold text-indigo-400 font-mono mt-1.5">{sparepartJobsCount} Unit</span>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-emerald-400 font-bold block uppercase tracking-wider font-mono">Selesai (QC)</span>
          <span className="text-lg font-bold text-emerald-400 font-mono mt-1.5">{finishedJobsCount} Unit</span>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-xl text-center flex flex-col justify-between">
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Sudah Diambil</span>
          <span className="text-lg font-bold text-slate-400 font-mono mt-1.5">{pickedJobsCount} Unit</span>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl text-center flex flex-col justify-between hover:bg-emerald-500/15 transition-colors">
          <span className="text-[9px] text-emerald-400 font-bold block uppercase tracking-wider font-mono">Laba Terakumulasi</span>
          <span className="text-base font-extrabold text-emerald-400 font-mono mt-1.5">{formatCurrency(totalProfitRealized)}</span>
        </div>
      </div>

      {/* SEARCH AND TABS CONTROLLER */}
      <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ID, Nama Pelanggan, Nomor HP, Merk/Tipe HP, IMEI atau Nama Teknisi..."
            className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
          />
        </div>

        {/* Dynamic Status Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['Semua', 'Proses', 'Menunggu Sparepart', 'Selesai', 'Sudah Diambil'].map((statusOption) => {
            const isActive = statusFilter === statusOption;
            const count = statusOption === 'Semua' 
              ? services.length 
              : services.filter(s => s.status === statusOption).length;

            return (
              <button
                key={statusOption}
                onClick={() => setStatusFilter(statusOption)}
                className={`text-[10px] md:text-xs font-bold py-2 px-4 rounded-xl border transition-all shrink-0 cursor-pointer ${
                  isActive 
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/10' 
                    : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:text-white hover:border-slate-800'
                }`}
              >
                {statusOption} <span className={`ml-1 px-1.5 py-0.5 text-[9px] rounded-full ${isActive ? 'bg-slate-950 text-amber-500' : 'bg-slate-900 text-slate-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SERVICE LIST RENDER */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-mono">Menyelaraskan data servis dari cloud database...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredServices.map((job) => {
            const hasProfit = job.profit > 0;
            const profitStyle = job.profit > 0 
              ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' 
              : job.profit < 0 
                ? 'text-rose-400 bg-rose-500/5 border-rose-500/10' 
                : 'text-slate-400 bg-slate-800/10 border-slate-800';

            return (
              <div 
                key={job.id} 
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 hover:bg-slate-900/90 transition-all duration-300 relative group"
              >
                {/* Header of service item */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-850">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-colors shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-extrabold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                          {job.id}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Masuk: {formatDateTime(job.entryDate)}</span>
                        </span>
                        {job.pickupDate && (
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Ambil: {formatDateTime(job.pickupDate)}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-white mt-1">
                        {job.phoneBrand} <span className="text-amber-500">{job.phoneModel}</span>
                      </h3>
                      {job.imei && (
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">IMEI: {job.imei}</p>
                      )}
                    </div>
                  </div>

                  {/* Status, Price Tag & Profit Preview */}
                  <div className="flex flex-wrap items-center lg:items-end justify-between lg:flex-col gap-3">
                    <div className="flex items-center gap-2">
                      {/* WA Share Button */}
                      <button
                        onClick={() => sendWhatsAppNotification(job)}
                        className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 rounded-lg transition-all cursor-pointer"
                        title="Kirim status lewat WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      {/* Status badge */}
                      <span className={`text-[9px] px-2.5 py-1 rounded-lg border font-extrabold font-mono uppercase tracking-wider ${
                        job.status === 'Proses' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse' :
                        job.status === 'Menunggu Sparepart' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                        job.status === 'Selesai' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        'bg-slate-800/60 text-slate-400 border-slate-700'
                      }`}>
                        {job.status}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-500 font-mono uppercase tracking-wider font-bold">Harga Jual / Biaya HP</div>
                      <div className="text-base font-extrabold text-white font-mono">{formatCurrency(job.price)}</div>
                    </div>
                  </div>
                </div>

                {/* Main Body of item details (Diagnosis, Notes, Costs details) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
                  <div className="md:col-span-8 space-y-3">
                    {/* Diagnosis details */}
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <span className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-wider block mb-1">Diagnosa &amp; Keluhan:</span>
                      <p className="text-xs text-slate-200 font-sans leading-relaxed">{job.issue}</p>
                    </div>

                    {/* Catatan / Notes */}
                    {job.notes && (
                      <div className="bg-slate-950/20 p-3 rounded-xl border border-slate-900">
                        <span className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-wider block mb-1">Catatan Tambahan:</span>
                        <p className="text-xs text-slate-400 italic font-sans">{job.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Profit detail and technicians metadata info */}
                  <div className="md:col-span-4 bg-slate-950/30 p-4 rounded-xl border border-slate-850/80 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-500">Estimasi Awal:</span>
                        <span className="text-slate-300 font-bold">{formatCurrency(job.estimatedCost)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-500">Modal Suku Cadang:</span>
                        <span className="text-slate-300 font-bold">{formatCurrency(job.capitalCost)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono border-t border-slate-850 pt-2">
                        <span className="text-slate-500">Keuntungan HP:</span>
                        <span className={`font-extrabold px-1.5 py-0.5 rounded border text-[10px] ${profitStyle}`}>
                          {formatCurrency(job.profit)}
                        </span>
                      </div>
                    </div>

                    {/* Technician info metadata */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono border-t border-slate-900/60">
                      <span>Teknisi PJ: <strong className="text-slate-200">{job.technician || '-'}</strong></span>
                      <span className="text-[9px] text-slate-600">ID: {job.createdBy.slice(0, 5)}...</span>
                    </div>
                  </div>
                </div>

                {/* ITEM ACTION BAR */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5 border-t border-slate-850/60">
                  <div className="flex flex-wrap gap-2">
                    {/* Status transition action flows */}
                    {job.status === 'Proses' && (
                      <>
                        <button
                          onClick={() => handleQuickStatusChange(job, 'Menunggu Sparepart')}
                          className="bg-indigo-500/10 hover:bg-indigo-500 hover:text-slate-950 text-indigo-400 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer border border-indigo-500/20"
                        >
                          Tunggu Sparepart
                        </button>
                        <button
                          onClick={() => handleQuickStatusChange(job, 'Selesai')}
                          className="bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer border border-emerald-500/20"
                        >
                          Selesai Perbaikan
                        </button>
                      </>
                    )}

                    {job.status === 'Menunggu Sparepart' && (
                      <button
                        onClick={() => handleQuickStatusChange(job, 'Proses')}
                        className="bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-400 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer border border-amber-500/20"
                      >
                        Kembali Proses
                      </button>
                    )}

                    {job.status === 'Selesai' && (
                      <button
                        onClick={() => handleQuickStatusChange(job, 'Sudah Diambil')}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-lg font-extrabold text-[10px] shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
                      >
                        Serahkan ke Pelanggan (Sudah Diambil)
                      </button>
                    )}

                    {job.status === 'Sudah Diambil' && (
                      <span className="text-slate-500 font-mono text-[10px] flex items-center gap-1">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Unit telah diserahkan &amp; transaksi selesai.</span>
                      </span>
                    )}
                  </div>

                  {/* EDIT & DELETE SYSTEM BUTTONS */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      onClick={() => openEditModal(job)}
                      className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    
                    {/* Delete available for Owner role */}
                    {(profile?.role === 'Owner' || user?.email === 'sideincomechanel@gmail.com') && (
                      <button
                        onClick={() => { setSelectedJob(job); setShowDeleteModal(true); }}
                        className="text-rose-400 hover:text-rose-200 hover:bg-rose-950/20 p-2 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredServices.length === 0 && (
            <div className="text-center py-16 text-slate-500 border border-slate-800 border-dashed rounded-2xl bg-slate-900/10">
              <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Tidak ada data HP servis ditemukan.</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">Silakan sesuaikan filter pencarian atau buat tanda terima baru.</p>
            </div>
          )}
        </div>
      )}

      {/* POPUP MODAL: TAMBAH SERVICE HP (2 columns form) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative my-8">
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
            
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Wrench className="w-4.5 h-4.5 text-amber-500" />
                <span>Terima Tanda HP Servis Baru</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-850 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* COLUMN 1: CLIENT & PHONE METADATA */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider border-b border-slate-850 pb-1">Data Pelanggan</h4>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Nama Pelanggan <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nama lengkap pemilik HP..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Nomor WhatsApp (No WA)</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <h4 className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider border-b border-slate-850 pt-2 pb-1">Keterangan Unit HP</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Merk HP <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={phoneBrand}
                        onChange={(e) => setPhoneBrand(e.target.value)}
                        placeholder="Contoh: iPhone"
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Tipe HP <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={phoneModel}
                        onChange={(e) => setPhoneModel(e.target.value)}
                        placeholder="Contoh: 13 Pro"
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Brand quick tags selection buttons */}
                  <div className="flex flex-wrap gap-1">
                    {BRANDS.map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setPhoneBrand(b)}
                        className="text-[9px] bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-850 rounded px-1.5 py-0.5"
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Nomor IMEI</label>
                    <input
                      type="text"
                      value={imei}
                      onChange={(e) => setImei(e.target.value)}
                      placeholder="Nomor IMEI HP (opsional)..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                {/* COLUMN 2: FINANCIAL, STATUS, DATES & NOTES */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider border-b border-slate-850 pb-1">Estimasi &amp; Penugasan</h4>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Kerusakan / Keluhan Utama <span className="text-rose-500">*</span></label>
                    <textarea
                      required
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      placeholder="Ganti LCD pecah, Sinyal hilang, Bootloop, Mati total, dll..."
                      className="w-full h-16 px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block mb-1" title="Perkiraan biaya awal">Estimasi (Rp)</label>
                      <input
                        type="number"
                        value={estimatedCost}
                        onChange={(e) => setEstimatedCost(e.target.value)}
                        className="w-full px-2 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block mb-1" title="Biaya modal beli sparepart">Modal Part (Rp)</label>
                      <input
                        type="number"
                        value={capitalCost}
                        onChange={(e) => setCapitalCost(e.target.value)}
                        className="w-full px-2 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block mb-1" title="Harga final tagihan ke pelanggan">Biaya Akhir (Rp)</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-2 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Profit Dynamic Display */}
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">Laba Otomatis:</span>
                    <span className={`text-xs font-mono font-extrabold ${Number(price) - Number(capitalCost) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(Number(price) - Number(capitalCost))}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Tanggal Masuk</label>
                      <input
                        type="datetime-local"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className="w-full px-2.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Tanggal Selesai/Ambil</label>
                      <input
                        type="datetime-local"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="w-full px-2.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Teknisi PJ</label>
                      <input
                        type="text"
                        value={technician}
                        onChange={(e) => setTechnician(e.target.value)}
                        placeholder="Nama teknisi PJ..."
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Status Awal</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Proses">Proses</option>
                        <option value="Menunggu Sparepart">Menunggu Sparepart</option>
                        <option value="Selesai">Selesai</option>
                        <option value="Sudah Diambil">Sudah Diambil</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Catatan Tambahan</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Tulis kondisi fisik unit (misal: lecet pemakaian, dent, backdoor renggang)..."
                      className="w-full h-14 px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* SAVE / CANCEL TRIGGER ACTION BAR */}
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
                  Simpan Tanda Terima HP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: EDIT SERVICE HP (Prefilled form) */}
      {showEditModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative my-8">
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
            
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Edit className="w-4.5 h-4.5 text-amber-500" />
                <span>Ubah Data HP Servis - ID: {selectedJob.id}</span>
              </h3>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-850 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateService} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* COLUMN 1: CLIENT & PHONE METADATA */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider border-b border-slate-850 pb-1">Data Pelanggan</h4>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Nama Pelanggan <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Nomor WhatsApp (No WA)</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <h4 className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider border-b border-slate-850 pt-2 pb-1">Keterangan Unit HP</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Merk HP <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={phoneBrand}
                        onChange={(e) => setPhoneBrand(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Tipe HP <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={phoneModel}
                        onChange={(e) => setPhoneModel(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Nomor IMEI</label>
                    <input
                      type="text"
                      value={imei}
                      onChange={(e) => setImei(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                {/* COLUMN 2: FINANCIAL, STATUS, DATES & NOTES */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider border-b border-slate-850 pb-1">Estimasi &amp; Penugasan</h4>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Kerusakan / Keluhan Utama <span className="text-rose-500">*</span></label>
                    <textarea
                      required
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      className="w-full h-16 px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block mb-1">Estimasi (Rp)</label>
                      <input
                        type="number"
                        value={estimatedCost}
                        onChange={(e) => setEstimatedCost(e.target.value)}
                        className="w-full px-2 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block mb-1">Modal Part (Rp)</label>
                      <input
                        type="number"
                        value={capitalCost}
                        onChange={(e) => setCapitalCost(e.target.value)}
                        className="w-full px-2 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block mb-1">Biaya Akhir (Rp)</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-2 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Profit Dynamic Display */}
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">Laba Otomatis:</span>
                    <span className={`text-xs font-mono font-extrabold ${Number(price) - Number(capitalCost) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(Number(price) - Number(capitalCost))}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Tanggal Masuk</label>
                      <input
                        type="datetime-local"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className="w-full px-2.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Tanggal Selesai/Ambil</label>
                      <input
                        type="datetime-local"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="w-full px-2.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Teknisi PJ</label>
                      <input
                        type="text"
                        value={technician}
                        onChange={(e) => setTechnician(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Status Pekerjaan</label>
                      <select
                        value={status}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setStatus(val);
                          // Auto set pickup date if handed over
                          if (val === 'Sudah Diambil' && !pickupDate) {
                            setPickupDate(new Date().toISOString().slice(0, 16));
                          }
                        }}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Proses">Proses</option>
                        <option value="Menunggu Sparepart">Menunggu Sparepart</option>
                        <option value="Selesai">Selesai</option>
                        <option value="Sudah Diambil">Sudah Diambil</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block mb-1">Catatan Tambahan</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full h-14 px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* SAVE / CANCEL TRIGGER ACTION BAR */}
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
                  Perbarui Data Servis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: HAPUS SERVICE JOB */}
      {showDeleteModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-rose-500"></div>
            
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-sm text-white">Konfirmasi Hapus Servis</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Apakah Anda yakin ingin menghapus catatan servis ID <strong className="text-amber-500 font-mono">{selectedJob.id}</strong> atas nama <strong className="text-white">{selectedJob.customerName}</strong> ({selectedJob.phoneBrand} {selectedJob.phoneModel})? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
            </p>

            <div className="flex gap-2.5">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedJob(null); }}
                className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-400 font-bold rounded-xl text-xs border border-slate-800 transition-colors cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteService}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                Ya, Hapus Catatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
