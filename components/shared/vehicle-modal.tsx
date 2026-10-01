'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useApp } from '@/lib/store/app-context';
import { FuelType, Vehicle, VehicleType } from '@/lib/types';
import { normalizeRegistrationNumber } from '@/lib/utils';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  initialVehicle?: Vehicle | null;
}

export function VehicleModal({
  isOpen,
  onClose,
  clientId: defaultClientId,
  initialVehicle,
}: VehicleModalProps) {
  const { clients, vehicles, users, currentUser, addVehicle, updateVehicle } = useApp();

  const [clientId, setClientId] = useState(defaultClientId || '');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('PRIVATE_CAR');
  const [vehicleClass, setVehicleClass] = useState('Motor Car (LMV)');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('PETROL');
  const [manufacturingYear, setManufacturingYear] = useState<number | ''>(2022);
  const [registrationDate, setRegistrationDate] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [rto, setRto] = useState('KL-10 Perinthalmanna');
  const [registrationValidity, setRegistrationValidity] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const activeAgents = users.filter((u) => u.status === 'ACTIVE');

  useEffect(() => {
    setErrorMsg('');
    if (initialVehicle) {
      setClientId(initialVehicle.clientId);
      setRegistrationNumber(initialVehicle.registrationNumber);
      setVehicleType(initialVehicle.vehicleType);
      setVehicleClass(initialVehicle.vehicleClass || '');
      setMake(initialVehicle.make);
      setModel(initialVehicle.model);
      setVariant(initialVehicle.variant || '');
      setFuelType(initialVehicle.fuelType);
      setManufacturingYear(initialVehicle.manufacturingYear ?? '');
      setRegistrationDate(initialVehicle.registrationDate || '');
      setChassisNumber(initialVehicle.chassisNumber || '');
      setEngineNumber(initialVehicle.engineNumber || '');
      setRto(initialVehicle.rto);
      setRegistrationValidity(initialVehicle.registrationValidity || '');
      setAssignedAgentId(initialVehicle.assignedAgentId);
      setNotes(initialVehicle.notes || '');
    } else {
      setClientId(defaultClientId || (clients[0]?.id ?? ''));
      setRegistrationNumber('');
      setVehicleType('PRIVATE_CAR');
      setVehicleClass('Motor Car (LMV)');
      setMake('');
      setModel('');
      setVariant('');
      setFuelType('DIESEL');
      setManufacturingYear(2022);
      setRegistrationDate('');
      setChassisNumber('');
      setEngineNumber('');
      setRto('KL-10 Perinthalmanna');
      setRegistrationValidity('');
      setAssignedAgentId(
        currentUser?.role === 'AGENT'
          ? currentUser.id
          : (activeAgents.find((u) => u.role === 'AGENT')?.id || currentUser?.id || '')
      );
      setNotes('');
    }
  }, [initialVehicle, defaultClientId, isOpen, clients, currentUser, users]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const normReg = normalizeRegistrationNumber(registrationNumber);
    if (!normReg || normReg.length < 4) {
      setErrorMsg('Please enter a valid registration number (e.g. KL-10-AB-1234).');
      return;
    }

    // Duplicate check (Section 66)
    const duplicate = vehicles.find(
      (v) =>
        v.normalizedRegistrationNumber === normReg &&
        v.status === 'ACTIVE' &&
        (!initialVehicle || v.id !== initialVehicle.id)
    );

    if (duplicate) {
      setErrorMsg(`Vehicle with registration number ${registrationNumber} is already registered in the system!`);
      return;
    }

    const payload = {
      clientId,
      registrationNumber: registrationNumber.toUpperCase().trim(),
      vehicleType,
      vehicleClass: vehicleClass || undefined,
      make: make.trim(),
      model: model.trim(),
      variant: variant.trim() || undefined,
      fuelType,
      manufacturingYear: manufacturingYear ? Number(manufacturingYear) : undefined,
      registrationDate: registrationDate || undefined,
      chassisNumber: chassisNumber.trim() || undefined,
      engineNumber: engineNumber.trim() || undefined,
      rto: rto.trim(),
      registrationValidity: registrationValidity || undefined,
      assignedAgentId,
      status: 'ACTIVE' as const,
      notes: notes.trim() || undefined,
    };

    if (initialVehicle) {
      updateVehicle(initialVehicle.id, payload);
    } else {
      addVehicle(payload);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialVehicle ? 'Edit Vehicle Record' : 'Register Vehicle to Client'}
      description="Record vehicle details, technical identifiers, and assign agent."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Owner / Client"
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.mobile})
              </option>
            ))}
          </Select>

          <Input
            label="Registration Number"
            required
            placeholder="e.g. KL-10-AB-1234"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            helperText="Auto-normalized for search and duplicate prevention"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Make (Brand)"
            required
            placeholder="e.g. Toyota, Maruti, Tata"
            value={make}
            onChange={(e) => setMake(e.target.value)}
          />

          <Input
            label="Model"
            required
            placeholder="e.g. Innova, Swift, Nexon"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />

          <Input
            label="Variant / Trim"
            placeholder="e.g. 2.4 VX, ZXI+"
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Vehicle Category"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value as VehicleType)}
          >
            <option value="PRIVATE_CAR">Private Car (LMV)</option>
            <option value="COMMERCIAL_TAXI">Commercial Taxi / Cab</option>
            <option value="GOODS_CARRIER">Goods Carrier (LGV/HGV)</option>
            <option value="BUS">Bus / Passenger Transport</option>
            <option value="TWO_WHEELER">Two Wheeler / Motorcycle</option>
            <option value="AUTO_RICKSHAW">Auto Rickshaw</option>
            <option value="TRACTOR">Tractor / Agricultural</option>
            <option value="OTHER">Other Special Type</option>
          </Select>

          <Select
            label="Fuel Type"
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value as FuelType)}
          >
            <option value="DIESEL">Diesel</option>
            <option value="PETROL">Petrol</option>
            <option value="CNG">CNG</option>
            <option value="ELECTRIC">Electric (EV)</option>
            <option value="HYBRID">Hybrid</option>
            <option value="OTHER">Other</option>
          </Select>

          <Input
            label="Manufacturing Year"
            type="number"
            value={manufacturingYear}
            onChange={(e) => setManufacturingYear(e.target.value ? Number(e.target.value) : '')}
            placeholder="2022"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="RTO Office Location"
            required
            placeholder="e.g. KL-10 Perinthalmanna"
            value={rto}
            onChange={(e) => setRto(e.target.value)}
          />

          <Input
            label="Chassis Number (VIN)"
            placeholder="e.g. MBJ11BB400123..."
            value={chassisNumber}
            onChange={(e) => setChassisNumber(e.target.value)}
          />

          <Input
            label="Engine Number"
            placeholder="e.g. 2GDF987654..."
            value={engineNumber}
            onChange={(e) => setEngineNumber(e.target.value)}
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
            label="Notes / Special Instructions"
            placeholder="e.g. Speed governor fitted, GPS installed"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {initialVehicle ? 'Update Vehicle' : 'Register Vehicle'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
