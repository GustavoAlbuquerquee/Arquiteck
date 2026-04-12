import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 w-full p-4 md:p-6 lg:p-8 overflow-auto pt-16 md:pt-6">
        <Outlet />
      </main>
    </div>
  );
}
