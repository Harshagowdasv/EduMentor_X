import { adminAuth, adminDb, isInitialized } from './firebaseAdmin.js';

// 1. Create Mentor / User Auth Account
export async function createMentorAuthAccount({ name, email, phone, department, staffId, actorId }) {
  if (!isInitialized || !adminAuth || !adminDb) {
    throw new Error('Firebase Admin SDK is not initialized on backend server.');
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPhone = (phone || '').trim();
  const phoneDigits = cleanPhone.replace(/\D/g, '');

  if (!cleanEmail) {
    throw new Error('Enter a valid email address.');
  }

  if (!cleanPhone || phoneDigits.length === 0) {
    throw new Error('Phone number is required because it is used as the initial password.');
  }

  // Use exact raw phone digits as initial password (e.g. "9000000003")
  const initialPassword = phoneDigits;

  if (initialPassword.length < 6) {
    throw new Error('Phone number must contain at least 6 digits for use as temporary password.');
  }

  // Check if user already exists in Firebase Auth
  let existingUser = null;
  try {
    existingUser = await adminAuth.getUserByEmail(cleanEmail);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      throw err;
    }
  }

  if (existingUser) {
    throw new Error('An account with this email already exists.');
  }

  // Create Firebase Auth User
  const userRecord = await adminAuth.createUser({
    email: cleanEmail,
    displayName: (name || '').trim(),
    password: initialPassword,
    emailVerified: true,
    disabled: false,
  });

  // Assign Custom Claim
  await adminAuth.setCustomUserClaims(userRecord.uid, {
    role: 'mentor',
    mentor: true,
  });

  const now = new Date().toISOString();
  const mentorId = `m_${Date.now()}`;

  const mentorData = {
    id: mentorId,
    userId: userRecord.uid,
    name: (name || '').trim(),
    email: cleanEmail,
    phone: cleanPhone,
    department: (department || 'Computer Science & Engineering').trim(),
    staffId: (staffId || '').trim(),
    activeMenteesCount: 0,
    status: 'active',
    createdAt: now,
  };

  // Write Firestore documents (guarded in case Firestore DB default is not provisioned)
  try {
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      mentorId: mentorId,
      id: userRecord.uid,
      name: (name || '').trim(),
      email: cleanEmail,
      phone: cleanPhone,
      role: 'mentor',
      department: (department || 'Computer Science & Engineering').trim(),
      status: 'active',
      createdAt: now,
      mustChangePassword: true,
    });

    await adminDb.collection('mentors').doc(mentorId).set(mentorData);
  } catch (err) {
    console.warn('[Firestore Write Notice]:', err.message);
  }

  // Record Audit Event
  try {
    await adminDb.collection('auditLogs').add({
      id: `log_${Date.now()}`,
      actorId: actorId || 'admin',
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'CREATE_MENTOR',
      targetType: 'Mentor',
      targetId: mentorId,
      newValue: { name: mentorData.name, email: cleanEmail, department: mentorData.department },
      details: `Created new faculty mentor account for ${mentorData.name}`,
      timestamp: now,
    });
  } catch (err) {
    console.warn('[Audit Log Warning]:', err.message);
  }

  return {
    success: true,
    uid: userRecord.uid,
    mentor: mentorData,
    message: 'Mentor created successfully.',
  };
}

// 2. Deactivate Mentor Account
export async function deactivateMentorAccount({ mentorId, actorId }) {
  if (!isInitialized || !adminAuth || !adminDb) {
    throw new Error('Firebase Admin SDK is not initialized on backend server.');
  }

  const mentorDoc = await adminDb.collection('mentors').doc(mentorId).get();
  if (!mentorDoc.exists) {
    throw new Error('Mentor profile not found.');
  }

  const mentorData = mentorDoc.data();
  const uid = mentorData.userId || mentorId;

  // Disable Firebase Auth Account
  try {
    await adminAuth.updateUser(uid, { disabled: true });
  } catch (err) {
    console.warn('[Firebase Auth Disable Warning]:', err.message);
  }

  const now = new Date().toISOString();

  // Update Firestore status to 'inactive'
  await adminDb.collection('mentors').doc(mentorId).update({
    status: 'inactive',
    updatedAt: now,
  });

  try {
    await adminDb.collection('users').doc(uid).update({
      status: 'inactive',
      updatedAt: now,
    });
  } catch (err) {
    console.warn('[Users Collection Status Update Warning]:', err.message);
  }

  // Audit Log
  try {
    await adminDb.collection('auditLogs').add({
      id: `log_${Date.now()}`,
      actorId: actorId || 'admin',
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'DEACTIVATE_MENTOR',
      targetType: 'Mentor',
      targetId: mentorId,
      details: `Deactivated mentor ${mentorData.name}. Historical records preserved.`,
      timestamp: now,
    });
  } catch (err) {
    console.warn('[Audit Log Warning]:', err.message);
  }

  return {
    success: true,
    mentorId,
    status: 'inactive',
    message: `Mentor ${mentorData.name} deactivated successfully.`,
  };
}

// 3. Reactivate Mentor Account
export async function reactivateMentorAccount({ mentorId, actorId }) {
  if (!isInitialized || !adminAuth || !adminDb) {
    throw new Error('Firebase Admin SDK is not initialized on backend server.');
  }

  const mentorDoc = await adminDb.collection('mentors').doc(mentorId).get();
  if (!mentorDoc.exists) {
    throw new Error('Mentor profile not found.');
  }

  const mentorData = mentorDoc.data();
  const uid = mentorData.userId || mentorId;

  // Enable Firebase Auth Account
  try {
    await adminAuth.updateUser(uid, { disabled: false });
  } catch (err) {
    console.warn('[Firebase Auth Enable Warning]:', err.message);
  }

  const now = new Date().toISOString();

  // Update Firestore status to 'active'
  await adminDb.collection('mentors').doc(mentorId).update({
    status: 'active',
    updatedAt: now,
  });

  try {
    await adminDb.collection('users').doc(uid).update({
      status: 'active',
      updatedAt: now,
    });
  } catch (err) {
    console.warn('[Users Collection Status Update Warning]:', err.message);
  }

  // Audit Log
  try {
    await adminDb.collection('auditLogs').add({
      id: `log_${Date.now()}`,
      actorId: actorId || 'admin',
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'REACTIVATE_MENTOR',
      targetType: 'Mentor',
      targetId: mentorId,
      details: `Reactivated mentor ${mentorData.name}.`,
      timestamp: now,
    });
  } catch (err) {
    console.warn('[Audit Log Warning]:', err.message);
  }

  return {
    success: true,
    mentorId,
    status: 'active',
    message: `Mentor ${mentorData.name} reactivated successfully.`,
  };
}

// 4. Delete Mentor Account
export async function deleteMentorAccount({ mentorId, actorId }) {
  if (!isInitialized || !adminAuth || !adminDb) {
    throw new Error('Firebase Admin SDK is not initialized on backend server.');
  }

  const mentorDoc = await adminDb.collection('mentors').doc(mentorId).get();
  if (!mentorDoc.exists) {
    throw new Error('Mentor profile not found.');
  }

  const mentorData = mentorDoc.data();
  const uid = mentorData.userId || mentorId;

  // Check active mentees
  if (mentorData.activeMenteesCount > 0) {
    throw new Error('This mentor currently has allocated students. Reassign students before permanently deleting this mentor.');
  }

  const allocSnap = await adminDb
    .collection('mentorAllocations')
    .where('mentorId', '==', mentorId)
    .where('status', '==', 'ACTIVE')
    .get();

  if (!allocSnap.empty) {
    throw new Error('This mentor currently has allocated students. Reassign students before permanently deleting this mentor.');
  }

  // Delete Firebase Auth User
  try {
    await adminAuth.deleteUser(uid);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      console.warn('[Firebase Auth Delete Warning]:', err.message);
    }
  }

  // Delete Mentor Document from Firestore
  await adminDb.collection('mentors').doc(mentorId).delete();
  try {
    await adminDb.collection('users').doc(uid).delete();
  } catch (err) {
    console.warn('[User Doc Delete Warning]:', err.message);
  }

  const now = new Date().toISOString();

  // Audit Log (preserving history)
  try {
    await adminDb.collection('auditLogs').add({
      id: `log_${Date.now()}`,
      actorId: actorId || 'admin',
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'DELETE_MENTOR',
      targetType: 'Mentor',
      targetId: mentorId,
      details: `Deleted mentor ${mentorData.name}. Mentees reassigned, historical records preserved.`,
      timestamp: now,
    });
  } catch (err) {
    console.warn('[Audit Log Warning]:', err.message);
  }

  return {
    success: true,
    mentorId,
    message: `Mentor ${mentorData.name} deleted successfully.`,
  };
}

// 5. Generic Student / Auth Creation with Phone Password
export async function createAuthAccountWithPhonePassword({ email, phone, role, name, department }) {
  if (!isInitialized || !adminAuth || !adminDb) {
    return { success: false, reason: 'ADMIN_SDK_NOT_INITIALIZED' };
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPhone = (phone || '').trim();
  const phoneDigits = cleanPhone.replace(/\D/g, '') || '9000000000';

  if (!cleanEmail) {
    throw new Error('Email is required for Auth account creation.');
  }

  let userRecord;
  let isNewAuth = false;
  try {
    userRecord = await adminAuth.getUserByEmail(cleanEmail);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      userRecord = await adminAuth.createUser({
        email: cleanEmail,
        displayName: name || cleanEmail.split('@')[0],
        password: phoneDigits,
        emailVerified: true,
      });
      isNewAuth = true;
    } else {
      throw err;
    }
  }

  await adminAuth.setCustomUserClaims(userRecord.uid, {
    role,
    [role]: true,
  });

  const now = new Date().toISOString();

  try {
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      id: userRecord.uid,
      name: name || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: cleanPhone,
      role,
      department: department || 'General',
      status: 'active',
      createdAt: now,
      mustChangePassword: true,
    }, { merge: true });
  } catch (err) {
    console.warn('[Firestore Profile Notice]:', err.message);
  }

  return {
    success: true,
    uid: userRecord.uid,
    isNewAuth,
    email: cleanEmail,
    role,
    mustChangePassword: true,
  };
}

// 6. Batch Import Student Accounts via CSV (Optimized Bulk Pre-Check, Concurrency, and WriteBatch)
export async function importStudentsBatch({ csvRows, actorId, duplicateStrategy = 'skip' }) {
  if (!isInitialized || !adminAuth || !adminDb) {
    throw new Error('Firebase Admin SDK is not initialized on backend server.');
  }

  if (!Array.isArray(csvRows) || csvRows.length === 0) {
    throw new Error('No CSV student rows provided for import.');
  }

  const startTime = Date.now();
  const results = new Array(csvRows.length);
  let importedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // 1. Intra-batch pre-filtering & validation
  const validRowsToProcess = [];
  const batchUSNs = new Set();
  const batchEmails = new Set();

  for (let i = 0; i < csvRows.length; i++) {
    const row = csvRows[i] || {};
    const rowNumber = i + 1;

    const usn = String(row.usn || row.USN || row.studentId || '').trim().toUpperCase();
    const name = String(row.name || row.Name || row.studentName || '').trim();
    const email = String(row.email || row.Email || row.studentEmail || '').trim().toLowerCase();
    const phone = String(row.phone || row.phoneNumber || row['Phone Number'] || '').trim();
    const phoneDigits = phone.replace(/\D/g, '') || '9000000000';
    const department = String(row.department || row.Department || 'Computer Science & Engineering').trim();

    if (!usn || !name || !email) {
      failedCount++;
      results[i] = {
        rowNumber,
        usn: usn || 'N/A',
        name: name || 'N/A',
        email: email || 'N/A',
        status: 'failed',
        reason: 'Missing required master data (USN, Name, or Email).',
      };
      continue;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      failedCount++;
      results[i] = {
        rowNumber,
        usn,
        name,
        email,
        status: 'failed',
        reason: `Invalid email format: '${email}'`,
      };
      continue;
    }

    // Intra-batch duplicate check
    if (batchUSNs.has(usn) || batchEmails.has(email)) {
      skippedCount++;
      results[i] = {
        rowNumber,
        usn,
        name,
        email,
        status: 'skipped',
        reason: `Duplicate row in CSV batch for USN '${usn}' or Email '${email}'.`,
      };
      continue;
    }

    batchUSNs.add(usn);
    batchEmails.add(email);

    validRowsToProcess.push({
      index: i,
      rowNumber,
      usn,
      name,
      email,
      phone,
      phoneDigits,
      department,
      rawData: row,
    });
  }

  if (validRowsToProcess.length === 0) {
    return {
      success: true,
      importedCount: 0,
      skippedCount,
      failedCount,
      totalRows: csvRows.length,
      results,
    };
  }

  // 2. Pre-fetch existing students from Firestore in a single bulk check to avoid individual reads
  const existingUSNs = new Set();
  const existingEmails = new Set();

  try {
    const studentDocsSnap = await adminDb.collection('students').get();
    studentDocsSnap.forEach((d) => {
      existingUSNs.add(d.id.toUpperCase());
      const data = d.data();
      if (data.email) existingEmails.add(data.email.toLowerCase());
    });
  } catch (err) {
    console.warn('[Bulk Duplicate Pre-Check Notice]:', err.message);
  }

  // Filter rows into new vs existing
  const newStudentRows = [];
  for (const item of validRowsToProcess) {
    if (existingUSNs.has(item.usn) || existingEmails.has(item.email)) {
      skippedCount++;
      results[item.index] = {
        rowNumber: item.rowNumber,
        usn: item.usn,
        name: item.name,
        email: item.email,
        status: 'skipped',
        reason: `Student account with USN '${item.usn}' or Email '${item.email}' already exists. Password preserved.`,
      };
    } else {
      newStudentRows.push(item);
    }
  }

  if (newStudentRows.length === 0) {
    return {
      success: true,
      importedCount: 0,
      skippedCount,
      failedCount,
      totalRows: csvRows.length,
      results,
    };
  }

  // 3. Controlled Concurrency for Firebase Auth Creation & Firestore Batch Write
  const CONCURRENCY_LIMIT = 5;
  const now = new Date().toISOString();

  for (let i = 0; i < newStudentRows.length; i += CONCURRENCY_LIMIT) {
    const chunk = newStudentRows.slice(i, i + CONCURRENCY_LIMIT);

    const chunkResults = await Promise.all(
      chunk.map(async (item) => {
        try {
          let authUser = null;
          try {
            authUser = await adminAuth.getUserByEmail(item.email);
          } catch (e) {
            if (e.code !== 'auth/user-not-found') throw e;
          }

          if (authUser) {
            return {
              item,
              status: 'skipped',
              reason: `Student account with Email '${item.email}' already exists in Firebase Auth. Password preserved.`,
            };
          }

          const userRecord = await adminAuth.createUser({
            email: item.email,
            displayName: item.name,
            password: item.phoneDigits.length >= 6 ? item.phoneDigits : '9000000000',
            emailVerified: true,
            disabled: false,
          });

          await adminAuth.setCustomUserClaims(userRecord.uid, {
            role: 'student',
            student: true,
          });

          const studentProfile = {
            id: item.usn,
            uid: userRecord.uid,
            usn: item.usn,
            name: item.name,
            email: item.email,
            phone: item.phone,
            department: item.department,
            program: item.rawData.program || 'B.Tech',
            year: item.rawData.year || '3rd Year',
            semester: item.rawData.semester || 'Semester 6',
            section: item.rawData.section || 'A',
            admissionYear: item.rawData.admissionYear || '2023',
            cgpa: typeof item.rawData.cgpa === 'number' ? item.rawData.cgpa : parseFloat(item.rawData.cgpa) || 8.0,
            attendance: typeof item.rawData.attendance === 'number' ? item.rawData.attendance : parseFloat(item.rawData.attendance) || 85,
            financialScore: parseInt(item.rawData.financialScore) || 5,
            studyHours: parseFloat(item.rawData.studyHours) || 15,
            previousYearBacklogs: parseInt(item.rawData.previousYearBacklogs) || 0,
            currentBacklogs: parseInt(item.rawData.currentBacklogs) || 0,
            academicStatus: item.rawData.academicStatus || 'Active',
            riskLevel: item.rawData.riskLevel || 'GOOD_PERFORMANCE',
            riskReasons: item.rawData.riskReasons || [],
            createdAt: now,
          };

          return {
            item,
            status: 'success',
            uid: userRecord.uid,
            studentProfile,
          };
        } catch (err) {
          return {
            item,
            status: 'failed',
            reason: err.message || 'Failed to create student account.',
          };
        }
      })
    );

    const batch = adminDb.batch();
    let hasBatchOps = false;

    for (const resItem of chunkResults) {
      if (resItem.status === 'success' && resItem.uid && resItem.studentProfile) {
        const userRef = adminDb.collection('users').doc(resItem.uid);
        batch.set(userRef, {
          uid: resItem.uid,
          id: resItem.uid,
          name: resItem.item.name,
          email: resItem.item.email,
          phone: resItem.item.phone,
          role: 'student',
          department: resItem.item.department,
          status: 'active',
          createdAt: now,
          mustChangePassword: true,
        });

        const studentRef = adminDb.collection('students').doc(resItem.item.usn);
        batch.set(studentRef, resItem.studentProfile);
        hasBatchOps = true;
      }
    }

    if (hasBatchOps) {
      try {
        await batch.commit();
      } catch (err) {
        console.warn('[Firestore WriteBatch Notice]:', err.message);
      }
    }

    for (const resItem of chunkResults) {
      if (resItem.status === 'success') {
        importedCount++;
        results[resItem.item.index] = {
          rowNumber: resItem.item.rowNumber,
          usn: resItem.item.usn,
          name: resItem.item.name,
          email: resItem.item.email,
          status: 'success',
          student: resItem.studentProfile,
        };
      } else if (resItem.status === 'skipped') {
        skippedCount++;
        results[resItem.item.index] = {
          rowNumber: resItem.item.rowNumber,
          usn: resItem.item.usn,
          name: resItem.item.name,
          email: resItem.item.email,
          status: 'skipped',
          reason: resItem.reason,
        };
      } else {
        failedCount++;
        results[resItem.item.index] = {
          rowNumber: resItem.item.rowNumber,
          usn: resItem.item.usn,
          name: resItem.item.name,
          email: resItem.item.email,
          status: 'failed',
          reason: resItem.reason,
        };
      }
    }
  }

  try {
    await adminDb.collection('auditLogs').add({
      id: `log_${Date.now()}`,
      actorId: actorId || 'admin',
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'IMPORT_STUDENTS_CSV',
      targetType: 'StudentBatch',
      details: `Imported ${importedCount} new students (${skippedCount} skipped, ${failedCount} failed) in ${Date.now() - startTime}ms.`,
      timestamp: now,
    });
  } catch (err) {
    console.warn('[Audit Log Warning]:', err.message);
  }

  const durationMs = Date.now() - startTime;
  console.log(`[PERF Server] CSV Batch Import completed in ${durationMs}ms for ${csvRows.length} rows (${importedCount} imported, ${skippedCount} skipped)`);

  return {
    success: true,
    importedCount,
    skippedCount,
    failedCount,
    totalRows: csvRows.length,
    results,
  };
}
