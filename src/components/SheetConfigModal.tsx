import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  X,
  Check,
  Copy,
  RefreshCw,
  ExternalLink,
  Download,
  AlertTriangle,
  LogIn,
  LogOut,
  FolderPlus,
  SendHorizontal,
  Code2,
  Database,
} from 'lucide-react';
import { AppGoogleUser } from '../services/auth';
import { updateSheetConfig } from '../services/storage';
import {
  createDatabaseSpreadsheet,
  syncEntireDatabaseToSheets,
  extractSpreadsheetId,
  exportToCSV,
} from '../services/sheets';
import { LABRecord, RABRecord, TransaksiRecord } from '../types';

interface SheetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: () => Promise<void>;
  sheetTitle: string;
  setSheetTitle: (title: string) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialWebAppUrl?: string;
  user: User | AppGoogleUser | null;
  sharedGoogleEmail?: string;
  accessToken: string | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  isLoggingIn: boolean;
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  labList: LABRecord[];
  transaksiList: TransaksiRecord[];
  rabList: RABRecord[];
}

export const SheetConfigModal: React.FC<SheetConfigModalProps> = ({
  isOpen,
  onClose,
  onSync,
  sheetTitle,
  setSheetTitle,
  onNotify,
  initialWebAppUrl = '',
  user,
  sharedGoogleEmail,
  accessToken,
  onLogin,
  onLogout,
  isLoggingIn,
  spreadsheetId,
  setSpreadsheetId,
  labList,
  transaksiList,
  rabList,
}) => {
  const [webAppUrl, setWebAppUrl] = useState(initialWebAppUrl);
  const [inputSheetId, setInputSheetId] = useState(spreadsheetId);
  const [spreadsheetName, setSpreadsheetName] = useState(sheetTitle || 'Database Keuangan RQ Ulul Azmi (RAB & LAB)');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isPushingData, setIsPushingData] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'webhook' | 'backup'>('direct');

  if (!isOpen) return null;

  const currentSheetId = extractSpreadsheetId(inputSheetId || spreadsheetId);

  const sampleAppsScriptCode = `// KODE GOOGLE APPS SCRIPT UNTUK DATABASE FIA
// 1. Buka Google Sheet Anda -> Ekstensi (Extensions) -> Apps Script
// 2. Hapus semua kode yang ada, ganti dengan seluruh kode ini -> Klik Simpan (Ctrl+S)
// 3. Klik Terapkan (Deploy) -> Penerapan baru (New deployment)
// 4. Pilih Jenis: "Aplikasi Web" (Web App)
// 5. Konfigurasi:
//    - Jalankan sebagai: "Saya" (Me)
//    - Yang memiliki akses: "Siapa saja" (Anyone) -> Terapkan
// 6. Salin URL Aplikasi Web (berakhiran /exec) dan tempel di Pengaturan FIA.

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, status: "FIA Webhook Aktif" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var data = payload.data;
    
    if (action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({ ok: true, message: "Koneksi berhasil" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "submitTransaksi") {
      var sheet = ss.getSheetByName("Transaksi") || ss.insertSheet("Transaksi");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["ID", "ID LAB", "Tanggal", "Keterangan", "Masuk", "Keluar", "Created At"]);
      }
      sheet.appendRow([data.id, data.idLAB, data.tanggal, data.keterangan, data.masuk, data.keluar, new Date()]);
    } else if (action === "submitLAB") {
      var sheet = ss.getSheetByName("LAB_Master") || ss.insertSheet("LAB_Master");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["ID", "Nomor Surat", "Bulan", "Tahun", "Tanggal Surat", "Kota", "Ketua RQ", "Bendahara RQ", "Saldo Awal", "Total Masuk", "Total Keluar", "Saldo Akhir", "Jumlah Transaksi", "Status PDF", "Link PDF", "Created At"]);
      }
      sheet.appendRow([data.id, data.nomor, data.bulan, data.tahun, data.tanggal, data.kota, data.ketuaRQ, data.bendaharaRQ, data.saldoAwal, data.totalMasuk, data.totalKeluar, data.saldoAkhir, data.trxCount, "Ada", "", new Date()]);
    } else if (action === "submitRAB") {
      var sheet = ss.getSheetByName("RAB_Master") || ss.insertSheet("RAB_Master");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["ID", "Nomor Surat", "Bulan", "Tahun", "Tanggal Surat", "Kota", "Ketua RQ", "Bendahara RQ", "Ketua Yayasan", "Total Anggaran", "Jumlah Item", "Status PDF", "Link PDF", "Created At"]);
      }
      sheet.appendRow([data.id, data.nomor, data.bulan, data.tahun, data.tanggal, data.kota, data.ketuaRQ, data.bendaharaRQ, data.ketuaYayasan, data.total, data.itemCount, "Ada", "", new Date()]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCreateAutoSheet = async () => {
    if (!accessToken) {
      onNotify('Silakan klik Masuk dengan Google terlebih dahulu.', 'error');
      return;
    }
    setIsCreatingSheet(true);
    try {
      const created = await createDatabaseSpreadsheet(accessToken, spreadsheetName);
      setInputSheetId(created.id);
      setSpreadsheetId(created.id);
      await updateSheetConfig({
        spreadsheetName,
        spreadsheetId: created.id,
      });
      onNotify(`Google Sheet baru berhasil dibuat di Google Drive Anda!`, 'success');
      // Push all existing data right away
      await handlePushAllToSheets(created.id);
    } catch (err: any) {
      onNotify('Gagal membuat spreadsheet: ' + err.message, 'error');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handlePushAllToSheets = async (targetId?: string) => {
    const idToUse = targetId || currentSheetId;
    if (!accessToken) {
      onNotify('Silakan Masuk dengan Google terlebih dahulu untuk menyinkronkan ke Google Sheet.', 'error');
      return;
    }
    if (!idToUse) {
      onNotify('Masukkan ID atau Tautan Google Spreadsheet terlebih dahulu.', 'error');
      return;
    }

    setIsPushingData(true);
    try {
      await syncEntireDatabaseToSheets(accessToken, idToUse, labList, transaksiList, rabList);
      onNotify(
        `Sukses! Semua data (${transaksiList.length} Transaksi, ${labList.length} LAB, ${rabList.length} RAB) berhasil masuk ke Google Spreadsheet!`,
        'success'
      );
    } catch (err: any) {
      onNotify('Gagal menyinkronkan ke Google Sheet: ' + err.message, 'error');
    } finally {
      setIsPushingData(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const cleanedId = extractSpreadsheetId(inputSheetId);
      await updateSheetConfig({
        spreadsheetName,
        spreadsheetId: cleanedId,
        webAppUrl: webAppUrl.trim(),
      });
      setSheetTitle(spreadsheetName);
      setSpreadsheetId(cleanedId);
      onNotify('Pengaturan Google Spreadsheet tersimpan!', 'success');
      await onSync();
    } catch (err: any) {
      onNotify('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    const trimmedUrl = webAppUrl.trim();
    if (!trimmedUrl || !trimmedUrl.startsWith('http')) {
      onNotify('Masukkan URL Webhook Google Apps Script terlebih dahulu.', 'error');
      return;
    }

    // Client-side instant pre-validation to guide user before calling server
    if (trimmedUrl.includes('docs.google.com/spreadsheets')) {
      const msg = 'Tautan yang dimasukkan adalah tautan Google Spreadsheet, bukan endpoint Web App Google Apps Script. Buka tab "Metode 1: Google API" untuk menghubungkan spreadsheet tersebut, atau buat Web App Apps Script sesuai panduan di bawah.';
      setTestResult({ ok: false, message: msg });
      onNotify(msg, 'error');
      return;
    }

    if (trimmedUrl.includes('/edit')) {
      const msg = 'Tautan berakhiran /edit adalah halaman editor kode Apps Script. Pastikan Anda klik "Terapkan (Deploy)" > "Penerapan baru (New deployment)" > Pilih "Aplikasi Web" > Akses: "Siapa saja (Anyone)", lalu salin URL yang berakhiran "/exec".';
      setTestResult({ ok: false, message: msg });
      onNotify(msg, 'error');
      return;
    }

    setIsTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/test-webhook?url=${encodeURIComponent(trimmedUrl)}`);
      const text = await res.text();
      let data: any = null;

      try {
        data = JSON.parse(text);
      } catch {
        // Handle non-JSON HTML/text response safely without SyntaxError
        const lower = text.toLowerCase();
        if (
          text.includes('<!DOCTYPE') ||
          text.includes('<html') ||
          lower.includes('the page cannot be found') ||
          lower.includes('the page could not be found')
        ) {
          data = {
            ok: false,
            message: 'Server Google mengembalikan halaman web HTML (Status ' + res.status + '). Pastikan URL berakhiran /exec dan saat deployment Web App di Google Spreadsheet, opsi "Yang memiliki akses (Who has access)" dipilih "Siapa saja (Anyone)".',
          };
        } else {
          data = {
            ok: false,
            message: 'Respon dari endpoint bukan format JSON yang valid. Silakan periksa kembali URL Web App Anda (' + (text.slice(0, 60) || 'Respon kosong') + ').',
          };
        }
      }

      setTestResult(data);
      if (data.ok) {
        onNotify(data.message, 'success');
      } else {
        onNotify(data.message, 'error');
      }
    } catch (e: any) {
      setTestResult({
        ok: false,
        message: 'Gagal menghubungi endpoint: ' + (e.message || 'Periksa koneksi internet Anda.'),
      });
      onNotify('Gagal menguji webhook.', 'error');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(sampleAppsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">Koneksi Database Google Sheets</h3>
              <p className="text-[11px] text-slate-500">FIA RQ Ulul Azmi &bull; Yayasan Misykatul Ummah</p>
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

        {/* Cloud Database Connected Banner */}
        <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <Database className="w-4 h-4 text-emerald-700" />
              <span>Cloud Database Aktif (Firestore / NoSQL)</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
              Tersambung Realtime
            </span>
          </div>
          <p className="leading-relaxed text-slate-700 text-[11px] sm:text-xs">
            Aplikasi FIA sudah <strong>otomatis terhubung ke Cloud Database NoSQL (Google Cloud Firestore)</strong> — setara dengan Supabase atau MongoDB. Seluruh data transaksi, LAB, dan RAB tersimpan permanen dan tersinkronisasi otomatis antar-perangkat tanpa perlu login.
          </p>
        </div>

        {/* Diagnosis Alert */}
        <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Mengapa data belum masuk ke Google Sheet sebelumnya?</span>
          </div>
          <p className="leading-relaxed text-slate-700">
            Google mewajibkan izin akses ke Google Sheet milik Anda. Tautan template Apps Script sebelumnya (dari bit.ly) berstatus <em>view-only</em> dan tidak memiliki hak akses ke spreadsheet Anda.
          </p>
          <p className="font-semibold text-emerald-900 pt-0.5">
            Pilih cara termudah di bawah untuk menghubungkan Google Sheet Anda:
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 mt-3 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`py-2 px-3 border-b-2 transition-colors ${
              activeTab === 'direct'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Metode 1: Google API (Resmi & Cepat)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('webhook')}
            className={`py-2 px-3 border-b-2 transition-colors ${
              activeTab === 'webhook'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Metode 2: Apps Script (Tanpa Login)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`py-2 px-3 border-b-2 transition-colors ${
              activeTab === 'backup'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Unduh CSV
          </button>
        </div>

        {/* Tab Contents */}
        <div className="py-3 text-xs sm:text-sm text-slate-600 space-y-3">
          {activeTab === 'direct' && (
            <div className="space-y-3">
              {/* Google Sign In status */}
              {(() => {
                const activeEmail = user?.email || sharedGoogleEmail;
                return activeEmail ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-300 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 uppercase tracking-wider font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Akun Google Terhubung Global</span>
                        </div>
                        <div className="font-bold text-emerald-950 text-xs sm:text-sm truncate max-w-[220px]">
                          {activeEmail}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onLogout}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Putuskan</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-800/95 leading-relaxed bg-white/70 p-2 rounded-xl border border-emerald-200/60">
                      ✅ <strong>Cukup Sekali Login:</strong> Akun ini telah tersimpan di Cloud Database FIA. Jika Anda berpindah ke HP, laptop, atau perangkat lain, sistem langsung terhubung otomatis ke spreadsheet ini tanpa perlu login ulang!
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Status Akun Google</div>
                      <div className="font-semibold text-slate-800 text-xs sm:text-sm truncate max-w-[200px]">
                        Belum Terhubung
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onLogin}
                      disabled={isLoggingIn}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
                    </button>
                  </div>
                );
              })()}

              {/* Spreadsheet ID / Link Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Tautan atau ID Google Spreadsheet Anda
                </label>
                <input
                  type="text"
                  value={inputSheetId}
                  onChange={(e) => setInputSheetId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1abc.../edit atau ID"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400">
                  Tempel URL Google Sheet tempat Anda ingin data tersimpan.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                {currentSheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${currentSheetId}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                    <span>Buka Google Sheet di Tab Baru</span>
                  </a>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCreateAutoSheet}
                    disabled={isCreatingSheet || !user}
                    className="py-2.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FolderPlus className={`w-3.5 h-3.5 ${isCreatingSheet ? 'animate-spin' : ''}`} />
                    <span>{isCreatingSheet ? 'Membuat Sheet...' : 'Buat Sheet Baru di Drive'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePushAllToSheets()}
                    disabled={isPushingData || !user || !currentSheetId}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <SendHorizontal className={`w-3.5 h-3.5 ${isPushingData ? 'animate-spin' : ''}`} />
                    <span>{isPushingData ? 'Mengirim Data...' : 'Kirim Semua Data Sekarang'}</span>
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 text-[11px] text-emerald-900 border border-emerald-100">
                Setelah terhubung, setiap kali Anda menambah transaksi, LAB, atau RAB, data akan langsung masuk ke tab <strong>LAB_Master</strong>, <strong>Transaksi</strong>, dan <strong>RAB_Master</strong> secara otomatis.
              </div>
            </div>
          )}

          {activeTab === 'webhook' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Gunakan metode ini jika Anda ingin <strong>siapa saja bisa input data tanpa harus login Google masing-masing</strong>. Pasang Apps Script di spreadsheet Anda:
              </p>

              <form onSubmit={handleSaveConfig} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    URL Google Apps Script Webhook Anda
                  </label>
                  <input
                    type="url"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={isTestingWebhook || !webAppUrl}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingWebhook ? 'animate-spin' : ''}`} />
                    <span>{isTestingWebhook ? 'Menguji...' : 'Uji Koneksi Webhook'}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs disabled:opacity-50"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan URL'}
                  </button>
                </div>
              </form>

              {testResult && (
                <div
                  className={`p-3 rounded-2xl text-xs border space-y-1.5 ${
                    testResult.ok
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-rose-50 text-rose-950 border-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {testResult.ok ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Koneksi Berhasil!</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Koneksi Gagal:</span>
                      </>
                    )}
                  </div>
                  <div className="leading-relaxed">{testResult.message}</div>
                  {!testResult.ok && (
                    <div className="mt-2 pt-2 border-t border-rose-200/60 text-[11px] text-rose-900 space-y-1">
                      <div className="font-semibold text-rose-950">Langkah Memperbaiki:</div>
                      <ol className="list-decimal pl-4 space-y-0.5">
                        <li>Buka spreadsheet Anda &gt; <strong>Ekstensi</strong> &gt; <strong>Apps Script</strong>.</li>
                        <li>Pastikan kode di bawah sudah disalin dan disimpan.</li>
                        <li>Klik <strong>Terapkan (Deploy)</strong> &gt; <strong>Penerapan baru (New deployment)</strong>.</li>
                        <li>Pilih jenis <strong>Aplikasi Web (Web App)</strong>.</li>
                        <li>Pada bagian <em>Yang memiliki akses (Who has access)</em>, pastikan pilih <strong>Siapa saja (Anyone)</strong>.</li>
                        <li>Salin URL hasil deploy yang berakhiran <strong>/exec</strong>.</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Toggle Script Helper */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showCode ? 'Sembunyikan Kode Apps Script' : 'Lihat / Salin Kode Apps Script Baru'}</span>
                </button>

                {showCode && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-2 relative">
                    <div className="flex justify-between items-center text-slate-400 pb-1 border-b border-slate-800">
                      <span>Kode Apps Script (Dengan doPost)</span>
                      <button
                        type="button"
                        onClick={copyScript}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px]"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? 'Tersalin' : 'Salin Kode'}</span>
                      </button>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre max-h-44 text-[10px] leading-relaxed">
                      {sampleAppsScriptCode}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Unduh file data cadangan dalam format CSV yang kompatibel 100% untuk langsung dibuka atau diimpor ke Google Sheets:
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    exportToCSV('transaksi', transaksiList);
                    onNotify('File Transaksi.csv diunduh!', 'success');
                  }}
                  className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold rounded-xl text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unduh CSV Data Transaksi ({transaksiList.length} data)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">.CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportToCSV('lab', labList);
                    onNotify('File LAB_Master.csv diunduh!', 'success');
                  }}
                  className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold rounded-xl text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unduh CSV Data LAB Bulanan ({labList.length} data)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">.CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportToCSV('rab', rabList);
                    onNotify('File RAB_Master.csv diunduh!', 'success');
                  }}
                  className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold rounded-xl text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unduh CSV Data RAB Anggaran ({rabList.length} data)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">.CSV</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={async () => {
              setIsSyncing(true);
              try {
                await onSync();
                onNotify('Data berhasil diperbarui dari database pusat!', 'success');
              } finally {
                setIsSyncing(false);
              }
            }}
            disabled={isSyncing}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Muat Ulang Server</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
