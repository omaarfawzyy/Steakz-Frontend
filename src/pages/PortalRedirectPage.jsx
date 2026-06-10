import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function PortalRedirectPage() {
  const { session } = useApp();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/portal/${session.role}`} replace />;
}
