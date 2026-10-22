import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (process.env || {});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

export const app = isFirebaseConfigured
  ? getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  : null;

export const auth = app ? getAuth(app) : null;
const firestoreDbId = (env.VITE_FIREBASE_DATABASE_ID as string) || 'default';
export const db = app ? getFirestore(app, firestoreDbId) : null;
export const storage = app ? getStorage(app) : null;

// Shared Firestore connection health & circuit-breaker state across Auth and Database services
let sharedFirestoreOfflineUntil = 0;
let sharedConsecutiveFailures = 0;
let sharedLastFirestoreError: string | null = null;
const SHARED_COOLDOWN_MS = 30000;
const SHARED_FAILURE_THRESHOLD = 2;

export function isSharedFirestoreOffline(): boolean {
  return Date.now() < sharedFirestoreOfflineUntil;
}

export function getSharedFirestoreError(): string | null {
  return sharedLastFirestoreError;
}

export function recordSharedFirestoreFailure(reason: string, immediateTrip = false): void {
  sharedLastFirestoreError = reason;
  sharedConsecutiveFailures += 1;
  if (immediateTrip || sharedConsecutiveFailures >= SHARED_FAILURE_THRESHOLD) {
    sharedFirestoreOfflineUntil = Date.now() + SHARED_COOLDOWN_MS;
  }
}

export function recordSharedFirestoreSuccess(): void {
  sharedConsecutiveFailures = 0;
  sharedLastFirestoreError = null;
  sharedFirestoreOfflineUntil = 0;
}

