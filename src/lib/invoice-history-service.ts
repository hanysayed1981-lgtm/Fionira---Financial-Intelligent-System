import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { SmartInvoiceCatalogItem } from './smart-invoice-service';

export interface SavedInvoiceItem extends SmartInvoiceCatalogItem {
  qty: number;
}

export interface SavedInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  items: SavedInvoiceItem[];
  subTotal: number;
  discountTotal: number;
  netTotal: number;
  vatTotal: number;
  grandTotal: number;
  tenantId: string; // Scoped to company
  createdAt: string;
  updatedAt: string;
}

const COLLECTION_NAME = 'savedInvoices';

import { where } from 'firebase/firestore';

export const getSavedInvoices = async (tenantId: string): Promise<SavedInvoice[]> => {
  if (!tenantId) return [];
  const q = query(
    collection(db, COLLECTION_NAME), 
    where('tenantId', '==', tenantId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as SavedInvoice);
};

export const subscribeToSavedInvoices = (tenantId: string, callback: (invoices: SavedInvoice[]) => void) => {
  if (!tenantId) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(db, COLLECTION_NAME), 
    where('tenantId', '==', tenantId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const invoices = snapshot.docs.map(doc => doc.data() as SavedInvoice);
    callback(invoices);
  }, (error) => {
    console.error("Error subscribing to saved invoices:", error);
  });
};

export const saveInvoice = async (invoice: SavedInvoice): Promise<void> => {
  if (!invoice.tenantId) throw new Error("tenantId is required for saving invoices");
  const docRef = doc(db, COLLECTION_NAME, invoice.id);
  await setDoc(docRef, invoice);
};

export const deleteSavedInvoice = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};

export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
};
