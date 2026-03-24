import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, OperationType, handleFirestoreError, onSnapshot } from './firebase';
import { UserProfile, Client, Process, Bank, MarketData } from './types';

export const api = {
  subscribeToCollection(collectionName: string, callback: (data: any[]) => void) {
    const q = collection(db, collectionName);
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, collectionName);
    });
  },
  async getData() {
    try {
      const collections = ['users', 'clients', 'processes', 'agencies', 'brokers', 'banks', 'market_data'];
      const data: any = {};
      
      for (const colName of collections) {
        const querySnapshot = await getDocs(collection(db, colName));
        data[colName] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'all');
    }
  },
  async create(collectionName: string, data: any) {
    try {
      const docRef = doc(collection(db, collectionName));
      const id = docRef.id;
      const newItem = { ...data, id };
      await setDoc(docRef, newItem);
      return newItem;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionName);
    }
  },
  async update(collectionName: string, id: string, data: any) {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, data);
      return { id, ...data };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
    }
  },
  async delete(collectionName: string, id: string) {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  }
};
