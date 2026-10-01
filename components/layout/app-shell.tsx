'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { useApp } from '@/lib/store/app-context';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isLoading } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If on /login, render without shell
  const isLoginPage = pathname === '/login';

  React.useEffect(() => {
    if (!isLoading && !currentUser && !isLoginPage) {
      router.push('/login');
    }
  }, [currentUser, isLoading, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading system data...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // redirecting to /login
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex" />

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 flex flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar
              className="w-full h-full border-r-0"
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMobileMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
