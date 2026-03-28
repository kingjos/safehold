interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'client' | 'vendor' | 'admin';
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  return <>{children}</>;
};

export default ProtectedRoute;
