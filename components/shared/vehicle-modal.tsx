'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useApp } from '@/lib/store/app-context';
import { FuelType, Vehicle, VehicleType } from '@/lib/types';
import { normalizeRegistrationNumber } from '@/lib/utils';
import {
  performRcOcr,
  SAMPLE_RC_PRESETS,
  ExtractedRcData,
} from '@/lib/ocr/rc-scanner';
import {
  Camera,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Car,
  User,
  Shield,
  FileText,
  ArrowRight,
  RefreshCw,
  Zap,
} from 'lucide-react';

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
  const { clients, vehicles, users, currentUser, addVehicle, updateVehicle, addClient, updateClient } = useApp();

  const activeAgents = users.filter((u) => u.status === 'ACTIVE');

  // Active Tab: 'FORM' or 'SCAN'
  const [activeTab, setActiveTab] = useState<'FORM' | 'SCAN'>('FORM');

  // Client section state
  const [clientMode, setClientMode] = useState<'AUTO_LOOKUP' | 'SELECT_EXISTING'>('AUTO_LOOKUP');
  const [selectedExistingClientId, setSelectedExistingClientId] = useState(defaultClientId || '');
  const [clientMobile, setClientMobile] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [matchedExistingClient, setMatchedExistingClient] = useState<any>(null);

  // Vehicle form fields - ALL DEFAULT TO EMPTY TO PREVENT HALLUCINATIONS / FALSE DEFAULTS
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('PRIVATE_CAR');
  const [vehicleClass, setVehicleClass] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('PETROL');
  const [manufacturingYear, setManufacturingYear] = useState<number | ''>('');
  const [registrationDate, setRegistrationDate] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [rto, setRto] = useState('');
  const [registrationValidity, setRegistrationValidity] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scanner state
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedRcData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset or fill state on open
  useEffect(() => {
    setErrorMsg('');
    setSuccessNotice('');
    setExtractedData(null);
    setScanPreviewUrl(null);
    setIsScanning(false);
    setActiveTab('FORM');

    if (initialVehicle) {
      // Editing vehicle
      const existingClient = clients.find((c) => c.id === initialVehicle.clientId);
      if (existingClient) {
        setMatchedExistingClient(existingClient);
        setSelectedExistingClientId(existingClient.id);
        setClientMobile(existingClient.mobile);
        setClientName(existingClient.name);
        setClientAddress(existingClient.address);
        setClientEmail(existingClient.email || '');
      }

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
      setRto(initialVehicle.rto || '');
      setRegistrationValidity(initialVehicle.registrationValidity || '');
      setAssignedAgentId(initialVehicle.assignedAgentId);
      setNotes(initialVehicle.notes || '');
    } else {
      // Creating vehicle - clean slate with ZERO dummy defaults
      if (defaultClientId) {
        const client = clients.find((c) => c.id === defaultClientId);
        if (client) {
          setMatchedExistingClient(client);
          setSelectedExistingClientId(client.id);
          setClientMobile(client.mobile);
          setClientName(client.name);
          setClientAddress(client.address);
          setClientEmail(client.email || '');
        }
      } else {
        setMatchedExistingClient(null);
        setSelectedExistingClientId('');
        setClientMobile('');
        setClientName('');
        setClientAddress('');
        setClientEmail('');
      }

      setRegistrationNumber('');
      setVehicleType('PRIVATE_CAR');
      setVehicleClass('');
      setMake('');
      setModel('');
      setVariant('');
      setFuelType('PETROL');
      setManufacturingYear('');
      setRegistrationDate('');
      setChassisNumber('');
      setEngineNumber('');
      setRto('');
      setRegistrationValidity('');
      setAssignedAgentId(
        currentUser?.role === 'AGENT'
          ? currentUser.id
          : (activeAgents.find((u) => u.role === 'AGENT')?.id || currentUser?.id || '')
      );
      setNotes('');
    }
  }, [initialVehicle, defaultClientId, isOpen, clients, currentUser]);

  // Clean phone number for comparison
  const cleanPhone = (phone: string) => phone.replace(/[^0-9]/g, '').slice(-10);

  // Phone number lookup effect
  const handlePhoneChange = (val: string) => {
    setClientMobile(val);
    const cleaned = cleanPhone(val);

    if (cleaned.length >= 10) {
      const match = clients.find((c) => cleanPhone(c.mobile) === cleaned);
      if (match) {
        setMatchedExistingClient(match);
        setClientName(match.name);
        setClientAddress(match.address);
        if (match.email) setClientEmail(match.email);
      } else {
        setMatchedExistingClient(null);
      }
    } else {
      setMatchedExistingClient(null);
    }
  };

  // OCR execution handler
  const handleImageUpload = async (file: File) => {
    if (!file) return;

    try {
      setIsScanning(true);
      setScanProgress(10);
      setScanStatusText('Preparing RC document image...');
      setErrorMsg('');

      const previewUrl = URL.createObjectURL(file);
      setScanPreviewUrl(previewUrl);

      const result = await performRcOcr(file, (progress, status) => {
        setScanProgress(progress);
        setScanStatusText(status);
      });

      setExtractedData(result.data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to scan image. You can try a preset or enter details manually.');
    } finally {
      setIsScanning(false);
    }
  };

  // Apply a sample preset for demo/instant testing
  const handleSelectPreset = (presetData: ExtractedRcData) => {
    setExtractedData(presetData);
    setScanPreviewUrl(null);
  };

  // Populate form with strictly detected RC values
  const applyExtractedDataToForm = (data: ExtractedRcData) => {
    if (data.registrationNumber) setRegistrationNumber(data.registrationNumber);
    if (data.make) setMake(data.make);
    if (data.model) setModel(data.model);
    if (data.variant) setVariant(data.variant);
    if (data.vehicleType) setVehicleType(data.vehicleType);
    if (data.vehicleClass) setVehicleClass(data.vehicleClass);
    if (data.fuelType) setFuelType(data.fuelType);
    if (data.manufacturingYear) setManufacturingYear(data.manufacturingYear);
    if (data.registrationDate) setRegistrationDate(data.registrationDate);
    if (data.chassisNumber) setChassisNumber(data.chassisNumber);
    if (data.engineNumber) setEngineNumber(data.engineNumber);
    if (data.rto) setRto(data.rto);
    if (data.registrationValidity) setRegistrationValidity(data.registrationValidity);

    // If owner name was extracted from RC and client name is empty, fill it
    if (data.ownerName && !clientName) {
      setClientName(data.ownerName);
    }

    setSuccessNotice(`Verified RC details applied successfully! (${data.detectedFieldCount || 0} fields extracted)`);
    setActiveTab('FORM');
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const normReg = normalizeRegistrationNumber(registrationNumber);
    if (!normReg || normReg.length < 4) {
      setErrorMsg('Please enter a valid registration number (e.g. KL-10-AB-1234).');
      return;
    }

    if (!make.trim()) {
      setErrorMsg('Please enter vehicle make / manufacturer.');
      return;
    }

    if (!model.trim()) {
      setErrorMsg('Please enter vehicle model.');
      return;
    }

    if (!rto.trim()) {
      setErrorMsg('Please enter RTO office location (e.g. KL-10 Perinthalmanna).');
      return;
    }

    // Duplicate check
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

    setIsSubmitting(true);

    try {
      let finalClientId = selectedExistingClientId;

      // Handle Client Association
      if (clientMode === 'SELECT_EXISTING' && selectedExistingClientId) {
        finalClientId = selectedExistingClientId;
      } else {
        // Auto-lookup / Inline client mode
        if (!clientMobile.trim() || clientMobile.trim().length < 6) {
          setErrorMsg('Please provide a valid client mobile number.');
          setIsSubmitting(false);
          return;
        }

        if (!clientName.trim()) {
          setErrorMsg('Please enter the client / vehicle owner name.');
          setIsSubmitting(false);
          return;
        }

        if (matchedExistingClient) {
          finalClientId = matchedExistingClient.id;
          if (clientAddress && clientAddress !== matchedExistingClient.address) {
            await updateClient(matchedExistingClient.id, {
              address: clientAddress.trim(),
            });
          }
        } else {
          // Check if client with this phone number already exists
          const cleaned = cleanPhone(clientMobile);
          const found = clients.find((c) => cleanPhone(c.mobile) === cleaned);

          if (found) {
            finalClientId = found.id;
          } else {
            // Automatically register brand-new client in database!
            const newClientId = await addClient({
              name: clientName.trim(),
              mobile: clientMobile.trim(),
              address: clientAddress.trim() || 'Address not specified',
              email: clientEmail.trim() || undefined,
              assignedAgentId: assignedAgentId || currentUser?.id || 'agent',
              status: 'ACTIVE',
              notes: `Auto-created during registration of vehicle ${registrationNumber.toUpperCase()}`,
            });
            finalClientId = newClientId;
          }
        }
      }

      if (!finalClientId) {
        setErrorMsg('Client identification failed. Please select or enter client information.');
        setIsSubmitting(false);
        return;
      }

      const vehiclePayload = {
        clientId: finalClientId,
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
        await updateVehicle(initialVehicle.id, vehiclePayload);
      } else {
        await addVehicle(vehiclePayload);
      }

      onClose();
    } catch (err: any) {
      console.error('Error registering vehicle:', err);
      setErrorMsg(err?.message || 'Failed to save vehicle. Please verify input fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialVehicle ? 'Edit Vehicle Details' : 'Register Vehicle & Client'}
      description="Record vehicle specifications, technical identifiers, and owner linkage with Smart RC Scanner."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs (Manual Form vs Scan RC) */}
        {!initialVehicle && (
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('FORM')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'FORM'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Vehicle Form</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SCAN')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all relative ${
                activeTab === 'SCAN'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Smart RC Scanner</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] bg-amber-400/20 text-amber-200 rounded-full font-extrabold uppercase">
                AI / OCR
              </span>
            </button>
          </div>
        )}

        {/* Global Notices */}
        {errorMsg && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div>{errorMsg}</div>
          </div>
        )}

        {successNotice && (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 font-semibold">{successNotice}</div>
          </div>
        )}

        {/* TAB 1: SMART RC SCANNER */}
        {activeTab === 'SCAN' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/80">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Instant RC Auto-Extraction</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Upload or capture a photo of the vehicle RC smart card. Verified details will be extracted with strict accuracy without false guesses.
              </p>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />

            {/* Drop / Capture Zone */}
            <div
              onClick={() => !isScanning && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer overflow-hidden ${
                isScanning
                  ? 'border-blue-400 bg-blue-50/40'
                  : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/80'
              }`}
            >
              {/* Laser Beam Animation during OCR */}
              {isScanning && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_#3b82f6] animate-scan-beam pointer-events-none z-20" />
              )}

              {scanPreviewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative max-h-48 max-w-xs overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={scanPreviewUrl}
                      alt="Uploaded RC"
                      className="object-contain max-h-48 w-full"
                    />
                  </div>
                  {!isScanning && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Choose Different Photo
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center shadow-inner">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    Click to Upload RC Image or Snap Photo
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Supports PNG, JPG, WEBP photos of Indian RC smart cards, paper books, or mParivahan digital cards
                  </p>
                </div>
              )}

              {/* Scan Progress Bar */}
              {isScanning && (
                <div className="mt-4 max-w-xs mx-auto space-y-2">
                  <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-blue-700">{scanStatusText}</p>
                </div>
              )}
            </div>

            {/* VERIFIED EXTRACTED FIELDS PREVIEW (When OCR finishes or preset selected) */}
            {extractedData && !isScanning && (
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200/70">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Verified Document Fields ({extractedData.detectedFieldCount || 0} Found)</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Accuracy: {extractedData.confidenceScore || 90}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {extractedData.registrationNumber && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Reg Number</span>
                      <strong className="text-slate-900">{extractedData.registrationNumber}</strong>
                    </div>
                  )}
                  {extractedData.ownerName && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Owner Name</span>
                      <strong className="text-slate-900 truncate block">{extractedData.ownerName}</strong>
                    </div>
                  )}
                  {extractedData.make && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Make</span>
                      <strong className="text-slate-900">{extractedData.make}</strong>
                    </div>
                  )}
                  {extractedData.model && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Model</span>
                      <strong className="text-slate-900">{extractedData.model}</strong>
                    </div>
                  )}
                  {extractedData.fuelType && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Fuel Type</span>
                      <strong className="text-slate-900">{extractedData.fuelType}</strong>
                    </div>
                  )}
                  {extractedData.manufacturingYear && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Mfg Year</span>
                      <strong className="text-slate-900">{extractedData.manufacturingYear}</strong>
                    </div>
                  )}
                  {extractedData.chassisNumber && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Chassis (VIN)</span>
                      <strong className="text-slate-900 truncate block font-mono text-[11px]">{extractedData.chassisNumber}</strong>
                    </div>
                  )}
                  {extractedData.engineNumber && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Engine No</span>
                      <strong className="text-slate-900 truncate block font-mono text-[11px]">{extractedData.engineNumber}</strong>
                    </div>
                  )}
                  {extractedData.rto && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">RTO Location</span>
                      <strong className="text-slate-900 truncate block">{extractedData.rto}</strong>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 pt-1">
                  * Note: Only detected fields above will be applied. Missing fields remain empty for you to fill if required.
                </p>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => applyExtractedDataToForm(extractedData)}
                    className="gap-2 shadow-sm"
                  >
                    <span>Apply Verified Details to Form</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Demo Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Or Try Sample RC Card Presets (Instant Demo)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SAMPLE_RC_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset.data)}
                    className="p-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 truncate">
                      {preset.data.registrationNumber}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {preset.data.make} {preset.data.model}
                    </div>
                    <div className="text-[10px] text-blue-600 font-medium mt-1">
                      {preset.data.ownerName}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setActiveTab('FORM')}>
                Skip to Manual Form
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: UNIFIED VEHICLE & CLIENT FORM */}
        {activeTab === 'FORM' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. CLIENT / OWNER CARD */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Vehicle Owner / Client Information
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Enter owner mobile number — automatically checks & links existing clients
                    </p>
                  </div>
                </div>

                {!initialVehicle && (
                  <button
                    type="button"
                    onClick={() =>
                      setClientMode(clientMode === 'AUTO_LOOKUP' ? 'SELECT_EXISTING' : 'AUTO_LOOKUP')
                    }
                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    {clientMode === 'AUTO_LOOKUP' ? 'Choose from Client List' : 'Direct Phone Input'}
                  </button>
                )}
              </div>

              {clientMode === 'SELECT_EXISTING' ? (
                <div>
                  <Select
                    label="Select Existing Client"
                    required
                    value={selectedExistingClientId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedExistingClientId(id);
                      const c = clients.find((item) => item.id === id);
                      if (c) {
                        setMatchedExistingClient(c);
                        setClientMobile(c.mobile);
                        setClientName(c.name);
                        setClientAddress(c.address);
                        if (c.email) setClientEmail(c.email);
                      }
                    }}
                  >
                    <option value="">— Select a registered client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} • {c.mobile}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Input
                        label="Client Mobile Number (Unique Key)"
                        required
                        placeholder="e.g. 9846012345"
                        value={clientMobile}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        helperText={
                          matchedExistingClient
                            ? 'Matched registered client! Auto-filling profile.'
                            : 'Type phone number to auto-search or register new client'
                        }
                      />
                    </div>

                    <div>
                      <Input
                        label="Full Name / Owner Name"
                        required
                        placeholder="e.g. Mohammed Shafeek"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Match status badge */}
                  {matchedExistingClient ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="flex-1">
                        <strong>Existing Client Found:</strong> {matchedExistingClient.name} ({matchedExistingClient.mobile})
                        <span className="block text-[11px] text-emerald-700">
                          This vehicle will be directly attached to this client record.
                        </span>
                      </div>
                    </div>
                  ) : clientMobile.length >= 10 ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-800 text-xs">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <strong>New Client Detected:</strong> A new client profile for &quot;{clientName || 'Owner'}&quot; will be created seamlessly.
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Client Address / Location"
                      placeholder="e.g. Perinthalmanna, Malappuram"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                    />
                    <Input
                      label="Email Address (Optional)"
                      type="email"
                      placeholder="client@example.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. VEHICLE SPECIFICATION CARD */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Vehicle Specifications
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Registration number, brand, model, and category
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Registration Number"
                  required
                  placeholder="e.g. KL-10-AB-1234"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  helperText="Auto-formatted & normalized for duplicate check"
                />

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
                  label="Variant / Trim (Optional)"
                  placeholder="e.g. 2.4 VX, ZXI+"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  label="Fuel Type"
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as FuelType)}
                >
                  <option value="PETROL">Petrol</option>
                  <option value="DIESEL">Diesel</option>
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
                  placeholder="e.g. 2022"
                />

                <Input
                  label="RTO Office Location"
                  required
                  placeholder="e.g. KL-10 Perinthalmanna"
                  value={rto}
                  onChange={(e) => setRto(e.target.value)}
                />
              </div>
            </div>

            {/* 3. TECHNICAL & REGISTRATION IDENTIFIERS */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Technical Identifiers & RTO Validity
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Chassis VIN, Engine number, registration validity
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Registration Date"
                  type="date"
                  value={registrationDate}
                  onChange={(e) => setRegistrationDate(e.target.value)}
                />

                <Input
                  label="RC Fitness / Registration Validity"
                  type="date"
                  value={registrationValidity}
                  onChange={(e) => setRegistrationValidity(e.target.value)}
                />
              </div>
            </div>

            {/* 4. AGENT ASSIGNMENT & NOTES */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  label="Notes / Special Remarks"
                  placeholder="e.g. Speed governor fitted, GPS installed"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting} className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {initialVehicle ? 'Update Vehicle' : 'Register Vehicle & Link Owner'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
