import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const spreadsheetId = useAuthStore((s) => s.spreadsheetId);

  useEffect(() => {
    const authed = isAuthenticated();
    const isLoginPath = location.pathname === '/login';

    if (!authed) {
      if (!isLoginPath) {
        navigate('/login');
      }
    } else {
      // Authenticated and spreadsheet connected
      if (spreadsheetId) {
        if (isLoginPath) {
          navigate('/');
        }
      } else {
        // Authenticated but spreadsheet is not connected yet (e.g., provisioning in progress)
        if (!isLoginPath) {
          navigate('/login');
        }
      }
    }
  }, [location.pathname, isAuthenticated, spreadsheetId, navigate]);

  return <>{children}</>;
}
