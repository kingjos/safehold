import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'client' | 'vendor' | 'admin';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, hasRole, roles } = useAuth();
  const location = useLocation();

  // Show loading state while auth is initializing — prevents content flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Authenticating...</p>
        </div>
      </div>
    );
  }

  // No active session → redirect to login, preserving intended destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check — show friendly 403 instead of silent redirect
  if (requiredRole && !hasRole(requiredRole)) {
    const fallbackPath = hasRole('client')
      ? '/dashboard'
      : hasRole('vendor')
      ? '/vendor'
      : hasRole('admin')
      ? '/admin'
      : '/';

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold">403 — Access Denied</h1>
            <p className="text-muted-foreground">
              You don't have permission to access this page. This area requires the{' '}
              <span className="font-semibold text-foreground capitalize">{requiredRole}</span> role.
            </p>
            {roles.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Your current role{roles.length > 1 ? 's' : ''}:{' '}
                <span className="capitalize">{roles.join(', ')}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to={fallbackPath}>Go to my dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
