'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { VehicleModal } from '@/components/shared/vehicle-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
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
  Edit,
  Trash2,
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

  const activeAgents = users.filter((u) => u.status === 'ACTIVE');

  // Multi-field search prioritizing normalized registration number (Section 16 & 49)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600" />
            Vehicles Registry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search any vehicle, inspect RTO compliance, and review renewal schedules.
          </p>
        </div>

        <Button
          onClick={() => setIsAddVehicleModalOpen(true)}
          variant="primary"
          size="sm"
          className="gap-2 self-start sm:self-auto font-semibold"
        >
          <Plus className="w-4 h-4" />
          Register Vehicle
        </Button>
      </div>

      {/* Filter and Instant Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search registration (e.g. KL-10-AB-1234), owner, make..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
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
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table (Section 16) */}
      <Card>
        <CardContent className="p-0">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No vehicles matched your query or filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
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
                  {filteredList.map((veh) => {
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
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/vehicles/${veh.id}`}
                            className="font-mono font-bold text-sm text-blue-700 bg-blue-50/90 px-2 py-0.5 rounded border border-blue-200 inline-block hover:bg-blue-100 transition-colors"
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingVehicle(veh)}
                              className="h-7 px-2 text-[11px]"
                            >
                              Edit
                            </Button>

                            <Link href={`/vehicles/${veh.id}`}>
                              <Button size="sm" variant="secondary" className="h-7 px-2.5 text-[11px] gap-1">
                                Workspace <ChevronRight className="w-3 h-3" />
                              </Button>
                            </Link>

                            {currentUser?.role === 'ADMIN' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setVehicleToDelete(veh)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete Vehicle"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </CardContent>
      </Card>

      {/* Modal */}
      <VehicleModal
        isOpen={isAddVehicleModalOpen || Boolean(editingVehicle)}
        onClose={() => {
          setIsAddVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
        initialVehicle={editingVehicle}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(vehicleToDelete)}
        onClose={() => setVehicleToDelete(null)}
        onConfirm={async () => {
          if (!vehicleToDelete) return;
          setIsDeleting(true);
          try {
            await deleteVehicle(vehicleToDelete.id);
            setVehicleToDelete(null);
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Delete Vehicle Record"
        message={`Are you sure you want to permanently delete vehicle "${vehicleToDelete?.registrationNumber}" (${vehicleToDelete?.make} ${vehicleToDelete?.model})? All linked documents and history will be affected.`}
        confirmText="Permanently Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
