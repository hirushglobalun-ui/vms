'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckSquare, ArrowRight } from 'lucide-react';

export default function RenewalsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/tasks');
  }, [router]);

  return (
    <div className="py-16 text-center space-y-4">
      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
        <CheckSquare className="w-6 h-6" />
      </div>
      <h2 className="text-base font-bold text-slate-800">Redirecting to Unified Tasks &amp; Renewals Module...</h2>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">
        Renewals and compliance follow-ups are now unified inside the interactive Kanban Tasks module.
      </p>
      <Link
        href="/tasks"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
      >
        <span>Open Tasks Hub</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
