'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useApp } from '@/lib/store/app-context';
import { Client } from '@/lib/types';
import { validateMobile, validateEmail, cleanMobileNumber, onlyDigits } from '@/lib/validation';

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
  const [formError, setFormError] = useState('');

  const activeAgents = users.filter((u) => u.status === 'ACTIVE');

  useEffect(() => {
    setFormError('');
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
    setFormError('');

    // 1. Name validation
    if (!name.trim() || name.trim().length < 2) {
      setFormError('Please enter a valid Client / Company name (at least 2 characters).');
      return;
    }

    // 2. Primary Mobile validation (Must be numbers only, 10 digits)
    const mobileCheck = validateMobile(mobile, 'Primary Mobile Number', true);
    if (!mobileCheck.isValid) {
      setFormError(mobileCheck.error || 'Invalid primary mobile number.');
      return;
    }

    // 3. Alternate Mobile validation (if entered, must be 10 digits numbers only)
    if (alternateMobile.trim()) {
      const altCheck = validateMobile(alternateMobile, 'Alternate Mobile', false);
      if (!altCheck.isValid) {
        setFormError(altCheck.error || 'Invalid alternate mobile number.');
        return;
      }
    }

    // 4. Email validation (if entered, must match email format)
    if (email.trim()) {
      const emailCheck = validateEmail(email, false);
      if (!emailCheck.isValid) {
        setFormError(emailCheck.error || 'Invalid email format.');
        return;
      }
    }

    // 5. Address validation
    if (!address.trim()) {
      setFormError('Office / Residential address is required.');
      return;
    }

    if (!assignedAgentId) {
      setFormError('Please assign a staff agent to this client.');
      return;
    }

    if (initialClient) {
      updateClient(initialClient.id, {
        name: name.trim(),
        mobile: mobileCheck.cleaned,
        alternateMobile: alternateMobile.trim() ? cleanMobileNumber(alternateMobile) : undefined,
        email: email.trim().toLowerCase() || undefined,
        address: address.trim(),
        assignedAgentId,
        notes: notes.trim() || undefined,
      });
    } else {
      addClient({
        name: name.trim(),
        mobile: mobileCheck.cleaned,
        alternateMobile: alternateMobile.trim() ? cleanMobileNumber(alternateMobile) : undefined,
        email: email.trim().toLowerCase() || undefined,
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
        {formError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name / Company Name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (formError) setFormError('');
            }}
            placeholder="e.g. Mohammed Ali"
          />

          <div>
            <Input
              label="Primary Mobile Number"
              required
              type="tel"
              value={mobile}
              onChange={(e) => {
                setMobile(onlyDigits(e.target.value, 10));
                if (formError) setFormError('');
              }}
              placeholder="10-digit mobile (e.g. 9847123456)"
              className="font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">10 digits, numbers only</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="Alternate Mobile (Optional)"
              type="tel"
              value={alternateMobile}
              onChange={(e) => {
                setAlternateMobile(onlyDigits(e.target.value, 10));
                if (formError) setFormError('');
              }}
              placeholder="10-digit mobile"
              className="font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Numbers only</span>
          </div>

          <div>
            <Input
              label="Email Address (Optional)"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formError) setFormError('');
              }}
              placeholder="client@example.com"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Must be valid email format</span>
          </div>
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
