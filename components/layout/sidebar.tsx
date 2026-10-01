'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/lib/store/app-context';
import {
  LayoutDashboard,
  Users,
  Car,
  RotateCcw,
  CheckSquare,
  ShieldCheck,
  Settings,
  CarFront,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, filteredDocuments, filteredTasks, logout } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Compute live badges
  const overdueCount = filteredDocuments.filter((d) => d.status === 'OVERDUE').length;
  const pendingTaskCount = filteredTasks.filter((t) => t.status === 'PENDING' || t.status === 'PROCESSING').length;

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      label: 'Clients',
      href: '/clients',
      icon: Users,
      adminOnly: false,
    },
    {
      label: 'Vehicles',
      href: '/vehicles',
      icon: Car,
      adminOnly: false,
    },
    {
      label: 'Renewals',
      href: '/renewals',
      icon: RotateCcw,
      badge: overdueCount > 0 ? `${overdueCount}` : undefined,
      badgeVariant: 'danger' as const,
      adminOnly: false,
    },
    {
      label: 'Tasks',
      href: '/tasks',
      icon: CheckSquare,
      badge: pendingTaskCount > 0 ? `${pendingTaskCount}` : undefined,
      badgeVariant: 'info' as const,
      adminOnly: false,
    },
    {
      label: 'Agents',
      href: '/agents',
      icon: ShieldCheck,
      adminOnly: true, // Only Admin can see
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      adminOnly: true, // Only Admin can see
    },
  ];

  return (
    <aside
      className={cn(
        'w-64 bg-white text-slate-800 flex flex-col border-r border-slate-200/90 shrink-0 h-screen sticky top-0 shadow-2xs',
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100 gap-3 bg-white shrink-0">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
          <CarFront className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-slate-900 leading-tight">
            Apex Motor
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">Renewal Management</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => (isAdmin ? true : !item.adminOnly))
          .map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                    )}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                      item.badgeVariant === 'danger'
                        ? isActive
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-rose-100 text-rose-700 border border-rose-200'
                        : isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* User Status & Sign Out Footer */}
      <div className="p-3 border-t border-slate-200/90 bg-slate-50/70 space-y-2 shrink-0">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {currentUser?.name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {currentUser?.name || 'Staff Member'}
              </div>
              <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                <span
                  className={cn(
                    'inline-block w-1.5 h-1.5 rounded-full shrink-0',
                    currentUser?.role === 'ADMIN' ? 'bg-purple-600' : 'bg-blue-600'
                  )}
                />
                <span className="font-bold tracking-wider uppercase text-[9px] text-slate-600">
                  {currentUser?.role || 'AGENT'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
            title="Sign out of your session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Dedicated Sign Out Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200/90 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs group"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 transition-colors" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
