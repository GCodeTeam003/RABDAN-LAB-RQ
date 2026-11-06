import React, { useState } from 'react';
import { LABRecord, TransaksiRecord } from '../types';
import { formatRupiah } from '../utils/formatters';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Hash,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface FinancialSummaryBannerProps {
  labList: LABRecord[];
  transaksiList: TransaksiRecord[];
  activeLabId?: string;
  onSelectLabId?: (id: string) => void;
}

export const FinancialSummaryBanner: React.FC<FinancialSummaryBannerProps> = ({
  labList,
  transaksiList,
  activeLabId,
  onSelectLabId,
}) => {
  // Mode: specific lab ID or 'all'
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (activeLabId) return activeLabId;
    return labList.length > 0 ? labList[0].id : 'all';
  });

  // Keep in sync with incoming props
  React.useEffect(() => {
    if (activeLabId) {
      setSelectedId(activeLabId);
    } else if (labList.length > 0 && selectedId === 'all') {
      setSelectedId(labList[0].id);
    }
  }, [activeLabId, labList]);

  const handlePeriodChange = (id: string) => {
    setSelectedId(id);
    if (onSelectLabId) {
      onSelectLabId(id);
    }
  };

  // If no LAB exists yet
  if (labList.length === 0) {
    return (
      <div className="mb-4 sm:mb-5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs sm:text-sm">
              Ringkasan Kas Keuangan Real-time
            </div>
            <p className="text-[11px] text-slate-500">
              Buat LAB pertama di tab &quot;LAB&quot; untuk mengaktifkan pemantauan saldo kas otomatis.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-white/80 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Siap Digunakan</span>
        </div>
      </div>
    );
  }

  // Calculate statistics based on selected LAB or All
  let saldoAwal = 0;
  let totalMasuk = 0;
  let totalKeluar = 0;
  let saldoAkhir = 0;
  let trxCount = 0;
  let periodLabel = '';
  let periodSub = '';

  if (selectedId === 'all') {
    // Cumulative across all LABs
    saldoAwal = labList.reduce((acc, l) => acc + (Number(l.saldoAwal) || 0), 0);
    totalMasuk = transaksiList.reduce((acc, t) => acc + (Number(t.masuk) || 0), 0);
    totalKeluar = transaksiList.reduce((acc, t) => acc + (Number(t.keluar) || 0), 0);
    saldoAkhir = saldoAwal + totalMasuk - totalKeluar;
    trxCount = transaksiList.length;
    periodLabel = 'Akumulasi Keseluruhan LAB';
    periodSub = `${labList.length} Periode LAB Aktif`;
  } else {
    const currentLab = labList.find((l) => l.id === selectedId) || labList[0];
    const labTrx = transaksiList.filter((t) => t.idLAB === currentLab.id);

    saldoAwal = Number(currentLab.saldoAwal) || 0;
    totalMasuk = labTrx.reduce((acc, t) => acc + (Number(t.masuk) || 0), 0);
    totalKeluar = labTrx.reduce((acc, t) => acc + (Number(t.keluar) || 0), 0);
    saldoAkhir = saldoAwal + totalMasuk - totalKeluar;
    trxCount = labTrx.length;
    periodLabel = `${currentLab.bulan} ${currentLab.tahun}`;
    periodSub = currentLab.nomor || 'LAB Resmi';
  }

  return (
    <section aria-label="Ringkasan Kas Keuangan" className="mb-4 sm:mb-6 space-y-2">
      {/* Period Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-slate-700">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Ringkasan Keuangan
          </span>
          <span className="text-xs text-slate-400">&bull;</span>
          <span className="text-xs font-semibold text-emerald-800 truncate">
            {periodLabel}
          </span>
        </div>

        {/* Dropdown Periode */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="period-select" className="sr-only">Pilih Periode Kas</label>
          <select
            id="period-select"
            value={selectedId}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-2.5 py-1 shadow-2xs hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            {labList.map((l) => (
              <option key={l.id} value={l.id}>
                {l.bulan} {l.tahun} ({l.nomor})
              </option>
            ))}
            <option value="all">Akumulasi Semua LAB</option>
          </select>
        </div>
      </div>

      {/* Grid Kartu Ringkasan (5 Metrik: Saldo Awal, Total Masuk, Total Keluar, Saldo Akhir, Jumlah Transaksi) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
        {/* 1. Saldo Awal */}
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Saldo Awal</span>
            <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 font-bold text-slate-900 text-xs sm:text-sm truncate" title={formatRupiah(saldoAwal)}>
            {formatRupiah(saldoAwal)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 truncate">Kas Permulaan</span>
        </div>

        {/* 2. Total Masuk */}
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between gap-1 text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Masuk</span>
            <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 font-bold text-emerald-700 text-xs sm:text-sm truncate" title={formatRupiah(totalMasuk)}>
            +{formatRupiah(totalMasuk)}
          </div>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 truncate">Infaq &amp; Donasi</span>
        </div>

        {/* 3. Total Keluar */}
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-rose-200/80 shadow-2xs flex flex-col justify-between bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex items-center justify-between gap-1 text-rose-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Keluar</span>
            <div className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 font-bold text-rose-700 text-xs sm:text-sm truncate" title={formatRupiah(totalKeluar)}>
            -{formatRupiah(totalKeluar)}
          </div>
          <span className="text-[10px] text-rose-600/80 mt-0.5 truncate">Belanja Operasional</span>
        </div>

        {/* 4. Jumlah Transaksi */}
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Transaksi</span>
            <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Hash className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 font-bold text-slate-900 text-xs sm:text-sm truncate">
            {trxCount} <span className="text-[11px] font-medium text-slate-500">Mutasi</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 truncate">Catatan Kas</span>
        </div>

        {/* 5. Saldo Akhir (Prominent Highlight Card) */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-800 p-2.5 sm:p-3 rounded-2xl text-white shadow-xs flex flex-col justify-between border border-emerald-600">
          <div className="flex items-center justify-between gap-1 text-emerald-100">
            <span className="text-[11px] font-bold uppercase tracking-wider">Saldo Akhir</span>
            <div className="w-5 h-5 rounded-md bg-white/20 text-white flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 font-black text-white text-sm sm:text-base tracking-tight truncate" title={formatRupiah(saldoAkhir)}>
            {formatRupiah(saldoAkhir)}
          </div>
          <div className="text-[10px] text-emerald-200 font-medium mt-0.5 flex items-center justify-between">
            <span className="truncate">Sisa Kas Tersedia</span>
            <span className="hidden sm:inline w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
          </div>
        </div>
      </div>
    </section>
  );
};
