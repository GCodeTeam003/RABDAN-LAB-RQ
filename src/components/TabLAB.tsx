import React, { useState, useEffect } from 'react';
import { BULAN_NAMES, formatNomorSurat } from '../utils/formatters';
import { LABRecord } from '../types';
import { generateLABPDFBlob } from '../services/pdfGenerator';
import { Sparkles, ExternalLink, FileText } from 'lucide-react';

interface TabLABProps {
  labList: LABRecord[];
  onSubmitLAB: (data: Omit<LABRecord, 'id' | 'totalMasuk' | 'totalKeluar' | 'saldoAkhir' | 'trxCount' | 'hasLink'>) => Promise<LABRecord>;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
  onSwitchToTransaksi: () => void;
}

export const TabLAB: React.FC<TabLABProps> = ({
  labList,
  onSubmitLAB,
  onNotify,
  onSwitchToTransaksi,
}) => {
  const now = new Date();
  const currentMonthName = BULAN_NAMES[now.getMonth()];
  const currentYear = now.getFullYear();

  const [bulan, setBulan] = useState<string>(currentMonthName);
  const [tahun, setTahun] = useState<number>(currentYear);
  const [nomor, setNomor] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(now.toISOString().split('T')[0]);
  const [kota, setKota] = useState<string>('Kibang Budi Jaya');
  const [ketuaRQ, setKetuaRQ] = useState<string>('AL MUTAQIN');
  const [bendaharaRQ, setBendaharaRQ] = useState<string>('HAMIDAH FAUZIYAH');
  const [saldoAwal, setSaldoAwal] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [resultCard, setResultCard] = useState<{
    show: boolean;
    msg: string;
    pdfUrl?: string;
    lab?: LABRecord;
  }>({ show: false, msg: '' });

  // Auto-generate Nomor Surat whenever bulan, tahun, or labList changes
  useEffect(() => {
    if (bulan && tahun) {
      // Find highest existing sequence for the same year/month or length + 1
      const countForPeriod = labList.filter((l) => l.tahun === Number(tahun)).length;
      const autoNum = formatNomorSurat(countForPeriod + 1, bulan, tahun);
      setNomor(autoNum);
    }
  }, [bulan, tahun, labList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomor.trim()) {
      onNotify('Nomor surat tidak boleh kosong', 'error');
      return;
    }

    setIsSubmitting(true);
    setResultCard({ show: false, msg: '' });

    try {
      const created = await onSubmitLAB({
        nomor: nomor.trim(),
        bulan,
        tahun: Number(tahun),
        tanggal,
        kota: kota.trim(),
        ketuaRQ: ketuaRQ.trim(),
        bendaharaRQ: bendaharaRQ.trim(),
        saldoAwal: Number(saldoAwal) || 0,
      });

      const msg = `LAB periode ${bulan} ${tahun} berhasil disimpan!`;
      onNotify(msg, 'success');

      // Generate PDF preview
      const pdf = generateLABPDFBlob(created, []);
      setResultCard({
        show: true,
        msg,
        pdfUrl: pdf.url,
        lab: created,
      });
    } catch (err: any) {
      onNotify('Gagal menyimpan LAB: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        {/* Nomor Surat with Auto badge */}
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <span>Nomor Surat FIA</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
              <Sparkles className="w-3 h-3" /> auto
            </span>
          </label>
          <input
            type="text"
            id="lab-nomor"
            value={nomor}
            onChange={(e) => setNomor(e.target.value)}
            required
            className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm sm:text-base font-mono bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <small className="block text-[11px] text-slate-400">
            Format: <code className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded text-[10px]">nomor/YMU/RQ/bulan_romawi/tahun</code>
          </small>
        </div>

        {/* Bulan & Tahun */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Bulan</label>
            <select
              id="lab-bulan"
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              required
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm sm:text-base bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              {BULAN_NAMES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Tahun</label>
            <input
              type="number"
              id="lab-tahun"
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              min="2020"
              max="2100"
              required
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm sm:text-base bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Tanggal Surat */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">Tanggal Surat</label>
          <input
            type="date"
            id="lab-tanggal"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            required
            className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm sm:text-base bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Kota */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">Kota</label>
          <input
            type="text"
            id="lab-kota"
            value={kota}
            onChange={(e) => setKota(e.target.value)}
            required
            className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm sm:text-base bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Ketua RQ & Bendahara RQ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Ketua RQ</label>
            <input
              type="text"
              id="lab-ketuaRQ"
              value={ketuaRQ}
              onChange={(e) => setKetuaRQ(e.target.value)}
              placeholder="AL MUTAQIN"
              required
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm sm:text-base bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Bendahara RQ</label>
            <input
              type="text"
              id="lab-bendaharaRQ"
              value={bendaharaRQ}
              onChange={(e) => setBendaharaRQ(e.target.value)}
              placeholder="HAMIDAH FAUZIYAH"
              required
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm sm:text-base bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Saldo Awal */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">Saldo Awal Kas (Rp)</label>
          <input
            type="number"
            id="lab-saldoAwal"
            value={saldoAwal}
            onChange={(e) => setSaldoAwal(e.target.value)}
            min="0"
            required
            className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm sm:text-base bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <small className="block text-[11px] text-slate-400">
            Saldo kas dari penutupan bulan sebelumnya
          </small>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[48px] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
        >
          <span>{isSubmitting ? '⏳ Menyimpan LAB...' : '💾 Simpan LAB'}</span>
        </button>
      </form>

      {/* Result Card */}
      {resultCard.show && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-l-4 border-emerald-500 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800">✅ {resultCard.msg}</h3>
          <p className="text-xs text-slate-600">
            LAB telah tersimpan di database. Anda sekarang dapat mulai memasukkan mutasi kas di tab Transaksi atau melihat dokumen PDF.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {resultCard.pdfUrl && (
              <a
                href={resultCard.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors min-h-[42px]"
              >
                <ExternalLink className="w-4 h-4" />
                <span>🔗 Buka PDF LAB</span>
              </a>
            )}
            <button
              type="button"
              onClick={onSwitchToTransaksi}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors min-h-[42px]"
            >
              <FileText className="w-4 h-4" />
              <span>💰 Mulai Input Transaksi</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
