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
  Edit,
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

    // Sort by priority/urgency (Section 65)
    return sortDocumentsByUrgency(result);
  }, [filteredDocuments, activeTab, selectedDocType, selectedAgent, searchTerm, vehicles, clients]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-600" />
            Renewal Operations Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track expiry deadlines, auto-calculate renewal status, and trigger WhatsApp client follow-ups.
          </p>
        </div>
      </div>

      {/* Tabs (Section 31) */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ALL'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          All Renewals
          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full">
            {filteredDocuments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('OVERDUE')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'OVERDUE'
              ? 'border-rose-600 text-rose-600 bg-rose-50/50'
              : 'border-transparent text-slate-500 hover:text-rose-600'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          Overdue
          {overdueCount > 0 && (
            <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded-full font-bold">
              {overdueCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('DUE_TODAY')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'DUE_TODAY'
              ? 'border-red-600 text-red-600 bg-red-50/50'
              : 'border-transparent text-slate-500 hover:text-red-600'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-red-600" />
          Due Today
          {dueTodayCount > 0 && (
            <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-bold">
              {dueTodayCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('DUE_SOON')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'DUE_SOON'
              ? 'border-amber-600 text-amber-600 bg-amber-50/50'
              : 'border-transparent text-slate-500 hover:text-amber-600'
          }`}
        >
          Due Soon
          {dueSoonCount > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
              {dueSoonCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'COMPLETED'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-emerald-600'
          }`}
        >
          Completed / Archived
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
            {completedCount}
          </span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search vehicle reg, client name, doc no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
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
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
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

      {/* Renewals Table (Section 31) */}
      <Card>
        <CardContent className="p-0">
          {filteredAndSortedDocs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No renewal records found matching the selected view.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
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
                  {filteredAndSortedDocs.map((doc) => {
                    const veh = vehicles.find((v) => v.id === doc.vehicleId);
                    const client = clients.find((c) => c.id === doc.clientId);
                    const agent = users.find((u) => u.id === veh?.assignedAgentId);

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5">
                          {veh ? (
                            <Link
                              href={`/vehicles/${veh.id}`}
                              className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block hover:bg-blue-100 transition-colors"
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
                                className="h-7 px-2 text-[11px] text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                title="Contact via WhatsApp"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setCompletionDoc(doc)}
                              className="h-7 px-2 text-[11px] text-blue-700 hover:bg-blue-50 border border-blue-200 font-medium"
                            >
                              Renew
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingDoc(doc)}
                              className="h-7 px-2 text-[11px]"
                            >
                              Edit
                            </Button>

                            {currentUser?.role === 'ADMIN' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDocToDelete(doc)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete Document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {veh && (
                              <Link href={`/vehicles/${veh.id}`}>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                                  View
                                </Button>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
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

      <WhatsAppModal
        isOpen={whatsAppData.isOpen}
        onClose={() => setWhatsAppData((prev) => ({ ...prev, isOpen: false }))}
        clientName={whatsAppData.clientName}
        clientMobile={whatsAppData.clientMobile}
        registrationNumber={whatsAppData.registrationNumber}
        documentType={whatsAppData.documentType}
        dueDate={whatsAppData.dueDate}
      />
      {/* Edit Document Modal */}
      {editingDoc && (
        <DocumentModal
          isOpen={Boolean(editingDoc)}
          onClose={() => setEditingDoc(null)}
          vehicleId={editingDoc.vehicleId}
          clientId={editingDoc.clientId}
          initialDocument={editingDoc}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        onConfirm={async () => {
          if (!docToDelete) return;
          setIsDeleting(true);
          try {
            await deleteDocument(docToDelete.id);
            setDocToDelete(null);
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Delete Compliance Document"
        message={`Are you sure you want to permanently delete document "${docToDelete?.documentType}" (#${docToDelete?.documentNumber || 'N/A'})?`}
        confirmText="Delete Document"
        isLoading={isDeleting}
      />
    </div>
  );
}
