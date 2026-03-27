import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  ActionCodeSettings
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocFromServer,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Test connection
export async function checkFirebaseStatus() {
  const status = {
    firestore: false,
    auth: false,
    storage: false,
    domain: window.location.hostname,
    config: !!firebaseConfig.apiKey,
    error: null as string | null
  };

  try {
    // Test Firestore
    await getDocFromServer(doc(db, 'test', 'connection'));
    status.firestore = true;
  } catch (error: any) {
    status.error = error.message;
    if (error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }

  status.auth = !!auth;
  status.storage = !!storage;

  return status;
}

checkFirebaseStatus();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    tenantId: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  setDoc,
  getDoc,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  firebaseConfig
};
export type { User, ActionCodeSettings };
