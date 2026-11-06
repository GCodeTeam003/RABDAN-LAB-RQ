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
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { updateSheetConfig } from '../services/storage';
import {
  createDatabaseSpreadsheet,
  syncEntireDatabaseToSheets,
  extractSpreadsheetId,
  exportToCSV,
} from '../services/sheets';
import { LABRecord, RABRecord, TransaksiRecord } from '../types';

const ADMIN_PIN_KEY = 'rq_fia_admin_pin';
const ADMIN_UNLOCKED_SESSION_KEY = 'rq_fia_admin_unlocked';

interface SheetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: () => Promise<void>;
  sheetTitle: string;
  setSheetTitle: (title: string) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialWebAppUrl?: string;
  user: User | null;
  accessToken: string | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  isLoggingIn: boolean;
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  labList: LABRecord[];
  transaksiList: TransaksiRecord[];
  rabList: RABRecord[];
  onOpenUnauthorizedDomainGuide?: () => void;
  initialTab?: 'direct' | 'webhook' | 'backup';
  onResetData?: () => void;
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
  accessToken,
  onLogin,
  onLogout,
  isLoggingIn,
  spreadsheetId,
  setSpreadsheetId,
  labList,
  transaksiList,
  rabList,
  onOpenUnauthorizedDomainGuide,
  initialTab = 'webhook',
  onResetData,
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
  const [activeTab, setActiveTab] = useState<'direct' | 'webhook' | 'backup'>(initialTab);

  // Admin PIN Gate State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(ADMIN_UNLOCKED_SESSION_KEY) === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  React.useEffect(() => {
    if (initialWebAppUrl && !webAppUrl) {
      setWebAppUrl(initialWebAppUrl);
    }
  }, [initialWebAppUrl]);

  React.useEffect(() => {
    if (spreadsheetId) {
      setInputSheetId(spreadsheetId);
    }
  }, [spreadsheetId, isOpen]);

  if (!isOpen) return null;

  const currentSheetId = extractSpreadsheetId(inputSheetId || spreadsheetId);

  // Complete, robust Apps Script for Google Sheets
  const sampleAppsScriptCode = `// ============================================================================
// KODE GOOGLE APPS SCRIPT DATABASE RESMI FIA (RQ ULUL AZMI)
// ============================================================================
// PANDUAN PENERAPAN OLEH ADMIN:
// 1. Buka Google Sheet Anda -> Klik "Ekstensi" (Extensions) -> "Apps Script".
// 2. Hapus seluruh isi kode lama, tempel SEMUA kode ini -> Klik Simpan (Ctrl+S).
// 3. Klik tombol biru "Terapkan" (Deploy) di kanan atas -> Pilih "Penerapan baru".
// 4. Pilih Jenis: "Aplikasi Web" (Web App).
// 5. Konfigurasi:
//    - Jalankan sebagai: "Saya" (Me - akun Google Anda)
//    - Yang memiliki akses: "Siapa saja" (Anyone)
// 6. Klik "Terapkan", berikan izin akses (Pilih Lanjutan -> Buka proyek).
// 7. Salin URL Aplikasi Web (berakhiran /exec) dan tempel di Pengaturan Admin FIA.
// SEMUA PERANGKAT LAIN OTOMATIS TERSINKRONISASI KE GOOGLE SHEET INI TANPA LOGIN!
// ============================================================================

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    ok: true, 
    status: "FIA Webhook Aktif",
    info: "RQ Ulul Azmi - Yayasan Misykatul Ummah"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var data = payload.data;
    
    // 1. Uji Koneksi Webhook
    if (action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({ 
        ok: true, 
        message: "Koneksi Google Apps Script Berhasil! Google Sheet siap menerima data dari seluruh perangkat." 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. Submit Transaksi Baru
    if (action === "submitTransaksi") {
      var sheet = ss.getSheetByName("Transaksi") || ss.insertSheet("Transaksi");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["ID Transaksi", "ID LAB", "Tanggal", "Keterangan", "Uang Masuk", "Uang Keluar", "Waktu Input"]);
      }
      sheet.appendRow([data.id, data.idLAB, data.tanggal, data.keterangan, Number(data.masuk)||0, Number(data.keluar)||0, new Date()]);
    }
    
    // 3. Edit Transaksi
    else if (action === "editTransaksi") {
      var sheet = ss.getSheetByName("Transaksi") || ss.insertSheet("Transaksi");
      var values = sheet.getDataRange().getValues();
      var foundRow = -1;
      for (var i = 1; i < values.length; i++) {
        if (values[i][0] == data.id) {
          foundRow = i + 1;
          break;
        }
      }
      if (foundRow > 0) {
        sheet.getRange(foundRow, 2, 1, 5).setValues([[data.idLAB, data.tanggal, data.keterangan, Number(data.masuk)||0, Number(data.keluar)||0]]);
      } else {
        sheet.appendRow([data.id, data.idLAB, data.tanggal, data.keterangan, Number(data.masuk)||0, Number(data.keluar)||0, new Date()]);
      }
    }
    
    // 4. Hapus Transaksi
    else if (action === "deleteTransaksi") {
      var sheet = ss.getSheetByName("Transaksi");
      if (sheet) {
        var values = sheet.getDataRange().getValues();
        for (var i = 1; i < values.length; i++) {
          if (values[i][0] == data.id) {
            sheet.deleteRow(i + 1);
            break;
          }
        }
      }
    }
    
    // 5. Submit LAB Baru
    else if (action === "submitLAB") {
      var sheet = ss.getSheetByName("LAB_Master") || ss.insertSheet("LAB_Master");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["ID LAB", "Nomor Surat", "Bulan", "Tahun", "Tanggal", "Kota", "Ketua RQ", "Bendahara RQ", "Saldo Awal", "Total Masuk", "Total Keluar", "Saldo Akhir", "Jumlah Trx", "Status PDF", "Waktu Input"]);
      }
      sheet.appendRow([data.id, data.nomor, data.bulan, data.tahun, data.tanggal, data.kota, data.ketuaRQ, data.bendaharaRQ, Number(data.saldoAwal)||0, Number(data.totalMasuk)||0, Number(data.totalKeluar)||0, Number(data.saldoAkhir)||0, data.trxCount||0, "Ada", new Date()]);
    }
    
    // 6. Hapus LAB
    else if (action === "deleteLAB") {
      var sheet = ss.getSheetByName("LAB_Master");
      if (sheet) {
        var values = sheet.getDataRange().getValues();
        for (var i = 1; i < values.length; i++) {
          if (values[i][0] == data.id) {
            sheet.deleteRow(i + 1);
            break;
          }
        }
      }
      var trxSheet = ss.getSheetByName("Transaksi");
      if (trxSheet) {
        var trxVals = trxSheet.getDataRange().getValues();
        for (var j = trxVals.length - 1; j >= 1; j--) {
          if (trxVals[j][1] == data.id) {
            trxSheet.deleteRow(j + 1);
          }
        }
      }
    }
    
    // 7. Submit RAB Baru
    else if (action === "submitRAB") {
      var sheet = ss.getSheetByName("RAB_Master") || ss.insertSheet("RAB_Master");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["ID RAB", "Nomor Surat", "Bulan", "Tahun", "Tanggal", "Kota", "Ketua RQ", "Bendahara RQ", "Ketua Yayasan", "Total Anggaran", "Jumlah Item", "Status PDF", "Waktu Input"]);
      }
      sheet.appendRow([data.id, data.nomor, data.bulan, data.tahun, data.tanggal, data.kota, data.ketuaRQ, data.bendaharaRQ, data.ketuaYayasan, Number(data.total)||0, data.itemCount||0, "Ada", new Date()]);
    }
    
    // 8. Hapus RAB
    else if (action === "deleteRAB") {
      var sheet = ss.getSheetByName("RAB_Master");
      if (sheet) {
        var values = sheet.getDataRange().getValues();
        for (var i = 1; i < values.length; i++) {
          if (values[i][0] == data.id) {
            sheet.deleteRow(i + 1);
            break;
          }
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ ok: true, action: action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const currentPin = localStorage.getItem(ADMIN_PIN_KEY) || '1234';
    if (pinInput.trim() === currentPin) {
      setIsUnlocked(true);
      setPinError('');
      sessionStorage.setItem(ADMIN_UNLOCKED_SESSION_KEY, 'true');
      onNotify('Akses Pengaturan Admin berhasil dibuka!', 'success');
    } else {
      setPinError('PIN Admin salah. Silakan coba lagi (PIN Default: 1234).');
    }
  };

  const handleLockAdmin = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem(ADMIN_UNLOCKED_SESSION_KEY);
    setPinInput('');
    onNotify('Sesi Admin telah dikunci.', 'info');
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length < 4) {
      onNotify('PIN minimal harus 4 digit/karakter.', 'error');
      return;
    }
    localStorage.setItem(ADMIN_PIN_KEY, newPin.trim());
    setNewPin('');
    setIsChangingPin(false);
    onNotify('PIN Admin baru berhasil disimpan!', 'success');
  };

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

  const handleSaveDirectSheetId = async () => {
    const cleanedId = extractSpreadsheetId(inputSheetId);
    if (!cleanedId) {
      onNotify('Silakan masukkan tautan atau ID Google Spreadsheet yang valid.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await updateSheetConfig({
        spreadsheetName,
        spreadsheetId: cleanedId,
        webAppUrl,
      });
      setSpreadsheetId(cleanedId);
      setInputSheetId(cleanedId);
      onNotify(
        'ID Google Spreadsheet berhasil disimpan permanen di Cloud Firestore! Tidak perlu ditautkan ulang lagi saat login atau reload.',
        'success'
      );
      await onSync();
    } catch (err: any) {
      onNotify('Gagal menyimpan ID: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
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
      onNotify('Pengaturan Google Spreadsheet tersimpan untuk semua perangkat!', 'success');
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

    if (trimmedUrl.includes('docs.google.com/spreadsheets')) {
      const msg = 'Tautan yang dimasukkan adalah tautan Google Spreadsheet, bukan endpoint Web App Google Apps Script. Salin URL Web App yang berakhiran /exec.';
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
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Pengaturan Database & Sinkronisasi
              </h3>
              <p className="text-[11px] text-slate-500">
                Khusus Admin &bull; Multi-Device Bebas Login
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isUnlocked && (
              <button
                type="button"
                onClick={handleLockAdmin}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Kunci Akses Admin"
              >
                <Lock className="w-4 h-4 text-slate-500" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PIN Challenge Screen (If locked) */}
        {!isUnlocked ? (
          <div className="py-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 flex items-center justify-center shadow-xs border border-emerald-200">
                <Lock className="w-7 h-7 text-emerald-700" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Verifikasi Akses Admin</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Aplikasi ini <strong>bebas login untuk semua perangkat</strong> (HP santri & pengurus). Halaman pengaturan ini hanya perlu dibuka oleh Admin untuk menyambungkan Google Spreadsheet atau mencadangkan data.
              </p>
            </div>

            <form onSubmit={handleUnlockAdmin} className="space-y-3 max-w-xs mx-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                  Masukkan PIN Pengaman Admin
                </label>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  placeholder="PIN Admin (Default: 1234)"
                  autoFocus
                  className="w-full text-center tracking-widest text-lg font-mono px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-slate-50"
                />
                {pinError && (
                  <p className="text-[11px] text-rose-600 text-center font-medium mt-1">{pinError}</p>
                )}
                <p className="text-[11px] text-slate-400 text-center mt-1">
                  PIN Bawaan: <span className="font-bold text-slate-600">1234</span>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Buka Pengaturan
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Full Admin Settings Panel */
          <>
            {/* Multi-Device Free Login Reassurance Banner */}
            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <Database className="w-4 h-4 text-emerald-700" />
                  <span>Cloud Database Aktif (Bebas Login di Semua HP/PC)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Tersambung Otomatis
                </span>
              </div>
              <p className="leading-relaxed text-slate-700 text-[11px] sm:text-xs">
                Perangkat lain <strong>TIDAK PERLU login Google</strong>. Semua santri dan pengurus bisa langsung mencatat dan melihat transaksi. Cukup Admin mengatur tautan Google Sheets di sini satu kali, dan seluruh data otomatis masuk ke spreadsheet Anda.
              </p>
            </div>

            {/* Tab Selection */}
            <div className="flex border-b border-slate-200 mt-3 text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('webhook')}
                className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'webhook'
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>Google Apps Script (Utama ⭐)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  Semua HP Bebas Login
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('backup')}
                className={`py-2 px-3 border-b-2 transition-colors shrink-0 cursor-pointer ${
                  activeTab === 'backup'
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Cadangan CSV &amp; PIN
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('direct')}
                className={`py-2 px-3 border-b-2 transition-colors shrink-0 cursor-pointer ${
                  activeTab === 'direct'
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Google API (Opsional Admin)
              </button>
            </div>

            {/* Tab Contents */}
            <div className="py-3 text-xs sm:text-sm text-slate-600 space-y-3">
              {/* TAB 1: WEBHOOK (UTAMA) */}
              {activeTab === 'webhook' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-emerald-600" />
                      <span>Cara Menghubungkan Google Sheet Anda (5 Langkah Mudah):</span>
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-700 text-[11px] leading-relaxed">
                      <li>Buka Google Spreadsheet milik Anda di komputer/browser.</li>
                      <li>Klik menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
                      <li>Hapus kode bawaan di sana, lalu klik tombol <strong>"Salin Seluruh Kode Apps Script"</strong> di bawah dan tempel ke Apps Script tersebut. Klik Simpan (Ctrl+S).</li>
                      <li>Klik tombol biru <strong>Terapkan (Deploy)</strong> di kanan atas &gt; <strong>Penerapan baru (New deployment)</strong> &gt; Pilih Jenis: <strong>Aplikasi Web (Web App)</strong>.</li>
                      <li>Pada <em>Yang memiliki akses (Who has access)</em>, pilih <strong>Siapa saja (Anyone)</strong>, lalu salin URL yang berakhiran <strong>/exec</strong> dan tempel di form bawah.</li>
                    </ol>
                  </div>

                  <form onSubmit={handleSaveConfig} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        URL Web App Google Apps Script Anda (/exec)
                      </label>
                      <input
                        type="url"
                        value={webAppUrl}
                        onChange={(e) => setWebAppUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-[11px] text-slate-500">
                        Setelah disimpan, server akan otomatis mengirim setiap transaksi ke URL ini.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleTestWebhook}
                        disabled={isTestingWebhook || !webAppUrl}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingWebhook ? 'animate-spin' : ''}`} />
                        <span>{isTestingWebhook ? 'Menguji...' : 'Uji Koneksi Webhook'}</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {isSaving ? 'Menyimpan...' : 'Simpan URL untuk Seluruh Sistem'}
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
                            <span>Koneksi Belum Berhasil:</span>
                          </>
                        )}
                      </div>
                      <div className="leading-relaxed">{testResult.message}</div>
                    </div>
                  )}

                  {/* Toggle Script Helper */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowCode(!showCode)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>{showCode ? 'Tutup Kode' : 'Lihat Kode Script'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={copyScript}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Kode Tersalin!' : 'Salin Seluruh Kode Apps Script'}</span>
                    </button>
                  </div>

                  {showCode && (
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-2 relative">
                      <pre className="overflow-x-auto whitespace-pre max-h-48 text-[10px] leading-relaxed">
                        {sampleAppsScriptCode}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: BACKUP & PIN */}
              {activeTab === 'backup' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-800">Ekspor Data ke File CSV:</div>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          exportToCSV('transaksi', transaksiList);
                          onNotify('File Transaksi.csv berhasil diunduh!', 'success');
                        }}
                        className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold rounded-xl text-xs flex items-center justify-between cursor-pointer"
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
                          onNotify('File LAB_Master.csv berhasil diunduh!', 'success');
                        }}
                        className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold rounded-xl text-xs flex items-center justify-between cursor-pointer"
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
                          onNotify('File RAB_Master.csv berhasil diunduh!', 'success');
                        }}
                        className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold rounded-xl text-xs flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Unduh CSV Data RAB Anggaran ({rabList.length} data)</span>
                        </div>
                        <span className="text-[10px] text-slate-400">.CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Pengaturan Ganti PIN */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ganti PIN Pengaman Admin</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsChangingPin(!isChangingPin)}
                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
                      >
                        {isChangingPin ? 'Batal' : 'Ubah PIN'}
                      </button>
                    </div>

                    {isChangingPin && (
                      <form onSubmit={handleSaveNewPin} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <input
                          type="password"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          placeholder="Masukkan 4 digit PIN baru"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono bg-white"
                        />
                        <button
                          type="submit"
                          className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Simpan PIN Baru
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: DIRECT GOOGLE API (OPSIONAL KHUSUS ADMIN) */}
              {activeTab === 'direct' && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                    <strong>Catatan:</strong> Fitur ini opsional dan khusus digunakan jika Admin ingin membuat spreadsheet baru secara otomatis ke Google Drive melalui browser ini. Perangkat lain tidak perlu menggunakan tab ini.
                  </div>

                  {/* Google Sign In status */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Akun Google Admin</div>
                      <div className="font-semibold text-slate-800 text-xs sm:text-sm truncate max-w-[200px]">
                        {user ? user.email : 'Belum Terhubung'}
                      </div>
                    </div>
                    {user ? (
                      <button
                        type="button"
                        onClick={onLogout}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onLogin}
                        disabled={isLoggingIn}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
                      </button>
                    )}
                  </div>

                  {!user && onOpenUnauthorizedDomainGuide && (
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Muncul <em>auth/unauthorized-domain</em>?</span>
                      </span>
                      <button
                        type="button"
                        onClick={onOpenUnauthorizedDomainGuide}
                        className="font-bold text-emerald-800 hover:text-emerald-950 underline shrink-0 cursor-pointer"
                      >
                        Atasi di sini
                      </button>
                    </div>
                  )}

                  {/* Permanent Connected Status Card */}
                  {currentSheetId && (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Status: Terhubung Permanen di Cloud</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-700 text-white">
                          Terkunci Otomatis
                        </span>
                      </div>
                      <div className="font-mono text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 break-all select-all text-slate-800">
                        {currentSheetId}
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        ID ini sudah tersimpan permanen di Cloud Firestore. <strong>Tidak perlu menautkan ulang setiap kali login atau membuka dari HP lain!</strong>
                      </p>
                    </div>
                  )}

                  {/* Spreadsheet ID / Link Input */}
                  <div className="space-y-1.5">
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
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveDirectSheetId}
                        disabled={isSaving || !inputSheetId.trim()}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'Menyimpan...' : 'Simpan & Kunci ID Ini Permanen di Cloud'}</span>
                      </button>
                    </div>
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
                        className="py-2.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <FolderPlus className={`w-3.5 h-3.5 ${isCreatingSheet ? 'animate-spin' : ''}`} />
                        <span>{isCreatingSheet ? 'Membuat Sheet...' : 'Buat Sheet Baru di Drive'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePushAllToSheets()}
                        disabled={isPushingData || !user || !currentSheetId}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <SendHorizontal className={`w-3.5 h-3.5 ${isPushingData ? 'animate-spin' : ''}`} />
                        <span>{isPushingData ? 'Mengirim Data...' : 'Kirim Semua Data Sekarang'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setIsSyncing(true);
                    try {
                      await onSync();
                      onNotify('Data berhasil dimuat ulang dari database pusat!', 'success');
                    } finally {
                      setIsSyncing(false);
                    }
                  }}
                  disabled={isSyncing}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Muat Ulang Server</span>
                </button>

                {onResetData && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onResetData();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer transition-colors"
                    title="Hapus semua data contoh dan bersihkan database"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Kosongkan Data Contoh</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
