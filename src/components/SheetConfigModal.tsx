import React, { useState } from 'react';
import { FileSpreadsheet, PlusCircle, RefreshCw, X, ExternalLink, Check, Copy } from 'lucide-react';
import { SHEET_ID_KEY, DEFAULT_SHEET_TITLE, createDatabaseSpreadsheet } from '../services/sheets';
import { getAccessToken } from '../services/auth';

interface SheetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: () => Promise<void>;
  sheetTitle: string;
  setSheetTitle: (title: string) => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export const SheetConfigModal: React.FC<SheetConfigModalProps> = ({
  isOpen,
  onClose,
  onSync,
  sheetTitle,
  setSheetTitle,
  onNotify,
}) => {
  const [sheetInput, setSheetInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentSheetId = typeof window !== 'undefined' ? localStorage.getItem(SHEET_ID_KEY) : '';

  const handleSaveSheetId = (e: React.FormEvent) => {
    e.preventDefault();
    let val = sheetInput.trim();
    if (!val) {
      onNotify('Masukkan ID atau URL Google Sheet', 'error');
      return;
    }
    // Extract ID if a full URL was pasted
    const match = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      val = match[1];
    }
    localStorage.setItem(SHEET_ID_KEY, val);
    setSheetTitle('Google Sheet Terhubung');
    onNotify('ID Google Sheet berhasil disimpan!', 'success');
    setSheetInput('');
    onSync();
  };

  const handleCreateNewSheet = async () => {
    setIsCreating(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        onNotify('Harap klik "Tautkan Google" terlebih dahulu untuk membuat Spreadsheet di Google Drive Anda.', 'error');
        setIsCreating(false);
        return;
      }
      const meta = await createDatabaseSpreadsheet(token, DEFAULT_SHEET_TITLE);
      setSheetTitle(meta.name);
      onNotify('Google Sheet berhasil dibuat & ditautkan sebagai database!', 'success');
      await onSync();
    } catch (err: any) {
      onNotify('Gagal membuat Google Sheet: ' + (err.message || 'Periksa koneksi'), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onSync();
      onNotify('Berhasil menyinkronkan data dengan Google Sheets!', 'success');
    } catch (err: any) {
      onNotify('Gagal sinkronisasi: ' + (err.message || 'Periksa izin Google Sheets'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const copySheetId = () => {
    if (currentSheetId) {
      navigator.clipboard.writeText(currentSheetId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold">Koneksi Google Sheets</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs sm:text-sm text-slate-600">
          {/* Current Status */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Status Spreadsheet Aktif
            </div>
            {currentSheetId ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800 truncate pr-2">
                    {sheetTitle || 'Database Keuangan RQ Ulul Azmi'}
                  </span>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${currentSheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline shrink-0"
                  >
                    Buka File <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] bg-white px-2 py-1 rounded border border-slate-200 text-slate-600 truncate flex-1 font-mono">
                    {currentSheetId}
                  </code>
                  <button
                    type="button"
                    onClick={copySheetId}
                    className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600"
                    title="Salin ID"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 italic">
                Belum ada Google Sheet yang ditautkan. Data saat ini tersimpan di penyimpanan lokal dan siap disinkronkan.
              </p>
            )}
          </div>

          {/* Quick Create Button */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
            <div className="font-semibold text-emerald-900 text-sm">
              Buat Spreadsheet Database Otomatis
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Sistem akan membuat Google Spreadsheet di Google Drive Anda dengan 4 lembar kerja (LAB_Master, Transaksi, RAB_Master, RAB_Items) dan header tabel otomatis.
            </p>
            <button
              type="button"
              onClick={handleCreateNewSheet}
              disabled={isCreating}
              className="mt-1 w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-xs transition-colors disabled:opacity-50 text-xs sm:text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isCreating ? 'Sedang Membuat di Google Drive...' : 'Buat Google Sheet Otomatis'}</span>
            </button>
          </div>

          {/* Link Existing Sheet */}
          <form onSubmit={handleSaveSheetId} className="space-y-2 pt-1">
            <label className="block text-xs font-semibold text-slate-700">
              Atau Tautkan ID / URL Google Sheet yang Sudah Ada
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-xs sm:text-sm transition-colors shrink-0"
              >
                Simpan
              </button>
            </div>
          </form>

          {/* Manual Sync Button */}
          {currentSheetId && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-xs sm:text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sedang Menyinkronkan...' : 'Sinkronkan Data Sekarang'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs sm:text-sm transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
