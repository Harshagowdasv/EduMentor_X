// Core Data Models and Domain Interfaces for EduMentorX (Phases 1, 2, 3 & Expanded Institutional Biodata)

export type UserRole = 'admin' | 'mentor' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
  phone?: string;
  mustChangePassword?: boolean;
  mentorId?: string;
  userId?: string;
  studentId?: string;
  usn?: string;
}

export interface Mentor {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  staffId: string;
  activeMenteesCount: number;
  status: 'active' | 'deactivated' | 'inactive';
  createdAt: string;
}

export type RiskLevel = 'GOOD_PERFORMANCE' | 'NEEDS_MONITORING' | 'HIGH_PRIORITY';

export interface ExplainableRisk {
  status: RiskLevel;
  reasons: string[];
  cgpaTrend: 'improving' | 'stable' | 'declining';
  attendanceTrend: 'improving' | 'stable' | 'declining';
  contributingFactors: {
    cgpaScore: number;
    attendanceScore: number;
    backlogsCount: number;
    studyHoursPerWeek: number;
    financialScore: number;
    recencyScore: number;
  };
}

export interface Student {
  id: string;
  userId: string;
  usn: string;
  name: string;
  email: string;
  phone: string;
  parentPhone: string;

  // Expanded Institutional Biodata
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;

  address?: string;
  city?: string;
  state?: string;
  pincode?: string;

  department: string;
  program?: string;
  year?: string | number;
  semester?: string | number;
  section?: string;
  admissionYear?: string | number;

  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;

  mentorId: string | null;
  mentorName?: string;
  mentorEmail?: string;

  cgpa: number;
  attendance: number;
  financialScore: number;
  studyHours: number;

  previousYearBacklogs: number;
  currentBacklogs?: number;
  academicStatus?: string; // e.g., 'Active', 'Probation', 'Graduated'

  careerGoal?: string;
  skills?: string[];

  github?: string;
  leetcode?: string;
  hackerrank?: string;
  codechef?: string;
  linkedin?: string;
  resumeUrl?: string;

  riskLevel: RiskLevel;
  riskReasons: string[];
  lastInteractionDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AllocationHistory {
  id: string;
  studentId: string;
  studentUsn: string;
  studentName: string;
  previousMentorId: string | null;
  previousMentorName?: string;
  newMentorId: string;
  newMentorName: string;
  changedBy: string;
  timestamp: string;
  reason?: string;
}

export interface MentorNote {
  id: string;
  studentId: string;
  mentorId: string;
  mentorName: string;
  content: string;
  category: 'academic' | 'career' | 'personal' | 'general';
  timestamp: string;
}

export interface Message {
  id: string;
  senderRole: 'mentor' | 'student' | 'ai';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface MentorshipConversation {
  id: string;
  studentId: string;
  mentorId: string;
  messages: Message[];
  updatedAt: string;
}

export interface AssignedCourse {
  id: string;
  studentId: string;
  title: string;
  description?: string;
  platform: string;
  url: string;
  completionPercentage?: number;
  completedActivitiesCount?: number;
  totalActivitiesCount?: number;
  startDate?: string;
  endDate?: string;
  status: 'assigned' | 'in_progress' | 'completed';
  assignedByMentorId: string;
  assignedByMentorName?: string;
  assignedDate: string;
}

export interface AssignedActivity {
  id: string;
  studentId: string;
  title: string;
  description: string;
  dueDate: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'pending' | 'submitted' | 'approved';
  assignedDate: string;
}

export interface SharedResource {
  id: string;
  studentId?: string;
  department?: string;
  title: string;
  description?: string;
  subject?: string;
  fileUrl: string;
  fileType: 'PDF' | 'Document' | 'Video' | 'Website' | 'Course' | 'Presentation' | 'Coding Problem';
  category: 'Notes' | 'Assignment' | 'Syllabus' | 'Reference' | 'Other';
  tags?: string[];
  sharedByMentorId: string;
  sharedByMentorName: string;
  timestamp: string;
}

export interface Extracurricular {
  id: string;
  activityName: string;
  organization: string;
  role: string;
  date: string;
  description: string;
}

export interface Certificate {
  id: string;
  title: string;
  organization: string;
  date: string;
  certificateUrl: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
}

export interface CodingProfiles {
  github?: string;
  leetcode?: string;
  hackerrank?: string;
  codechef?: string;
  codeforces?: string;
  linkedin?: string;
}

export interface StudentPortfolio {
  studentId: string;
  extracurriculars: Extracurricular[];
  certificates: Certificate[];
  projects: Project[];
  codingProfiles: CodingProfiles;
  resumeUrl?: string;
  resumeName?: string;
  profileCompleteness: number;
  missingSuggestions: string[];
}

export type SafetySeverity = 'NORMAL' | 'LOW_CONCERN' | 'HIGH_CONCERN' | 'IMMEDIATE_DANGER';

export interface AISafetyAlert {
  id: string;
  studentId: string;
  studentName: string;
  studentUsn: string;
  mentorId: string;
  severity: SafetySeverity;
  triggerMessage: string;
  contextSummary: string;
  confidenceReasoning: string;
  status: 'NEW' | 'REVIEWING' | 'CONTACTED' | 'RESOLVED';
  timestamp: string;
  reviewerNotes?: string;
  auditLogId?: string;
}

export type NotificationCategory =
  | 'ACADEMIC'
  | 'MENTOR'
  | 'TASK'
  | 'COURSE'
  | 'RESOURCE'
  | 'MEETING'
  | 'SAFETY'
  | 'SYSTEM'
  | 'INTERVENTION';

export interface AppNotification {
  id: string;
  recipientUserId: string;
  recipientRole: UserRole;
  title: string;
  message: string;
  type: 'safety_alert' | 'allocation' | 'resource' | 'course' | 'meeting' | 'task' | 'general' | 'intervention';
  category?: NotificationCategory;
  severity?: SafetySeverity;
  linkSection?: string;
  read: boolean;
  timestamp: string;
}

export type AuditActionType =
  | 'CREATE_MENTOR'
  | 'DEACTIVATE_MENTOR'
  | 'REACTIVATE_MENTOR'
  | 'DELETE_MENTOR'
  | 'CREATE_STUDENT'
  | 'IMPORT_STUDENTS'
  | 'ALLOCATE_STUDENT'
  | 'REASSIGN_STUDENT'
  | 'UPDATE_STUDENT'
  | 'UPDATE_MENTOR'
  | 'UPLOAD_RESOURCE'
  | 'VIEW_SAFETY_ALERT'
  | 'UPDATE_SAFETY_ALERT'
  | 'CREATE_MEETING'
  | 'CREATE_TASK'
  | 'UPDATE_GOAL'
  | 'CREATE_INTERVENTION'
  | 'UPDATE_INTERVENTION'
  | 'CSV_IMPORT_STARTED'
  | 'CSV_IMPORT_COMPLETED'
  | 'CSV_IMPORT_FAILED'
  | 'STUDENT_CREATED_FROM_CSV'
  | 'STUDENT_UPDATED_FROM_CSV'
  | 'STUDENT_SKIPPED_FROM_CSV'
  | 'MENTOR_ALLOCATION_FROM_CSV'
  | 'IMPORT_IA_MARKS'
  | 'EDIT_STUDENT'
  | 'DELETE_STUDENT';

export interface AdminAuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditActionType;
  targetType: 'Mentor' | 'Student' | 'Allocation' | 'Resource' | 'SafetyAlert' | 'CSVImport' | 'Meeting' | 'Task' | 'Intervention' | 'StudentAcademicMark';
  targetId: string;
  timestamp: string;
  previousValue?: any;
  newValue?: any;
  details?: string;
}

export interface CSVStudentRow {
  [key: string]: any;
}

export interface CSVRowValidationResult {
  rowNumber: number;
  usn: string;
  name: string;
  email: string;
  department: string;
  isValid: boolean;
  status: 'VALID' | 'WARNING' | 'ERROR';
  warnings: string[];
  errors: string[];
  resolvedMentorId?: string | null;
  resolvedMentorName?: string;
  normalizedStudent?: Partial<Student>;
  rawData: Record<string, any>;
}

export interface CSVImportResult {
  totalRows: number;
  successfulCount: number;
  importedCount?: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  duplicateCount: number;
  mentorAllocationErrorCount: number;
  details?: CSVRowValidationResult[];
  errors: {
    rowNumber: number;
    usn?: string;
    name?: string;
    errorType?: string;
    reason: string;
    field?: string;
    suggestedFix?: string;
    rawData?: any;
  }[];
  importedStudents: Student[];
}

export interface Meeting {
  id: string;
  studentId: string;
  studentName: string;
  mentorId: string;
  mentorName: string;
  title: string;
  date: string;
  time: string;
  agenda: string;
  notes?: string;
  status: 'upcoming' | 'completed' | 'rescheduled' | 'cancelled';
  createdAt: string;
}

export interface FollowUpTask {
  id: string;
  studentId: string;
  studentName: string;
  mentorId: string;
  mentorName: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  createdAt: string;
  interventionId?: string;
}

export interface StudentGoal {
  id: string;
  studentId: string;
  type: 'academic' | 'career' | 'coding';
  title: string;
  targetValue: string;
  targetDate: string;
  currentProgress: number;
  status: 'active' | 'completed';
  mentorRecommendation?: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  studentId: string;
  badgeKey: 'portfolio_complete' | 'study_streak' | 'course_completed' | 'coding_100' | 'goal_completed' | 'certificate_added';
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface ScheduleItem {
  timeSlot: string;
  subject: string;
  topic: string;
  completed: boolean;
}

export interface StudyPlanDay {
  day: string;
  schedule: ScheduleItem[];
}

export interface StudyPlan {
  id: string;
  studentId: string;
  examDate: string;
  subjects: string[];
  availableHoursPerDay: number;
  targetScore: string;
  planDays: StudyPlanDay[];
  createdAt: string;
}

export interface ResumeAnalysis {
  id: string;
  studentId: string;
  score: number;
  strengths: string[];
  suggestions: string[];
  missingSections: string[];
  analyzedAt: string;
}

export type PlacementReadinessStatus =
  | 'INSUFFICIENT_DATA'
  | 'EARLY_STAGE'
  | 'INTERMEDIATE'
  | 'PLACEMENT_READY';

export interface SkillGapItem {
  skill: string;
  category: 'strong' | 'needs_improvement' | 'missing';
  priority: 'CRITICAL' | 'RECOMMENDED' | 'OPTIONAL';
}

export interface CareerGuidance {
  id: string;
  studentId: string;
  targetRole?: string;
  targetDomain?: string;
  suggestedPaths: string[];
  skillGaps: string[];
  skillDetails?: SkillGapItem[];
  recommendedTopics: string[];
  projectIdeas: string[];
  certificationsToAcquire?: string[];
  readinessScore?: number;
  readinessStatus?: PlacementReadinessStatus;
  readinessReasons?: string[];
  generatedAt: string;
}

export interface CSVImportHistoryRecord {
  id: string;
  filename: string;
  uploadedBy: string;
  timestamp: string;
  totalRecords: number;
  successfulCount: number;
  failedCount: number;
  updatedCount: number;
  skippedCount: number;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
}

export interface StudentAcademicMark {
  id: string;
  studentId: string;
  studentUsn: string;
  studentName: string;
  academicYear: string;
  semester: string;
  subjectCode: string;
  subjectName: string;
  ia1Marks: number;
  ia2Marks: number;
  maxMarks?: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface IAMarksImportResult {
  totalRows: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: { rowNumber: number; usn: string; subjectCode: string; reason: string }[];
  details: { rowNumber: number; usn: string; name: string; subjectCode: string; status: 'NEW' | 'UPDATE' | 'ERROR'; reason?: string }[];
}

export interface AcademicYear {
  id: string;
  yearName: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export interface Semester {
  id: string;
  academicYearId: string;
  name: string;
  number: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export type EventType =
  | 'EXAM'
  | 'ASSIGNMENT'
  | 'PROJECT'
  | 'PLACEMENT'
  | 'WORKSHOP'
  | 'EVENT'
  | 'HOLIDAY'
  | 'OTHER';

export interface AcademicCalendarEvent {
  id: string;
  title: string;
  description: string;
  eventType: EventType;
  startDate: string;
  endDate: string;
  department?: string;
  semester?: string;
  createdBy: string;
  createdAt: string;
}

export type StudentTrendStatus = 'STABLE' | 'IMPROVING' | 'DECLINING' | 'SIGNIFICANT_DECLINE';

export type InterventionCategory =
  | 'Academic'
  | 'Attendance'
  | 'Backlog'
  | 'Study Discipline'
  | 'Financial'
  | 'Career'
  | 'General Support';

export type InterventionStatus =
  | 'IDENTIFIED'
  | 'CONTACT_PENDING'
  | 'MEETING_SCHEDULED'
  | 'IN_PROGRESS'
  | 'MONITORING'
  | 'RESOLVED'
  | 'CLOSED';

export interface InterventionRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentUsn: string;
  mentorId: string;
  mentorName: string;
  createdAt: string;
  category?: InterventionCategory;
  description?: string;
  followUpDate?: string;
  priority: RiskLevel;
  triggerReasons: string[];
  status: InterventionStatus;
  actionsTaken: string[];
  meetingId?: string;
  meetingNotes?: string;
  followUpTaskIds: string[];
  baselineCgpa: number;
  baselineAttendance: number;
  targetCgpa?: number;
  targetAttendance?: number;
  outcomeCgpa?: number;
  outcomeAttendance?: number;
  outcomeNotes?: string;
  resolvedAt?: string;
}

export interface AIMeetingSummary {
  id: string;
  meetingId: string;
  studentId: string;
  mentorId: string;
  summaryText: string;
  keyConcerns: string[];
  actionItems: string[];
  followUpDate?: string;
  approvedByMentor: boolean;
  createdAt: string;
}

export interface AIMemoryItem {
  id: string;
  studentId: string;
  key: string;
  category: 'career' | 'academic' | 'study_preference' | 'weakness';
  value: string;
  approvedByStudent: boolean;
  createdAt: string;
}

export interface MeetingFeedback {
  id: string;
  meetingId: string;
  studentId: string;
  mentorId: string;
  rating: number;
  concernAddressed: 'Yes' | 'Partially' | 'No';
  comment?: string;
  timestamp: string;
}
