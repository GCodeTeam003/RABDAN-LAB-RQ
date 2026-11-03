import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { TabTransaksi } from './components/TabTransaksi';
import { TabLAB } from './components/TabLAB';
import { TabRAB } from './components/TabRAB';
import { TabRiwayat } from './components/TabRiwayat';
import { SheetConfigModal } from './components/SheetConfigModal';
import { ConfirmModal } from './components/ConfirmModal';
import { LABRecord, RABRecord, TransaksiRecord } from './types';
import {
  getLocalData,
  persistLAB,
  persistRAB,
  persistTransaksi,
  deleteLocalTransaksi,
  deleteLocalLAB,
  deleteLocalRAB,
  syncFromGoogleSheets,
} from './services/storage';
import { initAuth, googleSignIn, logout, getAccessToken } from './services/auth';
import { SHEET_ID_KEY, checkSpreadsheetExists, createDatabaseSpreadsheet, DEFAULT_SHEET_TITLE } from './services/sheets';

export default function App() {
  const [activeTab, setActiveTab] = useState<'transaksi' | 'lab' | 'rab' | 'riwayat'>('transaksi');
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [sheetTitle, setSheetTitle] = useState<string>('Database Google Sheets');
  const [isSheetModalOpen, setIsSheetModalOpen] = useState<boolean>(false);

  // App Data
  const [labList, setLabList] = useState<LABRecord[]>([]);
  const [rabList, setRabList] = useState<RABRecord[]>([]);
  const [transaksiList, setTransaksiList] = useState<TransaksiRecord[]>([]);

  // Toast Notification
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info'; show: boolean }>({
    msg: '',
    type: 'info',
    show: false,
  });

  // Confirmation Modal for Destructive operations
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type, show: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4500);
  }, []);

  // Load initial local data
  const loadLocalSnapshot = useCallback(() => {
    const data = getLocalData();
    setLabList(data.labList);
    setRabList(data.rabList);
    setTransaksiList(data.transaksiList);
  }, []);

  // Sync with Google Sheets if token & spreadsheet are available
  const handleSyncData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const token = await getAccessToken();
      const currentSheetId = localStorage.getItem(SHEET_ID_KEY);

      if (token && currentSheetId) {
        const synced = await syncFromGoogleSheets();
        setLabList(synced.labList);
        setRabList(synced.rabList);
        setTransaksiList(synced.transaksiList);
        showToast('Sinkronisasi Google Sheets berhasil!', 'success');
      } else {
        loadLocalSnapshot();
      }
    } catch (e: any) {
      console.warn('Sync failed, using local mirror:', e);
      loadLocalSnapshot();
      showToast('Gagal memuat Google Sheet, menggunakan data lokal: ' + (e.message || ''), 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadLocalSnapshot, showToast]);

  // Initialize auth and listeners
  useEffect(() => {
    loadLocalSnapshot();

    const unsubscribe = initAuth(
      async (authUser, token) => {
        setUser(authUser);
        const currentSheetId = localStorage.getItem(SHEET_ID_KEY);
        if (currentSheetId) {
          const check = await checkSpreadsheetExists(token, currentSheetId);
          if (check.exists && check.title) {
            setSheetTitle(check.title);
          }
        }
        // Run sync
        handleSyncData();
      },
      () => {
        setUser(null);
      }
    );

    return () => unsubscribe();
  }, [handleSyncData, loadLocalSnapshot]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        showToast(`Selamat datang, ${res.user.displayName || res.user.email}!`, 'success');

        // Check if user has an existing sheet, otherwise automatically create or prompt
        const currentSheetId = localStorage.getItem(SHEET_ID_KEY);
        if (!currentSheetId) {
          showToast('Menyiapkan Google Sheets database untuk Anda...', 'info');
          try {
            const meta = await createDatabaseSpreadsheet(res.accessToken, DEFAULT_SHEET_TITLE);
            setSheetTitle(meta.name);
            showToast('Google Sheet database berhasil dibuat di Google Drive Anda!', 'success');
          } catch (createErr: any) {
            console.error('Auto create sheet error:', createErr);
          }
        }
        await handleSyncData();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showToast('Gagal masuk dengan Google: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    showToast('Berhasil keluar dari akun Google', 'info');
  };

  // Handlers for creating records
  const handleSubmitTransaksi = async (data: {
    idLAB: string;
    tanggal: string;
    keterangan: string;
    masuk: number;
    keluar: number;
  }) => {
    const newTrx: TransaksiRecord = {
      id: 'trx-' + Date.now(),
      idLAB: data.idLAB,
      tanggal: data.tanggal,
      keterangan: data.keterangan,
      masuk: data.masuk,
      keluar: data.keluar,
      createdAt: new Date().toISOString(),
    };

    const res = await persistTransaksi(newTrx);
    loadLocalSnapshot();
    return { idLAB: data.idLAB, updatedLAB: res.updatedLAB };
  };

  const handleSubmitLAB = async (
    data: Omit<LABRecord, 'id' | 'totalMasuk' | 'totalKeluar' | 'saldoAkhir' | 'trxCount' | 'hasLink'>
  ): Promise<LABRecord> => {
    const newLAB: LABRecord = {
      ...data,
      id: 'lab-' + Date.now(),
      totalMasuk: 0,
      totalKeluar: 0,
      saldoAkhir: data.saldoAwal,
      trxCount: 0,
      hasLink: true,
      createdAt: new Date().toISOString(),
    };

    await persistLAB(newLAB);
    loadLocalSnapshot();
    return newLAB;
  };

  const handleSubmitRAB = async (
    data: Omit<RABRecord, 'id' | 'hasLink'>
  ): Promise<RABRecord> => {
    const newRAB: RABRecord = {
      ...data,
      id: 'rab-' + Date.now(),
      hasLink: true,
      createdAt: new Date().toISOString(),
    };

    await persistRAB(newRAB);
    loadLocalSnapshot();
    return newRAB;
  };

  // Deletions with explicit confirmation (Destructive operations requirement)
  const handleRequestDeleteTransaksi = (trx: TransaksiRecord) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Catatan Transaksi?',
      message: `Apakah Anda yakin ingin menghapus transaksi "${trx.keterangan}" sebesar ${trx.masuk > 0 ? 'Rp ' + trx.masuk.toLocaleString('id-ID') : 'Rp ' + trx.keluar.toLocaleString('id-ID')}? Tindakan ini akan memperbarui saldo kas.`,
      onConfirm: async () => {
        await deleteLocalTransaksi(trx.id);
        loadLocalSnapshot();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('Transaksi berhasil dihapus', 'success');
      },
    });
  };

  const handleRequestDeleteLAB = (lab: LABRecord) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Laporan Anggaran Bulanan (LAB)?',
      message: `Hapus LAB periode ${lab.bulan} ${lab.tahun} (${lab.nomor}) beserta seluruh transaksi yang terkait?`,
      onConfirm: async () => {
        await deleteLocalLAB(lab.id);
        loadLocalSnapshot();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('LAB berhasil dihapus', 'success');
      },
    });
  };

  const handleRequestDeleteRAB = (rab: RABRecord) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Rencana Anggaran Biaya (RAB)?',
      message: `Hapus RAB periode ${rab.bulan} ${rab.tahun} (${rab.nomor}) dengan total anggaran Rp ${rab.total.toLocaleString('id-ID')}?`,
      onConfirm: async () => {
        await deleteLocalRAB(rab.id);
        loadLocalSnapshot();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('RAB berhasil dihapus', 'success');
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 antialiased font-sans p-3 sm:p-6 pb-24 sm:pb-8 flex flex-col justify-between">
      <div className="max-w-xl mx-auto w-full">
        {/* Navigation & Header */}
        <Navbar
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          isLoggingIn={isLoggingIn}
          onOpenSheetModal={() => setIsSheetModalOpen(true)}
          sheetTitle={sheetTitle}
        />

        {/* Desktop / Tablet Tab Switcher (On mobile, uses the bottom nav bar) */}
        <nav aria-label="Menu Utama" className="hidden sm:flex bg-white p-1.5 rounded-2xl shadow-xs border border-slate-200 mb-5 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('transaksi')}
            className={`flex-1 py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'transaksi'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💰 Transaksi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lab')}
            className={`flex-1 py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'lab'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📅 LAB
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rab')}
            className={`flex-1 py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'rab'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📝 RAB
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('riwayat')}
            className={`flex-1 py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'riwayat'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Riwayat
          </button>
        </nav>

        {/* Tab Views */}
        <main>
          {activeTab === 'transaksi' && (
            <TabTransaksi
              labList={labList}
              transaksiList={transaksiList}
              onSubmitTransaksi={handleSubmitTransaksi}
              onRequestDelete={handleRequestDeleteTransaksi}
              onNotify={showToast}
            />
          )}

          {activeTab === 'lab' && (
            <TabLAB
              labList={labList}
              onSubmitLAB={handleSubmitLAB}
              onNotify={showToast}
              onSwitchToTransaksi={() => setActiveTab('transaksi')}
            />
          )}

          {activeTab === 'rab' && (
            <TabRAB
              rabList={rabList}
              onSubmitRAB={handleSubmitRAB}
              onNotify={showToast}
            />
          )}

          {activeTab === 'riwayat' && (
            <TabRiwayat
              labList={labList}
              rabList={rabList}
              transaksiList={transaksiList}
              onRefresh={handleSyncData}
              isRefreshing={isRefreshing}
              onNotify={showToast}
              onRequestDeleteLAB={handleRequestDeleteLAB}
              onRequestDeleteRAB={handleRequestDeleteRAB}
            />
          )}
        </main>
      </div>

      {/* Footer info */}
      <footer className="mt-8 text-center text-xs text-slate-400 py-3 hidden sm:block">
        FIA (Finance Instansi Azmi) &bull; Rumah Qur&apos;an Ulul Azmi &bull; Yayasan Mutiara Ummah (YMU)
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(t) => setActiveTab(t)}
      />

      {/* Modals & Toast */}
      <SheetConfigModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        onSync={handleSyncData}
        sheetTitle={sheetTitle}
        setSheetTitle={setSheetTitle}
        onNotify={showToast}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Floating Toast Notification */}
      {toast.show && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-xl transition-all max-w-[90vw] text-center ${
            toast.type === 'success'
              ? 'bg-emerald-600 shadow-emerald-900/20'
              : toast.type === 'error'
              ? 'bg-rose-600 shadow-rose-900/20'
              : 'bg-slate-800 shadow-slate-900/20'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
