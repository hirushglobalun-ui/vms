'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RenewalStatusBadge } from '@/components/shared/status-badge';
import { WhatsAppModal } from '@/components/shared/whatsapp-modal';
import { CompletionModal } from '@/components/shared/completion-modal';
import { DocumentModal } from '@/components/shared/document-modal';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { TablePagination } from '@/components/ui/pagination';
import { getDocumentTypeName, sortDocumentsByUrgency } from '@/lib/renewals/engine';
import { formatCurrency, normalizeRegistrationNumber } from '@/lib/utils';
import {
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Car,
  ChevronRight,
  Clock,
  ArrowUpDown,
  Pencil,
  Eye,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { DocumentType, RenewalStatus, VehicleDocument } from '@/lib/types';

export default function RenewalsPage() {
  const { filteredDocuments, vehicles, clients, users, currentUser, deleteDocument } = useApp();

  const [activeTab, setActiveTab] = useState<'ALL' | 'OVERDUE' | 'DUE_TODAY' | 'DUE_SOON' | 'COMPLETED'>('ALL');
  const [selectedDocType, setSelectedDocType] = useState<string>('ALL');
  const [selectedAgent, setSelectedAgent] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [completionDoc, setCompletionDoc] = useState<VehicleDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<VehicleDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<VehicleDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [whatsAppData, setWhatsAppData] = useState<{
    isOpen: boolean;
    clientName: string;
    clientMobile: string;
    registrationNumber: string;
    documentType: string;
    dueDate?: string;
  }>({
    isOpen: false,
    clientName: '',
    clientMobile: '',
    registrationNumber: '',
    documentType: '',
  });

  const activeAgents = users.filter((u) => u.status === 'ACTIVE');

  // Count tab badges
  const overdueCount = filteredDocuments.filter((d) => d.status === 'OVERDUE').length;
  const dueTodayCount = filteredDocuments.filter((d) => d.status === 'DUE_TODAY').length;
  const dueSoonCount = filteredDocuments.filter((d) => d.status === 'DUE_SOON').length;
  const completedCount = filteredDocuments.filter((d) => d.status === 'COMPLETED').length;

  const filteredAndSortedDocs = useMemo(() => {
    let result = filteredDocuments;

    // Filter by tab
    if (activeTab === 'OVERDUE') {
      result = result.filter((d) => d.status === 'OVERDUE');
    } else if (activeTab === 'DUE_TODAY') {
      result = result.filter((d) => d.status === 'DUE_TODAY');
    } else if (activeTab === 'DUE_SOON') {
      result = result.filter((d) => d.status === 'DUE_SOON');
    } else if (activeTab === 'COMPLETED') {
      result = result.filter((d) => d.status === 'COMPLETED');
    }

    // Filter by document type
    if (selectedDocType !== 'ALL') {
      result = result.filter((d) => d.documentType === selectedDocType);
    }

    // Filter by assigned agent
    if (selectedAgent !== 'ALL') {
      result = result.filter((d) => {
        const veh = vehicles.find((v) => v.id === d.vehicleId);
        return veh?.assignedAgentId === selectedAgent;
      });
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const normQ = normalizeRegistrationNumber(searchTerm);

      result = result.filter((d) => {
        const veh = vehicles.find((v) => v.id === d.vehicleId);
        const client = clients.find((c) => c.id === d.clientId);

        const matchesVeh = veh
          ? veh.normalizedRegistrationNumber.includes(normQ) ||
            veh.registrationNumber.toLowerCase().includes(q)
          : false;

        const matchesClient = client
          ? client.name.toLowerCase().includes(q) ||
            client.mobile.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
          : false;

        const matchesDoc =
          d.documentType.toLowerCase().includes(q) ||
          (d.documentNumber && d.documentNumber.toLowerCase().includes(q)) ||
          (d.insuranceProvider && d.insuranceProvider.toLowerCase().includes(q));

        return matchesVeh || matchesClient || matchesDoc;
      });
    }

    // Sort by priority/urgency
    return sortDocumentsByUrgency(result);
  }, [filteredDocuments, activeTab, selectedDocType, selectedAgent, searchTerm, vehicles, clients]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 on tab or filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedDocType, selectedAgent, searchTerm]);

  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedDocs.slice(start, start + pageSize);
  }, [filteredAndSortedDocs, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-blue-600" />
            Renewal Operations Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track expiry deadlines, auto-calculate renewal status, and trigger WhatsApp client follow-ups.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3 sm:px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'ALL'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          All Active
          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full font-bold">
            {filteredDocuments.filter((d) => d.status !== 'COMPLETED').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('OVERDUE')}
          className={`px-3 sm:px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'OVERDUE'
              ? 'border-rose-600 text-rose-600 bg-rose-50/50'
              : 'border-transparent text-slate-500 hover:text-rose-600'
          }`}
        >
          Overdue
          {overdueCount > 0 && (
            <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-bold">
              {overdueCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('DUE_TODAY')}
          className={`px-3 sm:px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'DUE_TODAY'
              ? 'border-amber-600 text-amber-600 bg-amber-50/50'
              : 'border-transparent text-slate-500 hover:text-amber-600'
          }`}
        >
          Due Today
          {dueTodayCount > 0 && (
            <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">
              {dueTodayCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('DUE_SOON')}
          className={`px-3 sm:px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'DUE_SOON'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-indigo-600'
          }`}
        >
          Due Soon
          {dueSoonCount > 0 && (
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full font-bold">
              {dueSoonCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-3 sm:px-4 py-2 rounded-t-xl font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'COMPLETED'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-emerald-600'
          }`}
        >
          Completed
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">
            {completedCount}
          </span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search vehicle reg, client name, doc no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="INSURANCE">Insurance</option>
            <option value="ROAD_TAX">Road Tax</option>
            <option value="GREEN_TAX">Green Tax</option>
            <option value="PUC">Pollution / PUC</option>
            <option value="FITNESS">Fitness (FC)</option>
            <option value="PERMIT">Permit</option>
            <option value="RC">RC / Registration</option>
          </select>

          {currentUser?.role === 'ADMIN' && (
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700"
            >
              <option value="ALL">All Agents</option>
              {activeAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Renewals Table & Mobile Touch Cards */}
      <Card className="rounded-2xl border-slate-200 shadow-2xs overflow-hidden">
        <CardContent className="p-0">
          {filteredAndSortedDocs.length === 0 ? (
            <div className="py-14 text-center text-xs text-slate-500">
              <RotateCcw className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-800">No Renewals Found</div>
              <p className="mt-1 text-slate-400">No renewal records matched this status or search filter.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3 w-14 text-center font-mono">Sl. No.</th>
                      <th className="px-5 py-3">Vehicle</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Document</th>
                      <th className="px-4 py-3">Due / Expiry Date</th>
                      <th className="px-4 py-3">Assigned Agent</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedDocs.map((doc, index) => {
                      const serialNo = (currentPage - 1) * pageSize + index + 1;
                      const veh = vehicles.find((v) => v.id === doc.vehicleId);
                      const client = clients.find((c) => c.id === doc.clientId);
                      const agent = users.find((u) => u.id === veh?.assignedAgentId);

                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-400 font-semibold">
                            {serialNo}
                          </td>
                          <td className="px-5 py-3.5">
                            {veh ? (
                              <Link
                                href={`/vehicles/${veh.id}`}
                                className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 inline-block hover:bg-blue-100 transition-colors"
                              >
                                {veh.registrationNumber}
                              </Link>
                            ) : (
                              'N/A'
                            )}
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {veh?.make} {veh?.model}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {client ? (
                              <Link
                                href={`/clients/${client.id}`}
                                className="font-bold text-slate-900 hover:text-blue-600 block"
                              >
                                {client.name}
                              </Link>
                            ) : (
                              'N/A'
                            )}
                            <div className="text-[11px] text-slate-500 font-mono">
                              {client?.mobile}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-900">
                              {getDocumentTypeName(doc.documentType)}
                            </div>
                            {doc.documentNumber && (
                              <div className="text-[11px] text-slate-400 font-mono">
                                #{doc.documentNumber}
                              </div>
                            )}
                            {doc.amount && (
                              <div className="text-[11px] text-slate-500">
                                {formatCurrency(doc.amount)}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                            {doc.expiryDate || 'Permanent / N/A'}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-medium text-slate-700">
                              {agent?.name || 'Unassigned'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <RenewalStatusBadge status={doc.status} />
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* WhatsApp Action Icon Button */}
                              {client && veh && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setWhatsAppData({
                                      isOpen: true,
                                      clientName: client.name,
                                      clientMobile: client.mobile,
                                      registrationNumber: veh.registrationNumber,
                                      documentType: doc.documentType,
                                      dueDate: doc.expiryDate,
                                    })
                                  }
                                  className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                  title="Contact via WhatsApp"
                                  aria-label="Contact via WhatsApp"
                                >
                                  <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                                </Button>
                              )}

                              {/* Complete Renewal Action Icon Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCompletionDoc(doc)}
                                className="h-8 w-8 p-0 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                title="Complete Renewal Cycle"
                                aria-label="Complete Renewal Cycle"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>

                              {/* Edit Document Action Icon Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingDoc(doc)}
                                className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border-slate-200"
                                title="Edit Document"
                                aria-label="Edit Document"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>

                              {/* View Vehicle Action Icon Button */}
                              {veh && (
                                <Link href={`/vehicles/${veh.id}`} title="View Vehicle">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-blue-50 border-slate-200"
                                    aria-label="View Vehicle"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </Link>
                              )}

                              {/* Delete Document Action Icon Button */}
                              {currentUser?.role === 'ADMIN' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDocToDelete(doc)}
                                  className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200 hover:border-rose-200"
                                  title="Delete Document"
                                  aria-label="Delete Document"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Touch Cards View */}
              <div className="md:hidden divide-y divide-slate-100">
                {paginatedDocs.map((doc, index) => {
                  const veh = vehicles.find((v) => v.id === doc.vehicleId);
                  const client = clients.find((c) => c.id === doc.clientId);

                  return (
                    <div key={doc.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          {veh && (
                            <Link
                              href={`/vehicles/${veh.id}`}
                              className="font-mono font-bold text-sm text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 inline-block hover:bg-blue-100"
                            >
                              {veh.registrationNumber}
                            </Link>
                          )}
                          <div className="text-xs font-bold text-slate-900 mt-1">
                            {getDocumentTypeName(doc.documentType)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Owner: {client?.name || 'Unknown'}
                          </div>
                        </div>

                        <RenewalStatusBadge status={doc.status} />
                      </div>

                      <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Due Date</span>
                          <span className="font-mono font-bold text-slate-900">{doc.expiryDate || 'N/A'}</span>
                        </div>
                        {doc.amount && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount</span>
                            <span className="font-bold text-slate-800">{formatCurrency(doc.amount)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {client && veh && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setWhatsAppData({
                                isOpen: true,
                                clientName: client.name,
                                clientMobile: client.mobile,
                                registrationNumber: veh.registrationNumber,
                                documentType: doc.documentType,
                                dueDate: doc.expiryDate,
                              })
                            }
                            className="flex-1 text-xs gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-9"
                          >
                            <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                            <span>WhatsApp</span>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCompletionDoc(doc)}
                          className="flex-1 text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50 h-9"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Renew</span>
                        </Button>

                        {veh && (
                          <Link href={`/vehicles/${veh.id}`}>
                            <Button size="sm" variant="outline" className="h-9 px-3 text-slate-600">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <TablePagination
            currentPage={currentPage}
            totalItems={filteredAndSortedDocs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Completion Modal */}
      {completionDoc && (
        <CompletionModal
          isOpen={Boolean(completionDoc)}
          onClose={() => setCompletionDoc(null)}
          document={completionDoc}
          registrationNumber={
            vehicles.find((v) => v.id === completionDoc.vehicleId)?.registrationNumber || ''
          }
        />
      )}

      {/* Document Edit Modal */}
      {editingDoc && (
        <DocumentModal
          isOpen={Boolean(editingDoc)}
          onClose={() => setEditingDoc(null)}
          vehicleId={editingDoc.vehicleId}
          clientId={editingDoc.clientId}
          initialDocument={editingDoc}
        />
      )}

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={whatsAppData.isOpen}
        onClose={() => setWhatsAppData((prev) => ({ ...prev, isOpen: false }))}
        clientName={whatsAppData.clientName}
        clientMobile={whatsAppData.clientMobile}
        registrationNumber={whatsAppData.registrationNumber}
        documentType={whatsAppData.documentType}
        dueDate={whatsAppData.dueDate}
      />

      {/* Delete Modal */}
      {docToDelete && (
        <ConfirmModal
          isOpen={Boolean(docToDelete)}
          onClose={() => setDocToDelete(null)}
          title="Delete Document Record?"
          message={`Are you sure you want to delete ${getDocumentTypeName(
            docToDelete.documentType
          )} for vehicle ${
            vehicles.find((v) => v.id === docToDelete.vehicleId)?.registrationNumber || ''
          }? This action cannot be undone.`}
          confirmText="Yes, Delete Document"
          isDestructive={true}
          isLoading={isDeleting}
          onConfirm={async () => {
            setIsDeleting(true);
            try {
              await deleteDocument(docToDelete.id);
              setDocToDelete(null);
            } catch (err: any) {
              alert(err?.message || 'Failed to delete document.');
            } finally {
              setIsDeleting(false);
            }
          }}
        />
      )}
    </div>
  );
}
