'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store/app-context';
import {
  CarFront,
  ArrowRight,
  Mail,
  Lock,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Check,
  Users,
  KeyRound,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginStaff, isFirebaseActive } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null);

  // Exactly 1 Admin and 1 Agent only (no more)
  const DEMO_ACCOUNTS = [
    {
      id: 'admin',
      role: 'ADMIN',
      name: 'Anas (Admin)',
      title: 'Administrator',
      desc: 'All Office & Staff Control',
      email: 'admin@apexmotors.com',
      badge: 'Full Access',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    {
      id: 'agent_rahman',
      role: 'AGENT',
      name: 'Rahman (Agent)',
      title: 'Field Agent',
      desc: 'Assigned Fleet & Renewals',
      email: 'rahman@apexmotors.com',
      badge: 'Field Ops',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await loginStaff(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login attempt failed:', err);
      let msg = 'Invalid staff email or password. Please try again.';
      if (err?.message?.includes('INACTIVE') || err?.message?.includes('inactive')) {
        msg = 'Your staff account is currently inactive. Please contact your system administrator.';
      } else if (
        err?.message?.includes('user-not-found') ||
        err?.message?.includes('wrong-password') ||
        err?.message?.includes('invalid-credential')
      ) {
        msg = 'Invalid email or password.';
      } else if (err?.message?.includes('too-many-requests')) {
        msg = 'Too many failed login attempts. Please wait a few moments and try again.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (account: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword('password');
    setSelectedDemoId(account.id);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/50 to-indigo-50/40 text-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Soft Ambient Mesh Background Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Grid Mesh */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e120_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e120_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* UNIFIED SINGLE CARD CONTAINER */}
      <div className="w-full max-w-[460px] bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-2xl shadow-slate-300/60 p-6 sm:p-8 relative z-10">
        {/* Brand Header Inside Card */}
        <div className="text-center">
          <div className="inline-flex relative mb-3">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-4 ring-blue-50 transition-transform duration-300 hover:scale-105">
              <CarFront className="w-6.5 h-6.5" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-2xs">
              <Sparkles className="w-2.5 h-2.5" />
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Apex Motor Consultancy
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Automobile RTO, Insurance & Fleet Management
          </p>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            PORTAL v2.0 • STAFF WORKSPACE
          </div>
        </div>

        {/* Local database warning banner if Firebase is unlinked */}
        {!isFirebaseActive && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Demo Database Mode</strong>
              Local offline storage active with instant testing accounts.
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium leading-relaxed animate-in fade-in">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form className="mt-4 space-y-3.5" onSubmit={handleLogin}>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Staff Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                autoFocus
                placeholder="admin@apexmotors.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedDemoId(null);
                }}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50/90 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSelectedDemoId(null);
                }}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50/90 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* ALL DUMMY AGENT & ADMIN CREDENTIALS SELECTOR */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Dummy Staff Accounts
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Password: <strong className="text-slate-600 font-bold">password</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = selectedDemoId === acc.id;
              return (
                <button
                  key={acc.id}
                  id={`demo-account-${acc.id}`}
                  type="button"
                  onClick={() => handleQuickFill(acc)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-slate-50/80 hover:bg-blue-50/40 border-slate-200/90 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        acc.role === 'ADMIN'
                          ? 'bg-blue-100 text-blue-700'
                          : isSelected
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      {acc.role === 'ADMIN' ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-xs font-bold text-slate-900 truncate">
                          {acc.name}
                        </strong>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full border font-bold uppercase tracking-wider ${acc.badgeColor}`}
                        >
                          {acc.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        {acc.email}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-blue-600 group-hover:underline">
                        Auto-fill
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Security & System Footer (Inside Card) */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-semibold text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            256-Bit SSL Encrypted
          </span>
          <span className="text-slate-400 font-medium">
            Kerala RTO Operations
          </span>
        </div>
      </div>
    </div>
  );
}
