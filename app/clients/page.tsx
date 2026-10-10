'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store/app-context';
import { Button } from '@/components/ui/button';
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
  Phone,
  Sparkles,
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

  // Search by: Name, Mobile, Vehicle Registration Number
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
      const matchesMobile = client.mobile.includes(q);
      const matchesAddress = client.address.toLowerCase().includes(q);

      // Check if client owns a vehicle with this registration number
      const ownedVehicles = vehicles.filter((v) => v.clientId === client.id);
      const matchesVehicle = ownedVehicles.some(
        (v) =>
          v.normalizedRegistrationNumber.includes(normQ) ||
          v.registrationNumber.toLowerCase().includes(q)
      );

      return matchesName || matchesMobile || matchesAddress || matchesVehicle;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Client Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage registered clients, vehicle owners, contact records, and assigned relationship agents.
          </p>
        </div>

        <Button
          onClick={() => setIsAddClientModalOpen(true)}
          variant="primary"
          size="sm"
          className="gap-2 self-start sm:self-auto font-bold shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Register New Client
        </Button>
      </div>

      {/* Filter and Instant Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, mobile, vehicle number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
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

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Clients Table & Mobile Touch Cards */}
      <Card className="rounded-2xl border-slate-200 shadow-2xs overflow-hidden">
        <CardContent className="p-0">
          {filteredList.length === 0 ? (
            <div className="py-14 text-center text-xs text-slate-500">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-800">No Clients Found</div>
              <p className="mt-1 text-slate-400">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3 w-14 text-center font-mono">Sl. No.</th>
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

              {/* Mobile Touch Cards View */}
              <div className="md:hidden divide-y divide-slate-100">
                {paginatedList.map((client, index) => {
                  const clientVehs = vehicles.filter(
                    (v) => v.clientId === client.id && v.status === 'ACTIVE'
                  );
                  const clientDocList = documents.filter((d) => d.clientId === client.id);
                  const overdueCount = clientDocList.filter((d) => d.status === 'OVERDUE').length;
                  const dueSoonCount = clientDocList.filter(
                    (d) => d.status === 'DUE_SOON' || d.status === 'DUE_TODAY'
                  ).length;

                  return (
                    <div key={client.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            href={`/clients/${client.id}`}
                            className="font-bold text-sm text-slate-900 hover:text-blue-600 block"
                          >
                            {client.name}
                          </Link>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{client.mobile}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                            {client.address}
                          </div>
                        </div>

                        <div>
                          {overdueCount > 0 ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                              {overdueCount} Overdue
                            </span>
                          ) : dueSoonCount > 0 ? (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                              {dueSoonCount} Due Soon
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
                              Clean
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-600 font-medium">Vehicles Owned</span>
                        <span className="font-bold text-slate-900">
                          {clientVehs.length} vehicle{clientVehs.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
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
                          className="flex-1 text-xs gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-9"
                        >
                          <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                          <span>WhatsApp</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingClient(client)}
                          className="h-9 px-3 text-xs gap-1 text-slate-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>

                        <Link href={`/clients/${client.id}`} className="flex-1">
                          <Button size="sm" variant="primary" className="w-full text-xs gap-1 h-9">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Profile</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
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
      />

      {clientToDelete && (
        <ConfirmModal
          isOpen={Boolean(clientToDelete)}
          onClose={() => setClientToDelete(null)}
          title="Delete Client Record?"
          message={`Are you sure you want to permanently delete ${clientToDelete.name}? Any associated active vehicles will be orphaned.`}
          confirmText="Yes, Delete Client"
          isDestructive={true}
          isLoading={isDeleting}
          onConfirm={async () => {
            setIsDeleting(true);
            try {
              await deleteClient(clientToDelete.id);
              setClientToDelete(null);
            } catch (err: any) {
              alert(err?.message || 'Failed to delete client.');
            } finally {
              setIsDeleting(false);
            }
          }}
        />
      )}
    </div>
  );
}
