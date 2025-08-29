
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
  serverTimestamp,
  writeBatch,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import type { DentalCase, Invoice, Notification, LoginLog, User } from '@/types';
import { sendNewCaseNotification } from '@/app/actions';

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
const notificationsCollection = collection(db, 'notifications');
const loginLogsCollection = collection(db, 'loginLogs');


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
  
  // Create a notification for the owner
  await createNotification(
    'owner', 
    `New Case From ${newCase.dentistName}`
  );
  
  // The notification is now sent from the page component after this function resolves
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
export const getUsers = async (): Promise<User[]> => {
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const addUser = async (user: Partial<User>) => {
    // Check if user already exists (case-insensitive)
    if (user.name) {
      const q = query(usersCollection, where('name', '==', user.name));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
          // A more precise check for case-insensitivity
          const users = querySnapshot.docs.map(d => d.data());
          if (users.some(u => u.name.toLowerCase() === user.name?.toLowerCase())) {
              throw new Error("User with this name already exists.");
          }
      }
    }
    
    await addDoc(usersCollection, {
        ...user,
        welcomeMessage: user.welcomeMessage || `Welcome, ${user.name}`
    });
};

export const updateUser = async (userId: string, updatedData: Partial<User>) => {
    const userDocRef = doc(db, 'users', userId);

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
            throw new Error("User not found.");
        }
        
        const currentUserData = userDoc.data() as User;

        if (updatedData.name && updatedData.name.toLowerCase() !== currentUserData.name.toLowerCase()) {
            // Check if another user already has the new name (case-insensitive)
            const q = query(usersCollection, where('name', '==', updatedData.name));
            const querySnapshot = await getDocs(q);
            const existingUserDoc = querySnapshot.docs.find(doc => doc.id !== userId);

            if (existingUserDoc) {
                 const existingUserData = existingUserDoc.data();
                 if (existingUserData.name.toLowerCase() === updatedData.name.toLowerCase()) {
                    throw new Error("This username is already taken.");
                 }
            }
        }
        transaction.update(userDocRef, updatedData);
    });
};

export const deleteUser = async (userId: string) => {
    const userDoc = doc(db, 'users', userId);
    await deleteDoc(userDoc);
};

export const verifyUser = async (name: string, password?: string): Promise<User | null> => {
    const snapshot = await getDocs(usersCollection);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

    const matchedUser = users.find(user => 
        user.name.toLowerCase() === name.toLowerCase() &&
        (!password || user.password === password)
    );

    return matchedUser || null;
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

export const deleteInvoice = async (invoiceId: string) => {
    const invoiceDoc = doc(db, 'invoices', invoiceId);
    await deleteDoc(invoiceDoc);
};

// --- Notification Management Functions ---

export const createNotification = async (dentistName: string, message: string) => {
    await addDoc(notificationsCollection, {
        dentistName,
        message,
        read: false,
        createdAt: serverTimestamp(),
    });
};

export const getUnreadNotifications = async (dentistName: string): Promise<Notification[]> => {
    const q = query(
        notificationsCollection,
        where('dentistName', '==', dentistName),
        where('read', '==', false),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
};

export const markNotificationAsRead = async (notificationId: string) => {
    const notificationDoc = doc(db, 'notifications', notificationId);
    await updateDoc(notificationDoc, { read: true });
};

// --- Login Log Functions ---

export const addLoginLog = async (dentistName: string) => {
    await addDoc(loginLogsCollection, {
        dentistName,
        timestamp: serverTimestamp(),
    });
};

export const getLoginLogs = async (): Promise<LoginLog[]> => {
    // Delete logs older than 24 hours before fetching
    const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const oldLogsQuery = query(loginLogsCollection, where('timestamp', '<', twentyFourHoursAgo));
    const oldLogsSnapshot = await getDocs(oldLogsQuery);

    if (!oldLogsSnapshot.empty) {
        const batch = writeBatch(db);
        oldLogsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    }
    
    // Fetch remaining (recent) logs
    const q = query(loginLogsCollection, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    } as LoginLog));
};
