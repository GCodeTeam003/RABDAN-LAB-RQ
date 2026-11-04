import React, { useState, useEffect } from 'react';
import {
  SignatureLayoutConfig,
  getSignatureConfig,
  saveSignatureConfig,
  DEFAULT_SIGNATURE_CONFIG,
} from '../services/signatureConfig';
import { Sliders, X, RotateCcw, Check, MoveHorizontal, MoveVertical, HelpCircle } from 'lucide-react';

interface SignatureConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (config: SignatureLayoutConfig) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SignatureConfigModal: React.FC<SignatureConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onNotify,
}) => {
  const [config, setConfig] = useState<SignatureLayoutConfig>(DEFAULT_SIGNATURE_CONFIG);
  const [activeTab, setActiveTab] = useState<'lab' | 'rab'>('lab');

  useEffect(() => {
    if (isOpen) {
      setConfig(getSignatureConfig());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveSignatureConfig(config);
    if (onSave) onSave(config);
    onNotify('✅ Posisi tanda tangan berhasil disimpan! Cetak PDF untuk melihat perubahan.', 'success');
    onClose();
  };

  const handleReset = () => {
    setConfig(DEFAULT_SIGNATURE_CONFIG);
    saveSignatureConfig(DEFAULT_SIGNATURE_CONFIG);
    onNotify('Posisi tanda tangan dikembalikan ke standar awal.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Atur Posisi Tanda Tangan PDF</h2>
              <p className="text-xs text-slate-500">Geser posisi "Mengetahui, Ketua & Bendahara RQ"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection (LAB vs RAB) */}
        <div className="flex px-5 pt-3 border-b border-slate-100 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('lab')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'lab'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Surat & Lampiran LAB (3 Halaman)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rab')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'rab'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Surat Permohonan RAB (Halaman 1)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-700 text-xs sm:text-sm">
          {activeTab === 'lab' ? (
            /* LAB Controls */
            <div className="space-y-4">
              {/* Layout Mode */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Gaya / Posisi Horizontal Tanda Tangan LAB</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        lab: { ...prev.lab, layout: 'right' },
                      }))
                    }
                    className={`py-2 px-2 text-center rounded-xl border text-xs font-semibold transition-all ${
                      config.lab.layout === 'right'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    👉 Rata Kanan (Standar)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        lab: { ...prev.lab, layout: 'spread' },
                      }))
                    }
                    className={`py-2 px-2 text-center rounded-xl border text-xs font-semibold transition-all ${
                      config.lab.layout === 'spread'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    ⚖️ Menyebar (Kiri & Kanan)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        lab: { ...prev.lab, layout: 'center' },
                      }))
                    }
                    className={`py-2 px-2 text-center rounded-xl border text-xs font-semibold transition-all ${
                      config.lab.layout === 'center'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    🎯 Di Tengah Halaman
                  </button>
                </div>
              </div>

              {/* Fine-tuning for 'right' layout */}
              {config.lab.layout === 'right' && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <MoveHorizontal className="w-3.5 h-3.5 text-blue-600" />
                    <span>Penyesuaian Posisi Sisi Kanan (mm)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Posisi Ketua RQ (mm dari kiri)
                      </label>
                      <input
                        type="number"
                        value={config.lab.ketuaX}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            lab: { ...prev.lab, ketuaX: Number(e.target.value) || 122 },
                          }))
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Posisi Bendahara RQ (mm dari kiri)
                      </label>
                      <input
                        type="number"
                        value={config.lab.bendaharaX}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            lab: { ...prev.lab, bendaharaX: Number(e.target.value) || 172 },
                          }))
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vertical Offset */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <MoveVertical className="w-3.5 h-3.5 text-blue-600" />
                    <span>Geser Posisi Vertikal (Atas / Bawah)</span>
                  </label>
                  <span className="font-mono text-blue-600 font-bold">
                    {config.lab.yOffset > 0 ? `+${config.lab.yOffset} mm` : `${config.lab.yOffset} mm`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="25"
                  step="1"
                  value={config.lab.yOffset}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      lab: { ...prev.lab, yOffset: Number(e.target.value) },
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>⬆️ Lebih ke atas (-25mm)</span>
                  <span>Standar (0mm)</span>
                  <span>Lebih ke bawah (+25mm) ⬇️</span>
                </div>
              </div>

              {/* Space for Signature */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">
                    Jarak Ruang Tanda Tangan (Tinggi Tanda Tangan / Cap)
                  </label>
                  <span className="font-mono text-blue-600 font-bold">
                    {config.lab.spaceSignatureY} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="40"
                  step="1"
                  value={config.lab.spaceSignatureY}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      lab: { ...prev.lab, spaceSignatureY: Number(e.target.value) },
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Rapat (16mm)</span>
                  <span>Standar (24mm)</span>
                  <span>Lebih Lapang (40mm)</span>
                </div>
              </div>
            </div>
          ) : (
            /* RAB Controls */
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                Pada surat RAB terdapat 3 penandatangan: <strong>Ketua Yayasan</strong> di sebelah kiri (Yang menyetujui), serta <strong>Ketua RQ & Bendahara RQ</strong> di sebelah kanan (Mengetahui).
              </div>

              {/* Horizontal positions */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <MoveHorizontal className="w-3.5 h-3.5 text-blue-600" />
                  <span>Posisi Horizontal Kolom (mm)</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">
                      Ketua Yayasan (Kiri)
                    </label>
                    <input
                      type="number"
                      value={config.rab.leftColX}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          rab: { ...prev.rab, leftColX: Number(e.target.value) || 45 },
                        }))
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">
                      Ketua RQ (Kanan-1)
                    </label>
                    <input
                      type="number"
                      value={config.rab.ketuaX}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          rab: { ...prev.rab, ketuaX: Number(e.target.value) || 122 },
                        }))
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">
                      Bendahara (Kanan-2)
                    </label>
                    <input
                      type="number"
                      value={config.rab.bendaharaX}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          rab: { ...prev.rab, bendaharaX: Number(e.target.value) || 172 },
                        }))
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Vertical Offset */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <MoveVertical className="w-3.5 h-3.5 text-blue-600" />
                    <span>Geser Posisi Vertikal (Atas / Bawah)</span>
                  </label>
                  <span className="font-mono text-blue-600 font-bold">
                    {config.rab.yOffset > 0 ? `+${config.rab.yOffset} mm` : `${config.rab.yOffset} mm`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="25"
                  step="1"
                  value={config.rab.yOffset}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      rab: { ...prev.rab, yOffset: Number(e.target.value) },
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>⬆️ Lebih ke atas (-25mm)</span>
                  <span>Standar (0mm)</span>
                  <span>Lebih ke bawah (+25mm) ⬇️</span>
                </div>
              </div>

              {/* Space for Signature */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700">
                    Jarak Ruang Tanda Tangan (Tinggi Tanda Tangan / Cap)
                  </label>
                  <span className="font-mono text-blue-600 font-bold">
                    {config.rab.spaceSignatureY} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="45"
                  step="1"
                  value={config.rab.spaceSignatureY}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      rab: { ...prev.rab, spaceSignatureY: Number(e.target.value) },
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Quick Help Guide */}
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-[11px] text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-blue-700" />
              <span>Cara Kerja Koordinat:</span>
            </div>
            <p>
              Kertas F4 / Folio berukuran lebar 210 mm x panjang 330 mm. Nilai X mengukur jarak dari tepi kiri (sisi kanan adalah X = 150 mm). Jika ingin tanda tangan lebih ke tengah atau ke kiri, kurangi nilai X. Jika ingin lebih tinggi, kurangi nilai Y (geser vertikal).
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standar</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan Posisi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
