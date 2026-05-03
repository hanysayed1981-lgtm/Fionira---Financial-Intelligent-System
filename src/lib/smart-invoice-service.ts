import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export interface SmartInvoiceCatalogItem {
  id: string;
  name: string;
  price: number;
  vat?: number;
  discountPercent?: number;
  altNames?: string;
  tenantId: string; // Scoped to company
  createdAt: string;
  updatedAt?: string;
}

const COLLECTION_NAME = 'smartInvoiceCatalog';

import { query, where } from 'firebase/firestore';

export const getCatalogItems = async (tenantId: string): Promise<SmartInvoiceCatalogItem[]> => {
  if (!tenantId) return [];
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as SmartInvoiceCatalogItem);
};

export const subscribeToCatalog = (tenantId: string, callback: (items: SmartInvoiceCatalogItem[]) => void) => {
  if (!tenantId) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, COLLECTION_NAME), where('tenantId', '==', tenantId));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => doc.data() as SmartInvoiceCatalogItem);
    callback(items);
  }, (error) => {
    console.error("Error subscribing to catalog:", error);
  });
};

export const saveCatalogItem = async (item: SmartInvoiceCatalogItem, tenantId: string): Promise<void> => {
  if (!tenantId || item.tenantId !== tenantId) throw new Error("tenantId mismatch or missing");
  const docRef = doc(db, COLLECTION_NAME, item.id);
  await setDoc(docRef, item);
};

export const bulkSaveCatalogItems = async (items: SmartInvoiceCatalogItem[], tenantId: string): Promise<void> => {
  if (!tenantId) throw new Error("tenantId is required for batch operations");
  const batch = writeBatch(db);
  items.forEach(item => {
    if (item.tenantId !== tenantId) throw new Error("One or more items do not belong to this tenant");
    const docRef = doc(db, COLLECTION_NAME, item.id);
    batch.set(docRef, item);
  });
  await batch.commit();
};

export const deleteCatalogItem = async (id: string, tenantId: string): Promise<void> => {
  if (!tenantId) throw new Error("tenantId is required for deletion");
  // Optional: Verify ownership before delete if needed, 
  // but firestore rules will handle this securely.
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};

export const bulkDeleteCatalogItems = async (ids: string[], tenantId: string): Promise<void> => {
  if (!tenantId) throw new Error("tenantId is required for batch deletion");
  const batch = writeBatch(db);
  ids.forEach(id => {
    const docRef = doc(db, COLLECTION_NAME, id);
    batch.delete(docRef);
  });
  await batch.commit();
};
