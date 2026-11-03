export interface LABRecord {
  id: string;
  nomor: string;
  bulan: string;
  tahun: number;
  tanggal: string;
  kota: string;
  ketuaRQ: string;
  bendaharaRQ: string;
  saldoAwal: number;
  totalMasuk: number;
  totalKeluar: number;
  saldoAkhir: number;
  trxCount: number;
  hasLink: boolean;
  linkPDF?: string;
  createdAt?: string;
}

export interface TransaksiRecord {
  id: string;
  idLAB: string;
  tanggal: string;
  keterangan: string;
  masuk: number;
  keluar: number;
  createdAt?: string;
}

export interface RABItem {
  id: string;
  rincian: string;
  jumlah: number;
}

export interface RABRecord {
  id: string;
  nomor: string;
  bulan: string;
  tahun: number;
  tanggal: string;
  kota: string;
  ketuaRQ: string;
  bendaharaRQ: string;
  ketuaYayasan: string;
  total: number;
  itemCount: number;
  items: RABItem[];
  hasLink: boolean;
  linkPDF?: string;
  createdAt?: string;
}

export interface GoogleUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
