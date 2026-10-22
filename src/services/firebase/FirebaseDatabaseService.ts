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
  CSVStudentRow,
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
import { DemoDatabaseService } from '../demo/DemoDatabaseService';
import {
  db,
  isFirebaseConfigured,
  isSharedFirestoreOffline,
  getSharedFirestoreError,
  recordSharedFirestoreFailure,
  recordSharedFirestoreSuccess
} from './firebaseConfig';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';

export class FirebaseDatabaseService implements IDatabaseService {
  private fallback: DemoDatabaseService;

  // Scoped, role- and filter-isolated in-memory caches
  private mentorCache: { data: Mentor[]; timestamp: number } | null = null;
  private allStudentsCache: { data: Student[]; timestamp: number } | null = null;
  private studentQueryCache = new Map<string, { data: { students: Student[]; total: number }; timestamp: number }>();
  private studentByIdCache = new Map<string, { data: Student | null; timestamp: number }>();
  private mentorStudentsCache = new Map<string, { data: Student[]; timestamp: number }>();
  private allocationCache = new Map<string, { data: AllocationHistory[]; timestamp: number }>();
  private iaMarksCache = new Map<string, { data: StudentAcademicMark[]; timestamp: number }>();
  private academicYearsCache: { data: AcademicYear[]; timestamp: number } | null = null;
  private semestersCache: { data: Semester[]; timestamp: number } | null = null;
  private interventionsCache = new Map<string, { data: InterventionRecord[]; timestamp: number }>();
  private tasksCache = new Map<string, { data: FollowUpTask[]; timestamp: number }>();
  private meetingsCache = new Map<string, { data: Meeting[]; timestamp: number }>();

  // Short, appropriate TTLs per domain
  private readonly MENTOR_TTL_MS = 30000;      // 30s
  private readonly STUDENT_TTL_MS = 20000;     // 20s
  private readonly MENTOR_STUDENTS_TTL_MS = 15000; // 15s (mentor-isolated)
  private readonly ALLOCATION_TTL_MS = 30000;  // 30s
  private readonly MARKS_TTL_MS = 30000;       // 30s (student-isolated)
  private readonly CALENDAR_TTL_MS = 60000;    // 60s
  private readonly WORKFLOW_TTL_MS = 15000;    // 15s

  // Configurable, production-safe timeouts for Firestore Reads vs Writes
  // Production defaults: 5000ms read, 6000ms write (prevents false timeouts on cold TLS/gRPC handshakes)
  // Hybrid/Demo fallback defaults: 2000ms read, 2500ms write
  private readonly readTimeoutMs: number;
  private readonly writeTimeoutMs: number;
  private readonly FIRESTORE_COOLDOWN_MS = 30000; // 30s cooldown when circuit is open
  private readonly CIRCUIT_BREAKER_THRESHOLD = 2; // Require consecutive transient failures before tripping

  private firestoreOfflineUntil = 0;
  private consecutiveFirestoreFailures = 0;
  public lastFirestoreError: string | null = null;

  // Performance & read-count telemetry
  public firestoreReadCount = 0;
  public cacheHitCount = 0;
  public cacheMissCount = 0;

  constructor(options?: { readTimeoutMs?: number; writeTimeoutMs?: number }) {
    this.fallback = new DemoDatabaseService();
    const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : (process.env || {});
    const isProd = String(env.VITE_DEMO_MODE) === 'false';

    const envReadTimeout = Number(env.VITE_FIRESTORE_READ_TIMEOUT_MS);
    const envWriteTimeout = Number(env.VITE_FIRESTORE_WRITE_TIMEOUT_MS);

    this.readTimeoutMs = options?.readTimeoutMs
      || (Number.isFinite(envReadTimeout) && envReadTimeout > 0 ? envReadTimeout : (isProd ? 5000 : 2000));
    this.writeTimeoutMs = options?.writeTimeoutMs
      || (Number.isFinite(envWriteTimeout) && envWriteTimeout > 0 ? envWriteTimeout : (isProd ? 6000 : 2500));
  }

  private isCircuitOpen(): boolean {
    return Date.now() < this.firestoreOfflineUntil || isSharedFirestoreOffline();
  }

  public getPerformanceMetrics() {
    return {
      firestoreReadCount: this.firestoreReadCount,
      cacheHitCount: this.cacheHitCount,
      cacheMissCount: this.cacheMissCount,
      circuitBreakerOpen: this.isCircuitOpen(),
      consecutiveFirestoreFailures: this.consecutiveFirestoreFailures,
      lastFirestoreError: this.lastFirestoreError || getSharedFirestoreError(),
      readTimeoutMs: this.readTimeoutMs,
      writeTimeoutMs: this.writeTimeoutMs,
    };
  }

  public resetPerformanceMetrics() {
    this.firestoreReadCount = 0;
    this.cacheHitCount = 0;
    this.cacheMissCount = 0;
    this.consecutiveFirestoreFailures = 0;
    this.lastFirestoreError = null;
  }

  private recordFirestoreFailure(reason: string, isImmediateTrip = false) {
    this.lastFirestoreError = reason;
    this.consecutiveFirestoreFailures += 1;
    recordSharedFirestoreFailure(reason, isImmediateTrip);
    if (isImmediateTrip || this.consecutiveFirestoreFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.firestoreOfflineUntil = Date.now() + this.FIRESTORE_COOLDOWN_MS;
    }
  }

  private recordFirestoreSuccess() {
    this.consecutiveFirestoreFailures = 0;
    this.lastFirestoreError = null;
    this.firestoreOfflineUntil = 0;
    recordSharedFirestoreSuccess();
  }

  private async safeFirestoreQuery<T extends { size?: number; docs?: any[] }>(
    op: () => Promise<T>,
    customTimeoutMs?: number
  ): Promise<T | null> {
    if (!isFirebaseConfigured || !db) {
      return null;
    }
    if (this.isCircuitOpen()) {
      return null;
    }
    const timeoutMs = customTimeoutMs ?? this.readTimeoutMs;
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          this.recordFirestoreFailure(`Firestore read timed out after ${timeoutMs}ms`, false);
          resolve(null);
        }, timeoutMs);
      });
      const res = await Promise.race([
        op().then((r) => {
          this.recordFirestoreSuccess();
          return r;
        }).catch((err: any) => {
          const msg = String(err?.message || err?.code || 'Unknown Firestore read error');
          const isImmediate = msg.includes('NOT_FOUND') || msg.includes('client is offline') || err?.code === 'not-found';
          this.recordFirestoreFailure(msg, isImmediate);
          return null;
        }),
        timeoutPromise,
      ]);
      if (res && typeof res.size === 'number') {
        this.firestoreReadCount += Math.max(1, res.size);
      } else if (res) {
        this.firestoreReadCount += 1;
      }
      return res;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async safeFirestoreWrite(
    op: () => Promise<any>,
    customTimeoutMs?: number
  ): Promise<boolean> {
    if (!isFirebaseConfigured || !db) {
      return false;
    }
    if (this.isCircuitOpen()) {
      return false;
    }
    const timeoutMs = customTimeoutMs ?? this.writeTimeoutMs;
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<boolean>((resolve) => {
        timer = setTimeout(() => {
          this.recordFirestoreFailure(`Firestore write timed out after ${timeoutMs}ms`, false);
          resolve(false);
        }, timeoutMs);
      });
      return await Promise.race([
        op().then(() => {
          this.recordFirestoreSuccess();
          return true;
        }).catch((err: any) => {
          const msg = String(err?.message || err?.code || 'Unknown Firestore write error');
          const isImmediate = msg.includes('NOT_FOUND') || msg.includes('client is offline') || err?.code === 'not-found';
          this.recordFirestoreFailure(msg, isImmediate);
          return false;
        }),
        timeoutPromise,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  public invalidateCache(target?: 'mentor' | 'student' | 'allocation' | 'marks' | 'calendar' | 'workflow' | 'all') {
    if (!target || target === 'all') {
      this.mentorCache = null;
      this.allStudentsCache = null;
      this.studentQueryCache.clear();
      this.studentByIdCache.clear();
      this.mentorStudentsCache.clear();
      this.allocationCache.clear();
      this.iaMarksCache.clear();
      this.academicYearsCache = null;
      this.semestersCache = null;
      this.interventionsCache.clear();
      this.tasksCache.clear();
      this.meetingsCache.clear();
    } else if (target === 'mentor') {
      this.mentorCache = null;
      this.mentorStudentsCache.clear();
    } else if (target === 'student') {
      this.allStudentsCache = null;
      this.studentQueryCache.clear();
      this.studentByIdCache.clear();
      this.mentorStudentsCache.clear();
      this.mentorCache = null;
      this.interventionsCache.clear();
      this.tasksCache.clear();
      this.meetingsCache.clear();
    } else if (target === 'allocation') {
      this.allocationCache.clear();
      this.mentorStudentsCache.clear();
      this.allStudentsCache = null;
      this.studentQueryCache.clear();
      this.studentByIdCache.clear();
      this.mentorCache = null;
      this.interventionsCache.clear();
      this.tasksCache.clear();
      this.meetingsCache.clear();
    } else if (target === 'marks') {
      this.iaMarksCache.clear();
    } else if (target === 'calendar') {
      this.academicYearsCache = null;
      this.semestersCache = null;
      this.iaMarksCache.clear();
    } else if (target === 'workflow') {
      this.interventionsCache.clear();
      this.tasksCache.clear();
      this.meetingsCache.clear();
    }
  }

  private getFilterCacheKey(page: number, limit: number, filters?: Record<string, any>): string {
    if (!filters || Object.keys(filters).length === 0) {
      return `p:${page}|l:${limit}|f:none`;
    }
    const sortedEntries = Object.keys(filters)
      .sort()
      .filter((k) => filters[k] !== undefined && filters[k] !== '')
      .map((k) => `${k}=${String(filters[k])}`);
    return `p:${page}|l:${limit}|f:${sortedEntries.join('&')}`;
  }

  private applyStudentFilters(students: Student[], filters?: Record<string, any>): Student[] {
    let list = students.filter(s => s.academicStatus !== ('DELETED' as any) && s.academicStatus !== ('ARCHIVED' as any));
    if (!filters) return list;

    if (filters.department && filters.department !== 'ALL') {
      list = list.filter(s => s.department === filters.department);
    }
    if (filters.riskLevel && filters.riskLevel !== 'ALL') {
      list = list.filter(s => s.riskLevel === filters.riskLevel);
    }
    if (filters.mentorId) {
      if (filters.mentorId === 'UNASSIGNED') {
        list = list.filter(s => !s.mentorId);
      } else {
        list = list.filter(s => s.mentorId === filters.mentorId);
      }
    }
    if (filters.search) {
      const q = String(filters.search).toLowerCase().trim();
      if (q) {
        list = list.filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.usn.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q)
        );
      }
    }
    return list;
  }

  async getMentors(options?: { skipCache?: boolean; requireFirestore?: boolean }): Promise<Mentor[]> {
    const now = Date.now();
    if (!options?.skipCache && this.mentorCache && now - this.mentorCache.timestamp < this.MENTOR_TTL_MS) {
      this.cacheHitCount++;
      return this.mentorCache.data;
    }
    this.cacheMissCount++;

    if (!isFirebaseConfigured || !db || this.isCircuitOpen()) {
      if (options?.requireFirestore) {
        throw new Error(`Database temporarily unavailable (${this.lastFirestoreError || 'Firestore circuit breaker open'}). Please retry.`);
      }
      const mentors = await this.fallback.getMentors();
      if (mentors.length > 0) {
        this.mentorCache = { data: mentors, timestamp: Date.now() };
      }
      return mentors;
    }

    try {
      const [mentorsSnap, usersSnap, fallbackMentors] = await Promise.all([
        this.safeFirestoreQuery(() => getDocs(collection(db!, 'mentors'))),
        this.safeFirestoreQuery(() => getDocs(query(collection(db!, 'users'), where('role', '==', 'mentor')))),
        this.fallback.getMentors(),
      ]);

      if (!mentorsSnap && !usersSnap && options?.requireFirestore) {
        throw new Error(`Database temporarily unavailable (${this.lastFirestoreError || 'Failed to read mentors from Firestore'}). Please retry.`);
      }

      const mentorsList: Mentor[] = [];

      if (mentorsSnap) {
        mentorsSnap.forEach((d: any) => {
          const data = d.data();
          mentorsList.push({
            id: d.id,
            userId: data.userId || d.id,
            name: data.name || 'Unnamed Mentor',
            email: data.email || '',
            phone: data.phone || '',
            department: data.department || 'General',
            staffId: data.staffId || d.id,
            activeMenteesCount: data.activeMenteesCount || 0,
            status: data.status === 'inactive' || data.status === 'deactivated' ? 'inactive' : 'active',
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });
      }

      if (usersSnap) {
        usersSnap.forEach((uDoc: any) => {
          const uData = uDoc.data();
          const existing = mentorsList.find(m => m.userId === uDoc.id || m.email.toLowerCase() === (uData.email || '').toLowerCase());
          if (!existing) {
            mentorsList.push({
              id: uDoc.id,
              userId: uDoc.id,
              name: uData.name || 'Faculty Mentor',
              email: uData.email || '',
              phone: uData.phone || '',
              department: uData.department || 'General',
              staffId: uData.staffId || uDoc.id.substring(0, 8),
              activeMenteesCount: uData.activeMenteesCount || 0,
              status: uData.status === 'inactive' || uData.status === 'deactivated' ? 'inactive' : 'active',
              createdAt: uData.createdAt || new Date().toISOString(),
            });
          }
        });
      }

      for (const fbM of fallbackMentors) {
        if (!mentorsList.some(m => m.email.toLowerCase() === fbM.email.toLowerCase() || m.id === fbM.id)) {
          mentorsList.push(fbM);
        }
      }

      // Only cache if Firestore succeeded or fallback returned valid seed data
      if (mentorsSnap || usersSnap || mentorsList.length > 0) {
        this.mentorCache = { data: mentorsList, timestamp: Date.now() };
      }
      return mentorsList;
    } catch (err) {
      if (options?.requireFirestore) throw err;
      const fallbackList = await this.fallback.getMentors();
      if (fallbackList.length > 0) {
        this.mentorCache = { data: fallbackList, timestamp: Date.now() };
      }
      return fallbackList;
    }
  }

  async getMentorById(id: string): Promise<Mentor | null> {
    if (this.mentorCache && Date.now() - this.mentorCache.timestamp < this.MENTOR_TTL_MS) {
      this.cacheHitCount++;
      return this.mentorCache.data.find(m => m.id === id || m.userId === id) || null;
    }
    const mentors = await this.getMentors();
    return mentors.find(m => m.id === id || m.userId === id) || null;
  }

  async createMentor(mentorData: Omit<Mentor, 'id' | 'createdAt' | 'activeMenteesCount' | 'status'>, actorId: string): Promise<Mentor> {
    try {
      const res = await fetch('http://localhost:5000/api/admin/create-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mentorData.name,
          email: mentorData.email,
          phone: mentorData.phone,
          department: mentorData.department,
          staffId: mentorData.staffId,
          actorId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.mentor) {
          try {
            await this.fallback.putMentor(data.mentor);
          } catch {
            // Ignore fallback sync error
          }
          this.invalidateCache('mentor');
          return data.mentor as Mentor;
        }
        throw new Error(data.error || 'Failed to create mentor account.');
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned status ${res.status}`);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to backend server (http://localhost:5000). Please ensure the backend server is running.');
      }
      throw err;
    }
  }

  async updateMentor(id: string, updates: Partial<Mentor>, actorId: string): Promise<Mentor> {
    const updated = await this.fallback.updateMentor(id, updates, actorId);
    this.invalidateCache('mentor');
    return updated;
  }

  async deactivateMentor(id: string, actorId: string): Promise<void> {
    try {
      const res = await fetch('http://localhost:5000/api/admin/deactivate-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId: id, actorId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned status ${res.status}`);
      }
      await this.fallback.deactivateMentor(id, actorId);
      this.invalidateCache('mentor');
    } catch (err: any) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to backend server (http://localhost:5000). Please ensure the backend server is running.');
      }
      throw err;
    }
  }

  async reactivateMentor(id: string, actorId: string): Promise<void> {
    try {
      const res = await fetch('http://localhost:5000/api/admin/reactivate-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId: id, actorId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned status ${res.status}`);
      }
      await this.fallback.reactivateMentor(id, actorId);
      this.invalidateCache('mentor');
    } catch (err: any) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to backend server (http://localhost:5000). Please ensure the backend server is running.');
      }
      throw err;
    }
  }

  async deleteMentor(id: string, actorId: string): Promise<void> {
    try {
      const res = await fetch('http://localhost:5000/api/admin/delete-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId: id, actorId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned status ${res.status}`);
      }
      await this.fallback.deleteMentor(id, actorId);
      this.invalidateCache('mentor');
    } catch (err: any) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to backend server (http://localhost:5000). Please ensure the backend server is running.');
      }
      throw err;
    }
  }

  private populateStudentLookupCache(students: Student[], timestamp: number) {
    for (const s of students) {
      this.studentByIdCache.set(s.id, { data: s, timestamp });
      if (s.usn) this.studentByIdCache.set(s.usn.toUpperCase(), { data: s, timestamp });
      if (s.userId) this.studentByIdCache.set(s.userId, { data: s, timestamp });
      if (s.email) this.studentByIdCache.set(s.email.toLowerCase(), { data: s, timestamp });
    }
  }

  async getStudents(page = 1, limit = 50, filters?: Record<string, any>, options?: { skipCache?: boolean; requireFirestore?: boolean }): Promise<{ students: Student[]; total: number }> {
    const now = Date.now();
    const cacheKey = this.getFilterCacheKey(page, limit, filters);

    if (!options?.skipCache) {
      const cachedQuery = this.studentQueryCache.get(cacheKey);
      if (cachedQuery && now - cachedQuery.timestamp < this.STUDENT_TTL_MS) {
        this.cacheHitCount++;
        return cachedQuery.data;
      }
      if (this.allStudentsCache && now - this.allStudentsCache.timestamp < this.STUDENT_TTL_MS) {
        this.cacheHitCount++;
        const filtered = this.applyStudentFilters(this.allStudentsCache.data, filters);
        const start = (page - 1) * limit;
        const result = { students: filtered.slice(start, start + limit), total: filtered.length };
        this.studentQueryCache.set(cacheKey, { data: result, timestamp: now });
        return result;
      }
    }
    this.cacheMissCount++;

    if (!isFirebaseConfigured || !db || this.isCircuitOpen()) {
      if (options?.requireFirestore) {
        throw new Error(`Database temporarily unavailable (${this.lastFirestoreError || 'Firestore circuit breaker open'}). Please retry.`);
      }
      const allFallback = await this.fallback.getStudents(1, 5000);
      const ts = Date.now();
      if (allFallback.students.length > 0) {
        this.allStudentsCache = { data: allFallback.students, timestamp: ts };
        this.populateStudentLookupCache(allFallback.students, ts);
      }
      const filtered = this.applyStudentFilters(allFallback.students, filters);
      const start = (page - 1) * limit;
      const res = { students: filtered.slice(start, start + limit), total: filtered.length };
      if (allFallback.students.length > 0) {
        this.studentQueryCache.set(cacheKey, { data: res, timestamp: ts });
      }
      return res;
    }

    try {
      const [studentsSnap, fallbackRes] = await Promise.all([
        this.safeFirestoreQuery(() => getDocs(collection(db!, 'students'))),
        this.fallback.getStudents(1, 5000),
      ]);

      if (!studentsSnap && options?.requireFirestore) {
        throw new Error(`Database temporarily unavailable (${this.lastFirestoreError || 'Failed to read students from Firestore'}). Please retry.`);
      }

      const studentsList: Student[] = [];
      const fallbackById = new Map<string, Student>();
      for (const fbS of fallbackRes.students) {
        fallbackById.set(fbS.id, fbS);
        if (fbS.usn) fallbackById.set(fbS.usn.toUpperCase(), fbS);
      }

      if (studentsSnap) {
        studentsSnap.forEach((d: any) => {
          const data = d.data();
          if (data.status === 'DELETED' || data.academicStatus === 'DELETED') return;
          const localMatch = fallbackById.get(d.id) || (data.usn ? fallbackById.get(String(data.usn).toUpperCase()) : undefined);
          if (localMatch && (localMatch.academicStatus === ('DELETED' as any) || (localMatch as any).status === 'DELETED')) {
            return;
          }
          studentsList.push({
            id: d.id,
            userId: data.uid || data.userId || localMatch?.userId || d.id,
            usn: data.usn || localMatch?.usn || d.id,
            name: localMatch?.name || data.name || 'Student',
            email: localMatch?.email || data.email || '',
            phone: localMatch?.phone || data.phone || '',
            parentPhone: localMatch?.parentPhone || data.parentPhone || '',
            department: localMatch?.department || data.department || 'Computer Science & Engineering',
            program: localMatch?.program || data.program || 'B.Tech',
            year: localMatch?.year || data.year || '3rd Year',
            semester: localMatch?.semester || data.semester || 'Semester 6',
            section: localMatch?.section || data.section || 'A',
            admissionYear: localMatch?.admissionYear || data.admissionYear || '2023',
            mentorId: localMatch?.mentorId !== undefined ? localMatch.mentorId : (data.mentorId || undefined),
            mentorName: localMatch?.mentorName !== undefined ? localMatch.mentorName : (data.mentorName || undefined),
            mentorEmail: localMatch?.mentorEmail !== undefined ? localMatch.mentorEmail : (data.mentorEmail || undefined),
            cgpa: typeof localMatch?.cgpa === 'number' ? localMatch.cgpa : (typeof data.cgpa === 'number' ? data.cgpa : 8.0),
            attendance: typeof localMatch?.attendance === 'number' ? localMatch.attendance : (typeof data.attendance === 'number' ? data.attendance : 85),
            financialScore: localMatch?.financialScore ?? data.financialScore ?? 5,
            studyHours: localMatch?.studyHours ?? data.studyHours ?? 15,
            previousYearBacklogs: localMatch?.previousYearBacklogs ?? data.previousYearBacklogs ?? 0,
            currentBacklogs: localMatch?.currentBacklogs ?? data.currentBacklogs ?? 0,
            academicStatus: localMatch?.academicStatus || data.academicStatus || 'Active',
            riskLevel: localMatch?.riskLevel || data.riskLevel || 'GOOD_PERFORMANCE',
            riskReasons: localMatch?.riskReasons || data.riskReasons || [],
            createdAt: data.createdAt || localMatch?.createdAt || new Date().toISOString(),
          });
        });
      }

      for (const fbS of fallbackRes.students) {
        if (!studentsList.some(s => s.id === fbS.id || s.usn === fbS.usn || s.email.toLowerCase() === fbS.email.toLowerCase())) {
          studentsList.push(fbS);
        }
      }

      const ts = Date.now();
      const filtered = this.applyStudentFilters(studentsList, filters);
      const total = filtered.length;
      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit);
      const result = { students: paginated, total };

      if (studentsSnap || studentsList.length > 0) {
        this.allStudentsCache = { data: studentsList, timestamp: ts };
        this.populateStudentLookupCache(studentsList, ts);
        this.studentQueryCache.set(cacheKey, { data: result, timestamp: ts });
      }
      return result;
    } catch (err) {
      if (options?.requireFirestore) throw err;
      const res = await this.fallback.getStudents(page, limit, filters);
      if (res.students.length > 0) {
        this.studentQueryCache.set(cacheKey, { data: res, timestamp: Date.now() });
      }
      return res;
    }
  }

  async getStudentById(id: string): Promise<Student | null> {
    if (!id) return null;
    const now = Date.now();
    const lowerId = id.toLowerCase();
    const cached =
      this.studentByIdCache.get(id) ||
      this.studentByIdCache.get(id.toUpperCase()) ||
      this.studentByIdCache.get(lowerId);
    if (cached && now - cached.timestamp < this.STUDENT_TTL_MS) {
      this.cacheHitCount++;
      return cached.data;
    }

    if (this.allStudentsCache && now - this.allStudentsCache.timestamp < this.STUDENT_TTL_MS) {
      this.cacheHitCount++;
      const found =
        this.allStudentsCache.data.find(
          s => s.id === id || s.usn === id || s.userId === id || s.email.toLowerCase() === lowerId
        ) || null;
      this.studentByIdCache.set(id, { data: found, timestamp: now });
      return found;
    }

    this.cacheMissCount++;
    const directFallback = await this.fallback.getStudentById(id);
    if (directFallback) {
      const ts = Date.now();
      this.studentByIdCache.set(id, { data: directFallback, timestamp: ts });
      this.populateStudentLookupCache([directFallback], ts);
      return directFallback;
    }

    const res = await this.getStudents(1, 1000);
    const found =
      res.students.find(
        s => s.id === id || s.usn === id || s.userId === id || s.email.toLowerCase() === lowerId
      ) || null;
    if (found) {
      const ts = Date.now();
      this.studentByIdCache.set(id, { data: found, timestamp: ts });
      this.populateStudentLookupCache([found], ts);
    }
    return found;
  }

  public clearCache(): void {
    this.invalidateCache('all');
  }

  async getStudentsByMentorId(mentorId: string, options?: { skipCache?: boolean; requireFirestore?: boolean }): Promise<Student[]> {
    if (!mentorId) return [];
    const now = Date.now();
    if (!options?.skipCache) {
      const cachedMentorStudents = this.mentorStudentsCache.get(mentorId);
      if (cachedMentorStudents && now - cachedMentorStudents.timestamp < this.MENTOR_STUDENTS_TTL_MS) {
        this.cacheHitCount++;
        return cachedMentorStudents.data;
      }
    }
    this.cacheMissCount++;

    if (!isFirebaseConfigured || !db || this.isCircuitOpen()) {
      if (options?.requireFirestore) {
        throw new Error(`Database temporarily unavailable (${this.lastFirestoreError || 'Firestore circuit breaker open'}). Please retry.`);
      }
      const list = await this.fallback.getStudentsByMentorId(mentorId);
      this.mentorStudentsCache.set(mentorId, { data: list, timestamp: Date.now() });
      return list;
    }

    try {
      const [allocSnap, fallbackStudents, allStudentsRes] = await Promise.all([
        this.safeFirestoreQuery(() =>
          getDocs(query(collection(db!, 'mentorAllocations'), where('mentorId', '==', mentorId), where('status', '==', 'ACTIVE')))
        ),
        this.fallback.getStudentsByMentorId(mentorId),
        this.getStudents(1, 1000, undefined, options),
      ]);

      if (!allocSnap && options?.requireFirestore) {
        throw new Error(`Database temporarily unavailable (${this.lastFirestoreError || 'Failed to read mentorAllocations'}). Please retry.`);
      }

      const studentIds = new Set<string>();
      if (allocSnap) {
        allocSnap.forEach((d: any) => studentIds.add(d.data().studentId));
      }

      const fallbackMap = new Map<string, Student>();
      for (const s of fallbackStudents) {
        studentIds.add(s.id);
        fallbackMap.set(s.id, s);
        fallbackMap.set(s.usn, s);
      }

      const allocatedFromAll = allStudentsRes.students.filter((s) => {
        const match = fallbackMap.get(s.id) || fallbackMap.get(s.usn);
        const activeMentorId = match?.mentorId !== undefined ? match.mentorId : s.mentorId;
        return studentIds.has(s.id) || activeMentorId === mentorId;
      });

      const merged = allocatedFromAll.map((s) => {
        const match = fallbackMap.get(s.id) || fallbackMap.get(s.usn);
        if (!match) return s;
        return {
          ...s,
          mentorId: match.mentorId || s.mentorId,
          mentorName: match.mentorName || s.mentorName,
          mentorEmail: match.mentorEmail || s.mentorEmail,
          cgpa: typeof match.cgpa === 'number' ? match.cgpa : s.cgpa,
          attendance: typeof match.attendance === 'number' ? match.attendance : s.attendance,
          previousYearBacklogs: typeof match.previousYearBacklogs === 'number' ? match.previousYearBacklogs : s.previousYearBacklogs,
          currentBacklogs: typeof match.currentBacklogs === 'number' ? match.currentBacklogs : s.currentBacklogs,
          riskLevel: match.riskLevel || s.riskLevel,
          riskReasons: match.riskReasons || s.riskReasons,
        };
      });

      this.mentorStudentsCache.set(mentorId, { data: merged, timestamp: Date.now() });
      return merged;
    } catch (err) {
      if (options?.requireFirestore) throw err;
      const list = await this.fallback.getStudentsByMentorId(mentorId);
      this.mentorStudentsCache.set(mentorId, { data: list, timestamp: Date.now() });
      return list;
    }
  }

  async createStudent(studentData: Omit<Student, 'id' | 'createdAt' | 'riskLevel' | 'riskReasons'>, actorId: string): Promise<Student> {
    const created = await this.fallback.createStudent(studentData, actorId);
    this.invalidateCache('student');
    return created;
  }

  async updateStudent(id: string, updates: Partial<Student>, actorId: string): Promise<Student> {
    const updated = await this.fallback.updateStudent(id, updates, actorId);
    this.invalidateCache('student');
    return updated;
  }

  async importStudentsCSV(csvRows: CSVStudentRow[], actorId: string, duplicateStrategy?: 'skip' | 'update' | 'cancel'): Promise<CSVImportResult> {
    const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : (process.env || {});
    const isProductionMode = String(env.VITE_DEMO_MODE) === 'false';

    if (!isProductionMode) {
      const res = await this.fallback.importStudentsCSV(csvRows, actorId, duplicateStrategy);
      this.invalidateCache('student');
      return res;
    }

    try {
      const res = await fetch('http://localhost:5000/api/admin/import-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvRows, actorId, duplicateStrategy }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        const importedStudentsList: Student[] = data.results
          .filter((r: any) => r.status === 'success' && r.student)
          .map((r: any) => r.student);

        if (importedStudentsList.length > 0) {
          try {
            await this.fallback.putStudentsBatch(importedStudentsList);
          } catch {
            // Ignore fallback batch put error
          }
        }
        this.invalidateCache('all');

        return {
          totalRows: data.totalRows || csvRows.length,
          successfulCount: data.importedCount || 0,
          importedCount: data.importedCount || 0,
          updatedCount: 0,
          skippedCount: data.skippedCount || 0,
          failedCount: data.failedCount || 0,
          duplicateCount: data.skippedCount || 0,
          mentorAllocationErrorCount: 0,
          importedStudents: importedStudentsList,
          errors: data.results.filter((r: any) => r.status === 'failed').map((r: any) => ({
            rowNumber: r.rowNumber,
            usn: r.usn,
            name: r.name,
            reason: r.reason,
          })),
          details: data.results.map((r: any) => ({
            rowNumber: r.rowNumber,
            usn: r.usn,
            name: r.name,
            email: r.email,
            department: r.department || 'Computer Science & Engineering',
            isValid: r.status === 'success',
            status: r.status === 'success' ? 'VALID' : r.status === 'skipped' ? 'WARNING' : 'ERROR',
            warnings: r.status === 'skipped' ? [r.reason] : [],
            errors: r.status === 'failed' ? [r.reason] : [],
            rawData: r,
          })),
        };
      }
      throw new Error(data.error || 'Failed to import student CSV batch.');
    } catch (err: any) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to backend server (http://localhost:5000). Please ensure the backend server is running.');
      }
      throw err;
    }
  }

  async allocateStudent(studentId: string, mentorId: string, changedBy: string, reason?: string): Promise<void> {
    await this.fallback.allocateStudent(studentId, mentorId, changedBy, reason);

    if (db && isFirebaseConfigured && Date.now() >= this.firestoreOfflineUntil) {
      const allocId = `${mentorId}_${studentId}`;
      await this.safeFirestoreWrite(() =>
        setDoc(doc(db!, 'mentorAllocations', allocId), {
          id: allocId,
          mentorId,
          studentId,
          changedBy,
          reason: reason || 'Administrative mentee mapping',
          status: 'ACTIVE',
          timestamp: new Date().toISOString(),
        })
      );
    }
    this.invalidateCache('allocation');
  }

  async bulkAllocateStudents(studentIds: string[], mentorId: string, changedBy: string, options?: { reassignAll?: boolean; reason?: string }): Promise<{ allocatedCount: number; skippedCount: number; failedCount: number }> {
    const res = await this.fallback.bulkAllocateStudents(studentIds, mentorId, changedBy, options);
    if (db && isFirebaseConfigured && Date.now() >= this.firestoreOfflineUntil) {
      try {
        for (const stId of studentIds) {
          if (this.isCircuitOpen()) break;
          const prevAllocs = await this.safeFirestoreQuery(() =>
            getDocs(query(collection(db!, 'mentorAllocations'), where('studentId', '==', stId), where('status', '==', 'ACTIVE')))
          );
          if (prevAllocs) {
            for (const docSnap of prevAllocs.docs) {
              if (docSnap.data().mentorId !== mentorId) {
                await this.safeFirestoreWrite(() =>
                  setDoc(doc(db!, 'mentorAllocations', docSnap.id), { status: 'REASSIGNED' }, { merge: true })
                );
              }
            }
          }

          const allocId = `${mentorId}_${stId}`;
          await Promise.all([
            this.safeFirestoreWrite(() =>
              setDoc(doc(db!, 'mentorAllocations', allocId), {
                id: allocId,
                mentorId,
                studentId: stId,
                changedBy,
                reason: options?.reason || 'Administrative mentee mapping',
                status: 'ACTIVE',
                timestamp: new Date().toISOString(),
              })
            ),
            this.safeFirestoreWrite(() =>
              setDoc(doc(db!, 'students', stId), {
                mentorId,
              }, { merge: true })
            ),
          ]);
        }
      } catch (e: any) {
        console.warn('[Firestore Bulk Allocation Write Notice]:', e.message);
      }
    }
    this.invalidateCache('allocation');
    return res;
  }

  async getAllocationHistory(studentId?: string): Promise<AllocationHistory[]> {
    const now = Date.now();
    const key = studentId || '__ALL__';
    const cached = this.allocationCache.get(key);
    if (cached && now - cached.timestamp < this.ALLOCATION_TTL_MS) {
      this.cacheHitCount++;
      return cached.data;
    }
    this.cacheMissCount++;

    const history = await this.fallback.getAllocationHistory(studentId);
    this.allocationCache.set(key, { data: history, timestamp: Date.now() });
    return history;
  }

  calculateExplainableRisk(student: Partial<Student>): ExplainableRisk {
    return this.fallback.calculateExplainableRisk(student);
  }

  evaluateStudentTrend(student: Student): StudentTrendStatus {
    return this.fallback.evaluateStudentTrend(student);
  }

  async getMentorNotes(studentId: string): Promise<MentorNote[]> {
    return this.fallback.getMentorNotes(studentId);
  }

  async addMentorNote(note: Omit<MentorNote, 'id' | 'timestamp'>): Promise<MentorNote> {
    return this.fallback.addMentorNote(note);
  }

  async getConversation(studentId: string, mentorId: string): Promise<MentorshipConversation | null> {
    return this.fallback.getConversation(studentId, mentorId);
  }

  async sendMessageToConversation(studentId: string, mentorId: string, senderRole: 'mentor' | 'student', text: string, senderName: string): Promise<MentorshipConversation> {
    return this.fallback.sendMessageToConversation(studentId, mentorId, senderRole, text, senderName);
  }

  async getAssignedCourses(studentId: string): Promise<AssignedCourse[]> {
    return this.fallback.getAssignedCourses(studentId);
  }

  async assignCourse(course: Omit<AssignedCourse, 'id' | 'assignedDate'>): Promise<AssignedCourse> {
    return this.fallback.assignCourse(course);
  }

  async updateCourseProgress(courseId: string, completionPercentage: number, completedActivities: number): Promise<AssignedCourse> {
    return this.fallback.updateCourseProgress(courseId, completionPercentage, completedActivities);
  }

  async getAssignedActivities(studentId: string): Promise<AssignedActivity[]> {
    return this.fallback.getAssignedActivities(studentId);
  }

  async assignActivity(activity: Omit<AssignedActivity, 'id' | 'assignedDate'>): Promise<AssignedActivity> {
    return this.fallback.assignActivity(activity);
  }

  async getSharedResources(department?: string, studentId?: string): Promise<SharedResource[]> {
    return this.fallback.getSharedResources(department, studentId);
  }

  async shareResource(resource: Omit<SharedResource, 'id' | 'timestamp'>, actorId: string): Promise<SharedResource> {
    return this.fallback.shareResource(resource, actorId);
  }

  async getStudentPortfolio(studentId: string): Promise<StudentPortfolio> {
    return this.fallback.getStudentPortfolio(studentId);
  }

  async updateStudentPortfolio(studentId: string, updates: Partial<StudentPortfolio>): Promise<StudentPortfolio> {
    return this.fallback.updateStudentPortfolio(studentId, updates);
  }

  async getAISafetyAlerts(mentorId?: string): Promise<AISafetyAlert[]> {
    return this.fallback.getAISafetyAlerts(mentorId);
  }

  async createAISafetyAlert(alert: Omit<AISafetyAlert, 'id' | 'timestamp' | 'status'>, actorId?: string): Promise<AISafetyAlert> {
    return this.fallback.createAISafetyAlert(alert, actorId);
  }

  async updateAISafetyAlertStatus(alertId: string, status: AISafetyAlert['status'], reviewerNotes: string, actorId: string): Promise<AISafetyAlert> {
    return this.fallback.updateAISafetyAlertStatus(alertId, status, reviewerNotes, actorId);
  }

  async getNotifications(userId: string, role?: UserRole): Promise<AppNotification[]> {
    return this.fallback.getNotifications(userId, role);
  }

  async createNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): Promise<AppNotification> {
    return this.fallback.createNotification(notification);
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    return this.fallback.markNotificationRead(notificationId);
  }

  async getAuditLogs(limit?: number): Promise<AdminAuditLog[]> {
    return this.fallback.getAuditLogs(limit);
  }

  async logAuditEvent(event: Omit<AdminAuditLog, 'id' | 'timestamp'>): Promise<AdminAuditLog> {
    return this.fallback.logAuditEvent(event);
  }

  async getMeetings(filter?: { studentId?: string; mentorId?: string }): Promise<Meeting[]> {
    const now = Date.now();
    const key = `m:${filter?.mentorId || ''}|s:${filter?.studentId || ''}`;
    const cached = this.meetingsCache.get(key);
    if (cached && now - cached.timestamp < this.WORKFLOW_TTL_MS) {
      this.cacheHitCount++;
      return cached.data;
    }
    this.cacheMissCount++;
    const list = await this.fallback.getMeetings(filter);
    this.meetingsCache.set(key, { data: list, timestamp: Date.now() });
    return list;
  }

  async createMeeting(meeting: Omit<Meeting, 'id' | 'createdAt' | 'status'>, actorId: string): Promise<Meeting> {
    const created = await this.fallback.createMeeting(meeting, actorId);
    this.meetingsCache.clear();
    return created;
  }

  async updateMeetingStatus(meetingId: string, status: Meeting['status'], notes?: string): Promise<Meeting> {
    const updated = await this.fallback.updateMeetingStatus(meetingId, status, notes);
    this.meetingsCache.clear();
    return updated;
  }

  async getFollowUpTasks(filter?: { studentId?: string; mentorId?: string }): Promise<FollowUpTask[]> {
    const now = Date.now();
    const key = `m:${filter?.mentorId || ''}|s:${filter?.studentId || ''}`;
    const cached = this.tasksCache.get(key);
    if (cached && now - cached.timestamp < this.WORKFLOW_TTL_MS) {
      this.cacheHitCount++;
      return cached.data;
    }
    this.cacheMissCount++;
    const list = await this.fallback.getFollowUpTasks(filter);
    this.tasksCache.set(key, { data: list, timestamp: Date.now() });
    return list;
  }

  async createFollowUpTask(task: Omit<FollowUpTask, 'id' | 'createdAt' | 'status'>, actorId: string): Promise<FollowUpTask> {
    const created = await this.fallback.createFollowUpTask(task, actorId);
    this.tasksCache.clear();
    return created;
  }

  async updateTaskStatus(taskId: string, status: FollowUpTask['status']): Promise<FollowUpTask> {
    const updated = await this.fallback.updateTaskStatus(taskId, status);
    this.tasksCache.clear();
    return updated;
  }

  async getStudentGoals(studentId: string): Promise<StudentGoal[]> {
    return this.fallback.getStudentGoals(studentId);
  }

  async createStudentGoal(goal: Omit<StudentGoal, 'id' | 'createdAt'>): Promise<StudentGoal> {
    return this.fallback.createStudentGoal(goal);
  }

  async updateStudentGoal(goalId: string, updates: Partial<StudentGoal>): Promise<StudentGoal> {
    return this.fallback.updateStudentGoal(goalId, updates);
  }

  async getStudentAchievements(studentId: string): Promise<Achievement[]> {
    return this.fallback.getStudentAchievements(studentId);
  }

  async unlockAchievement(studentId: string, badgeKey: Achievement['badgeKey'], title: string, description: string, icon: string): Promise<Achievement> {
    return this.fallback.unlockAchievement(studentId, badgeKey, title, description, icon);
  }

  async getStudyPlan(studentId: string): Promise<StudyPlan | null> {
    return this.fallback.getStudyPlan(studentId);
  }

  async saveStudyPlan(plan: Omit<StudyPlan, 'id' | 'createdAt'>): Promise<StudyPlan> {
    return this.fallback.saveStudyPlan(plan);
  }

  async getResumeAnalysis(studentId: string): Promise<ResumeAnalysis | null> {
    return this.fallback.getResumeAnalysis(studentId);
  }

  async saveResumeAnalysis(analysis: Omit<ResumeAnalysis, 'id' | 'analyzedAt'>): Promise<ResumeAnalysis> {
    return this.fallback.saveResumeAnalysis(analysis);
  }

  async getCareerGuidance(studentId: string): Promise<CareerGuidance | null> {
    return this.fallback.getCareerGuidance(studentId);
  }

  async saveCareerGuidance(guidance: Omit<CareerGuidance, 'id' | 'generatedAt'>): Promise<CareerGuidance> {
    return this.fallback.saveCareerGuidance(guidance);
  }

  async getCSVImportHistory(): Promise<CSVImportHistoryRecord[]> {
    return this.fallback.getCSVImportHistory();
  }

  async logCSVImportHistory(record: Omit<CSVImportHistoryRecord, 'id' | 'timestamp'>): Promise<CSVImportHistoryRecord> {
    return this.fallback.logCSVImportHistory(record);
  }

  // --- PHASE 3 METHODS EXTENSIONS ---

  async getAcademicYears(options?: { skipCache?: boolean; requireFirestore?: boolean }): Promise<AcademicYear[]> {
    const now = Date.now();
    if (!options?.skipCache && this.academicYearsCache && now - this.academicYearsCache.timestamp < this.CALENDAR_TTL_MS) {
      this.cacheHitCount++;
      return this.academicYearsCache.data;
    }
    this.cacheMissCount++;

    if (!isFirebaseConfigured || !db || this.isCircuitOpen()) {
      if (options?.requireFirestore) {
        throw new Error(`Database temporarily unavailable (${this.lastFirestoreError || 'Firestore circuit breaker open'}). Please retry.`);
      }
      const years = await this.fallback.getAcademicYears();
      if (years.length > 0) {
        this.academicYearsCache = { data: years, timestamp: Date.now() };
      }
      return years;
    }

    const [snap, fallbackYears] = await Promise.all([
      this.safeFirestoreQuery(() => getDocs(collection(db!, 'academicYears'))),
      this.fallback.getAcademicYears(),
    ]);

    if (!snap && options?.requireFirestore) {
      throw new Error(`Database temporarily unavailable (${this.lastFirestoreError || 'Failed to read academicYears'}). Please retry.`);
    }

    const mergedMap = new Map<string, AcademicYear>();
    for (const fy of fallbackYears) {
      mergedMap.set(fy.id, fy);
    }
    if (snap) {
      snap.forEach((d: any) => {
        const data = d.data();
        mergedMap.set(d.id, {
          id: d.id,
          yearName: data.yearName || d.id,
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          isActive: Boolean(data.isActive),
        });
      });
    }
    const years = Array.from(mergedMap.values());
    if (snap || years.length > 0) {
      this.academicYearsCache = { data: years, timestamp: Date.now() };
    }
    return years;
  }

  async createAcademicYear(year: Omit<AcademicYear, 'id'>): Promise<AcademicYear> {
    const created = await this.fallback.createAcademicYear(year);
    if (db && isFirebaseConfigured && Date.now() >= this.firestoreOfflineUntil) {
      await this.safeFirestoreWrite(() =>
        setDoc(doc(db!, 'academicYears', created.id), created, { merge: true })
      );
    }
    this.invalidateCache('calendar');
    return created;
  }

  async updateAcademicYear(id: string, updates: Partial<AcademicYear>): Promise<AcademicYear> {
    const updated = await this.fallback.updateAcademicYear(id, updates);
    if (db && isFirebaseConfigured && Date.now() >= this.firestoreOfflineUntil) {
      await this.safeFirestoreWrite(() =>
        setDoc(doc(db!, 'academicYears', id), updated, { merge: true })
      );
    }
    this.invalidateCache('calendar');
    return updated;
  }

  async getSemesters(options?: { skipCache?: boolean; requireFirestore?: boolean }): Promise<Semester[]> {
    const now = Date.now();
    if (!options?.skipCache && this.semestersCache && now - this.semestersCache.timestamp < this.CALENDAR_TTL_MS) {
      this.cacheHitCount++;
      return this.semestersCache.data;
    }
    this.cacheMissCount++;

    if (!isFirebaseConfigured || !db || this.isCircuitOpen()) {
      if (options?.requireFirestore) {
        throw new Error(`Database temporarily unavailable (${this.lastFirestoreError || 'Firestore circuit breaker open'}). Please retry.`);
      }
      const sems = await this.fallback.getSemesters();
      if (sems.length > 0) {
        this.semestersCache = { data: sems, timestamp: Date.now() };
      }
      return sems;
    }

    const [snap, fallbackSems] = await Promise.all([
      this.safeFirestoreQuery(() => getDocs(collection(db!, 'semesters'))),
      this.fallback.getSemesters(),
    ]);

    if (!snap && options?.requireFirestore) {
      throw new Error(`Database temporarily unavailable (${this.lastFirestoreError || 'Failed to read semesters'}). Please retry.`);
    }

    const mergedMap = new Map<string, Semester>();
    for (const fs of fallbackSems) {
      mergedMap.set(fs.id, fs);
    }
    if (snap) {
      snap.forEach((d: any) => {
        const data = d.data();
        mergedMap.set(d.id, {
          id: d.id,
          academicYearId: data.academicYearId || '',
          name: data.name || '',
          number: typeof data.number === 'number' ? data.number : 1,
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          isActive: Boolean(data.isActive),
        });
      });
    }
    const sems = Array.from(mergedMap.values());
    if (snap || sems.length > 0) {
      this.semestersCache = { data: sems, timestamp: Date.now() };
    }
    return sems;
  }

  async createSemester(sem: Omit<Semester, 'id'>): Promise<Semester> {
    const created = await this.fallback.createSemester(sem);
    if (db && isFirebaseConfigured && Date.now() >= this.firestoreOfflineUntil) {
      await this.safeFirestoreWrite(() =>
        setDoc(doc(db!, 'semesters', created.id), created, { merge: true })
      );
    }
    this.invalidateCache('calendar');
    return created;
  }

  async updateSemester(id: string, updates: Partial<Semester>): Promise<Semester> {
    const updated = await this.fallback.updateSemester(id, updates);
    if (db && isFirebaseConfigured && Date.now() >= this.firestoreOfflineUntil) {
      await this.safeFirestoreWrite(() =>
        setDoc(doc(db!, 'semesters', id), updated, { merge: true })
      );
    }
    this.invalidateCache('calendar');
    return updated;
  }

  async setActiveSemester(semesterId: string): Promise<void> {
    await this.fallback.setActiveSemester(semesterId);
    if (db && isFirebaseConfigured && Date.now() >= this.firestoreOfflineUntil) {
      const allSems = await this.fallback.getSemesters();
      await Promise.all(
        allSems.map((s) =>
          this.safeFirestoreWrite(() =>
            setDoc(doc(db!, 'semesters', s.id), { isActive: s.id === semesterId }, { merge: true })
          )
        )
      );
    }
    this.invalidateCache('calendar');
  }

  async archiveSemester(semesterId: string): Promise<void> {
    await this.fallback.archiveSemester(semesterId);
    if (db && isFirebaseConfigured && Date.now() >= this.firestoreOfflineUntil) {
      await this.safeFirestoreWrite(() =>
        setDoc(doc(db!, 'semesters', semesterId), { isActive: false }, { merge: true })
      );
    }
    this.invalidateCache('calendar');
  }

  async importIAMarksCSV(
    rows: Record<string, any>[],
    academicYear: string,
    semester: string,
    actorId: string
  ): Promise<IAMarksImportResult> {
    const res = await this.fallback.importIAMarksCSV(rows, academicYear, semester, actorId);
    if (db && isFirebaseConfigured && Date.now() >= this.firestoreOfflineUntil && res.importedCount + res.updatedCount > 0) {
      const allMarks = await this.fallback.getStudentAcademicMarks('all');
      const targetMarks = allMarks.filter(
        (m) => m.academicYear === academicYear && m.semester === semester && m.updatedBy === actorId
      );
      await Promise.all(
        targetMarks.map((mark) =>
          this.safeFirestoreWrite(() =>
            setDoc(doc(db!, 'studentAcademicMarks', mark.id), mark, { merge: true })
          )
        )
      );
    }
    this.invalidateCache('marks');
    return res;
  }

  async getStudentAcademicMarks(studentId: string, options?: { skipCache?: boolean; requireFirestore?: boolean }): Promise<StudentAcademicMark[]> {
    if (!studentId) return [];
    const now = Date.now();
    const key = studentId.toUpperCase();
    if (!options?.skipCache) {
      const cached = this.iaMarksCache.get(key);
      if (cached && now - cached.timestamp < this.MARKS_TTL_MS) {
        this.cacheHitCount++;
        return cached.data;
      }
    }
    this.cacheMissCount++;

    if (!isFirebaseConfigured || !db || this.isCircuitOpen()) {
      if (options?.requireFirestore) {
        throw new Error(`Database temporarily unavailable (${this.lastFirestoreError || 'Firestore circuit breaker open'}). Please retry.`);
      }
      const marks = await this.fallback.getStudentAcademicMarks(studentId);
      this.iaMarksCache.set(key, { data: marks, timestamp: Date.now() });
      return marks;
    }

    try {
      const firestoreQueryOp = studentId === 'all'
        ? () => getDocs(collection(db!, 'studentAcademicMarks'))
        : () => getDocs(query(collection(db!, 'studentAcademicMarks'), where('studentId', '==', studentId)));

      const [snap, fallbackMarks] = await Promise.all([
        this.safeFirestoreQuery(firestoreQueryOp),
        this.fallback.getStudentAcademicMarks(studentId),
      ]);

      if (!snap && options?.requireFirestore) {
        throw new Error(`Database temporarily unavailable (${this.lastFirestoreError || 'Failed to read studentAcademicMarks'}). Please retry.`);
      }

      const mergedMap = new Map<string, StudentAcademicMark>();
      for (const fm of fallbackMarks) {
        mergedMap.set(fm.id, fm);
      }
      if (snap) {
        snap.forEach((d: any) => {
          const data = d.data() as StudentAcademicMark;
          const docId = d.id || data.id;
          mergedMap.set(docId, { ...data, id: docId });
        });
      }

      const marks = Array.from(mergedMap.values());
      if (snap || marks.length > 0) {
        this.iaMarksCache.set(key, { data: marks, timestamp: Date.now() });
      }
      return marks;
    } catch (err) {
      if (options?.requireFirestore) throw err;
      const marks = await this.fallback.getStudentAcademicMarks(studentId);
      if (marks.length > 0) {
        this.iaMarksCache.set(key, { data: marks, timestamp: Date.now() });
      }
      return marks;
    }
  }

  async editStudent(id: string, updates: Partial<Student>, actorId: string): Promise<Student> {
    const res = await this.fallback.editStudent(id, updates, actorId);
    if (db && isFirebaseConfigured && Date.now() >= this.firestoreOfflineUntil) {
      const safeUpdates = { ...updates };
      delete (safeUpdates as any).usn;
      delete (safeUpdates as any).id;
      await this.safeFirestoreWrite(() =>
        setDoc(doc(db!, 'students', id), {
          ...safeUpdates,
          riskLevel: res.riskLevel,
          riskReasons: res.riskReasons,
          updatedAt: new Date().toISOString(),
        }, { merge: true })
      );
    }
    this.invalidateCache('student');
    this.invalidateCache('marks');
    return res;
  }

  async deleteStudent(id: string, actorId: string): Promise<void> {
    await this.fallback.deleteStudent(id, actorId);
    if (db && isFirebaseConfigured && Date.now() >= this.firestoreOfflineUntil) {
      await this.safeFirestoreWrite(() =>
        setDoc(doc(db!, 'students', id), {
          academicStatus: 'Deactivated',
          status: 'DEACTIVATED',
          isDeactivated: true,
          mentorId: null,
          updatedAt: new Date().toISOString(),
        }, { merge: true })
      );
    }
    this.invalidateCache('all');
  }

  async getCalendarEvents(department?: string, semester?: string): Promise<AcademicCalendarEvent[]> {
    return this.fallback.getCalendarEvents(department, semester);
  }

  async createCalendarEvent(event: Omit<AcademicCalendarEvent, 'id' | 'createdAt'>): Promise<AcademicCalendarEvent> {
    return this.fallback.createCalendarEvent(event);
  }

  async getInterventions(filter?: { mentorId?: string; studentId?: string; status?: string }): Promise<InterventionRecord[]> {
    const now = Date.now();
    const key = `m:${filter?.mentorId || ''}|s:${filter?.studentId || ''}|st:${filter?.status || ''}`;
    const cached = this.interventionsCache.get(key);
    if (cached && now - cached.timestamp < this.WORKFLOW_TTL_MS) {
      this.cacheHitCount++;
      return cached.data;
    }
    this.cacheMissCount++;
    const list = await this.fallback.getInterventions(filter);
    this.interventionsCache.set(key, { data: list, timestamp: Date.now() });
    return list;
  }

  async createIntervention(intervention: Omit<InterventionRecord, 'id' | 'createdAt'>, actorId: string): Promise<InterventionRecord> {
    const created = await this.fallback.createIntervention(intervention, actorId);
    this.interventionsCache.clear();
    return created;
  }

  async updateInterventionStatus(interventionId: string, status: InterventionRecord['status'], actionsTaken?: string[], outcomeCgpa?: number, outcomeAttendance?: number, actorId?: string): Promise<InterventionRecord> {
    const updated = await this.fallback.updateInterventionStatus(interventionId, status, actionsTaken, outcomeCgpa, outcomeAttendance, actorId);
    this.interventionsCache.clear();
    return updated;
  }

  async getAIMeetingSummary(meetingId: string): Promise<AIMeetingSummary | null> {
    return this.fallback.getAIMeetingSummary(meetingId);
  }

  async saveAIMeetingSummary(summary: Omit<AIMeetingSummary, 'id' | 'createdAt'>): Promise<AIMeetingSummary> {
    return this.fallback.saveAIMeetingSummary(summary);
  }

  async getAIMemories(studentId: string): Promise<AIMemoryItem[]> {
    return this.fallback.getAIMemories(studentId);
  }

  async saveAIMemory(memory: Omit<AIMemoryItem, 'id' | 'createdAt'>): Promise<AIMemoryItem> {
    return this.fallback.saveAIMemory(memory);
  }

  async deleteAIMemory(memoryId: string): Promise<void> {
    return this.fallback.deleteAIMemory(memoryId);
  }

  async getMeetingFeedback(mentorId?: string, meetingId?: string): Promise<MeetingFeedback[]> {
    return this.fallback.getMeetingFeedback(mentorId, meetingId);
  }

  async submitMeetingFeedback(feedback: Omit<MeetingFeedback, 'id' | 'timestamp'>): Promise<MeetingFeedback> {
    return this.fallback.submitMeetingFeedback(feedback);
  }

  async resetDemoData(): Promise<void> {
    this.invalidateCache('all');
    return this.fallback.resetDemoData();
  }
}
