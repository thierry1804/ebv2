import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useMaintenanceSettings } from '../hooks/useMaintenanceSettings';
import MaintenancePage from '../pages/MaintenancePage';
import { PageLoading } from './ui/PageLoading';

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const { enabled, message, loading } = useMaintenanceSettings();

  if (!isAdmin && loading) {
    return <PageLoading />;
  }
  if (!isAdmin && enabled) {
    return <MaintenancePage message={message} />;
  }
  return <>{children}</>;
}
