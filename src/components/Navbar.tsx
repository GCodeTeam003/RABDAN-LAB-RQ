import React from 'react';
import { User } from 'firebase/auth';
import { FileSpreadsheet, ExternalLink, Database, CheckCircle2, RefreshCw } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  onOpenSheetModal: () => void;
  sheetTitle: string;
  isSyncing: boolean;
  onManualSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  onOpenSheetModal,
  sheetTitle,
  isSyncing,
  onManualSync,
}) => {
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
              Database Keuangan Terbuka &bull; Sinkronisasi Otomatis
            </p>
          </div>
        </div>

        {/* Sync Status / Quick Sync Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Sinkronkan database sekarang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Menyinkronkan...' : 'Sinkron'}</span>
          </button>
        </div>
      </div>

      {/* Persistent Google Spreadsheet Status Bar */}
      <div className="mt-2.5 flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <button
            type="button"
            onClick={onOpenSheetModal}
            className="font-bold text-emerald-900 truncate hover:underline text-left cursor-pointer flex items-center gap-1"
          >
            <span>Google Spreadsheet: {sheetTitle || 'Database Keuangan RQ Ulul Azmi (RAB & LAB)'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
            Selalu Aktif
          </span>
          <button
            type="button"
            onClick={onOpenSheetModal}
            className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
          >
            Pengaturan
          </button>
        </div>
      </div>
    </header>
  );
};
