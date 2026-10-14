'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TaskModal } from '@/components/shared/task-modal';
import { CompletionModal } from '@/components/shared/completion-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { TablePagination } from '@/components/ui/pagination';
import { TaskStatusBadge, PriorityBadge } from '@/components/shared/status-badge';
import { WhatsAppModal } from '@/components/shared/whatsapp-modal';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { Modal } from '@/components/ui/modal';
import { DocumentType, Task, TaskStatus, VehicleDocument } from '@/lib/types';

import {
  CheckSquare,
  Plus,
  Search,
  CheckCircle2,
  Car,
  User,
  Pencil,
  Trash2,
  Play,
  RotateCcw,
  LayoutGrid,
  List,
  Phone,
  ExternalLink,
  Shield,
  FileCheck,
  Flame,
  Clock,
  ArrowRight,
  Sparkles,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function TasksPage() {
  const {
    filteredTasks,
    vehicles,
    clients,
    documents,
    users,
    currentUser,
    addDocument,
    updateTask,
    completeTask,
    deleteTask,
  } = useApp();

  // View Mode: 'KANBAN' (default) or 'LIST'
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>('KANBAN');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assignedFilter, setAssignedFilter] = useState<string>('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileColumn, setMobileColumn] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Task & Vehicle Quick View Modal
  const [inspectTask, setInspectTask] = useState<Task | null>(null);

  // Completion Prompt Modal: "Valid until when?"
  const [completionData, setCompletionData] = useState<{
    isOpen: boolean;
    document: VehicleDocument;
    linkedTaskId: string;
    registrationNumber: string;
  } | null>(null);

  // WhatsApp reminder modal
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
    documentType: '',
  });

  const activeAgents = users.filter((u) => u.status === 'ACTIVE');

  // Filtered task items
  const filteredList = useMemo(() => {
    return filteredTasks.filter((task) => {
      // Exclude any legacy mock/seed tasks
      if (/^task_[0-9]{1,3}$/.test(task.id)) return false;
      if (task.vehicleId && /^veh_[0-9]{1,3}$/.test(task.vehicleId)) return false;

      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
      if (assignedFilter !== 'ALL' && task.assignedTo !== assignedFilter) return false;

      const doc = documents.find((d) => d.id === task.documentId);
      if (docTypeFilter !== 'ALL' && doc?.documentType !== docTypeFilter) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();

      const matchesTitle = task.title.toLowerCase().includes(q);
      const matchesDesc = task.description ? task.description.toLowerCase().includes(q) : false;

      const veh = vehicles.find((v) => v.id === task.vehicleId);
      const client = clients.find((c) => c.id === task.clientId);

      const matchesVeh = veh
        ? veh.registrationNumber.toLowerCase().includes(q) ||
          veh.make.toLowerCase().includes(q) ||
          veh.model.toLowerCase().includes(q)
        : false;
      const matchesClient = client
        ? client.name.toLowerCase().includes(q) || client.mobile.includes(q)
        : false;

      return matchesTitle || matchesDesc || matchesVeh || matchesClient;
    });
  }, [filteredTasks, statusFilter, priorityFilter, assignedFilter, docTypeFilter, searchTerm, vehicles, clients, documents]);

  // Kanban Column Buckets
  const kanbanPending = useMemo(
    () => filteredList.filter((t) => t.status === 'PENDING'),
    [filteredList]
  );
  const kanbanInProgress = useMemo(
    () =>
      filteredList.filter(
        (t) =>
          t.status === 'PROCESSING' ||
          t.status === 'CLIENT_CONTACTED' ||
          t.status === 'WAITING_FOR_DOCUMENT' ||
          t.status === 'CLIENT_NOT_RESPONDING'
      ),
    [filteredList]
  );
  const kanbanCompleted = useMemo(
    () => filteredList.filter((t) => t.status === 'COMPLETED'),
    [filteredList]
  );

  // List Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, assignedFilter, docTypeFilter, searchTerm]);

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Trigger Completion Modal (Prompts "New Expiry Date & Upload Document")
  const handleCompleteClick = (task: Task) => {
    let doc = documents.find((d) => d.id === task.documentId && !d.isHistorical);
    const veh = vehicles.find((v) => v.id === task.vehicleId);

    // If task.documentId is not directly found, match document by type + vehicleId
    if (!doc && veh) {
      const titleLower = ((task.title || '') + ' ' + (task.description || '')).toLowerCase();
      let targetType: DocumentType = 'INSURANCE';
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

      doc = documents.find((d) => d.vehicleId === veh.id && d.documentType === targetType && !d.isHistorical);

      // If document doesn't exist yet, provision one so user can enter new expiry and upload file
      if (!doc) {
        const newDocId = `doc_${Date.now()}`;
        const createdDoc: VehicleDocument = {
          id: newDocId,
          vehicleId: veh.id,
          clientId: veh.clientId,
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
    }

    if (doc) {
      setCompletionData({
        isOpen: true,
        document: doc,
        linkedTaskId: task.id,
        registrationNumber: veh?.registrationNumber || 'Vehicle',
      });
      return;
    }

    completeTask(task.id, 'Task marked complete by staff');
  };

  // Helper for human-friendly document type names
  const formatDocType = (docType?: string) => {
    if (!docType) return 'Renewal';
    switch (docType) {
      case 'INSURANCE':
        return 'Insurance';
      case 'ROAD_TAX':
        return 'Road Tax';
      case 'GREEN_TAX':
        return 'Green Tax';
      case 'PUC':
        return 'Pollution (PUCC)';
      case 'FITNESS':
        return 'Fitness Certificate';
      case 'PERMIT':
        return 'Permit';
      case 'RC':
        return 'RC Renewal';
      default:
        return docType.replace(/_/g, ' ');
    }
  };

  // Helper to format task title cleanly and prevent registration numbers from splitting across lines
  const formatTaskTitle = (title: string) => {
    let cleaned = title
      .replace(/\bROAD_TAX\b/g, 'Road Tax')
      .replace(/\bGREEN_TAX\b/g, 'Green Tax')
      .replace(/\bPUC\b/g, 'Pollution (PUC)')
      .replace(/\bFITNESS\b/g, 'Fitness')
      .replace(/\bINSURANCE\b/g, 'Insurance');

    // Replace hyphens in vehicle registration numbers with non-breaking hyphens so they never break mid-number
    cleaned = cleaned.replace(/([A-Z]{2})-(\d{1,2})-([A-Z]{1,3})-(\d{4})/g, '$1\u2011$2\u2011$3\u2011$4');
    return cleaned;
  };

  // Helper for agent display name without repetitive role parenthesis
  const formatAgentName = (name?: string) => {
    if (!name) return 'Staff';
    return name.replace(/\s*\((Agent|Admin)\)/i, '').trim();
  };

  // Helper for document icons
  const getDocTypeIcon = (docType?: string) => {
    switch (docType) {
      case 'INSURANCE':
        return <Shield className="w-3.5 h-3.5 text-blue-600" />;
      case 'FITNESS':
        return <FileCheck className="w-3.5 h-3.5 text-emerald-600" />;
      case 'PUC':
        return <Flame className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />;
    }
  };

  const renderKanbanCard = (task: Task) => {
    const veh = vehicles.find((v) => v.id === task.vehicleId);
    const client = clients.find((c) => c.id === task.clientId);
    const doc = documents.find((d) => d.id === task.documentId);
    const agent = users.find((u) => u.id === task.assignedTo);

    return (
      <div
        key={task.id}
        className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all space-y-3 group"
      >
        {/* Header: Title & Badges */}
        <div className="flex items-start justify-between gap-2.5">
          <div
            onClick={() => setInspectTask(task)}
            className="font-bold text-xs text-slate-900 group-hover:text-purple-600 transition-colors cursor-pointer leading-snug break-words"
          >
            {formatTaskTitle(task.title)}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        {/* Vehicle Details */}
        {veh && (
          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="font-mono text-blue-700 font-bold tracking-wide whitespace-nowrap">
                {veh.registrationNumber}
              </span>
              <span className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]">
                {veh.make} {veh.model}
              </span>
            </div>
            {doc && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-0.5">
                {getDocTypeIcon(doc.documentType)}
                <span className="font-semibold text-slate-700">{formatDocType(doc.documentType)}</span>
                <span className="text-slate-400">•</span>
                <span className={doc.status === 'OVERDUE' ? 'text-rose-600 font-bold' : 'text-amber-700 font-semibold'}>
                  Due: {task.dueDate}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Point of Contact (POC) / Driver if designated */}
        {(veh?.pocName || task.pocName) && (
          <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-teal-50/70 border border-teal-200/80">
            <div className="truncate pr-2">
              <span className="text-[10px] text-teal-700 uppercase font-extrabold flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-teal-600" />
                POC ({veh?.pocDesignation || 'Driver'})
              </span>
              <strong className="text-slate-900 text-[11px] truncate block">{veh?.pocName || task.pocName}</strong>
              {(veh?.pocMobile || task.pocMobile) && (
                <span className="text-[10px] text-slate-600 font-mono">{veh?.pocMobile || task.pocMobile}</span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {(veh?.pocMobile || task.pocMobile) && (
                <>
                  <a
                    href={`tel:${veh?.pocMobile || task.pocMobile}`}
                    className="p-1.5 rounded-lg bg-white text-teal-700 hover:bg-teal-100 border border-teal-200 transition-colors shadow-2xs"
                    title="Call POC"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      setWhatsAppData({
                        isOpen: true,
                        clientName: veh?.pocName || task.pocName || 'POC',
                        clientMobile: veh?.pocMobile || task.pocMobile || '',
                        registrationNumber: veh?.registrationNumber || '',
                        documentType: formatDocType(doc?.documentType) || 'Renewal',
                        dueDate: doc?.expiryDate,
                      })
                    }
                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                    title="Send WhatsApp to POC"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Client Owner with quick Call / WhatsApp */}
        {client && (
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
            <div className="truncate pr-2">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Registered Owner</span>
              <strong className="text-slate-800 text-[11px] truncate block">{client.name}</strong>
              <span className="text-[10px] text-slate-500 font-mono">{client.mobile}</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <a
                href={`tel:${client.mobile}`}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors shadow-2xs"
                title="Call Client"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
              {veh && doc && (
                <button
                  type="button"
                  onClick={() =>
                    setWhatsAppData({
                      isOpen: true,
                      clientName: client.name,
                      clientMobile: client.mobile,
                      registrationNumber: veh.registrationNumber,
                      documentType: formatDocType(doc.documentType),
                      dueDate: doc.expiryDate,
                    })
                  }
                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                  title="Send WhatsApp Notice"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
          <span className="text-slate-500 truncate">
            Agent: <strong className="text-slate-700">{formatAgentName(agent?.name)}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            {task.status === 'PENDING' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateTask(task.id, { status: 'PROCESSING' })}
                className="h-7 px-2.5 text-[11px] font-bold text-blue-700 bg-blue-50/70 border-blue-200 hover:bg-blue-100 gap-1.5 rounded-lg transition-colors shadow-2xs"
              >
                <Play className="w-3 h-3 fill-blue-600 text-blue-600" />
                <span>Start</span>
              </Button>
            )}

            {task.status !== 'COMPLETED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCompleteClick(task)}
                className="h-7 px-2.5 text-[11px] font-bold text-emerald-700 bg-emerald-50/80 border-emerald-300 hover:bg-emerald-100 gap-1.5 rounded-lg transition-colors shadow-2xs"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Complete</span>
              </Button>
            )}

            <button
              type="button"
              onClick={() => setInspectTask(task)}
              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
              title="Inspect Full Details"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-600" />
            Operations &amp; Renewal Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Unified Kanban hub for all vehicle renewals, inspections, and client follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
            className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs cursor-pointer h-9 px-3.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </Button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('KANBAN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'KANBAN'
                  ? 'bg-white text-purple-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'LIST'
                  ? 'bg-white text-purple-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search vehicle reg, client name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 bg-slate-50/60 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Document Type Filter */}
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="text-xs h-9 border border-slate-200 rounded-xl px-3 bg-white text-slate-700 font-medium cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition-all shadow-2xs"
          >
            <option value="ALL">All Compliance Types</option>
            <option value="INSURANCE">Insurance Policies</option>
            <option value="FITNESS">Fitness Certificates</option>
            <option value="PUC">Pollution (PUCC)</option>
            <option value="ROAD_TAX">Road Tax</option>
            <option value="PERMIT">Permit</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs h-9 border border-slate-200 rounded-xl px-3 bg-white text-slate-700 font-medium cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition-all shadow-2xs"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="NORMAL">Normal Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {currentUser?.role === 'ADMIN' && (
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="text-xs h-9 border border-slate-200 rounded-xl px-3 bg-white text-slate-700 font-medium cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition-all shadow-2xs"
            >
              <option value="ALL">All Staff Agents</option>
              {activeAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatAgentName(a.name)}
                </option>
              ))}
            </select>
          )}

          {(searchTerm || docTypeFilter !== 'ALL' || priorityFilter !== 'ALL' || assignedFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDocTypeFilter('ALL');
                setPriorityFilter('ALL');
                setAssignedFilter('ALL');
              }}
              className="text-xs h-9 px-2.5 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-700 font-bold hover:bg-rose-100 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === 'KANBAN' && (
        <div className="space-y-4">
          {/* Mobile Column Tab Switcher */}
          <div className="flex md:hidden items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl overflow-x-auto text-xs font-bold border border-slate-200/80">
            <button
              type="button"
              onClick={() => setMobileColumn('ALL')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                mobileColumn === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({filteredList.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileColumn('PENDING')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                mobileColumn === 'PENDING'
                  ? 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                  : 'text-slate-600 hover:text-amber-800'
              }`}
            >
              Pending ({kanbanPending.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileColumn('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                mobileColumn === 'IN_PROGRESS'
                  ? 'bg-blue-100 text-blue-900 font-extrabold shadow-2xs'
                  : 'text-slate-600 hover:text-blue-800'
              }`}
            >
              In Progress ({kanbanInProgress.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileColumn('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                mobileColumn === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-900 font-extrabold shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-800'
              }`}
            >
              Completed ({kanbanCompleted.length})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* COLUMN 1: PENDING */}
            <div className={`space-y-3 ${mobileColumn === 'ALL' || mobileColumn === 'PENDING' ? 'block' : 'hidden md:block'}`}>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Pending / To-Do</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200/70 text-amber-900">
                  {kanbanPending.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[300px]">
                {kanbanPending.length === 0 ? (
                  <div className="py-12 px-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/80 flex flex-col items-center justify-center gap-2">
                    <Clock className="w-7 h-7 text-amber-400/80 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">No pending tasks</p>
                    <p className="text-[11px] text-slate-400">All renewals are up-to-date</p>
                  </div>
                ) : (
                  kanbanPending.map((task) => renderKanbanCard(task))
                )}
              </div>
            </div>

            {/* COLUMN 2: IN PROGRESS */}
            <div className={`space-y-3 ${mobileColumn === 'ALL' || mobileColumn === 'IN_PROGRESS' ? 'block' : 'hidden md:block'}`}>
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-900">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">In Progress / Processing</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-200/70 text-blue-900">
                  {kanbanInProgress.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[300px]">
                {kanbanInProgress.length === 0 ? (
                  <div className="py-12 px-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/80 flex flex-col items-center justify-center gap-2">
                    <Play className="w-7 h-7 text-blue-400/80 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">No tasks currently in progress</p>
                    <p className="text-[11px] text-slate-400">Click &ldquo;Start&rdquo; on any pending task to begin</p>
                  </div>
                ) : (
                  kanbanInProgress.map((task) => renderKanbanCard(task))
                )}
              </div>
            </div>

            {/* COLUMN 3: COMPLETED */}
            <div className={`space-y-3 ${mobileColumn === 'ALL' || mobileColumn === 'COMPLETED' ? 'block' : 'hidden md:block'}`}>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Completed / Renewed</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-200/70 text-emerald-900">
                  {kanbanCompleted.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[300px]">
                {kanbanCompleted.length === 0 ? (
                  <div className="py-12 px-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/80 flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400/80 stroke-1" />
                    <p className="text-xs font-medium text-slate-500">No completed tasks yet</p>
                    <p className="text-[11px] text-slate-400">Completed renewal tasks will appear here</p>
                  </div>
                ) : (
                  kanbanCompleted.map((task) => renderKanbanCard(task))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TABLE LIST */}
      {viewMode === 'LIST' && (
        <Card>
          <CardContent className="p-0">
            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No tasks matched your active filter settings.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {paginatedTasks.map((task, index) => {
                  const serialNo = (currentPage - 1) * pageSize + index + 1;
                  const veh = vehicles.find((v) => v.id === task.vehicleId);
                  const client = clients.find((c) => c.id === task.clientId);
                  const doc = documents.find((d) => d.id === task.documentId);
                  const agent = users.find((u) => u.id === task.assignedTo);

                  return (
                    <div
                      key={task.id}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            #{serialNo}
                          </span>
                          <span
                            onClick={() => setInspectTask(task)}
                            className="font-bold text-sm text-slate-900 hover:text-purple-600 cursor-pointer"
                          >
                            {formatTaskTitle(task.title)}
                          </span>
                          <PriorityBadge priority={task.priority} />
                          <TaskStatusBadge status={task.status} />
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                          {veh && (
                            <div className="flex items-center gap-1 font-mono font-semibold text-blue-700">
                              <Car className="w-3.5 h-3.5 text-slate-400" />
                              <Link href={`/vehicles/${veh.id}`} className="hover:underline">
                                {veh.registrationNumber} ({veh.make} {veh.model})
                              </Link>
                            </div>
                          )}

                          {(veh?.pocName || task.pocName) && (
                            <div className="flex items-center gap-1 text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                              <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                              <span>POC: {veh?.pocName || task.pocName} ({veh?.pocDesignation || 'Driver'})</span>
                            </div>
                          )}

                          {client && (
                            <div className="flex items-center gap-1 text-slate-700 font-medium">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{client.name} ({client.mobile})</span>
                            </div>
                          )}

                          <div>
                            Assigned to: <strong className="text-slate-800">{formatAgentName(agent?.name)}</strong>
                          </div>

                          <div>
                            Due: <strong className="text-slate-800 font-mono">{task.dueDate}</strong>
                          </div>
                        </div>

                        {task.completionNotes && (
                          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-2 rounded-lg text-xs mt-2">
                            <strong>Completion Note:</strong> {task.completionNotes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
                        {client && veh && doc && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setWhatsAppData({
                                isOpen: true,
                                clientName: client.name,
                                clientMobile: client.mobile,
                                registrationNumber: veh.registrationNumber,
                                documentType: doc.documentType,
                                dueDate: doc.expiryDate,
                              })
                            }
                            className="h-8 px-2.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-xs font-semibold gap-1"
                            title="Send WhatsApp Reminder"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </Button>
                        )}

                        {task.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTask(task.id, { status: 'PROCESSING' })}
                            className="h-8 px-2.5 rounded-lg text-blue-600 hover:bg-blue-50 border-blue-200 text-xs font-semibold gap-1"
                          >
                            <Play className="w-3 h-3 fill-blue-600" />
                            <span>Start</span>
                          </Button>
                        )}

                        {task.status !== 'COMPLETED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCompleteClick(task)}
                            className="h-8 px-2.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border-emerald-300 text-xs font-bold gap-1 bg-emerald-50/50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Complete</span>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingTask(task)}
                          className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border-slate-200"
                          title="Edit Task"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        {currentUser?.role === 'ADMIN' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTaskToDelete(task)}
                            className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
      )}

      {/* MODAL 1: FULL TASK & VEHICLE DETAILS INSPECTOR */}
      {inspectTask && (() => {
        const veh = vehicles.find((v) => v.id === inspectTask.vehicleId);
        const client = clients.find((c) => c.id === inspectTask.clientId);
        const doc = documents.find((d) => d.id === inspectTask.documentId);
        const agent = users.find((u) => u.id === inspectTask.assignedTo);

        return (
          <Modal
            isOpen={Boolean(inspectTask)}
            onClose={() => setInspectTask(null)}
            title="Task & Compliance Details"
            description="Full specifications for vehicle, client point of contact, and renewal actions."
            maxWidth="lg"
          >
            <div className="space-y-4">
              {/* Task Header Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 via-slate-50 to-white border border-purple-200/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{inspectTask.title}</h3>
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge priority={inspectTask.priority} />
                    <TaskStatusBadge status={inspectTask.status} />
                  </div>
                </div>
                {inspectTask.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">{inspectTask.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                  <span>Due Date: <strong className="text-slate-800 font-mono">{inspectTask.dueDate}</strong></span>
                  <span>Assigned Agent: <strong className="text-slate-800">{agent?.name || 'Staff'}</strong></span>
                </div>
              </div>

              {/* Vehicle Specifications */}
              {veh && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-blue-600" />
                      Vehicle Specifications
                    </span>
                    <Link
                      href={`/vehicles/${veh.id}`}
                      className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>View Vehicle Hub</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Registration</span>
                      <strong className="text-blue-700 font-mono text-sm">{veh.registrationNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Make &amp; Model</span>
                      <strong className="text-slate-800">{veh.make} {veh.model}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Fuel Type</span>
                      <strong className="text-slate-800">{veh.fuelType}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">RTO Office</span>
                      <span className="text-slate-700">{veh.rto}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Chassis (VIN)</span>
                      <span className="text-slate-700 font-mono text-[11px]">{veh.chassisNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Engine Number</span>
                      <span className="text-slate-700 font-mono text-[11px]">{veh.engineNumber || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}



              {/* Point of Contact (POC) / Driver if present */}
              {(veh?.pocName || inspectTask.pocName) && (
                <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/90 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                    <span className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-teal-600" />
                      Point of Contact ({veh?.pocDesignation || 'Driver'})
                    </span>
                    {(veh?.pocMobile || inspectTask.pocMobile) && (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${veh?.pocMobile || inspectTask.pocMobile}`}
                          className="px-2 py-1 rounded-lg bg-white border border-teal-200 text-teal-700 hover:bg-teal-100 text-xs font-semibold flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call POC</span>
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            setWhatsAppData({
                              isOpen: true,
                              clientName: veh?.pocName || inspectTask.pocName || 'POC',
                              clientMobile: veh?.pocMobile || inspectTask.pocMobile || '',
                              registrationNumber: veh?.registrationNumber || '',
                              documentType: doc?.documentType || 'Renewal',
                              dueDate: doc?.expiryDate,
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <WhatsAppIcon className="w-3 h-3" />
                          <span>WhatsApp POC</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-teal-700/70 block font-bold uppercase">POC Name</span>
                      <strong className="text-slate-900">{veh?.pocName || inspectTask.pocName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-teal-700/70 block font-bold uppercase">Mobile Number</span>
                      <strong className="text-slate-900 font-mono">{veh?.pocMobile || inspectTask.pocMobile || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-teal-700/70 block font-bold uppercase">Role / Relation</span>
                      <span className="text-slate-800 font-semibold">{veh?.pocDesignation || 'Driver'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Registered Owner Client Profile */}
              {client && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-4 h-4 text-emerald-600" />
                      Registered Owner Profile
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <span>View Client Fleet</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Client Name</span>
                      <strong className="text-slate-800">{client.name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Mobile Number</span>
                      <strong className="text-slate-800 font-mono">{client.mobile}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Email Address</span>
                      <span className="text-slate-700">{client.email || 'Not specified'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setInspectTask(null)}>
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  {inspectTask.status === 'PENDING' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        updateTask(inspectTask.id, { status: 'PROCESSING' });
                        setInspectTask(null);
                      }}
                      className="text-blue-700 border-blue-200 hover:bg-blue-50"
                    >
                      <Play className="w-3.5 h-3.5 mr-1" />
                      Start Working
                    </Button>
                  )}

                  {inspectTask.status !== 'COMPLETED' && (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        const t = inspectTask;
                        setInspectTask(null);
                        handleCompleteClick(t);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Complete Renewal
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* MODAL 2: EDIT / CREATE TASK */}
      <TaskModal
        isOpen={isTaskModalOpen || Boolean(editingTask)}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        initialTask={editingTask}
      />

      {/* MODAL 3: "VALID UNTIL WHEN?" COMPLETION POPUP */}
      {completionData && (
        <CompletionModal
          isOpen={completionData.isOpen}
          onClose={() => setCompletionData(null)}
          document={completionData.document}
          linkedTaskId={completionData.linkedTaskId}
          registrationNumber={completionData.registrationNumber}
        />
      )}

      {/* MODAL 4: WHATSAPP NOTICE DISPATCH */}
      <WhatsAppModal
        isOpen={whatsAppData.isOpen}
        onClose={() => setWhatsAppData((prev) => ({ ...prev, isOpen: false }))}
        clientName={whatsAppData.clientName}
        clientMobile={whatsAppData.clientMobile}
        registrationNumber={whatsAppData.registrationNumber}
        documentType={whatsAppData.documentType}
        dueDate={whatsAppData.dueDate}
      />

      {/* MODAL 5: DELETE TASK CONFIRMATION */}
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
        message={`Are you sure you want to permanently delete task "${taskToDelete?.title}"?`}
        confirmText="Delete Task"
        isLoading={isDeleting}
      />
    </div>
  );
}
