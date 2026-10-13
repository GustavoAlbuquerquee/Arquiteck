import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, LayoutDashboard, Plus, History, Settings, Menu, X, Kanban } from 'lucide-react';
import { useState } from 'react';
import { Marca } from '@/components/marca/Marca';
import { VeioMadeira } from '@/components/marca/VeioMadeira';
import { BotaoTema, SeletorTema } from '@/components/SeletorTema';

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
      {/* Barra superior - Mobile */}
      <header className="on-dark fixed inset-x-0 top-0 z-topbar flex h-16 items-center justify-between overflow-hidden bg-primor-madeira px-4 text-white shadow-chapa dark:border-b dark:border-white/10 lg:hidden">
        <VeioMadeira opacidade={0.1} />
        <div className="relative">
          <Marca tom="claro" subtitulo={null} />
        </div>
        <div className="relative flex items-center gap-1">
          <BotaoTema className="text-primor-primary hover:bg-white/10" />
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={isOpen}
            aria-controls="menu-lateral"
            className="btn-icon text-primor-primary hover:bg-white/10"
          >
            <Menu aria-hidden="true" className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Overlay - Mobile */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-drawer bg-primor-veu/60 animate-fade-in lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        id="menu-lateral"
        aria-label="Menu principal"
        className={`
          on-dark fixed inset-y-0 left-0 z-modal flex w-72 flex-col overflow-hidden bg-primor-madeira text-white shadow-chapa-lg dark:border-r dark:border-white/10
          transform transition-[transform,visibility] duration-300 ease-out
          lg:sticky lg:top-0 lg:z-auto lg:h-[100dvh] lg:translate-x-0 lg:shadow-none
          ${isOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible lg:translate-x-0'}
        `}
      >
        <VeioMadeira opacidade={0.1} />

        <div className="relative flex items-start justify-between px-6 pb-6 pt-7">
          <Marca tom="claro" />
          {/* Botão Fechar - Mobile */}
          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Fechar menu"
            className="btn-icon -mr-2 -mt-2 text-primor-primary hover:bg-white/10 lg:hidden"
          >
            <X aria-hidden="true" className="h-6 w-6" />
          </button>
        </div>

        {/* Régua decorativa separando a marca do menu */}
        <div aria-hidden="true" className="regua relative mx-6 !text-primor-primary !opacity-40" />

        <nav aria-label="Seções" className="relative flex-1 overflow-y-auto px-3 pt-5">
          <ul className="space-y-1">
            {menuItems.map((item, i) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={closeSidebar}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex min-h-[48px] items-center gap-3 rounded-md px-3 transition-colors ${
                      isActive
                        ? 'bg-white/10 font-semibold text-white'
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {/* Fita de borda âmbar marca a seção atual */}
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-2 left-0 top-2 w-1 rounded-r-sm bg-primor-primary transition-opacity ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <Icon
                      aria-hidden="true"
                      strokeWidth={1.75}
                      className={`h-5 w-5 ${isActive ? 'text-primor-primary' : 'text-white/70 group-hover:text-primor-primary'}`}
                    />
                    <span className="flex-1">{item.label}</span>
                    <span aria-hidden="true" className="font-mono text-[11px] text-white/60 tabular">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="relative border-t border-white/15 px-3 pb-5 pt-4">
          <div className="mb-4">
            <SeletorTema variante="madeira" />
          </div>
          {user?.email && (
            <p className="mb-3 truncate px-3 font-mono text-xs text-white/70" title={user.email}>
              {user.email}
            </p>
          )}
          {/* Botão de Logout */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-[48px] w-full items-center gap-3 rounded-md border border-white/20 px-3 text-white/85 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white"
          >
            <LogOut aria-hidden="true" strokeWidth={1.75} className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
