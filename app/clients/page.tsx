'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store/app-context';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ClientModal } from '@/components/shared/client-modal';
import { WhatsAppModal } from '@/components/shared/whatsapp-modal';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { TablePagination } from '@/components/ui/pagination';
import {
  Users,
  Plus,
  Search,
  Car,
  ChevronRight,
  Filter,
  UserCheck,
  Trash2,
  Pencil,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { Client } from '@/lib/types';
import { normalizeRegistrationNumber } from '@/lib/utils';

export default function ClientsPage() {
  const { filteredClients, vehicles, documents, users, currentUser, deleteClient } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [whatsAppData, setWhatsAppData] = useState<{
    isOpen: boolean;
    clientName: string;
    clientMobile: string;
    registrationNumber: string;
  }>({
    isOpen: false,
    clientName: '',
    clientMobile: '',
    registrationNumber: '',
  });

  const activeAgents = users.filter((u) => u.status === 'ACTIVE');

  // Search by: Name, Mobile, Vehicle Registration Number (Section 13)
  const filteredList = useMemo(() => {
    return filteredClients.filter((client) => {
      // Agent filter
      if (selectedAgent !== 'ALL' && client.assignedAgentId !== selectedAgent) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && client.status !== selectedStatus) {
        return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase().trim();
      const normQ = normalizeRegistrationNumber(searchTerm);

      const matchesName = client.name.toLowerCase().includes(q);
      const matchesPhone = client.mobile.replace(/\D/g, '').includes(q.replace(/\D/g, ''));

      // Check if any of client's vehicles match registration number
      const clientVehicles = vehicles.filter((v) => v.clientId === client.id);
      const matchesVehicle = clientVehicles.some(
        (v) =>
          v.normalizedRegistrationNumber.includes(normQ) ||
          v.registrationNumber.toLowerCase().includes(q)
      );

      return matchesName || matchesPhone || matchesVehicle;
    });
  }, [filteredClients, selectedAgent, selectedStatus, searchTerm, vehicles]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 on filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedAgent, selectedStatus]);

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Client Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage customer accounts, assigned agents, and vehicle fleets.
          </p>
        </div>

        <Button
          onClick={() => setIsAddClientModalOpen(true)}
          variant="primary"
          size="sm"
          className="gap-2 self-start sm:self-auto font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, mobile, vehicle reg..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
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

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <Card>
        <CardContent className="p-0">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No client accounts found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-16 text-center font-mono">Sl. No.</th>
                    <th className="px-5 py-3">Client Profile</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Owned Vehicles</th>
                    <th className="px-4 py-3">Assigned Agent</th>
                    <th className="px-4 py-3">Renewal Status</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedList.map((client, index) => {
                    const serialNo = (currentPage - 1) * pageSize + index + 1;
                    const clientVehs = vehicles.filter(
                      (v) => v.clientId === client.id && v.status === 'ACTIVE'
                    );
                    const agent = users.find((u) => u.id === client.assignedAgentId);

                    // Document stats for this client
                    const clientDocList = documents.filter((d) => d.clientId === client.id);
                    const overdueCount = clientDocList.filter((d) => d.status === 'OVERDUE').length;
                    const dueSoonCount = clientDocList.filter(
                      (d) => d.status === 'DUE_SOON' || d.status === 'DUE_TODAY'
                    ).length;

                    return (
                      <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-400 font-semibold">
                          {serialNo}
                        </td>
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/clients/${client.id}`}
                            className="font-bold text-sm text-slate-900 hover:text-blue-600 block"
                          >
                            {client.name}
                          </Link>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                            {client.address}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-800 font-mono">
                            {client.mobile}
                          </div>
                          {client.email && (
                            <div className="text-[11px] text-slate-400">{client.email}</div>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <Car className="w-3.5 h-3.5 text-blue-600" />
                            {clientVehs.length} {clientVehs.length === 1 ? 'vehicle' : 'vehicles'}
                          </div>
                          {clientVehs.length > 0 && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {clientVehs.map((v) => v.registrationNumber).slice(0, 2).join(', ')}
                              {clientVehs.length > 2 ? ' ...' : ''}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-medium text-slate-700">
                            {agent?.name || 'Unassigned'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          {overdueCount > 0 ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-bold">
                              {overdueCount} Overdue
                            </span>
                          ) : dueSoonCount > 0 ? (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                              {dueSoonCount} Due Soon
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">All Clean</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              client.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {client.status}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Action Icon Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setWhatsAppData({
                                  isOpen: true,
                                  clientName: client.name,
                                  clientMobile: client.mobile,
                                  registrationNumber: clientVehs[0]?.registrationNumber || 'Fleet',
                                })
                              }
                              className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                              title="Chat on WhatsApp"
                              aria-label="Chat on WhatsApp"
                            >
                              <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                            </Button>

                            {/* Edit Action Icon Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingClient(client)}
                              className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border-slate-200"
                              title="Edit Client"
                              aria-label="Edit Client"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {/* View Details Action Icon Button */}
                            <Link href={`/clients/${client.id}`} title="View Client Details">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-blue-50 border-slate-200"
                                aria-label="View Client Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>

                            {/* Delete Action Icon Button */}
                            {currentUser?.role === 'ADMIN' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setClientToDelete(client)}
                                className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200 hover:border-rose-200"
                                title="Delete Client"
                                aria-label="Delete Client"
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
          )}

          <TablePagination
            currentPage={currentPage}
            totalItems={filteredList.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <ClientModal
        isOpen={isAddClientModalOpen || Boolean(editingClient)}
        onClose={() => {
          setIsAddClientModalOpen(false);
          setEditingClient(null);
        }}
        initialClient={editingClient}
      />

      <WhatsAppModal
        isOpen={whatsAppData.isOpen}
        onClose={() => setWhatsAppData((prev) => ({ ...prev, isOpen: false }))}
        clientName={whatsAppData.clientName}
        clientMobile={whatsAppData.clientMobile}
        registrationNumber={whatsAppData.registrationNumber}
        documentType="Vehicle Compliance"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(clientToDelete)}
        onClose={() => setClientToDelete(null)}
        onConfirm={async () => {
          if (!clientToDelete) return;
          setIsDeleting(true);
          try {
            await deleteClient(clientToDelete.id);
            setClientToDelete(null);
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Delete Client Record"
        message={`Are you sure you want to permanently delete client "${clientToDelete?.name}"? This action cannot be undone.`}
        confirmText="Permanently Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
