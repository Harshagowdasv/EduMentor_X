import { IAuthService, LoginCredentials } from '../interfaces/IAuthService';
import { User, UserRole } from '../../types';
import {
  auth,
  db,
  isFirebaseConfigured,
  isSharedFirestoreOffline,
  recordSharedFirestoreFailure,
  recordSharedFirestoreSuccess,
} from './firebaseConfig';
import { updatePassword, signInWithEmailAndPassword, signOut, onAuthStateChanged as firebaseOnAuthChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { DemoAuthService } from '../demo/DemoAuthService';
import { logLoginStage } from '../../utils/loginPerfLogger';

const AUTH_PROFILE_CACHE_TTL_MS = 30_000;
const AUTH_PROFILE_READ_TIMEOUT_MS =
  typeof process !== 'undefined' && process.env?.FIRESTORE_AUTH_PROFILE_TIMEOUT_MS
    ? Number(process.env.FIRESTORE_AUTH_PROFILE_TIMEOUT_MS)
    : 650;

export class FirebaseAuthService implements IAuthService {
  private fallback: DemoAuthService;
  private userProfileCache = new Map<string, { user: User; expiresAt: number }>();
  private inFlightProfileRequests = new Map<string, Promise<User>>();

  constructor() {
    this.fallback = new DemoAuthService();
  }

  public clearAuthCache(uid?: string): void {
    if (uid) {
      this.userProfileCache.delete(uid);
      this.inFlightProfileRequests.delete(uid);
    } else {
      this.userProfileCache.clear();
      this.inFlightProfileRequests.clear();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!isFirebaseConfigured || !auth) {
      return this.fallback.getCurrentUser();
    }
    const current = auth.currentUser;
    if (!current) return null;

    return this.buildUserFromFbUser(current);
  }

  async login(credentials: LoginCredentials): Promise<User> {
    if (!isFirebaseConfigured || !auth) {
      return this.fallback.login(credentials);
    }

    const cleanEmail = (credentials.email || '').trim().toLowerCase();
    const rawPassword = (credentials.password || '').trim();
    const phoneDigits = rawPassword.replace(/\D/g, '');
    const isFormattedPhoneInput =
      phoneDigits.length >= 10 &&
      phoneDigits !== rawPassword &&
      /^[\d\s()+-]+$/.test(rawPassword);

    const primaryPassword = isFormattedPhoneInput ? phoneDigits : rawPassword;
    const secondaryPassword = isFormattedPhoneInput ? rawPassword : phoneDigits;

    const tStage1 = performance.now();
    try {
      const res = await signInWithEmailAndPassword(auth, cleanEmail, primaryPassword);
      logLoginStage('1_signInWithEmailAndPassword', performance.now() - tStage1, 'SUCCESS');
      return await this.buildUserFromFbUser(res.user, credentials.role);
    } catch (primaryErr: any) {
      if (
        (primaryErr.code === 'auth/invalid-credential' || primaryErr.code === 'auth/wrong-password') &&
        secondaryPassword.length >= 6 &&
        secondaryPassword !== primaryPassword
      ) {
        try {
          const resFallback = await signInWithEmailAndPassword(auth, cleanEmail, secondaryPassword);
          logLoginStage('1_signInWithEmailAndPassword', performance.now() - tStage1, 'SUCCESS', 'fallback-password-norm');
          return await this.buildUserFromFbUser(resFallback.user, credentials.role);
        } catch {
          // Keep primary error
        }
      }
      logLoginStage('1_signInWithEmailAndPassword', performance.now() - tStage1, 'FAILURE', primaryErr?.code || 'auth-error');
      throw primaryErr;
    }
  }

  async logout(): Promise<void> {
    this.clearAuthCache();
    if (!isFirebaseConfigured || !auth) {
      return this.fallback.logout();
    }
    await signOut(auth);
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    if (!isFirebaseConfigured || !auth) {
      return this.fallback.changePassword(oldPassword, newPassword);
    }

    const current = auth.currentUser;
    if (!current) throw new Error('No authenticated user found.');

    // 1. Update Firebase Auth Password securely
    await updatePassword(current, newPassword);

    // 2. Update Firestore /users/{uid} document if reachable
    if (db && !isSharedFirestoreOffline()) {
      try {
        await updateDoc(doc(db, 'users', current.uid), {
          mustChangePassword: false,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        recordSharedFirestoreFailure(String((err as any)?.message || err), true);
        console.warn('Failed to update mustChangePassword flag in Firestore:', err);
      }
    }

    const cached = this.userProfileCache.get(current.uid);
    if (cached) {
      this.userProfileCache.set(current.uid, {
        user: { ...cached.user, mustChangePassword: false },
        expiresAt: Date.now() + AUTH_PROFILE_CACHE_TTL_MS,
      });
    }

    return true;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (!isFirebaseConfigured || !auth) {
      return this.fallback.onAuthStateChanged(callback);
    }
    const tInit = performance.now();
    let isFirstCallback = true;
    return firebaseOnAuthChanged(auth, async (fbUser) => {
      const tCb = performance.now();
      if (!fbUser) {
        if (isFirstCallback) {
          isFirstCallback = false;
          logLoginStage('3_authStateListenerCallback', performance.now() - tInit, 'SUCCESS', 'anonymous');
        }
        callback(null);
      } else {
        try {
          const u = await this.buildUserFromFbUser(fbUser);
          logLoginStage(
            '3_authStateListenerCallback',
            performance.now() - (isFirstCallback ? tInit : tCb),
            'SUCCESS',
            isFirstCallback ? 'initial-restore' : 'auth-transition'
          );
          isFirstCallback = false;
          callback(u);
        } catch (err) {
          logLoginStage('3_authStateListenerCallback', performance.now() - tCb, 'FAILURE');
          isFirstCallback = false;
          callback(null);
        }
      }
    });
  }

  private async fetchUserDocBounded(uid: string): Promise<{
    exists: boolean;
    data: Record<string, any> | null;
    offlineOrTimedOut: boolean;
  }> {
    const tStage4 = performance.now();
    if (!db || isSharedFirestoreOffline()) {
      logLoginStage('4_firestoreUserProfileFetch', performance.now() - tStage4, 'SKIPPED', 'circuit-open');
      return { exists: false, data: null, offlineOrTimedOut: true };
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    try {
      const snap = await Promise.race([
        getDoc(doc(db, 'users', uid)),
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error('firestore_auth_profile_timeout')), AUTH_PROFILE_READ_TIMEOUT_MS);
        }),
      ]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      recordSharedFirestoreSuccess();
      const exists = snap.exists();
      logLoginStage(
        '4_firestoreUserProfileFetch',
        performance.now() - tStage4,
        'SUCCESS',
        exists ? 'doc-found' : 'doc-missing'
      );
      return {
        exists,
        data: exists ? (snap.data() as Record<string, any>) : null,
        offlineOrTimedOut: false,
      };
    } catch (err: any) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      recordSharedFirestoreFailure(String(err?.message || err), true);
      logLoginStage(
        '4_firestoreUserProfileFetch',
        performance.now() - tStage4,
        'FAILURE',
        err?.message === 'firestore_auth_profile_timeout' ? 'timeout-circuit-tripped' : 'firestore-offline'
      );
      return { exists: false, data: null, offlineOrTimedOut: true };
    }
  }

  private async buildUserFromFbUser(fbUser: any, requestedRole?: UserRole): Promise<User> {
    const uid = fbUser.uid;
    const now = Date.now();
    const cached = this.userProfileCache.get(uid);
    if (cached && cached.expiresAt > now && (!requestedRole || cached.user.role === requestedRole)) {
      logLoginStage('2_getIdTokenResult', 0, 'CACHE_HIT');
      logLoginStage('4_firestoreUserProfileFetch', 0, 'CACHE_HIT');
      logLoginStage('5_roleAndPasswordCheck', 0, 'CACHE_HIT', `role=${cached.user.role}`);
      return cached.user;
    }

    const inFlight = this.inFlightProfileRequests.get(uid);
    if (inFlight) {
      return inFlight;
    }

    const profilePromise = this.resolveUserProfileInternal(fbUser, requestedRole);
    this.inFlightProfileRequests.set(uid, profilePromise);
    try {
      const resolvedUser = await profilePromise;
      this.userProfileCache.set(uid, {
        user: resolvedUser,
        expiresAt: Date.now() + AUTH_PROFILE_CACHE_TTL_MS,
      });
      return resolvedUser;
    } finally {
      this.inFlightProfileRequests.delete(uid);
    }
  }

  private async resolveUserProfileInternal(fbUser: any, requestedRole?: UserRole): Promise<User> {
    const emailLower = (fbUser.email || '').trim().toLowerCase();
    let role: UserRole | null = null;
    let name = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
    let department = 'Institutional Administration';
    let mustChangePassword = false;
    let phone = '';
    let hasVerifiedIdentitySource = false;

    // Run Stage 2 (ID token claims, without forced refresh) and Stage 4 (bounded Firestore /users/{uid} read) in parallel
    const tStage2 = performance.now();
    const tokenPromise = fbUser
      .getIdTokenResult(false)
      .then((res: any) => {
        logLoginStage('2_getIdTokenResult', performance.now() - tStage2, 'SUCCESS');
        return res;
      })
      .catch((err: any) => {
        logLoginStage('2_getIdTokenResult', performance.now() - tStage2, 'FAILURE');
        console.warn('Failed to read ID token claims:', err);
        return null;
      });

    const [tokenResult, userDocRes] = await Promise.all([
      tokenPromise,
      this.fetchUserDocBounded(fbUser.uid),
    ]);

    const tStage5 = performance.now();

    // 1. Inspect custom claims from Firebase Auth token
    if (tokenResult?.claims) {
      if (tokenResult.claims.admin || tokenResult.claims.role === 'admin') {
        role = 'admin';
        hasVerifiedIdentitySource = true;
      } else if (tokenResult.claims.role === 'mentor' || tokenResult.claims.mentor) {
        role = 'mentor';
        hasVerifiedIdentitySource = true;
      } else if (tokenResult.claims.role === 'student' || tokenResult.claims.student) {
        role = 'student';
        hasVerifiedIdentitySource = true;
      }
    }

    // 2. Inspect Firestore /users/{uid} document
    if (userDocRes.exists && userDocRes.data) {
      const data = userDocRes.data;
      if (
        data.status === 'DEACTIVATED' ||
        data.status === 'DELETED' ||
        data.academicStatus === 'Deactivated' ||
        data.disabled === true
      ) {
        logLoginStage('5_roleAndPasswordCheck', performance.now() - tStage5, 'FAILURE', 'account-deactivated');
        await signOut(auth!).catch(() => {});
        throw new Error('This account has been deactivated. Please contact the system administrator.');
      }
      if (data.role) {
        role = data.role as UserRole;
        hasVerifiedIdentitySource = true;
      }
      if (data.name) name = data.name;
      if (data.department) department = data.department;
      if (data.phone) phone = data.phone;
      if (typeof data.mustChangePassword === 'boolean') mustChangePassword = data.mustChangePassword;
    }

    // 3. If /users/{uid} was missing or Firestore was unreachable, cross-verify with institutional roster records
    if (!userDocRes.exists) {
      try {
        const { dbService } = await import('../serviceFactory');
        const candidateRole = role || requestedRole;
        if (candidateRole === 'student' || !candidateRole) {
          const stRecord =
            (await dbService.getStudentById(fbUser.uid)) ||
            (emailLower ? await dbService.getStudentById(emailLower) : null);
          if (stRecord) {
            if (stRecord.academicStatus === 'Deactivated') {
              logLoginStage('5_roleAndPasswordCheck', performance.now() - tStage5, 'FAILURE', 'student-deactivated');
              await signOut(auth!).catch(() => {});
              throw new Error('This student account has been deactivated.');
            }
            role = role || 'student';
            name = stRecord.name || name;
            department = stRecord.department || department;
            phone = stRecord.phone || phone;
            hasVerifiedIdentitySource = true;
          }
        }
        if (!hasVerifiedIdentitySource && (candidateRole === 'mentor' || !candidateRole)) {
          const mentors = await dbService.getMentors();
          const mRecord = mentors.find(
            (m) => m.id === fbUser.uid || m.userId === fbUser.uid || (emailLower && m.email.toLowerCase() === emailLower)
          );
          if (mRecord) {
            if (mRecord.status === 'inactive' || (mRecord as any).status === 'deactivated') {
              logLoginStage('5_roleAndPasswordCheck', performance.now() - tStage5, 'FAILURE', 'mentor-deactivated');
              await signOut(auth!).catch(() => {});
              throw new Error('This mentor account has been deactivated.');
            }
            role = role || 'mentor';
            name = mRecord.name || name;
            department = mRecord.department || department;
            phone = mRecord.phone || phone;
            hasVerifiedIdentitySource = true;
          }
        }
        if (!hasVerifiedIdentitySource && emailLower === 'admin@edumentorx.edu') {
          role = role || 'admin';
          hasVerifiedIdentitySource = true;
        }
      } catch (rosterErr: any) {
        if (String(rosterErr?.message).includes('deactivated')) {
          throw rosterErr;
        }
      }
    }

    // Do not silently treat a Firestore outage as an empty profile for an unverified user
    if (!hasVerifiedIdentitySource && userDocRes.offlineOrTimedOut && !requestedRole) {
      logLoginStage('5_roleAndPasswordCheck', performance.now() - tStage5, 'FAILURE', 'unverified-profile-outage');
      throw new Error('Unable to verify user profile and role due to a database connection error. Please retry.');
    }

    const finalRole: UserRole = role || requestedRole || 'student';
    logLoginStage(
      '5_roleAndPasswordCheck',
      performance.now() - tStage5,
      'SUCCESS',
      `role=${finalRole},mustChangePw=${mustChangePassword}`
    );

    let mentorId: string | undefined = userDocRes.data?.mentorId;
    if (finalRole === 'mentor') {
      try {
        const { dbService } = await import('../serviceFactory');
        const mentors = await dbService.getMentors();
        const mRecord = mentors.find(
          (m) => m.userId === fbUser.uid || m.id === fbUser.uid || (emailLower && m.email.toLowerCase() === emailLower)
        );
        if (mRecord) {
          mentorId = mentorId || mRecord.id;
          if (!name || name === 'User' || name === fbUser.email?.split('@')[0]) name = mRecord.name;
          if (!department || department === 'Institutional Administration') department = mRecord.department;
          if (!phone) phone = mRecord.phone;
        }
      } catch {
        // Fallback
      }
    }

    let studentId: string | undefined =
      tokenResult?.claims?.studentId ||
      userDocRes.data?.studentId ||
      userDocRes.data?.usn;

    if (finalRole === 'student') {
      try {
        const { dbService } = await import('../serviceFactory');
        const stRecord =
          (studentId ? await dbService.getStudentById(studentId) : null) ||
          (await dbService.getStudentById(fbUser.uid)) ||
          (emailLower ? await dbService.getStudentById(emailLower) : null);
        if (stRecord) {
          studentId = studentId || stRecord.id || stRecord.usn;
          if (!name || name === 'User' || name === fbUser.email?.split('@')[0]) name = stRecord.name;
          if (!department || department === 'Institutional Administration') department = stRecord.department;
          if (!phone) phone = stRecord.phone;
        }
      } catch {
        // Fallback
      }
    }

    const canonicalId =
      finalRole === 'mentor' && mentorId
        ? mentorId
        : finalRole === 'student' && studentId
        ? studentId
        : fbUser.uid;

    return {
      id: canonicalId,
      userId: fbUser.uid,
      email: fbUser.email || '',
      name,
      role: finalRole,
      department,
      phone,
      mustChangePassword,
      mentorId: mentorId || (finalRole === 'mentor' ? canonicalId : undefined),
      studentId: studentId || (finalRole === 'student' ? canonicalId : undefined),
      usn: studentId || (finalRole === 'student' ? canonicalId : undefined),
    };
  }
}

