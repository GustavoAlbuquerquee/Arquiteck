import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PrivateRoute } from '@/components/PrivateRoute';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Dashboard } from '@/pages/Dashboard';
import { NovaVisita, Configuracoes } from '@/pages';
import { Historico } from '@/pages/Historico';
import { Producao } from '@/pages/Producao';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { InstallPWA } from '@/components/InstallPWA';

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
            <Route path="historico" element={<Historico />} />
            <Route path="producao" element={<Producao />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>

          {/* Rota padrão - redireciona para login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Botão de Instalação PWA */}
        <InstallPWA />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
