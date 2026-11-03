import { LABRecord, RABRecord, TransaksiRecord } from '../types';

const STORAGE_LAB_KEY = 'rq_ulul_azmi_lab_master_v1';
const STORAGE_RAB_KEY = 'rq_ulul_azmi_rab_master_v1';
const STORAGE_TRX_KEY = 'rq_ulul_azmi_transaksi_v1';

export function getLocalData(): {
  labList: LABRecord[];
  rabList: RABRecord[];
  transaksiList: TransaksiRecord[];
} {
  try {
    const rawLab = localStorage.getItem(STORAGE_LAB_KEY);
    const rawRab = localStorage.getItem(STORAGE_RAB_KEY);
    const rawTrx = localStorage.getItem(STORAGE_TRX_KEY);

    return {
      labList: rawLab ? JSON.parse(rawLab) : [],
      rabList: rawRab ? JSON.parse(rawRab) : [],
      transaksiList: rawTrx ? JSON.parse(rawTrx) : [],
    };
  } catch (e) {
    return { labList: [], rabList: [], transaksiList: [] };
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
    console.error('Failed saving to localStorage mirror:', e);
  }
}

/**
 * Fetch all shared real-time data from the centralized server database (always connected to Google Sheets)
 */
export async function fetchSharedData(): Promise<{
  labList: LABRecord[];
  rabList: RABRecord[];
  transaksiList: TransaksiRecord[];
  sheetConfig?: any;
}> {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.ok) {
      saveLocalData(json.labList, json.rabList, json.transaksiList);
      return {
        labList: json.labList,
        rabList: json.rabList,
        transaksiList: json.transaksiList,
        sheetConfig: json.sheetConfig,
      };
    }
  } catch (err) {
    console.warn('Server fetch failed, falling back to local mirror:', err);
  }
  return getLocalData();
}

/**
 * Persists a new transaction to the shared centralized database
 */
export async function persistTransaksi(
  trx: TransaksiRecord
): Promise<{ ok: boolean; syncedToSheets: boolean; updatedLAB?: LABRecord }> {
  try {
    const res = await fetch('/api/transaksi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trx),
    });
    if (res.ok) {
      const json = await res.json();
      return { ok: true, syncedToSheets: true, updatedLAB: json.updatedLAB };
    }
  } catch (err) {
    console.error('Error posting transaksi to server:', err);
  }

  // Fallback to local
  const local = getLocalData();
  const updatedTrx = [trx, ...local.transaksiList];
  saveLocalData(local.labList, local.rabList, updatedTrx);
  return { ok: true, syncedToSheets: false };
}

/**
 * Persists a new LAB to the shared centralized database
 */
export async function persistLAB(
  lab: LABRecord
): Promise<{ ok: boolean; syncedToSheets: boolean }> {
  try {
    const res = await fetch('/api/lab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lab),
    });
    if (res.ok) {
      return { ok: true, syncedToSheets: true };
    }
  } catch (err) {
    console.error('Error posting LAB to server:', err);
  }

  const local = getLocalData();
  const updatedLab = [lab, ...local.labList];
  saveLocalData(updatedLab, local.rabList, local.transaksiList);
  return { ok: true, syncedToSheets: false };
}

/**
 * Persists a new RAB to the shared centralized database
 */
export async function persistRAB(
  rab: RABRecord
): Promise<{ ok: boolean; syncedToSheets: boolean }> {
  try {
    const res = await fetch('/api/rab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rab),
    });
    if (res.ok) {
      return { ok: true, syncedToSheets: true };
    }
  } catch (err) {
    console.error('Error posting RAB to server:', err);
  }

  const local = getLocalData();
  const updatedRab = [rab, ...local.rabList];
  saveLocalData(local.labList, updatedRab, local.transaksiList);
  return { ok: true, syncedToSheets: false };
}

/**
 * Delete a transaction from the shared database
 */
export async function deleteLocalTransaksi(idTrx: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/transaksi/${idTrx}`, { method: 'DELETE' });
    if (res.ok) return true;
  } catch (err) {
    console.error('Error deleting transaksi on server:', err);
  }

  const local = getLocalData();
  const updatedTrx = local.transaksiList.filter((t) => t.id !== idTrx);
  saveLocalData(local.labList, local.rabList, updatedTrx);
  return true;
}

/**
 * Delete a LAB record from the shared database
 */
export async function deleteLocalLAB(idLAB: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/lab/${idLAB}`, { method: 'DELETE' });
    if (res.ok) return true;
  } catch (err) {
    console.error('Error deleting LAB on server:', err);
  }

  const local = getLocalData();
  const updatedLab = local.labList.filter((l) => l.id !== idLAB);
  saveLocalData(updatedLab, local.rabList, local.transaksiList);
  return true;
}

/**
 * Delete a RAB record from the shared database
 */
export async function deleteLocalRAB(idRAB: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/rab/${idRAB}`, { method: 'DELETE' });
    if (res.ok) return true;
  } catch (err) {
    console.error('Error deleting RAB on server:', err);
  }

  const local = getLocalData();
  const updatedRab = local.rabList.filter((r) => r.id !== idRAB);
  saveLocalData(local.labList, updatedRab, local.transaksiList);
  return true;
}

/**
 * Update Google Sheet webhook / sync config
 */
export async function updateSheetConfig(config: {
  spreadsheetName?: string;
  spreadsheetId?: string;
  webAppUrl?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/sheet-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
