import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isRestrictedUser } from '@/lib/userPermissions';

interface RestrictedRouteProps {
  children: React.ReactNode;
  allowedRoutes?: string[];
}

const RestrictedRoute = ({ children, allowedRoutes = ['/daily-deal-flow'] }: RestrictedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If user is not authenticated, let ProtectedRoute handle it
    if (!loading && !user) {
      return;
    }

    // If user is loaded and is a restricted user
    if (!loading && user && isRestrictedUser(user.id)) {
      const currentPath = location.pathname;
      
      // Check if current path is in allowed routes
      const isCurrentPathAllowed = allowedRoutes.some(route => 
        currentPath === route || currentPath.startsWith(route)
      );

      // If not on an allowed route, redirect to the first allowed route
      if (!isCurrentPathAllowed) {
        navigate(allowedRoutes[0] || '/daily-deal-flow', { replace: true });
      }
    }
  }, [user, loading, navigate, location.pathname, allowedRoutes]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default RestrictedRoute;