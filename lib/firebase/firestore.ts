import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import {
  ActivityLog,
  Client,
  Notification,
  RenewalStatus,
  SystemSettings,
  Task,
  User,
  UserRole,
  Vehicle,
  VehicleDocument,
} from '../types';
import { calculateRenewalStatus } from '../renewals/engine';
import { normalizeRegistrationNumber } from '../utils';

// ========================
// CLIENTS
// ========================
export function subscribeClients(
  role: UserRole,
  userId: string,
  callback: (clients: Client[]) => void
): () => void {
  if (!isFirebaseConfigured || !db) return () => {};

  let q;
  if (role === 'AGENT') {
    q = query(
      collection(db, 'clients'),
      where('assignedAgentId', '==', userId)
    );
  } else {
    q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
  }

  return onSnapshot(q, (snapshot) => {
    const list: Client[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Client, 'id'>),
    }));
    callback(list);
  }, (err) => {
    console.error('Clients subscription error:', err);
  });
}

export async function addClientDoc(
  clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  createdByUserId: string
): Promise<string> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');

  const docRef = await addDoc(collection(db, 'clients'), {
    ...clientData,
    createdBy: createdByUserId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return docRef.id;
}

export async function updateClientDoc(
  clientId: string,
  updates: Partial<Client>
): Promise<void> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');
  const ref = doc(db, 'clients', clientId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteClientDoc(clientId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');
  await deleteDoc(doc(db, 'clients', clientId));
}

// ========================
// VEHICLES
// ========================
export function subscribeVehicles(
  role: UserRole,
  userId: string,
  callback: (vehicles: Vehicle[]) => void
): () => void {
  if (!isFirebaseConfigured || !db) return () => {};

  let q;
  if (role === 'AGENT') {
    q = query(
      collection(db, 'vehicles'),
      where('assignedAgentId', '==', userId)
    );
  } else {
    q = query(collection(db, 'vehicles'), orderBy('createdAt', 'desc'));
  }

  return onSnapshot(q, (snapshot) => {
    const list: Vehicle[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Vehicle, 'id'>),
    }));
    callback(list);
  }, (err) => {
    console.error('Vehicles subscription error:', err);
  });
}

export async function addVehicleDoc(
  vehData: Omit<Vehicle, 'id' | 'normalizedRegistrationNumber' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  createdByUserId: string
): Promise<string> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');

  const norm = normalizeRegistrationNumber(vehData.registrationNumber);

  // Duplicate Check against Firestore (Section 66)
  const dupQuery = query(
    collection(db, 'vehicles'),
    where('normalizedRegistrationNumber', '==', norm),
    where('status', '==', 'ACTIVE')
  );
  const dupSnap = await getDocs(dupQuery);
  if (!dupSnap.empty) {
    throw new Error(`Vehicle with registration number ${vehData.registrationNumber} is already registered!`);
  }

  const docRef = await addDoc(collection(db, 'vehicles'), {
    ...vehData,
    normalizedRegistrationNumber: norm,
    createdBy: createdByUserId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return docRef.id;
}

export async function updateVehicleDoc(
  vehicleId: string,
  updates: Partial<Vehicle>
): Promise<void> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');
  const ref = doc(db, 'vehicles', vehicleId);

  const payload: any = { ...updates, updatedAt: new Date().toISOString() };
  if (updates.registrationNumber) {
    payload.normalizedRegistrationNumber = normalizeRegistrationNumber(updates.registrationNumber);
  }

  await updateDoc(ref, payload);
}

export async function deleteVehicleDoc(vehicleId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');
  await deleteDoc(doc(db, 'vehicles', vehicleId));
}

// ========================
// DOCUMENTS
// ========================
export function subscribeDocuments(
  callback: (docs: VehicleDocument[]) => void
): () => void {
  if (!isFirebaseConfigured || !db) return () => {};

  const q = query(collection(db, 'vehicleDocuments'), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: VehicleDocument[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Omit<VehicleDocument, 'id'>;
      const status = calculateRenewalStatus(data.expiryDate, data.reminderDays, data.isHistorical);
      return {
        id: docSnap.id,
        ...data,
        status,
      };
    });
    callback(list);
  }, (err) => {
    console.error('Documents subscription error:', err);
  });
}

export async function addVehicleDocumentDoc(
  docData: Omit<VehicleDocument, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  createdByUserId: string
): Promise<string> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');

  const status = calculateRenewalStatus(docData.expiryDate, docData.reminderDays);

  const docRef = await addDoc(collection(db, 'vehicleDocuments'), {
    ...docData,
    status,
    isHistorical: false,
    createdBy: createdByUserId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return docRef.id;
}

export async function updateVehicleDocumentDoc(
  docId: string,
  updates: Partial<VehicleDocument>
): Promise<void> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');
  const ref = doc(db, 'vehicleDocuments', docId);

  const payload: any = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (updates.expiryDate !== undefined || updates.reminderDays !== undefined) {
    payload.status = calculateRenewalStatus(updates.expiryDate, updates.reminderDays, updates.isHistorical);
  }

  await updateDoc(ref, payload);
}

export async function deleteDocumentDoc(docId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');
  await deleteDoc(doc(db, 'vehicleDocuments', docId));
}

export const updateDocumentDoc = updateVehicleDocumentDoc;

/**
 * Completes renewal cycle preserving history (Section 11, 69, 70):
 * 1. Archives old document to isHistorical: true, status: 'COMPLETED'
 * 2. Creates the new active document for the next cycle
 * 3. Completes any associated task
 */
export async function completeRenewalCycleDoc(
  oldDoc: VehicleDocument,
  newDetails: {
    newExpiryDate?: string;
    newIssueDate?: string;
    newAmount?: number;
    newDocumentNumber?: string;
    notes?: string;
    fileName?: string;
    fileUrl?: string;
  },
  userId: string,
  linkedTaskId?: string
): Promise<string> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');

  // 1. Update old document to completed historical record
  const oldRef = doc(db, 'vehicleDocuments', oldDoc.id);
  await updateDoc(oldRef, {
    isHistorical: true,
    status: 'COMPLETED',
    updatedAt: new Date().toISOString(),
  });

  // 2. Create new active cycle record
  const newStatus = calculateRenewalStatus(newDetails.newExpiryDate, oldDoc.reminderDays, false);
  const newDocRef = await addDoc(collection(db, 'vehicleDocuments'), {
    vehicleId: oldDoc.vehicleId,
    clientId: oldDoc.clientId,
    documentType: oldDoc.documentType,
    documentName: oldDoc.documentName,
    documentNumber: newDetails.newDocumentNumber || oldDoc.documentNumber,
    issueDate: newDetails.newIssueDate || new Date().toISOString().split('T')[0],
    expiryDate: newDetails.newExpiryDate,
    amount: newDetails.newAmount ?? oldDoc.amount,
    reminderDays: oldDoc.reminderDays,
    status: newStatus,
    isHistorical: false,
    fileName: newDetails.fileName || oldDoc.fileName,
    fileUrl: newDetails.fileUrl || oldDoc.fileUrl,
    notes: newDetails.notes || `Renewed. Prior cycle archived to history.`,
    insuranceProvider: oldDoc.insuranceProvider,
    policyType: oldDoc.policyType,
    testingCentre: oldDoc.testingCentre,
    fitnessType: oldDoc.fitnessType,
    permitType: oldDoc.permitType,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 3. Complete linked task if provided
  if (linkedTaskId) {
    const taskRef = doc(db, 'tasks', linkedTaskId);
    await updateDoc(taskRef, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      completedBy: userId,
      completionNotes: `Renewal completed with new expiry: ${newDetails.newExpiryDate}`,
      updatedAt: new Date().toISOString(),
    });
  }

  // 4. Log audit entry
  await addActivityLogDoc({
    userId,
    userName: 'Staff User',
    action: 'RENEWAL_COMPLETED',
    entityType: 'DOCUMENT',
    entityId: newDocRef.id,
    description: `Completed renewal for ${oldDoc.documentType}. Next due: ${newDetails.newExpiryDate}`,
  });

  return newDocRef.id;
}

// ========================
// TASKS (With Duplicate Task Prevention - Section 12)
// ========================
export function subscribeTasks(
  role: UserRole,
  userId: string,
  callback: (tasks: Task[]) => void
): () => void {
  if (!isFirebaseConfigured || !db) return () => {};

  let q;
  if (role === 'AGENT') {
    q = query(
      collection(db, 'tasks'),
      where('assignedTo', '==', userId)
    );
  } else {
    q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
  }

  return onSnapshot(q, (snapshot) => {
    const list: Task[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Task, 'id'>),
    }));
    callback(list);
  }, (err) => {
    console.error('Tasks subscription error:', err);
  });
}

export async function addTaskDoc(
  taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  createdByUserId: string
): Promise<string> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');

  // Prevent duplicate active task for same vehicle + document (Section 12)
  if (taskData.documentId && taskData.vehicleId) {
    const activeTasksQuery = query(
      collection(db, 'tasks'),
      where('vehicleId', '==', taskData.vehicleId),
      where('documentId', '==', taskData.documentId)
    );
    const existingSnap = await getDocs(activeTasksQuery);
    const hasUnresolved = existingSnap.docs.some((d) => {
      const status = d.data().status;
      return status === 'PENDING' || status === 'CLIENT_CONTACTED' || status === 'PROCESSING' || status === 'WAITING_FOR_DOCUMENT';
    });

    if (hasUnresolved) {
      throw new Error('An active unresolved task already exists for this vehicle renewal.');
    }
  }

  const docRef = await addDoc(collection(db, 'tasks'), {
    ...taskData,
    createdBy: createdByUserId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return docRef.id;
}

export async function updateTaskDoc(
  taskId: string,
  updates: Partial<Task>
): Promise<void> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');
  const ref = doc(db, 'tasks', taskId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function completeTaskDoc(
  taskId: string,
  userId: string,
  completionNotes?: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');
  const ref = doc(db, 'tasks', taskId);
  await updateDoc(ref, {
    status: 'COMPLETED',
    completedAt: new Date().toISOString(),
    completedBy: userId,
    completionNotes: completionNotes || 'Marked completed.',
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTaskDoc(taskId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');
  await deleteDoc(doc(db, 'tasks', taskId));
}

// ========================
// NOTIFICATIONS
// ========================
export function subscribeNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): () => void {
  if (!isFirebaseConfigured || !db) return () => {};

  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const list: Notification[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Notification, 'id'>),
    }));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    console.error('Notifications subscription error:', err);
  });
}

export async function markNotificationReadDoc(notifId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, 'notifications', notifId);
  await updateDoc(ref, { isRead: true });
}

export async function markAllNotificationsReadDoc(userId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('isRead', '==', false));
  const snap = await getDocs(q);
  const promises = snap.docs.map((d) => updateDoc(d.ref, { isRead: true }));
  await Promise.all(promises);
}

export async function clearAllNotificationsDoc(userId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const q = query(collection(db, 'notifications'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const promises = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(promises);
}

export async function deleteNotificationDoc(notifId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, 'notifications', notifId);
  await deleteDoc(ref);
}

// ========================
// ACTIVITY LOGS
// ========================
export function subscribeActivityLogs(
  callback: (logs: ActivityLog[]) => void
): () => void {
  if (!isFirebaseConfigured || !db) return () => {};

  const q = query(collection(db, 'activityLogs'), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: ActivityLog[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<ActivityLog, 'id'>),
    }));
    callback(list);
  }, (err) => {
    console.error('Activity logs subscription error:', err);
  });
}

export async function addActivityLogDoc(
  log: Omit<ActivityLog, 'id' | 'createdAt'>
): Promise<string> {
  if (!isFirebaseConfigured || !db) return '';

  const docRef = await addDoc(collection(db, 'activityLogs'), {
    ...log,
    createdAt: new Date().toISOString(),
  });

  return docRef.id;
}

// ========================
// USERS & SETTINGS
// ========================
export function subscribeUsers(
  callback: (users: User[]) => void
): () => void {
  if (!isFirebaseConfigured || !db) return () => {};

  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: User[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<User, 'id'>),
    }));
    callback(list);
  }, (err) => {
    console.error('Users subscription error:', err);
  });
}

export async function getSystemSettingsDoc(): Promise<SystemSettings | null> {
  if (!isFirebaseConfigured || !db) return null;
  const ref = doc(db, 'settings', 'system');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as SystemSettings;
  }
  return null;
}

export async function addUserDoc(
  userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>,
  customId?: string
): Promise<string> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');
  const id = customId || `user_${Date.now()}`;
  const now = new Date().toISOString();
  await setDoc(doc(db, 'users', id), {
    ...userData,
    id,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateUserDoc(
  userId: string,
  updates: Partial<User>
): Promise<void> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');
  await updateDoc(doc(db, 'users', userId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteUserDoc(userId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');
  await deleteDoc(doc(db, 'users', userId));
}

export async function updateSystemSettingsDoc(
  settings: Partial<SystemSettings>
): Promise<void> {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured.');
  const ref = doc(db, 'settings', 'system');
  await setDoc(ref, settings, { merge: true });
}

