'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { VehicleModal } from '@/components/shared/vehicle-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { WhatsAppModal } from '@/components/shared/whatsapp-modal';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { TablePagination } from '@/components/ui/pagination';
import { RenewalStatusBadge } from '@/components/shared/status-badge';
import { getDocumentTypeName } from '@/lib/renewals/engine';
import { normalizeRegistrationNumber } from '@/lib/utils';
import {
  Car,
  Plus,
  Search,
  Filter,
  ChevronRight,
  User,
  ShieldCheck,
  AlertCircle,
  Clock,
  Pencil,
  Eye,
  Trash2,
  Sparkles,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import { Vehicle, VehicleType } from '@/lib/types';

export default function VehiclesPage() {
  const { filteredVehicles, clients, documents, users, currentUser, deleteVehicle } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
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

  // Multi-field search prioritizing normalized registration number
  const filteredList = useMemo(() => {
    return filteredVehicles.filter((veh) => {
      // Agent filter
      if (selectedAgent !== 'ALL' && veh.assignedAgentId !== selectedAgent) {
        return false;
      }

      // Type filter
      if (selectedType !== 'ALL' && veh.vehicleType !== selectedType) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && veh.status !== selectedStatus) {
        return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase().trim();
      const normQ = normalizeRegistrationNumber(searchTerm);

      const matchesReg =
        veh.normalizedRegistrationNumber.includes(normQ) ||
        veh.registrationNumber.toLowerCase().includes(q);

      const matchesMake = veh.make.toLowerCase().includes(q);
      const matchesModel = veh.model.toLowerCase().includes(q);
      const matchesRto = veh.rto.toLowerCase().includes(q);

      // Match owner name
      const owner = clients.find((c) => c.id === veh.clientId);
      const matchesOwner = owner ? owner.name.toLowerCase().includes(q) : false;

      return matchesReg || matchesMake || matchesModel || matchesRto || matchesOwner;
    });
  }, [filteredVehicles, selectedAgent, selectedType, selectedStatus, searchTerm, clients]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 on filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedAgent, selectedType, selectedStatus]);

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
            <Car className="w-6 h-6 text-blue-600" />
            Vehicles Registry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search vehicles, inspect RTO compliance, and review renewal schedules.
          </p>
        </div>

        <Button
          onClick={() => setIsAddVehicleModalOpen(true)}
          variant="primary"
          size="sm"
          className="gap-2 self-start sm:self-auto font-bold shadow-sm shadow-blue-500/20"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Register Vehicle & Scan RC</span>
        </Button>
      </div>

      {/* Filter and Instant Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search registration (e.g. KL-10-AB-1234), owner, make..."
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="PRIVATE_CAR">Private Car</option>
            <option value="COMMERCIAL_TAXI">Commercial Taxi</option>
            <option value="GOODS_CARRIER">Goods Carrier</option>
            <option value="BUS">Bus</option>
            <option value="TWO_WHEELER">Two Wheeler</option>
          </select>

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

      {/* Vehicles Table & Mobile Cards */}
      <Card className="rounded-2xl border-slate-200 shadow-2xs overflow-hidden">
        <CardContent className="p-0">
          {filteredList.length === 0 ? (
            <div className="py-14 text-center text-xs text-slate-500">
              <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-800">No Vehicles Found</div>
              <p className="mt-1 text-slate-400">Try adjusting your search criteria or register a new vehicle.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3 w-14 text-center font-mono">Sl. No.</th>
                      <th className="px-5 py-3">Registration No.</th>
                      <th className="px-4 py-3">Vehicle Details</th>
                      <th className="px-4 py-3">Registered Owner</th>
                      <th className="px-4 py-3">Assigned Agent</th>
                      <th className="px-4 py-3">Next Due Renewal</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedList.map((veh, index) => {
                      const serialNo = (currentPage - 1) * pageSize + index + 1;
                      const owner = clients.find((c) => c.id === veh.clientId);
                      const agent = users.find((u) => u.id === veh.assignedAgentId);

                      // Documents & Urgency
                      const vehDocs = documents.filter(
                        (d) => d.vehicleId === veh.id && !d.isHistorical
                      );
                      const overdueDocs = vehDocs.filter((d) => d.status === 'OVERDUE');
                      const dueSoonDocs = vehDocs.filter(
                        (d) => d.status === 'DUE_SOON' || d.status === 'DUE_TODAY'
                      );

                      // Next renewal item
                      const nextRenewalDoc = [...vehDocs].sort((a, b) => {
                        if (!a.expiryDate) return 1;
                        if (!b.expiryDate) return -1;
                        return a.expiryDate.localeCompare(b.expiryDate);
                      })[0];

                      return (
                        <tr key={veh.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-400 font-semibold">
                            {serialNo}
                          </td>
                          <td className="px-5 py-3.5">
                            <Link
                              href={`/vehicles/${veh.id}`}
                              className="font-mono font-bold text-sm text-blue-700 bg-blue-50/90 px-2.5 py-1 rounded-lg border border-blue-200 inline-block hover:bg-blue-100 transition-colors"
                            >
                              {veh.registrationNumber}
                            </Link>
                            <div className="text-[10px] text-slate-400 font-medium mt-1">
                              {veh.rto}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">
                              {veh.make} {veh.model}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {veh.variant || veh.fuelType} • {veh.vehicleType.replace('_', ' ')}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {owner ? (
                              <Link
                                href={`/clients/${owner.id}`}
                                className="font-semibold text-slate-900 hover:text-blue-600 block"
                              >
                                {owner.name}
                              </Link>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                            <div className="text-[11px] text-slate-500">{owner?.mobile}</div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-medium text-slate-700">
                              {agent?.name || 'Unassigned'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            {nextRenewalDoc ? (
                              <div>
                                <div className="font-semibold text-slate-800">
                                  {getDocumentTypeName(nextRenewalDoc.documentType)}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  Due: {nextRenewalDoc.expiryDate || 'N/A'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">No active docs</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {overdueDocs.length > 0 ? (
                              <RenewalStatusBadge status="OVERDUE" />
                            ) : dueSoonDocs.length > 0 ? (
                              <RenewalStatusBadge status={dueSoonDocs[0].status} />
                            ) : (
                              <RenewalStatusBadge status="ACTIVE" />
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* WhatsApp Action Icon Button */}
                              {owner?.mobile && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setWhatsAppData({
                                      isOpen: true,
                                      clientName: owner.name,
                                      clientMobile: owner.mobile,
                                      registrationNumber: veh.registrationNumber,
                                    })
                                  }
                                  className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                  title="Chat on WhatsApp"
                                  aria-label="Chat on WhatsApp"
                                >
                                  <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                                </Button>
                              )}

                              {/* Edit Action Icon Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingVehicle(veh)}
                                className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border-slate-200"
                                title="Edit Vehicle"
                                aria-label="Edit Vehicle"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>

                              {/* Open Workspace Action Icon Button */}
                              <Link href={`/vehicles/${veh.id}`} title="Open Vehicle Workspace">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-blue-50 border-slate-200"
                                  aria-label="Open Vehicle Workspace"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>

                              {/* Delete Action Icon Button */}
                              {currentUser?.role === 'ADMIN' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setVehicleToDelete(veh)}
                                  className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200 hover:border-rose-200"
                                  title="Delete Vehicle"
                                  aria-label="Delete Vehicle"
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
                {paginatedList.map((veh, index) => {
                  const owner = clients.find((c) => c.id === veh.clientId);
                  const vehDocs = documents.filter((d) => d.vehicleId === veh.id && !d.isHistorical);
                  const overdueDocs = vehDocs.filter((d) => d.status === 'OVERDUE');
                  const dueSoonDocs = vehDocs.filter((d) => d.status === 'DUE_SOON' || d.status === 'DUE_TODAY');

                  return (
                    <div key={veh.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            href={`/vehicles/${veh.id}`}
                            className="font-mono font-bold text-sm text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 inline-block hover:bg-blue-100"
                          >
                            {veh.registrationNumber}
                          </Link>
                          <div className="text-xs font-bold text-slate-900 mt-1">
                            {veh.make} {veh.model} {veh.variant ? `(${veh.variant})` : ''}
                          </div>
                          <div className="text-[11px] text-slate-500">{veh.rto}</div>
                        </div>

                        <div>
                          {overdueDocs.length > 0 ? (
                            <RenewalStatusBadge status="OVERDUE" />
                          ) : dueSoonDocs.length > 0 ? (
                            <RenewalStatusBadge status={dueSoonDocs[0].status} />
                          ) : (
                            <RenewalStatusBadge status="ACTIVE" />
                          )}
                        </div>
                      </div>

                      {/* Owner Info Box */}
                      <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Owner</span>
                          <span className="font-semibold text-slate-800">{owner?.name || 'Unassigned'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                          <span className="font-mono text-slate-700">{owner?.mobile || '—'}</span>
                        </div>
                      </div>

                      {/* Mobile Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        {owner?.mobile && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setWhatsAppData({
                                isOpen: true,
                                clientName: owner.name,
                                clientMobile: owner.mobile,
                                registrationNumber: veh.registrationNumber,
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
                          onClick={() => setEditingVehicle(veh)}
                          className="h-9 px-3 text-xs gap-1 text-slate-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>

                        <Link href={`/vehicles/${veh.id}`} className="flex-1">
                          <Button size="sm" variant="primary" className="w-full text-xs gap-1 h-9">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Manage</span>
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
      <VehicleModal
        isOpen={isAddVehicleModalOpen || Boolean(editingVehicle)}
        initialVehicle={editingVehicle}
        onClose={() => {
          setIsAddVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
      />

      <WhatsAppModal
        isOpen={whatsAppData.isOpen}
        onClose={() => setWhatsAppData((prev) => ({ ...prev, isOpen: false }))}
        clientName={whatsAppData.clientName}
        clientMobile={whatsAppData.clientMobile}
        registrationNumber={whatsAppData.registrationNumber}
      />

      {vehicleToDelete && (
        <ConfirmModal
          isOpen={Boolean(vehicleToDelete)}
          onClose={() => setVehicleToDelete(null)}
          title="Delete Vehicle Record?"
          message={`Are you sure you want to permanently delete vehicle ${vehicleToDelete.registrationNumber} (${vehicleToDelete.make} ${vehicleToDelete.model})? All attached documents and tasks will also be removed.`}
          confirmText="Yes, Delete Vehicle"
          isDestructive={true}
          isLoading={isDeleting}
          onConfirm={async () => {
            setIsDeleting(true);
            try {
              await deleteVehicle(vehicleToDelete.id);
              setVehicleToDelete(null);
            } catch (err: any) {
              alert(err?.message || 'Failed to delete vehicle.');
            } finally {
              setIsDeleting(false);
            }
          }}
        />
      )}
    </div>
  );
}
