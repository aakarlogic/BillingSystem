import { Navigate, Outlet, useLocation } from 'react-router';
import appConfig from '@/configs/app.config';
import { useUserData } from '@/context/UserDataContext';
import { isAuthenticated } from '@/utils/hooks/useAuth';

// Layout route with no path of its own: children render only when signed in,
// otherwise the whole subtree goes to the login page.
const ProtectedRoute = () => {
  const { user } = useUserData();
  const location = useLocation();
  if (!user || !isAuthenticated()) {
    return <Navigate to={appConfig.unAuthenticatedEntryPath} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
