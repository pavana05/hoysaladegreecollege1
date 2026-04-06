import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardRedirect from "./components/DashboardRedirect";

import DashboardLayout from "./components/DashboardLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load public pages
const About = lazy(() => import("./pages/About"));
const Courses = lazy(() => import("./pages/Courses"));
const Admissions = lazy(() => import("./pages/Admissions"));
const Apply = lazy(() => import("./pages/Apply"));
const Departments = lazy(() => import("./pages/Departments"));
const Faculty = lazy(() => import("./pages/Faculty"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Notices = lazy(() => import("./pages/Notices"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Contact = lazy(() => import("./pages/Contact"));
const Support = lazy(() => import("./pages/Support"));
const Login = lazy(() => import("./pages/Login"));
const StudentAbsent = lazy(() => import("./pages/StudentAbsent"));
const Management = lazy(() => import("./pages/Management"));
const Committees = lazy(() => import("./pages/Committees"));
const AddOnCourses = lazy(() => import("./pages/AddOnCourses"));
const ApplicationStatus = lazy(() => import("./pages/ApplicationStatus"));
const Gallery = lazy(() => import("./pages/Gallery"));
const PreviousYearPapers = lazy(() => import("./pages/PreviousYearPapers"));
const DownloadApp = lazy(() => import("./pages/Download"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Register = lazy(() => import("./pages/Register"));
const Credits = lazy(() => import("./pages/Credits"));
const Offers = lazy(() => import("./pages/Offers"));
const Placements = lazy(() => import("./pages/Placements"));
const CampusPage = lazy(() => import("./pages/Campus"));
const Alumni = lazy(() => import("./pages/Alumni"));
const PurchaseWebsite = lazy(() => import("./pages/PurchaseWebsite"));
const FAQ = lazy(() => import("./pages/FAQ"));

// Lazy load student dashboard
const StudentDashboard = lazy(() => import("./pages/dashboard/StudentDashboard"));
const StudentProfile = lazy(() => import("./pages/dashboard/student/StudentProfile"));
const StudentAttendance = lazy(() => import("./pages/dashboard/student/StudentAttendance"));
const StudentMarks = lazy(() => import("./pages/dashboard/student/StudentMarks"));
const StudentTimetable = lazy(() => import("./pages/dashboard/student/StudentTimetable"));
const StudentNotices = lazy(() => import("./pages/dashboard/student/StudentNotices"));
const StudentMaterials = lazy(() => import("./pages/dashboard/student/StudentMaterials"));
const StudentAnnouncements = lazy(() => import("./pages/dashboard/student/StudentAnnouncements"));
const StudentFees = lazy(() => import("./pages/dashboard/student/StudentFees"));
const StudentMessages = lazy(() => import("./pages/dashboard/student/StudentMessages"));
const StudentGamification = lazy(() => import("./pages/dashboard/student/StudentGamification"));
const StudentFeedback = lazy(() => import("./pages/dashboard/student/StudentFeedback"));
const StudentNotifications = lazy(() => import("./pages/dashboard/student/StudentNotifications"));

// Lazy load teacher dashboard
const TeacherDashboard = lazy(() => import("./pages/dashboard/TeacherDashboard"));
const TeacherStudents = lazy(() => import("./pages/dashboard/teacher/TeacherStudents"));
const TeacherAttendance = lazy(() => import("./pages/dashboard/teacher/TeacherAttendance"));
const TeacherMarks = lazy(() => import("./pages/dashboard/teacher/TeacherMarks"));
const TeacherAbsent = lazy(() => import("./pages/dashboard/teacher/TeacherAbsent"));
const TeacherMaterials = lazy(() => import("./pages/dashboard/teacher/TeacherMaterials"));
const TeacherNotices = lazy(() => import("./pages/dashboard/teacher/TeacherNotices"));
const TeacherTimetable = lazy(() => import("./pages/dashboard/teacher/TeacherTimetable"));
const TeacherAnnouncements = lazy(() => import("./pages/dashboard/teacher/TeacherAnnouncements"));
const TeacherAttendanceOverview = lazy(() => import("./pages/dashboard/teacher/TeacherAttendanceOverview"));
const TeacherMessages = lazy(() => import("./pages/dashboard/teacher/TeacherMessages"));

// Lazy load principal dashboard
const PrincipalDashboard = lazy(() => import("./pages/dashboard/PrincipalDashboard"));
const PrincipalTopStudents = lazy(() => import("./pages/dashboard/principal/PrincipalTopStudents"));
const PrincipalEvents = lazy(() => import("./pages/dashboard/principal/PrincipalEvents"));
const PrincipalNotices = lazy(() => import("./pages/dashboard/principal/PrincipalNotices"));
const PrincipalCourses = lazy(() => import("./pages/dashboard/principal/PrincipalCourses"));
const PrincipalDepartments = lazy(() => import("./pages/dashboard/principal/PrincipalDepartments"));
const PrincipalTeachers = lazy(() => import("./pages/dashboard/principal/PrincipalTeachers"));
const PrincipalStudents = lazy(() => import("./pages/dashboard/principal/PrincipalStudents"));

// Lazy load admin dashboard
const AdminDashboard = lazy(() => import("./pages/dashboard/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/dashboard/admin/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/dashboard/admin/AdminSettings"));
const AdminTopRankers = lazy(() => import("./pages/dashboard/admin/AdminTopRankers"));
const AdminTimetable = lazy(() => import("./pages/dashboard/admin/AdminTimetable"));
const AdminEvents = lazy(() => import("./pages/dashboard/admin/AdminEvents"));
const AdminFaculty = lazy(() => import("./pages/dashboard/admin/AdminFaculty"));
const AdminBannerAndPapers = lazy(() => import("./pages/dashboard/admin/AdminBannerAndPapers"));
const AdminFeeManagement = lazy(() => import("./pages/dashboard/admin/AdminFeeManagement"));
const AdminPostNotice = lazy(() => import("./pages/dashboard/admin/AdminPostNotice"));
const AdminAttendanceHub = lazy(() => import("./pages/dashboard/admin/AdminAttendanceHub"));
const AdminGallery = lazy(() => import("./pages/dashboard/admin/AdminGallery"));
const AdminAddStaff = lazy(() => import("./pages/dashboard/admin/AdminAddStaff"));
const AdminApproveAdmins = lazy(() => import("./pages/dashboard/admin/AdminApproveAdmins"));
const AdminStudentFeeDetail = lazy(() => import("./pages/dashboard/admin/AdminStudentFeeDetail"));
const AdminStudentDetail = lazy(() => import("./pages/dashboard/admin/AdminStudentDetail"));
const AdminNotificationBroadcast = lazy(() => import("./pages/dashboard/admin/AdminNotificationBroadcast"));
const AdminHallTickets = lazy(() => import("./pages/dashboard/admin/AdminHallTickets"));
const AdminCareerHub = lazy(() => import("./pages/dashboard/admin/AdminCareerHub"));
const AdminFeedbackAndLogs = lazy(() => import("./pages/dashboard/admin/AdminFeedbackAndLogs"));
const AdminToolsHub = lazy(() => import("./pages/dashboard/admin/AdminToolsHub"));
const AdminInboxHub = lazy(() => import("./pages/dashboard/admin/AdminInboxHub"));
const AdminAcademicsHub = lazy(() => import("./pages/dashboard/admin/AdminAcademicsHub"));
const AdminPromotionHub = lazy(() => import("./pages/dashboard/admin/AdminPromotionHub"));
const AdminAcademicOverview = lazy(() => import("./pages/dashboard/admin/AdminAcademicOverview"));
const StudentJobBoard = lazy(() => import("./pages/dashboard/student/StudentJobBoard"));
const StudentScholarships = lazy(() => import("./pages/dashboard/student/StudentScholarships"));

const queryClient = new QueryClient();

const SuspenseWrap = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
    {children}
  </Suspense>
);

const StudentRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allowedRoles={["student"]}><DashboardLayout><SuspenseWrap>{children}</SuspenseWrap></DashboardLayout></ProtectedRoute>
);
const TeacherRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allowedRoles={["teacher"]}><DashboardLayout><SuspenseWrap>{children}</SuspenseWrap></DashboardLayout></ProtectedRoute>
);
const PrincipalRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allowedRoles={["principal"]}><DashboardLayout><SuspenseWrap>{children}</SuspenseWrap></DashboardLayout></ProtectedRoute>
);
const AdminRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allowedRoles={["admin"]}><DashboardLayout><SuspenseWrap>{children}</SuspenseWrap></DashboardLayout></ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public pages */}
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<SuspenseWrap><About /></SuspenseWrap>} />
              <Route path="/courses" element={<SuspenseWrap><Courses /></SuspenseWrap>} />
              <Route path="/admissions" element={<SuspenseWrap><Admissions /></SuspenseWrap>} />
              <Route path="/apply" element={<SuspenseWrap><Apply /></SuspenseWrap>} />
              <Route path="/departments" element={<SuspenseWrap><Departments /></SuspenseWrap>} />
              <Route path="/faculty" element={<SuspenseWrap><Faculty /></SuspenseWrap>} />
              <Route path="/events" element={<SuspenseWrap><Events /></SuspenseWrap>} />
              <Route path="/events/:eventId" element={<SuspenseWrap><EventDetail /></SuspenseWrap>} />
              <Route path="/notices" element={<SuspenseWrap><Notices /></SuspenseWrap>} />
              <Route path="/achievements" element={<SuspenseWrap><Achievements /></SuspenseWrap>} />
              <Route path="/contact" element={<SuspenseWrap><Contact /></SuspenseWrap>} />
              <Route path="/support" element={<SuspenseWrap><Support /></SuspenseWrap>} />
              <Route path="/management" element={<SuspenseWrap><Management /></SuspenseWrap>} />
              <Route path="/committees" element={<SuspenseWrap><Committees /></SuspenseWrap>} />
              <Route path="/addon-courses" element={<SuspenseWrap><AddOnCourses /></SuspenseWrap>} />
              <Route path="/student-absent" element={<SuspenseWrap><StudentAbsent /></SuspenseWrap>} />
              <Route path="/application-status" element={<SuspenseWrap><ApplicationStatus /></SuspenseWrap>} />
              <Route path="/previous-year-papers" element={<SuspenseWrap><PreviousYearPapers /></SuspenseWrap>} />
              <Route path="/gallery" element={<SuspenseWrap><Gallery /></SuspenseWrap>} />
              <Route path="/download" element={<SuspenseWrap><DownloadApp /></SuspenseWrap>} />
              <Route path="/credits" element={<SuspenseWrap><Credits /></SuspenseWrap>} />
              <Route path="/offers" element={<SuspenseWrap><Offers /></SuspenseWrap>} />
              <Route path="/placements" element={<SuspenseWrap><Placements /></SuspenseWrap>} />
              <Route path="/campus" element={<SuspenseWrap><CampusPage /></SuspenseWrap>} />
              <Route path="/alumni" element={<SuspenseWrap><Alumni /></SuspenseWrap>} />
              <Route path="/purchase" element={<SuspenseWrap><PurchaseWebsite /></SuspenseWrap>} />
              <Route path="/faq" element={<SuspenseWrap><FAQ /></SuspenseWrap>} />
            </Route>

            <Route path="/login" element={<SuspenseWrap><Login /></SuspenseWrap>} />
            <Route path="/forgot-password" element={<SuspenseWrap><ForgotPassword /></SuspenseWrap>} />
            <Route path="/reset-password" element={<SuspenseWrap><ResetPassword /></SuspenseWrap>} />
            <Route path="/register" element={<SuspenseWrap><Register /></SuspenseWrap>} />

            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={["student", "teacher", "principal", "admin"]}>
                <DashboardRedirect />
              </ProtectedRoute>
            } />

            {/* Student */}
            <Route path="/dashboard/student" element={<StudentRoute><StudentDashboard /></StudentRoute>} />
            <Route path="/dashboard/student/profile" element={<StudentRoute><StudentProfile /></StudentRoute>} />
            <Route path="/dashboard/student/attendance" element={<StudentRoute><StudentAttendance /></StudentRoute>} />
            <Route path="/dashboard/student/marks" element={<StudentRoute><StudentMarks /></StudentRoute>} />
            <Route path="/dashboard/student/timetable" element={<StudentRoute><StudentTimetable /></StudentRoute>} />
            <Route path="/dashboard/student/notices" element={<StudentRoute><StudentNotices /></StudentRoute>} />
            <Route path="/dashboard/student/materials" element={<StudentRoute><StudentMaterials /></StudentRoute>} />
            <Route path="/dashboard/student/announcements" element={<StudentRoute><StudentAnnouncements /></StudentRoute>} />
            <Route path="/dashboard/student/fees" element={<StudentRoute><StudentFees /></StudentRoute>} />
            <Route path="/dashboard/student/messages" element={<StudentRoute><StudentMessages /></StudentRoute>} />
            <Route path="/dashboard/student/gamification" element={<StudentRoute><StudentGamification /></StudentRoute>} />
            <Route path="/dashboard/student/feedback" element={<StudentRoute><StudentFeedback /></StudentRoute>} />
            <Route path="/dashboard/student/notifications" element={<StudentRoute><StudentNotifications /></StudentRoute>} />
            <Route path="/dashboard/student/jobs" element={<StudentRoute><StudentJobBoard /></StudentRoute>} />
            <Route path="/dashboard/student/scholarships" element={<StudentRoute><StudentScholarships /></StudentRoute>} />

            {/* Teacher */}
            <Route path="/dashboard/teacher" element={<TeacherRoute><TeacherDashboard /></TeacherRoute>} />
            <Route path="/dashboard/teacher/students" element={<TeacherRoute><TeacherStudents /></TeacherRoute>} />
            <Route path="/dashboard/teacher/attendance" element={<TeacherRoute><TeacherAttendance /></TeacherRoute>} />
            <Route path="/dashboard/teacher/attendance-overview" element={<TeacherRoute><TeacherAttendanceOverview /></TeacherRoute>} />
            <Route path="/dashboard/teacher/marks" element={<TeacherRoute><TeacherMarks /></TeacherRoute>} />
            <Route path="/dashboard/teacher/absent" element={<TeacherRoute><TeacherAttendanceOverview /></TeacherRoute>} />
            <Route path="/dashboard/teacher/materials" element={<TeacherRoute><TeacherMaterials /></TeacherRoute>} />
            <Route path="/dashboard/teacher/notices" element={<TeacherRoute><TeacherNotices /></TeacherRoute>} />
            <Route path="/dashboard/teacher/timetable" element={<TeacherRoute><TeacherTimetable /></TeacherRoute>} />
            <Route path="/dashboard/teacher/announcements" element={<TeacherRoute><TeacherAnnouncements /></TeacherRoute>} />
            <Route path="/dashboard/teacher/messages" element={<TeacherRoute><TeacherMessages /></TeacherRoute>} />

            {/* Principal */}
            <Route path="/dashboard/principal" element={<PrincipalRoute><PrincipalDashboard /></PrincipalRoute>} />
            <Route path="/dashboard/principal/top-students" element={<PrincipalRoute><PrincipalTopStudents /></PrincipalRoute>} />
            <Route path="/dashboard/principal/events" element={<PrincipalRoute><PrincipalEvents /></PrincipalRoute>} />
            <Route path="/dashboard/principal/notices" element={<PrincipalRoute><PrincipalNotices /></PrincipalRoute>} />
            <Route path="/dashboard/principal/courses" element={<PrincipalRoute><PrincipalCourses /></PrincipalRoute>} />
            <Route path="/dashboard/principal/departments" element={<PrincipalRoute><PrincipalDepartments /></PrincipalRoute>} />
            <Route path="/dashboard/principal/teachers" element={<PrincipalRoute><PrincipalTeachers /></PrincipalRoute>} />
            <Route path="/dashboard/principal/students" element={<PrincipalRoute><PrincipalStudents /></PrincipalRoute>} />

            {/* Admin */}
            <Route path="/dashboard/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/dashboard/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/dashboard/admin/applications" element={<AdminRoute><AdminInboxHub /></AdminRoute>} />
            <Route path="/dashboard/admin/contacts" element={<AdminRoute><AdminInboxHub /></AdminRoute>} />
            <Route path="/dashboard/admin/top-rankers" element={<AdminRoute><AdminTopRankers /></AdminRoute>} />
            <Route path="/dashboard/admin/timetable" element={<AdminRoute><AdminTimetable /></AdminRoute>} />
            <Route path="/dashboard/admin/events" element={<AdminRoute><AdminEvents /></AdminRoute>} />
            <Route path="/dashboard/admin/faculty" element={<AdminRoute><AdminFaculty /></AdminRoute>} />
            <Route path="/dashboard/admin/banners" element={<AdminRoute><AdminBannerAndPapers /></AdminRoute>} />
            <Route path="/dashboard/admin/fees" element={<AdminRoute><AdminFeeManagement /></AdminRoute>} />
            <Route path="/dashboard/admin/roles" element={<AdminRoute><AdminToolsHub /></AdminRoute>} />
            <Route path="/dashboard/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/dashboard/admin/post-notice" element={<AdminRoute><AdminPostNotice /></AdminRoute>} />
            <Route path="/dashboard/admin/promotion-hub" element={<AdminRoute><AdminPromotionHub /></AdminRoute>} />
            <Route path="/dashboard/admin/semester-promotion" element={<AdminRoute><AdminPromotionHub /></AdminRoute>} />
            <Route path="/dashboard/admin/academic-years" element={<AdminRoute><AdminPromotionHub /></AdminRoute>} />
            <Route path="/dashboard/admin/absent-report" element={<AdminRoute><AdminAttendanceHub /></AdminRoute>} />
            <Route path="/dashboard/admin/attendance" element={<AdminRoute><AdminAttendanceHub /></AdminRoute>} />
            <Route path="/dashboard/admin/gallery" element={<AdminRoute><AdminGallery /></AdminRoute>} />
            <Route path="/dashboard/admin/birthday-settings" element={<AdminRoute><AdminToolsHub /></AdminRoute>} />
            <Route path="/dashboard/admin/add-staff" element={<AdminRoute><AdminAddStaff /></AdminRoute>} />
            <Route path="/dashboard/admin/academics-hub" element={<AdminRoute><AdminAcademicsHub /></AdminRoute>} />
            <Route path="/dashboard/admin/courses" element={<AdminRoute><AdminAcademicsHub /></AdminRoute>} />
            <Route path="/dashboard/admin/attendance-overview" element={<AdminRoute><AdminAttendanceHub /></AdminRoute>} />
            <Route path="/dashboard/admin/approve-admins" element={<AdminRoute><AdminApproveAdmins /></AdminRoute>} />
            <Route path="/dashboard/admin/fees/:studentId" element={<AdminRoute><AdminStudentFeeDetail /></AdminRoute>} />
            <Route path="/dashboard/admin/users/:userId" element={<AdminRoute><AdminStudentDetail /></AdminRoute>} />
            <Route path="/dashboard/admin/seats" element={<AdminRoute><AdminAcademicsHub /></AdminRoute>} />
            <Route path="/dashboard/admin/departments" element={<AdminRoute><AdminAcademicsHub /></AdminRoute>} />
            <Route path="/dashboard/admin/reports" element={<AdminRoute><AdminToolsHub /></AdminRoute>} />
            <Route path="/dashboard/admin/alumni" element={<AdminRoute><AdminToolsHub /></AdminRoute>} />
            <Route path="/dashboard/admin/broadcast" element={<AdminRoute><AdminNotificationBroadcast /></AdminRoute>} />
            <Route path="/dashboard/admin/activity-log" element={<AdminRoute><AdminFeedbackAndLogs /></AdminRoute>} />
            <Route path="/dashboard/admin/feedback" element={<AdminRoute><AdminFeedbackAndLogs /></AdminRoute>} />
            <Route path="/dashboard/admin/feedback-logs" element={<AdminRoute><AdminFeedbackAndLogs /></AdminRoute>} />
            <Route path="/dashboard/admin/hall-tickets" element={<AdminRoute><AdminHallTickets /></AdminRoute>} />
            <Route path="/dashboard/admin/career-hub" element={<AdminRoute><AdminCareerHub /></AdminRoute>} />
            <Route path="/dashboard/admin/job-board" element={<AdminRoute><AdminCareerHub /></AdminRoute>} />
            <Route path="/dashboard/admin/scholarships" element={<AdminRoute><AdminCareerHub /></AdminRoute>} />
            <Route path="/dashboard/admin/inbox" element={<AdminRoute><AdminInboxHub /></AdminRoute>} />
            <Route path="/dashboard/admin/tools" element={<AdminRoute><AdminToolsHub /></AdminRoute>} />
            <Route path="/dashboard/admin/academic-overview" element={<AdminRoute><AdminAcademicOverview /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
