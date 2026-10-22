import { adminAuth, adminDb, isInitialized, credentialError, projectId } from './firebaseAdmin.js';

export const DEFAULT_ADMIN_EMAIL = 'admin@edumentorx.edu';
export const DEFAULT_ADMIN_NAME = 'EduMentorX Admin';

export async function createInitialAdminAccount(initialPassword, options = {}) {
  if (!isInitialized || !adminAuth || !adminDb) {
    throw new Error(
      `Firebase Admin SDK is not initialized for project [${projectId}].\nReason: ${credentialError || 'Missing or invalid service account credentials.'}`
    );
  }

  const targetEmail = (options.email || process.env.INITIAL_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  const targetName = (options.name || process.env.INITIAL_ADMIN_NAME || DEFAULT_ADMIN_NAME).trim();
  const isForce = Boolean(options.force);
  const mustChangePassword = options.mustChangePassword === true;
  const now = new Date().toISOString();

  // 1. Check if user already exists in Firebase Auth
  let userRecord = null;
  try {
    userRecord = await adminAuth.getUserByEmail(targetEmail);
    console.log(`[Auth Status]: User ${targetEmail} exists in Firebase Authentication (UID: ${userRecord.uid}).`);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      throw err;
    }
  }

  // 2. Check if admin user profile exists in Firestore /users collection
  let existingFirestoreDocExists = false;
  if (userRecord) {
    try {
      const docSnap = await adminDb.collection('users').doc(userRecord.uid).get();
      existingFirestoreDocExists = docSnap.exists && docSnap.data()?.role === 'admin';
    } catch (err) {
      console.warn('[Firestore Lookup Notice]:', err.message);
    }
  }

  // If already fully configured and not forcing update, return early with clear instructions
  if (userRecord && existingFirestoreDocExists && !isForce) {
    return {
      success: false,
      code: 'ADMIN_ALREADY_EXISTS',
      message: `Administrator account [${targetEmail}] is already fully registered in Auth and Firestore (UID: ${userRecord.uid}). Pass --force to reset its password or update its profile.`,
      existingUid: userRecord.uid,
    };
  }

  // 3. Create or update Firebase Auth user
  if (!userRecord) {
    if (!initialPassword || typeof initialPassword !== 'string' || initialPassword.length < 8) {
      throw new Error('Initial admin password must be at least 8 characters long.');
    }

    userRecord = await adminAuth.createUser({
      email: targetEmail,
      displayName: targetName,
      password: initialPassword,
      emailVerified: true,
    });
    console.log(`[Auth Success]: Created Auth user ${targetEmail} with UID: ${userRecord.uid}`);
  } else if (initialPassword) {
    await adminAuth.updateUser(userRecord.uid, {
      password: initialPassword,
      displayName: targetName,
    });
    console.log(`[Auth Success]: Updated password and display name for ${targetEmail} (UID: ${userRecord.uid})`);
  }

  // 4. Assign trusted server-side custom claims (admin: true, role: 'admin')
  await adminAuth.setCustomUserClaims(userRecord.uid, {
    role: 'admin',
    admin: true,
  });
  console.log(`[Custom Claims Success]: Assigned { role: "admin", admin: true } to UID: ${userRecord.uid}`);

  // 5. Create or merge user profile document in Firestore /users/{uid}
  let firestoreCreated = false;
  try {
    await adminDb.collection('users').doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        id: userRecord.uid,
        name: targetName,
        email: targetEmail,
        role: 'admin',
        department: 'Institutional Administration',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
        mustChangePassword,
      },
      { merge: true }
    );
    firestoreCreated = true;

    await adminDb.collection('auditLogs').add({
      id: `log_${Date.now()}`,
      actorId: userRecord.uid,
      actorName: targetName,
      actorRole: 'admin',
      action: isForce ? 'UPDATE_ADMIN_CREDENTIALS' : 'CREATE_INITIAL_ADMIN',
      targetType: 'User',
      targetId: userRecord.uid,
      details: `Administrator account [${targetEmail}] provisioned with role=admin`,
      timestamp: now,
    });
  } catch (err) {
    console.warn('[Firestore Profile Warning]:', err.message);
  }

  return {
    success: true,
    uid: userRecord.uid,
    email: targetEmail,
    name: targetName,
    role: 'admin',
    createdAt: now,
    firestoreCreated,
    mustChangePassword,
    message: firestoreCreated
      ? `Administrator account successfully registered in Firebase Auth & Firestore for ${targetEmail}.`
      : `Administrator account registered in Firebase Auth with custom claims for ${targetEmail}. (Firestore database sync encountered an error).`,
  };
}

export async function checkAdminStatus(customEmail) {
  if (!isInitialized || !adminAuth || !adminDb) {
    return {
      isInitialized: false,
      hasAdmin: false,
      error: credentialError || 'Firebase Admin SDK is not initialized.',
    };
  }

  const emailToCheck = (customEmail || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  let hasAuthAdmin = false;
  let authUid = null;
  try {
    const user = await adminAuth.getUserByEmail(emailToCheck);
    if (user) {
      hasAuthAdmin = true;
      authUid = user.uid;
    }
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      return { isInitialized: false, hasAdmin: false, error: err.message };
    }
  }

  let hasFirestoreAdmin = false;
  if (authUid) {
    try {
      const docSnap = await adminDb.collection('users').doc(authUid).get();
      hasFirestoreAdmin = docSnap.exists && docSnap.data()?.role === 'admin';
    } catch (err) {
      console.warn('[Firestore Admin Query Warning]:', err.message);
    }
  }

  return {
    isInitialized: true,
    hasAdmin: hasAuthAdmin && hasFirestoreAdmin,
    hasAuthOnly: hasAuthAdmin && !hasFirestoreAdmin,
    adminEmail: emailToCheck,
    authUid,
  };
}
