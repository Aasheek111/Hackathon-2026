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
import RecommendationPage from './pages/RecommendationPage';
import MyClassroomPage from './pages/MyClassroomPage';
import TutorialRouter from './pages/TutorialRouter';
import RawDocViewerPage from './pages/RawDocViewerPage';
import YoutubeQuizPage from './pages/YoutubeQuizPage';
import ProgressPage from './pages/ProgressPage';
import LoadingSpinner from './components/ui/LoadingSpinner';

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
  if (requireAdmin && user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  if (allowRoles && user && !allowRoles.includes(user.role)) {
    const home = user.role === 'ADMIN' ? '/admin' : user.role === 'TEACHER' ? '/teacher' : '/dashboard';
    return <Navigate to={home} replace />;
  }

  // Student specific access control for Dashboard & Paid features
  if (user?.role === 'STUDENT') {
    // 1. If user hasn't completed their 1 free adaptive trial session, send to /consent -> /quiz
    if (!user.freeTrialUsed && requirePaidStudent) {
      return <Navigate to="/consent" replace />;
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

  const homePath = user?.role === 'ADMIN' ? '/admin' : user?.role === 'TEACHER' ? '/teacher' : '/dashboard';

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {showNavbar && <Navbar />}
      
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

          {/* Student: classroom system. requirePaidStudent gates students on
              the free-trial/subscription flow; teachers (allowed on the
              tutorial/document routes for preview) bypass that check. */}
          <Route path="/recommendation" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><RecommendationPage /></ProtectedRoute>} />
          <Route path="/classroom" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><MyClassroomPage /></ProtectedRoute>} />
          <Route path="/classroom/units/:unitId/tutorial" element={<ProtectedRoute allowRoles={['STUDENT', 'TEACHER']} requirePaidStudent><TutorialRouter /></ProtectedRoute>} />
          <Route path="/classroom/units/:unitId/document" element={<ProtectedRoute allowRoles={['STUDENT', 'TEACHER']} requirePaidStudent><RawDocViewerPage /></ProtectedRoute>} />
          <Route path="/classroom/units/:unitId/youtube-quiz" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><YoutubeQuizPage /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute allowRoles={['STUDENT']} requirePaidStudent><ProgressPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
};

export default App;
