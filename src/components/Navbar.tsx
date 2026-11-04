import { User } from 'firebase/auth';
import { AppGoogleUser } from '../services/auth';
import { RefreshCw, FileSpreadsheet, CheckCircle2, Sliders } from 'lucide-react';

interface NavbarProps {
  user: User | AppGoogleUser | null;
  sharedGoogleEmail?: string;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  onOpenSheetModal: () => void;
  sheetTitle: string;
  isSyncing: boolean;
  onManualSync: () => void;
  spreadsheetId?: string;
  onOpenSigModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  sharedGoogleEmail,
  onOpenSheetModal,
  sheetTitle,
  isSyncing,
  onManualSync,
  spreadsheetId,
  onOpenSigModal,
}) => {
  const activeEmail = user?.email || sharedGoogleEmail;
  const activeName = user?.displayName || (activeEmail ? activeEmail.split('@')[0] : '');
  return (
    <header className="mb-4 sm:mb-6">
      {/* Brand Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0 tracking-wider">
            FIA
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                FIA Finance Instansi Azmi
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                RQ Ulul Azmi
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
              Yayasan Misykatul Ummah &bull; Database Keuangan Terbuka
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!activeEmail ? (
            <button
              type="button"
              onClick={onOpenSheetModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden xs:inline">Hubungkan Sheet</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenSheetModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-100/70 text-emerald-900 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title={`Terhubung ke Google: ${activeEmail} (Aktif di Semua Perangkat)`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate max-w-[100px] sm:max-w-[140px]">{activeName}</span>
            </button>
          )}

          {onOpenSigModal && (
            <button
              type="button"
              onClick={onOpenSigModal}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Atur posisi tanda tangan dokumen PDF"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Posisi TTD</span>
            </button>
          )}

          <button
            type="button"
            onClick={onManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Muat ulang data dari server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Memuat...' : 'Muat Ulang'}</span>
          </button>
        </div>
      </div>

      {/* Dual Database Status Bar (Cloud Firestore + Google Sheets) */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 text-xs px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <button
            type="button"
            onClick={onOpenSheetModal}
            className="font-bold text-emerald-950 truncate hover:underline text-left cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-[11px] sm:text-xs">
              <span className="text-emerald-700">Database Cloud:</span> Aktif Realtime &bull;{' '}
              <span className="text-slate-700">{sheetTitle || 'Database Keuangan RQ'}</span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {spreadsheetId ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-700 text-white flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-200"></span>
              Sheet Tersambung
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
              Cloud Realtime
            </span>
          )}
          <button
            type="button"
            onClick={onOpenSheetModal}
            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white/80 hover:bg-white px-2 py-0.5 rounded-md border border-emerald-200 cursor-pointer"
          >
            Kelola Sync
          </button>
        </div>
      </div>
    </header>
  );
};
