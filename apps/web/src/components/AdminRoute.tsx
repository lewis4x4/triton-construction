import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute - Protects admin routes
 *
 * For now, all authenticated users have admin access.
 * TODO: Implement proper role-based access control when user management is built out:
 * - Check user_roles table for ADMIN role
 * - Check user_profiles.is_admin flag
 * - Restrict based on organization settings
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // For development: all authenticated users have admin access
  // Role-based restrictions will be added when user management is implemented
  return <>{children}</>;
}
