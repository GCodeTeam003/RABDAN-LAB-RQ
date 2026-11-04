/**
 * Utility functions for RAB & LAB Rumah Qur'an Ulul Azmi
 */

export const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
] as const;

export type BulanName = typeof BULAN_NAMES[number];

const ROMAN_MONTHS: Record<string, string> = {
  januari: 'I',
  februari: 'II',
  maret: 'III',
  april: 'IV',
  mei: 'V',
  juni: 'VI',
  juli: 'VII',
  agustus: 'VIII',
  september: 'IX',
  oktober: 'X',
  november: 'XI',
  desember: 'XII',
};

/**
 * Returns Roman numeral for a given month name (or 1-12 index)
 */
export function getRomanMonth(month: string | number): string {
  if (typeof month === 'number') {
    const names = BULAN_NAMES;
    if (month >= 1 && month <= 12) {
      return ROMAN_MONTHS[names[month - 1].toLowerCase()] || 'I';
    }
    return 'I';
  }
  const clean = String(month || '').trim().toLowerCase();
  return ROMAN_MONTHS[clean] || 'I';
}

/**
 * Generates official letter number format: [nomor]/YMU/RQ/[bulan_romawi]/[tahun]
 * Example: 001/YMU/RQ/XI/2026
 */
export function formatNomorSurat(
  sequence: number,
  bulan: string | number,
  tahun: number | string,
  entity: string = 'YMU/RQ'
): string {
  const padded = String(Math.max(1, sequence)).padStart(3, '0');
  const roman = getRomanMonth(bulan);
  const year = String(tahun || new Date().getFullYear()).trim();
  return `${padded}/${entity}/${roman}/${year}`;
}

/**
 * Formats a numeric amount to Indonesian Rupiah representation: Rp 1.250.000
 */
export function formatRupiah(amount: number | string | null | undefined): string {
  const val = Math.round(Number(amount) || 0);
  return 'Rp ' + val.toLocaleString('id-ID');
}

/**
 * Parses numeric input safely
 */
export function parseNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Sums up RAB items
 */
export function calculateRABTotal(items: Array<{ jumlah: number | string }>): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, item) => acc + parseNumber(item.jumlah), 0);
}

/**
 * Calculates LAB summary: total masuk, total keluar, and final balance
 */
export function calculateLABBalance(
  saldoAwal: number | string,
  transactions: Array<{ masuk?: number | string; keluar?: number | string }>
): {
  saldoAwal: number;
  totalMasuk: number;
  totalKeluar: number;
  saldoAkhir: number;
} {
  const awal = parseNumber(saldoAwal);
  let totalMasuk = 0;
  let totalKeluar = 0;

  if (Array.isArray(transactions)) {
    for (const trx of transactions) {
      totalMasuk += parseNumber(trx.masuk);
      totalKeluar += parseNumber(trx.keluar);
    }
  }

  const saldoAkhir = awal + totalMasuk - totalKeluar;
  return {
    saldoAwal: awal,
    totalMasuk,
    totalKeluar,
    saldoAkhir,
  };
}

/**
 * Format ISO date string (YYYY-MM-DD) to Indonesian long format: 03 November 2026
 */
export function formatTanggalIndonesia(isoDateStr: string): string {
  if (!isoDateStr) return '';
  try {
    const [year, month, day] = isoDateStr.split('-');
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < BULAN_NAMES.length) {
      return `${parseInt(day, 10)} ${BULAN_NAMES[mIdx]} ${year}`;
    }
  } catch (e) {
    // fallback
  }
  return isoDateStr;
}

/**
 * Format ISO date string or formatted date to formal letter date format with 2-digit day: 04 November 2026
 */
export function formatTanggalSurat(isoDateStr: string): string {
  if (!isoDateStr) return '';
  try {
    const clean = isoDateStr.trim();
    // Case 1: YYYY-MM-DD or YYYY-M-D
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parseInt(parts[1], 10) - 1;
        const day = parts[2].padStart(2, '0');
        if (month >= 0 && month < BULAN_NAMES.length) {
          return `${day} ${BULAN_NAMES[month]} ${year}`;
        }
      }
    }
    // Case 2: DD/MM/YYYY or D/M/YYYY
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parseInt(parts[1], 10) - 1;
        const year = parts[2];
        if (month >= 0 && month < BULAN_NAMES.length) {
          return `${day} ${BULAN_NAMES[month]} ${year}`;
        }
      }
    }
    // Case 3: Text like "4 November 2026" -> ensure 2-digit day "04 November 2026"
    const words = clean.split(/\s+/);
    if (words.length === 3) {
      const dayNum = parseInt(words[0], 10);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        const day = String(dayNum).padStart(2, '0');
        const mIdx = BULAN_NAMES.findIndex((b) => b.toLowerCase() === words[1].toLowerCase());
        if (mIdx >= 0) {
          return `${day} ${BULAN_NAMES[mIdx]} ${words[2]}`;
        }
      }
    }
  } catch (e) {
    // fallback
  }
  return isoDateStr;
}

/**
 * Format ISO date string (YYYY-MM-DD) to table date format: dd/mm/yyyy (e.g. 01/08/2025)
 */
export function formatTanggalTable(isoDateStr: string): string {
  if (!isoDateStr) return '';
  try {
    const parts = isoDateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // fallback
  }
  return isoDateStr;
}

/**
 * Formats currency in LAB style: Rp 3.150.000,00 (or -Rp 2.796.000,00 if negative)
 */
export function formatCurrencyLAB(amount: number | string | null | undefined): string {
  const val = Math.round(Number(amount) || 0);
  const isNeg = val < 0;
  const absVal = Math.abs(val);
  const formatted = absVal.toLocaleString('id-ID') + ',00';
  return isNeg ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

/**
 * Formats currency in RAB style: Rp. 7.230.000
 */
export function formatCurrencyRAB(amount: number | string | null | undefined): string {
  const val = Math.round(Number(amount) || 0);
  const isNeg = val < 0;
  const absVal = Math.abs(val);
  const formatted = absVal.toLocaleString('id-ID');
  return isNeg ? `-Rp. ${formatted}` : `Rp. ${formatted}`;
}

/**
 * Returns previous month name and year
 */
export function getPreviousMonthInfo(
  bulan: string,
  tahun: number | string
): { bulan: string; tahun: number } {
  const clean = (bulan || '').trim().toLowerCase();
  const mIdx = BULAN_NAMES.findIndex((b) => b.toLowerCase() === clean);
  const yearNum =
    typeof tahun === 'number'
      ? tahun
      : parseInt(String(tahun), 10) || new Date().getFullYear();

  if (mIdx === -1) {
    return { bulan: 'Sebelumnya', tahun: yearNum };
  }
  if (mIdx === 0) {
    return { bulan: 'Desember', tahun: yearNum - 1 };
  }
  return { bulan: BULAN_NAMES[mIdx - 1], tahun: yearNum };
}
