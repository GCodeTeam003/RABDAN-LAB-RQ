/**
 * Konfigurasi Posisi dan Tata Letak Tanda Tangan PDF (RAB & LAB)
 * Menggunakan satuan milimeter (mm).
 * Kertas F4 / Folio = Lebar 210mm x Panjang 330mm, Margin kiri/kanan = 15mm.
 */

export interface SignatureLayoutConfig {
  rab: {
    yOffset: number; // Geser vertikal (+ ke bawah, - ke atas dalam mm)
    leftColX: number; // Posisi horizontal Ketua Yayasan (standar: 45)
    rightCenterX: number; // Posisi horizontal Titimangsa & "Mengetahui," (standar: 150)
    ketuaX: number; // Posisi horizontal Ketua RQ (standar: 122)
    bendaharaX: number; // Posisi horizontal Bendahara RQ (standar: 172)
    spaceSignatureY: number; // Ruang tanda tangan antara jabatan dan nama (standar: 28)
  };
  lab: {
    // Mode posisi tanda tangan LAB:
    // 'right'  : Di sebelah kanan surat (standar surat dinas resmi)
    // 'spread' : Menyebar seimbang kiri (Ketua) dan kanan (Bendahara)
    // 'center' : Berdampingan tepat di tengah halaman
    layout: 'right' | 'spread' | 'center';
    yOffset: number; // Geser vertikal (+ ke bawah, - ke atas dalam mm)
    rightCenterX: number; // Posisi horizontal Titimangsa (Kota & Tanggal Surat) di sisi kanan (standar: 150)
    ketuaX: number; // Posisi horizontal Ketua Rumah Qur'an saat layout 'right' (standar: 122)
    bendaharaX: number; // Posisi horizontal Bendahara Rumah Qur'an saat layout 'right' (standar: 172)
    spaceSignatureY: number; // Ruang tanda tangan antara jabatan dan nama (standar: 24)
  };
}

export const DEFAULT_SIGNATURE_CONFIG: SignatureLayoutConfig = {
  rab: {
    yOffset: 0,
    leftColX: 45,
    rightCenterX: 150,
    ketuaX: 122,
    bendaharaX: 172,
    spaceSignatureY: 28,
  },
  lab: {
    layout: 'right',
    yOffset: 0,
    rightCenterX: 150,
    ketuaX: 122,
    bendaharaX: 172,
    spaceSignatureY: 24,
  },
};

export const SIG_CONFIG_KEY = 'rq_signature_layout_config';

export function getSignatureConfig(): SignatureLayoutConfig {
  if (typeof window === 'undefined') return DEFAULT_SIGNATURE_CONFIG;
  try {
    const raw = localStorage.getItem(SIG_CONFIG_KEY);
    if (!raw) return DEFAULT_SIGNATURE_CONFIG;
    const parsed = JSON.parse(raw);
    const labCfg = parsed.lab || {};
    // Upgrade legacy stored coordinates to aligned right defaults if unmodified
    if (labCfg.ketuaX === 90 && labCfg.bendaharaX === 152) {
      labCfg.ketuaX = 122;
      labCfg.bendaharaX = 172;
    }
    return {
      rab: { ...DEFAULT_SIGNATURE_CONFIG.rab, ...(parsed.rab || {}) },
      lab: { ...DEFAULT_SIGNATURE_CONFIG.lab, ...labCfg },
    };
  } catch (e) {
    return DEFAULT_SIGNATURE_CONFIG;
  }
}

export function saveSignatureConfig(cfg: SignatureLayoutConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SIG_CONFIG_KEY, JSON.stringify(cfg));
  }
}
