import { initializeApp, cert, applicationDefault, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

let adminApp = null;
let adminAuth = null;
let adminDb = null;
let isInitialized = false;
let credentialError = null;

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'edumentorx-ab2e1';
const firestoreDbId = process.env.FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || 'default';

try {
  if (getApps().length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    // Check environment variables or default server key file paths
    let serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!serviceAccountPath && !serviceAccountJson) {
      const defaultServerPath = path.resolve(process.cwd(), 'server', 'firebase-service-account.json');
      const rootPath = path.resolve(process.cwd(), 'firebase-service-account.json');
      if (fs.existsSync(defaultServerPath)) {
        serviceAccountPath = defaultServerPath;
      } else if (fs.existsSync(rootPath)) {
        serviceAccountPath = rootPath;
      }
    }

    let credential;

    if (serviceAccountJson) {
      try {
        credential = cert(JSON.parse(serviceAccountJson));
      } catch (e) {
        credentialError = `Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON: ${e.message}`;
      }
    } else if (serviceAccountPath) {
      const absolutePath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(process.cwd(), serviceAccountPath);

      if (fs.existsSync(absolutePath)) {
        try {
          credential = cert(JSON.parse(fs.readFileSync(absolutePath, 'utf8')));
        } catch (e) {
          credentialError = `Failed to parse service account JSON file at ${absolutePath}: ${e.message}`;
        }
      } else {
        credentialError = `Service Account key file not found at path:\n  ${absolutePath}`;
      }
    }

    if (!credential && !credentialError) {
      try {
        credential = applicationDefault();
      } catch (e) {
        credentialError = `Application Default Credentials error: ${e.message}`;
      }
    }

    if (credential) {
      adminApp = initializeApp({
        credential,
        projectId,
      });
      adminAuth = getAuth(adminApp);
      adminDb = getFirestore(adminApp, firestoreDbId);
      isInitialized = true;
      console.log('[Firebase Admin SDK] Initialized successfully.');
      console.log(`[Firebase Admin SDK] Target Project ID: ${projectId}`);
    } else {
      console.warn('\n[Firebase Admin SDK Credential Notice]:');
      console.warn(`  ${credentialError}`);
    }
  } else {
    adminApp = getApp();
    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp, firestoreDbId);
    isInitialized = true;
  }
} catch (err) {
  credentialError = err.message;
  console.warn('[Firebase Admin SDK Warning] Initialization failed:', err.message);
}

export { adminApp, adminAuth, adminDb, isInitialized, projectId, credentialError };
