import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { LABRecord, RABRecord, TransaksiRecord } from '../types';

export const LAB_COLLECTION = 'lab';
export const TRANSAKSI_COLLECTION = 'transaksi';
export const RAB_COLLECTION = 'rab';

export interface SharedGoogleAuth {
  connected: boolean;
  email?: string;
  displayName?: string;
  photoURL?: string;
  connectedAt?: string;
}

export async function saveFirestoreSharedAuth(authData: SharedGoogleAuth): Promise<void> {
  const docRef = doc(db, 'settings', 'shared_google_auth');
  try {
    await setDoc(docRef, authData);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/shared_google_auth');
  }
}

export async function getFirestoreSharedAuth(): Promise<SharedGoogleAuth | null> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'shared_google_auth'));
    if (snap.exists()) {
      return snap.data() as SharedGoogleAuth;
    }
  } catch (err) {
    console.warn('Notice reading shared auth from Firestore:', err);
  }
  return null;
}

/**
 * Fetch all documents from Firestore collections
 */
export async function getFirestoreAllData(): Promise<{
  labList: LABRecord[];
  rabList: RABRecord[];
  transaksiList: TransaksiRecord[];
}> {
  try {
    const [labSnap, rabSnap, trxSnap] = await Promise.all([
      getDocs(collection(db, LAB_COLLECTION)),
      getDocs(collection(db, RAB_COLLECTION)),
      getDocs(collection(db, TRANSAKSI_COLLECTION)),
    ]);

    const labList = labSnap.docs.map((d) => ({ id: d.id, ...d.data() } as LABRecord));
    const rabList = rabSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RABRecord));
    const transaksiList = trxSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as TransaksiRecord)
    );

    return { labList, rabList, transaksiList };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'all_collections');
    return { labList: [], rabList: [], transaksiList: [] };
  }
}

/**
 * Real-time listener for multi-user automatic synchronization across all devices
 */
export function subscribeToFirestoreData(
  onUpdate: (data: {
    labList: LABRecord[];
    rabList: RABRecord[];
    transaksiList: TransaksiRecord[];
  }) => void
) {
  let currentLab: LABRecord[] = [];
  let currentRab: RABRecord[] = [];
  let currentTrx: TransaksiRecord[] = [];

  const unsubLab = onSnapshot(
    collection(db, LAB_COLLECTION),
    (snap) => {
      currentLab = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LABRecord));
      onUpdate({ labList: currentLab, rabList: currentRab, transaksiList: currentTrx });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, LAB_COLLECTION);
    }
  );

  const unsubRab = onSnapshot(
    collection(db, RAB_COLLECTION),
    (snap) => {
      currentRab = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RABRecord));
      onUpdate({ labList: currentLab, rabList: currentRab, transaksiList: currentTrx });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, RAB_COLLECTION);
    }
  );

  const unsubTrx = onSnapshot(
    collection(db, TRANSAKSI_COLLECTION),
    (snap) => {
      currentTrx = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TransaksiRecord));
      onUpdate({ labList: currentLab, rabList: currentRab, transaksiList: currentTrx });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, TRANSAKSI_COLLECTION);
    }
  );

  return () => {
    unsubLab();
    unsubRab();
    unsubTrx();
  };
}

/**
 * Save / Update LAB document in Cloud Firestore
 */
export async function saveFirestoreLAB(lab: LABRecord): Promise<void> {
  const docRef = doc(db, LAB_COLLECTION, lab.id);
  try {
    await setDoc(docRef, {
      nomor: lab.nomor || '',
      bulan: lab.bulan || '',
      tahun: Number(lab.tahun) || new Date().getFullYear(),
      tanggal: lab.tanggal || '',
      kota: lab.kota || 'Kibang Budi Jaya',
      ketuaRQ: lab.ketuaRQ || 'AL MUTAQIN',
      bendaharaRQ: lab.bendaharaRQ || 'HAMIDAH FAUZIYAH',
      saldoAwal: Number(lab.saldoAwal) || 0,
      totalMasuk: Number(lab.totalMasuk) || 0,
      totalKeluar: Number(lab.totalKeluar) || 0,
      saldoAkhir: Number(lab.saldoAkhir) || 0,
      trxCount: Number(lab.trxCount) || 0,
      hasLink: !!lab.hasLink,
      createdAt: lab.createdAt || new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${LAB_COLLECTION}/${lab.id}`);
  }
}

/**
 * Save / Update Transaksi document in Cloud Firestore
 */
export async function saveFirestoreTransaksi(trx: TransaksiRecord): Promise<void> {
  const docRef = doc(db, TRANSAKSI_COLLECTION, trx.id);
  try {
    await setDoc(docRef, {
      idLAB: trx.idLAB || '',
      tanggal: trx.tanggal || '',
      keterangan: trx.keterangan || '',
      masuk: Number(trx.masuk) || 0,
      keluar: Number(trx.keluar) || 0,
      createdAt: trx.createdAt || new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${TRANSAKSI_COLLECTION}/${trx.id}`);
  }
}

/**
 * Save / Update RAB document in Cloud Firestore
 */
export async function saveFirestoreRAB(rab: RABRecord): Promise<void> {
  const docRef = doc(db, RAB_COLLECTION, rab.id);
  try {
    await setDoc(docRef, {
      nomor: rab.nomor || '',
      bulan: rab.bulan || '',
      tahun: Number(rab.tahun) || new Date().getFullYear(),
      tanggal: rab.tanggal || '',
      kota: rab.kota || 'Kibang Budi Jaya',
      ketuaRQ: rab.ketuaRQ || 'AL MUTAQIN',
      bendaharaRQ: rab.bendaharaRQ || 'HAMIDAH FAUZIYAH',
      ketuaYayasan: rab.ketuaYayasan || 'H. AHMAD RIFAI, M.Pd.',
      total: Number(rab.total) || 0,
      itemCount: Number(rab.itemCount) || (rab.items ? rab.items.length : 0),
      items: rab.items || [],
      hasLink: !!rab.hasLink,
      createdAt: rab.createdAt || new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${RAB_COLLECTION}/${rab.id}`);
  }
}

/**
 * Delete Transaksi
 */
export async function deleteFirestoreTransaksi(id: string): Promise<void> {
  const docRef = doc(db, TRANSAKSI_COLLECTION, id);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${TRANSAKSI_COLLECTION}/${id}`);
  }
}

/**
 * Delete LAB
 */
export async function deleteFirestoreLAB(id: string): Promise<void> {
  const docRef = doc(db, LAB_COLLECTION, id);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${LAB_COLLECTION}/${id}`);
  }
}

/**
 * Delete RAB
 */
export async function deleteFirestoreRAB(id: string): Promise<void> {
  const docRef = doc(db, RAB_COLLECTION, id);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${RAB_COLLECTION}/${id}`);
  }
}
