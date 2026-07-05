import { useFirebase } from './FirebaseProvider';
import { Smartphone, ShieldCheck, HelpCircle } from 'lucide-react';

export default function Login() {
  const { loginWithGoogle, loading, error } = useFirebase();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-white font-sans selection:bg-amber-500 selection:text-black">
      {/* Background ambient accents */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none z-0"></div>
      
      {/* Gold glow element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Header / Brand logo */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Smartphone className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">ALDI SERVICE PHONE</h1>
            <span className="text-[10px] font-mono tracking-widest text-amber-500 font-bold">ASP SYSTEM v1.0</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          <span>Secure ERP Cloud</span>
        </div>
      </header>

      {/* Main card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col items-center">
          
          {/* Subtle gold top border border line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>

          <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-6 shadow-inner">
            <Smartphone className="w-8 h-8 text-amber-400" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-center text-white mb-2">
            Selamat Datang di <span className="text-amber-400">ASP ERP</span>
          </h2>
          <p className="text-sm text-slate-400 text-center mb-8 max-w-xs leading-relaxed">
            Sistem ERP internal Konter & Service Aldi Service Phone. Silakan masuk untuk mengakses panel operasional Anda.
          </p>

          {error && (
            <div className="w-full mb-6 p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-200 text-center leading-relaxed">
              <span className="font-semibold block mb-0.5">Login Gagal</span>
              {error}
            </div>
          )}

          <button
            onClick={loginWithGoogle}
            disabled={loading}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold rounded-xl shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.47 1.62l2.42-2.42C17.375 1.54 14.97.715 12.24.715c-5.63 0-10.2 4.57-10.2 10.2s4.57 10.2 10.2 10.2c5.88 0 9.8-4.13 9.8-9.98 0-.67-.06-1.18-.17-1.63H12.24z"/>
                </svg>
                <span>Masuk dengan Google</span>
              </>
            )}
          </button>

          <div className="mt-8 pt-6 border-t border-slate-800/80 w-full text-center">
            <h3 className="text-xs font-mono tracking-wider text-slate-500 font-bold uppercase mb-3">Panduan Akses Cepat</h3>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400">
              <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800/40">
                <span className="font-bold text-amber-500 block mb-0.5">Owner</span>
                Full Control &amp; Keuangan
              </div>
              <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800/40">
                <span className="font-bold text-amber-500 block mb-0.5">Kasir</span>
                Transaksi &amp; Pembayaran
              </div>
              <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800/40">
                <span className="font-bold text-amber-500 block mb-0.5">Teknisi</span>
                Kelola Repair &amp; Service
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-6 text-xs text-slate-500 border-t border-slate-900">
        <p>&copy; 2026 Aldi Service Phone (ASP). All rights reserved.</p>
      </footer>
    </div>
  );
}
