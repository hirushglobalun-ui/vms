'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useApp } from '@/lib/store/app-context';
import { Search, Car, User, FileText, ArrowRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { RenewalStatusBadge } from './status-badge';
import { getDocumentTypeName } from '@/lib/renewals/engine';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const { searchGlobal, clients, vehicles } = useApp();
  const [query, setQuery] = useState('');

  const results = searchGlobal(query);
  const hasResults =
    results.vehicles.length > 0 || results.clients.length > 0 || results.documents.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Search"
      description="Find any vehicle by registration number, client by name/mobile, or document number."
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Search input bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Type registration (e.g. KL 10 AB 1234), client name, or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
          />
        </div>

        {/* Quick suggestions */}
        {!query && (
          <div className="text-xs text-slate-500 py-3">
            <span className="font-semibold text-slate-700">Quick suggestions:</span>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button
                onClick={() => setQuery('KL-10-AB-1234')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md cursor-pointer font-mono"
              >
                KL-10-AB-1234
              </button>
              <button
                onClick={() => setQuery('Mohammed Ali')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md cursor-pointer"
              >
                Mohammed Ali
              </button>
              <button
                onClick={() => setQuery('Dzire')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md cursor-pointer"
              >
                Dzire
              </button>
            </div>
          </div>
        )}

        {/* Results view */}
        {query && (
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
            {!hasResults ? (
              <div className="text-center py-8 text-sm text-slate-500">
                No vehicles, clients, or documents matched &ldquo;{query}&rdquo;.
              </div>
            ) : (
              <>
                {/* Vehicles Results */}
                {results.vehicles.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5" /> Vehicles ({results.vehicles.length})
                    </h4>
                    <div className="space-y-1.5">
                      {results.vehicles.map((v) => {
                        const owner = clients.find((c) => c.id === v.clientId);
                        return (
                          <Link
                            key={v.id}
                            href={`/vehicles/${v.id}`}
                            onClick={onClose}
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-200/70 hover:bg-blue-50/50 hover:border-blue-200 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                {v.make.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-slate-900 group-hover:text-blue-700 flex items-center gap-2">
                                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-800">
                                    {v.registrationNumber}
                                  </span>
                                  <span>
                                    {v.make} {v.model}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  Owner: {owner?.name || 'N/A'} • {v.rto}
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Clients Results */}
                {results.clients.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Clients ({results.clients.length})
                    </h4>
                    <div className="space-y-1.5">
                      {results.clients.map((c) => (
                        <Link
                          key={c.id}
                          href={`/clients/${c.id}`}
                          onClick={onClose}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200/70 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                              {c.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">
                                {c.name}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                Mobile: {c.mobile} • {c.address}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents Results */}
                {results.documents.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Documents ({results.documents.length})
                    </h4>
                    <div className="space-y-1.5">
                      {results.documents.map((d) => {
                        const veh = vehicles.find((v) => v.id === d.vehicleId);
                        return (
                          <Link
                            key={d.id}
                            href={`/vehicles/${d.vehicleId}`}
                            onClick={onClose}
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-200/70 hover:bg-slate-50 transition-all group"
                          >
                            <div>
                              <div className="font-semibold text-xs text-slate-800 flex items-center gap-2">
                                <span>{getDocumentTypeName(d.documentType)}</span>
                                {d.documentNumber && (
                                  <span className="font-mono text-slate-500 font-normal">
                                    #{d.documentNumber}
                                  </span>
                                )}
                                <RenewalStatusBadge status={d.status} />
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Vehicle: {veh?.registrationNumber || 'N/A'} • Expiry: {d.expiryDate || 'N/A'}
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
