'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { User, Client, Vehicle, Task, VehicleDocument } from '@/lib/types';
import { useApp } from '@/lib/store/app-context';
import { formatRegistrationNumber } from '@/lib/utils';
import { WhatsAppModal } from '@/components/shared/whatsapp-modal';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import {
  Users,
  Car,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  ExternalLink,
  Search,
  Calendar,
  AlertTriangle,
  Edit,
  ShieldCheck,
  FileText,
  Building2,
} from 'lucide-react';
import Link from 'next/link';

interface AgentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: User | null;
  onEdit?: (agent: User) => void;
  initialTab?: 'clients' | 'vehicles' | 'tasks' | 'overdues';
}

export function AgentDetailModal({
  isOpen,
  onClose,
  agent,
  onEdit,
  initialTab = 'clients',
}: AgentDetailModalProps) {
  const { clients, vehicles, tasks, documents } = useApp();

  const [activeTab, setActiveTab] = useState<'clients' | 'vehicles' | 'tasks' | 'overdues'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // WhatsApp modal state for quick communication with a client
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

  // Sync tab if initialTab changes
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchTerm('');
    }
  }, [isOpen, initialTab]);

  if (!agent) return null;

  // Filter agent portfolio
  const agentClients = clients.filter((c) => c.assignedAgentId === agent.id);
  const agentVehicles = vehicles.filter((v) => v.assignedAgentId === agent.id);
  const agentTasks = tasks.filter((t) => t.assignedTo === agent.id);

  const pendingTasks = agentTasks.filter(
    (t) => t.status === 'PENDING' || t.status === 'PROCESSING' || t.status === 'CLIENT_CONTACTED'
  );
  const completedTasks = agentTasks.filter((t) => t.status === 'COMPLETED');

  const agentVehIds = new Set(agentVehicles.map((v) => v.id));
  const agentOverdues = documents.filter(
    (d) => agentVehIds.has(d.vehicleId) && d.status === 'OVERDUE'
  );

  // Search filtered clients
  const filteredClients = agentClients.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.mobile.includes(term) ||
      (c.address && c.address.toLowerCase().includes(term))
    );
  });

  // Search filtered vehicles
  const filteredVehicles = agentVehicles.filter((v) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const owner = clients.find((c) => c.id === v.clientId);
    return (
      v.registrationNumber.toLowerCase().includes(term) ||
      v.make.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      (owner && owner.name.toLowerCase().includes(term))
    );
  });

  // Filtered tasks
  const filteredTasks = agentTasks.filter((t) => {
    if (taskFilter === 'PENDING') {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
    } else if (taskFilter === 'COMPLETED') {
      if (t.status !== 'COMPLETED') return false;
    }
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return t.title.toLowerCase().includes(term);
  });

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={agent.name}
        description="Comprehensive portfolio, assigned accounts, vehicles, and workload."
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Top Agent Summary Card */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-100 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-purple-600/20">
                  {agent.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{agent.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                        agent.role === 'ADMIN'
                          ? 'bg-purple-200 text-purple-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {agent.role}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        agent.status === 'ACTIVE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-600">
                    <a
                      href={`tel:${agent.mobile}`}
                      className="flex items-center gap-1.5 hover:text-blue-600 transition-colors font-mono"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {agent.mobile}
                    </a>
                    <a
                      href={`mailto:${agent.email}`}
                      className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {agent.email}
                    </a>
                  </div>
                </div>
              </div>

              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onEdit(agent);
                  }}
                  className="gap-1.5 self-start sm:self-auto text-xs font-semibold bg-white shadow-xs hover:border-purple-300"
                >
                  <Edit className="w-3.5 h-3.5 text-purple-600" />
                  Edit Profile
                </Button>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-purple-200/60">
              <button
                type="button"
                onClick={() => setActiveTab('clients')}
                className={`p-2.5 rounded-xl text-left transition-all ${
                  activeTab === 'clients'
                    ? 'bg-white shadow-xs border border-purple-200'
                    : 'bg-white/60 hover:bg-white'
                }`}
              >
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Users className="w-3 h-3 text-purple-500" />
                  Clients
                </div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{agentClients.length}</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vehicles')}
                className={`p-2.5 rounded-xl text-left transition-all ${
                  activeTab === 'vehicles'
                    ? 'bg-white shadow-xs border border-purple-200'
                    : 'bg-white/60 hover:bg-white'
                }`}
              >
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Car className="w-3 h-3 text-blue-500" />
                  Vehicles
                </div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{agentVehicles.length}</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`p-2.5 rounded-xl text-left transition-all ${
                  activeTab === 'tasks'
                    ? 'bg-white shadow-xs border border-purple-200'
                    : 'bg-white/60 hover:bg-white'
                }`}
              >
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  Pending Tasks
                </div>
                <div className="text-base font-bold text-amber-700 mt-0.5">{pendingTasks.length}</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('overdues')}
                className={`p-2.5 rounded-xl text-left transition-all ${
                  activeTab === 'overdues'
                    ? 'bg-rose-100/90 shadow-xs border border-rose-300'
                    : agentOverdues.length > 0
                    ? 'bg-rose-50 hover:bg-rose-100/70 border border-rose-100'
                    : 'bg-white/60 hover:bg-white'
                }`}
              >
                <div className="text-[11px] text-rose-700 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  Overdue
                </div>
                <div className="text-base font-bold text-rose-700 mt-0.5">{agentOverdues.length}</div>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-px [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'clients'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Assigned Clients
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                {agentClients.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vehicles')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'vehicles'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              Vehicles Managed
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                {agentVehicles.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'tasks'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Tasks
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                {agentTasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('overdues')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'overdues'
                  ? 'border-rose-600 text-rose-700 bg-rose-50/50'
                  : 'border-transparent text-slate-500 hover:text-rose-600 hover:bg-rose-50/30'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              Overdue Renewals
              {agentOverdues.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-mono font-bold">
                  {agentOverdues.length}
                </span>
              )}
            </button>
          </div>

          {/* Search Bar for Clients / Vehicles / Tasks */}
          {activeTab !== 'overdues' && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search within agent's ${activeTab}...`}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
              />
            </div>
          )}

          {/* Tab 1: Clients */}
          {activeTab === 'clients' && (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {filteredClients.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">No clients assigned</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {searchTerm ? 'No clients match your search query.' : 'This agent has no assigned client accounts yet.'}
                  </p>
                </div>
              ) : (
                filteredClients.map((client) => {
                  const clientVehicles = vehicles.filter((v) => v.clientId === client.id);
                  return (
                    <div
                      key={client.id}
                      className="p-3 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">{client.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                            {clientVehicles.length} {clientVehicles.length === 1 ? 'vehicle' : 'vehicles'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="font-mono">{client.mobile}</span>
                          {client.address && <span className="truncate max-w-[200px]">• {client.address}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setWhatsAppData({
                              isOpen: true,
                              clientName: client.name,
                              clientMobile: client.mobile,
                              registrationNumber: clientVehicles[0]?.registrationNumber || '',
                            });
                          }}
                          className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 transition-colors"
                          title="Send WhatsApp message"
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                        </button>

                        <Link
                          href={`/clients/${client.id}`}
                          onClick={onClose}
                          className="h-8 px-2.5 rounded-lg flex items-center gap-1 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 transition-colors font-medium text-xs"
                          title="Open client workspace"
                        >
                          <span>Profile</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: Vehicles Managed */}
          {activeTab === 'vehicles' && (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {filteredVehicles.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Car className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">No vehicles assigned</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {searchTerm ? 'No vehicles match your search query.' : 'This agent has no assigned vehicles in their portfolio.'}
                  </p>
                </div>
              ) : (
                filteredVehicles.map((vehicle) => {
                  const owner = clients.find((c) => c.id === vehicle.clientId);
                  const isVehicleOverdue = documents.some(
                    (d) => d.vehicleId === vehicle.id && d.status === 'OVERDUE'
                  );
                  return (
                    <div
                      key={vehicle.id}
                      className="p-3 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-slate-900 tracking-tight">
                            {formatRegistrationNumber(vehicle.registrationNumber)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-semibold">
                            {vehicle.make} {vehicle.model}
                          </span>
                          {isVehicleOverdue && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Owner: <span className="font-medium text-slate-700">{owner?.name || 'Unknown'}</span>
                          {vehicle.fuelType && <span className="ml-2">• {vehicle.fuelType}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href={`/vehicles/${vehicle.id}`}
                          onClick={onClose}
                          className="h-8 px-2.5 rounded-lg flex items-center gap-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors font-medium text-xs"
                          title="Open vehicle details"
                        >
                          <span>Workspace</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 3: Tasks */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTaskFilter('ALL')}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      taskFilter === 'ALL' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600'
                    }`}
                  >
                    All ({agentTasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter('PENDING')}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      taskFilter === 'PENDING' ? 'bg-white shadow-xs text-amber-700 font-semibold' : 'text-slate-600'
                    }`}
                  >
                    Pending ({pendingTasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter('COMPLETED')}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      taskFilter === 'COMPLETED' ? 'bg-white shadow-xs text-emerald-700 font-semibold' : 'text-slate-600'
                    }`}
                  >
                    Completed ({completedTasks.length})
                  </button>
                </div>

                <Link
                  href="/tasks"
                  onClick={onClose}
                  className="text-xs text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
                >
                  Tasks Board
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-600">No tasks found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No tasks matching current filter for this agent.
                    </p>
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const vehicle = vehicles.find((v) => v.id === task.vehicleId);
                    return (
                      <div
                        key={task.id}
                        className="p-3 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl transition-colors text-xs flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 truncate">{task.title}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                task.priority === 'HIGH'
                                  ? 'bg-rose-100 text-rose-700'
                                  : task.priority === 'NORMAL'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {task.priority}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                task.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : task.status === 'CANCELLED'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {task.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            {vehicle && (
                              <span className="font-mono text-slate-700">
                                {formatRegistrationNumber(vehicle.registrationNumber)}
                              </span>
                            )}
                            <span>Due: {task.dueDate || 'No date'}</span>
                          </div>
                        </div>

                        {vehicle && (
                          <Link
                            href={`/vehicles/${vehicle.id}`}
                            onClick={onClose}
                            className="h-7 px-2 rounded-lg flex items-center gap-1 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 text-[11px] font-medium shrink-0"
                          >
                            <span>Vehicle</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Overdue Renewals */}
          {activeTab === 'overdues' && (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {agentOverdues.length === 0 ? (
                <div className="text-center py-10 bg-emerald-50/50 rounded-xl border border-dashed border-emerald-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-emerald-800">Fleet Compliant & Clear</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    There are no overdue renewals for any vehicles assigned to this agent.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      {agentOverdues.length} documents have expired and require immediate customer follow-up.
                    </span>
                  </div>

                  {agentOverdues.map((doc) => {
                    const vehicle = vehicles.find((v) => v.id === doc.vehicleId);
                    const owner = clients.find((c) => c.id === vehicle?.clientId);
                    return (
                      <div
                        key={doc.id}
                        className="p-3 bg-white hover:bg-rose-50/40 border border-rose-200 rounded-xl transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-slate-900">
                              {vehicle ? formatRegistrationNumber(vehicle.registrationNumber) : 'Unknown Vehicle'}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 uppercase">
                              {doc.documentType}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span className="text-rose-600 font-semibold">Expired: {doc.expiryDate || 'N/A'}</span>
                            {owner && <span>Owner: {owner.name}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {owner && (
                            <button
                              type="button"
                              onClick={() => {
                                setWhatsAppData({
                                  isOpen: true,
                                  clientName: owner.name,
                                  clientMobile: owner.mobile,
                                  registrationNumber: vehicle?.registrationNumber || '',
                                });
                              }}
                              className="h-8 px-2 rounded-lg flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium text-xs transition-colors"
                              title="Send WhatsApp renewal alert"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                          )}

                          {vehicle && (
                            <Link
                              href={`/vehicles/${vehicle.id}`}
                              onClick={onClose}
                              className="h-8 px-2.5 rounded-lg flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium text-xs transition-colors"
                              title="Open vehicle renewal workspace"
                            >
                              <span>Resolve</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="text-[11px] text-slate-400">
              Agent ID: <span className="font-mono">{agent.id.slice(0, 8)}...</span>
            </div>
            <Button type="button" variant="secondary" onClick={onClose} size="sm">
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Embedded WhatsApp reminder modal */}
      {whatsAppData.isOpen && (
        <WhatsAppModal
          isOpen={whatsAppData.isOpen}
          onClose={() => setWhatsAppData((prev) => ({ ...prev, isOpen: false }))}
          clientName={whatsAppData.clientName}
          clientMobile={whatsAppData.clientMobile}
          registrationNumber={whatsAppData.registrationNumber}
          documentType="Renewal Follow-up"
        />
      )}
    </>
  );
}
