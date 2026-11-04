import { jsPDF } from 'jspdf';
import { LABRecord, RABRecord, TransaksiRecord } from '../types';
import {
  formatCurrencyLAB,
  formatCurrencyRAB,
  formatTanggalSurat,
  formatTanggalTable,
  getPreviousMonthInfo,
} from '../utils/formatters';
import { KOP_SURAT_IMAGE } from './kopSuratBase64';
import {
  SignatureLayoutConfig,
  getSignatureConfig,
} from './signatureConfig';

// F4 Page dimensions (mm)
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 330;
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 180mm

/**
 * ============================================================================
 * PANDUAN CARA MENGGESER POSISI BAGIAN TANDA TANGAN:
 * "Mengetahui, Ketua Rumah Qur'an / Bendahara Rumah Qur'an (AL MUTAQIN / HAMIDAH FAUZIYAH)"
 * ============================================================================
 * Ukuran kertas A4 = 210 mm (Lebar) x 297 mm (Tinggi).
 *
 * 1. MENGGESER SECARA HORIZONTAL (KIRI <---> KANAN):
 *    - Nilai X menentukan posisi horizontal dari tepi kiri kertas (dalam milimeter / mm).
 *    - Ingin geser lebih ke KIRI? -> KURANGI nilai X (misal: 150 -> 135, atau 122 -> 100).
 *    - Ingin geser lebih ke KANAN? -> TAMBAH nilai X (misal: 150 -> 160, atau 172 -> 178).
 *    - Titik tengah persis kertas A4 adalah X = 105 mm.
 *
 * 2. MENGGESER SECARA VERTIKAL (ATAS <---> BAWAH):
 *    - Nilai Y menentukan posisi vertikal dari tepi atas kertas (dalam milimeter / mm).
 *    - Ingin geser lebih ke ATAS? -> Berikan yOffset bernilai NEGATIF (misal: -5 atau -10).
 *    - Ingin geser lebih ke BAWAH? -> Berikan yOffset bernilai POSITIF (misal: +5 atau +10).
 *
 * 3. MENGATUR JARAK / SPASI TANDA TANGAN (Tempat Tanda Tangan / Cap):
 *    - Ubah `spaceSignatureY` (standar 24mm - 28mm). Nilai lebih besar memberi ruang lebih lapang.
 * ============================================================================
 */

/**
 * Draws the official Rumah Qur'an Ulul Azmi letterhead banner
 * Aspect ratio: 1794 / 334 = 5.371
 * Banner size: 180mm x 33.5mm at (15, 10)
 */
function drawKopSurat(doc: jsPDF, yPos: number = 10): number {
  const kopWidth = CONTENT_WIDTH;
  const kopHeight = 33.5;
  try {
    doc.addImage(KOP_SURAT_IMAGE, 'JPEG', MARGIN_LEFT, yPos, kopWidth, kopHeight);
  } catch (e) {
    // Fallback if image fails to load
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text("YAYASAN MISYKATUL UMMAH (YMU)", PAGE_WIDTH / 2, yPos + 10, { align: 'center' });
    doc.text("RUMAH QUR'AN ULUL AZMI", PAGE_WIDTH / 2, yPos + 16, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(MARGIN_LEFT, yPos + 25, PAGE_WIDTH - MARGIN_RIGHT, yPos + 25);
  }
  return yPos + kopHeight + 6; // Returns next available y position (~49.5mm)
}

/**
 * Draws text with a formal underline (for official signatories)
 */
function drawUnderlinedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: { align?: 'left' | 'center' | 'right' }
) {
  const align = options?.align || 'left';
  const textWidth = doc.getTextWidth(text);
  let lineX = x;
  if (align === 'center') {
    lineX = x - textWidth / 2;
  } else if (align === 'right') {
    lineX = x - textWidth;
  }
  doc.text(text, x, y, options);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(lineX, y + 0.8, lineX + textWidth, y + 0.8);
}

/**
 * Helper to safely create blob and object URL in both browser and node
 */
function createPDFResult(doc: jsPDF): { blob: Blob; url: string } {
  const blob = doc.output('blob');
  const url =
    typeof window !== 'undefined' &&
    typeof window.URL !== 'undefined' &&
    typeof window.URL.createObjectURL === 'function'
      ? window.URL.createObjectURL(blob)
      : '';
  return { blob, url };
}

/**
 * Helper to calculate signature coordinates for LAB based on configured layout
 */
function getLABSignatureCoords(cfg: SignatureLayoutConfig) {
  const labCfg = cfg.lab;
  if (labCfg.layout === 'spread') {
    // Layout Menyebar (Ketua di kiri, Bendahara di kanan seimbang)
    return {
      sigSectionCenterX: 105,
      ketuaColX: 55,
      bendaharaColX: 155,
      yOffset: labCfg.yOffset || 0,
      spaceY: labCfg.spaceSignatureY || 24,
    };
  } else if (labCfg.layout === 'center') {
    // Layout Berdampingan di Tengah
    return {
      sigSectionCenterX: 105,
      ketuaColX: 80,
      bendaharaColX: 130,
      yOffset: labCfg.yOffset || 0,
      spaceY: labCfg.spaceSignatureY || 24,
    };
  } else {
    // Layout Rata Kanan (Standar Surat Resmi)
    return {
      sigSectionCenterX: labCfg.rightCenterX || 150,
      ketuaColX: labCfg.ketuaX || 122,
      bendaharaColX: labCfg.bendaharaX || 172,
      yOffset: labCfg.yOffset || 0,
      spaceY: labCfg.spaceSignatureY || 24,
    };
  }
}

/**
 * Generates official RAB (Rencana Anggaran Biaya) PDF:
 * Page 1: Surat Permohonan Anggaran with Kop Surat & 3 signatories
 * Page 2: Lampiran Rencana Anggaran Biaya grid table with Total
 */
export function generateRABPDFBlob(
  rab: RABRecord,
  customConfig?: SignatureLayoutConfig
): { blob: Blob; url: string } {
  const cfg = customConfig || getSignatureConfig();
  const rabCfg = cfg.rab;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // ================= PAGE 1: SURAT PERMOHONAN =================
  let y = drawKopSurat(doc, 10);

  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  // Metadata block (Nomor, Lamp., Perihal)
  const metaLabelX = MARGIN_LEFT;
  const metaColonX = MARGIN_LEFT + 20;
  const metaValueX = MARGIN_LEFT + 24;

  doc.text('Nomor', metaLabelX, y);
  doc.text(':', metaColonX, y);
  doc.text(rab.nomor || '0/YMU/RQ/XI/2026', metaValueX, y);
  y += 5.5;

  doc.text('Lamp.', metaLabelX, y);
  doc.text(':', metaColonX, y);
  doc.text('-', metaValueX, y);
  y += 5.5;

  doc.text('Perihal', metaLabelX, y);
  doc.text(':', metaColonX, y);
  doc.text('Permohonan', metaValueX, y);
  y += 10;

  // Recipient block
  doc.text('Kepada Ykh.', metaLabelX, y);
  y += 5.5;
  doc.setFont('times', 'bold');
  doc.text('Ketua Yayasan Misykatul Ummah', metaLabelX, y);
  y += 5.5;
  doc.setFont('times', 'normal');
  doc.text('Di', metaLabelX, y);
  y += 5.5;
  doc.text('      Tempat', metaLabelX, y);
  y += 10;

  // Salam Pembuka
  doc.text('Assalamualaikum Warahmatullahi Wabarakatuh', metaLabelX, y);
  y += 6.5;

  // Paragraph 1
  const p1 =
    'Alhamdulillah, segala puji bagi Allah SWT. Sholawat dan salam semoga tetap tercurah limpahkan kepada Nabi Muhammad SAW.';
  const p1Lines = doc.splitTextToSize(p1, CONTENT_WIDTH);
  doc.text(p1Lines, metaLabelX, y);
  y += p1Lines.length * 5.5 + 4;

  // Paragraph 2
  const p2 = `Untuk menunjang sarana prasarana dan operasional Rumah Qur'an Ulul Azmi pada setiap bulannya, maka dengan ini kami mengajukan Rencana Anggaran Biaya operasional bulan ${rab.bulan} ${rab.tahun}. Adapun rincian Rencana Anggaran Biaya terlampir.`;
  const p2Lines = doc.splitTextToSize(p2, CONTENT_WIDTH);
  doc.text(p2Lines, metaLabelX, y);
  y += p2Lines.length * 5.5 + 4;

  // Paragraph 3 (Closing)
  const p3 =
    'Demikian surat permohonan ini yang kami buat, mohon kiranya agar diterima dan ditindaklanjuti. Atas perhatiannya kami ucapkan Jazakumullah Khoiron.';
  const p3Lines = doc.splitTextToSize(p3, CONTENT_WIDTH);
  doc.text(p3Lines, metaLabelX, y);
  y += p3Lines.length * 5.5 + 4;

  // Salam Penutup
  doc.text('Wassalamualaikum Warahmatullahi Wabarakatuh.', metaLabelX, y);
  y += 14 + (rabCfg.yOffset || 0);

  // ================= BLOK TANDA TANGAN RAB =================
  const tanggalSurat =
    formatTanggalSurat(rab.tanggal) || `02 ${rab.bulan} ${rab.tahun}`;
  const kota = rab.kota || 'Kibang Budi Jaya';

  // 1. Sisi Kiri: Yang menyetujui (Ketua Yayasan)
  const leftColX = rabCfg.leftColX || 45;
  doc.text('Yang menyetujui,', leftColX, y, { align: 'center' });
  doc.text('Ketua Yayasan Misykatul Ummah', leftColX, y + 5, { align: 'center' });

  // 2. Sisi Kanan: Titimangsa & "Mengetahui,"
  const rightSectionCenterX = rabCfg.rightCenterX || 150;
  doc.text(`${kota}, ${tanggalSurat}`, rightSectionCenterX, y - 6, { align: 'center' });
  doc.text('Mengetahui,', rightSectionCenterX, y, { align: 'center' });

  // 3. Sub-kolom Sisi Kanan: Ketua RQ Ulul Azmi & Bendahara RQ Ulul Azmi
  const ketuaX = rabCfg.ketuaX || 122;
  const bendaharaX = rabCfg.bendaharaX || 172;

  doc.text('Ketua RQ Ulul Azmi', ketuaX, y + 5, { align: 'center' });
  doc.text('Bendahara RQ Ulul Azmi', bendaharaX, y + 5, { align: 'center' });

  // 4. Nama Penandatangan (Tebal & Garis Bawah)
  const signY = y + 5 + (rabCfg.spaceSignatureY || 28);
  doc.setFont('times', 'bold');
  drawUnderlinedText(doc, rab.ketuaYayasan || 'SURYADI', leftColX, signY, {
    align: 'center',
  });
  drawUnderlinedText(doc, rab.ketuaRQ || 'AL MUTAQIN', ketuaX, signY, {
    align: 'center',
  });
  drawUnderlinedText(doc, rab.bendaharaRQ || 'HAMIDAH FAUZIYAH', bendaharaX, signY, {
    align: 'center',
  });

  // ================= PAGE 2: LAMPIRAN RINCIAN ANGGARAN =================
  doc.addPage();
  y = 20;

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('Lampiran', MARGIN_LEFT, y);
  y += 6;

  doc.setFontSize(11);
  doc.text(`I.  Rencana Anggaran Biaya Bulan ${rab.bulan} ${rab.tahun}`, MARGIN_LEFT, y);
  y += 8;

  // Table Coordinates
  const colX = [
    MARGIN_LEFT,              // Col 0 (No start): 15mm
    MARGIN_LEFT + 15,         // Col 1 (Rincian start): 30mm
    MARGIN_LEFT + 130,        // Col 2 (Jumlah start): 145mm
    PAGE_WIDTH - MARGIN_RIGHT // Col 3 (End): 195mm
  ];
  const tableWidth = colX[3] - colX[0]; // 180mm

  // Table Header
  const headerHeight = 8;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(colX[0], y, tableWidth, headerHeight);
  doc.line(colX[1], y, colX[1], y + headerHeight);
  doc.line(colX[2], y, colX[2], y + headerHeight);

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('No', (colX[0] + colX[1]) / 2, y + 5.5, { align: 'center' });
  doc.text('Rincian Kebutuhan', colX[1] + 3, y + 5.5);
  doc.text('Jumlah', (colX[2] + colX[3]) / 2, y + 5.5, { align: 'center' });
  y += headerHeight;

  // Table Items
  doc.setFont('times', 'normal');
  doc.setFontSize(10);

  const items = Array.isArray(rab.items) && rab.items.length > 0
    ? rab.items
    : [
        { id: '1', rincian: 'Belanja Dapur', jumlah: 7230000 },
        { id: '2', rincian: 'Tagihan Listrik', jumlah: 511000 },
        { id: '3', rincian: 'Oprasional', jumlah: 1712000 },
      ];

  items.forEach((item, index) => {
    const rowHeight = 7.5;
    doc.rect(colX[0], y, tableWidth, rowHeight);
    doc.line(colX[1], y, colX[1], y + rowHeight);
    doc.line(colX[2], y, colX[2], y + rowHeight);

    doc.text(String(index + 1), (colX[0] + colX[1]) / 2, y + 5, { align: 'center' });
    doc.text(item.rincian || '-', colX[1] + 3, y + 5);
    doc.text(formatCurrencyRAB(item.jumlah), colX[3] - 4, y + 5, { align: 'right' });
    y += rowHeight;
  });

  // Total Row
  const totalRowHeight = 8;
  doc.setFont('times', 'bold');
  doc.rect(colX[0], y, tableWidth, totalRowHeight);
  doc.line(colX[2], y, colX[2], y + totalRowHeight);

  doc.text('Jumlah Total', colX[1] + 3, y + 5.5);
  doc.text(formatCurrencyRAB(rab.total), colX[3] - 4, y + 5.5, { align: 'right' });

  return createPDFResult(doc);
}

/**
 * Generates official LAB (Laporan Anggaran Bulanan / Laporan Rekapitulasi Keuangan) PDF:
 * Page 1: Surat Pengantar Laporan with Kop Surat & 2 signatories
 * Page 2: Lampiran 1 - Rekapitulasi Keuangan Mutasi Table (with Kop Surat, Saldo Awal, & Saldo Akhir)
 * Page 3: Lampiran 2 - Laporan Jumlah Pemasukan dan Pengeluaran & Formula Calculation
 */
export function generateLABPDFBlob(
  lab: LABRecord,
  transactions: TransaksiRecord[] = [],
  customConfig?: SignatureLayoutConfig
): { blob: Blob; url: string } {
  const cfg = customConfig || getSignatureConfig();
  const labCoords = getLABSignatureCoords(cfg);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const tanggalSurat =
    formatTanggalSurat(lab.tanggal) || `31 ${lab.bulan} ${lab.tahun}`;
  const kota = lab.kota || 'Kibang Budi Jaya';
  const prevInfo = getPreviousMonthInfo(lab.bulan, lab.tahun);

  // ================= PAGE 1: SURAT PENGANTAR =================
  let y = drawKopSurat(doc, 10);

  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  // Metadata block
  const metaLabelX = MARGIN_LEFT;
  const metaColonX = MARGIN_LEFT + 20;
  const metaValueX = MARGIN_LEFT + 24;

  doc.text('Nomor', metaLabelX, y);
  doc.text(':', metaColonX, y);
  doc.text(lab.nomor || '125/YUA/RQ/VIII/2025', metaValueX, y);
  y += 5.5;

  doc.text('Lamp.', metaLabelX, y);
  doc.text(':', metaColonX, y);
  doc.text('1 bundel', metaValueX, y);
  y += 5.5;

  doc.text('Perihal', metaLabelX, y);
  doc.text(':', metaColonX, y);
  doc.text('Laporan Rekapitulasi Keuangan', metaValueX, y);
  y += 10;

  // Recipient block
  doc.text('Kepada Ykh.', metaLabelX, y);
  y += 5.5;
  doc.setFont('times', 'bold');
  doc.text('Ketua Yayasan Misykatul Ummah', metaLabelX, y);
  y += 5.5;
  doc.setFont('times', 'normal');
  doc.text('Di', metaLabelX, y);
  y += 5.5;
  doc.text('      Tempat', metaLabelX, y);
  y += 10;

  // Salam Pembuka
  doc.text('Assalamualaikum Warahmatullahi Wabarakatuh', metaLabelX, y);
  y += 6.5;

  // Opening paragraph
  const p1 =
    'Alhamdulillah, segala puji bagi Allah SWT. Sholawat dan salam semoga tetap tercurah limpahkan kepada Nabi Muhammad SAW.';
  const p1Lines = doc.splitTextToSize(p1, CONTENT_WIDTH);
  doc.text(p1Lines, metaLabelX, y);
  y += p1Lines.length * 5.5 + 4;

  // Body paragraph
  const p2 = `Bersama ini kami sampaikan kepada ketua Yayasan Misykatul Ummah, sirkulasi keuangan Rumah Qur'an Ulul Azmi bulan ${lab.bulan} ${lab.tahun}. Adapun rinciannya sebagai berikut;`;
  const p2Lines = doc.splitTextToSize(p2, CONTENT_WIDTH);
  doc.text(p2Lines, metaLabelX, y);
  y += p2Lines.length * 5.5 + 3;

  // Numbered attachment items
  doc.text(`1. Rekapitulasi keuangan bulan ${lab.bulan} ${lab.tahun} (terlampir)`, metaLabelX + 4, y);
  y += 5.5;
  doc.text(`2. Laporan jumlah pemasukan dan pengeluaran bulan ${lab.bulan} ${lab.tahun} (terlampir)`, metaLabelX + 4, y);
  y += 5.5;
  doc.text('3. Bukti pemasukan dan pengeluaran (terlampir)', metaLabelX + 4, y);
  y += 8.5;

  // Closing paragraph
  const p3 =
    'Demikian laporan yang kami buat, atas perhatiannya kami ucapkan Jazakumullah Khoiron.';
  const p3Lines = doc.splitTextToSize(p3, CONTENT_WIDTH);
  doc.text(p3Lines, metaLabelX, y);
  y += p3Lines.length * 5.5 + 4;

  // Salam Penutup
  doc.text('Wassalamualaikum Warahmatullahi Wabarakatuh', metaLabelX, y);
  y += 16 + labCoords.yOffset;

  // ================= BLOK TANDA TANGAN LAB (HALAMAN 1) =================
  doc.text(`${kota}, ${tanggalSurat}`, labCoords.sigSectionCenterX, y, { align: 'center' });
  y += 6;
  doc.text('Mengetahui,', labCoords.sigSectionCenterX, y, { align: 'center' });
  y += 6;

  doc.text('Ketua Rumah Qur\'an', labCoords.ketuaColX, y, { align: 'center' });
  doc.text('Bendahara Rumah Qur\'an', labCoords.bendaharaColX, y, { align: 'center' });

  y += labCoords.spaceY;
  doc.setFont('times', 'bold');
  drawUnderlinedText(doc, lab.ketuaRQ || 'AL MUTAQIN', labCoords.ketuaColX, y, { align: 'center' });
  drawUnderlinedText(doc, lab.bendaharaRQ || 'HAMIDAH FAUZIYAH', labCoords.bendaharaColX, y, {
    align: 'center',
  });

  // ================= PAGE 2: LAMPIRAN 1 (REKAPITULASI KEUANGAN) =================
  doc.addPage();
  y = drawKopSurat(doc, 10);

  // Document Title
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(
    `REKAPITULASI KEUANGAN BULAN ${lab.bulan.toUpperCase()} ${lab.tahun}`,
    PAGE_WIDTH / 2,
    y,
    { align: 'center' }
  );
  y += 7;

  // Subheader
  doc.setFontSize(10);
  doc.text(`Bulan : ${lab.bulan} ${lab.tahun}`, MARGIN_LEFT, y);
  y += 5.5;

  // Mutasi Table Column Layout
  // Total width: 180mm
  // Hari/Tgl: 22mm, No: 10mm, Keterangan: 68mm, Masuk: 26mm, Keluar: 26mm, Saldo: 28mm
  const tColX = [
    MARGIN_LEFT,              // 0: 15mm
    MARGIN_LEFT + 22,         // 1: 37mm
    MARGIN_LEFT + 32,         // 2: 47mm
    MARGIN_LEFT + 100,        // 3: 115mm
    MARGIN_LEFT + 126,        // 4: 141mm
    MARGIN_LEFT + 152,        // 5: 167mm
    PAGE_WIDTH - MARGIN_RIGHT // 6: 195mm
  ];

  const drawTableHeader = (currY: number) => {
    const hHeight = 7;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(tColX[0], currY, CONTENT_WIDTH, hHeight);
    for (let i = 1; i < tColX.length - 1; i++) {
      doc.line(tColX[i], currY, tColX[i], currY + hHeight);
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text('Hari/Tgl', (tColX[0] + tColX[1]) / 2, currY + 4.8, { align: 'center' });
    doc.text('No', (tColX[1] + tColX[2]) / 2, currY + 4.8, { align: 'center' });
    doc.text('Keterangan', (tColX[2] + tColX[3]) / 2, currY + 4.8, { align: 'center' });
    doc.text('Masuk', (tColX[3] + tColX[4]) / 2, currY + 4.8, { align: 'center' });
    doc.text('Keluar', (tColX[4] + tColX[5]) / 2, currY + 4.8, { align: 'center' });
    doc.text('Saldo', (tColX[5] + tColX[6]) / 2, currY + 4.8, { align: 'center' });
    return currY + hHeight;
  };

  y = drawTableHeader(y);

  // Row 1: Saldo Awal Bulan Sebelumnya
  const rowHeight = 6.2;
  doc.setFont('times', 'bold');
  doc.setFontSize(8);
  doc.rect(tColX[0], y, CONTENT_WIDTH, rowHeight);
  for (let i = 1; i < tColX.length - 1; i++) {
    doc.line(tColX[i], y, tColX[i], y + rowHeight);
  }
  doc.text(`Saldo ${prevInfo.bulan} ${prevInfo.tahun}`, tColX[2] + 2, y + 4.2);
  doc.text(formatCurrencyLAB(lab.saldoAwal), tColX[6] - 2, y + 4.2, { align: 'right' });
  y += rowHeight;

  // Transaction rows sorted by date
  const sortedTrx = [...transactions].sort((a, b) => {
    const da = a.tanggal || '';
    const db = b.tanggal || '';
    return da.localeCompare(db);
  });

  let runningBalance = Number(lab.saldoAwal) || 0;

  doc.setFont('times', 'normal');
  doc.setFontSize(8);

  sortedTrx.forEach((trx, i) => {
    // Check pagination
    if (y + rowHeight > PAGE_HEIGHT - 35) {
      doc.addPage();
      y = drawKopSurat(doc, 10);
      y = drawTableHeader(y);
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
    }

    const masuk = Number(trx.masuk) || 0;
    const keluar = Number(trx.keluar) || 0;
    runningBalance += masuk - keluar;

    doc.rect(tColX[0], y, CONTENT_WIDTH, rowHeight);
    for (let colIdx = 1; colIdx < tColX.length - 1; colIdx++) {
      doc.line(tColX[colIdx], y, tColX[colIdx], y + rowHeight);
    }

    // Hari/Tgl
    doc.text(formatTanggalTable(trx.tanggal), (tColX[0] + tColX[1]) / 2, y + 4.2, {
      align: 'center',
    });
    // No
    doc.text(String(i + 1), (tColX[1] + tColX[2]) / 2, y + 4.2, { align: 'center' });
    // Keterangan
    const ket = trx.keterangan || '-';
    doc.text(ket, tColX[2] + 2, y + 4.2);
    // Masuk
    if (masuk > 0) {
      doc.text(formatCurrencyLAB(masuk), tColX[4] - 2, y + 4.2, { align: 'right' });
    }
    // Keluar
    if (keluar > 0) {
      doc.text(formatCurrencyLAB(keluar), tColX[5] - 2, y + 4.2, { align: 'right' });
    }
    // Saldo
    doc.text(formatCurrencyLAB(runningBalance), tColX[6] - 2, y + 4.2, { align: 'right' });

    y += rowHeight;
  });

  // Final Row: SALDO AKHIR
  if (y + rowHeight > PAGE_HEIGHT - 35) {
    doc.addPage();
    y = drawKopSurat(doc, 10);
    y = drawTableHeader(y);
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.rect(tColX[0], y, CONTENT_WIDTH, rowHeight);
  // Column line before Saldo
  doc.line(tColX[5], y, tColX[5], y + rowHeight);

  doc.text('SALDO AKHIR', (tColX[0] + tColX[5]) / 2, y + 4.5, { align: 'center' });
  doc.text(formatCurrencyLAB(lab.saldoAkhir), tColX[6] - 2, y + 4.5, { align: 'right' });
  y += rowHeight + 10 + (labCoords.yOffset || 0);

  // Signature Block on Page 2
  if (y + 35 > PAGE_HEIGHT - 15) {
    doc.addPage();
    y = 25;
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`${kota}, ${tanggalSurat}`, labCoords.sigSectionCenterX, y, { align: 'center' });
  y += 5.5;
  doc.text('Mengetahui,', labCoords.sigSectionCenterX, y, { align: 'center' });
  y += 5.5;

  doc.text('Ketua Rumah Qur\'an', labCoords.ketuaColX, y, { align: 'center' });
  doc.text('Bendahara Rumah Qur\'an', labCoords.bendaharaColX, y, { align: 'center' });

  y += labCoords.spaceY;
  doc.setFont('times', 'bold');
  drawUnderlinedText(doc, lab.ketuaRQ || 'AL MUTAQIN', labCoords.ketuaColX, y, { align: 'center' });
  drawUnderlinedText(doc, lab.bendaharaRQ || 'HAMIDAH FAUZIYAH', labCoords.bendaharaColX, y, {
    align: 'center',
  });

  // ================= PAGE 3: LAMPIRAN 2 (PEMASUKAN DAN PENGELUARAN) =================
  doc.addPage();
  y = drawKopSurat(doc, 10);

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.text(
    `LAPORAN JUMLAH PEMASUKAN DAN PENGELUARAN BULAN ${lab.bulan.toUpperCase()} ${lab.tahun}`,
    PAGE_WIDTH / 2,
    y,
    { align: 'center' }
  );
  y += 10;

  // Table coordinates: No (15mm), Bulan (55mm), Pemasukan (55mm), Pengeluaran (55mm)
  const sColX = [
    MARGIN_LEFT,              // 15mm
    MARGIN_LEFT + 15,         // 30mm
    MARGIN_LEFT + 70,         // 85mm
    MARGIN_LEFT + 125,        // 140mm
    PAGE_WIDTH - MARGIN_RIGHT // 195mm
  ];

  // Header
  const sHeaderHeight = 7.5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(sColX[0], y, CONTENT_WIDTH, sHeaderHeight);
  for (let i = 1; i < sColX.length - 1; i++) {
    doc.line(sColX[i], y, sColX[i], y + sHeaderHeight);
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text('No', (sColX[0] + sColX[1]) / 2, y + 5, { align: 'center' });
  doc.text('Bulan', (sColX[1] + sColX[2]) / 2, y + 5, { align: 'center' });
  doc.text('Pemasukan', (sColX[2] + sColX[3]) / 2, y + 5, { align: 'center' });
  doc.text('Pengeluaran', (sColX[3] + sColX[4]) / 2, y + 5, { align: 'center' });
  y += sHeaderHeight;

  // Cumulative Pemasukan = Saldo Awal + Total Masuk (per official institutional reference)
  const cumulativePemasukan = (Number(lab.saldoAwal) || 0) + (Number(lab.totalMasuk) || 0);
  const totalPengeluaran = Number(lab.totalKeluar) || 0;

  // Row 1
  const sRowHeight = 8;
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.rect(sColX[0], y, CONTENT_WIDTH, sRowHeight);
  for (let i = 1; i < sColX.length - 1; i++) {
    doc.line(sColX[i], y, sColX[i], y + sRowHeight);
  }

  doc.text('1', (sColX[0] + sColX[1]) / 2, y + 5.2, { align: 'center' });
  doc.text(`01 ${lab.bulan} ${lab.tahun}`, (sColX[1] + sColX[2]) / 2, y + 5.2, {
    align: 'center',
  });
  doc.text(formatCurrencyLAB(cumulativePemasukan), sColX[3] - 4, y + 5.2, { align: 'right' });
  doc.text(formatCurrencyLAB(totalPengeluaran), sColX[4] - 4, y + 5.2, { align: 'right' });
  y += sRowHeight + 12;

  // Formal Calculation Formula Line
  const pemStr = formatCurrencyRAB(cumulativePemasukan) + ',00';
  const pengStr = formatCurrencyRAB(totalPengeluaran) + ',00';
  const salStr = formatCurrencyRAB(lab.saldoAkhir) + ',00';
  const formulaText = `Saldo akhir = ${pemStr} – ${pengStr} = ${salStr}`;

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text(formulaText, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 20 + (labCoords.yOffset || 0);

  // Signatures on Page 3
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`${kota}, ${tanggalSurat}`, labCoords.sigSectionCenterX, y, { align: 'center' });
  y += 5.5;
  doc.text('Mengetahui,', labCoords.sigSectionCenterX, y, { align: 'center' });
  y += 5.5;

  doc.text('Ketua Rumah Qur\'an', labCoords.ketuaColX, y, { align: 'center' });
  doc.text('Bendahara Rumah Qur\'an', labCoords.bendaharaColX, y, { align: 'center' });

  y += labCoords.spaceY;
  doc.setFont('times', 'bold');
  drawUnderlinedText(doc, lab.ketuaRQ || 'AL MUTAQIN', labCoords.ketuaColX, y, { align: 'center' });
  drawUnderlinedText(doc, lab.bendaharaRQ || 'HAMIDAH FAUZIYAH', labCoords.bendaharaColX, y, {
    align: 'center',
  });

  return createPDFResult(doc);
}
