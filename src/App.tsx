import { useState, useEffect, useCallback } from 'react';
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
  fetchSharedData,
  persistLAB,
  persistRAB,
  persistTransaksi,
  deleteLocalTransaksi,
  deleteLocalLAB,
  deleteLocalRAB,
} from './services/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'transaksi' | 'lab' | 'rab' | 'riwayat'>('transaksi');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [sheetTitle, setSheetTitle] = useState<string>('Database Keuangan RQ Ulul Azmi (RAB & LAB)');
  const [webAppUrl, setWebAppUrl] = useState<string>(
    'https://script.google.com/macros/s/AKfycby_qu393Ks92Sqp6NhkObIjiuTmQo4nDcCOPCc7uTOh2y4ikulZVA2dopXk9Ve0nYZo/exec'
  );
  const [isSheetModalOpen, setIsSheetModalOpen] = useState<boolean>(false);

  // Shared Multi-user App Data
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

  // Fetch shared database data from central server
  const loadSharedData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const data = await fetchSharedData();
      if (data) {
        setLabList(data.labList);
        setRabList(data.rabList);
        setTransaksiList(data.transaksiList);
        if (data.sheetConfig) {
          if (data.sheetConfig.spreadsheetName) {
            setSheetTitle(data.sheetConfig.spreadsheetName);
          }
          if (data.sheetConfig.webAppUrl) {
            setWebAppUrl(data.sheetConfig.webAppUrl);
          }
        }
      }
    } catch (e: any) {
      console.warn('Failed to load shared data:', e);
      if (!silent) {
        showToast('Gagal memuat data terbaru dari server: ' + (e.message || ''), 'error');
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [showToast]);

  // Initial load and real-time auto-sync polling (every 6 seconds)
  useEffect(() => {
    loadSharedData();

    // Auto-sync interval so multiple users see updates simultaneously
    const interval = setInterval(() => {
      loadSharedData(true);
    }, 6000);

    return () => clearInterval(interval);
  }, [loadSharedData]);

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
    await loadSharedData(true);
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
    await loadSharedData(true);
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
    await loadSharedData(true);
    return newRAB;
  };

  // Deletions with explicit confirmation (Destructive operations requirement)
  const handleRequestDeleteTransaksi = (trx: TransaksiRecord) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Catatan Transaksi?',
      message: `Apakah Anda yakin ingin menghapus transaksi "${trx.keterangan}" sebesar ${trx.masuk > 0 ? 'Rp ' + trx.masuk.toLocaleString('id-ID') : 'Rp ' + trx.keluar.toLocaleString('id-ID')}? Tindakan ini akan memperbarui saldo kas untuk semua pengguna.`,
      onConfirm: async () => {
        await deleteLocalTransaksi(trx.id);
        await loadSharedData(true);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('Transaksi berhasil dihapus dari database', 'success');
      },
    });
  };

  const handleRequestDeleteLAB = (lab: LABRecord) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Laporan Anggaran Bulanan (LAB)?',
      message: `Hapus LAB periode ${lab.bulan} ${lab.tahun} (${lab.nomor}) beserta seluruh transaksi yang terkait untuk semua pengguna?`,
      onConfirm: async () => {
        await deleteLocalLAB(lab.id);
        await loadSharedData(true);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('LAB berhasil dihapus dari database', 'success');
      },
    });
  };

  const handleRequestDeleteRAB = (rab: RABRecord) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Rencana Anggaran Biaya (RAB)?',
      message: `Hapus RAB periode ${rab.bulan} ${rab.tahun} (${rab.nomor}) dengan total anggaran Rp ${rab.total.toLocaleString('id-ID')} untuk semua pengguna?`,
      onConfirm: async () => {
        await deleteLocalRAB(rab.id);
        await loadSharedData(true);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('RAB berhasil dihapus dari database', 'success');
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 antialiased font-sans p-3 sm:p-6 pb-24 sm:pb-8 flex flex-col justify-between">
      <div className="max-w-xl mx-auto w-full">
        {/* Navigation & Header */}
        <Navbar
          user={null}
          onLogin={() => {}}
          onLogout={() => {}}
          isLoggingIn={false}
          onOpenSheetModal={() => setIsSheetModalOpen(true)}
          sheetTitle={sheetTitle}
          isSyncing={isRefreshing}
          onManualSync={() => loadSharedData(false)}
        />

        {/* Desktop / Tablet Tab Switcher (On mobile, uses the bottom nav bar) */}
        <nav aria-label="Menu Utama" className="hidden sm:flex bg-white p-1.5 rounded-2xl shadow-xs border border-slate-200 mb-5 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('transaksi')}
            className={`flex-1 py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
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
            className={`flex-1 py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
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
            className={`flex-1 py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
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
            className={`flex-1 py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
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
              onRefresh={() => loadSharedData(false)}
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
        FIA (Finance Instansi Azmi) &bull; Rumah Qur&apos;an Ulul Azmi &bull; Yayasan Misykatul Ummah (YMU)
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
        onSync={() => loadSharedData(false)}
        sheetTitle={sheetTitle}
        setSheetTitle={setSheetTitle}
        onNotify={showToast}
        initialWebAppUrl={webAppUrl}
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
          className={`fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-xl transition-all max-w-[90vw] text-center ${
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
