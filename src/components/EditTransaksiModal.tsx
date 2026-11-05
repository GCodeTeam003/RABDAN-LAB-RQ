import React, { useState, useEffect } from 'react';
import { TransaksiRecord, LABRecord } from '../types';
import { X, Check, ArrowDownLeft, ArrowUpRight, Edit3, Calendar, FileText, Tag, DollarSign } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

interface EditTransaksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  trx: TransaksiRecord | null;
  labList: LABRecord[];
  onSave: (updatedTrx: TransaksiRecord) => Promise<void>;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export const EditTransaksiModal: React.FC<EditTransaksiModalProps> = ({
  isOpen,
  onClose,
  trx,
  labList,
  onSave,
  onNotify,
}) => {
  const [idLAB, setIdLAB] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [trxType, setTrxType] = useState<'masuk' | 'keluar'>('masuk');
  const [nominal, setNominal] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (trx) {
      setIdLAB(trx.idLAB);
      setTanggal(trx.tanggal);
      setKeterangan(trx.keterangan);
      const isMasuk = Number(trx.masuk) > 0;
      setTrxType(isMasuk ? 'masuk' : 'keluar');
      setNominal(String(isMasuk ? trx.masuk : trx.keluar));
    }
  }, [trx, isOpen]);

  if (!isOpen || !trx) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idLAB) {
      onNotify('Silakan pilih Bulan LAB', 'error');
      return;
    }
    const valNominal = Number(nominal) || 0;
    if (valNominal <= 0) {
      onNotify('Masukkan nominal yang valid', 'error');
      return;
    }
    if (!keterangan.trim()) {
      onNotify('Keterangan transaksi tidak boleh kosong', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updatedRecord: TransaksiRecord = {
        ...trx,
        idLAB,
        tanggal,
        keterangan: keterangan.trim(),
        masuk: trxType === 'masuk' ? valNominal : 0,
        keluar: trxType === 'keluar' ? valNominal : 0,
      };

      await onSave(updatedRecord);
      onNotify('Transaksi berhasil diperbarui!', 'success');
      onClose();
    } catch (err: any) {
      onNotify('Gagal menyimpan perubahan: ' + (err.message || ''), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Edit3 className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Data Transaksi</h3>
              <p className="text-[11px] text-slate-500 font-mono">ID: {trx.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Target Bulan LAB */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Bulan Laporan (LAB)
            </label>
            <select
              value={idLAB}
              onChange={(e) => setIdLAB(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
              required
            >
              <option value="">-- Pilih Bulan LAB --</option>
              {labList.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.bulan} {lab.tahun} — ({lab.nomor})
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Tanggal Transaksi
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
              required
            >
            </input>
          </div>

          {/* Jenis Transaksi (Masuk / Keluar) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              Jenis Arus Kas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTrxType('masuk')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  trxType === 'masuk'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>Pemasukan</span>
              </button>
              <button
                type="button"
                onClick={() => setTrxType('keluar')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  trxType === 'keluar'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Pengeluaran</span>
              </button>
            </div>
          </div>

          {/* Nominal */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              Nominal (Rp)
            </label>
            <input
              type="number"
              min="1"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              placeholder="Contoh: 150000"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-semibold bg-white focus:outline-none focus:border-emerald-500"
              required
            />
            {Number(nominal) > 0 && (
              <p className="text-[11px] font-semibold text-emerald-700">
                Terbaca: {formatRupiah(Number(nominal))}
              </p>
            )}
          </div>

          {/* Keterangan */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Keterangan / Uraian
            </label>
            <textarea
              rows={2}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Rincian keterangan transaksi..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
