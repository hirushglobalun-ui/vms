'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store/app-context';
import { SearchDialog } from '../shared/search-dialog';
import { NotificationBell } from '../shared/notification-bell';
import { VehicleModal } from '../shared/vehicle-modal';
import { ClientModal } from '../shared/client-modal';
import { TaskModal } from '../shared/task-modal';
import {
  Search,
  Plus,
  LogOut,
  Menu,
  Sparkles,
  Car,
  CheckSquare,
  User,
  ChevronDown,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Navbar({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const router = useRouter();
  const { currentUser, logout } = useApp();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Keyboard shortcut for Cmd/Ctrl + K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <>
      <header className="h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Left: Mobile Toggle & Quick Search Button */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer w-28 xs:w-36 sm:w-64 md:w-80 min-w-0"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="flex-1 text-left truncate hidden sm:inline">Search vehicle (KL-10...), client...</span>
            <span className="flex-1 text-left truncate sm:hidden">Search...</span>
            <kbd className="hidden md:inline-block font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-400">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Quick Add + Notification + User Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Add Vehicle (With RC Scan badge) */}
          <button
            onClick={() => setIsVehicleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs shadow-blue-500/20 transition-all cursor-pointer hover:shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Vehicle</span>
            <span className="sm:hidden">Add</span>
            <Sparkles className="w-3 h-3 text-amber-300 hidden md:inline animate-pulse" />
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* User Profile Pill (Visible on mobile/tablet) */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-700 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser?.name?.slice(0, 1).toUpperCase() || 'U'}
              </div>
              <span className="hidden md:inline text-xs font-semibold text-slate-800 max-w-[100px] truncate">
                {currentUser?.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              >
                <div
                  className="absolute right-4 top-16 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in-50 zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser?.name || 'Staff Member'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                      {currentUser?.role || 'AGENT'}
                    </span>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setIsClientModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>New Client Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setIsTaskModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left"
                    >
                      <CheckSquare className="w-4 h-4 text-slate-400" />
                      <span>Create Work Task</span>
                    </button>
                  </div>

                  <div className="p-1 pt-1.5 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Quick Creation Modals */}
      <VehicleModal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} />
      <ClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} />
      <TaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} />
    </>
  );
}
