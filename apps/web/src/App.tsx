import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PrivateRoute } from '@/components/PrivateRoute';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Dashboard } from '@/pages/Dashboard';
import { NovaVisita, Checklists, Configuracoes } from '@/pages';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rotas Privadas */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="nova-visita" element={<NovaVisita />} />
            <Route path="checklists" element={<Checklists />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>

          {/* Rota padrão - redireciona para login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
