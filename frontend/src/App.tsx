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
import RecommendationPage from './pages/RecommendationPage';
import MyClassroomPage from './pages/MyClassroomPage';
import TutorialRouter from './pages/TutorialRouter';
import ProgressPage from './pages/ProgressPage';
import LoadingSpinner from './components/ui/LoadingSpinner';

const ProtectedRoute = ({
  children,
  requireAdmin = false,
  allowRoles
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
  /** If set, only these roles may view this route (others are sent to their own home). */
  allowRoles?: Array<'ADMIN' | 'TEACHER' | 'STUDENT'>;
}) => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-dark"><LoadingSpinner size="lg" /></div>;
  if (!token) return <Navigate to="/login" replace />;
  if (requireAdmin && user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  if (allowRoles && user && !allowRoles.includes(user.role)) {
    const home = user.role === 'ADMIN' ? '/admin' : user.role === 'TEACHER' ? '/teacher' : '/dashboard';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const location = useLocation();
  const showNavbar = ['/', '/login', '/register', '/forgot-password', '/subscription'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-dark text-white font-sans selection:bg-primary/30 selection:text-white">
      {showNavbar && <Navbar />}
      
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/consent" element={<ProtectedRoute><CameraConsentPage /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="/quiz/result" element={<ProtectedRoute><QuizResultPage /></ProtectedRoute>} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/dashboard" element={<ProtectedRoute allowRoles={['STUDENT']}><DashboardPage /></ProtectedRoute>} />
          <Route path="/ar-game" element={<ProtectedRoute><ArGamePage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />

          {/* Teacher */}
          <Route path="/teacher" element={<ProtectedRoute allowRoles={['TEACHER']}><TeacherDashboardPage /></ProtectedRoute>} />

          {/* Student: classroom system */}
          <Route path="/recommendation" element={<ProtectedRoute allowRoles={['STUDENT']}><RecommendationPage /></ProtectedRoute>} />
          <Route path="/classroom" element={<ProtectedRoute allowRoles={['STUDENT']}><MyClassroomPage /></ProtectedRoute>} />
          <Route path="/classroom/units/:unitId/tutorial" element={<ProtectedRoute allowRoles={['STUDENT', 'TEACHER']}><TutorialRouter /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute allowRoles={['STUDENT']}><ProgressPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
};

export default App;
