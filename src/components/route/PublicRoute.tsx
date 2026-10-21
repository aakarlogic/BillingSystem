import { Navigate, Outlet } from 'react-router';
import appConfig from '@/configs/app.config';
import { useUserData } from '@/context/UserDataContext';
import { isAuthenticated } from '@/utils/hooks/useAuth';

// For login and the public home page: a signed-in person goes straight to the app.
const PublicRoute = () => {
  const { user } = useUserData();
  if (user && isAuthenticated()) return <Navigate to={appConfig.authenticatedEntryPath} replace />;
  return <Outlet />;
};

export default PublicRoute;
