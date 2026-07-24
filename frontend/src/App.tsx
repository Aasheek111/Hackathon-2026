import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CameraConsentPage from './pages/CameraConsentPage';
import QuizPage from './pages/QuizPage';
import QuizResultPage from './pages/QuizResultPage';
import SubscriptionPage from './pages/SubscriptionPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import ArGamePage from './pages/ArGamePage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import TeacherInsightsPage from './pages/TeacherInsightsPage';
import TeacherStudentDetailPage from './pages/TeacherStudentDetailPage';
import RecommendationPage from './pages/RecommendationPage';
import MyClassroomPage from './pages/MyClassroomPage';
import TutorialRouter from './pages/TutorialRouter';
import RawDocViewerPage from './pages/RawDocViewerPage';
import YoutubeQuizPage from './pages/YoutubeQuizPage';
import ProgressPage from './pages/ProgressPage';
import AccessibilitySettingsPage from './pages/AccessibilitySettingsPage';
import AudioDashboardPage from './pages/audio/AudioDashboardPage';
import AudioQuizPage from './pages/audio/AudioQuizPage';
import VisualDashboardPage from './pages/visual/VisualDashboardPage';
import SignLanguagePage from './pages/visual/SignLanguagePage';
import SignQuizPage from './pages/visual/SignQuizPage';
import SignPracticePage from './pages/practice/SignPracticePage';
import CustomPlanPlayerPage from './pages/CustomPlanPlayerPage';
import LoadingSpinner from './components/ui/LoadingSpinner';
import AudioControlBar from './components/AudioControlBar';
import FloatingAccessibilityToolkit from './components/FloatingAccessibilityToolkit';
import { homePathFor } from './lib/homePath';

const ProtectedRoute = ({
  children,
  requireAdmin = false,
  allowRoles,
  requirePaidStudent = false
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
  /** If set, only these roles may view this route (others are sent to their own home). */
  allowRoles?: Array<'ADMIN' | 'TEACHER' | 'STUDENT'>;
  requirePaidStudent?: boolean;
}) => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]"><LoadingSpinner size="lg" /></div>;
  if (!token) return <Navigate to="/login" replace />;
  if (requireAdmin && user?.role !== 'ADMIN') return <Navigate to={homePathFor(user)} replace />;
  if (allowRoles && user && !allowRoles.includes(user.role)) {
    return <Navigate to={homePathFor(user)} replace />;
  }

  // Student specific access control for Dashboard & Paid features
  if (user?.role === 'STUDENT') {
    // 1. If user hasn't completed their 1 free adaptive trial session, send to /consent -> /quiz.
    //    Exception: the standard trial is a webcam eye-tracking quiz, which a
    //    blind student cannot complete and shouldn't be asked to consent to.
    //    They take the equivalent voice quiz instead - it posts to the same
    //    /assessments endpoints, so it satisfies the trial the same way.
    if (!user.freeTrialUsed && requirePaidStudent) {
      const trialPath = user.disabilityType === 'BLINDNESS' ? '/dashboard/audio/quiz' : '/consent';
      return <Navigate to={trialPath} replace />;
    }
    // 2. If free trial is finished and user has NOT paid yet, block dashboard and send to /subscription
    if (user.freeTrialUsed && !user.hasPaid && requirePaidStudent) {
      return <Navigate to="/subscription" replace />;
    }
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const location = useLocation();
  const { user, token } = useAuth();
  const showNavbar = ['/', '/login', '/register', '/forgot-password', '/subscription'].includes(location.pathname);

  const homePath = homePathFor(user);

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* FIRST in the DOM on purpose - see AudioControlBar. One Tab press from
          anywhere in the app lands on "Read this screen", which is what makes
          the whole thing usable without sight. It renders pinned to the
          bottom, so the visual order is unaffected. */}
      <AudioControlBar />

      {showNavbar && <Navbar />}

      <FloatingAccessibilityToolkit />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={token && user ? <Navigate to={homePath} replace /> : <LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/consent" element={<ProtectedRoute><CameraConsentPage /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="/quiz/result" element={<ProtectedRoute><QuizResultPage /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute allowRoles={['STUDENT']}><SubscriptionPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><DashboardPage /></ProtectedRoute>} />
          <Route path="/ar-game" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><ArGamePage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />

          {/* Teacher */}
          <Route path="/teacher" element={<ProtectedRoute allowRoles={['TEACHER']}><TeacherDashboardPage /></ProtectedRoute>} />
          <Route path="/teacher/insights" element={<ProtectedRoute allowRoles={['TEACHER']}><TeacherInsightsPage /></ProtectedRoute>} />
          <Route path="/teacher/students/:studentId" element={<ProtectedRoute allowRoles={['TEACHER']}><TeacherStudentDetailPage /></ProtectedRoute>} />

          {/* Student: classroom system. requirePaidStudent gates students on
              the free-trial/subscription flow; teachers (allowed on the
              tutorial/document routes for preview) bypass that check. */}
          <Route path="/recommendation" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><RecommendationPage /></ProtectedRoute>} />
          <Route path="/classroom" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><MyClassroomPage /></ProtectedRoute>} />
          <Route path="/classroom/units/:unitId/tutorial" element={<ProtectedRoute allowRoles={['STUDENT', 'TEACHER']} requirePaidStudent><TutorialRouter /></ProtectedRoute>} />
          <Route path="/classroom/units/:unitId/document" element={<ProtectedRoute allowRoles={['STUDENT', 'TEACHER']} requirePaidStudent><RawDocViewerPage /></ProtectedRoute>} />
          <Route path="/classroom/units/:unitId/youtube-quiz" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><YoutubeQuizPage /></ProtectedRoute>} />
          <Route path="/classroom/subjects/:subjectId/custom-plan" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><CustomPlanPlayerPage /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><ProgressPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><AccessibilitySettingsPage /></ProtectedRoute>} />

          {/* Disability-specific dashboards. These are a PRESENTATION choice,
              not a permission: they're gated identically to /dashboard, so any
              student can open any of them by URL (useful for a teacher or
              carer demoing, and for a student whose needs don't fit one box).
              homePathFor() only decides which one you LAND on. */}
          <Route path="/dashboard/audio" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><AudioDashboardPage /></ProtectedRoute>} />
          {/* Auth-only, deliberately NOT requirePaidStudent - this IS the free
              trial for a blind student (see ProtectedRoute), so gating it on
              having completed the trial would be a redirect loop. Mirrors how
              /consent and /quiz are gated for everyone else. */}
          <Route path="/dashboard/audio/quiz" element={<ProtectedRoute allowRoles={['STUDENT']}><AudioQuizPage /></ProtectedRoute>} />
          <Route path="/dashboard/visual" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><VisualDashboardPage /></ProtectedRoute>} />
          <Route path="/dashboard/visual/sign-language" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><SignLanguagePage /></ProtectedRoute>} />
          <Route path="/dashboard/visual/sign-quiz" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><SignQuizPage /></ProtectedRoute>} />

          {/* Sign practice is deliberately NOT under /dashboard/visual - it's
              for every learner, not only deaf ones. A hearing classmate who
              can fingerspell is worth more than any feature we ship. */}
          <Route path="/practice/signs" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><SignPracticePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
};

export default App;
