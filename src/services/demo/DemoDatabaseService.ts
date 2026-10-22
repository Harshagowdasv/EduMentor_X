import { IDatabaseService } from '../interfaces/IDatabaseService';
import {
  Mentor,
  Student,
  AllocationHistory,
  MentorNote,
  MentorshipConversation,
  AssignedCourse,
  AssignedActivity,
  SharedResource,
  StudentPortfolio,
  AISafetyAlert,
  AdminAuditLog,
  CSVImportResult,
  ExplainableRisk,
  AppNotification,
  UserRole,
  Meeting,
  FollowUpTask,
  StudentGoal,
  Achievement,
  StudyPlan,
  ResumeAnalysis,
  CareerGuidance,
  CSVImportHistoryRecord,
  AcademicYear,
  Semester,
  AcademicCalendarEvent,
  InterventionRecord,
  AIMeetingSummary,
  AIMemoryItem,
  MeetingFeedback,
  StudentTrendStatus,
  StudentAcademicMark,
  IAMarksImportResult
} from '../../types';
import {
  initialMentors,
  initialStudents,
  initialAllocationHistory,
  initialMentorNotes,
  initialConversations,
  initialCourses,
  initialActivities,
  initialSharedResources,
  initialPortfolios,
  initialAISafetyAlerts,
  initialAuditLogs,
  initialMeetings,
  initialTasks,
  initialGoals,
  initialAchievements,
  initialStudyPlans,
  initialResumeAnalyses,
  initialCareerGuidance,
  initialCSVImportHistory,
  initialAcademicYears,
  initialSemesters,
  initialCalendarEvents,
  initialInterventions,
  initialAIMeetingSummaries,
  initialAIMemories,
  initialMeetingFeedback
} from '../seedData';
import { calculateExplainableRisk } from '../../utils/riskCalculator';
import { validateAndMapCSVRow } from '../../utils/csvNormalizer';
import { idbService, STORES } from './indexedDBService';

const KEY_INIT = 'edumentorx_idb_initialized_v4';

export class DemoDatabaseService implements IDatabaseService {
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.ensureIndexedDBInitialized();
  }

  private async ensureIndexedDBInitialized(): Promise<void> {
    const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
    const isInit = isBrowser ? localStorage.getItem(KEY_INIT) : false;
    const existingYears = await idbService.getAll(STORES.ACADEMIC_YEARS);
    if (!isInit || existingYears.length === 0) {
      await idbService.putAll(STORES.MENTORS, initialMentors);
      await idbService.putAll(STORES.STUDENTS, initialStudents);
      await idbService.putAll(STORES.ALLOCATION_HISTORY, initialAllocationHistory);
      await idbService.putAll(STORES.MENTOR_NOTES, initialMentorNotes);
      await idbService.putAll(STORES.CONVERSATIONS, initialConversations);
      await idbService.putAll(STORES.COURSES, initialCourses);
      await idbService.putAll(STORES.ACTIVITIES, initialActivities);
      await idbService.putAll(STORES.RESOURCES, initialSharedResources);
      await idbService.putAll(STORES.SAFETY_ALERTS, initialAISafetyAlerts);
      await idbService.putAll(STORES.AUDIT_LOGS, initialAuditLogs);
      await idbService.putAll(STORES.MEETINGS, initialMeetings);
      await idbService.putAll(STORES.TASKS, initialTasks);
      await idbService.putAll(STORES.GOALS, initialGoals);
      await idbService.putAll(STORES.ACHIEVEMENTS, initialAchievements);
      await idbService.putAll(STORES.STUDY_PLANS, initialStudyPlans);
      await idbService.putAll(STORES.RESUME_ANALYSES, initialResumeAnalyses);
      await idbService.putAll(STORES.CAREER_GUIDANCE, initialCareerGuidance);
      await idbService.putAll(STORES.IMPORT_HISTORY, initialCSVImportHistory);

      await idbService.putAll(STORES.ACADEMIC_YEARS, initialAcademicYears);
      await idbService.putAll(STORES.SEMESTERS, initialSemesters);
      await idbService.putAll(STORES.CALENDAR_EVENTS, initialCalendarEvents);
      await idbService.putAll(STORES.INTERVENTIONS, initialInterventions);
      await idbService.putAll(STORES.AI_MEETING_SUMMARIES, initialAIMeetingSummaries);
      await idbService.putAll(STORES.AI_MEMORIES, initialAIMemories);
      await idbService.putAll(STORES.MEETING_FEEDBACK, initialMeetingFeedback);

      const portList = Object.keys(initialPortfolios).map((k) => ({
        id: k,
        ...initialPortfolios[k],
      }));
      await idbService.putAll(STORES.PORTFOLIOS, portList);

      const initialNotif: AppNotification = {
        id: 'notif_init_1',
        recipientUserId: 'u_m1',
        recipientRole: 'mentor',
        title: '🔴 New AI Safety Alert',
        message: 'Student Marcus Vance (1CS21CS042) flagged for HIGH_CONCERN safety review.',
        type: 'safety_alert',
        severity: 'HIGH_CONCERN',
        linkSection: 'safety-alerts',
        read: false,
        timestamp: new Date().toISOString(),
      };
      await idbService.put(STORES.NOTIFICATIONS, initialNotif);

      if (isBrowser) localStorage.setItem(KEY_INIT, 'true');
    }
  }

  async resetDemoData(): Promise<void> {
    await idbService.clearAllStores();
    localStorage.removeItem(KEY_INIT);
    await this.ensureIndexedDBInitialized();
  }

  // Mentors
  async getMentors(): Promise<Mentor[]> {
    await this.initPromise;
    return idbService.getAll<Mentor>(STORES.MENTORS);
  }

  async getMentorById(id: string): Promise<Mentor | null> {
    await this.initPromise;
    const direct = await idbService.getById<Mentor>(STORES.MENTORS, id);
    if (direct) return direct;
    const mentors = await this.getMentors();
    return mentors.find((m) => m.id === id || m.userId === id) || null;
  }

  async createMentor(
    mentorData: Omit<Mentor, 'id' | 'createdAt' | 'activeMenteesCount' | 'status'>,
    actorId: string
  ): Promise<Mentor> {
    await this.initPromise;
    const newId = `m_${Date.now()}`;
    const newMentor: Mentor = {
      ...mentorData,
      id: newId,
      userId: `u_${newId}`,
      activeMenteesCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await idbService.put(STORES.MENTORS, newMentor);

    await this.logAuditEvent({
      actorId,
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'CREATE_MENTOR',
      targetType: 'Mentor',
      targetId: newMentor.id,
      newValue: { name: newMentor.name, email: newMentor.email, department: newMentor.department },
      details: `Created new faculty mentor account for ${newMentor.name}`,
    });

    return newMentor;
  }

  async putMentor(mentor: Mentor): Promise<void> {
    await this.initPromise;
    await idbService.put(STORES.MENTORS, mentor);
  }

  async updateMentor(id: string, updates: Partial<Mentor>, actorId: string): Promise<Mentor> {
    await this.initPromise;
    const current = await idbService.getById<Mentor>(STORES.MENTORS, id);
    if (!current) throw new Error('Mentor not found');

    const updated = { ...current, ...updates };
    await idbService.put(STORES.MENTORS, updated);

    await this.logAuditEvent({
      actorId,
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'UPDATE_MENTOR',
      targetType: 'Mentor',
      targetId: id,
      previousValue: current,
      newValue: updates,
      details: `Updated details for mentor ${updated.name}`,
    });

    return updated;
  }

  async deactivateMentor(id: string, actorId: string): Promise<void> {
    await this.updateMentor(id, { status: 'inactive' }, actorId);
  }

  async reactivateMentor(id: string, actorId: string): Promise<void> {
    await this.updateMentor(id, { status: 'active' }, actorId);
  }

  async deleteMentor(id: string, actorId: string): Promise<void> {
    await this.initPromise;
    const mentor = await this.getMentorById(id);
    if (!mentor) throw new Error('Mentor not found');

    if (mentor.activeMenteesCount > 0) {
      throw new Error('This mentor currently has allocated students. Reassign students before permanently deleting this mentor.');
    }

    await idbService.delete(STORES.MENTORS, id);
    await this.logAuditEvent({
      actorId,
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'DELETE_MENTOR',
      targetType: 'Mentor',
      targetId: id,
      details: `Deleted mentor ${mentor.name}. Historical records preserved.`,
    });
  }

  // Students
  async getStudents(
    page = 1,
    limit = 100,
    filters?: { department?: string; riskLevel?: string; search?: string; mentorId?: string }
  ): Promise<{ students: Student[]; total: number }> {
    await this.initPromise;
    let students = await idbService.getAll<Student>(STORES.STUDENTS);

    if (filters?.department) {
      students = students.filter((s) => s.department === filters.department);
    }
    if (filters?.riskLevel) {
      students = students.filter((s) => s.riskLevel === filters.riskLevel);
    }
    if (filters?.mentorId) {
      if (filters.mentorId === 'unallocated') {
        students = students.filter((s) => !s.mentorId);
      } else {
        students = students.filter((s) => s.mentorId === filters.mentorId);
      }
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      students = students.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.usn.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q)
      );
    }

    const total = students.length;
    const start = (page - 1) * limit;
    const paginated = students.slice(start, start + limit);
    return { students: paginated, total };
  }

  async getStudentById(id: string): Promise<Student | null> {
    await this.initPromise;
    const direct = await idbService.getById<Student>(STORES.STUDENTS, id);
    if (direct) return direct;
    const students = await idbService.getAll<Student>(STORES.STUDENTS);
    const lowerId = id.toLowerCase();
    return (
      students.find(
        (s) =>
          s.id === id ||
          s.userId === id ||
          s.usn === id ||
          (s.email && s.email.toLowerCase() === lowerId)
      ) || null
    );
  }

  async getStudentsByMentorId(mentorId: string): Promise<Student[]> {
    await this.initPromise;
    const [mentors, students] = await Promise.all([
      this.getMentors(),
      idbService.getAll<Student>(STORES.STUDENTS),
    ]);
    const targetMentor = mentors.find(
      (m) => m.id === mentorId || m.userId === mentorId || m.email.toLowerCase() === mentorId.toLowerCase()
    );
    const canonicalMentorId = targetMentor ? targetMentor.id : mentorId;
    return students.filter(
      (s) =>
        s.mentorId === canonicalMentorId ||
        (targetMentor && (s.mentorId === targetMentor.userId || s.mentorEmail === targetMentor.email))
    );
  }

  async putStudent(student: Student): Promise<void> {
    await this.initPromise;
    await idbService.put(STORES.STUDENTS, student);
    await this.recalculateMentorMenteeCounts();
  }

  async putStudentsBatch(students: Student[]): Promise<void> {
    if (students.length === 0) return;
    await this.initPromise;
    await idbService.putAll(STORES.STUDENTS, students);
    await this.recalculateMentorMenteeCounts();
  }

  async createStudent(
    studentData: Omit<Student, 'id' | 'createdAt' | 'riskLevel' | 'riskReasons'>,
    actorId: string
  ): Promise<Student> {
    await this.initPromise;
    const newId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const riskEval = calculateExplainableRisk(studentData);

    let mentorName = studentData.mentorName;
    if (studentData.mentorId && !mentorName) {
      const mentors = await this.getMentors();
      const m = mentors.find((x) => x.id === studentData.mentorId);
      if (m) mentorName = m.name;
    }

    const newStudent: Student = {
      ...studentData,
      id: newId,
      userId: `u_${newId}`,
      mentorName,
      riskLevel: riskEval.status,
      riskReasons: riskEval.reasons,
      createdAt: new Date().toISOString(),
    };

    await idbService.put(STORES.STUDENTS, newStudent);
    await this.recalculateMentorMenteeCounts();

    await this.logAuditEvent({
      actorId,
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'CREATE_STUDENT',
      targetType: 'Student',
      targetId: newStudent.id,
      newValue: { usn: newStudent.usn, name: newStudent.name, mentorId: newStudent.mentorId },
      details: `Created new student record ${newStudent.name} (${newStudent.usn})`,
    });

    return newStudent;
  }

  async updateStudent(id: string, updates: Partial<Student>, actorId: string): Promise<Student> {
    await this.initPromise;
    const current = await idbService.getById<Student>(STORES.STUDENTS, id);
    if (!current) throw new Error('Student not found');

    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    const riskEval = calculateExplainableRisk(merged);
    merged.riskLevel = riskEval.status;
    merged.riskReasons = riskEval.reasons;

    await idbService.put(STORES.STUDENTS, merged);
    await this.recalculateMentorMenteeCounts();

    await this.logAuditEvent({
      actorId,
      actorName: 'User',
      actorRole: 'admin',
      action: 'UPDATE_STUDENT',
      targetType: 'Student',
      targetId: id,
      previousValue: current,
      newValue: updates,
      details: `Updated student record for ${merged.name}`,
    });

    return merged;
  }

  // CRITICAL BUG-FIXED CSV IMPORT PIPELINE WITH PERSISTENT IDB WRITE
  async importStudentsCSV(
    csvRows: Record<string, any>[],
    actorId: string,
    duplicateStrategy: 'skip' | 'update' | 'cancel' = 'skip'
  ): Promise<CSVImportResult> {
    await this.initPromise;
    const mentors = await this.getMentors();
    const existingStudentsList = await idbService.getAll<Student>(STORES.STUDENTS);
    const existingStudentsMap = new Map<string, Student>();
    existingStudentsList.forEach((s) => existingStudentsMap.set(s.usn.trim().toUpperCase(), s));

    const importedStudents: Student[] = [];
    const errors: CSVImportResult['errors'] = [];
    let successfulCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let duplicateCount = 0;
    let mentorAllocationErrorCount = 0;

    await this.logAuditEvent({
      actorId,
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'CSV_IMPORT_STARTED',
      targetType: 'CSVImport',
      targetId: `csv_${Date.now()}`,
      details: `Started processing ${csvRows.length} CSV student rows.`,
    });

    for (let index = 0; index < csvRows.length; index++) {
      const rawRow = csvRows[index];
      const rowNum = index + 1;

      const validation = validateAndMapCSVRow(
        rawRow,
        rowNum,
        mentors,
        new Set(existingStudentsMap.keys())
      );

      if (!validation.isValid || !validation.normalizedStudent) {
        errors.push({
          rowNumber: rowNum,
          usn: validation.usn,
          name: validation.name,
          errorType: 'VALIDATION_FAILURE',
          reason: validation.errors.join(' | ') || 'Invalid student payload',
          suggestedFix: 'Provide required non-empty USN, Name, and Email fields.',
          rawData: rawRow,
        });
        continue;
      }

      const normSt = validation.normalizedStudent;
      const usnUpper = validation.usn;
      const existingStudent = existingStudentsMap.get(usnUpper);

      if (existingStudent) {
        duplicateCount++;
        if (duplicateStrategy === 'skip') {
          skippedCount++;
          await this.logAuditEvent({
            actorId,
            actorName: 'Admin User',
            actorRole: 'admin',
            action: 'STUDENT_SKIPPED_FROM_CSV',
            targetType: 'Student',
            targetId: existingStudent.id,
            details: `Skipped duplicate student USN ${usnUpper}`,
          });
          continue;
        } else if (duplicateStrategy === 'update') {
          const updatedStudent = await this.updateStudent(
            existingStudent.id,
            {
              ...normSt,
              usn: usnUpper,
              mentorId: normSt.mentorId !== undefined ? normSt.mentorId : existingStudent.mentorId,
              mentorName: normSt.mentorName || existingStudent.mentorName,
            },
            actorId
          );
          updatedCount++;
          importedStudents.push(updatedStudent);

          await this.logAuditEvent({
            actorId,
            actorName: 'Admin User',
            actorRole: 'admin',
            action: 'STUDENT_UPDATED_FROM_CSV',
            targetType: 'Student',
            targetId: updatedStudent.id,
            newValue: { usn: usnUpper, name: updatedStudent.name },
            details: `Updated existing student record ${updatedStudent.name} (${usnUpper}) via CSV import`,
          });
          continue;
        } else if (duplicateStrategy === 'cancel') {
          errors.push({
            rowNumber: rowNum,
            usn: usnUpper,
            name: normSt.name,
            errorType: 'DUPLICATE_CANCEL',
            reason: `Import cancelled due to duplicate USN ${usnUpper}`,
            suggestedFix: 'Choose "Skip" or "Update" strategy.',
            rawData: rawRow,
          });
          break;
        }
      }

      // Create New Student Record
      const newId = `s_csv_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}`;
      const riskEval = calculateExplainableRisk(normSt);

      const finalStudent: Student = {
        id: newId,
        userId: `u_${newId}`,
        usn: usnUpper,
        name: String(normSt.name || '').trim(),
        email: String(normSt.email || '').trim(),
        phone: String(normSt.phone || '').trim(),
        parentPhone: String(normSt.parentPhone || '').trim(),
        dateOfBirth: normSt.dateOfBirth,
        gender: normSt.gender,
        bloodGroup: normSt.bloodGroup,
        address: normSt.address,
        city: normSt.city,
        state: normSt.state,
        pincode: normSt.pincode,
        department: String(normSt.department || 'Computer Science & Engineering').trim(),
        program: normSt.program || 'B.Tech',
        year: normSt.year || '3rd Year',
        semester: normSt.semester || 'Semester 6',
        section: normSt.section || 'A',
        admissionYear: normSt.admissionYear || '2023',
        emergencyContactName: normSt.emergencyContactName,
        emergencyContactPhone: normSt.emergencyContactPhone,
        emergencyContactRelationship: normSt.emergencyContactRelationship,
        mentorId: normSt.mentorId || null,
        mentorName: normSt.mentorName,
        mentorEmail: normSt.mentorEmail,
        cgpa: normSt.cgpa || 0,
        attendance: normSt.attendance || 0,
        financialScore: normSt.financialScore || 5,
        studyHours: normSt.studyHours || 0,
        previousYearBacklogs: normSt.previousYearBacklogs || 0,
        currentBacklogs: normSt.currentBacklogs || 0,
        academicStatus: normSt.academicStatus || 'Active',
        careerGoal: normSt.careerGoal,
        skills: normSt.skills,
        github: normSt.github,
        leetcode: normSt.leetcode,
        hackerrank: normSt.hackerrank,
        codechef: normSt.codechef,
        linkedin: normSt.linkedin,
        resumeUrl: normSt.resumeUrl,
        riskLevel: riskEval.status,
        riskReasons: riskEval.reasons,
        createdAt: new Date().toISOString(),
      };

      // Persistent Database Write
      await idbService.put(STORES.STUDENTS, finalStudent);
      importedStudents.push(finalStudent);
      existingStudentsMap.set(usnUpper, finalStudent);
      successfulCount++;

      await this.logAuditEvent({
        actorId,
        actorName: 'Admin User',
        actorRole: 'admin',
        action: 'STUDENT_CREATED_FROM_CSV',
        targetType: 'Student',
        targetId: finalStudent.id,
        newValue: { usn: finalStudent.usn, name: finalStudent.name, mentorId: finalStudent.mentorId },
        details: `Imported and persisted new student ${finalStudent.name} (${finalStudent.usn})`,
      });

      if (finalStudent.mentorId) {
        await this.logAuditEvent({
          actorId,
          actorName: 'Admin User',
          actorRole: 'admin',
          action: 'MENTOR_ALLOCATION_FROM_CSV',
          targetType: 'Allocation',
          targetId: finalStudent.id,
          newValue: { mentorId: finalStudent.mentorId, mentorName: finalStudent.mentorName },
          details: `Auto-allocated ${finalStudent.name} to mentor ${finalStudent.mentorName} from CSV`,
        });
      } else if (normSt.mentorEmail) {
        mentorAllocationErrorCount++;
      }
    }

    await this.recalculateMentorMenteeCounts();

    await this.logAuditEvent({
      actorId,
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'CSV_IMPORT_COMPLETED',
      targetType: 'CSVImport',
      targetId: `csv_${Date.now()}`,
      newValue: { successfulCount, updatedCount, skippedCount, errorsCount: errors.length },
      details: `Completed CSV import: ${successfulCount} created, ${updatedCount} updated, ${skippedCount} skipped, ${errors.length} errors`,
    });

    await this.logCSVImportHistory({
      filename: `Import_${Date.now()}.csv`,
      uploadedBy: 'Admin User',
      totalRecords: csvRows.length,
      successfulCount,
      updatedCount,
      skippedCount,
      failedCount: errors.length,
      status: errors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
    });

    return {
      totalRows: csvRows.length,
      successfulCount,
      updatedCount,
      skippedCount,
      failedCount: errors.length,
      duplicateCount,
      mentorAllocationErrorCount,
      errors,
      importedStudents,
    };
  }

  // Allocation Manager
  async allocateStudent(studentId: string, newMentorId: string, changedBy: string, reason?: string): Promise<void> {
    await this.initPromise;
    const student = await idbService.getById<Student>(STORES.STUDENTS, studentId);
    if (!student) throw new Error('Student not found');

    let newMentor: Mentor | undefined;
    if (newMentorId) {
      const mentors = await this.getMentors();
      newMentor = mentors.find((m) => m.id === newMentorId);
      if (!newMentor) throw new Error('Target mentor not found');
    }

    const prevMentorId = student.mentorId;
    const prevMentorName = student.mentorName || 'Unallocated';

    student.mentorId = newMentor ? newMentor.id : null;
    student.mentorName = newMentor ? newMentor.name : undefined;
    student.mentorEmail = newMentor ? newMentor.email : undefined;

    await idbService.put(STORES.STUDENTS, student);

    const newHistoryRecord: AllocationHistory = {
      id: `alloc_${Date.now()}`,
      studentId: student.id,
      studentUsn: student.usn,
      studentName: student.name,
      previousMentorId: prevMentorId,
      previousMentorName: prevMentorName,
      newMentorId: newMentor ? newMentor.id : 'unallocated',
      newMentorName: newMentor ? newMentor.name : 'Unallocated',
      changedBy,
      timestamp: new Date().toISOString(),
      reason: reason || 'Administrative reallocation',
    };
    await idbService.put(STORES.ALLOCATION_HISTORY, newHistoryRecord);

    await this.recalculateMentorMenteeCounts();

    await this.logAuditEvent({
      actorId: changedBy,
      actorName: changedBy,
      actorRole: 'admin',
      action: 'REASSIGN_STUDENT',
      targetType: 'Allocation',
      targetId: student.id,
      previousValue: { mentorId: prevMentorId, mentorName: prevMentorName },
      newValue: { mentorId: newMentor?.id, mentorName: newMentor?.name },
      details: `Reassigned ${student.name} (${student.usn}) from ${prevMentorName} to ${newMentor?.name || 'Unallocated'}`,
    });

    if (newMentor) {
      await this.createNotification({
        recipientUserId: newMentor.id,
        recipientRole: 'mentor',
        title: 'Student Allocation Update',
        message: `Student ${student.name} (${student.usn}) allocated to your mentee portfolio.`,
        type: 'allocation',
        category: 'MENTOR',
        linkSection: 'overview',
      });
    }
  }

  async bulkAllocateStudents(
    studentIds: string[],
    newMentorId: string,
    changedBy: string,
    options?: { reassignAll?: boolean; reason?: string }
  ): Promise<{ allocatedCount: number; skippedCount: number; failedCount: number }> {
    await this.initPromise;
    const [mentors, students] = await Promise.all([
      this.getMentors(),
      idbService.getAll<Student>(STORES.STUDENTS),
    ]);
    const targetMentor = mentors.find((m) => m.id === newMentorId);
    if (!targetMentor) throw new Error('Target mentor not found');

    const studentIdSet = new Set(studentIds);
    const targetStudents = students.filter((s) => studentIdSet.has(s.id));

    let allocatedCount = 0;
    let skippedCount = 0;
    const failedCount = 0;

    const previousMentorIds: string[] = [];
    const studentsToUpdate: Student[] = [];
    const historyToWrite: AllocationHistory[] = [];
    const nowIso = new Date().toISOString();

    for (const student of targetStudents) {
      if (student.mentorId === newMentorId) {
        skippedCount++;
        continue;
      }

      const prevMentorId = student.mentorId;
      const prevMentorName = student.mentorName || 'Unallocated';
      if (prevMentorId) previousMentorIds.push(prevMentorId);

      student.mentorId = targetMentor.id;
      student.mentorName = targetMentor.name;
      student.mentorEmail = targetMentor.email;

      studentsToUpdate.push(student);

      historyToWrite.push({
        id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        studentId: student.id,
        studentUsn: student.usn,
        studentName: student.name,
        previousMentorId: prevMentorId,
        previousMentorName: prevMentorName,
        newMentorId: targetMentor.id,
        newMentorName: targetMentor.name,
        changedBy,
        timestamp: nowIso,
        reason: options?.reason || 'Batch Administrative Mentor Mapping',
      });
      allocatedCount++;
    }

    if (studentsToUpdate.length > 0) {
      await Promise.all([
        idbService.putAll(STORES.STUDENTS, studentsToUpdate),
        idbService.putAll(STORES.ALLOCATION_HISTORY, historyToWrite),
      ]);
      await this.recalculateMentorMenteeCounts();
    }

    await this.logAuditEvent({
      actorId: changedBy,
      actorName: 'Admin User',
      actorRole: 'admin',
      action: previousMentorIds.length > 0 ? 'REASSIGN_STUDENT' : ('ALLOCATE_STUDENT' as any),
      targetType: 'Allocation',
      targetId: targetMentor.id,
      newValue: { allocatedCount, skippedCount, targetMentorId: targetMentor.id, targetMentorName: targetMentor.name },
      details: `Batch allocated ${allocatedCount} students to mentor ${targetMentor.name} (Skipped ${skippedCount})`,
    });

    if (allocatedCount > 0) {
      await this.createNotification({
        recipientUserId: targetMentor.id,
        recipientRole: 'mentor',
        title: 'New Mentees Assigned',
        message: `You have been assigned ${allocatedCount} new students to your mentee portfolio.`,
        type: 'allocation',
        category: 'MENTOR',
        linkSection: 'overview',
      });
    }

    return { allocatedCount, skippedCount, failedCount };
  }

  async getAllocationHistory(studentId?: string): Promise<AllocationHistory[]> {
    await this.initPromise;
    const history = await idbService.getAll<AllocationHistory>(STORES.ALLOCATION_HISTORY);
    if (studentId) {
      return history.filter((h) => h.studentId === studentId);
    }
    return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  calculateExplainableRisk(student: Partial<Student>): ExplainableRisk {
    return calculateExplainableRisk(student);
  }

  evaluateStudentTrend(student: Student): StudentTrendStatus {
    if (student.riskLevel === 'HIGH_PRIORITY' || student.attendance < 65 || student.cgpa < 6.0) {
      return 'SIGNIFICANT_DECLINE';
    }
    if (student.riskLevel === 'NEEDS_MONITORING' || student.attendance < 75) {
      return 'DECLINING';
    }
    if (student.cgpa >= 8.5 && student.attendance >= 90) {
      return 'IMPROVING';
    }
    return 'STABLE';
  }

  // Mentor Notes
  async getMentorNotes(studentId: string): Promise<MentorNote[]> {
    await this.initPromise;
    const notes = await idbService.getAll<MentorNote>(STORES.MENTOR_NOTES);
    return notes
      .filter((n) => n.studentId === studentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async addMentorNote(noteData: Omit<MentorNote, 'id' | 'timestamp'>): Promise<MentorNote> {
    await this.initPromise;
    const newNote: MentorNote = {
      ...noteData,
      id: `n_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    await idbService.put(STORES.MENTOR_NOTES, newNote);
    return newNote;
  }

  // Conversations
  async getConversation(studentId: string, mentorId: string): Promise<MentorshipConversation | null> {
    await this.initPromise;
    const convs = await idbService.getAll<MentorshipConversation>(STORES.CONVERSATIONS);
    return convs.find((c) => c.studentId === studentId && c.mentorId === mentorId) || null;
  }

  async sendMessageToConversation(
    studentId: string,
    mentorId: string,
    senderRole: 'mentor' | 'student',
    text: string,
    senderName: string
  ): Promise<MentorshipConversation> {
    await this.initPromise;
    const convs = await idbService.getAll<MentorshipConversation>(STORES.CONVERSATIONS);
    let conv = convs.find((c) => c.studentId === studentId && c.mentorId === mentorId);

    const newMsg = {
      id: `msg_${Date.now()}`,
      senderRole,
      senderName,
      text,
      timestamp: new Date().toISOString(),
    };

    if (!conv) {
      conv = {
        id: `conv_${Date.now()}`,
        studentId,
        mentorId,
        messages: [newMsg],
        updatedAt: new Date().toISOString(),
      };
    } else {
      conv.messages.push(newMsg);
      conv.updatedAt = new Date().toISOString();
    }

    await idbService.put(STORES.CONVERSATIONS, conv);
    return conv;
  }

  // Courses & Activities
  async getAssignedCourses(studentId: string): Promise<AssignedCourse[]> {
    await this.initPromise;
    const courses = await idbService.getAll<AssignedCourse>(STORES.COURSES);
    return courses.filter((c) => c.studentId === studentId);
  }

  async assignCourse(courseData: Omit<AssignedCourse, 'id' | 'assignedDate'>): Promise<AssignedCourse> {
    await this.initPromise;
    const newCourse: AssignedCourse = {
      ...courseData,
      id: `course_${Date.now()}`,
      assignedDate: new Date().toISOString(),
    };
    await idbService.put(STORES.COURSES, newCourse);

    const student = await this.getStudentById(courseData.studentId);
    if (student) {
      await this.createNotification({
        recipientUserId: student.userId,
        recipientRole: 'student',
        title: 'New Course Assigned',
        message: `Your mentor assigned: "${courseData.title}"`,
        type: 'course',
        category: 'COURSE',
        linkSection: 'timeline',
      });
    }

    return newCourse;
  }

  async updateCourseProgress(courseId: string, completionPercentage: number, completedActivities: number): Promise<AssignedCourse> {
    await this.initPromise;
    const course = await idbService.getById<AssignedCourse>(STORES.COURSES, courseId);
    if (!course) throw new Error('Course not found');

    course.completionPercentage = completionPercentage;
    course.completedActivitiesCount = completedActivities;
    if (completionPercentage >= 100) {
      course.status = 'completed';
      await this.unlockAchievement(
        course.studentId,
        'course_completed',
        '📚 Course Completed',
        `Finished course "${course.title}" with 100% completion score.`,
        '📚'
      );
    } else {
      course.status = 'in_progress';
    }

    await idbService.put(STORES.COURSES, course);
    return course;
  }

  async getAssignedActivities(studentId: string): Promise<AssignedActivity[]> {
    await this.initPromise;
    const activities = await idbService.getAll<AssignedActivity>(STORES.ACTIVITIES);
    return activities.filter((a) => a.studentId === studentId);
  }

  async assignActivity(activityData: Omit<AssignedActivity, 'id' | 'assignedDate'>): Promise<AssignedActivity> {
    await this.initPromise;
    const newActivity: AssignedActivity = {
      ...activityData,
      id: `act_${Date.now()}`,
      assignedDate: new Date().toISOString(),
    };
    await idbService.put(STORES.ACTIVITIES, newActivity);
    return newActivity;
  }

  // Resources
  async getSharedResources(department?: string, studentId?: string): Promise<SharedResource[]> {
    await this.initPromise;
    const resources = await idbService.getAll<SharedResource>(STORES.RESOURCES);
    return resources.filter((r) => {
      if (studentId && r.studentId === studentId) return true;
      if (department && r.department === department) return true;
      if (!r.studentId && !r.department) return true;
      return false;
    });
  }

  async shareResource(resourceData: Omit<SharedResource, 'id' | 'timestamp'>, actorId: string): Promise<SharedResource> {
    await this.initPromise;
    const newRes: SharedResource = {
      ...resourceData,
      id: `res_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    await idbService.put(STORES.RESOURCES, newRes);

    await this.logAuditEvent({
      actorId,
      actorName: resourceData.sharedByMentorName,
      actorRole: 'mentor',
      action: 'UPLOAD_RESOURCE',
      targetType: 'Resource',
      targetId: newRes.id,
      newValue: { title: newRes.title, fileType: newRes.fileType },
      details: `Shared study resource "${newRes.title}"`,
    });

    if (resourceData.studentId) {
      const student = await this.getStudentById(resourceData.studentId);
      if (student) {
        await this.createNotification({
          recipientUserId: student.userId,
          recipientRole: 'student',
          title: 'New Study Resource Shared',
          message: `Resource "${newRes.title}" shared by your mentor.`,
          type: 'resource',
          category: 'RESOURCE',
          linkSection: 'timeline',
        });
      }
    }

    return newRes;
  }

  // Career Portfolio
  async getStudentPortfolio(studentId: string): Promise<StudentPortfolio> {
    await this.initPromise;
    const port = await idbService.getById<any>(STORES.PORTFOLIOS, studentId);
    if (port) {
      return port;
    }
    const empty: StudentPortfolio = {
      studentId,
      extracurriculars: [],
      certificates: [],
      projects: [],
      codingProfiles: {},
      profileCompleteness: 20,
      missingSuggestions: ['Add technical projects', 'Upload certifications', 'Link GitHub / coding handles'],
    };
    await idbService.put(STORES.PORTFOLIOS, { id: studentId, ...empty });
    return empty;
  }

  async updateStudentPortfolio(studentId: string, updates: Partial<StudentPortfolio>): Promise<StudentPortfolio> {
    await this.initPromise;
    const current = await this.getStudentPortfolio(studentId);
    const updated = { ...current, ...updates };

    let score = 20;
    const missing: string[] = [];

    if (updated.projects && updated.projects.length > 0) score += 25;
    else missing.push('Add at least 1 technical project');

    if (updated.certificates && updated.certificates.length > 0) score += 20;
    else missing.push('Upload a certification');

    if (updated.resumeUrl) score += 20;
    else missing.push('Upload your current Resume');

    if (updated.codingProfiles && (updated.codingProfiles.github || updated.codingProfiles.leetcode)) score += 15;
    else missing.push('Link your GitHub or LeetCode profile');

    updated.profileCompleteness = Math.min(100, score);
    updated.missingSuggestions = missing;

    if (updated.profileCompleteness >= 80) {
      await this.unlockAchievement(
        studentId,
        'portfolio_complete',
        '🏆 Portfolio Master',
        'Achieved 80%+ Career Portfolio completeness score.',
        '🏆'
      );
    }

    await idbService.put(STORES.PORTFOLIOS, { id: studentId, ...updated });
    return updated;
  }

  // AI Safety Alerts
  async getAISafetyAlerts(mentorId?: string): Promise<AISafetyAlert[]> {
    await this.initPromise;
    const alerts = await idbService.getAll<AISafetyAlert>(STORES.SAFETY_ALERTS);
    if (mentorId) {
      return alerts.filter((a) => a.mentorId === mentorId);
    }
    return alerts;
  }

  async createAISafetyAlert(
    alertData: Omit<AISafetyAlert, 'id' | 'timestamp' | 'status'>,
    actorId = 'ai_system'
  ): Promise<AISafetyAlert> {
    await this.initPromise;
    const alertId = `alert_${Date.now()}`;
    const newAlert: AISafetyAlert = {
      ...alertData,
      id: alertId,
      status: 'NEW',
      timestamp: new Date().toISOString(),
    };

    await idbService.put(STORES.SAFETY_ALERTS, newAlert);

    const mentors = await this.getMentors();
    const targetMentor = mentors.find((m) => m.id === newAlert.mentorId);
    if (targetMentor) {
      await this.createNotification({
        recipientUserId: targetMentor.id,
        recipientRole: 'mentor',
        title: `🔴 New ${newAlert.severity} Safety Alert`,
        message: `Student ${newAlert.studentName} (${newAlert.studentUsn}) requires safety review.`,
        type: 'safety_alert',
        category: 'SAFETY',
        severity: newAlert.severity,
        linkSection: 'safety-alerts',
      });
    }

    const auditLog = await this.logAuditEvent({
      actorId,
      actorName: 'Contextual AI Safety Engine',
      actorRole: 'student',
      action: 'VIEW_SAFETY_ALERT',
      targetType: 'SafetyAlert',
      targetId: alertId,
      newValue: { severity: newAlert.severity, studentId: newAlert.studentId },
      details: `Generated ${newAlert.severity} safety alert for student ${newAlert.studentName}`,
    });

    newAlert.auditLogId = auditLog.id;
    return newAlert;
  }

  async updateAISafetyAlertStatus(
    alertId: string,
    status: AISafetyAlert['status'],
    reviewerNotes: string,
    actorId: string
  ): Promise<AISafetyAlert> {
    await this.initPromise;
    const alert = await idbService.getById<AISafetyAlert>(STORES.SAFETY_ALERTS, alertId);
    if (!alert) throw new Error('Safety alert not found');

    const prevStatus = alert.status;
    alert.status = status;
    alert.reviewerNotes = reviewerNotes;
    await idbService.put(STORES.SAFETY_ALERTS, alert);

    await this.logAuditEvent({
      actorId,
      actorName: 'Mentor',
      actorRole: 'mentor',
      action: 'UPDATE_SAFETY_ALERT',
      targetType: 'SafetyAlert',
      targetId: alertId,
      previousValue: { status: prevStatus },
      newValue: { status, reviewerNotes },
      details: `Updated safety alert status to ${status}`,
    });

    return alert;
  }

  // Notifications
  async getNotifications(userId: string, role?: UserRole): Promise<AppNotification[]> {
    await this.initPromise;
    const list = await idbService.getAll<AppNotification>(STORES.NOTIFICATIONS);
    const mentors = await this.getMentors();
    const matchedMentor = mentors.find(
      (m) => m.id === userId || m.userId === userId || m.email.toLowerCase() === userId.toLowerCase()
    );

    return list
      .filter((n) => {
        // 1. Direct recipientUserId match for specific user/mentor/student
        if (n.recipientUserId === userId) return true;
        if (matchedMentor && (n.recipientUserId === matchedMentor.id || n.recipientUserId === matchedMentor.userId || n.recipientUserId === matchedMentor.email)) {
          return true;
        }

        // 2. Admin broadcast check ONLY for role === 'admin'
        if (role === 'admin' && n.recipientRole === 'admin' && (!n.recipientUserId || n.recipientUserId === 'admin' || n.recipientUserId === 'admin_1')) {
          return true;
        }

        return false;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createNotification(
    notifData: Omit<AppNotification, 'id' | 'timestamp' | 'read'>
  ): Promise<AppNotification> {
    await this.initPromise;
    const newNotif: AppNotification = {
      ...notifData,
      id: `notif_${Date.now()}`,
      read: false,
      timestamp: new Date().toISOString(),
    };
    await idbService.put(STORES.NOTIFICATIONS, newNotif);
    return newNotif;
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await this.initPromise;
    const notif = await idbService.getById<AppNotification>(STORES.NOTIFICATIONS, notificationId);
    if (notif) {
      notif.read = true;
      await idbService.put(STORES.NOTIFICATIONS, notif);
    }
  }

  // Audit Logs
  async getAuditLogs(limitCount = 100): Promise<AdminAuditLog[]> {
    await this.initPromise;
    const logs = await idbService.getAll<AdminAuditLog>(STORES.AUDIT_LOGS);
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limitCount);
  }

  async logAuditEvent(eventData: Omit<AdminAuditLog, 'id' | 'timestamp'>): Promise<AdminAuditLog> {
    await this.initPromise;
    const newLog: AdminAuditLog = {
      ...eventData,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    await idbService.put(STORES.AUDIT_LOGS, newLog);
    return newLog;
  }

  // Meetings
  async getMeetings(filter?: { studentId?: string; mentorId?: string }): Promise<Meeting[]> {
    await this.initPromise;
    let list = await idbService.getAll<Meeting>(STORES.MEETINGS);
    if (filter?.studentId) list = list.filter((m) => m.studentId === filter.studentId);
    if (filter?.mentorId) list = list.filter((m) => m.mentorId === filter.mentorId);
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async createMeeting(meetingData: Omit<Meeting, 'id' | 'createdAt' | 'status'>, actorId: string): Promise<Meeting> {
    await this.initPromise;
    const newMeeting: Meeting = {
      ...meetingData,
      id: `meet_${Date.now()}`,
      status: 'upcoming',
      createdAt: new Date().toISOString(),
    };
    await idbService.put(STORES.MEETINGS, newMeeting);

    await this.logAuditEvent({
      actorId,
      actorName: meetingData.mentorName,
      actorRole: 'mentor',
      action: 'CREATE_MEETING',
      targetType: 'Meeting',
      targetId: newMeeting.id,
      newValue: { title: newMeeting.title, date: newMeeting.date, studentId: newMeeting.studentId },
      details: `Scheduled meeting "${newMeeting.title}" with student ${newMeeting.studentName}`,
    });

    const student = await this.getStudentById(meetingData.studentId);
    if (student) {
      await this.createNotification({
        recipientUserId: student.userId,
        recipientRole: 'student',
        title: 'New Mentor Meeting Scheduled',
        message: `Meeting "${newMeeting.title}" scheduled for ${newMeeting.date} at ${newMeeting.time}.`,
        type: 'meeting',
        category: 'MEETING',
      });
    }

    return newMeeting;
  }

  async updateMeetingStatus(meetingId: string, status: Meeting['status'], notes?: string): Promise<Meeting> {
    await this.initPromise;
    const meeting = await idbService.getById<Meeting>(STORES.MEETINGS, meetingId);
    if (!meeting) throw new Error('Meeting not found');

    meeting.status = status;
    if (notes) meeting.notes = notes;
    await idbService.put(STORES.MEETINGS, meeting);
    return meeting;
  }

  // Follow-Up Tasks
  async getFollowUpTasks(filter?: { studentId?: string; mentorId?: string }): Promise<FollowUpTask[]> {
    await this.initPromise;
    let list = await idbService.getAll<FollowUpTask>(STORES.TASKS);
    if (filter?.studentId) list = list.filter((t) => t.studentId === filter.studentId);
    if (filter?.mentorId) list = list.filter((t) => t.mentorId === filter.mentorId);
    return list;
  }

  async createFollowUpTask(taskData: Omit<FollowUpTask, 'id' | 'createdAt' | 'status'>, actorId: string): Promise<FollowUpTask> {
    await this.initPromise;
    const newTask: FollowUpTask = {
      ...taskData,
      id: `task_${Date.now()}`,
      status: 'TODO',
      createdAt: new Date().toISOString(),
    };
    await idbService.put(STORES.TASKS, newTask);

    await this.logAuditEvent({
      actorId,
      actorName: taskData.mentorName,
      actorRole: 'mentor',
      action: 'CREATE_TASK',
      targetType: 'Task',
      targetId: newTask.id,
      newValue: { title: newTask.title, dueDate: newTask.dueDate, priority: newTask.priority },
      details: `Created follow-up task "${newTask.title}" for ${newTask.studentName}`,
    });

    const student = await this.getStudentById(taskData.studentId);
    if (student) {
      await this.createNotification({
        recipientUserId: student.userId,
        recipientRole: 'student',
        title: 'New Mentor Task Assigned',
        message: `Task: "${newTask.title}" (Due: ${newTask.dueDate})`,
        type: 'task',
        category: 'TASK',
      });
    }

    return newTask;
  }

  async updateTaskStatus(taskId: string, status: FollowUpTask['status']): Promise<FollowUpTask> {
    await this.initPromise;
    const task = await idbService.getById<FollowUpTask>(STORES.TASKS, taskId);
    if (!task) throw new Error('Task not found');

    task.status = status;
    await idbService.put(STORES.TASKS, task);
    return task;
  }

  // Student Goals
  async getStudentGoals(studentId: string): Promise<StudentGoal[]> {
    await this.initPromise;
    const goals = await idbService.getAll<StudentGoal>(STORES.GOALS);
    return goals.filter((g) => g.studentId === studentId);
  }

  async createStudentGoal(goalData: Omit<StudentGoal, 'id' | 'createdAt'>): Promise<StudentGoal> {
    await this.initPromise;
    const newGoal: StudentGoal = {
      ...goalData,
      id: `goal_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await idbService.put(STORES.GOALS, newGoal);
    return newGoal;
  }

  async updateStudentGoal(goalId: string, updates: Partial<StudentGoal>): Promise<StudentGoal> {
    await this.initPromise;
    const goal = await idbService.getById<StudentGoal>(STORES.GOALS, goalId);
    if (!goal) throw new Error('Goal not found');

    const updated = { ...goal, ...updates };
    if (updated.currentProgress >= 100) {
      updated.status = 'completed';
      await this.unlockAchievement(
        goal.studentId,
        'goal_completed',
        '🎯 Goal Achieved',
        `Successfully completed personal goal: "${goal.title}"`,
        '🎯'
      );
    }
    await idbService.put(STORES.GOALS, updated);
    return updated;
  }

  async getStudentAchievements(studentId: string): Promise<Achievement[]> {
    await this.initPromise;
    const list = await idbService.getAll<Achievement>(STORES.ACHIEVEMENTS);
    return list.filter((a) => a.studentId === studentId);
  }

  async unlockAchievement(
    studentId: string,
    badgeKey: Achievement['badgeKey'],
    title: string,
    description: string,
    icon: string
  ): Promise<Achievement> {
    await this.initPromise;
    const list = await this.getStudentAchievements(studentId);
    const existing = list.find((a) => a.badgeKey === badgeKey);
    if (existing) return existing;

    const newAch: Achievement = {
      id: `ach_${Date.now()}`,
      studentId,
      badgeKey,
      title,
      description,
      icon,
      unlockedAt: new Date().toISOString(),
    };
    await idbService.put(STORES.ACHIEVEMENTS, newAch);
    return newAch;
  }

  async getStudyPlan(studentId: string): Promise<StudyPlan | null> {
    await this.initPromise;
    const plans = await idbService.getAll<StudyPlan>(STORES.STUDY_PLANS);
    return plans.find((p) => p.studentId === studentId) || null;
  }

  async saveStudyPlan(planData: Omit<StudyPlan, 'id' | 'createdAt'>): Promise<StudyPlan> {
    await this.initPromise;
    const newPlan: StudyPlan = {
      ...planData,
      id: `sp_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await idbService.put(STORES.STUDY_PLANS, newPlan);
    return newPlan;
  }

  async getResumeAnalysis(studentId: string): Promise<ResumeAnalysis | null> {
    await this.initPromise;
    const list = await idbService.getAll<ResumeAnalysis>(STORES.RESUME_ANALYSES);
    return list.find((r) => r.studentId === studentId) || null;
  }

  async saveResumeAnalysis(analysisData: Omit<ResumeAnalysis, 'id' | 'analyzedAt'>): Promise<ResumeAnalysis> {
    await this.initPromise;
    const newAnalysis: ResumeAnalysis = {
      ...analysisData,
      id: `ra_${Date.now()}`,
      analyzedAt: new Date().toISOString(),
    };
    await idbService.put(STORES.RESUME_ANALYSES, newAnalysis);
    return newAnalysis;
  }

  async getCareerGuidance(studentId: string): Promise<CareerGuidance | null> {
    await this.initPromise;
    const list = await idbService.getAll<CareerGuidance>(STORES.CAREER_GUIDANCE);
    const studentRecords = list.filter((c) => c.studentId === studentId);
    if (studentRecords.length === 0) return null;
    return studentRecords.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
  }

  async saveCareerGuidance(guidanceData: Omit<CareerGuidance, 'id' | 'generatedAt'>): Promise<CareerGuidance> {
    await this.initPromise;
    const newGuidance: CareerGuidance = {
      ...guidanceData,
      id: `cg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      generatedAt: new Date().toISOString(),
    };
    await idbService.put(STORES.CAREER_GUIDANCE, newGuidance);
    return newGuidance;
  }

  async getCSVImportHistory(): Promise<CSVImportHistoryRecord[]> {
    await this.initPromise;
    const history = await idbService.getAll<CSVImportHistoryRecord>(STORES.IMPORT_HISTORY);
    return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async logCSVImportHistory(recordData: Omit<CSVImportHistoryRecord, 'id' | 'timestamp'>): Promise<CSVImportHistoryRecord> {
    await this.initPromise;
    const newRec: CSVImportHistoryRecord = {
      ...recordData,
      id: `imphist_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    await idbService.put(STORES.IMPORT_HISTORY, newRec);
    return newRec;
  }

  // Academic Calendar & Years
  async getAcademicYears(): Promise<AcademicYear[]> {
    await this.initPromise;
    return idbService.getAll<AcademicYear>(STORES.ACADEMIC_YEARS);
  }

  async createAcademicYear(yearData: Omit<AcademicYear, 'id'>): Promise<AcademicYear> {
    await this.initPromise;
    const newYear: AcademicYear = {
      ...yearData,
      id: `ay_${Date.now()}`,
    };
    await idbService.put(STORES.ACADEMIC_YEARS, newYear);
    return newYear;
  }

  async updateAcademicYear(id: string, updates: Partial<AcademicYear>): Promise<AcademicYear> {
    await this.initPromise;
    const current = await idbService.getById<AcademicYear>(STORES.ACADEMIC_YEARS, id);
    if (!current) throw new Error('Academic year not found');
    const updated = { ...current, ...updates };
    await idbService.put(STORES.ACADEMIC_YEARS, updated);
    return updated;
  }

  async getSemesters(): Promise<Semester[]> {
    await this.initPromise;
    return idbService.getAll<Semester>(STORES.SEMESTERS);
  }

  async createSemester(semData: Omit<Semester, 'id'>): Promise<Semester> {
    await this.initPromise;
    const newSem: Semester = {
      ...semData,
      id: `sem_${Date.now()}`,
    };
    await idbService.put(STORES.SEMESTERS, newSem);
    return newSem;
  }

  async updateSemester(id: string, updates: Partial<Semester>): Promise<Semester> {
    await this.initPromise;
    const current = await idbService.getById<Semester>(STORES.SEMESTERS, id);
    if (!current) throw new Error('Semester not found');
    const updated = { ...current, ...updates };
    await idbService.put(STORES.SEMESTERS, updated);
    return updated;
  }

  async setActiveSemester(semesterId: string): Promise<void> {
    await this.initPromise;
    const sems = await idbService.getAll<Semester>(STORES.SEMESTERS);
    const changedSems: Semester[] = [];
    for (const s of sems) {
      const isTarget = s.id === semesterId;
      if (s.isActive !== isTarget) {
        s.isActive = isTarget;
        changedSems.push(s);
      }
    }
    if (changedSems.length > 0) {
      await idbService.putAll(STORES.SEMESTERS, changedSems);
    }
  }

  async archiveSemester(semesterId: string): Promise<void> {
    await this.initPromise;
    const target = await idbService.getById<Semester>(STORES.SEMESTERS, semesterId);
    if (target) {
      target.isActive = false;
      await idbService.put(STORES.SEMESTERS, target);
    }
  }

  async importIAMarksCSV(
    rows: Record<string, any>[],
    academicYearInput: string,
    semesterInput: string,
    actorId: string
  ): Promise<IAMarksImportResult> {
    await this.initPromise;
    const [existingStudents, existingMarks] = await Promise.all([
      idbService.getAll<Student>(STORES.STUDENTS),
      idbService.getAll<StudentAcademicMark>(STORES.STUDENT_ACADEMIC_MARKS),
    ]);
    const existingStudentsMap = new Map<string, Student>();
    existingStudents.forEach((s) => {
      existingStudentsMap.set(s.usn.trim().toUpperCase(), s);
      existingStudentsMap.set(s.id, s);
    });

    const existingMarksMap = new Map<string, StudentAcademicMark>();
    existingMarks.forEach((m) => {
      const key = `${m.studentUsn.trim().toUpperCase()}_${m.academicYear.trim()}_${m.semester.trim()}_${m.subjectCode.trim().toUpperCase()}`;
      existingMarksMap.set(key, m);
    });

    let importedCount = 0;
    let updatedCount = 0;
    const skippedCount = 0;
    let failedCount = 0;
    const errors: IAMarksImportResult['errors'] = [];
    const details: IAMarksImportResult['details'] = [];
    const marksToPersist: StudentAcademicMark[] = [];

    const nowStr = new Date().toISOString();

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const rowNumber = i + 1;

      const normRow: Record<string, any> = {};
      Object.keys(raw).forEach((k) => {
        const cleanKey = k.trim().toLowerCase().replace(/[\s_\-]+/g, '');
        normRow[cleanKey] = raw[k];
      });

      const usn = String(normRow.usn || '').trim().toUpperCase();
      const studentName = String(normRow.studentname || normRow.name || '').trim();
      const academicYear = String(normRow.academicyear || academicYearInput || '').trim();
      const semester = String(normRow.semester || semesterInput || '').trim();
      const subjectCode = String(normRow.subjectcode || normRow.code || '').trim().toUpperCase();
      const subjectName = String(normRow.subjectname || normRow.subject || '').trim();
      
      const ia1Raw = normRow.ia1marks ?? normRow.ia1 ?? normRow.ia1mark;
      const ia2Raw = normRow.ia2marks ?? normRow.ia2 ?? normRow.ia2mark;

      const ia1 = parseFloat(String(ia1Raw ?? '0'));
      const ia2 = parseFloat(String(ia2Raw ?? '0'));

      if (!usn) {
        failedCount++;
        errors.push({ rowNumber, usn: 'MISSING', subjectCode, reason: 'USN is required' });
        details.push({ rowNumber, usn: 'MISSING', name: studentName, subjectCode, status: 'ERROR', reason: 'USN is required' });
        continue;
      }

      const targetStudent = existingStudentsMap.get(usn);
      if (!targetStudent) {
        failedCount++;
        errors.push({ rowNumber, usn, subjectCode, reason: `Student USN '${usn}' not found in database` });
        details.push({ rowNumber, usn, name: studentName, subjectCode, status: 'ERROR', reason: `Student USN '${usn}' not found in database` });
        continue;
      }

      if (!subjectCode) {
        failedCount++;
        errors.push({ rowNumber, usn, subjectCode: 'MISSING', reason: 'Subject code is required' });
        details.push({ rowNumber, usn, name: studentName, subjectCode: 'MISSING', status: 'ERROR', reason: 'Subject code is required' });
        continue;
      }

      if (isNaN(ia1) || ia1 < 0 || ia1 > 100 || isNaN(ia2) || ia2 < 0 || ia2 > 100) {
        failedCount++;
        errors.push({ rowNumber, usn, subjectCode, reason: `Invalid IA marks: IA1=${ia1Raw}, IA2=${ia2Raw}. Must be numeric 0-100` });
        details.push({ rowNumber, usn, name: studentName, subjectCode, status: 'ERROR', reason: `Invalid IA marks: IA1=${ia1Raw}, IA2=${ia2Raw}. Must be numeric 0-100` });
        continue;
      }

      const compositeKey = `${usn}_${academicYear}_${semester}_${subjectCode}`;
      const existingMark = existingMarksMap.get(compositeKey);

      if (existingMark) {
        const updatedMark: StudentAcademicMark = {
          ...existingMark,
          studentName: studentName || targetStudent.name,
          subjectName: subjectName || existingMark.subjectName,
          ia1Marks: ia1,
          ia2Marks: ia2,
          updatedAt: nowStr,
          updatedBy: actorId,
        };
        marksToPersist.push(updatedMark);
        existingMarksMap.set(compositeKey, updatedMark);
        updatedCount++;
        details.push({ rowNumber, usn, name: targetStudent.name, subjectCode, status: 'UPDATE' });
      } else {
        const newMark: StudentAcademicMark = {
          id: `iam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          studentId: targetStudent.id,
          studentUsn: usn,
          studentName: studentName || targetStudent.name,
          academicYear,
          semester,
          subjectCode,
          subjectName: subjectName || subjectCode,
          ia1Marks: ia1,
          ia2Marks: ia2,
          maxMarks: 50,
          createdAt: nowStr,
          updatedAt: nowStr,
          updatedBy: actorId,
        };
        marksToPersist.push(newMark);
        existingMarksMap.set(compositeKey, newMark);
        importedCount++;
        details.push({ rowNumber, usn, name: targetStudent.name, subjectCode, status: 'NEW' });
      }
    }

    if (marksToPersist.length > 0) {
      await idbService.putAll(STORES.STUDENT_ACADEMIC_MARKS, marksToPersist);
    }

    await this.logAuditEvent({
      actorId,
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'IMPORT_IA_MARKS',
      targetType: 'StudentAcademicMark',
      targetId: `batch_${Date.now()}`,
      details: `Imported IA Marks CSV: ${importedCount} new, ${updatedCount} updated, ${failedCount} errors across ${rows.length} rows.`,
    });

    return {
      totalRows: rows.length,
      importedCount,
      updatedCount,
      skippedCount,
      failedCount,
      errors,
      details,
    };
  }

  async getStudentAcademicMarks(studentId: string): Promise<StudentAcademicMark[]> {
    await this.initPromise;
    if (studentId === 'all') {
      return idbService.getAll<StudentAcademicMark>(STORES.STUDENT_ACADEMIC_MARKS);
    }
    const [allMarks, student] = await Promise.all([
      idbService.getAll<StudentAcademicMark>(STORES.STUDENT_ACADEMIC_MARKS),
      this.getStudentById(studentId),
    ]);
    const usnUpper = student ? student.usn.trim().toUpperCase() : studentId.trim().toUpperCase();
    const canonicalStudentId = student ? student.id : studentId;
    return allMarks.filter(
      (m) =>
        m.studentId === canonicalStudentId ||
        m.studentId === studentId ||
        m.studentUsn.trim().toUpperCase() === usnUpper
    );
  }

  async editStudent(id: string, updates: Partial<Student>, actorId: string): Promise<Student> {
    await this.initPromise;
    const current = await idbService.getById<Student>(STORES.STUDENTS, id);
    if (!current) throw new Error('Student not found');

    const cleanUpdates = { ...updates };
    delete (cleanUpdates as any).usn;
    delete (cleanUpdates as any).id;

    const changedFields: { field: string; oldValue: any; newValue: any }[] = [];
    Object.keys(cleanUpdates).forEach((key) => {
      const k = key as keyof Student;
      if (current[k] !== cleanUpdates[k]) {
        changedFields.push({ field: key, oldValue: current[k], newValue: cleanUpdates[k] });
      }
    });

    const updatedStudent: Student = {
      ...current,
      ...cleanUpdates,
    };

    const riskEval = calculateExplainableRisk(updatedStudent);
    updatedStudent.riskLevel = riskEval.status;
    updatedStudent.riskReasons = riskEval.reasons;

    await idbService.put(STORES.STUDENTS, updatedStudent);

    await this.logAuditEvent({
      actorId,
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'EDIT_STUDENT',
      targetType: 'Student',
      targetId: id,
      previousValue: current,
      newValue: updatedStudent,
      details: `Admin edited student ${current.name} (${current.usn}): ${changedFields.map(f => f.field).join(', ')}`,
    });

    return updatedStudent;
  }

  async deleteStudent(id: string, actorId: string): Promise<void> {
    await this.initPromise;
    const student = await idbService.getById<Student>(STORES.STUDENTS, id);
    if (!student) return;

    student.academicStatus = 'Deactivated';
    (student as any).status = 'DEACTIVATED';
    (student as any).isDeactivated = true;
    (student as any).mentorId = null;
    (student as any).mentorName = undefined;
    (student as any).mentorEmail = undefined;

    await idbService.put(STORES.STUDENTS, student);
    await this.recalculateMentorMenteeCounts();

    await this.logAuditEvent({
      actorId,
      actorName: 'Admin User',
      actorRole: 'admin',
      action: 'DELETE_STUDENT',
      targetType: 'Student',
      targetId: id,
      details: `Admin deactivated student ${student.name} (${student.usn}) and cleared active mentor allocation while preserving historical records.`,
    });
  }

  async getCalendarEvents(department?: string, semester?: string): Promise<AcademicCalendarEvent[]> {
    await this.initPromise;
    let list = await idbService.getAll<AcademicCalendarEvent>(STORES.CALENDAR_EVENTS);
    if (department) list = list.filter((e) => !e.department || e.department === department);
    if (semester) list = list.filter((e) => !e.semester || e.semester === semester);
    return list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  async createCalendarEvent(eventData: Omit<AcademicCalendarEvent, 'id' | 'createdAt'>): Promise<AcademicCalendarEvent> {
    await this.initPromise;
    const newEvt: AcademicCalendarEvent = {
      ...eventData,
      id: `evt_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await idbService.put(STORES.CALENDAR_EVENTS, newEvt);
    return newEvt;
  }

  async getInterventions(filter?: { mentorId?: string; studentId?: string; status?: string }): Promise<InterventionRecord[]> {
    await this.initPromise;
    let list = await idbService.getAll<InterventionRecord>(STORES.INTERVENTIONS);
    if (filter?.mentorId) {
      const mentees = await this.getStudentsByMentorId(filter.mentorId);
      const menteeStudentIds = new Set(mentees.map((s) => s.id));
      list = list.filter((i) => i.mentorId === filter.mentorId || menteeStudentIds.has(i.studentId));
    }
    if (filter?.studentId) list = list.filter((i) => i.studentId === filter.studentId);
    if (filter?.status) list = list.filter((i) => i.status === filter.status);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createIntervention(
    intervData: Omit<InterventionRecord, 'id' | 'createdAt'>,
    actorId: string
  ): Promise<InterventionRecord> {
    await this.initPromise;
    const newInterv: InterventionRecord = {
      ...intervData,
      id: `interv_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await idbService.put(STORES.INTERVENTIONS, newInterv);

    await this.logAuditEvent({
      actorId,
      actorName: intervData.mentorName,
      actorRole: 'mentor',
      action: 'CREATE_INTERVENTION',
      targetType: 'Intervention',
      targetId: newInterv.id,
      newValue: { studentId: newInterv.studentId, priority: newInterv.priority },
      details: `Initiated intervention workflow for ${newInterv.studentName}`,
    });

    const mentors = await this.getMentors();
    const m = mentors.find((x) => x.id === newInterv.mentorId);
    if (m) {
      await this.createNotification({
        recipientUserId: m.userId,
        recipientRole: 'mentor',
        title: 'New Student Intervention Created',
        message: `Intervention initiated for ${newInterv.studentName} (${newInterv.studentUsn}).`,
        type: 'intervention',
        category: 'INTERVENTION',
        linkSection: 'intervention-center',
      });
    }

    return newInterv;
  }

  async updateInterventionStatus(
    interventionId: string,
    status: InterventionRecord['status'],
    actionsTaken?: string[],
    outcomeCgpa?: number,
    outcomeAttendance?: number,
    actorId = 'system'
  ): Promise<InterventionRecord> {
    await this.initPromise;
    const interv = await idbService.getById<InterventionRecord>(STORES.INTERVENTIONS, interventionId);
    if (!interv) throw new Error('Intervention not found');

    interv.status = status;
    if (actionsTaken) interv.actionsTaken = actionsTaken;
    if (outcomeCgpa !== undefined) interv.outcomeCgpa = outcomeCgpa;
    if (outcomeAttendance !== undefined) interv.outcomeAttendance = outcomeAttendance;
    if (status === 'RESOLVED') {
      interv.resolvedAt = new Date().toISOString();
    }

    await idbService.put(STORES.INTERVENTIONS, interv);

    await this.logAuditEvent({
      actorId,
      actorName: 'Faculty Mentor',
      actorRole: 'mentor',
      action: 'UPDATE_INTERVENTION',
      targetType: 'Intervention',
      targetId: interventionId,
      newValue: { status },
      details: `Updated intervention status to ${status}`,
    });

    return interv;
  }

  // AI Meeting Summaries
  async getAIMeetingSummary(meetingId: string): Promise<AIMeetingSummary | null> {
    await this.initPromise;
    const list = await idbService.getAll<AIMeetingSummary>(STORES.AI_MEETING_SUMMARIES);
    return list.find((s) => s.meetingId === meetingId) || null;
  }

  async saveAIMeetingSummary(summaryData: Omit<AIMeetingSummary, 'id' | 'createdAt'>): Promise<AIMeetingSummary> {
    await this.initPromise;
    const newSummary: AIMeetingSummary = {
      ...summaryData,
      id: `aims_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await idbService.put(STORES.AI_MEETING_SUMMARIES, newSummary);
    return newSummary;
  }

  // AI Controlled Memory
  async getAIMemories(studentId: string): Promise<AIMemoryItem[]> {
    await this.initPromise;
    const list = await idbService.getAll<AIMemoryItem>(STORES.AI_MEMORIES);
    return list.filter((m) => m.studentId === studentId);
  }

  async saveAIMemory(memoryData: Omit<AIMemoryItem, 'id' | 'createdAt'>): Promise<AIMemoryItem> {
    await this.initPromise;
    const newMemory: AIMemoryItem = {
      ...memoryData,
      id: `mem_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await idbService.put(STORES.AI_MEMORIES, newMemory);
    return newMemory;
  }

  async deleteAIMemory(memoryId: string): Promise<void> {
    await this.initPromise;
    await idbService.deleteById(STORES.AI_MEMORIES, memoryId);
  }

  // Meeting Feedback
  async getMeetingFeedback(mentorId?: string, meetingId?: string): Promise<MeetingFeedback[]> {
    await this.initPromise;
    let list = await idbService.getAll<MeetingFeedback>(STORES.MEETING_FEEDBACK);
    if (mentorId) list = list.filter((f) => f.mentorId === mentorId);
    if (meetingId) list = list.filter((f) => f.meetingId === meetingId);
    return list;
  }

  async submitMeetingFeedback(feedbackData: Omit<MeetingFeedback, 'id' | 'timestamp'>): Promise<MeetingFeedback> {
    await this.initPromise;
    const newFb: MeetingFeedback = {
      ...feedbackData,
      id: `fb_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    await idbService.put(STORES.MEETING_FEEDBACK, newFb);
    return newFb;
  }

  private async recalculateMentorMenteeCounts() {
    const [mentors, students] = await Promise.all([
      idbService.getAll<Mentor>(STORES.MENTORS),
      idbService.getAll<Student>(STORES.STUDENTS),
    ]);

    const countMap = new Map<string, number>();
    for (const s of students) {
      if (s.mentorId) {
        countMap.set(s.mentorId, (countMap.get(s.mentorId) || 0) + 1);
      }
    }

    const changedMentors: Mentor[] = [];
    for (const m of mentors) {
      const nextCount = countMap.get(m.id) || 0;
      if (m.activeMenteesCount !== nextCount) {
        m.activeMenteesCount = nextCount;
        changedMentors.push(m);
      }
    }

    if (changedMentors.length > 0) {
      await idbService.putAll(STORES.MENTORS, changedMentors);
    }
  }
}
