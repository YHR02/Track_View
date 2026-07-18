import { Routes, Route } from 'react-router-dom';
import { Shell } from '../components/layout/Shell';
import { AuthGuard } from '../components/auth/AuthGuard';
import { Dashboard } from '../pages/Dashboard';
import { Trackers } from '../pages/Trackers';
import { Calendar } from '../pages/Calendar';
import { Analytics } from '../pages/Analytics';
import { Settings } from '../pages/Settings';
import { Login } from '../pages/Login';
import { NotFound } from '../pages/NotFound';

export function AppRouter() {
  return (
    <Routes>
      {/* Standalone Full-screen Routes */}
      <Route
        path="/login"
        element={
          <AuthGuard>
            <Login />
          </AuthGuard>
        }
      />

      {/* Main Pages wrapped inside Layout Shell */}
      <Route 
        path="/" 
        element={
          <AuthGuard>
            <Shell>
              <Dashboard />
            </Shell>
          </AuthGuard>
        } 
      />
      <Route 
        path="/trackers" 
        element={
          <AuthGuard>
            <Shell>
              <Trackers />
            </Shell>
          </AuthGuard>
        } 
      />
      <Route 
        path="/calendar" 
        element={
          <AuthGuard>
            <Shell>
              <Calendar />
            </Shell>
          </AuthGuard>
        } 
      />
      <Route 
        path="/analytics" 
        element={
          <AuthGuard>
            <Shell>
              <Analytics />
            </Shell>
          </AuthGuard>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <AuthGuard>
            <Shell>
              <Settings />
            </Shell>
          </AuthGuard>
        } 
      />

      {/* Fallback */}
      <Route 
        path="*" 
        element={
          <AuthGuard>
            <Shell>
              <NotFound />
            </Shell>
          </AuthGuard>
        } 
      />
    </Routes>
  );
}
