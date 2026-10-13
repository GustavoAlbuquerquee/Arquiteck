import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SimboloEncaixe } from '@/components/marca/Marca';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div role="status" className="flex min-h-[100dvh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <SimboloEncaixe className="h-10 w-10 text-primor-secondary motion-safe:animate-pulse" />
          <p className="etiqueta">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
