'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TaskModal } from '@/components/shared/task-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { TaskStatusBadge, PriorityBadge } from '@/components/shared/status-badge';
import { Task, TaskStatus } from '@/lib/types';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Car,
  User,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

export default function TasksPage() {
  const { filteredTasks, vehicles, clients, users, currentUser, updateTask, completeTask, deleteTask } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assignedFilter, setAssignedFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeAgents = users.filter((u) => u.status === 'ACTIVE');

  const filteredList = useMemo(() => {
    return filteredTasks.filter((task) => {
      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
      if (assignedFilter !== 'ALL' && task.assignedTo !== assignedFilter) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();

      const matchesTitle = task.title.toLowerCase().includes(q);
      const matchesDesc = task.description ? task.description.toLowerCase().includes(q) : false;

      const veh = vehicles.find((v) => v.id === task.vehicleId);
      const client = clients.find((c) => c.id === task.clientId);

      const matchesVeh = veh ? veh.registrationNumber.toLowerCase().includes(q) : false;
      const matchesClient = client ? client.name.toLowerCase().includes(q) : false;

      return matchesTitle || matchesDesc || matchesVeh || matchesClient;
    });
  }, [filteredTasks, statusFilter, priorityFilter, assignedFilter, searchTerm, vehicles, clients]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-600" />
            Operational Tasks & Workflows
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Coordinate agent renewals, client phone follow-ups, and inspection tasks.
          </p>
        </div>

        <Button
          onClick={() => setIsTaskModalOpen(true)}
          variant="primary"
          size="sm"
          className="gap-2 self-start sm:self-auto font-semibold"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search task title, vehicle, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CLIENT_CONTACTED">Client Contacted</option>
            <option value="PROCESSING">Processing</option>
            <option value="WAITING_FOR_DOCUMENT">Waiting for Document</option>
            <option value="CLIENT_NOT_RESPONDING">Not Responding</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>

          {currentUser?.role === 'ADMIN' && (
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
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
        </div>
      </div>

      {/* Task List Table */}
      <Card>
        <CardContent className="p-0">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No tasks matched your active filter settings.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredList.map((task) => {
                const veh = vehicles.find((v) => v.id === task.vehicleId);
                const client = clients.find((c) => c.id === task.clientId);
                const agent = users.find((u) => u.id === task.assignedTo);

                return (
                  <div
                    key={task.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{task.title}</span>
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
                              {veh.registrationNumber}
                            </Link>
                          </div>
                        )}

                        {client && (
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <Link href={`/clients/${client.id}`} className="hover:underline text-slate-700 font-medium">
                              {client.name}
                            </Link>
                          </div>
                        )}

                        <div>
                          Assigned to: <strong className="text-slate-800">{agent?.name || 'Agent'}</strong>
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

                    <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                      {task.status !== 'COMPLETED' && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => completeTask(task.id, 'Task completed by staff')}
                          className="h-8 text-xs font-semibold gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Mark Complete
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTask(task)}
                        className="h-8 text-xs"
                      >
                        Edit / Status
                      </Button>

                      {currentUser?.role === 'ADMIN' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setTaskToDelete(task)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
        </CardContent>
      </Card>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen || Boolean(editingTask)}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        initialTask={editingTask}
      />

      {/* Delete Confirmation Modal */}
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
