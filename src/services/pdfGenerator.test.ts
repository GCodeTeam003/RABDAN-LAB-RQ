import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRABPDFBlob, generateLABPDFBlob } from './pdfGenerator';
import { LABRecord, RABRecord, TransaksiRecord } from '../types';

test('generateRABPDFBlob generates valid 2-page PDF blob', () => {
  const rabMock: RABRecord = {
    id: 'rab-1',
    nomor: '05/YMU/RQ/XI/2026',
    bulan: 'November',
    tahun: 2026,
    tanggal: '2026-11-02',
    kota: 'Kibang Budi Jaya',
    ketuaRQ: 'AL MUTAQIN',
    bendaharaRQ: 'HAMIDAH FAUZIYAH',
    ketuaYayasan: 'SURYADI',
    total: 9453000,
    itemCount: 3,
    items: [
      { id: '1', rincian: 'Belanja Dapur', jumlah: 7230000 },
      { id: '2', rincian: 'Tagihan Listrik', jumlah: 511000 },
      { id: '3', rincian: 'Oprasional', jumlah: 1712000 },
    ],
    hasLink: false,
  };

  const result = generateRABPDFBlob(rabMock);
  assert.ok(result);
  assert.ok(result.blob);
  assert.equal(typeof result.blob.size, 'number');
  assert.ok(result.blob.size > 1000);
});

test('generateLABPDFBlob generates valid 3-page PDF blob with transactions', () => {
  const labMock: LABRecord = {
    id: 'lab-1',
    nomor: '125/YUA/RQ/VIII/2025',
    bulan: 'Agustus',
    tahun: 2025,
    tanggal: '2025-08-31',
    kota: 'Kibang Budi Jaya',
    ketuaRQ: 'AL MUTAQIN',
    bendaharaRQ: 'HAMIDAH FAUZIYAH',
    saldoAwal: 787500,
    totalMasuk: 10090000,
    totalKeluar: 9373500,
    saldoAkhir: 1504000,
    trxCount: 19,
    hasLink: false,
  };

  const trxMock: TransaksiRecord[] = [
    { id: 't1', idLAB: 'lab-1', tanggal: '2025-08-01', keterangan: 'Donasi Lauk (Juli)', masuk: 3150000, keluar: 0 },
    { id: 't2', idLAB: 'lab-1', tanggal: '2025-08-02', keterangan: 'Fotocopy Buku Tahsin', masuk: 0, keluar: 100000 },
    { id: 't3', idLAB: 'lab-1', tanggal: '2025-08-03', keterangan: 'Gorengan Kajian, Futsal dll', masuk: 0, keluar: 135500 },
    { id: 't4', idLAB: 'lab-1', tanggal: '2025-08-04', keterangan: 'Tagihan Listrik 1&2', masuk: 0, keluar: 332000 },
    { id: 't5', idLAB: 'lab-1', tanggal: '2025-08-31', keterangan: 'Belanja Dapur', masuk: 0, keluar: 7086000 },
    { id: 't6', idLAB: 'lab-1', tanggal: '2025-08-31', keterangan: 'SPP Santri Agustus', masuk: 4300000, keluar: 0 },
  ];

  const result = generateLABPDFBlob(labMock, trxMock);
  assert.ok(result);
  assert.ok(result.blob);
  assert.equal(typeof result.blob.size, 'number');
  assert.ok(result.blob.size > 1000);
});

test('generateRABPDFBlob formats date with 2-digit day like 04 November 2026', () => {
  const rabMock: RABRecord = {
    id: 'rab-today',
    nomor: '001/YMU/RQ/XI/2026',
    bulan: 'November',
    tahun: 2026,
    tanggal: '2026-11-04',
    kota: 'Kibang Budi Jaya',
    ketuaRQ: 'AL MUTAQIN',
    bendaharaRQ: 'HAMIDAH FAUZIYAH',
    ketuaYayasan: 'H. AHMAD RIFAI, M.Pd.',
    total: 8750000,
    itemCount: 2,
    items: [
      { id: '1', rincian: 'Bisyafahah Guru', jumlah: 4500000 },
      { id: '2', rincian: 'Operasional RQ', jumlah: 4250000 },
    ],
    hasLink: true,
  };

  const result = generateRABPDFBlob(rabMock);
  assert.ok(result);
  assert.ok(result.blob);
  assert.ok(result.blob.size > 1000);
});
