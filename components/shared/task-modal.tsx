'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useApp } from '@/lib/store/app-context';
import { Task, TaskPriority, TaskStatus } from '@/lib/types';
import { UserCheck } from 'lucide-react';
import { validateMobile, onlyDigits, cleanMobileNumber } from '@/lib/validation';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  vehicleId?: string;
  documentId?: string;
  initialTask?: Task | null;
}

export function TaskModal({
  isOpen,
  onClose,
  clientId: initialClientId,
  vehicleId: initialVehicleId,
  documentId: initialDocumentId,
  initialTask,
}: TaskModalProps) {
  const { clients, vehicles, documents, users, currentUser, addTask, updateTask } = useApp();

  const [clientId, setClientId] = useState(initialClientId || '');
  const [vehicleId, setVehicleId] = useState(initialVehicleId || '');
  const [documentId, setDocumentId] = useState(initialDocumentId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [status, setStatus] = useState<TaskStatus>('PENDING');
  const [notes, setNotes] = useState('');

  // Point of Contact (POC) / Field Driver
  const [pocName, setPocName] = useState('');
  const [pocMobile, setPocMobile] = useState('');



  const availableAgents = users.filter((u) => u.status === 'ACTIVE');

  // Filter vehicles for selected client
  const availableVehicles = clientId
    ? vehicles.filter((v) => v.clientId === clientId && v.status !== 'INACTIVE')
    : vehicles.filter((v) => v.status !== 'INACTIVE');

  // Filter documents for selected vehicle
  const availableDocuments = vehicleId
    ? documents.filter((d) => d.vehicleId === vehicleId && !d.isHistorical)
    : [];

  useEffect(() => {
    if (!isOpen) return;

    if (initialTask) {
      setClientId(initialTask.clientId);
      setVehicleId(initialTask.vehicleId);
      setDocumentId(initialTask.documentId || '');
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setAssignedTo(initialTask.assignedTo);
      setDueDate(initialTask.dueDate);
      setPriority(initialTask.priority);
      setStatus(initialTask.status);
      setNotes(initialTask.notes || '');
      setPocName(initialTask.pocName || '');
      setPocMobile(initialTask.pocMobile || '');
    } else {
      const targetVehId = initialVehicleId || '';
      const selVeh = vehicles.find((v) => v.id === targetVehId);
      const targetClientId = initialClientId || selVeh?.clientId || (clients[0]?.id ?? '');

      setClientId(targetClientId);
      const resolvedVehId = targetVehId || (targetClientId ? vehicles.find(v => v.clientId === targetClientId && v.status !== 'INACTIVE')?.id || '' : '');
      setVehicleId(resolvedVehId);
      setDocumentId(initialDocumentId || '');
      setTitle('');
      setDescription('');

      const defaultAgentId = currentUser?.role === 'AGENT'
        ? currentUser.id
        : (selVeh?.assignedAgentId || users.find((u) => u.role === 'AGENT' && u.status !== 'INACTIVE')?.id || currentUser?.id || users[0]?.id || '');
      setAssignedTo(defaultAgentId);

      const d = new Date();
      d.setDate(d.getDate() + 3);
      setDueDate(d.toISOString().split('T')[0]);
      setPriority('NORMAL');
      setStatus('PENDING');
      setNotes('');

      // Auto-populate from selected vehicle if available
      setPocName(selVeh?.pocName || '');
      setPocMobile(selVeh?.pocMobile || '');
    }
  }, [initialTask, initialClientId, initialVehicleId, initialDocumentId, isOpen]);

  const [taskError, setTaskError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskError('');

    if (!title.trim() || !clientId || !vehicleId || !assignedTo || !dueDate) {
      setTaskError('Please fill in all required fields (Task Title, Client, Vehicle, Assigned Agent, and Due Date).');
      return;
    }

    if (pocMobile.trim()) {
      const pocCheck = validateMobile(pocMobile, 'POC Mobile Number', false);
      if (!pocCheck.isValid) {
        setTaskError(pocCheck.error || 'Invalid POC mobile number.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const taskPayload = {
        clientId,
        vehicleId,
        documentId: documentId || undefined,
        title: title.trim(),
        description: description?.trim() || undefined,
        assignedTo,
        dueDate,
        priority,
        status,
        notes: notes?.trim() || undefined,
        pocName: pocName.trim() || undefined,
        pocMobile: pocMobile.trim() ? cleanMobileNumber(pocMobile) : undefined,
      };

      if (initialTask) {
        await updateTask(initialTask.id, taskPayload);
      } else {
        await addTask(taskPayload);
      }

      onClose();
    } catch (err: any) {
      console.error('Task save error:', err);
      setTaskError(err.message || 'Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTask ? 'Edit Follow-up Task' : 'Create Follow-up Task'}
      description="Track renewal workflows, client conversations, and office verifications."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {taskError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>{taskError}</span>
          </div>
        )}

        <Input
          label="Task Title"
          required
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (taskError) setTaskError('');
          }}
          placeholder="e.g. Call client for Insurance renewal quotation"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Client"
            required
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setVehicleId('');
              setDocumentId('');
            }}
          >
            <option value="">Select Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.mobile})
              </option>
            ))}
          </Select>

          <Select
            label="Vehicle"
            required
            value={vehicleId}
            onChange={(e) => {
              setVehicleId(e.target.value);
              setDocumentId('');
            }}
          >
            <option value="">Select Vehicle</option>
            {availableVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registrationNumber} — {v.make} {v.model}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Related Document (Optional)"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
          >
            <option value="">None / General Vehicle Work</option>
            {availableDocuments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.documentType} ({d.expiryDate ? `Due: ${d.expiryDate}` : 'No date'})
              </option>
            ))}
          </Select>

          <Select
            label="Assign To Agent"
            required
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={currentUser?.role === 'AGENT'}
          >
            {availableAgents.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </Select>
        </div>

        {/* Point of Contact (Driver / Field Representative) */}
        <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/80 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
            <UserCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Point of Contact (Driver / Ground Coordinator)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="POC Name"
              placeholder="e.g. Sujith (Driver)"
              value={pocName}
              onChange={(e) => setPocName(e.target.value)}
            />
            <Input
              label="POC Mobile Number"
              placeholder="e.g. 9847144556"
              type="tel"
              value={pocMobile}
              onChange={(e) => {
                setPocMobile(onlyDigits(e.target.value, 10));
                if (taskError) setTaskError('');
              }}
              className="font-mono"
            />
          </div>
        </div>



        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Due Date"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High Priority</option>
          </Select>

          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
          >
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">In Progress</option>
            <option value="COMPLETED">Completed</option>
            {status === 'CANCELLED' && <option value="CANCELLED">Cancelled</option>}
          </Select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Description & Instructions
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add detailed operational instructions for the agent..."
            className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving Task...' : initialTask ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
