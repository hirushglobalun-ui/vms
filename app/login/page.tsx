'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CarFront, ArrowRight, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginStaff, isFirebaseActive, firebaseConfigError } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await loginStaff(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login attempt failed:', err);
      // Clean, user-facing error message without raw stack traces
      let msg = 'Invalid staff email or password. Please try again.';
      if (err?.message?.includes('INACTIVE') || err?.message?.includes('inactive')) {
        msg = 'Your staff account is currently inactive. Please contact your system administrator.';
      } else if (err?.message?.includes('user-not-found') || err?.message?.includes('wrong-password') || err?.message?.includes('invalid-credential')) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Ambient Highlights */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-200/15 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex justify-center mb-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 ring-4 ring-blue-50">
            <CarFront className="w-7 h-7" />
          </div>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Apex Motor Consultancy
        </h2>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Automobile RTO, Vehicle & Renewal Management Workspace
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-xl shadow-slate-200/70 rounded-3xl sm:px-10 border border-slate-200/80">
          <div className="mb-5 pb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Staff Portal Login</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your authorized staff credentials to access your workspace.
            </p>
          </div>

          {/* Environment alert if Firebase is not yet linked */}
          {!isFirebaseActive && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Development Setup Notice</strong>
                Provide your production Firebase credentials in <code className="font-mono text-[11px] bg-amber-100 px-1 rounded">.env.local</code> to link real-time Firebase Auth and Firestore.
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/90 text-xs text-rose-700 font-medium leading-relaxed shadow-2xs">
                {error}
              </div>
            )}

            <div>
              <Input
                label="Staff Email Address"
                type="email"
                required
                autoFocus
                placeholder="e.g. admin@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full h-10 font-bold mt-2 shadow-sm shadow-blue-600/20"
              isLoading={isLoading}
            >
              Sign In to Workspace
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              256-Bit SSL Encrypted
            </span>
            <span className="font-mono font-medium text-slate-400">Production v1.0</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 font-medium">
          Internal office system • Authorized personnel only
        </p>
      </div>
    </div>
  );
}
