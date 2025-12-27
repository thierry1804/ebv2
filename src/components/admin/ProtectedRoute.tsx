import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Loading } from '../ui/Loading';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, adminUser } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  // Vérifier que l'utilisateur est authentifié ET qu'il est l'admin
  const ADMIN_EMAIL = 'admin@eshopbyvalsue.mg';
  const isAdmin = adminUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

