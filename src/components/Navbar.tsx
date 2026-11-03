import React from 'react';
import { User } from 'firebase/auth';
import { FileSpreadsheet, LogOut, ExternalLink, Database, Sparkles } from 'lucide-react';
import { SHEET_ID_KEY } from '../services/sheets';

interface NavbarProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  onOpenSheetModal: () => void;
  sheetTitle: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  onOpenSheetModal,
  sheetTitle,
}) => {
  const currentSheetId = typeof window !== 'undefined' ? localStorage.getItem(SHEET_ID_KEY) : null;

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
              Manajemen RAB, LAB & Kas Pesantren
            </p>
          </div>
        </div>

        {/* User / Google Sign-in */}
        <div className="flex items-center gap-1.5 shrink-0">
          {user ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg text-xs">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <span className="max-w-[80px] sm:max-w-[120px] truncate font-medium text-slate-700 text-[11px]">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                title="Keluar"
                aria-label="Keluar akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              disabled={isLoggingIn}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isLoggingIn ? '...' : 'Tautkan Google'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Google Sheets Status Pill & Quick Action Bar */}
      <div className="mt-2.5 flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
        <button
          type="button"
          onClick={onOpenSheetModal}
          className="flex items-center gap-1.5 text-left text-slate-700 hover:text-emerald-700 transition-colors min-w-0"
        >
          <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-semibold text-slate-800 truncate">
            {currentSheetId ? 'Google Sheets Terhubung' : 'Penyimpanan Database Lokal'}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 font-bold rounded border border-emerald-200 shrink-0">
            ⚙️ Atur
          </span>
        </button>

        {currentSheetId && (
          <a
            href={`https://docs.google.com/spreadsheets/d/${currentSheetId}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 shrink-0 underline ml-2"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buka Sheet</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </header>
  );
};
