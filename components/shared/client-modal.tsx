'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useApp } from '@/lib/store/app-context';
import { Client } from '@/lib/types';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClient?: Client | null;
}

export function ClientModal({ isOpen, onClose, initialClient }: ClientModalProps) {
  const { addClient, updateClient, users, currentUser } = useApp();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [notes, setNotes] = useState('');

  const activeAgents = users.filter((u) => u.status === 'ACTIVE');

  useEffect(() => {
    if (initialClient) {
      setName(initialClient.name);
      setMobile(initialClient.mobile);
      setAlternateMobile(initialClient.alternateMobile || '');
      setEmail(initialClient.email || '');
      setAddress(initialClient.address);
      setAssignedAgentId(initialClient.assignedAgentId);
      setNotes(initialClient.notes || '');
    } else {
      setName('');
      setMobile('');
      setAlternateMobile('');
      setEmail('');
      setAddress('');
      setAssignedAgentId(
        currentUser?.role === 'AGENT'
          ? currentUser.id
          : (activeAgents.find((u) => u.role === 'AGENT')?.id || currentUser?.id || '')
      );
      setNotes('');
    }
  }, [initialClient, isOpen, currentUser, users]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !mobile.trim() || !address.trim() || !assignedAgentId) {
      alert('Please fill in all required fields.');
      return;
    }

    if (initialClient) {
      updateClient(initialClient.id, {
        name: name.trim(),
        mobile: mobile.trim(),
        alternateMobile: alternateMobile.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim(),
        assignedAgentId,
        notes: notes.trim() || undefined,
      });
    } else {
      addClient({
        name: name.trim(),
        mobile: mobile.trim(),
        alternateMobile: alternateMobile.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim(),
        assignedAgentId,
        status: 'ACTIVE',
        notes: notes.trim() || undefined,
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialClient ? 'Edit Client Record' : 'Register New Client'}
      description="Add vehicle owner profile and assign dedicated relationship agent."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name / Company Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mohammed Ali"
          />

          <Input
            label="Primary Mobile Number"
            required
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="e.g. +91 98471 23456"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Alternate Mobile (Optional)"
            value={alternateMobile}
            onChange={(e) => setAlternateMobile(e.target.value)}
            placeholder="e.g. +91 98471 99999"
          />

          <Input
            label="Email Address (Optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. client@example.com"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Office / Residential Address <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Complete postal address for document courier and RTO verification..."
            className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Assigned Agent"
            required
            value={assignedAgentId}
            onChange={(e) => setAssignedAgentId(e.target.value)}
            disabled={currentUser?.role === 'AGENT'}
          >
            {activeAgents.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </Select>

          <Input
            label="Internal Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Preferred contact timing, fleet owner"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {initialClient ? 'Update Client' : 'Register Client'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
