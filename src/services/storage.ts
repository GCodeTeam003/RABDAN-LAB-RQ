import { LABRecord, RABRecord, TransaksiRecord } from '../types';
import {
  appendMultipleRowsToSheet,
  appendRowToSheet,
  loadAllDataFromGoogleSheet,
  SHEET_ID_KEY,
} from './sheets';
import { getAccessToken } from './auth';

const STORAGE_LAB_KEY = 'rq_ulul_azmi_lab_master_v1';
const STORAGE_RAB_KEY = 'rq_ulul_azmi_rab_master_v1';
const STORAGE_TRX_KEY = 'rq_ulul_azmi_transaksi_v1';

// Seed Initial Data
const SEED_LAB: LABRecord[] = [
  {
    id: 'lab-2026-11',
    nomor: '001/YMU/RQ/XI/2026',
    bulan: 'November',
    tahun: 2026,
    tanggal: '2026-11-01',
    kota: 'Kibang Budi Jaya',
    ketuaRQ: 'AL MUTAQIN',
    bendaharaRQ: 'HAMIDAH FAUZIYAH',
    saldoAwal: 5000000,
    totalMasuk: 3750000,
    totalKeluar: 1850000,
    saldoAkhir: 6900000,
    trxCount: 3,
    hasLink: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'lab-2026-10',
    nomor: '012/YMU/RQ/X/2026',
    bulan: 'Oktober',
    tahun: 2026,
    tanggal: '2026-10-01',
    kota: 'Kibang Budi Jaya',
    ketuaRQ: 'AL MUTAQIN',
    bendaharaRQ: 'HAMIDAH FAUZIYAH',
    saldoAwal: 4200000,
    totalMasuk: 4500000,
    totalKeluar: 3700000,
    saldoAkhir: 5000000,
    trxCount: 4,
    hasLink: true,
    createdAt: new Date().toISOString(),
  },
];

const SEED_TRX: TransaksiRecord[] = [
  {
    id: 'trx-101',
    idLAB: 'lab-2026-11',
    tanggal: '2026-11-02',
    keterangan: 'Infaq Rutin Donatur Tetap',
    masuk: 2500000,
    keluar: 0,
    createdAt: '2026-11-02T08:00:00.000Z',
  },
  {
    id: 'trx-102',
    idLAB: 'lab-2026-11',
    tanggal: '2026-11-05',
    keterangan: 'Belanja Konsumsi & Sembako Santri',
    masuk: 0,
    keluar: 1850000,
    createdAt: '2026-11-05T10:30:00.000Z',
  },
  {
    id: 'trx-103',
    idLAB: 'lab-2026-11',
    tanggal: '2026-11-08',
    keterangan: 'Sedekah Pembelian Kitab & Iqro',
    masuk: 1250000,
    keluar: 0,
    createdAt: '2026-11-08T14:15:00.000Z',
  },
];

const SEED_RAB: RABRecord[] = [
  {
    id: 'rab-2026-11',
    nomor: '001/YMU/RQ/XI/2026',
    bulan: 'November',
    tahun: 2026,
    tanggal: '2026-11-01',
    kota: 'Kibang Budi Jaya',
    ketuaRQ: 'AL MUTAQIN',
    bendaharaRQ: 'HAMIDAH FAUZIYAH',
    ketuaYayasan: 'H. AHMAD RIFAI, M.Pd.',
    total: 8750000,
    itemCount: 4,
    items: [
      { id: 'i-1', rincian: 'Bisyafahah & Honor Pengajar Al-Quran', jumlah: 4500000 },
      { id: 'i-2', rincian: 'Operasional Listrik, Air & Kebersihan RQ', jumlah: 750000 },
      { id: 'i-3', rincian: 'Konsumsi Bulanan & Snack Pengajian Santri', jumlah: 2500000 },
      { id: 'i-4', rincian: 'Pengadaan Modul Hafalan & Tajwid', jumlah: 1000000 },
    ],
    hasLink: true,
    createdAt: new Date().toISOString(),
  },
];

export function getLocalData(): {
  labList: LABRecord[];
  rabList: RABRecord[];
  transaksiList: TransaksiRecord[];
} {
  try {
    const rawLab = localStorage.getItem(STORAGE_LAB_KEY);
    const rawRab = localStorage.getItem(STORAGE_RAB_KEY);
    const rawTrx = localStorage.getItem(STORAGE_TRX_KEY);

    const labList: LABRecord[] = rawLab ? JSON.parse(rawLab) : SEED_LAB;
    const rabList: RABRecord[] = rawRab ? JSON.parse(rawRab) : SEED_RAB;
    const transaksiList: TransaksiRecord[] = rawTrx ? JSON.parse(rawTrx) : SEED_TRX;

    if (!rawLab) localStorage.setItem(STORAGE_LAB_KEY, JSON.stringify(SEED_LAB));
    if (!rawRab) localStorage.setItem(STORAGE_RAB_KEY, JSON.stringify(SEED_RAB));
    if (!rawTrx) localStorage.setItem(STORAGE_TRX_KEY, JSON.stringify(SEED_TRX));

    return { labList, rabList, transaksiList };
  } catch (e) {
    return { labList: SEED_LAB, rabList: SEED_RAB, transaksiList: SEED_TRX };
  }
}

export function saveLocalData(
  labList: LABRecord[],
  rabList: RABRecord[],
  transaksiList: TransaksiRecord[]
) {
  try {
    localStorage.setItem(STORAGE_LAB_KEY, JSON.stringify(labList));
    localStorage.setItem(STORAGE_RAB_KEY, JSON.stringify(rabList));
    localStorage.setItem(STORAGE_TRX_KEY, JSON.stringify(transaksiList));
  } catch (e) {
    console.error('Failed saving to localStorage:', e);
  }
}

/**
 * Persists a new or updated LAB record to local cache and to Google Sheets (if connected)
 */
export async function persistLAB(lab: LABRecord): Promise<{ ok: boolean; syncedToSheets: boolean }> {
  const { labList, rabList, transaksiList } = getLocalData();
  const existingIdx = labList.findIndex((l) => l.id === lab.id);
  let updatedLabList: LABRecord[];
  if (existingIdx >= 0) {
    updatedLabList = [...labList];
    updatedLabList[existingIdx] = lab;
  } else {
    updatedLabList = [lab, ...labList];
  }
  saveLocalData(updatedLabList, rabList, transaksiList);

  // Sync to Google Sheets if token & sheetId available
  const token = await getAccessToken();
  const sheetId = localStorage.getItem(SHEET_ID_KEY);

  let syncedToSheets = false;
  if (token && sheetId) {
    try {
      const row = [
        lab.id,
        lab.nomor,
        lab.bulan,
        lab.tahun,
        lab.tanggal,
        lab.kota,
        lab.ketuaRQ,
        lab.bendaharaRQ,
        lab.saldoAwal,
        lab.totalMasuk,
        lab.totalKeluar,
        lab.saldoAkhir,
        lab.trxCount,
        lab.hasLink ? 'Ada' : 'Belum',
        lab.linkPDF || '',
        lab.createdAt || new Date().toISOString(),
      ];
      await appendRowToSheet(token, sheetId, 'LAB_Master!A:P', row);
      syncedToSheets = true;
    } catch (err) {
      console.warn('Sync to Google Sheet failed, local copy intact:', err);
    }
  }

  return { ok: true, syncedToSheets };
}

/**
 * Persists a new transaction
 */
export async function persistTransaksi(
  trx: TransaksiRecord
): Promise<{ ok: boolean; syncedToSheets: boolean; updatedLAB?: LABRecord }> {
  const { labList, rabList, transaksiList } = getLocalData();
  const updatedTrxList = [trx, ...transaksiList];

  // Recalculate target LAB
  const labIdx = labList.findIndex((l) => l.id === trx.idLAB);
  let updatedLAB: LABRecord | undefined;
  let updatedLabList = labList;

  if (labIdx >= 0) {
    const currentLAB = labList[labIdx];
    const matchingTrx = updatedTrxList.filter((t) => t.idLAB === trx.idLAB);
    const sumMasuk = matchingTrx.reduce((acc, t) => acc + (t.masuk || 0), 0);
    const sumKeluar = matchingTrx.reduce((acc, t) => acc + (t.keluar || 0), 0);
    const saldoAkhir = currentLAB.saldoAwal + sumMasuk - sumKeluar;

    updatedLAB = {
      ...currentLAB,
      totalMasuk: sumMasuk,
      totalKeluar: sumKeluar,
      saldoAkhir,
      trxCount: matchingTrx.length,
    };

    updatedLabList = [...labList];
    updatedLabList[labIdx] = updatedLAB;
  }

  saveLocalData(updatedLabList, rabList, updatedTrxList);

  const token = await getAccessToken();
  const sheetId = localStorage.getItem(SHEET_ID_KEY);
  let syncedToSheets = false;

  if (token && sheetId) {
    try {
      const row = [
        trx.id,
        trx.idLAB,
        trx.tanggal,
        trx.keterangan,
        trx.masuk,
        trx.keluar,
        trx.createdAt || new Date().toISOString(),
      ];
      await appendRowToSheet(token, sheetId, 'Transaksi!A:G', row);
      syncedToSheets = true;
    } catch (err) {
      console.warn('Sync to Google Sheet failed, local copy intact:', err);
    }
  }

  return { ok: true, syncedToSheets, updatedLAB };
}

/**
 * Persists a new RAB
 */
export async function persistRAB(rab: RABRecord): Promise<{ ok: boolean; syncedToSheets: boolean }> {
  const { labList, rabList, transaksiList } = getLocalData();
  const existingIdx = rabList.findIndex((r) => r.id === rab.id);
  let updatedRabList: RABRecord[];
  if (existingIdx >= 0) {
    updatedRabList = [...rabList];
    updatedRabList[existingIdx] = rab;
  } else {
    updatedRabList = [rab, ...rabList];
  }
  saveLocalData(labList, updatedRabList, transaksiList);

  const token = await getAccessToken();
  const sheetId = localStorage.getItem(SHEET_ID_KEY);
  let syncedToSheets = false;

  if (token && sheetId) {
    try {
      const masterRow = [
        rab.id,
        rab.nomor,
        rab.bulan,
        rab.tahun,
        rab.tanggal,
        rab.kota,
        rab.ketuaRQ,
        rab.bendaharaRQ,
        rab.ketuaYayasan,
        rab.total,
        rab.itemCount,
        rab.hasLink ? 'Ada' : 'Belum',
        rab.linkPDF || '',
        rab.createdAt || new Date().toISOString(),
      ];
      await appendRowToSheet(token, sheetId, 'RAB_Master!A:N', masterRow);

      const itemRows = rab.items.map((item, idx) => [
        item.id,
        rab.id,
        idx + 1,
        item.rincian,
        item.jumlah,
        rab.createdAt || new Date().toISOString(),
      ]);
      await appendMultipleRowsToSheet(token, sheetId, 'RAB_Items!A:F', itemRows);
      syncedToSheets = true;
    } catch (err) {
      console.warn('Sync to Google Sheet failed, local copy intact:', err);
    }
  }

  return { ok: true, syncedToSheets };
}

/**
 * Delete a transaction with local & state updates
 */
export async function deleteLocalTransaksi(idTrx: string): Promise<boolean> {
  const { labList, rabList, transaksiList } = getLocalData();
  const targetTrx = transaksiList.find((t) => t.id === idTrx);
  if (!targetTrx) return false;

  const updatedTrxList = transaksiList.filter((t) => t.id !== idTrx);

  // Recalculate target LAB
  const labIdx = labList.findIndex((l) => l.id === targetTrx.idLAB);
  let updatedLabList = labList;
  if (labIdx >= 0) {
    const currentLAB = labList[labIdx];
    const matchingTrx = updatedTrxList.filter((t) => t.idLAB === targetTrx.idLAB);
    const sumMasuk = matchingTrx.reduce((acc, t) => acc + (t.masuk || 0), 0);
    const sumKeluar = matchingTrx.reduce((acc, t) => acc + (t.keluar || 0), 0);
    const saldoAkhir = currentLAB.saldoAwal + sumMasuk - sumKeluar;

    const updatedLAB = {
      ...currentLAB,
      totalMasuk: sumMasuk,
      totalKeluar: sumKeluar,
      saldoAkhir,
      trxCount: matchingTrx.length,
    };
    updatedLabList = [...labList];
    updatedLabList[labIdx] = updatedLAB;
  }

  saveLocalData(updatedLabList, rabList, updatedTrxList);
  return true;
}

/**
 * Delete a LAB record
 */
export async function deleteLocalLAB(idLAB: string): Promise<boolean> {
  const { labList, rabList, transaksiList } = getLocalData();
  const updatedLabList = labList.filter((l) => l.id !== idLAB);
  const updatedTrxList = transaksiList.filter((t) => t.idLAB !== idLAB);
  saveLocalData(updatedLabList, rabList, updatedTrxList);
  return true;
}

/**
 * Delete a RAB record
 */
export async function deleteLocalRAB(idRAB: string): Promise<boolean> {
  const { labList, rabList, transaksiList } = getLocalData();
  const updatedRabList = rabList.filter((r) => r.id !== idRAB);
  saveLocalData(labList, updatedRabList, transaksiList);
  return true;
}

/**
 * Sync from Google Sheets directly into local state
 */
export async function syncFromGoogleSheets(): Promise<{
  labList: LABRecord[];
  rabList: RABRecord[];
  transaksiList: TransaksiRecord[];
}> {
  const token = await getAccessToken();
  const sheetId = localStorage.getItem(SHEET_ID_KEY);
  if (!token || !sheetId) {
    throw new Error('Google Sheets belum terhubung atau sesi belum aktif');
  }

  const data = await loadAllDataFromGoogleSheet(token, sheetId);
  saveLocalData(data.labList, data.rabList, data.transaksiList);
  return data;
}
