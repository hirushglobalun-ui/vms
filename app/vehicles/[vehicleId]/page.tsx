'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useApp } from '@/lib/store/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VehicleModal } from '@/components/shared/vehicle-modal';
import { DocumentModal } from '@/components/shared/document-modal';
import { CompletionModal } from '@/components/shared/completion-modal';
import { TaskModal } from '@/components/shared/task-modal';
import { WhatsAppModal } from '@/components/shared/whatsapp-modal';
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
  MessageSquare,
  ArrowLeft,
  FileCheck,
  Shield,
  ShieldAlert,
  Download,
  ExternalLink,
  History,
  CheckSquare,
} from 'lucide-react';
import Link from 'next/link';
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
    updateTask,
    completeTask,
  } = useApp();

  // Modals state
  const [isEditVehicleModalOpen, setIsEditVehicleModalOpen] = useState(false);
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<VehicleDocument | null>(null);
  const [completionDoc, setCompletionDoc] = useState<VehicleDocument | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

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
              </div>

              {client && (
                <div className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {client.mobile}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">Assigned Agent:</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-800">
                  {agent?.name || 'Unassigned'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
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
              className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp Client
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditVehicleModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Info
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddDocModalOpen(true)}
            className="text-xs gap-1.5 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Document
          </Button>
        </div>
      </div>

      {/* 2. TECHNICAL SPECIFICATIONS & RTO INFORMATION */}
      <Card>
        <CardHeader className="py-3 px-5 bg-slate-50/70 border-b border-slate-100">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Vehicle Specification & Registration Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">RTO Location</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{vehicle.rto}</span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Fuel Type</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{vehicle.fuelType}</span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Mfg. Year</span>
              <span className="font-bold text-slate-900 mt-0.5 block">
                {vehicle.manufacturingYear || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Reg. Validity</span>
              <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                {vehicle.registrationValidity || '2036-04-11'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Chassis No. (VIN)</span>
              <span className="font-mono font-semibold text-slate-700 mt-0.5 block truncate">
                {vehicle.chassisNumber || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Engine No.</span>
              <span className="font-mono font-semibold text-slate-700 mt-0.5 block truncate">
                {vehicle.engineNumber || 'N/A'}
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
                    <th className="px-5 py-3">Document Category</th>
                    <th className="px-4 py-3">Document / Policy No.</th>
                    <th className="px-4 py-3">Issue / Start Date</th>
                    <th className="px-4 py-3">Expiry / Due Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{getDocumentTypeName(doc.documentType)}</span>
                          {doc.documentName && (
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({doc.documentName})
                            </span>
                          )}
                        </div>
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

                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        {doc.documentNumber || '—'}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-mono">
                        {doc.issueDate || doc.startDate || doc.lastPaymentDate || '—'}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                        {doc.expiryDate || 'Permanent / N/A'}
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-700">
                        {formatCurrency(doc.amount)}
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
                              className="h-7 px-2 text-[11px] text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                              title="Remind client via WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                            </Button>
                          )}

                          {/* Complete renewal cycle button */}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setCompletionDoc(doc)}
                            className="h-7 px-2 text-[11px] text-blue-700 hover:bg-blue-50 border border-blue-200 font-medium"
                          >
                            Complete Renewal
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingDoc(doc)}
                            className="h-7 px-2 text-[11px]"
                          >
                            Edit
                          </Button>
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

      {/* 4. TASKS SECTION (Follow-ups & Agent Work - Section 17 & 32) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-purple-600" />
              Operational Tasks & Follow-ups
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Track agent communications, documents retrieval, and RTO appointment status.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsTaskModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Create Task
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {vehicleTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No active tasks for this vehicle.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {vehicleTasks.map((task) => {
                const assignedAgent = users.find((u) => u.id === task.assignedTo);
                return (
                  <div
                    key={task.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{task.title}</span>
                        <PriorityBadge priority={task.priority} />
                        <TaskStatusBadge status={task.status} />
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1.5">
                        <span>Assigned to: <strong className="text-slate-700">{assignedAgent?.name || 'Agent'}</strong></span>
                        <span>Due: <strong className="text-slate-700 font-mono">{task.dueDate}</strong></span>
                        {task.completionNotes && (
                          <span className="text-emerald-700 font-medium">
                            Note: {task.completionNotes}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {task.status !== 'COMPLETED' && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => completeTask(task.id, 'Task marked completed from workspace')}
                          className="h-7 px-2.5 text-xs font-semibold gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingTask(task)}
                        className="h-7 px-2 text-xs"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. UPLOADED DOCUMENTS & ATTACHMENTS (Section 41 & 42) */}
      <Card>
        <CardHeader className="py-4 px-5">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600" />
            Uploaded Documents & Digital Scans
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Original policy scans, inspection fitness certificates, and tax receipts.
          </p>
        </CardHeader>

        <CardContent className="p-5">
          {activeDocs.filter((d) => d.fileName).length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              No files attached to current documents. You can upload scans via &ldquo;Add Document&rdquo; or &ldquo;Complete Renewal&rdquo;.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeDocs
                .filter((d) => d.fileName)
                .map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-semibold text-slate-800 truncate">{d.fileName}</div>
                        <div className="text-[10px] text-slate-400">
                          {getDocumentTypeName(d.documentType)}
                        </div>
                      </div>
                    </div>

                    <a
                      href={d.fileUrl || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        alert(`Opening file: ${d.fileName} (${getDocumentTypeName(d.documentType)})`);
                      }}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Download / View document"
                    >
                      <Download className="w-4 h-4" />
                    </a>
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
                    <th className="px-5 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Doc / Policy No.</th>
                    <th className="px-4 py-2.5">Expired On</th>
                    <th className="px-4 py-2.5">Amount Paid</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-5 py-2.5">Historical Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {historicalDocs.map((h) => (
                    <tr key={h.id}>
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
          onClose={() => setCompletionDoc(null)}
          document={completionDoc}
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
    </div>
  );
}
