import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Plant, PlantStatus } from '../types/schema';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseService = {
  async testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  },

  subscribeToPlants(callback: (plants: Plant[]) => void) {
    if (!auth.currentUser) return () => {};
    
    const q = query(
      collection(db, 'plants'), 
      where('ownerId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const plants = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nickname: data.nickname || 'Unnamed Plant',
          status: data.status || 'Vegetative',
          logs: data.logs || [],
          dateAcquired: data.dateAcquired?.toDate() || new Date(),
          lastWatered: data.lastWatered?.toDate(),
          lastMisted: data.lastMisted?.toDate(),
          lastFertilized: data.lastFertilized?.toDate(),
          rootingStartedAt: data.rootingStartedAt?.toDate(),
          wateringIntervalDays: data.wateringIntervalDays,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt?.toDate(),
          ownerId: data.ownerId
        } as Plant;
      });
      callback(plants);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'plants');
    });
  },

  async addPlant(nickname: string, status: PlantStatus) {
    if (!auth.currentUser) return;
    const newDocRef = doc(collection(db, 'plants'));
    const plantId = newDocRef.id;
    const path = `plants/${plantId}`;
    try {
      await setDoc(newDocRef, {
        id: plantId,
        ownerId: auth.currentUser.uid,
        nickname,
        status,
        createdAt: Timestamp.now(),
        dateAcquired: Timestamp.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updatePlant(plantId: string, updates: Partial<Plant>) {
    const path = `plants/${plantId}`;
    try {
      const firestoreUpdates: any = { ...updates };
      if (updates.lastWatered) firestoreUpdates.lastWatered = Timestamp.fromDate(updates.lastWatered);
      if (updates.lastMisted) firestoreUpdates.lastMisted = Timestamp.fromDate(updates.lastMisted);
      if (updates.lastFertilized) firestoreUpdates.lastFertilized = Timestamp.fromDate(updates.lastFertilized);
      if (updates.rootingStartedAt) firestoreUpdates.rootingStartedAt = Timestamp.fromDate(updates.rootingStartedAt);
      
      await updateDoc(doc(db, 'plants', plantId), firestoreUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deletePlant(plantId: string) {
    const path = `plants/${plantId}`;
    try {
      await deleteDoc(doc(db, 'plants', plantId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
