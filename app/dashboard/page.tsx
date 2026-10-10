'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store/app-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RenewalStatusBadge, TaskStatusBadge } from '@/components/shared/status-badge';
import { WhatsAppModal } from '@/components/shared/whatsapp-modal';
import { CompletionModal } from '@/components/shared/completion-modal';
import { TaskModal } from '@/components/shared/task-modal';
import { VehicleModal } from '@/components/shared/vehicle-modal';
import { ClientModal } from '@/components/shared/client-modal';
import { getDocumentTypeName } from '@/lib/renewals/engine';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import {
  Users,
  Car,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CheckSquare,
  Eye,
  Sparkles,
  Plus,
  FileText,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { VehicleDocument } from '@/lib/types';

export default function DashboardPage() {
  const {
    currentUser,
    users,
    filteredClients,
    filteredVehicles,
    filteredDocuments,
    filteredTasks,
    clients,
    vehicles,
    tasks,
    documents,
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';

  // State for modals
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
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

  const [completionDoc, setCompletionDoc] = useState<VehicleDocument | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Compute Renewal Metrics
  const overdueDocs = filteredDocuments.filter((d) => d.status === 'OVERDUE');
  const dueTodayDocs = filteredDocuments.filter((d) => d.status === 'DUE_TODAY');
  const dueSoonDocs = filteredDocuments.filter((d) => d.status === 'DUE_SOON');
  const pendingTasks = filteredTasks.filter((t) => t.status === 'PENDING' || t.status === 'PROCESSING');
  const completedTasks = filteredTasks.filter((t) => t.status === 'COMPLETED');

  // Urgent follow-ups list: combined Overdue + Due Today + Due Soon, sorted
  const urgentFollowUps = [...overdueDocs, ...dueTodayDocs, ...dueSoonDocs].slice(0, 8);

  // Agent Performance Breakdown for Admin
  const agentSummary = users
    .filter((u) => u.role === 'AGENT' && u.status === 'ACTIVE')
    .map((agent) => {
      const agentClients = clients.filter((c) => c.assignedAgentId === agent.id);
      const agentVehicles = vehicles.filter((v) => v.assignedAgentId === agent.id);
      const agentTasks = tasks.filter((t) => t.assignedTo === agent.id);
      const agentPending = agentTasks.filter((t) => t.status === 'PENDING' || t.status === 'PROCESSING').length;
      const agentCompleted = agentTasks.filter((t) => t.status === 'COMPLETED').length;

      const agentVehicleIds = new Set(agentVehicles.map((v) => v.id));
      const agentOverdue = documents.filter(
        (d) => agentVehicleIds.has(d.vehicleId) && d.status === 'OVERDUE'
      ).length;

      return {
        agent,
        clientsCount: agentClients.length,
        vehiclesCount: agentVehicles.length,
        pendingCount: agentPending,
        completedCount: agentCompleted,
        overdueCount: agentOverdue,
      };
    });

  const handleOpenWhatsApp = (doc: VehicleDocument) => {
    const veh = vehicles.find((v) => v.id === doc.vehicleId);
    const client = clients.find((c) => c.id === doc.clientId);
    if (!client || !veh) return;

    setWhatsAppModalData({
      isOpen: true,
      clientName: client.name,
      clientMobile: client.mobile,
      registrationNumber: veh.registrationNumber,
      documentType: doc.documentType,
      dueDate: doc.expiryDate,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50 to-blue-50/40 p-5 sm:p-7 border border-slate-200/90 shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
                {isAdmin ? 'System Administrator' : 'Consultancy Agent'}
              </span>
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Workspace Active
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {isAdmin ? 'Automobile Consultancy Overview' : `Welcome, ${currentUser?.name}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              {isAdmin
                ? 'Centralized monitoring for RTO renewals, client fleet documents, agent tasks, and automated WhatsApp follow-ups.'
                : 'Manage your assigned client vehicles, track upcoming renewals, and send instant WhatsApp alerts.'}
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              onClick={() => setIsVehicleModalOpen(true)}
              className="gap-2 shadow-sm shadow-blue-500/20"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Add Vehicle & Scan RC</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => setIsTaskModalOpen(true)}
              className="gap-1.5 bg-white hover:bg-slate-50 border-slate-200"
            >
              <CheckSquare className="w-4 h-4 text-slate-600" />
              <span>New Task</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Clients */}
        <Link href="/clients" className="block group">
          <div className="h-full p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isAdmin ? 'Total Clients' : 'My Clients'}
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {filteredClients.length}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Active client accounts
              </p>
            </div>
          </div>
        </Link>

        {/* Card 2: Vehicles */}
        <Link href="/vehicles" className="block group">
          <div className="h-full p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isAdmin ? 'Total Vehicles' : 'My Vehicles'}
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Car className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {filteredVehicles.length}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Registered vehicles
              </p>
            </div>
          </div>
        </Link>

        {/* Card 3: Overdue Renewals */}
        <Link href="/renewals?status=OVERDUE" className="block group">
          <div className="h-full p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-50/60 to-white border border-rose-200 shadow-2xs hover:shadow-md hover:border-rose-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Overdue
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm group-hover:scale-110 transition-transform">
                {overdueDocs.length}
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">
                {overdueDocs.length}
              </h2>
              <p className="text-[11px] text-rose-600/80 font-medium mt-0.5">
                Urgent attention needed
              </p>
            </div>
          </div>
        </Link>

        {/* Card 4: Due Soon / Today */}
        <Link href="/renewals?status=DUE_SOON" className="block group">
          <div className="h-full p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 to-white border border-amber-200 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Due Today / Soon
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="mt-3">
              <h2 className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">
                {dueTodayDocs.length + dueSoonDocs.length}
              </h2>
              <p className="text-[11px] text-amber-700/80 font-medium mt-0.5">
                {dueTodayDocs.length} today • {dueSoonDocs.length} this month
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Main Focus: Immediate Attention Renewals */}
      <Card className="rounded-2xl border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Immediate Follow-Ups & Expiring Documents
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Documents overdue or approaching renewal threshold (Insurance, Tax, Fitness, PUC)
            </p>
          </div>
          <Link href="/renewals">
            <Button variant="ghost" size="sm" className="text-xs text-blue-600 gap-1.5 font-bold">
              View All Renewals <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {urgentFollowUps.length === 0 ? (
            <div className="py-14 text-center text-xs text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-800">All Renewals Up-to-Date!</div>
              <p className="mt-1 text-slate-400">No overdue or immediate expiring vehicle documents.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center font-mono">#</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Document</th>
                      <th className="px-4 py-3">Expiry Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {urgentFollowUps.map((doc, idx) => {
                      const veh = vehicles.find((v) => v.id === doc.vehicleId);
                      const client = clients.find((c) => c.id === doc.clientId);

                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3.5">
                            {veh ? (
                              <Link
                                href={`/vehicles/${veh.id}`}
                                className="font-mono font-bold text-blue-600 hover:underline flex items-center gap-1.5"
                              >
                                <Car className="w-3.5 h-3.5 text-slate-400" />
                                {veh.registrationNumber}
                              </Link>
                            ) : (
                              'N/A'
                            )}
                            <div className="text-[11px] text-slate-500 font-normal">
                              {veh?.make} {veh?.model}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {client ? (
                              <Link
                                href={`/clients/${client.id}`}
                                className="font-semibold text-slate-900 hover:text-blue-600"
                              >
                                {client.name}
                              </Link>
                            ) : (
                              'N/A'
                            )}
                            <div className="text-[11px] text-slate-500">{client?.mobile}</div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-800">
                              {getDocumentTypeName(doc.documentType)}
                            </span>
                            {doc.documentNumber && (
                              <div className="text-[11px] text-slate-400 font-mono">
                                #{doc.documentNumber}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 font-mono text-slate-700 font-semibold">
                            {doc.expiryDate || 'No date set'}
                          </td>

                          <td className="px-4 py-3.5">
                            <RenewalStatusBadge status={doc.status} />
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* WhatsApp Quick Trigger */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenWhatsApp(doc)}
                                className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                title="Send reminder on WhatsApp"
                              >
                                <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                              </Button>

                              {/* Complete Renewal Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCompletionDoc(doc)}
                                className="h-8 w-8 p-0 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                title="Complete Renewal Cycle"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>

                              {/* View Vehicle Button */}
                              {veh && (
                                <Link href={`/vehicles/${veh.id}`} title="View Vehicle Details">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-blue-50 border-slate-200"
                                  >
                                    <Eye className="w-4 h-4" />
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

              {/* Mobile Card Fallback View (Optimized for phones/tablets) */}
              <div className="md:hidden divide-y divide-slate-100">
                {urgentFollowUps.map((doc, idx) => {
                  const veh = vehicles.find((v) => v.id === doc.vehicleId);
                  const client = clients.find((c) => c.id === doc.clientId);

                  return (
                    <div key={doc.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {veh && (
                            <Link
                              href={`/vehicles/${veh.id}`}
                              className="font-mono font-bold text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Car className="w-4 h-4 text-slate-400" />
                              {veh.registrationNumber}
                            </Link>
                          )}
                          <div className="text-xs text-slate-500 font-medium">
                            {veh?.make} {veh?.model}
                          </div>
                        </div>
                        <RenewalStatusBadge status={doc.status} />
                      </div>

                      <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">
                            {getDocumentTypeName(doc.documentType)}
                          </div>
                          <div className="font-semibold text-slate-800">
                            {client?.name || 'Owner'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Due Date</div>
                          <div className="font-mono font-bold text-slate-900">{doc.expiryDate || '—'}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenWhatsApp(doc)}
                          className="flex-1 gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-9"
                        >
                          <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                          <span>WhatsApp</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCompletionDoc(doc)}
                          className="flex-1 gap-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 h-9"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Renew</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Admin Specific: Agent Performance Workload Summary */}
      {isAdmin && (
        <Card className="rounded-2xl border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Staff & Agent Operations Summary
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Live portfolio assignments, pending follow-ups, and renewal completion rates.
            </p>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3">Agent</th>
                    <th className="px-4 py-3">Clients</th>
                    <th className="px-4 py-3">Vehicles</th>
                    <th className="px-4 py-3">Pending Tasks</th>
                    <th className="px-4 py-3">Completed</th>
                    <th className="px-4 py-3">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agentSummary.map(({ agent, clientsCount, vehiclesCount, pendingCount, completedCount, overdueCount }) => (
                    <tr key={agent.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{agent.name}</div>
                        <div className="text-[11px] text-slate-400">{agent.email}</div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {clientsCount} clients
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {vehiclesCount} vehicles
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-lg font-bold border border-amber-200">
                          {pendingCount} pending
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg font-bold border border-emerald-200">
                          {completedCount} done
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {overdueCount > 0 ? (
                          <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded-lg font-bold border border-rose-200">
                            {overdueCount} overdue
                          </span>
                        ) : (
                          <span className="text-slate-400">0 overdue</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <WhatsAppModal
        isOpen={whatsAppModalData.isOpen}
        onClose={() => setWhatsAppModalData((prev) => ({ ...prev, isOpen: false }))}
        clientName={whatsAppModalData.clientName}
        clientMobile={whatsAppModalData.clientMobile}
        registrationNumber={whatsAppModalData.registrationNumber}
        documentType={whatsAppModalData.documentType}
        dueDate={whatsAppModalData.dueDate}
      />

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

      {selectedTask && (
        <TaskModal
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          initialTask={selectedTask}
        />
      )}

      <VehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
      />

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />
    </div>
  );
}
