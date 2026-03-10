import { Sidebar } from '@/app/components/sidebar';
import { Topbar } from '@/app/components/topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100/60 lg:grid lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex min-h-screen flex-col bg-slate-100/60">
        <Topbar />
        <main className="flex-1">
          <div className="layout-shell mx-auto w-full max-w-[1200px] px-6 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
