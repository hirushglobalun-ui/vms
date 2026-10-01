'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { User, UserRole, UserStatus } from '@/lib/types';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Car,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  ShieldAlert,
  Edit,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

export default function AgentsPage() {
  const { currentUser, users, clients, vehicles, tasks, documents, addAgent, updateAgent, deleteAgent } = useApp();

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentMobile, setNewAgentMobile] = useState('');
  const [newAgentRole, setNewAgentRole] = useState<UserRole>('AGENT');
  const [isSaving, setIsSaving] = useState(false);

  // Edit agent state
  const [editingAgent, setEditingAgent] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('AGENT');
  const [editStatus, setEditStatus] = useState<UserStatus>('ACTIVE');

  // Delete agent state
  const [agentToDelete, setAgentToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permission Check (Section 7, 9, 10, 88)
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">
          Agent accounts do not have permission to view or manage staff personnel. Please contact your system administrator.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block">
          <Button variant="primary" size="sm">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const agentsList = users.map((agent) => {
    const assignedClients = clients.filter((c) => c.assignedAgentId === agent.id);
    const assignedVehicles = vehicles.filter((v) => v.assignedAgentId === agent.id);
    const assignedTasks = tasks.filter((t) => t.assignedTo === agent.id);
    const pendingTasks = assignedTasks.filter((t) => t.status === 'PENDING' || t.status === 'PROCESSING').length;
    const completedTasks = assignedTasks.filter((t) => t.status === 'COMPLETED').length;

    const vehIds = new Set(assignedVehicles.map((v) => v.id));
    const overdueCount = documents.filter(
      (d) => vehIds.has(d.vehicleId) && d.status === 'OVERDUE'
    ).length;

    return {
      agent,
      clientsCount: assignedClients.length,
      vehiclesCount: assignedVehicles.length,
      pendingTasks,
      completedTasks,
      overdueCount,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            Staff & Agent Portfolio Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Admin console: View workload distribution, assigned client accounts, and performance metrics.
          </p>
        </div>

        <Button
          onClick={() => setIsAddUserModalOpen(true)}
          variant="primary"
          size="sm"
          className="gap-2 self-start sm:self-auto font-semibold"
        >
          <UserPlus className="w-4 h-4" />
          Add New Agent
        </Button>
      </div>

      {/* Agents Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {agentsList.map(({ agent, clientsCount, vehiclesCount, pendingTasks, completedTasks, overdueCount }) => (
          <Card key={agent.id} className="hover:border-purple-300 transition-colors flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                    {agent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{agent.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                          agent.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {agent.role}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">• {agent.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingAgent(agent);
                      setEditName(agent.name);
                      setEditEmail(agent.email);
                      setEditMobile(agent.mobile);
                      setEditRole(agent.role);
                      setEditStatus(agent.status);
                    }}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    title="Edit Agent"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  {agent.id !== currentUser?.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAgentToDelete(agent)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete Agent"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {agent.mobile}
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {agent.email}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Assigned Clients</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{clientsCount}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Vehicles Managed</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{vehiclesCount}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Pending Tasks</span>
                  <span className="font-bold text-amber-700 text-sm mt-0.5 block">{pendingTasks}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Completed Tasks</span>
                  <span className="font-bold text-emerald-700 text-sm mt-0.5 block">{completedTasks}</span>
                </div>
              </div>

              {overdueCount > 0 && (
                <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg text-xs text-rose-800 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  {overdueCount} overdue renewal follow-ups
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Agent Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Add Consultancy Staff"
        description="Register an operational agent or administrative user."
        maxWidth="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newAgentName.trim() || !newAgentEmail.trim() || !newAgentMobile.trim()) {
              alert('Please complete all required fields.');
              return;
            }
            setIsSaving(true);
            try {
              await addAgent({
                name: newAgentName.trim(),
                email: newAgentEmail.trim(),
                mobile: newAgentMobile.trim(),
                role: newAgentRole,
                status: 'ACTIVE',
              });
              setNewAgentName('');
              setNewAgentEmail('');
              setNewAgentMobile('');
              setIsAddUserModalOpen(false);
            } finally {
              setIsSaving(false);
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Staff Full Name"
            required
            value={newAgentName}
            onChange={(e) => setNewAgentName(e.target.value)}
            placeholder="e.g. Anand Menon"
          />

          <Input
            label="Office Email Address"
            type="email"
            required
            value={newAgentEmail}
            onChange={(e) => setNewAgentEmail(e.target.value)}
            placeholder="e.g. anand@apexmotors.com"
          />

          <Input
            label="Contact Mobile"
            required
            value={newAgentMobile}
            onChange={(e) => setNewAgentMobile(e.target.value)}
            placeholder="e.g. +91 98470 55667"
          />

          <Select
            label="Role & Access Scope"
            value={newAgentRole}
            onChange={(e) => setNewAgentRole(e.target.value as UserRole)}
            options={[
              { value: 'AGENT', label: 'Field / Operational Agent' },
              { value: 'ADMIN', label: 'System Administrator' },
            ]}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsAddUserModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Register Agent
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Agent Modal */}
      {editingAgent && (
        <Modal
          isOpen={Boolean(editingAgent)}
          onClose={() => setEditingAgent(null)}
          title="Edit Staff Member"
          description={`Update profile and permissions for ${editingAgent.name}.`}
          maxWidth="md"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editingAgent) return;
              setIsSaving(true);
              try {
                await updateAgent(editingAgent.id, {
                  name: editName.trim(),
                  email: editEmail.trim(),
                  mobile: editMobile.trim(),
                  role: editRole,
                  status: editStatus,
                });
                setEditingAgent(null);
              } finally {
                setIsSaving(false);
              }
            }}
            className="space-y-4"
          >
            <Input
              label="Staff Full Name"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />

            <Input
              label="Office Email Address"
              type="email"
              required
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />

            <Input
              label="Contact Mobile"
              required
              value={editMobile}
              onChange={(e) => setEditMobile(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                options={[
                  { value: 'AGENT', label: 'Field Agent' },
                  { value: 'ADMIN', label: 'Administrator' },
                ]}
              />

              <Select
                label="Status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setEditingAgent(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Agent Confirmation */}
      <ConfirmModal
        isOpen={Boolean(agentToDelete)}
        onClose={() => setAgentToDelete(null)}
        onConfirm={async () => {
          if (!agentToDelete) return;
          setIsDeleting(true);
          try {
            await deleteAgent(agentToDelete.id);
            setAgentToDelete(null);
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Delete Staff Member"
        message={`Are you sure you want to permanently delete staff member "${agentToDelete?.name}"?`}
        confirmText="Permanently Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
