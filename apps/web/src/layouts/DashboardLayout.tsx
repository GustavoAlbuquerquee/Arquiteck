import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';

export function DashboardLayout() {
  return (
    <div className="min-h-[100dvh] md:flex">
      <a
        href="#conteudo"
        className="btn btn-secondary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-modal"
      >
        Pular para o conteúdo
      </a>
      <Sidebar />
      <main
        id="conteudo"
        tabIndex={-1}
        className="w-full min-w-0 flex-1 px-4 pb-16 pt-24 focus:outline-none sm:px-6 md:px-8 md:pt-10 lg:px-12 lg:pt-12"
      >
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
