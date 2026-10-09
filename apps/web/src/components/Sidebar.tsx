import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, LayoutDashboard, Plus, History, Settings, Menu, X, Kanban } from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/nova-visita', label: 'Briefing/Visita', icon: Plus },
  { path: '/historico', label: 'Histórico', icon: History },
  { path: '/producao', label: 'Produção', icon: Kanban },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Botão Hamburger - Mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-primor-secondary text-primor-primary rounded-lg shadow-lg"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay - Mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-primor-secondary text-primor-text-dark min-h-screen p-4 flex flex-col shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Botão Fechar - Mobile */}
        <button
          onClick={closeSidebar}
          className="md:hidden absolute top-4 right-4 p-2 text-primor-primary hover:bg-primor-secondary/80 rounded-lg"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-8 pb-6 border-b border-primor-primary/30">
          <h1 className="text-2xl font-bold text-primor-primary">Arquiteck</h1>
          <p className="text-sm text-primor-text-dark/80 mt-1">Primor Móveis</p>
          {user?.email && (
            <p className="text-xs text-primor-text-dark/60 mt-2 truncate">{user.email}</p>
          )}
        </div>
        
        <nav className="flex-1">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-primor-primary text-primor-secondary font-semibold shadow-md'
                        : 'text-primor-text-dark/80 hover:bg-primor-secondary/80 hover:text-primor-primary'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Botão de Logout */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-primor-text-dark/80 hover:bg-red-600 hover:text-white transition-all mt-4 border border-primor-text-dark/20 hover:border-red-600"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </aside>
    </>
  );
}
