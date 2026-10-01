'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store/app-context';
import { SearchDialog } from '../shared/search-dialog';
import { NotificationBell } from '../shared/notification-bell';
import { ClientModal } from '../shared/client-modal';
import { VehicleModal } from '../shared/vehicle-modal';
import { TaskModal } from '../shared/task-modal';
import {
  Search,
  Plus,
  LogOut,
  Menu,
  ChevronDown,
  UserPlus,
  Car,
  CheckSquare,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Navbar({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const router = useRouter();
  const { currentUser, logout } = useApp();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

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

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Left: Mobile Toggle & Quick Search Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer w-48 sm:w-72"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span className="flex-1 text-left truncate">Search vehicle (KL-10...), client...</span>
            <kbd className="hidden sm:inline-block font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-400">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Quick Add + Switch Session + Notification + Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          
         

          {/* Notifications */}
          <NotificationBell />

         
        </div>
      </header>

      {/* Global Search Dialog */}
      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Quick Creation Modals */}
      <ClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} />
      <VehicleModal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} />
      <TaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} />
    </>
  );
}
