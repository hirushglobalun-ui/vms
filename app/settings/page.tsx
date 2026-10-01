'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import {
  Settings,
  Building,
  Bell,
  RotateCcw,
  CheckCircle2,
  Server,
  UserCheck,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Check,
  Database,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { currentUser, settings, updateSettings, updateUserProfile } = useApp();

  // Permission Check (Section 8 & 28: Agent attempting /settings -> Denied)
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">
          Agent accounts do not have permission to view or modify system configurations. Please contact your system administrator.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block">
          <Button variant="primary" size="sm">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // User credentials state
  const [userName, setUserName] = useState(currentUser?.name || '');
  const [userEmail, setUserEmail] = useState(currentUser?.email || '');
  const [userMobile, setUserMobile] = useState(currentUser?.mobile || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [credentialSuccess, setCredentialSuccess] = useState(false);
  const [credentialError, setCredentialError] = useState('');

  // Agency profile state
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [companyMobile, setCompanyMobile] = useState(settings.companyMobile);
  const [companyAddress, setCompanyAddress] = useState(settings.companyAddress);
  const [defaultReminderDays, setDefaultReminderDays] = useState(settings.defaultReminderDays);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Handle updating user profile & login credentials
  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialError('');

    if (newPassword && newPassword !== confirmPassword) {
      setCredentialError('New password and confirmation do not match.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setCredentialError('Password must be at least 6 characters.');
      return;
    }

    updateUserProfile({
      name: userName.trim(),
      email: userEmail.trim(),
      mobile: userMobile.trim(),
    });

    setCredentialSuccess(true);
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setCredentialSuccess(false), 3000);
  };

  // Handle updating company business profile
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      companyName,
      companyMobile,
      companyAddress,
      defaultReminderDays: Number(defaultReminderDays) || 30,
    });
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" />
          Settings & Account Credentials
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal staff credentials, access permissions, and consultancy business configurations.
        </p>
      </div>

      {/* 1. USER PROFILE & LOGIN CREDENTIALS */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Staff Profile & Login Credentials
            </CardTitle>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded font-mono uppercase">
              {currentUser?.role || 'ADMIN'} • FULL ACCESS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Your login identity, contact information, and security credentials.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSaveCredentials} className="space-y-4">
            {credentialSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Your credentials have been updated successfully!
              </div>
            )}

            {credentialError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                {credentialError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Full Name"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Anas"
              />

              <Input
                label="Login Email Address"
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="e.g. anas@apexmotors.com"
              />

              <Input
                label="Staff Mobile Number"
                required
                value={userMobile}
                onChange={(e) => setUserMobile(e.target.value)}
                placeholder="e.g. +91 98470 00001"
              />
            </div>

            {/* Change Password / Credentials */}
            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                Change Password / Access Key
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="New Password (Optional)"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            {/* Modules Access Summary */}
            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Active Module Permissions
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {['Dashboard', 'Clients', 'Vehicles', 'Renewals', 'Tasks', 'Agents', 'Settings'].map((mod) => (
                  <span
                    key={mod}
                    className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-medium"
                  >
                    <Check className="w-3 h-3 text-emerald-600" />
                    {mod}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button type="submit" variant="primary" size="sm">
                Save Account Credentials
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2. AGENCY BUSINESS PROFILE */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-700" />
            Consultancy Agency Profile
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Default company contact information and reminder schedule.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSaveCompany} className="space-y-4">
            {settingsSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Agency profile saved successfully!
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company / Agency Name"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />

              <Input
                label="Primary Contact Mobile (Used in WhatsApp Templates)"
                required
                value={companyMobile}
                onChange={(e) => setCompanyMobile(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Office Postal Address
              </label>
              <textarea
                rows={2}
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                Default Renewal Notice Threshold
              </div>
              <div className="max-w-xs">
                <Input
                  label="Advance Notice Window (Days)"
                  type="number"
                  min={1}
                  max={120}
                  value={defaultReminderDays}
                  onChange={(e) => setDefaultReminderDays(Number(e.target.value))}
                  helperText="Documents within this period will show as 'Due Soon'"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button type="submit" variant="secondary" size="sm">
                Save Agency Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

     
    </div>
  );
}
