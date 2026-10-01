'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store/app-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RenewalStatusBadge, TaskStatusBadge } from '@/components/shared/status-badge';
import { WhatsAppModal } from '@/components/shared/whatsapp-modal';
import { CompletionModal } from '@/components/shared/completion-modal';
import { TaskModal } from '@/components/shared/task-modal';
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

  // State for modals triggered from dashboard follow-ups
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

  // Compute Renewal Metrics
  const overdueDocs = filteredDocuments.filter((d) => d.status === 'OVERDUE');
  const dueTodayDocs = filteredDocuments.filter((d) => d.status === 'DUE_TODAY');
  const dueSoonDocs = filteredDocuments.filter((d) => d.status === 'DUE_SOON');
  const pendingTasks = filteredTasks.filter((t) => t.status === 'PENDING' || t.status === 'PROCESSING');
  const completedTasks = filteredTasks.filter((t) => t.status === 'COMPLETED');

  // Urgent follow-ups list: combined Overdue + Due Today + Due Soon, sorted
  const urgentFollowUps = [...overdueDocs, ...dueTodayDocs, ...dueSoonDocs].slice(0, 8);

  // Agent Performance Breakdown for Admin (Section 38 & 72)
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
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {isAdmin ? 'Executive Consultancy Dashboard' : `Agent Workspace: ${currentUser?.name}`}
            </h1>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono ${
                isAdmin
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {currentUser?.role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Real-time overview across all consultancy clients, vehicle documents, and agent follow-ups.'
              : 'Your assigned client accounts, vehicle renewals, and daily operational follow-ups.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/renewals">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              All Renewals
            </Button>
          </Link>
          <Link href="/tasks">
            <Button variant="primary" size="sm" className="text-xs gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              My Tasks ({pendingTasks.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid (Sections 37 & 38) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Clients */}
        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isAdmin ? 'Total Clients' : 'My Clients'}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {filteredClients.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Vehicles */}
        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isAdmin ? 'Total Vehicles' : 'My Vehicles'}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {filteredVehicles.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Overdue Renewals */}
        <Card className="border-rose-200 bg-rose-50/20 hover:border-rose-300 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Overdue
              </p>
              <h3 className="text-2xl font-bold text-rose-700 mt-1">
                {overdueDocs.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              !
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Due Today / Soon */}
        <Card className="border-amber-200 bg-amber-50/20 hover:border-amber-300 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Due Soon / Today
              </p>
              <h3 className="text-2xl font-bold text-amber-800 mt-1">
                {dueTodayDocs.length + dueSoonDocs.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Focus: Urgent Renewals & Follow-ups (Answers Section 64 immediately) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Immediate Attention & Upcoming Follow-ups
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Documents that are overdue, due today, or entering reminder thresholds.
            </p>
          </div>
          <Link href="/renewals">
            <Button variant="ghost" size="sm" className="text-xs text-blue-600 gap-1">
              View All Renewals <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {urgentFollowUps.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All vehicle documents and renewals are currently up to date!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Vehicle</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Document Type</th>
                    <th className="px-4 py-3">Due / Expiry Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {urgentFollowUps.map((doc) => {
                    const veh = vehicles.find((v) => v.id === doc.vehicleId);
                    const client = clients.find((c) => c.id === doc.clientId);

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-medium">
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
                          <span className="font-semibold text-slate-800">
                            {getDocumentTypeName(doc.documentType)}
                          </span>
                          {doc.documentNumber && (
                            <div className="text-[11px] text-slate-400 font-mono">
                              #{doc.documentNumber}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-slate-700 font-medium">
                          {doc.expiryDate || 'No date set'}
                        </td>

                        <td className="px-4 py-3.5">
                          <RenewalStatusBadge status={doc.status} />
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Action Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenWhatsApp(doc)}
                              className="h-7 px-2 text-[11px] text-emerald-700 hover:bg-emerald-50 border-emerald-200 gap-1"
                              title="Send reminder on WhatsApp"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                              WhatsApp
                            </Button>

                            {/* Complete Renewal Button */}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setCompletionDoc(doc)}
                              className="h-7 px-2 text-[11px] text-blue-700 hover:bg-blue-50 border border-blue-200 gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-blue-600" />
                              Renew
                            </Button>

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

      {/* Admin Specific: Agent Performance Workload Summary (Section 38 & 72) */}
      {isAdmin && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Agent Workload & Operational Summary
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitors agent portfolio size, active tasks, completed renewals, and overdue client follow-ups.
            </p>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Agent</th>
                    <th className="px-4 py-3">Assigned Clients</th>
                    <th className="px-4 py-3">Vehicles Managed</th>
                    <th className="px-4 py-3">Pending Tasks</th>
                    <th className="px-4 py-3">Completed Tasks</th>
                    <th className="px-4 py-3">Overdue Items</th>
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
                        <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold border border-amber-200">
                          {pendingCount} pending
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-200">
                          {completedCount} completed
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {overdueCount > 0 ? (
                          <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded font-bold border border-rose-200">
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
    </div>
  );
}
