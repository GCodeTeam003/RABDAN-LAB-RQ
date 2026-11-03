import React, { useState } from 'react';
import { FileSpreadsheet, X, Check, Copy, RefreshCw, Zap, ShieldCheck, Code2 } from 'lucide-react';
import { updateSheetConfig } from '../services/storage';

interface SheetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: () => Promise<void>;
  sheetTitle: string;
  setSheetTitle: (title: string) => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
  initialWebAppUrl?: string;
}

export const SheetConfigModal: React.FC<SheetConfigModalProps> = ({
  isOpen,
  onClose,
  onSync,
  sheetTitle,
  setSheetTitle,
  onNotify,
  initialWebAppUrl = 'https://script.google.com/macros/s/AKfycby_qu393Ks92Sqp6NhkObIjiuTmQo4nDcCOPCc7uTOh2y4ikulZVA2dopXk9Ve0nYZo/exec',
}) => {
  const [webAppUrl, setWebAppUrl] = useState(initialWebAppUrl);
  const [spreadsheetName, setSpreadsheetName] = useState(sheetTitle || 'Database Keuangan RQ Ulul Azmi (RAB & LAB)');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCode, setShowCode] = useState(false);

  if (!isOpen) return null;

  const sampleAppsScriptCode = `// KODE GOOGLE APPS SCRIPT UNTUK DATABASE FIA
// 1. Buka Google Sheet -> Ekstensi -> Apps Script
// 2. Tempel kode ini -> Simpan
// 3. Klik Terapkan (Deploy) -> Penerapan Baru (New Deployment) -> Jenis: Aplikasi Web (Web App)
// 4. Akses: Siapa Saja (Anyone) -> Terapkan -> Salin URL Aplikasi Web

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var data = payload.data;
    
    if (action === "submitTransaksi") {
      var sheet = ss.getSheetByName("Transaksi") || ss.insertSheet("Transaksi");
      sheet.appendRow([data.id, data.idLAB, data.tanggal, data.keterangan, data.masuk, data.keluar, new Date()]);
    } else if (action === "submitLAB") {
      var sheet = ss.getSheetByName("LAB_Master") || ss.insertSheet("LAB_Master");
      sheet.appendRow([data.id, data.nomor, data.bulan, data.tahun, data.tanggal, data.kota, data.ketuaRQ, data.bendaharaRQ, data.saldoAwal, data.totalMasuk, data.totalKeluar, data.saldoAkhir, data.trxCount, "Ada", "", new Date()]);
    } else if (action === "submitRAB") {
      var sheet = ss.getSheetByName("RAB_Master") || ss.insertSheet("RAB_Master");
      sheet.appendRow([data.id, data.nomor, data.bulan, data.tahun, data.tanggal, data.kota, data.ketuaRQ, data.bendaharaRQ, data.ketuaYayasan, data.total, data.itemCount, "Ada", "", new Date()]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSheetConfig({
        spreadsheetName,
        webAppUrl: webAppUrl.trim(),
      });
      setSheetTitle(spreadsheetName);
      onNotify('Pengaturan Google Spreadsheet tersimpan!', 'success');
      await onSync();
    } catch (err: any) {
      onNotify('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onSync();
      onNotify('Data berhasil disinkronkan dengan server database & spreadsheet!', 'success');
    } catch (err: any) {
      onNotify('Gagal sinkron: ' + err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(sampleAppsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">Koneksi Google Spreadsheet</h3>
              <p className="text-[11px] text-slate-500">Mode Terbuka Otomatis Tanpa Login</p>
            </div>
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
          {/* Always Connected Status Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Koneksi Server Terbuka Aktif</span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed">
              Aplikasi ini telah terhubung ke database terpusat yang selalu tersinkronisasi. <strong>Semua orang dapat membuka, menambah transaksi, dan membuat dokumen secara bersamaan tanpa perlu login akun Google pribadi.</strong>
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Multi-user real-time sync aktif untuk semua perangkat</span>
            </div>
          </div>

          {/* Form Settings */}
          <form onSubmit={handleSaveConfig} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Nama Spreadsheet Database</label>
              <input
                type="text"
                value={spreadsheetName}
                onChange={(e) => setSpreadsheetName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Google Apps Script Web App / Webhook URL
              </label>
              <input
                type="url"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400">
                URL Google Apps Script dari spreadsheet Anda yang memungkinkan data otomatis terkirim ke spreadsheet tanpa perlu login.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sync...' : 'Sinkronkan'}</span>
              </button>
            </div>
          </form>

          {/* Toggle Script Helper */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showCode ? 'Tutup Petunjuk Script Google Sheet' : 'Lihat / Salin Script Webhook Google Sheet'}</span>
            </button>

            {showCode && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-2 relative">
                <div className="flex justify-between items-center text-slate-400 pb-1 border-b border-slate-800">
                  <span>Google Apps Script</span>
                  <button
                    type="button"
                    onClick={copyScript}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px]"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Tersalin' : 'Salin Script'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre max-h-48 text-[10px] leading-relaxed">
                  {sampleAppsScriptCode}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
