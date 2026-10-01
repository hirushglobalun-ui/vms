'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useApp } from '@/lib/store/app-context';
import { Task, TaskPriority, TaskStatus } from '@/lib/types';

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

  const availableAgents = users.filter((u) => u.status === 'ACTIVE');

  // Filter vehicles for selected client
  const availableVehicles = clientId
    ? vehicles.filter((v) => v.clientId === clientId && v.status === 'ACTIVE')
    : vehicles.filter((v) => v.status === 'ACTIVE');

  // Filter documents for selected vehicle
  const availableDocuments = vehicleId
    ? documents.filter((d) => d.vehicleId === vehicleId && !d.isHistorical)
    : [];

  useEffect(() => {
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
    } else {
      setClientId(initialClientId || (clients[0]?.id ?? ''));
      setVehicleId(initialVehicleId || '');
      setDocumentId(initialDocumentId || '');
      setTitle('');
      setDescription('');
      setAssignedTo(currentUser?.role === 'AGENT' ? currentUser.id : (users.find(u => u.role === 'AGENT')?.id || currentUser?.id || ''));
      const d = new Date();
      d.setDate(d.getDate() + 3);
      setDueDate(d.toISOString().split('T')[0]);
      setPriority('NORMAL');
      setStatus('PENDING');
      setNotes('');
    }
  }, [initialTask, initialClientId, initialVehicleId, initialDocumentId, isOpen, clients, currentUser, users]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !clientId || !vehicleId || !assignedTo || !dueDate) {
      alert('Please fill in all required fields.');
      return;
    }

    if (initialTask) {
      updateTask(initialTask.id, {
        clientId,
        vehicleId,
        documentId: documentId || undefined,
        title,
        description: description || undefined,
        assignedTo,
        dueDate,
        priority,
        status,
        notes: notes || undefined,
      });
    } else {
      addTask({
        clientId,
        vehicleId,
        documentId: documentId || undefined,
        title,
        description: description || undefined,
        assignedTo,
        dueDate,
        priority,
        status,
        notes: notes || undefined,
      });
    }

    onClose();
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
        <Input
          label="Task Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
            <option value="CLIENT_CONTACTED">Client Contacted</option>
            <option value="PROCESSING">Processing</option>
            <option value="WAITING_FOR_DOCUMENT">Waiting for Document</option>
            <option value="CLIENT_NOT_RESPONDING">Client Not Responding</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
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
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {initialTask ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
