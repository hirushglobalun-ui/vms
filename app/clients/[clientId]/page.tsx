'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/lib/store/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientModal } from '@/components/shared/client-modal';
import { VehicleModal } from '@/components/shared/vehicle-modal';
import { WhatsAppModal } from '@/components/shared/whatsapp-modal';
import { RenewalStatusBadge } from '@/components/shared/status-badge';
import { getDocumentTypeName } from '@/lib/renewals/engine';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
  Users,
  Car,
  Phone,
  Mail,
  MapPin,
  Plus,
  Edit,
  ArrowLeft,
  Calendar,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.clientId as string;

  const { clients, vehicles, documents, users, currentUser, deleteClient } = useApp();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
    documentType: 'Vehicle Documents',
  });

  const client = clients.find((c) => c.id === clientId);

  if (!client) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-base font-semibold text-slate-900">Client Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">This client may have been removed or deactivated.</p>
        <Link href="/clients" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            Back to Client Directory
          </Button>
        </Link>
      </div>
    );
  }

  // Strict RBAC check for direct URL access (Sections 7, 28, 30)
  if (currentUser?.role === 'AGENT' && client.assignedAgentId !== currentUser.id) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Access Denied</h2>
        <p className="text-xs text-slate-500 mt-1">
          You do not have permission to access this client account. This record is managed by another agent.
        </p>
        <Link href="/clients" className="mt-4 inline-block">
          <Button variant="primary" size="sm">
            Return to My Clients
          </Button>
        </Link>
      </div>
    );
  }

  const clientVehicles = vehicles.filter((v) => v.clientId === client.id);
  const assignedAgent = users.find((u) => u.id === client.assignedAgentId);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Clients
        </Link>
      </div>

      {/* Client Overview Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl shrink-0">
            {client.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  client.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {client.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 mt-2">
              <div className="flex items-center gap-1.5 font-mono font-medium">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {client.mobile}
                {client.alternateMobile && ` / ${client.alternateMobile}`}
              </div>

              {client.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {client.email}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {client.address}
              </div>
            </div>

            <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
              <span className="font-semibold text-slate-700">Assigned Agent:</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-medium">
                {assignedAgent?.name || 'Unassigned'}
              </span>
              {client.notes && (
                <span className="italic text-slate-400">• &ldquo;{client.notes}&rdquo;</span>
              )}
            </div>
          </div>
        </div>

        {/* Client Top Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setWhatsAppData({
                isOpen: true,
                clientName: client.name,
                clientMobile: client.mobile,
                registrationNumber: clientVehicles[0]?.registrationNumber || 'Fleet',
                documentType: 'Vehicle Services',
              })
            }
            className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5"
          >
            <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
            WhatsApp
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Profile
          </Button>

          {currentUser?.role === 'ADMIN' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              Delete Client
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddVehicleModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Owned Vehicles Workspace (Section 14) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Car className="w-4 h-4 text-blue-600" />
            Registered Vehicles ({clientVehicles.length})
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAddVehicleModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Register Vehicle
          </Button>
        </div>

        {clientVehicles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-xs text-slate-500">
              No vehicles registered under this client yet.
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsAddVehicleModalOpen(true)}
                >
                  Add First Vehicle
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientVehicles.map((veh) => {
              const vehDocs = documents.filter((d) => d.vehicleId === veh.id);
              const overdueCount = vehDocs.filter((d) => d.status === 'OVERDUE').length;
              const dueSoonCount = vehDocs.filter((d) => d.status === 'DUE_SOON' || d.status === 'DUE_TODAY').length;

              // Nearest upcoming/overdue document
              const priorityDoc = [...vehDocs].sort((a, b) => {
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return a.expiryDate.localeCompare(b.expiryDate);
              })[0];

              return (
                <Card
                  key={veh.id}
                  className="hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono text-base font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md inline-block border border-blue-200">
                          {veh.registrationNumber}
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mt-1">
                          {veh.make} {veh.model}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {veh.variant || veh.fuelType} • {veh.rto}
                        </p>
                      </div>

                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold uppercase">
                        {veh.vehicleType.replace('_', ' ')}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3">
                    {/* Compliance Status Pills */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      {overdueCount > 0 ? (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {overdueCount} Overdue
                        </span>
                      ) : dueSoonCount > 0 ? (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                          {dueSoonCount} Due Soon
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          All Clean
                        </span>
                      )}

                      <span className="text-xs text-slate-400 font-medium">
                        {vehDocs.length} {vehDocs.length === 1 ? 'doc' : 'docs'} tracked
                      </span>
                    </div>

                    {priorityDoc && (
                      <div className="bg-slate-50 p-2 rounded-lg text-xs flex items-center justify-between">
                        <span className="text-slate-600 font-medium truncate">
                          {getDocumentTypeName(priorityDoc.documentType)}
                        </span>
                        <RenewalStatusBadge status={priorityDoc.status} />
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <Link href={`/vehicles/${veh.id}`} className="w-full">
                        <Button variant="primary" size="sm" className="w-full text-xs">
                          Open Vehicle Workspace →
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <ClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialClient={client}
      />

      <VehicleModal
        isOpen={isAddVehicleModalOpen}
        onClose={() => setIsAddVehicleModalOpen(false)}
        clientId={client.id}
      />

      <WhatsAppModal
        isOpen={whatsAppData.isOpen}
        onClose={() => setWhatsAppData((prev) => ({ ...prev, isOpen: false }))}
        clientName={whatsAppData.clientName}
        clientMobile={whatsAppData.clientMobile}
        registrationNumber={whatsAppData.registrationNumber}
        documentType={whatsAppData.documentType}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await deleteClient(client.id);
            router.push('/clients');
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Delete Client Record"
        message={`Are you sure you want to delete client "${client.name}"? This action cannot be undone.`}
        confirmText="Permanently Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
