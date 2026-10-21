'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useApp } from '@/lib/store/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VehicleModal } from '@/components/shared/vehicle-modal';
import { DocumentModal } from '@/components/shared/document-modal';
import { CompletionModal } from '@/components/shared/completion-modal';
import { TaskModal } from '@/components/shared/task-modal';
import { WhatsAppModal } from '@/components/shared/whatsapp-modal';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { RenewalStatusBadge, TaskStatusBadge, PriorityBadge } from '@/components/shared/status-badge';
import { getDocumentTypeName } from '@/lib/renewals/engine';
import { formatCurrency } from '@/lib/utils';
import {
  Car,
  User,
  Phone,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit,
  Pencil,
  ArrowLeft,
  FileCheck,
  Shield,
  ShieldAlert,
  Download,
  Upload,
  ExternalLink,
  History,
  CheckSquare,
  Trash2,
  Flame,
  RotateCcw,
  Sparkles,
  Receipt,
  IndianRupee,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VehicleDocument } from '@/lib/types';

export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = params?.vehicleId as string;

  const {
    vehicles,
    clients,
    documents,
    tasks,
    activityLogs,
    users,
    currentUser,
    addDocument,
    updateTask,
    completeTask,
    deleteVehicle,
    deleteDocument,
    deleteTask,
  } = useApp();

  const router = useRouter();

  // Modals state
  const [isEditVehicleModalOpen, setIsEditVehicleModalOpen] = useState(false);
  const [isDeleteVehicleModalOpen, setIsDeleteVehicleModalOpen] = useState(false);
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<VehicleDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<VehicleDocument | null>(null);
  const [completionDoc, setCompletionDoc] = useState<VehicleDocument | null>(null);
  const [completionTaskId, setCompletionTaskId] = useState<string | undefined>(undefined);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [whatsAppData, setWhatsAppData] = useState<{
    isOpen: boolean;
    documentType: string;
    dueDate?: string;
  }>({
    isOpen: false,
    documentType: 'Vehicle Documents',
  });

  const vehicle = vehicles.find((v) => v.id === vehicleId);

  if (!vehicle) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-base font-semibold text-slate-900">Vehicle Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">This record may have been removed or deactivated.</p>
        <Link href="/vehicles" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            Back to Vehicle Directory
          </Button>
        </Link>
      </div>
    );
  }

  const client = clients.find((c) => c.id === vehicle.clientId);
  const agent = users.find((u) => u.id === vehicle.assignedAgentId);

  // Strict RBAC check for direct URL access (Sections 7, 28, 30)
  if (currentUser?.role === 'AGENT' && vehicle.assignedAgentId !== currentUser.id && client?.assignedAgentId !== currentUser.id) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">
          You do not have authorization to view this vehicle. Agents may only access records explicitly assigned to their account.
        </p>
        <Link href="/vehicles" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            Return to My Vehicles
          </Button>
        </Link>
      </div>
    );
  }

  // Separate active documents vs historical completed renewal records (Section 69 & 70)
  const vehicleDocs = documents.filter((d) => d.vehicleId === vehicle.id);
  const activeDocs = vehicleDocs.filter((d) => !d.isHistorical);
  const historicalDocs = vehicleDocs.filter((d) => d.isHistorical);

  // Automatically ensure all 4 core periodic compliances (Fitness, Insurance, Road Tax, PUC) exist for this vehicle
  useEffect(() => {
    if (!vehicle) return;
    const coreTypes: Array<'FITNESS' | 'INSURANCE' | 'ROAD_TAX' | 'PUC'> = [
      'FITNESS',
      'INSURANCE',
      'ROAD_TAX',
      'PUC',
    ];
    const existingTypes = new Set(activeDocs.map((d) => d.documentType));

    coreTypes.forEach((docType) => {
      if (!existingTypes.has(docType)) {
        addDocument({
          vehicleId: vehicle.id,
          clientId: vehicle.clientId,
          documentType: docType,
          expiryDate:
            docType === 'FITNESS' && vehicle.registrationValidity
              ? vehicle.registrationValidity
              : undefined,
          reminderDays: docType === 'PUC' ? 15 : 30,
          notes: `${getDocumentTypeName(docType)} compliance`,
        });
      }
    });
  }, [vehicle?.id, activeDocs.length]);

  // Associated tasks for this vehicle
  const vehicleTasks = tasks.filter((t) => t.vehicleId === vehicle.id);

  // Associated activity logs
  const vehicleLogs = activityLogs.filter(
    (l) => l.entityId === vehicle.id || vehicleDocs.some((d) => d.id === l.entityId)
  );

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/vehicles"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Vehicles
        </Link>
      </div>

      {/* 1. VEHICLE HEADER WORKSPACE (Section 17 & 86) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-md shadow-blue-500/20">
            <Car className="w-7 h-7" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xl font-bold tracking-tight text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                {vehicle.registrationNumber}
              </span>
              <h1 className="text-xl font-bold text-slate-900">
                {vehicle.make} {vehicle.model}
              </h1>
              <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                {vehicle.vehicleType.replace('_', ' ')}
              </span>
            </div>

            {/* Owner & Agent Highlights */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-600 mt-2">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Owner:</span>
                {client ? (
                  <Link href={`/clients/${client.id}`} className="text-blue-600 hover:underline font-bold">
                    {client.name}
                  </Link>
                ) : (
                  'N/A'
                )}
                {client?.relationshipName && (
                  <span className="text-slate-500 font-normal">
                    (S/D/W: {client.relationshipName})
                  </span>
                )}
              </div>

              {client && (
                <div className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {client.mobile}
                  {client.pincode && (
                    <span className="text-slate-400 font-sans">
                      • PIN {client.pincode}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Assigned Agent:</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-800">
                  {agent?.name || 'Unassigned'}
                </span>
              </div>

              {/* Billing & Advance Payment Status */}
              {(vehicle.totalCost !== undefined || vehicle.amountReceived !== undefined || vehicle.paymentStatus) && (
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-purple-600" />
                  <span className="font-semibold text-slate-700">Billing:</span>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    vehicle.paymentStatus === 'SETTLED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : vehicle.paymentStatus === 'REFUND_DUE'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {vehicle.paymentStatus === 'SETTLED'
                      ? `Settled: ₹${(vehicle.totalCost || 0).toLocaleString('en-IN')}`
                      : vehicle.paymentStatus === 'REFUND_DUE'
                      ? `Refund: ₹${(vehicle.balanceAmount || 0).toLocaleString('en-IN')} (Adv: ₹${(vehicle.amountReceived || 0).toLocaleString('en-IN')})`
                      : `Due: ₹${(vehicle.balanceAmount || 0).toLocaleString('en-IN')} (Adv: ₹${(vehicle.amountReceived || 0).toLocaleString('en-IN')})`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Actions */}
        {/* Top Actions (Icon Only) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {client && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setWhatsAppData({
                  isOpen: true,
                  documentType: 'Upcoming Renewal',
                })
              }
              className="h-9 w-9 p-0 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50 transition-colors"
              title="WhatsApp Client"
              aria-label="WhatsApp Client"
            >
              <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditVehicleModalOpen(true)}
            className="h-9 w-9 p-0 rounded-xl text-slate-700 border-slate-200 hover:bg-slate-50 transition-colors"
            title="Edit Vehicle Info"
            aria-label="Edit Vehicle Info"
          >
            <Edit className="w-4 h-4" />
          </Button>

          {currentUser?.role === 'ADMIN' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteVehicleModalOpen(true)}
              className="h-9 w-9 p-0 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 transition-colors"
              title="Delete Vehicle"
              aria-label="Delete Vehicle"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddDocModalOpen(true)}
            className="h-9 w-9 p-0 rounded-xl transition-colors shadow-xs"
            title="Add Compliance Document"
            aria-label="Add Compliance Document"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 2. TECHNICAL SPECIFICATIONS & RTO INFORMATION */}
      <Card>
        <CardHeader className="py-3 px-5 bg-slate-50/70 border-b border-slate-100">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Vehicle Specification & RC Smart Card Technical Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {/* Primary RTO & Engine Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">RTO Authority</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{vehicle.rto}</span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Fuel Type</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{vehicle.fuelType}</span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Vehicle Class</span>
              <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                {vehicle.vehicleClass || vehicle.vehicleType.replace('_', ' ')}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Mfg. Date / Year</span>
              <span className="font-bold text-slate-900 mt-0.5 block">
                {vehicle.manufacturingMonthYear || vehicle.manufacturingYear || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Reg. Date</span>
              <span className="font-mono font-medium text-slate-700 mt-0.5 block">
                {vehicle.registrationDate || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">RC Validity / Fitness</span>
              <span className="font-mono font-bold text-blue-700 mt-0.5 block">
                {vehicle.registrationValidity || 'N/A'}
              </span>
            </div>
          </div>

          {/* Technical Specifications (Color, Seating, Weight, CC, HP, Dimensions) */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
            {vehicle.color && (
              <div>
                <span className="text-slate-400 font-medium block">Color</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{vehicle.color}</span>
              </div>
            )}

            {vehicle.bodyType && (
              <div>
                <span className="text-slate-400 font-medium block">Body Type</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{vehicle.bodyType}</span>
              </div>
            )}

            {vehicle.seatingCapacity !== undefined && vehicle.seatingCapacity !== null && (
              <div>
                <span className="text-slate-400 font-medium block">Seating Capacity</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {vehicle.seatingCapacity} Persons
                </span>
              </div>
            )}

            {vehicle.unladenWeight !== undefined && vehicle.unladenWeight !== null && (
              <div>
                <span className="text-slate-400 font-medium block">Unladen Weight</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {vehicle.unladenWeight} kg
                </span>
              </div>
            )}

            {vehicle.cubicCapacity !== undefined && vehicle.cubicCapacity !== null && (
              <div>
                <span className="text-slate-400 font-medium block">Engine Capacity</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {vehicle.cubicCapacity} cc
                </span>
              </div>
            )}

            {vehicle.horsepower && (
              <div>
                <span className="text-slate-400 font-medium block">Horse Power</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {vehicle.horsepower}
                </span>
              </div>
            )}

            {vehicle.wheelbase !== undefined && vehicle.wheelbase !== null && (
              <div>
                <span className="text-slate-400 font-medium block">Wheelbase</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {vehicle.wheelbase} mm
                </span>
              </div>
            )}

            {vehicle.cylinders !== undefined && vehicle.cylinders !== null && (
              <div>
                <span className="text-slate-400 font-medium block">Cylinders</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {vehicle.cylinders}
                </span>
              </div>
            )}

            {vehicle.ownerSerial !== undefined && vehicle.ownerSerial !== null && (
              <div>
                <span className="text-slate-400 font-medium block">Owner Serial</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  #{vehicle.ownerSerial} (Ownership)
                </span>
              </div>
            )}

            {vehicle.financier && (
              <div>
                <span className="text-slate-400 font-medium block">Financier / Hypo</span>
                <span className="font-semibold text-slate-900 mt-0.5 block truncate">
                  {vehicle.financier}
                </span>
              </div>
            )}

            {vehicle.emissionNorms && (
              <div>
                <span className="text-slate-400 font-medium block">Emission Norms</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {vehicle.emissionNorms}
                </span>
              </div>
            )}
          </div>

          {/* VIN & Engine Numbers */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Chassis Number (VIN)</span>
              <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                {vehicle.chassisNumber || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Engine / Motor Number</span>
              <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                {vehicle.engineNumber || 'N/A'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2.5 FINANCIAL & BILLING OVERVIEW CARD */}
      <Card className="border-purple-200/90 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/30 shadow-2xs">
        <CardHeader className="py-3.5 px-5 bg-white/70 border-b border-purple-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-2xs">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-950">
                Financial Tracking &amp; Payment Status (ബില്ലിംഗ് &amp; അഡ്വാൻസ് വിവരങ്ങൾ)
              </CardTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Service fees, initial advance tokens, and balance reconciliation
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditVehicleModalOpen(true)}
            className="h-8 px-3 text-xs font-bold text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 rounded-xl gap-1.5 shadow-2xs cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Update Payment / Advance</span>
          </Button>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                Total / Estimated Cost (ആകെ തുക)
              </span>
              <span className="text-xl font-mono font-black text-slate-900 block">
                {vehicle.totalCost !== undefined ? `₹${vehicle.totalCost.toLocaleString('en-IN')}` : '—'}
              </span>
              <span className="text-[10px] text-slate-400 block">Service fee or government charges</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wide block">
                Advance Received (ലഭിച്ച അഡ്വാൻസ്)
              </span>
              <span className="text-xl font-mono font-black text-purple-700 block">
                {vehicle.amountReceived !== undefined ? `₹${vehicle.amountReceived.toLocaleString('en-IN')}` : '₹0'}
              </span>
              <span className="text-[10px] text-slate-400 block">Initial token paid by client</span>
            </div>

            <div className={`p-3.5 rounded-xl border shadow-2xs space-y-1 ${
              vehicle.paymentStatus === 'SETTLED'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : vehicle.paymentStatus === 'REFUND_DUE'
                ? 'bg-blue-50 border-blue-300 text-blue-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold block">
                  {vehicle.paymentStatus === 'SETTLED'
                    ? 'Payment Settled (പൂർണ്ണമായി ലഭിച്ചു)'
                    : vehicle.paymentStatus === 'REFUND_DUE'
                    ? 'Refund to Client (തിരികെ നൽകാനുള്ളത്)'
                    : 'Balance Due (ബാക്കി ലഭിക്കാനുള്ളത്)'}
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase bg-white/80 border border-slate-200/50">
                  {vehicle.paymentStatus ? vehicle.paymentStatus.replace('_', ' ') : 'PENDING'}
                </span>
              </div>
              <span className="text-xl font-mono font-black block">
                {vehicle.paymentStatus === 'SETTLED'
                  ? '₹0 (Settled)'
                  : `₹${(vehicle.balanceAmount || 0).toLocaleString('en-IN')}`}
              </span>
              <span className="text-[10px] opacity-80 block">
                {vehicle.paymentStatus === 'SETTLED'
                  ? 'All bills completely clear'
                  : vehicle.paymentStatus === 'REFUND_DUE'
                  ? 'Return excess advance to client'
                  : 'Pending to collect from owner'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. ACTIVE DOCUMENTS & RENEWALS (Central Business Entity - Section 17 & 18) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              Compliance Documents & Renewal Status
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Current active policies, certificates, and tax validity periods.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddDocModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Document
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {activeDocs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No documents added for this vehicle yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-16 text-center font-mono">Sl. No.</th>
                    <th className="px-5 py-3">Document Category</th>
                    <th className="px-4 py-3">Issue / Start Date</th>
                    <th className="px-4 py-3">Expiry / Due Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeDocs.map((doc, idx) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-400 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{getDocumentTypeName(doc.documentType)}</span>
                          {doc.documentName && (
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({doc.documentName})
                            </span>
                          )}
                        </div>
                        {doc.documentNumber && (
                          <div className="text-[11px] font-mono text-slate-500 font-normal">
                            Doc No: {doc.documentNumber}
                          </div>
                        )}
                        {doc.insuranceProvider && (
                          <div className="text-[11px] text-slate-500 font-normal">
                            {doc.insuranceProvider} ({doc.policyType})
                          </div>
                        )}
                        {doc.testingCentre && (
                          <div className="text-[11px] text-slate-500 font-normal truncate max-w-xs">
                            Centre: {doc.testingCentre}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-mono">
                        {doc.issueDate || doc.startDate || doc.lastPaymentDate || '—'}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                        {doc.expiryDate || 'Permanent / N/A'}
                      </td>

                      <td className="px-4 py-3.5">
                        <RenewalStatusBadge status={doc.status} />
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp for this document */}
                          {client && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setWhatsAppData({
                                  isOpen: true,
                                  documentType: doc.documentType,
                                  dueDate: doc.expiryDate,
                                })
                              }
                              className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                              title="Remind client via WhatsApp"
                              aria-label="Remind client via WhatsApp"
                            >
                              <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                            </Button>
                          )}

                          {/* Complete renewal cycle icon button */}
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

                          {/* Edit document icon button */}
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

                          {/* Delete document icon button */}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. TASKS SECTION (Follow-ups & Agent Work - Redesigned) */}
      <Card className="overflow-hidden border border-slate-200/90 shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 px-5 bg-slate-50/50 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Operational Tasks &amp; Follow-ups</span>
                  <div className="flex items-center gap-1.5 ml-1">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                      {vehicleTasks.filter((t) => t.status !== 'COMPLETED').length} Pending
                    </span>
                    {vehicleTasks.some((t) => t.status === 'COMPLETED') && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        {vehicleTasks.filter((t) => t.status === 'COMPLETED').length} Done
                      </span>
                    )}
                  </div>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated renewal tracking, agent assignments, and RTO compliance actions.
                </p>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsTaskModalOpen(true)}
            className="text-xs gap-1.5 self-start sm:self-auto cursor-pointer bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </Button>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {vehicleTasks.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No active tasks for this vehicle</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All compliances are up-to-date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {vehicleTasks.map((task) => {
                const assignedAgent = users.find((u) => u.id === task.assignedTo);
                const isCompleted = task.status === 'COMPLETED';

                // Clean title without repeating registration number
                const cleanTitle = task.title
                  .replace(new RegExp(`^${vehicle.registrationNumber}\\s*-\\s*`, 'i'), '')
                  .replace(/^[A-Z0-9\s-]{6,15}\s*-\\s*/i, '')
                  .trim() || task.title;

                const titleLower = ((task.title || '') + ' ' + (task.description || '')).toLowerCase();
                let categoryName = 'General Task';
                let categoryTheme = {
                  badge: 'bg-purple-50 text-purple-700 border-purple-200/80',
                  icon: <CheckSquare className="w-3.5 h-3.5 text-purple-600" />,
                  border: 'border-l-purple-500',
                };

                if (titleLower.includes('puc') || titleLower.includes('pollution')) {
                  categoryName = 'Pollution (PUC)';
                  categoryTheme = {
                    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
                    icon: <Sparkles className="w-3.5 h-3.5 text-emerald-600" />,
                    border: 'border-l-emerald-500',
                  };
                } else if (titleLower.includes('fitness')) {
                  categoryName = 'Fitness Certificate';
                  categoryTheme = {
                    badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
                    icon: <FileCheck className="w-3.5 h-3.5 text-blue-600" />,
                    border: 'border-l-blue-500',
                  };
                } else if (titleLower.includes('tax') || titleLower.includes('road_tax')) {
                  categoryName = 'Road Tax (MVD)';
                  categoryTheme = {
                    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
                    icon: <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />,
                    border: 'border-l-indigo-500',
                  };
                } else if (titleLower.includes('insurance')) {
                  categoryName = 'Motor Insurance';
                  categoryTheme = {
                    badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
                    icon: <Shield className="w-3.5 h-3.5 text-amber-600" />,
                    border: 'border-l-amber-500',
                  };
                }

                const handleCompleteTask = () => {
                  let doc = documents.find((d) => d.id === task.documentId && !d.isHistorical);
                  let targetType: 'FITNESS' | 'INSURANCE' | 'ROAD_TAX' | 'PUC' | 'PERMIT' | 'RC' | 'OTHER' = 'INSURANCE';

                  if (titleLower.includes('puc') || titleLower.includes('pollution')) {
                    targetType = 'PUC';
                  } else if (titleLower.includes('fitness')) {
                    targetType = 'FITNESS';
                  } else if (titleLower.includes('tax') || titleLower.includes('road_tax')) {
                    targetType = 'ROAD_TAX';
                  } else if (titleLower.includes('permit')) {
                    targetType = 'PERMIT';
                  } else if (titleLower.includes('rc')) {
                    targetType = 'RC';
                  } else if (titleLower.includes('insurance')) {
                    targetType = 'INSURANCE';
                  }

                  if (!doc) {
                    doc = documents.find((d) => d.vehicleId === vehicle.id && d.documentType === targetType && !d.isHistorical);
                  }

                  // If still no document exists, provision one so user can set new expiry & upload scan
                  if (!doc) {
                    const newDocId = `doc_${Date.now()}`;
                    const createdDoc: VehicleDocument = {
                      id: newDocId,
                      vehicleId: vehicle.id,
                      clientId: vehicle.clientId,
                      documentType: targetType,
                      documentNumber: '',
                      expiryDate: task.dueDate || new Date().toISOString().split('T')[0],
                      reminderDays: 30,
                      status: 'OVERDUE',
                      isHistorical: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      createdBy: currentUser?.id || 'system',
                    };
                    addDocument(createdDoc);
                    doc = createdDoc;
                  }

                  setCompletionTaskId(task.id);
                  setCompletionDoc(doc);
                };

                return (
                  <div
                    key={task.id}
                    className={`rounded-2xl border transition-all flex flex-col justify-between bg-white shadow-xs hover:shadow-md p-4 space-y-3.5 border-l-4 ${
                      isCompleted
                        ? 'border-slate-200/90 border-l-emerald-500 bg-gradient-to-b from-white to-emerald-50/15'
                        : `border-slate-200/90 ${categoryTheme.border}`
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Row: Category Pill & Status Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${categoryTheme.badge}`}>
                          {categoryTheme.icon}
                          <span>{categoryName}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <PriorityBadge priority={task.priority} />
                          <TaskStatusBadge status={task.status} />
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="font-bold text-sm text-slate-900 leading-snug tracking-tight" title={cleanTitle}>
                        {cleanTitle}
                      </h4>

                      {/* Description */}
                      {task.description && (
                        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs text-slate-600 leading-relaxed font-normal">
                          <p className="line-clamp-2" title={task.description}>
                            {task.description}
                          </p>
                        </div>
                      )}

                      {/* Meta Information Details (2-Column Grid) */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                            Assigned Officer
                          </span>
                          <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5 mt-0.5 truncate">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{assignedAgent?.name?.replace(/\s*\((Agent|Admin)\)/i, '') || 'Staff'}</span>
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                            Due Date
                          </span>
                          <span className="font-bold text-slate-800 text-xs font-mono flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{task.dueDate}</span>
                          </span>
                        </div>
                      </div>

                      {/* Completion Notes Banner */}
                      {task.completionNotes && (
                        <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 via-emerald-50/90 to-teal-50/70 border border-emerald-200/90 text-xs flex items-start gap-2 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="font-bold text-emerald-900 text-xs block">
                              Renewal Completed &amp; Active
                            </span>
                            <span className="text-[11px] text-emerald-700 block leading-tight mt-0.5 font-medium line-clamp-2">
                              {task.completionNotes}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
                      <div>
                        {!isCompleted ? (
                          <Button
                            size="sm"
                            onClick={handleCompleteTask}
                            className="h-8 px-3.5 rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-bold text-xs gap-1.5 shadow-xs cursor-pointer transition-all"
                            title="Complete Renewal (Set New Expiry & Upload Document)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Complete Renewal</span>
                          </Button>
                        ) : (
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100/70 text-emerald-800 border border-emerald-200/80 flex items-center gap-1.5 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Done</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingTask(task)}
                          className="h-8 w-8 p-0 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200 hover:border-blue-200 cursor-pointer transition-colors"
                          title="Edit Task"
                          aria-label="Edit Task"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

                        {currentUser?.role === 'ADMIN' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTaskToDelete(task)}
                            className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200 hover:border-rose-200 cursor-pointer transition-colors"
                            title="Delete Task"
                            aria-label="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. UPLOADED DOCUMENTS & ATTACHMENTS (Section 41 & 42) */}
      <Card className="overflow-hidden border border-slate-200/90 shadow-xs">
        <CardHeader className="py-4 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Uploaded Documents &amp; Digital Scans</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    {vehicleDocs.filter((d) => Boolean(d.fileName || d.fileUrl)).length} Files
                  </span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Original policy scans, inspection fitness certificates, and tax receipts.
                </p>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddDocModalOpen(true)}
            className="text-xs gap-1.5 self-start sm:self-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Document
          </Button>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {vehicleDocs.filter((d) => Boolean(d.fileName || d.fileUrl)).length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-700 font-semibold">No files attached to documents yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Upload renewed policy scans, fitness certificates, and tax receipts directly or when completing a renewal task.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddDocModalOpen(true)}
                className="mt-3 text-xs gap-1.5 rounded-xl cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" /> Upload Document Scan
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {vehicleDocs
                .filter((d) => Boolean(d.fileName || d.fileUrl))
                .map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4.5 h-4.5" />
                      </div>
                      <div className="overflow-hidden min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-800 truncate" title={d.fileName || getDocumentTypeName(d.documentType)}>
                          {d.fileName || `${getDocumentTypeName(d.documentType)} Scan`}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-700">{getDocumentTypeName(d.documentType)}</span>
                          {d.isHistorical ? (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold border border-slate-200">
                              History
                            </span>
                          ) : (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                              Active
                            </span>
                          )}
                        </div>
                        {d.expiryDate && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            Expiry: {d.expiryDate}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div>
                        {d.fileUrl ? (
                          <a
                            href={d.fileUrl}
                            download={d.fileName || `${vehicle.registrationNumber}_${d.documentType}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                            title="Download / View document"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No URL</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingDoc(d)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Document / Re-upload file"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {currentUser?.role === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => setDocToDelete(d)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. HISTORICAL RENEWALS & AUDIT TRAIL (Section 69 & 70) */}
      {historicalDocs.length > 0 && (
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              Renewal History & Previous Cycles
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Preserved previous policy terms, expired certificates, and historical renewal records.
            </p>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5 w-16 text-center font-mono">Sl. No.</th>
                    <th className="px-5 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Doc / Policy No.</th>
                    <th className="px-4 py-2.5">Expired On</th>
                    <th className="px-4 py-2.5">Amount Paid</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-5 py-2.5">Historical Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {historicalDocs.map((h, idx) => (
                    <tr key={h.id}>
                      <td className="px-4 py-2.5 text-center font-mono text-xs text-slate-400 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="px-5 py-2.5 font-medium text-slate-800">
                        {getDocumentTypeName(h.documentType)}
                      </td>
                      <td className="px-4 py-2.5 font-mono">{h.documentNumber || '—'}</td>
                      <td className="px-4 py-2.5 font-mono">{h.expiryDate || '—'}</td>
                      <td className="px-4 py-2.5">{formatCurrency(h.amount)}</td>
                      <td className="px-4 py-2.5">
                        <RenewalStatusBadge status="COMPLETED" />
                      </td>
                      <td className="px-5 py-2.5 text-slate-500 italic">{h.notes || 'Archived'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <VehicleModal
        isOpen={isEditVehicleModalOpen}
        onClose={() => setIsEditVehicleModalOpen(false)}
        initialVehicle={vehicle}
      />

      <DocumentModal
        isOpen={isAddDocModalOpen || Boolean(editingDoc)}
        onClose={() => {
          setIsAddDocModalOpen(false);
          setEditingDoc(null);
        }}
        vehicleId={vehicle.id}
        clientId={vehicle.clientId}
        initialDocument={editingDoc}
      />

      {completionDoc && (
        <CompletionModal
          isOpen={Boolean(completionDoc)}
          onClose={() => {
            setCompletionDoc(null);
            setCompletionTaskId(undefined);
          }}
          document={completionDoc}
          linkedTaskId={completionTaskId}
          registrationNumber={vehicle.registrationNumber}
        />
      )}

      <TaskModal
        isOpen={isTaskModalOpen || Boolean(editingTask)}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        clientId={vehicle.clientId}
        vehicleId={vehicle.id}
        initialTask={editingTask}
      />

      {client && (
        <WhatsAppModal
          isOpen={whatsAppData.isOpen}
          onClose={() => setWhatsAppData((prev) => ({ ...prev, isOpen: false }))}
          clientName={client.name}
          clientMobile={client.mobile}
          registrationNumber={vehicle.registrationNumber}
          documentType={whatsAppData.documentType}
          dueDate={whatsAppData.dueDate}
        />
      )}

      {/* Delete Vehicle Confirmation */}
      <ConfirmModal
        isOpen={isDeleteVehicleModalOpen}
        onClose={() => setIsDeleteVehicleModalOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await deleteVehicle(vehicle.id);
            router.push('/vehicles');
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Delete Vehicle Record"
        message={`Are you sure you want to permanently delete vehicle "${vehicle.registrationNumber}" (${vehicle.make} ${vehicle.model})? All documents, renewals, and linked tasks will be affected.`}
        confirmText="Permanently Delete"
        isLoading={isDeleting}
      />

      {/* Delete Document Confirmation */}
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
        message={`Are you sure you want to delete document "${docToDelete?.documentType}" (#${docToDelete?.documentNumber || 'N/A'})?`}
        confirmText="Delete Document"
        isLoading={isDeleting}
      />

      {/* Delete Task Confirmation */}
      <ConfirmModal
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={async () => {
          if (!taskToDelete) return;
          setIsDeleting(true);
          try {
            await deleteTask(taskToDelete.id);
            setTaskToDelete(null);
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Delete Operational Task"
        message={`Are you sure you want to delete task "${taskToDelete?.title}"?`}
        confirmText="Delete Task"
        isLoading={isDeleting}
      />
    </div>
  );
}
