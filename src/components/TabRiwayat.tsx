import React, { useState } from 'react';
import { LABRecord, RABRecord, TransaksiRecord } from '../types';
import { formatRupiah, formatTanggalIndonesia } from '../utils/formatters';
import { generateLABPDFBlob, generateRABPDFBlob } from '../services/pdfGenerator';
import { RefreshCw, FileText, ExternalLink, Trash2, ChevronDown, ChevronUp, Pencil, Sliders } from 'lucide-react';

interface TabRiwayatProps {
  labList: LABRecord[];
  rabList: RABRecord[];
  transaksiList: TransaksiRecord[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
  onRequestDeleteLAB: (lab: LABRecord) => void;
  onRequestDeleteRAB: (rab: RABRecord) => void;
  onEditTransaksi?: (trx: TransaksiRecord) => void;
  onRequestDeleteTransaksi?: (trx: TransaksiRecord) => void;
  onOpenSigModal?: () => void;
}

export const TabRiwayat: React.FC<TabRiwayatProps> = ({
  labList,
  rabList,
  transaksiList,
  onRefresh,
  isRefreshing,
  onNotify,
  onRequestDeleteLAB,
  onRequestDeleteRAB,
  onEditTransaksi,
  onRequestDeleteTransaksi,
  onOpenSigModal,
}) => {
  const [activeSegment, setActiveSegment] = useState<'rab' | 'lab'>('rab');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const downloadPDFBlob = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGeneratePDF = async (type: 'RAB' | 'LAB', id: string) => {
    setGeneratingId(id);
    try {
      if (type === 'RAB') {
        const rab = rabList.find((r) => r.id === id);
        if (!rab) return;
        const pdf = generateRABPDFBlob(rab);
        const filename = `RAB_RQ_Ulul_Azmi_${rab.bulan}_${rab.tahun}.pdf`;
        downloadPDFBlob(pdf.url, filename);
        onNotify('✅ PDF RAB resmi berhasil diunduh', 'success');
      } else {
        const lab = labList.find((l) => l.id === id);
        if (!lab) return;
        const matchingTrx = transaksiList.filter((t) => t.idLAB === id);
        const pdf = generateLABPDFBlob(lab, matchingTrx);
        const filename = `LAB_RQ_Ulul_Azmi_${lab.bulan}_${lab.tahun}.pdf`;
        downloadPDFBlob(pdf.url, filename);
        onNotify('✅ PDF LAB resmi berhasil diunduh', 'success');
      }
    } catch (e: any) {
      onNotify('Gagal membuat PDF: ' + (e.message || 'Error'), 'error');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Segment Control */}
      <div className="flex bg-white p-1 rounded-xl shadow-xs border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSegment('rab')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
            activeSegment === 'rab'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📝 RAB ({rabList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSegment('lab')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
            activeSegment === 'lab'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📅 LAB ({labList.length})
        </button>
      </div>

      {/* Action Bar (Refresh & Signature Settings) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          <span>{isRefreshing ? 'Memuat dari Cloud/Sheets...' : '🔄 Refresh Data'}</span>
        </button>

        {onOpenSigModal && (
          <button
            type="button"
            onClick={onOpenSigModal}
            className="w-full py-2 px-3 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 font-semibold rounded-xl text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>⚙️ Atur Posisi Tanda Tangan PDF</span>
          </button>
        )}
      </div>

      {/* List Container */}
      <div id="riwayat-list" className="space-y-3">
        {activeSegment === 'rab' ? (
          /* RAB List */
          rabList.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs sm:text-sm border border-slate-200">
              📭 Belum ada data RAB.
              <br />
              Buat dokumen RAB baru di tab <strong>&quot;RAB&quot;</strong>.
            </div>
          ) : (
            rabList.map((r) => {
              const isExpanded = expandedId === r.id;
              return (
                <div
                  key={r.id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                          {r.bulan} {r.tahun}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✅ PDF Siap
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-500 mt-0.5">
                        {r.nomor} · {r.itemCount} item
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRequestDeleteRAB(r)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus RAB"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Summary Box */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-600 font-medium">Total Anggaran:</span>
                    <strong className="text-amber-600 text-sm sm:text-base font-extrabold">
                      {formatRupiah(r.total)}
                    </strong>
                  </div>

                  {/* Expand Details Trigger */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(r.id)}
                    className="w-full text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 py-1"
                  >
                    <span>{isExpanded ? 'Tutup Rincian' : `Lihat ${r.items.length} Rincian Kebutuhan`}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Expanded Items Table */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 pt-2 space-y-1 text-xs">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase pb-1">
                        Daftar Anggaran:
                      </div>
                      {r.items.map((item, idx) => (
                        <div key={item.id || idx} className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-700">
                            {idx + 1}. {item.rincian}
                          </span>
                          <span className="font-semibold text-slate-900 shrink-0 ml-2">
                            {formatRupiah(item.jumlah)}
                          </span>
                        </div>
                      ))}
                      <div className="text-[11px] text-slate-400 pt-1">
                        Disetujui: {r.ketuaRQ} | Bendahara: {r.bendaharaRQ} | Yayasan: {r.ketuaYayasan}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={generatingId === r.id}
                      onClick={() => handleGeneratePDF('RAB', r.id)}
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{generatingId === r.id ? 'Membuat...' : '📄 Generate PDF'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGeneratePDF('RAB', r.id)}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>🔗 Buka PDF</span>
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* LAB List */
          labList.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs sm:text-sm border border-slate-200">
              📭 Belum ada data LAB.
              <br />
              Buat dokumen LAB baru di tab <strong>&quot;LAB&quot;</strong>.
            </div>
          ) : (
            labList.map((l) => {
              const isExpanded = expandedId === l.id;
              const matchingTrx = transaksiList.filter((t) => t.idLAB === l.id);

              return (
                <div
                  key={l.id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                          {l.bulan} {l.tahun}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✅ PDF Siap
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-500 mt-0.5">
                        {l.nomor} · {l.trxCount || matchingTrx.length} transaksi
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRequestDeleteLAB(l)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus LAB"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stats Grid: Masuk | Keluar | Saldo */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center text-[11px] sm:text-xs">
                    <div>
                      <span className="text-slate-500 block">Masuk</span>
                      <strong className="text-emerald-600 text-xs sm:text-sm block mt-0.5">
                        {formatRupiah(l.totalMasuk)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Keluar</span>
                      <strong className="text-rose-600 text-xs sm:text-sm block mt-0.5">
                        {formatRupiah(l.totalKeluar)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Saldo Akhir</span>
                      <strong className="text-blue-600 text-xs sm:text-sm block mt-0.5">
                        {formatRupiah(l.saldoAkhir)}
                      </strong>
                    </div>
                  </div>

                  {/* Expand Details Trigger */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(l.id)}
                    className="w-full text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 py-1"
                  >
                    <span>{isExpanded ? 'Tutup Mutasi Kas' : `Lihat ${matchingTrx.length} Catatan Transaksi`}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Expanded Transactions Table */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 pt-2 space-y-1.5 text-xs">
                      <div className="flex justify-between text-[11px] text-slate-600 bg-slate-100 p-2 rounded-lg font-semibold">
                        <span>Saldo Awal Kas:</span>
                        <span>{formatRupiah(l.saldoAwal)}</span>
                      </div>
                      {matchingTrx.length === 0 ? (
                        <p className="text-center text-slate-400 py-2 italic text-[11px]">
                          Belum ada transaksi di bulan ini.
                        </p>
                      ) : (
                        matchingTrx.map((trx, idx) => (
                          <div key={trx.id || idx} className="flex items-center justify-between py-1.5 border-b border-slate-50 gap-2">
                            <div className="min-w-0 pr-1">
                              <span className="font-medium text-slate-800 block truncate">{trx.keterangan}</span>
                              <span className="text-[10px] text-slate-400 block">
                                {formatTanggalIndonesia(trx.tanggal)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                {trx.masuk > 0 && (
                                  <span className="font-bold text-emerald-600 block">+{formatRupiah(trx.masuk)}</span>
                                )}
                                {trx.keluar > 0 && (
                                  <span className="font-bold text-rose-600 block">-{formatRupiah(trx.keluar)}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5">
                                {onEditTransaksi && (
                                  <button
                                    type="button"
                                    onClick={() => onEditTransaksi(trx)}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                    title="Edit transaksi ini"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {onRequestDeleteTransaksi && (
                                  <button
                                    type="button"
                                    onClick={() => onRequestDeleteTransaksi(trx)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                    title="Hapus transaksi ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={generatingId === l.id}
                      onClick={() => handleGeneratePDF('LAB', l.id)}
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{generatingId === l.id ? 'Membuat...' : '📄 Generate PDF'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGeneratePDF('LAB', l.id)}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>🔗 Buka PDF</span>
                    </button>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
};
