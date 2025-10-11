import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isRestrictedUser, isCenterUser } from '@/lib/userPermissions';
import { useLicensedAgent } from '@/hooks/useLicensedAgent';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { isLicensedAgent, loading: licensedLoading } = useLicensedAgent();
  const navigate = useNavigate();
  const location = useLocation();
  const [centerCheckLoading, setCenterCheckLoading] = useState(false);

  useEffect(() => {
    const checkUserAccess = async () => {
      if (loading || licensedLoading || !user) return;

      console.log('[ProtectedRoute] User access check:', {
        userId: user.id,
        email: user.email,
        isLicensedAgent,
        currentPath: location.pathname
      });

      // Licensed agents can access commission-portal and dashboard
      if (isLicensedAgent) {
        console.log('[ProtectedRoute] Licensed agent detected');
        
        // Check if user is restricted and redirect them appropriately
        if (isRestrictedUser(user.id)) {
          const currentPath = location.pathname;
          console.log('[ProtectedRoute] Licensed agent is also restricted, redirecting to daily-deal-flow');

          // Only allow access to /daily-deal-flow for restricted users
          if (currentPath !== '/daily-deal-flow') {
            navigate('/daily-deal-flow', { replace: true });
          }
        }
        // Licensed agents can access commission-portal and dashboard, no redirect needed
        console.log('[ProtectedRoute] Licensed agent accessing:', location.pathname);
        return;
      }

      console.log('[ProtectedRoute] Not a licensed agent, checking center user status');
      setCenterCheckLoading(true);
      const isCenter = await isCenterUser(user.id);
      setCenterCheckLoading(false);
      
      console.log('[ProtectedRoute] Center user check result:', isCenter);

      // Center users can access their portal and agent-licensing page
      const centerAllowedPaths = ['/center-lead-portal', '/agent-licensing', '/center-callback-request'];
      const currentPath = location.pathname;
      
      // Redirect center users to their portal if they try to access other protected routes
      if (isCenter && !centerAllowedPaths.includes(currentPath)) {
        console.log('[ProtectedRoute] Redirecting center user to /center-lead-portal from:', currentPath);
        navigate('/center-lead-portal', { replace: true });
        return;
      }

      // Check if user is restricted and redirect them appropriately
      if (isRestrictedUser(user.id)) {
        const currentPath = location.pathname;
        console.log('[ProtectedRoute] Restricted user detected, current path:', currentPath);

        // Only allow access to /daily-deal-flow for restricted users
        if (currentPath !== '/daily-deal-flow') {
          console.log('[ProtectedRoute] Redirecting restricted user to /daily-deal-flow');
          navigate('/daily-deal-flow', { replace: true });
        }
      }
      
      console.log('[ProtectedRoute] Access check complete, allowing access to:', location.pathname);
    };

    checkUserAccess();
  }, [user, loading, licensedLoading, isLicensedAgent, navigate, location.pathname]);

  if (loading || licensedLoading || centerCheckLoading) {
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

export default ProtectedRoute;