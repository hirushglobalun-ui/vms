'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/lib/store/app-context';
import { Bell, Check, Clock, AlertTriangle, AlertCircle, FileText } from 'lucide-react';
import Link from 'next/link';

export function NotificationBell() {
  const { filteredNotifications, unreadNotificationCount, markNotificationAsRead, markAllNotificationsRead } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadNotificationCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadNotificationCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-xl border border-slate-200/80 z-50 overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-800">Notifications</span>
              {unreadNotificationCount > 0 && (
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
                  {unreadNotificationCount} new
                </span>
              )}
            </div>
            {unreadNotificationCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No notifications right now.
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markNotificationAsRead(n.id)}
                  className={`p-3 text-xs transition-colors hover:bg-slate-50 cursor-pointer ${
                    !n.isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {n.type === 'OVERDUE' ? (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : n.type === 'RENEWAL_DUE' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{n.title}</div>
                      <div className="text-slate-600 mt-0.5 leading-relaxed">{n.message}</div>
                      {n.relatedVehicleId && (
                        <Link
                          href={`/vehicles/${n.relatedVehicleId}`}
                          className="inline-block mt-1 text-[11px] text-blue-600 font-medium hover:underline"
                          onClick={() => setIsOpen(false)}
                        >
                          View Vehicle Workspace →
                        </Link>
                      )}
                    </div>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
