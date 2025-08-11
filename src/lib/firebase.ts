
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import type { DentalCase, Invoice } from '@/types';

const firebaseConfig = {
  projectId: "elegant-smile-r6jex",
  appId: "1:684195793511:web:ff41b829e9a2b0c0dd62c2",
  storageBucket: "elegant-smile-r6jex.firebasestorage.app",
  apiKey: "AIzaSyDFrcocVla_sSA4-rkX6oL8Q35X0kBLQgA",
  authDomain: "elegant-smile-r6jex.firebaseapp.com",
  messagingSenderId: "684195793511"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const casesCollection = collection(db, 'dentalCases');
const usersCollection = collection(db, 'users');
const invoicesCollection = collection(db, 'invoices');


// A function to get all cases, sorted by creation time
export const getCases = async (): Promise<DentalCase[]> => {
  const q = query(casesCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as DentalCase;
  });
};

// A function to get cases for a specific doctor, sorted by creation time
export const getCasesByDoctor = async (dentistName: string): Promise<DentalCase[]> => {
  const q = query(
    casesCollection, 
    where("dentistName", "==", dentistName),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as DentalCase;
  });
};


// A function to add a new case with a server timestamp
export const addCase = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(casesCollection, {
    ...newCase,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

// A function to update a case
export const updateCase = async (caseId: string, updatedCase: Partial<DentalCase>) => {
  const caseDoc = doc(db, 'dentalCases', caseId);
  await updateDoc(caseDoc, updatedCase);
};

// A function to delete a case
export const deleteCase = async (caseId: string) => {
  const caseDoc = doc(db, 'dentalCases', caseId);
  await deleteDoc(caseDoc);
};

// --- User Management Functions ---

// In a real app, you would have more secure user management, this is for prototyping.
export const getUsers = async () => {
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addUser = async (user: { name: string; password?: string }) => {
    // Check if user already exists
    const q = query(usersCollection, where("name", "==", user.name));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        throw new Error("User with this name already exists.");
    }
    await addDoc(usersCollection, user);
};

export const deleteUser = async (userId: string) => {
    const userDoc = doc(db, 'users', userId);
    await deleteDoc(userDoc);
};

export const verifyUser = async (name: string, password?: string) => {
    let q;
    if (password) {
      q = query(usersCollection, where("name", "==", name), where("password", "==", password));
    } else {
      q = query(usersCollection, where("name", "==", name));
    }
    const snapshot = await getDocs(q);
    return !snapshot.empty;
};

// --- Invoice Management Functions ---
export const saveInvoice = async (invoiceData: Omit<Invoice, 'id' | 'createdAt'>) => {
    const docRef = await addDoc(invoicesCollection, {
        ...invoiceData,
        createdAt: serverTimestamp()
    });
    return docRef.id;
}

export const getInvoicesByDoctor = async (dentistName: string): Promise<Invoice[]> => {
    const q = query(
        invoicesCollection,
        where("dentistName", "==", dentistName),
        orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    } as Invoice));
}
