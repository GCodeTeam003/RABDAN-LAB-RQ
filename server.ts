import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.use(express.json());

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface SheetConfig {
  spreadsheetName: string;
  spreadsheetId: string;
  webAppUrl: string;
  lastSyncedAt: string;
  autoSync: boolean;
}

interface DatabaseSchema {
  sheetConfig: SheetConfig;
  labList: any[];
  rabList: any[];
  transaksiList: any[];
}

const DEFAULT_DB: DatabaseSchema = {
  sheetConfig: {
    spreadsheetName: 'Database Keuangan RQ Ulul Azmi (RAB & LAB)',
    spreadsheetId: '',
    webAppUrl: 'https://script.google.com/macros/s/AKfycby_qu393Ks92Sqp6NhkObIjiuTmQo4nDcCOPCc7uTOh2y4ikulZVA2dopXk9Ve0nYZo/exec',
    lastSyncedAt: new Date().toISOString(),
    autoSync: true,
  },
  labList: [
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
      createdAt: '2026-11-01T07:00:00.000Z',
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
      createdAt: '2026-10-01T07:00:00.000Z',
    },
  ],
  transaksiList: [
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
  ],
  rabList: [
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
      createdAt: '2026-11-01T07:00:00.000Z',
    },
  ],
};

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file, using fallback:', err);
    return DEFAULT_DB;
  }
}

function writeDb(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

// Background sync to Google Sheet webhook if available
async function syncToGoogleSheetWebhook(action: string, payload: any) {
  const db = readDb();
  const url = db.sheetConfig?.webAppUrl;
  if (!url || !url.startsWith('http')) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        data: payload,
        timestamp: new Date().toISOString(),
      }),
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = await res.text();
    if (text.includes('doPost')) {
      console.warn(`[Sync Webhook] Target Webhook script is missing doPost function!`);
    } else {
      console.log(`[Sync Webhook] Successfully sent ${action} to webhook`);
    }
  } catch (e) {
    console.warn(`[Sync Webhook] Webhook notice (${action}):`, (e as Error).message);
  }
}

// API Routes
app.get('/api/test-webhook', async (req: Request, res: Response) => {
  const db = readDb();
  const url = (req.query.url as string) || db.sheetConfig?.webAppUrl;
  if (!url || !url.startsWith('http')) {
    res.json({ ok: false, message: 'URL Webhook Google Apps Script belum diisi.' });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ping', data: { test: true }, timestamp: new Date().toISOString() }),
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const bodyText = await resp.text();
    if (bodyText.includes('doPost')) {
      res.json({
        ok: false,
        type: 'missing_dopost',
        message: 'Google Apps Script yang Anda gunakan tidak memiliki fungsi doPost(). Silakan ganti kodenya di Apps Script spreadsheet Anda dengan script yang telah kami sediakan.',
      });
      return;
    }

    try {
      const parsed = JSON.parse(bodyText);
      if (parsed.ok) {
        res.json({ ok: true, message: 'Webhook Google Apps Script terhubung dengan sempurna dan siap menerima data!' });
        return;
      }
    } catch (_) {}

    res.json({
      ok: true,
      message: 'Koneksi ke server Google Apps Script berhasil dijangkau (Status ' + resp.status + ').',
    });
  } catch (e: any) {
    res.json({
      ok: false,
      type: 'network_error',
      message: 'Gagal menghubungi URL Webhook: ' + e.message,
    });
  }
});

app.get('/api/status', (req: Request, res: Response) => {
  const db = readDb();
  res.json({
    ok: true,
    sheetConfig: db.sheetConfig,
    stats: {
      labCount: db.labList.length,
      rabCount: db.rabList.length,
      transaksiCount: db.transaksiList.length,
      lastSyncedAt: db.sheetConfig.lastSyncedAt,
    },
  });
});

app.get('/api/data', (req: Request, res: Response) => {
  const db = readDb();
  res.json({
    ok: true,
    labList: db.labList,
    rabList: db.rabList,
    transaksiList: db.transaksiList,
    sheetConfig: db.sheetConfig,
  });
});

app.post('/api/transaksi', async (req: Request, res: Response) => {
  const trx = req.body;
  if (!trx || !trx.idLAB) {
    res.status(400).json({ ok: false, message: 'Data transaksi tidak valid' });
    return;
  }

  const db = readDb();
  const newTrx = {
    ...trx,
    id: trx.id || 'trx-' + Date.now(),
    createdAt: trx.createdAt || new Date().toISOString(),
  };

  db.transaksiList = [newTrx, ...db.transaksiList];

  // Recalculate target LAB
  const labIdx = db.labList.findIndex((l) => l.id === newTrx.idLAB);
  let updatedLAB: any = null;
  if (labIdx >= 0) {
    const currentLAB = db.labList[labIdx];
    const matching = db.transaksiList.filter((t) => t.idLAB === newTrx.idLAB);
    const sumMasuk = matching.reduce((acc, t) => acc + (Number(t.masuk) || 0), 0);
    const sumKeluar = matching.reduce((acc, t) => acc + (Number(t.keluar) || 0), 0);
    const saldoAkhir = Number(currentLAB.saldoAwal) + sumMasuk - sumKeluar;

    updatedLAB = {
      ...currentLAB,
      totalMasuk: sumMasuk,
      totalKeluar: sumKeluar,
      saldoAkhir,
      trxCount: matching.length,
    };
    db.labList[labIdx] = updatedLAB;
  }

  db.sheetConfig.lastSyncedAt = new Date().toISOString();
  writeDb(db);

  // Sync to Google Sheet in background
  syncToGoogleSheetWebhook('submitTransaksi', newTrx);

  res.json({ ok: true, transaksi: newTrx, updatedLAB });
});

app.post('/api/lab', async (req: Request, res: Response) => {
  const lab = req.body;
  if (!lab || !lab.nomor || !lab.bulan) {
    res.status(400).json({ ok: false, message: 'Data LAB tidak valid' });
    return;
  }

  const db = readDb();
  const newLAB = {
    ...lab,
    id: lab.id || 'lab-' + Date.now(),
    totalMasuk: Number(lab.totalMasuk) || 0,
    totalKeluar: Number(lab.totalKeluar) || 0,
    saldoAkhir: Number(lab.saldoAwal) || 0,
    trxCount: 0,
    hasLink: true,
    createdAt: lab.createdAt || new Date().toISOString(),
  };

  const existingIdx = db.labList.findIndex((l) => l.id === newLAB.id);
  if (existingIdx >= 0) {
    db.labList[existingIdx] = newLAB;
  } else {
    db.labList = [newLAB, ...db.labList];
  }

  db.sheetConfig.lastSyncedAt = new Date().toISOString();
  writeDb(db);

  syncToGoogleSheetWebhook('submitLAB', newLAB);

  res.json({ ok: true, lab: newLAB });
});

app.post('/api/rab', async (req: Request, res: Response) => {
  const rab = req.body;
  if (!rab || !rab.nomor || !rab.bulan) {
    res.status(400).json({ ok: false, message: 'Data RAB tidak valid' });
    return;
  }

  const db = readDb();
  const newRAB = {
    ...rab,
    id: rab.id || 'rab-' + Date.now(),
    hasLink: true,
    createdAt: rab.createdAt || new Date().toISOString(),
  };

  const existingIdx = db.rabList.findIndex((r) => r.id === newRAB.id);
  if (existingIdx >= 0) {
    db.rabList[existingIdx] = newRAB;
  } else {
    db.rabList = [newRAB, ...db.rabList];
  }

  db.sheetConfig.lastSyncedAt = new Date().toISOString();
  writeDb(db);

  syncToGoogleSheetWebhook('submitRAB', newRAB);

  res.json({ ok: true, rab: newRAB });
});

app.delete('/api/transaksi/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = readDb();
  const target = db.transaksiList.find((t) => t.id === id);
  if (!target) {
    res.status(404).json({ ok: false, message: 'Transaksi tidak ditemukan' });
    return;
  }

  db.transaksiList = db.transaksiList.filter((t) => t.id !== id);

  // Recalculate target LAB
  const labIdx = db.labList.findIndex((l) => l.id === target.idLAB);
  if (labIdx >= 0) {
    const currentLAB = db.labList[labIdx];
    const matching = db.transaksiList.filter((t) => t.idLAB === target.idLAB);
    const sumMasuk = matching.reduce((acc, t) => acc + (Number(t.masuk) || 0), 0);
    const sumKeluar = matching.reduce((acc, t) => acc + (Number(t.keluar) || 0), 0);
    const saldoAkhir = Number(currentLAB.saldoAwal) + sumMasuk - sumKeluar;

    db.labList[labIdx] = {
      ...currentLAB,
      totalMasuk: sumMasuk,
      totalKeluar: sumKeluar,
      saldoAkhir,
      trxCount: matching.length,
    };
  }

  db.sheetConfig.lastSyncedAt = new Date().toISOString();
  writeDb(db);

  syncToGoogleSheetWebhook('deleteTransaksi', { id });

  res.json({ ok: true });
});

app.delete('/api/lab/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = readDb();
  db.labList = db.labList.filter((l) => l.id !== id);
  db.transaksiList = db.transaksiList.filter((t) => t.idLAB !== id);
  db.sheetConfig.lastSyncedAt = new Date().toISOString();
  writeDb(db);

  syncToGoogleSheetWebhook('deleteLAB', { id });

  res.json({ ok: true });
});

app.delete('/api/rab/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = readDb();
  db.rabList = db.rabList.filter((r) => r.id !== id);
  db.sheetConfig.lastSyncedAt = new Date().toISOString();
  writeDb(db);

  syncToGoogleSheetWebhook('deleteRAB', { id });

  res.json({ ok: true });
});

app.post('/api/sheet-config', (req: Request, res: Response) => {
  const config = req.body;
  const db = readDb();
  db.sheetConfig = {
    ...db.sheetConfig,
    ...config,
    lastSyncedAt: new Date().toISOString(),
  };
  writeDb(db);
  res.json({ ok: true, sheetConfig: db.sheetConfig });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  } else {
    // In dev mode, mount Vite middlewares
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FIA Server] Always-on shared server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
