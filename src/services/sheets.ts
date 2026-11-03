import { LABRecord, RABRecord, TransaksiRecord } from '../types';

export const SHEET_ID_KEY = 'rq_ulul_azmi_sheet_id';
export const DEFAULT_SHEET_TITLE = 'Database Keuangan RQ Ulul Azmi (RAB & LAB)';

interface SheetMetadata {
  id: string;
  name: string;
  url: string;
}

export async function createDatabaseSpreadsheet(
  token: string,
  title: string = DEFAULT_SHEET_TITLE
): Promise<SheetMetadata> {
  const payload = {
    properties: {
      title: title,
    },
    sheets: [
      {
        properties: {
          title: 'LAB_Master',
          gridProperties: { rowCount: 100, columnCount: 16 },
        },
      },
      {
        properties: {
          title: 'Transaksi',
          gridProperties: { rowCount: 500, columnCount: 7 },
        },
      },
      {
        properties: {
          title: 'RAB_Master',
          gridProperties: { rowCount: 100, columnCount: 14 },
        },
      },
      {
        properties: {
          title: 'RAB_Items',
          gridProperties: { rowCount: 1000, columnCount: 6 },
        },
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gagal membuat Google Sheet: ${res.statusText} - ${errorBody}`);
  }

  const created = await res.json();
  const spreadsheetId = created.spreadsheetId;

  // Add initial column headers
  const headerData = [
    {
      range: 'LAB_Master!A1:P1',
      values: [[
        'ID', 'Nomor Surat', 'Bulan', 'Tahun', 'Tanggal Surat', 'Kota',
        'Ketua RQ', 'Bendahara RQ', 'Saldo Awal', 'Total Masuk', 'Total Keluar',
        'Saldo Akhir', 'Jumlah Transaksi', 'Status PDF', 'Link PDF', 'Created At'
      ]],
    },
    {
      range: 'Transaksi!A1:G1',
      values: [[
        'ID', 'ID LAB', 'Tanggal', 'Keterangan', 'Masuk', 'Keluar', 'Created At'
      ]],
    },
    {
      range: 'RAB_Master!A1:N1',
      values: [[
        'ID', 'Nomor Surat', 'Bulan', 'Tahun', 'Tanggal Surat', 'Kota',
        'Ketua RQ', 'Bendahara RQ', 'Ketua Yayasan', 'Total Anggaran', 'Jumlah Item',
        'Status PDF', 'Link PDF', 'Created At'
      ]],
    },
    {
      range: 'RAB_Items!A1:F1',
      values: [[
        'ID', 'ID RAB', 'No', 'Rincian Kebutuhan', 'Jumlah Rp', 'Created At'
      ]],
    },
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: headerData,
    }),
  });

  localStorage.setItem(SHEET_ID_KEY, spreadsheetId);

  return {
    id: spreadsheetId,
    name: title,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

export async function checkSpreadsheetExists(
  token: string,
  spreadsheetId: string
): Promise<{ exists: boolean; title?: string; url?: string }> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { exists: false };
    const data = await res.json();
    return {
      exists: true,
      title: data.properties?.title || 'Google Sheet',
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    };
  } catch (e) {
    return { exists: false };
  }
}

export async function appendRowToSheet(
  token: string,
  spreadsheetId: string,
  range: string,
  rowValues: any[]
): Promise<boolean> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );
  return res.ok;
}

export async function appendMultipleRowsToSheet(
  token: string,
  spreadsheetId: string,
  range: string,
  rows: any[][]
): Promise<boolean> {
  if (rows.length === 0) return true;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );
  return res.ok;
}

export async function fetchSheetData(
  token: string,
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Gagal membaca range ${range}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.values || [];
}

/**
 * Load all records from Google Sheet and parse into typed records
 */
export async function loadAllDataFromGoogleSheet(
  token: string,
  spreadsheetId: string
): Promise<{
  labList: LABRecord[];
  rabList: RABRecord[];
  transaksiList: TransaksiRecord[];
}> {
  try {
    const [labRows, trxRows, rabRows, itemRows] = await Promise.all([
      fetchSheetData(token, spreadsheetId, 'LAB_Master!A2:P'),
      fetchSheetData(token, spreadsheetId, 'Transaksi!A2:G'),
      fetchSheetData(token, spreadsheetId, 'RAB_Master!A2:N'),
      fetchSheetData(token, spreadsheetId, 'RAB_Items!A2:F'),
    ]);

    const transaksiList: TransaksiRecord[] = trxRows.map((r) => ({
      id: r[0] || '',
      idLAB: r[1] || '',
      tanggal: r[2] || '',
      keterangan: r[3] || '',
      masuk: Number(r[4]) || 0,
      keluar: Number(r[5]) || 0,
      createdAt: r[6] || '',
    })).filter((t) => Boolean(t.id));

    const labList: LABRecord[] = labRows.map((r) => {
      const id = r[0] || '';
      const matchingTrx = transaksiList.filter((t) => t.idLAB === id);
      const sumMasuk = matchingTrx.reduce((acc, t) => acc + (t.masuk || 0), 0);
      const sumKeluar = matchingTrx.reduce((acc, t) => acc + (t.keluar || 0), 0);
      const saldoAwal = Number(r[8]) || 0;
      const totalMasuk = matchingTrx.length > 0 ? sumMasuk : (Number(r[9]) || 0);
      const totalKeluar = matchingTrx.length > 0 ? sumKeluar : (Number(r[10]) || 0);
      const saldoAkhir = saldoAwal + totalMasuk - totalKeluar;

      return {
        id,
        nomor: r[1] || '',
        bulan: r[2] || '',
        tahun: Number(r[3]) || new Date().getFullYear(),
        tanggal: r[4] || '',
        kota: r[5] || 'Kibang Budi Jaya',
        ketuaRQ: r[6] || 'AL MUTAQIN',
        bendaharaRQ: r[7] || 'HAMIDAH FAUZIYAH',
        saldoAwal,
        totalMasuk,
        totalKeluar,
        saldoAkhir,
        trxCount: matchingTrx.length || (Number(r[12]) || 0),
        hasLink: r[13] === 'Ada' || Boolean(r[14]),
        linkPDF: r[14] || '',
        createdAt: r[15] || '',
      };
    }).filter((l) => Boolean(l.id));

    const allRABItems = itemRows.map((r) => ({
      id: r[0] || '',
      idRAB: r[1] || '',
      no: Number(r[2]) || 1,
      rincian: r[3] || '',
      jumlah: Number(r[4]) || 0,
    })).filter((i) => Boolean(i.id && i.idRAB));

    const rabList: RABRecord[] = rabRows.map((r) => {
      const id = r[0] || '';
      const items = allRABItems
        .filter((i) => i.idRAB === id)
        .map((i) => ({ id: i.id, rincian: i.rincian, jumlah: i.jumlah }));
      const totalCalc = items.reduce((acc, i) => acc + i.jumlah, 0);

      return {
        id,
        nomor: r[1] || '',
        bulan: r[2] || '',
        tahun: Number(r[3]) || new Date().getFullYear(),
        tanggal: r[4] || '',
        kota: r[5] || 'Kibang Budi Jaya',
        ketuaRQ: r[6] || 'AL MUTAQIN',
        bendaharaRQ: r[7] || 'HAMIDAH FAUZIYAH',
        ketuaYayasan: r[8] || '',
        total: items.length > 0 ? totalCalc : (Number(r[9]) || 0),
        itemCount: items.length || (Number(r[10]) || 0),
        items,
        hasLink: r[11] === 'Ada' || Boolean(r[12]),
        linkPDF: r[12] || '',
        createdAt: r[13] || '',
      };
    }).filter((r) => Boolean(r.id));

    return { labList, rabList, transaksiList };
  } catch (err) {
    console.error('Error fetching sheet data:', err);
    throw err;
  }
}
