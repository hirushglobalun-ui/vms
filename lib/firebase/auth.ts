import { getApps, initializeApp } from 'firebase/app';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  getAuth,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured, firebaseConfig } from './config';
import { User, UserRole } from '../types';

/**
 * Real Firebase Sign In for staff (Admin / Agent)
 */
export async function signInStaff(email: string, password: string): Promise<User> {
  if (!isFirebaseConfigured || !auth || !db) {
    throw new Error('Firebase configuration is missing. Cannot sign in.');
  }

  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const uid = userCredential.user.uid;

  // Retrieve user document from Firestore: users/{uid}
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    // If not found in users collection, sign out and throw error
    await signOut(auth);
    throw new Error('User profile record not found in system database.');
  }

  const userData = userDocSnap.data() as Omit<User, 'id'>;

  // Check account status (Section 4 & 56)
  if (userData.status === 'INACTIVE') {
    await signOut(auth);
    throw new Error('Your account is currently INACTIVE. Please contact system administrator.');
  }

  return {
    id: uid,
    ...userData,
  };
}

/**
 * Sign out current staff session
 */
export async function signOutStaff(): Promise<void> {
  if (auth) {
    await signOut(auth);
  }
}

/**
 * Creates a new staff user in Firebase Auth and Firestore users/{uid}
 */
export async function createStaffAccount(
  email: string,
  password: string,
  name: string,
  mobile: string,
  role: UserRole
): Promise<User> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase configuration is missing.');
  }

  let uid = '';
  try {
    const secondaryApp =
      getApps().find((a) => a.name === 'StaffCreatorAuth') ||
      initializeApp(firebaseConfig, 'StaffCreatorAuth');
    const secondaryAuth = getAuth(secondaryApp);
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    uid = userCredential.user.uid;
    await signOut(secondaryAuth);
  } catch (authErr: any) {
    console.error('Firebase Auth user creation error:', authErr);
    throw authErr;
  }

  const newUser: User = {
    id: uid,
    name: name.trim(),
    email: email.trim(),
    mobile: mobile.trim(),
    role,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', uid), {
    name: newUser.name,
    email: newUser.email,
    mobile: newUser.mobile,
    role: newUser.role,
    status: newUser.status,
    createdAt: newUser.createdAt,
    updatedAt: newUser.updatedAt,
  });

  return newUser;
}

/**
 * Listens to active Firebase Auth state and verifies status & permissions
 */
export function subscribeAuthState(
  callback: (user: User | null, error?: string) => void
): () => void {
  if (!isFirebaseConfigured || !auth || !db) {
    callback(null, 'Firebase is not configured.');
    return () => {};
  }

  const unsubscribe = onAuthStateChanged(auth, async (rawUser: FirebaseUser | null) => {
    if (!rawUser) {
      callback(null);
      return;
    }

    try {
      const userDocRef = doc(db!, 'users', rawUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await signOut(auth!);
        callback(null, 'User profile record not found.');
        return;
      }

      const userData = userDocSnap.data() as Omit<User, 'id'>;

      if (userData.status === 'INACTIVE') {
        await signOut(auth!);
        callback(null, 'Account deactivated. Access revoked.');
        return;
      }

      callback({
        id: rawUser.uid,
        ...userData,
      });
    } catch (err: any) {
      console.error('Error fetching user profile in auth subscriber:', err);
      callback(null, err?.message || 'Authentication error');
    }
  });

  return unsubscribe;
}
