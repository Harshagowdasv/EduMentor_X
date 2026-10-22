import { DemoDatabaseService } from './services/demo/DemoDatabaseService';
import { FirebaseDatabaseService } from './services/firebase/FirebaseDatabaseService';
import { calculateExplainableRisk } from './utils/riskCalculator';
import { Student } from './types';

async function runAdminEnhancementsTestSuite() {
  console.log('====================================================');
  console.log(' EDUMENTORX ADMIN ENHANCEMENTS AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  const demoDb = new DemoDatabaseService();
  const firebaseDb = new FirebaseDatabaseService();
  const actorId = 'admin_tester_1';

  // ----------------------------------------------------
  // TEST 1: ACADEMIC CALENDAR & SINGLE ACTIVE SEMESTER
  // ----------------------------------------------------
  console.log('--- TEST 1: ACADEMIC CALENDAR & SINGLE ACTIVE SEMESTER ---');
  const years = await demoDb.getAcademicYears();
  const semesters = await demoDb.getSemesters();

  console.log(`Academic Years Count: ${years.length}, Semesters Count: ${semesters.length}`);
  if (years.length === 0 || semesters.length === 0) {
    throw new Error('FAILED: Initial Academic Calendar not populated');
  }

  // Create new Academic Year & Semester
  const newYear = await demoDb.createAcademicYear({
    yearName: '2027-2028',
    startDate: '2027-08-01',
    endDate: '2028-06-30',
    isActive: false,
  });

  const newSem = await demoDb.createSemester({
    academicYearId: newYear.id,
    name: 'Semester 7',
    number: 7,
    startDate: '2027-08-01',
    endDate: '2027-12-20',
    isActive: false,
  });

  // Test single active semester enforcement
  await demoDb.setActiveSemester(newSem.id);
  const updatedSems = await demoDb.getSemesters();
  const activeSems = updatedSems.filter((s) => s.isActive);

  if (activeSems.length !== 1 || activeSems[0].id !== newSem.id) {
    throw new Error('FAILED: Single active semester enforcement failed');
  }
  console.log('PASSED: Academic Calendar CRUD & Single Active Semester enforced.\n');

  // Archive semester
  await demoDb.archiveSemester(newSem.id);
  const archivedSems = await demoDb.getSemesters();
  const targetArchived = archivedSems.find((s) => s.id === newSem.id);
  if (!targetArchived || targetArchived.isActive) {
    throw new Error('FAILED: Semester archiving failed');
  }
  console.log('PASSED: Semester Archiving verified.\n');

  // ----------------------------------------------------
  // TEST 2: IA MARKS CSV IMPORT & DUPLICATE DETECTION
  // ----------------------------------------------------
  console.log('--- TEST 2: IA MARKS CSV IMPORT & DUPLICATE DETECTION ---');
  const testStudentUSN = `TEST-IA-${Date.now()}`;
  const testStudent = await demoDb.createStudent({
    usn: testStudentUSN,
    userId: `u_${testStudentUSN}`,
    mentorId: null,
    name: 'IA Test Student',
    email: `ia_test_${Date.now()}@edumentorx.edu`,
    phone: '9888877771',
    parentPhone: '9888877772',
    department: 'Computer Science & Engineering',
    program: 'B.Tech',
    year: '3rd Year',
    semester: 'Semester 6',
    section: 'A',
    admissionYear: '2023',
    cgpa: 7.5,
    attendance: 82,
    financialScore: 5,
    studyHours: 12,
    previousYearBacklogs: 0,
    currentBacklogs: 0,
    academicStatus: 'Active',
  }, actorId);

  // Multiple subjects for one student
  const csvRowsBatch1 = [
    {
      USN: testStudentUSN,
      'Student Name': 'IA Test Student',
      'Academic Year': '2026-2027',
      Semester: 'Semester 6',
      'Subject Code': 'CS601',
      'Subject Name': 'Software Engineering',
      'IA1 Marks': '40',
      'IA2 Marks': '45',
    },
    {
      USN: testStudentUSN,
      'Student Name': 'IA Test Student',
      'Academic Year': '2026-2027',
      Semester: 'Semester 6',
      'Subject Code': 'CS602',
      'Subject Name': 'Compiler Design',
      'IA1 Marks': '18',
      'IA2 Marks': '15',
    },
  ];

  const importResult1 = await demoDb.importIAMarksCSV(csvRowsBatch1, '2026-2027', 'Semester 6', actorId);
  console.log(`Import Batch 1: ${importResult1.importedCount} imported, ${importResult1.updatedCount} updated, ${importResult1.failedCount} errors`);

  if (importResult1.importedCount !== 2 || importResult1.failedCount !== 0) {
    throw new Error('FAILED: IA Marks Batch 1 import failed');
  }

  // Duplicate Subject Import (Re-importing CS601 with updated marks)
  const csvRowsBatch2 = [
    {
      USN: testStudentUSN,
      'Student Name': 'IA Test Student',
      'Academic Year': '2026-2027',
      Semester: 'Semester 6',
      'Subject Code': 'CS601',
      'Subject Name': 'Software Engineering',
      'IA1 Marks': '44',
      'IA2 Marks': '48',
    },
  ];

  const importResult2 = await demoDb.importIAMarksCSV(csvRowsBatch2, '2026-2027', 'Semester 6', actorId);
  console.log(`Import Batch 2 (Duplicate overwrite): ${importResult2.importedCount} imported, ${importResult2.updatedCount} updated`);

  if (importResult2.updatedCount !== 1 || importResult2.importedCount !== 0) {
    throw new Error('FAILED: Duplicate IA Marks re-import did not update existing record');
  }

  // Invalid USN import
  const csvInvalidUSN = [
    {
      USN: 'INVALID-USN-99999',
      'Student Name': 'Ghost Student',
      'Academic Year': '2026-2027',
      Semester: 'Semester 6',
      'Subject Code': 'CS601',
      'Subject Name': 'Software Engineering',
      'IA1 Marks': '40',
      'IA2 Marks': '45',
    },
  ];
  const importResultInvalid = await demoDb.importIAMarksCSV(csvInvalidUSN, '2026-2027', 'Semester 6', actorId);
  if (importResultInvalid.failedCount !== 1) {
    throw new Error('FAILED: Invalid USN was not flagged as error during IA import');
  }
  console.log('PASSED: IA Marks CSV Import, Duplicate Detection, and Invalid USN validation verified.\n');

  // ----------------------------------------------------
  // TEST 3: STUDENT DASHBOARD & STUDENT 360 MARKS ISOLATION
  // ----------------------------------------------------
  console.log('--- TEST 3: STUDENT DASHBOARD & STUDENT 360 MARKS ISOLATION ---');
  const testStudentBUSN = `TEST-IA-B-${Date.now()}`;
  const testStudentB = await demoDb.createStudent({
    usn: testStudentBUSN,
    userId: `u_${testStudentBUSN}`,
    mentorId: null,
    name: 'Student B',
    email: `student_b_${Date.now()}@edumentorx.edu`,
    phone: '9888877773',
    parentPhone: '9888877774',
    department: 'Computer Science & Engineering',
    program: 'B.Tech',
    year: '3rd Year',
    semester: 'Semester 6',
    section: 'B',
    admissionYear: '2023',
    cgpa: 8.2,
    attendance: 90,
    financialScore: 7,
    studyHours: 15,
    previousYearBacklogs: 0,
    currentBacklogs: 0,
    academicStatus: 'Active',
  }, actorId);

  const studentAMarks = await demoDb.getStudentAcademicMarks(testStudent.id);
  const studentBMarks = await demoDb.getStudentAcademicMarks(testStudentB.id);

  console.log(`Student A (${testStudent.usn}) Marks Count: ${studentAMarks.length}`);
  console.log(`Student B (${testStudentB.usn}) Marks Count: ${studentBMarks.length}`);

  if (studentAMarks.length !== 2) {
    throw new Error('FAILED: Student A IA Marks count mismatch');
  }

  if (studentBMarks.length !== 0) {
    throw new Error('FAILED: Security Isolation Breach! Student B retrieved Student A marks.');
  }

  const cs601 = studentAMarks.find((m) => m.subjectCode === 'CS601');
  if (!cs601 || cs601.ia1Marks !== 44 || cs601.ia2Marks !== 48) {
    throw new Error('FAILED: Updated IA marks values for CS601 incorrect');
  }
  console.log('PASSED: Student A sees Student A marks, Student B sees 0 marks (Isolation Verified).\n');

  // ----------------------------------------------------
  // TEST 4: ADMIN EDIT STUDENT & IMMUTABLE USN
  // ----------------------------------------------------
  console.log('--- TEST 4: ADMIN EDIT STUDENT & IMMUTABLE USN ---');
  const updatedStudent = await demoDb.editStudent(testStudent.id, {
    name: 'IA Test Student Edited',
    cgpa: 5.8,
    attendance: 65,
    previousYearBacklogs: 2,
    currentBacklogs: 1,
    usn: 'MUTATED-USN-TRY' as any, // Try mutating USN
  }, actorId);

  if (updatedStudent.usn !== testStudentUSN) {
    throw new Error('FAILED: Student USN was mutated during edit!');
  }
  if (updatedStudent.name !== 'IA Test Student Edited' || updatedStudent.cgpa !== 5.8) {
    throw new Error('FAILED: Edit student fields did not persist');
  }
  if (updatedStudent.riskLevel !== 'HIGH_PRIORITY') {
    throw new Error('FAILED: Edit student did not recalculate risk level dynamically');
  }
  console.log(`PASSED: Admin Edit Student verified. Updated name: ${updatedStudent.name}, New Risk: ${updatedStudent.riskLevel}.\n`);

  // ----------------------------------------------------
  // TEST 5: ADMIN DELETE STUDENT & COMPLIANCE PRESERVATION
  // ----------------------------------------------------
  console.log('--- TEST 5: ADMIN DELETE STUDENT & COMPLIANCE PRESERVATION ---');
  // Assign student to mentor first
  const mentors = await demoDb.getMentors();
  const mentorA = mentors[0];
  await demoDb.allocateStudent(testStudent.id, mentorA.id, actorId, 'Test allocation');

  // Verify mentor has student
  let mentorMentees = await demoDb.getStudentsByMentorId(mentorA.id);
  if (!mentorMentees.some((s) => s.id === testStudent.id)) {
    throw new Error('FAILED: Student allocation before delete failed');
  }

  // Deactivate student
  await demoDb.deleteStudent(testStudent.id, actorId);

  // Check student status
  const deletedStudentDoc = await demoDb.getStudentById(testStudent.id);
  if (!deletedStudentDoc || deletedStudentDoc.academicStatus !== 'Deactivated') {
    throw new Error('FAILED: Student account status was not set to Deactivated');
  }

  // Check active mentor allocation cleared
  mentorMentees = await demoDb.getStudentsByMentorId(mentorA.id);
  if (mentorMentees.some((s) => s.id === testStudent.id)) {
    throw new Error('FAILED: Active mentor allocation was not cleared upon student deactivation');
  }

  // Check audit logs
  const auditLogs = await demoDb.getAuditLogs();
  const deleteLog = auditLogs.find((l) => l.action === 'DELETE_STUDENT' && l.targetId === testStudent.id);
  if (!deleteLog) {
    throw new Error('FAILED: Permanent audit log for delete student was not recorded');
  }
  console.log('PASSED: Admin Delete/Deactivate Student & Compliance Preservation verified.\n');

  // ----------------------------------------------------
  // TEST 6: FIREBASE DATABASE SERVICE CACHE, INVALIDATION & OUTAGE SAFETY
  // ----------------------------------------------------
  console.log('--- TEST 6: FIREBASE DATABASE SERVICE CACHE, INVALIDATION & OUTAGE SAFETY ---');
  const perfMetricsInit = firebaseDb.getPerformanceMetrics();
  if (perfMetricsInit.readTimeoutMs < 2000 || perfMetricsInit.writeTimeoutMs < 2500) {
    throw new Error(`FAILED: Unsafe Firestore timeout configuration (${perfMetricsInit.readTimeoutMs}ms / ${perfMetricsInit.writeTimeoutMs}ms)`);
  }

  // Verify real student records, IA marks, and allocations via FirebaseDatabaseService
  const fbStudentUSN = `FB-VERIFY-${Date.now()}`;
  const fbStudent = await firebaseDb.createStudent({
    usn: fbStudentUSN,
    userId: `u_${fbStudentUSN}`,
    mentorId: null,
    name: 'Firebase Path Student',
    email: `fb_student_${Date.now()}@edumentorx.edu`,
    phone: '9888877779',
    parentPhone: '9888877780',
    department: 'Computer Science & Engineering',
    program: 'B.Tech',
    year: '3rd Year',
    semester: 'Semester 6',
    section: 'A',
    admissionYear: '2023',
    cgpa: 8.4,
    attendance: 88,
    financialScore: 6,
    studyHours: 16,
    previousYearBacklogs: 0,
    currentBacklogs: 0,
    academicStatus: 'Active',
  }, actorId);

  // Warm cache then edit student and verify immediate cache invalidation
  await firebaseDb.getStudentById(fbStudent.id);
  await firebaseDb.editStudent(fbStudent.id, { name: 'Firebase Path Student Updated', cgpa: 9.1 }, actorId);
  const fbFetchedAfterEdit = await firebaseDb.getStudentById(fbStudent.id);
  if (!fbFetchedAfterEdit || fbFetchedAfterEdit.name !== 'Firebase Path Student Updated' || fbFetchedAfterEdit.cgpa !== 9.1) {
    throw new Error('FAILED: FirebaseDatabaseService cache invalidation failed after editStudent');
  }

  // Import IA marks via FirebaseDatabaseService and verify retrieval + invalidation
  await firebaseDb.getStudentAcademicMarks(fbStudent.id); // warm empty cache
  await firebaseDb.importIAMarksCSV([
    {
      USN: fbStudentUSN,
      'Student Name': 'Firebase Path Student Updated',
      'Academic Year': '2026-2027',
      Semester: 'Semester 6',
      'Subject Code': 'CS603',
      'Subject Name': 'Distributed Systems',
      'IA1 Marks': '47',
      'IA2 Marks': '49',
    },
  ], '2026-2027', 'Semester 6', actorId);
  const fbMarksAfterImport = await firebaseDb.getStudentAcademicMarks(fbStudent.id);
  if (fbMarksAfterImport.length !== 1 || fbMarksAfterImport[0].ia1Marks !== 47) {
    throw new Error('FAILED: FirebaseDatabaseService cache invalidation failed after importIAMarksCSV');
  }

  // Verify allocation & invalidation via FirebaseDatabaseService
  await firebaseDb.getStudentsByMentorId(mentorA.id); // warm mentor cache
  await firebaseDb.allocateStudent(fbStudent.id, mentorA.id, actorId, 'FB path allocation');
  const fbMentorMentees = await firebaseDb.getStudentsByMentorId(mentorA.id);
  if (!fbMentorMentees.some((s) => s.id === fbStudent.id)) {
    throw new Error('FAILED: FirebaseDatabaseService cache invalidation failed after allocateStudent');
  }

  // Verify temporary Firestore outage raises clear retryable error when requireFirestore is true
  let outageErrorCaught = false;
  try {
    await firebaseDb.getStudents(1, 50, undefined, { skipCache: true, requireFirestore: true });
  } catch (outageErr: any) {
    if (String(outageErr.message).includes('Database temporarily unavailable')) {
      outageErrorCaught = true;
    }
  }
  if (!outageErrorCaught && firebaseDb.getPerformanceMetrics().lastFirestoreError) {
    throw new Error('FAILED: Outage did not surface clear retryable error when requireFirestore=true');
  }
  console.log('PASSED: FirebaseDatabaseService production path, timeouts, cache invalidation & outage signaling verified.\n');

  console.log('====================================================');
  console.log(' ALL ADMIN ENHANCEMENTS TESTS PASSED 100%');
  console.log('====================================================');
  process.exit(0);
}

runAdminEnhancementsTestSuite().catch((err) => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
