import React, { useState, useEffect } from 'react';
import { LABRecord, TransaksiRecord } from '../types';
import { formatRupiah } from '../utils/formatters';
import { X, ArrowDownLeft, ArrowUpRight, Trash2, Check, AlertCircle } from 'lucide-react';

interface EditTransaksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaksi: TransaksiRecord | null;
  labList: LABRecord[];
  onSave: (updatedTrx: TransaksiRecord) => Promise<void>;
  onDelete?: (trx: TransaksiRecord) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const EditTransaksiModal: React.FC<EditTransaksiModalProps> = ({
  isOpen,
  onClose,
  transaksi,
  labList,
  onSave,
  onDelete,
  onNotify,
}) => {
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [trxType, setTrxType] = useState<'masuk' | 'keluar'>('masuk');
  const [nominal, setNominal] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (transaksi) {
      setSelectedLabId(transaksi.idLAB || (labList.length > 0 ? labList[0].id : ''));
      setTanggal(transaksi.tanggal || new Date().toISOString().split('T')[0]);
      setKeterangan(transaksi.keterangan || '');
      const isMasuk = Number(transaksi.masuk) > 0;
      setTrxType(isMasuk ? 'masuk' : 'keluar');
      const nom = isMasuk ? transaksi.masuk : transaksi.keluar;
      setNominal(String(nom || ''));
    }
  }, [transaksi, labList]);

  if (!isOpen || !transaksi) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLabId) {
      onNotify('Silakan pilih Bulan LAB', 'error');
      return;
    }
    const valNominal = Number(nominal) || 0;
    if (valNominal <= 0) {
      onNotify('Nominal transaksi harus lebih dari 0', 'error');
      return;
    }
    if (!keterangan.trim()) {
      onNotify('Keterangan transaksi tidak boleh kosong', 'error');
      return;
    }

    const updated: TransaksiRecord = {
      ...transaksi,
      idLAB: selectedLabId,
      tanggal,
      keterangan: keterangan.trim(),
      masuk: trxType === 'masuk' ? valNominal : 0,
      keluar: trxType === 'keluar' ? valNominal : 0,
    };

    setIsSaving(true);
    try {
      await onSave(updated);
      onNotify('✅ Perubahan transaksi berhasil disimpan!', 'success');
      onClose();
    } catch (err: any) {
      onNotify('Gagal menyimpan transaksi: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const parsedNominal = Number(nominal) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              ✏️
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Edit Transaksi</h2>
              <p className="text-xs text-slate-500">Perbaiki keterangan, tanggal, atau nominal transaksi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Pilih Bulan LAB */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span>Bulan LAB</span>
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedLabId}
              onChange={(e) => setSelectedLabId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              {labList.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.bulan} {l.tahun} ({l.nomor})
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Transaksi */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span>Tanggal Transaksi</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Keterangan */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span>Keterangan Transaksi</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Belanja Operasional Santri"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Jenis & Nominal */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Jenis &amp; Jumlah Arus Kas
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setTrxType('masuk')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  trxType === 'masuk'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Kas Masuk (+)</span>
              </button>
              <button
                type="button"
                onClick={() => setTrxType('keluar')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  trxType === 'keluar'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Kas Keluar (-)</span>
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                placeholder="0"
                min="1"
                required
                className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            {parsedNominal > 0 && (
              <p className="text-[11px] text-slate-500 font-medium">
                Terbaca: <span className="font-bold text-slate-700">{formatRupiah(parsedNominal)}</span>
              </p>
            )}
          </div>

          {/* Info note */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Mengubah transaksi akan otomatis menghitung ulang saldo kas pada Bulan LAB terkait dan menyinkronkan data ke Cloud Database &amp; Google Spreadsheet.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(transaksi);
                }}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
