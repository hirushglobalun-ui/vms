import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBw-LL1bmQ9FDTkR8Onr19VUtHtJZMJZR0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "vehicle-management-syste-f7254.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vehicle-management-syste-f7254",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "vehicle-management-syste-f7254.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "568137453217",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:568137453217:web:53b880b28ca32624146ae0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const [,, emailArg, passwordArg, nameArg, mobileArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.log(`
Usage:
  node scripts/create-admin.mjs <admin-email> <admin-password> [admin-name] [admin-mobile]

Example:
  node scripts/create-admin.mjs admin@apexmotors.com ApexAdmin@2026 "Anas (Admin)" "+91 98470 00001"
  `);
  process.exit(1);
}

const email = emailArg.trim();
const password = passwordArg.trim();
const name = (nameArg || 'System Administrator').trim();
const mobile = (mobileArg || '+91 98470 00001').trim();

async function main() {
  console.log(`\nInitializing Production Administrator for ${firebaseConfig.projectId}...`);
  console.log(`Email: ${email}`);
  console.log(`Name:  ${name}`);
  console.log(`Role:  ADMIN\n`);

  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
    console.log(`Created Firebase Auth user successfully! UID: ${uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log(`User already exists in Firebase Auth. Signing in to verify credentials...`);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
      console.log(`Authenticated existing user! UID: ${uid}`);
    } else {
      console.error('Firebase Auth creation failed:', err.message);
      process.exit(1);
    }
  }

  // Create or update Firestore users/{uid} document
  const userDocRef = doc(db, 'users', uid);
  const now = new Date().toISOString();
  await setDoc(userDocRef, {
    name,
    email,
    mobile,
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  console.log(`Created Firestore document at users/${uid} with role: ADMIN, status: ACTIVE!`);

  // Initialize agency system settings document if not present
  const settingsDocRef = doc(db, 'settings', 'global');
  await setDoc(settingsDocRef, {
    companyName: 'Apex Motor Consultancy',
    companyMobile: mobile,
    companyAddress: 'Calicut Road, Perinthalmanna, Malappuram, Kerala 679322',
    defaultReminderDays: 30,
    supportedDocumentTypes: [
      'INSURANCE',
      'ROAD_TAX',
      'GREEN_TAX',
      'PUC',
      'FITNESS',
      'PERMIT',
      'RC',
      'OTHER',
    ],
    updatedAt: now,
  }, { merge: true });

  console.log(`Initialized Firestore document at settings/global!`);
  console.log(`\nProduction ADMIN setup complete! You can now log in at /login.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Initialization error:', err);
  process.exit(1);
});
