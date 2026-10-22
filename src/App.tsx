import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole, Mentor, Student } from './types';

// Landing Components
import { Navbar } from './components/landing/Navbar';
import { HeroSection } from './components/landing/HeroSection';
import { FeatureGrid } from './components/landing/FeatureGrid';
import { HowItWorks } from './components/landing/HowItWorks';
import { AboutSection } from './components/landing/AboutSection';
import { RoleLoginModal } from './components/landing/RoleLoginModal';

// Common Components
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { DemoDiagnosticPanel } from './components/common/DemoDiagnosticPanel';
import { Student360View } from './components/student360/Student360View';
import { GlobalSearchModal } from './components/governance/GlobalSearchModal';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';

// Admin Views (Phases 1, 2 & 3)
import { AdminDashboardOverview } from './components/admin/AdminDashboardOverview';
import { MentorManagement } from './components/admin/MentorManagement';
import { MentorDetailPage } from './components/admin/MentorDetailPage';
import { AllocationManager } from './components/admin/AllocationManager';
import { AdminAuditLogs } from './components/admin/AdminAuditLogs';
import { SystemReports } from './components/admin/SystemReports';
import { DepartmentAnalytics } from './components/analytics/DepartmentAnalytics';
import { MentorWorkloadAnalytics } from './components/analytics/MentorWorkloadAnalytics';
import { AdvancedCSVImportWizard } from './components/governance/AdvancedCSVImportWizard';
import { SystemHealthDashboard } from './components/governance/SystemHealthDashboard';
import { ExecutiveInstitutionOverview } from './components/governance/ExecutiveInstitutionOverview';
import { AcademicCalendarManager } from './components/academic/AcademicCalendarManager';
import { SemesterManager } from './components/academic/SemesterManager';
import { MentorEffectiveness } from './components/governance/MentorEffectiveness';
import { DataBackupExportManager } from './components/governance/DataBackupExportManager';
import { AcademicRiskEarlyWarning } from './components/analytics/AcademicRiskEarlyWarning';

// Mentor Views (Phases 1, 2 & 3)
import { MentorCommandCenter } from './components/mentor/MentorCommandCenter';
import { MenteesList } from './components/mentor/MenteesList';
import { AISafetyAlertsDashboard } from './components/mentor/AISafetyAlertsDashboard';
import { SmartMentorRecommendations } from './components/workflow/SmartMentorRecommendations';
import { InterventionCenter } from './components/intervention/InterventionCenter';
import { MentorActionCenter } from './components/mentor/MentorActionCenter';

// Student Views (Phases 1, 2 & 3)
import { StudentDashboardOverview } from './components/student/StudentDashboardOverview';
import { CareerPortfolioBuilder } from './components/student/CareerPortfolioBuilder';
import { AIMentorSection } from './components/student/AIMentorSection';
import { StudentGoalTracker } from './components/ai-tools/StudentGoalTracker';
import { AchievementBadges } from './components/ai-tools/AchievementBadges';
import { AIStudyPlanner } from './components/ai-tools/AIStudyPlanner';
import { AIResumeAssistant } from './components/ai-tools/AIResumeAssistant';
import { AICareerGuidance } from './components/ai-tools/AICareerGuidance';
import { StudentCareerPlacementIntelligence } from './components/student/StudentCareerPlacementIntelligence';
import { StudentProgressTimeline } from './components/workflow/StudentProgressTimeline';
import { AIMemoryManager } from './components/ai-intelligence/AIMemoryManager';
import { VisualCareerRoadmap } from './components/ai-intelligence/VisualCareerRoadmap';

// Shared Workflow Components
import { MeetingScheduler } from './components/workflow/MeetingScheduler';
import { FollowUpTaskManager } from './components/workflow/FollowUpTaskManager';
import { CentralResourceLibrary } from './components/resources/CentralResourceLibrary';

import { dbService } from './services/serviceFactory';
import { logLoginStage } from './utils/loginPerfLogger';

const MainApp: React.FC = () => {
  const { user, logout } = useAuth();

  // Landing Page Modals & Nav
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [initialRoleForLogin, setInitialRoleForLogin] = useState<UserRole>('student');

  // Dashboard Active Navigation Section
  const [activeSection, setActiveSection] = useState('overview');

  // Shared Modals State
  const [selectedStudent360Id, setSelectedStudent360Id] = useState<string | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Student Profile State
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);

  React.useEffect(() => {
    if (!user) {
      setStudentProfile(null);
      return;
    }

    const tNav = performance.now();
    logLoginStage('6_navigateToDashboard', performance.now() - tNav, 'SUCCESS', `role=${user.role}`);

    if (user.role === 'student') {
      let isMounted = true;
      const resolveStudent = async () => {
        try {
          const direct =
            (await dbService.getStudentById(user.id)) ||
            (user.email ? await dbService.getStudentById(user.email) : null);

          if (!isMounted) return;
          if (direct) {
            setStudentProfile(direct);
          } else {
            setStudentProfile({
              id: user.id,
              userId: user.id,
              usn: user.id,
              name: user.name || 'Student',
              email: user.email,
              phone: user.phone || '',
              parentPhone: user.phone || '',
              mentorId: null,
              department: user.department || 'Computer Science & Engineering',
              program: 'B.Tech',
              year: '3rd Year',
              semester: 'Semester 6',
              section: 'A',
              admissionYear: '2023',
              cgpa: 8.0,
              attendance: 85,
              financialScore: 5,
              studyHours: 15,
              previousYearBacklogs: 0,
              currentBacklogs: 0,
              academicStatus: 'Active',
              riskLevel: 'GOOD_PERFORMANCE',
              riskReasons: [],
              createdAt: new Date().toISOString(),
            });
          }
        } catch {
          if (!isMounted) return;
          setStudentProfile({
            id: user.id,
            userId: user.id,
            usn: user.id,
            name: user.name || 'Student',
            email: user.email,
            phone: user.phone || '',
            parentPhone: user.phone || '',
            mentorId: null,
            department: user.department || 'Computer Science & Engineering',
            program: 'B.Tech',
            year: '3rd Year',
            semester: 'Semester 6',
            section: 'A',
            admissionYear: '2023',
            cgpa: 8.0,
            attendance: 85,
            financialScore: 5,
            studyHours: 15,
            previousYearBacklogs: 0,
            currentBacklogs: 0,
            academicStatus: 'Active',
            riskLevel: 'GOOD_PERFORMANCE',
            riskReasons: [],
            createdAt: new Date().toISOString(),
          });
        }
      };
      resolveStudent();
      return () => {
        isMounted = false;
      };
    }
  }, [user]);

  const handleOpenLogin = (role: UserRole = 'student') => {
    setInitialRoleForLogin(role);
    setIsLoginModalOpen(true);
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 1. PUBLIC LANDING PAGE (If not logged in)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Navbar onOpenLogin={handleOpenLogin} onNavigateSection={scrollToSection} />
        <main className="flex-1">
          <HeroSection onOpenLogin={handleOpenLogin} />
          <FeatureGrid />
          <HowItWorks />
          <AboutSection />
        </main>

        <footer className="py-8 border-t border-slate-800/80 bg-slate-950 text-center text-xs text-slate-400">
          <p>© 2026 EduMentorX Platform. Built for Production EdTech Management & AI Guidance.</p>
        </footer>

        <RoleLoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          initialRole={initialRoleForLogin}
        />
      </div>
    );
  }

  // 2. AUTHENTICATED PORTAL DASHBOARDS
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      <ForcePasswordChangeModal />
      {/* Sidebar Navigation */}
      <Sidebar
        role={user.role}
        activeSection={activeSection}
        onSelectSection={(section) => {
          setActiveSection(section);
          setSelectedMentor(null);
        }}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        onLogout={logout}
        userName={user.name}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          userId={user.id}
          userName={user.name}
          role={user.role}
          department={user.department}
          avatarUrl={user.avatarUrl}
          onNavigateSection={(sec) => setActiveSection(sec)}
        />
        <DemoDiagnosticPanel />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
          {/* ADMIN PORTAL SECTIONS */}
          {user.role === 'admin' && (
            <>
              {activeSection === 'executive' && <ExecutiveInstitutionOverview />}
              {activeSection === 'overview' && <AdminDashboardOverview />}
              {activeSection === 'academic-risk' && (
                <AcademicRiskEarlyWarning
                  userRole={user.role}
                  userId={user.id}
                  onViewStudent360={(stId) => setSelectedStudent360Id(stId)}
                  onInitiateIntervention={() => setActiveSection('allocation')}
                />
              )}
              {activeSection === 'academic-calendar' && (
                <AcademicCalendarManager userRole={user.role} userId={user.id} />
              )}
              {activeSection === 'semester-manager' && <SemesterManager />}
              {activeSection === 'mentors' && (
                selectedMentor ? (
                  <MentorDetailPage
                    mentor={selectedMentor}
                    onBack={() => setSelectedMentor(null)}
                    onViewStudent360={(stId) => setSelectedStudent360Id(stId)}
                    onReassignStudent={() => setActiveSection('allocation')}
                    actorId={user.id}
                  />
                ) : (
                  <MentorManagement onSelectMentor={(m) => setSelectedMentor(m)} actorId={user.id} />
                )
              )}
              {activeSection === 'allocation' && (
                <AllocationManager actorId={user.id} onViewStudent360={(stId) => setSelectedStudent360Id(stId)} />
              )}
              {activeSection === 'mentor-effectiveness' && <MentorEffectiveness />}
              {activeSection === 'analytics' && <DepartmentAnalytics />}
              {activeSection === 'workload' && <MentorWorkloadAnalytics />}
              {activeSection === 'csv-import' && <AdvancedCSVImportWizard actorId={user.id} />}
              {activeSection === 'resources' && (
                <CentralResourceLibrary userRole={user.role} userId={user.id} userName={user.name} department={user.department} />
              )}
              {activeSection === 'meetings' && (
                <MeetingScheduler userRole={user.role} userId={user.id} userName={user.name} />
              )}
              {activeSection === 'tasks' && (
                <FollowUpTaskManager userRole={user.role} userId={user.id} userName={user.name} />
              )}
              {activeSection === 'backup-export' && <DataBackupExportManager />}
              {activeSection === 'audit-logs' && <AdminAuditLogs />}
              {activeSection === 'system-health' && <SystemHealthDashboard />}
              {activeSection === 'reports' && <SystemReports />}
            </>
          )}

          {/* MENTOR PORTAL SECTIONS */}
          {user.role === 'mentor' && (
            <>
              {activeSection === 'overview' && (
                <MentorCommandCenter
                  mentorId={user.id}
                  mentorName={user.name}
                  onNavigate={(sec) => setActiveSection(sec)}
                  onViewStudent360={(stId) => setSelectedStudent360Id(stId)}
                  actorId={user.id}
                />
              )}
              {activeSection === 'mentees' && (
                <MenteesList
                  mentorId={user.id}
                  mentorName={user.name}
                  onViewStudent360={(stId) => setSelectedStudent360Id(stId)}
                  actorId={user.id}
                />
              )}
              {activeSection === 'academic-risk' && (
                <AcademicRiskEarlyWarning
                  userRole={user.role}
                  userId={user.id}
                  onViewStudent360={(stId) => setSelectedStudent360Id(stId)}
                  onInitiateIntervention={() => setActiveSection('intervention-center')}
                />
              )}
              {activeSection === 'intervention-center' && (
                <InterventionCenter
                  mentorId={user.id}
                  mentorName={user.name}
                  onViewStudent360={(stId) => setSelectedStudent360Id(stId)}
                  actorId={user.id}
                />
              )}
              {activeSection === 'recommendations' && (
                <SmartMentorRecommendations mentorId={user.id} onViewStudent360={(stId) => setSelectedStudent360Id(stId)} />
              )}
              {activeSection === 'meetings' && (
                <MeetingScheduler userRole={user.role} userId={user.id} userName={user.name} />
              )}
              {activeSection === 'tasks' && (
                <FollowUpTaskManager userRole={user.role} userId={user.id} userName={user.name} />
              )}
              {activeSection === 'resources' && (
                <CentralResourceLibrary userRole={user.role} userId={user.id} userName={user.name} department={user.department} />
              )}
              {activeSection === 'safety-alerts' && (
                <AISafetyAlertsDashboard mentorId={user.id} actorId={user.id} />
              )}
            </>
          )}

          {/* STUDENT PORTAL SECTIONS */}
          {user.role === 'student' && studentProfile && (
            <>
              {activeSection === 'overview' && (
                <StudentDashboardOverview
                  student={studentProfile}
                  onOpenAIMentor={() => setActiveSection('ai-mentor')}
                />
              )}
              {activeSection === 'ai-mentor' && <AIMentorSection student={studentProfile} />}
              {activeSection === 'career-roadmap' && <VisualCareerRoadmap />}
              {activeSection === 'ai-memory' && <AIMemoryManager student={studentProfile} />}
              {activeSection === 'study-planner' && <AIStudyPlanner student={studentProfile} />}
              {activeSection === 'resume-assistant' && <AIResumeAssistant student={studentProfile} />}
              {activeSection === 'career-guidance' && <StudentCareerPlacementIntelligence student={studentProfile} />}
              {activeSection === 'goals' && (
                <div className="space-y-6">
                  <StudentGoalTracker studentId={studentProfile.id} userRole={user.role} />
                  <AchievementBadges studentId={studentProfile.id} />
                </div>
              )}
              {activeSection === 'academic-calendar' && (
                <AcademicCalendarManager userRole={user.role} userId={user.id} department={studentProfile.department} />
              )}
              {activeSection === 'meetings' && (
                <MeetingScheduler userRole={user.role} userId={user.id} userName={user.name} />
              )}
              {activeSection === 'tasks' && (
                <FollowUpTaskManager userRole={user.role} userId={user.id} userName={user.name} />
              )}
              {activeSection === 'resources' && (
                <CentralResourceLibrary userRole={user.role} userId={user.id} userName={user.name} department={studentProfile.department} />
              )}
              {activeSection === 'portfolio' && <CareerPortfolioBuilder studentId={studentProfile.id} />}
              {activeSection === 'timeline' && <StudentProgressTimeline studentId={studentProfile.id} />}
            </>
          )}
        </main>
      </div>

      {/* Shared Modals */}
      {selectedStudent360Id && (
        <Student360View
          isOpen={Boolean(selectedStudent360Id)}
          onClose={() => setSelectedStudent360Id(null)}
          studentId={selectedStudent360Id}
          userRole={user.role}
        />
      )}

      {isGlobalSearchOpen && (
        <GlobalSearchModal
          isOpen={isGlobalSearchOpen}
          onClose={() => setIsGlobalSearchOpen(false)}
          userRole={user.role}
          onSelectStudent={(stId) => setSelectedStudent360Id(stId)}
          onSelectMentor={(m) => setSelectedMentor(m)}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
