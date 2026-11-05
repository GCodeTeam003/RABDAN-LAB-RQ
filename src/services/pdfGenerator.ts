import { jsPDF } from 'jspdf';
import { LABRecord, RABRecord, TransaksiRecord } from '../types';
import { formatRupiah, formatTanggalIndonesia } from '../utils/formatters';

export function generateRABPDFBlob(rab: RABRecord): { blob: Blob; url: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header / Kop Surat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text('FIA — FINANCE INSTANSI AZMI', pageWidth / 2, y, { align: 'center' });
  y += 5.5;

  doc.setFontSize(14);
  doc.text('YAYASAN MISYKATUL UMMAH (YMU)', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(15);
  doc.setTextColor(39, 174, 96); // Forest Green
  doc.text("RUMAH QUR'AN ULUL AZMI", pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Sekretariat: Kibang Budi Jaya, Lambu Kibang, Tulang Bawang Barat, Lampung', pageWidth / 2, y, { align: 'center' });
  y += 4;

  // Header decorative line
  doc.setDrawColor(39, 174, 96);
  doc.setLineWidth(0.8);
  doc.line(15, y, pageWidth - 15, y);
  y += 1.2;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text('RENCANA ANGGARAN BIAYA (RAB)', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Nomor: ${rab.nomor}`, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Periode: Bulan ${rab.bulan} ${rab.tahun}`, pageWidth / 2, y, { align: 'center' });
  y += 9;

  // Items Table Header
  const colX = [18, 30, 140, 192];
  doc.setFillColor(245, 247, 250);
  doc.rect(colX[0], y, colX[3] - colX[0], 8, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.rect(colX[0], y, colX[3] - colX[0], 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text('NO', (colX[0] + colX[1]) / 2, y + 5.5, { align: 'center' });
  doc.text('RINCIAN KEBUTUHAN', colX[1] + 3, y + 5.5);
  doc.text('JUMLAH (RP)', colX[3] - 3, y + 5.5, { align: 'right' });
  y += 8;

  // Item Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);

  rab.items.forEach((item, index) => {
    const rowHeight = 7.5;
    // alternating background
    if (index % 2 === 1) {
      doc.setFillColor(252, 253, 254);
      doc.rect(colX[0], y, colX[3] - colX[0], rowHeight, 'F');
    }
    doc.setDrawColor(220, 220, 220);
    doc.line(colX[0], y + rowHeight, colX[3], y + rowHeight);

    doc.text(String(index + 1), (colX[0] + colX[1]) / 2, y + 5, { align: 'center' });
    doc.text(item.rincian || '-', colX[1] + 3, y + 5);
    doc.text(formatRupiah(item.jumlah), colX[3] - 3, y + 5, { align: 'right' });

    y += rowHeight;
  });

  // Total Row
  y += 1;
  doc.setFillColor(235, 247, 238);
  doc.rect(colX[0], y, colX[3] - colX[0], 9, 'F');
  doc.setDrawColor(39, 174, 96);
  doc.setLineWidth(0.4);
  doc.rect(colX[0], y, colX[3] - colX[0], 9, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('TOTAL ANGGARAN', colX[1] + 3, y + 6);
  doc.setTextColor(39, 174, 96);
  doc.text(formatRupiah(rab.total), colX[3] - 3, y + 6, { align: 'right' });

  y += 18;

  // City and Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(40, 40, 40);
  doc.text(`${rab.kota || 'Kibang Budi Jaya'}, ${formatTanggalIndonesia(rab.tanggal)}`, colX[3], y, { align: 'right' });
  y += 8;

  // 3-Column Signatures
  const sigColWidth = (colX[3] - colX[0]) / 3;
  const col1X = colX[0] + sigColWidth * 0.5;
  const col2X = colX[0] + sigColWidth * 1.5;
  const col3X = colX[0] + sigColWidth * 2.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Mengetahui,', col1X, y, { align: 'center' });
  doc.text('Disetujui oleh,', col2X, y, { align: 'center' });
  doc.text('Dibuat oleh,', col3X, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.text('Ketua Yayasan', col1X, y, { align: 'center' });
  doc.text("Ketua RQ Ulul Azmi", col2X, y, { align: 'center' });
  doc.text("Bendahara RQ", col3X, y, { align: 'center' });

  y += 24; // Space for signature / stamp

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`( ${rab.ketuaYayasan || '...........................'} )`, col1X, y, { align: 'center' });
  doc.text(`( ${rab.ketuaRQ || 'AL MUTAQIN'} )`, col2X, y, { align: 'center' });
  doc.text(`( ${rab.bendaharaRQ || 'HAMIDAH FAUZIYAH'} )`, col3X, y, { align: 'center' });

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  return { blob, url };
}

export function generateLABPDFBlob(
  lab: LABRecord,
  transactions: TransaksiRecord[] = []
): { blob: Blob; url: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header / Kop Surat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text('FIA — FINANCE INSTANSI AZMI', pageWidth / 2, y, { align: 'center' });
  y += 5.5;

  doc.setFontSize(14);
  doc.text('YAYASAN MISYKATUL UMMAH (YMU)', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(15);
  doc.setTextColor(41, 128, 185); // Blue
  doc.text("RUMAH QUR'AN ULUL AZMI", pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Sekretariat: Kibang Budi Jaya, Lambu Kibang, Tulang Bawang Barat, Lampung', pageWidth / 2, y, { align: 'center' });
  y += 4;

  // Header line
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.8);
  doc.line(15, y, pageWidth - 15, y);
  y += 1.2;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text('LAPORAN ANGGARAN BULANAN (LAB)', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Nomor: ${lab.nomor}`, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Periode: Bulan ${lab.bulan} ${lab.tahun}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Saldo Awal Box
  const colX = [15, 26, 50, 115, 150, 195];
  doc.setFillColor(240, 245, 250);
  doc.roundedRect(colX[0], y, colX[5] - colX[0], 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(41, 128, 185);
  doc.text('SALDO AWAL KAS:', colX[0] + 4, y + 5.5);
  doc.text(formatRupiah(lab.saldoAwal), colX[5] - 4, y + 5.5, { align: 'right' });
  y += 11;

  // Transactions Table Header
  doc.setFillColor(245, 247, 250);
  doc.rect(colX[0], y, colX[5] - colX[0], 7.5, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.rect(colX[0], y, colX[5] - colX[0], 7.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text('NO', (colX[0] + colX[1]) / 2, y + 5, { align: 'center' });
  doc.text('TANGGAL', colX[1] + 2, y + 5);
  doc.text('URAIAN / KETERANGAN', colX[2] + 2, y + 5);
  doc.text('MASUK (RP)', colX[4] - 2, y + 5, { align: 'right' });
  doc.text('KELUAR (RP)', colX[5] - 2, y + 5, { align: 'right' });
  y += 7.5;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);

  if (transactions.length === 0) {
    doc.text('(Belum ada catatan transaksi untuk periode ini)', (colX[0] + colX[5]) / 2, y + 6, { align: 'center' });
    y += 10;
  } else {
    transactions.forEach((trx, i) => {
      const rowHeight = 6.5;
      if (i % 2 === 1) {
        doc.setFillColor(252, 253, 254);
        doc.rect(colX[0], y, colX[5] - colX[0], rowHeight, 'F');
      }
      doc.setDrawColor(230, 230, 230);
      doc.line(colX[0], y + rowHeight, colX[5], y + rowHeight);

      doc.text(String(i + 1), (colX[0] + colX[1]) / 2, y + 4.5, { align: 'center' });
      doc.text(trx.tanggal || '-', colX[1] + 2, y + 4.5);
      doc.text(trx.keterangan || '-', colX[2] + 2, y + 4.5);

      if (trx.masuk > 0) {
        doc.setTextColor(39, 174, 96);
        doc.text(formatRupiah(trx.masuk), colX[4] - 2, y + 4.5, { align: 'right' });
      } else {
        doc.setTextColor(160, 160, 160);
        doc.text('-', colX[4] - 2, y + 4.5, { align: 'right' });
      }

      if (trx.keluar > 0) {
        doc.setTextColor(231, 76, 60);
        doc.text(formatRupiah(trx.keluar), colX[5] - 2, y + 4.5, { align: 'right' });
      } else {
        doc.setTextColor(160, 160, 160);
        doc.text('-', colX[5] - 2, y + 4.5, { align: 'right' });
      }

      doc.setTextColor(40, 40, 40);
      y += rowHeight;
    });
  }

  // Summary Row
  y += 2;
  doc.setFillColor(245, 247, 250);
  doc.rect(colX[0], y, colX[5] - colX[0], 7.5, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(colX[0], y, colX[5] - colX[0], 7.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TOTAL MUTASI KAS', colX[2] + 2, y + 5);
  doc.setTextColor(39, 174, 96);
  doc.text(formatRupiah(lab.totalMasuk), colX[4] - 2, y + 5, { align: 'right' });
  doc.setTextColor(231, 76, 60);
  doc.text(formatRupiah(lab.totalKeluar), colX[5] - 2, y + 5, { align: 'right' });

  y += 9;

  // Saldo Akhir Box
  doc.setFillColor(235, 245, 255);
  doc.roundedRect(colX[0], y, colX[5] - colX[0], 9, 1, 1, 'F');
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.4);
  doc.roundedRect(colX[0], y, colX[5] - colX[0], 9, 1, 1, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text('SALDO AKHIR KAS (Saldo Awal + Masuk - Keluar)', colX[0] + 4, y + 6);
  doc.setTextColor(41, 128, 185);
  doc.text(formatRupiah(lab.saldoAkhir), colX[5] - 4, y + 6, { align: 'right' });

  y += 18;

  // City and Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(40, 40, 40);
  doc.text(`${lab.kota || 'Kibang Budi Jaya'}, ${formatTanggalIndonesia(lab.tanggal)}`, colX[5], y, { align: 'right' });
  y += 8;

  // 2-Column Signatures
  const halfWidth = (colX[5] - colX[0]) / 2;
  const colLeft = colX[0] + halfWidth * 0.5;
  const colRight = colX[0] + halfWidth * 1.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Mengetahui / Menyetujui,', colLeft, y, { align: 'center' });
  doc.text('Dibuat oleh,', colRight, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.text("Ketua RQ Ulul Azmi", colLeft, y, { align: 'center' });
  doc.text("Bendahara RQ", colRight, y, { align: 'center' });

  y += 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`( ${lab.ketuaRQ || 'AL MUTAQIN'} )`, colLeft, y, { align: 'center' });
  doc.text(`( ${lab.bendaharaRQ || 'HAMIDAH FAUZIYAH'} )`, colRight, y, { align: 'center' });

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  return { blob, url };
}
