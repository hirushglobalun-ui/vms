'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useApp } from '@/lib/store/app-context';
import { FuelType, Vehicle, VehicleType } from '@/lib/types';
import { normalizeRegistrationNumber, calculatePaymentBalance, formatCurrency } from '@/lib/utils';
import {
  performRcOcr,
  ExtractedRcData,
} from '@/lib/ocr/rc-scanner';
import {
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
  FileCheck,
  Flame,
  Wallet,
  UserCheck,
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
  const {
    clients,
    vehicles,
    documents,
    users,
    currentUser,
    addVehicle,
    updateVehicle,
    addClient,
    updateClient,
    addDocument,
    updateDocument,
  } = useApp();

  const activeAgents = users.filter((u) => u.status === 'ACTIVE');

  // Active Tab: 'FORM' or 'SCAN'
  const [activeTab, setActiveTab] = useState<'FORM' | 'SCAN'>('FORM');

  // Client section state (Essential Only: Mobile, Name, Email)
  const [clientMode, setClientMode] = useState<'AUTO_LOOKUP' | 'SELECT_EXISTING'>('AUTO_LOOKUP');
  const [selectedExistingClientId, setSelectedExistingClientId] = useState(defaultClientId || '');
  const [clientMobile, setClientMobile] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [matchedExistingClient, setMatchedExistingClient] = useState<any>(null);

  // Point of Contact (POC) / Field Person
  const [pocName, setPocName] = useState('');
  const [pocMobile, setPocMobile] = useState('');
  const [pocDesignation, setPocDesignation] = useState('Driver');
  const [hasSeparatePoc, setHasSeparatePoc] = useState(false);

  // Financial Ledger & Advance Payment
  const [totalCost, setTotalCost] = useState('');
  const [amountReceived, setAmountReceived] = useState('');

  // Vehicle essentials
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('PRIVATE_CAR');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('PETROL');
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [rto, setRto] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [notes, setNotes] = useState('');

  // Core 3 Compliances (Essential for Consultancy Operations)
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');

  const [fitnessExpiryDate, setFitnessExpiryDate] = useState('');
  const [fitnessNumber, setFitnessNumber] = useState('');

  const [pucExpiryDate, setPucExpiryDate] = useState('');
  const [pucNumber, setPucNumber] = useState('');

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
        setClientEmail(existingClient.email || '');
      }

      setRegistrationNumber(initialVehicle.registrationNumber);
      setVehicleType(initialVehicle.vehicleType);
      setMake(initialVehicle.make);
      setModel(initialVehicle.model);
      setFuelType(initialVehicle.fuelType);
      setChassisNumber(initialVehicle.chassisNumber || '');
      setEngineNumber(initialVehicle.engineNumber || '');
      setRto(initialVehicle.rto || '');
      setAssignedAgentId(initialVehicle.assignedAgentId);
      setNotes(initialVehicle.notes || '');

      // Load POC details
      setPocName(initialVehicle.pocName || '');
      setPocMobile(initialVehicle.pocMobile || '');
      setPocDesignation(initialVehicle.pocDesignation || 'Driver');
      setHasSeparatePoc(Boolean(initialVehicle.pocName || initialVehicle.pocMobile));

      // Load Financial status
      setTotalCost(initialVehicle.totalCost ? String(initialVehicle.totalCost) : '');
      setAmountReceived(initialVehicle.amountReceived ? String(initialVehicle.amountReceived) : '');

      // Load existing active documents
      const activeDocs = documents.filter((d) => d.vehicleId === initialVehicle.id && !d.isHistorical);
      const insDoc = activeDocs.find((d) => d.documentType === 'INSURANCE');
      if (insDoc) {
        setInsuranceExpiryDate(insDoc.expiryDate || '');
        setInsurancePolicyNumber(insDoc.documentNumber || '');
        setInsuranceProvider(insDoc.insuranceProvider || '');
      }

      const fitDoc = activeDocs.find((d) => d.documentType === 'FITNESS');
      if (fitDoc) {
        setFitnessExpiryDate(fitDoc.expiryDate || '');
        setFitnessNumber(fitDoc.documentNumber || '');
      }

      const pucDoc = activeDocs.find((d) => d.documentType === 'PUC');
      if (pucDoc) {
        setPucExpiryDate(pucDoc.expiryDate || '');
        setPucNumber(pucDoc.documentNumber || '');
      }
    } else {
      // Clean slate for new vehicle
      if (defaultClientId) {
        const client = clients.find((c) => c.id === defaultClientId);
        if (client) {
          setMatchedExistingClient(client);
          setSelectedExistingClientId(client.id);
          setClientMobile(client.mobile);
          setClientName(client.name);
          setClientEmail(client.email || '');
        }
      } else {
        setMatchedExistingClient(null);
        setSelectedExistingClientId('');
        setClientMobile('');
        setClientName('');
        setClientEmail('');
      }

      setRegistrationNumber('');
      setVehicleType('PRIVATE_CAR');
      setMake('');
      setModel('');
      setFuelType('PETROL');
      setChassisNumber('');
      setEngineNumber('');
      setRto('');
      setAssignedAgentId(
        currentUser?.role === 'AGENT'
          ? currentUser.id
          : (activeAgents.find((u) => u.role === 'AGENT')?.id || currentUser?.id || '')
      );
      setNotes('');

      // Reset POC & Financial fields
      setPocName('');
      setPocMobile('');
      setPocDesignation('Driver');
      setHasSeparatePoc(false);
      setTotalCost('');
      setAmountReceived('');

      setInsuranceExpiryDate('');
      setInsurancePolicyNumber('');
      setInsuranceProvider('');
      setFitnessExpiryDate('');
      setFitnessNumber('');
      setPucExpiryDate('');
      setPucNumber('');
    }
  }, [initialVehicle, defaultClientId, isOpen, clients, documents, currentUser]);

  const cleanPhone = (phone: string) => phone.replace(/[^0-9]/g, '').slice(-10);

  const handlePhoneChange = (val: string) => {
    setClientMobile(val);
    const cleaned = cleanPhone(val);

    if (cleaned.length >= 10) {
      const match = clients.find((c) => cleanPhone(c.mobile) === cleaned);
      if (match) {
        setMatchedExistingClient(match);
        setClientName(match.name);
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
      setErrorMsg(err?.message || 'Failed to parse RC. Please check image clarity.');
    } finally {
      setIsScanning(false);
    }
  };



  const applyExtractedDataToForm = (data: ExtractedRcData) => {
    if (!data) return;

    if (data.registrationNumber) setRegistrationNumber(data.registrationNumber);
    if (data.make) setMake(data.make);
    if (data.model) setModel(data.model);
    if (data.vehicleType) setVehicleType(data.vehicleType);
    if (data.fuelType) setFuelType(data.fuelType);
    if (data.chassisNumber) setChassisNumber(data.chassisNumber);
    if (data.engineNumber) setEngineNumber(data.engineNumber);
    if (data.rto) setRto(data.rto);
    if (data.registrationValidity) setFitnessExpiryDate(data.registrationValidity);
    if (data.insuranceValidity) setInsuranceExpiryDate(data.insuranceValidity);
    if (data.pollutionValidity) setPucExpiryDate(data.pollutionValidity);
    if (data.ownerName) setClientName(data.ownerName);

    setSuccessNotice(`Verified RC details applied successfully!`);
    setActiveTab('FORM');
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const normReg = normalizeRegistrationNumber(registrationNumber);
    if (!normReg || normReg.length < 4) {
      setErrorMsg('Please enter a valid registration number (e.g. KL-24-J-8996).');
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
      setErrorMsg('Please enter RTO office location (e.g. Perinthalmanna SRTO).');
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
      const dupClient = clients.find((c) => c.id === duplicate.clientId);
      const clientStr = dupClient ? ` for client "${dupClient.name}" (${dupClient.mobile})` : '';
      setErrorMsg(`Vehicle with registration number ${registrationNumber.toUpperCase()} is already registered in the system${clientStr}! You cannot add duplicate active vehicles.`);
      return;
    }

    setIsSubmitting(true);

    try {
      let finalClientId = selectedExistingClientId;

      // Handle Client Association
      if (clientMode === 'SELECT_EXISTING' && selectedExistingClientId) {
        finalClientId = selectedExistingClientId;
      } else {
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
          if (clientEmail && clientEmail !== matchedExistingClient.email) {
            await updateClient(matchedExistingClient.id, { email: clientEmail.trim() });
          }
        } else {
          const cleaned = cleanPhone(clientMobile);
          const found = clients.find((c) => cleanPhone(c.mobile) === cleaned);

          if (found) {
            finalClientId = found.id;
          } else {
            const newClientId = await addClient({
              name: clientName.trim(),
              mobile: clientMobile.trim(),
              address: 'Address not specified',
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

      const balanceSummary = calculatePaymentBalance(
        totalCost ? Number(totalCost) : 0,
        amountReceived ? Number(amountReceived) : 0
      );

      const vehiclePayload = {
        clientId: finalClientId,
        registrationNumber: registrationNumber.toUpperCase().trim(),
        vehicleType,
        make: make.trim(),
        model: model.trim(),
        fuelType,
        chassisNumber: chassisNumber.trim() || undefined,
        engineNumber: engineNumber.trim() || undefined,
        rto: rto.trim(),
        registrationValidity: fitnessExpiryDate || undefined,
        assignedAgentId: assignedAgentId || currentUser?.id || 'agent',
        status: 'ACTIVE' as const,
        notes: notes.trim() || undefined,
        // Point of Contact (POC) details
        pocName: hasSeparatePoc && pocName.trim() ? pocName.trim() : undefined,
        pocMobile: hasSeparatePoc && pocMobile.trim() ? pocMobile.trim() : undefined,
        pocDesignation: hasSeparatePoc && pocName.trim() ? pocDesignation : undefined,
        // Financial Ledger & Billing Status
        totalCost: totalCost ? Number(totalCost) : undefined,
        amountReceived: amountReceived ? Number(amountReceived) : undefined,
        balanceAmount: (totalCost || amountReceived) ? balanceSummary.balanceAmount : undefined,
        paymentStatus: (totalCost || amountReceived) ? balanceSummary.paymentStatus : undefined,
      };

      let vehicleId = initialVehicle?.id;
      if (initialVehicle) {
        await updateVehicle(initialVehicle.id, vehiclePayload);
      } else {
        vehicleId = await addVehicle(vehiclePayload);
      }

      // Automatically Create / Sync the Core 3 Compliance Documents
      if (vehicleId) {
        const activeDocs = documents.filter((d) => d.vehicleId === vehicleId && !d.isHistorical);

        // 1. Insurance Document
        if (insuranceExpiryDate) {
          const existingIns = activeDocs.find((d) => d.documentType === 'INSURANCE');
          if (existingIns) {
            await updateDocument(existingIns.id, {
              expiryDate: insuranceExpiryDate,
              documentNumber: insurancePolicyNumber || existingIns.documentNumber,
              insuranceProvider: insuranceProvider || existingIns.insuranceProvider,
            });
          } else {
            await addDocument({
              vehicleId,
              clientId: finalClientId,
              documentType: 'INSURANCE',
              expiryDate: insuranceExpiryDate,
              documentNumber: insurancePolicyNumber || undefined,
              insuranceProvider: insuranceProvider || undefined,
              reminderDays: 30,
              notes: 'Recorded during vehicle registration',
            });
          }
        }

        // 2. Fitness Document
        if (fitnessExpiryDate) {
          const existingFit = activeDocs.find((d) => d.documentType === 'FITNESS');
          if (existingFit) {
            await updateDocument(existingFit.id, {
              expiryDate: fitnessExpiryDate,
              documentNumber: fitnessNumber || existingFit.documentNumber,
            });
          } else {
            await addDocument({
              vehicleId,
              clientId: finalClientId,
              documentType: 'FITNESS',
              expiryDate: fitnessExpiryDate,
              documentNumber: fitnessNumber || undefined,
              reminderDays: 30,
              notes: 'Fitness certificate recorded during registration',
            });
          }
        }

        // 3. Pollution Certificate (PUC / Poka)
        if (pucExpiryDate) {
          const existingPuc = activeDocs.find((d) => d.documentType === 'PUC');
          if (existingPuc) {
            await updateDocument(existingPuc.id, {
              expiryDate: pucExpiryDate,
              documentNumber: pucNumber || existingPuc.documentNumber,
            });
          } else {
            await addDocument({
              vehicleId,
              clientId: finalClientId,
              documentType: 'PUC',
              expiryDate: pucExpiryDate,
              documentNumber: pucNumber || undefined,
              reminderDays: 15,
              notes: 'Emission compliance (PUC) recorded during registration',
            });
          }
        }
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
      title={initialVehicle ? 'Edit Vehicle Details' : 'Add Vehicle'}
      description="Permanent RC vehicle details, owner contact, and periodic compliances (Insurance, PUC) management."
      maxWidth="5xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
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
              <span>Add Vehicle Form</span>
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

            <div
              onClick={() => !isScanning && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer overflow-hidden ${
                isScanning
                  ? 'border-blue-400 bg-blue-50/40'
                  : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/80'
              }`}
            >
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
                  <div className="text-xs font-bold text-slate-800">
                    {isScanning ? scanStatusText : 'Click to Upload RC Photo or Smart Card'}
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Extracts registration number, make, model, chassis, and validity
                  </p>
                </div>
              )}

              {isScanning && (
                <div className="mt-4 max-w-xs mx-auto">
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-blue-700 font-bold mt-1 text-center">
                    {scanStatusText} ({scanProgress}%)
                  </div>
                </div>
              )}
            </div>

            {/* Verified Checklist Preview */}
            {extractedData && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/90 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Verified RC Fields Detected</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {extractedData.registrationNumber && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Registration</span>
                      <strong className="text-slate-900 font-mono">{extractedData.registrationNumber}</strong>
                    </div>
                  )}
                  {extractedData.make && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Make &amp; Model</span>
                      <strong className="text-slate-900">{extractedData.make} {extractedData.model}</strong>
                    </div>
                  )}
                  {extractedData.chassisNumber && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100 sm:col-span-2">
                      <span className="text-[10px] text-slate-500 block">Chassis (VIN)</span>
                      <strong className="text-slate-900 font-mono text-[11px] truncate block">{extractedData.chassisNumber}</strong>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => applyExtractedDataToForm(extractedData)}
                    className="gap-2 shadow-sm"
                  >
                    <span>Apply to Form</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}



            <div className="flex justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setActiveTab('FORM')}>
                Skip to Manual Form
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: CLEAN STREAMLINED FORM */}
        {activeTab === 'FORM' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* ======================================================== */}
              {/* LEFT COLUMN (7 Cols): PERMANENT VEHICLE & OWNER SPECS    */}
              {/* ======================================================== */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. VEHICLE ESSENTIALS & VAHAN AUTO-FETCH */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Permanent Vehicle Details
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Vehicle specifications and permanent RC details
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Registration Number Input */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block pb-1">
                      Registration Number <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. KL-53-W-8978"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                      className="font-mono uppercase font-semibold text-sm tracking-wide"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Tip: You can upload/scan the RC card in the <span className="text-blue-600 font-medium">Smart RC Scanner</span> tab above to auto-fill details automatically.
                    </p>
                  </div>

                  {/* Core Vehicle Specifications Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label="Vehicle Category"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    >
                      <option value="TWO_WHEELER">Two Wheeler (Scooter / Bike)</option>
                      <option value="PRIVATE_CAR">Private Car (LMV)</option>
                      <option value="COMMERCIAL_TAXI">Commercial Taxi (Cab)</option>
                      <option value="GOODS_CARRIER">Goods Carrier (LGV / Truck)</option>
                      <option value="BUS">Bus / Transport</option>
                      <option value="AUTO_RICKSHAW">Auto Rickshaw</option>
                      <option value="OTHER">Other Vehicle</option>
                    </Select>

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
                    </Select>

                    <Input
                      label="Make (Brand)"
                      required
                      placeholder="e.g. SUZUKI"
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                    />

                    <Input
                      label="Model"
                      required
                      placeholder="e.g. AVENIS 125"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />

                    <Input
                      label="RTO Office"
                      required
                      placeholder="e.g. KL-53 Perinthalmanna SRTO"
                      value={rto}
                      onChange={(e) => setRto(e.target.value)}
                      className="sm:col-span-2"
                    />

                    <Input
                      label="Chassis Number (VIN)"
                      placeholder="e.g. MB8DK11AYP8978120"
                      value={chassisNumber}
                      onChange={(e) => setChassisNumber(e.target.value)}
                      className="font-mono text-xs uppercase"
                    />

                    <Input
                      label="Engine Number"
                      placeholder="e.g. AF32E8978120"
                      value={engineNumber}
                      onChange={(e) => setEngineNumber(e.target.value)}
                      className="font-mono text-xs uppercase"
                    />
                  </div>

                  {/* RC Expiry / Fitness Validity (Permanent 15-Year Rule for Private) */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                        <div className="flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <span>Fitness / RC Expiry Date</span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          Permanent RC Validity (15 Years)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <Input
                          label="Fitness Expiry Date"
                          type="date"
                          value={fitnessExpiryDate}
                          onChange={(e) => setFitnessExpiryDate(e.target.value)}
                        />
                        <Input
                          label="Fitness / RC Certificate No."
                          placeholder="e.g. FC-KL53-2025-8978"
                          value={fitnessNumber}
                          onChange={(e) => setFitnessNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. CLIENT / OWNER PROFILE & POC */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Client / Owner Profile
                      </h3>
                    </div>

                    {!initialVehicle && (
                      <button
                        type="button"
                        onClick={() =>
                          setClientMode(clientMode === 'AUTO_LOOKUP' ? 'SELECT_EXISTING' : 'AUTO_LOOKUP')
                        }
                        className="text-[11px] text-blue-600 hover:underline font-semibold"
                      >
                        {clientMode === 'AUTO_LOOKUP' ? 'Select Existing Client' : 'Direct Phone Input'}
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input
                          label="Client Mobile Number"
                          required
                          placeholder="e.g. 9846012345"
                          value={clientMobile}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                        />

                        <Input
                          label="Full Name / Owner Name"
                          required
                          placeholder="e.g. Sayed Shahloob"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                        />

                        <Input
                          label="Email Address (Alerts)"
                          type="email"
                          placeholder="client@gmail.com"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                        />
                      </div>

                      {matchedExistingClient && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Existing Client: <strong>{matchedExistingClient.name}</strong> ({matchedExistingClient.mobile})</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Point of Contact (Driver / Manager) Accordion */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between pb-1">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hasSeparatePoc}
                          onChange={(e) => setHasSeparatePoc(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                          Has Separate Driver / Field Contact (POC)
                        </span>
                      </label>
                    </div>

                    {hasSeparatePoc && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 animate-in fade-in">
                        <Input
                          label="Driver / POC Name"
                          placeholder="e.g. Sujith"
                          value={pocName}
                          onChange={(e) => setPocName(e.target.value)}
                        />
                        <Input
                          label="POC Mobile"
                          placeholder="e.g. 9847144556"
                          value={pocMobile}
                          onChange={(e) => setPocMobile(e.target.value)}
                        />
                        <Select
                          label="Role"
                          value={pocDesignation}
                          onChange={(e) => setPocDesignation(e.target.value)}
                        >
                          <option value="Driver">Driver</option>
                          <option value="Fleet Manager">Fleet Manager</option>
                          <option value="Son / Relative">Son / Relative</option>
                          <option value="Accountant">Accountant / Office</option>
                          <option value="Other">Other Representative</option>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* RIGHT COLUMN (5 Cols): PERIODIC COMPLIANCES, FEES, AGENT */}
              {/* ======================================================== */}
              <div className="lg:col-span-5 space-y-4">
                {/* 3. PERIODIC COMPLIANCES (MANUAL ENTRY / RENEWALS) */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/20 border border-indigo-200/80 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Periodic Compliances (Manual Entry)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Enter from client copy. Editable anytime for renewal alerts.
                      </p>
                    </div>
                  </div>

                  {/* 3.1 Motor Insurance Policy */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-blue-600" />
                        <span>1. Motor Insurance Policy</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">Renewable Annual/5-Yr</span>
                    </div>
                    <div className="space-y-2">
                      <Input
                        label="Insurance Expiry Date"
                        type="date"
                        value={insuranceExpiryDate}
                        onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Policy Number"
                          placeholder="e.g. HDFC-POL-8978"
                          value={insurancePolicyNumber}
                          onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                        />
                        <Input
                          label="Insurance Provider"
                          placeholder="e.g. HDFC ERGO"
                          value={insuranceProvider}
                          onChange={(e) => setInsuranceProvider(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3.2 Pollution Certificate (PUC / Poka) */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        <span>2. Pollution Certificate (PUC / Poka)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">Annual / 6-Month</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        label="PUC Expiry Date"
                        type="date"
                        value={pucExpiryDate}
                        onChange={(e) => setPucExpiryDate(e.target.value)}
                      />
                      <Input
                        label="PUC Certificate Number"
                        placeholder="e.g. PUC-KL53-8978"
                        value={pucNumber}
                        onChange={(e) => setPucNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. FINANCIAL LEDGER & ADVANCE BILLING */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/40 via-white to-orange-50/20 border border-amber-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-amber-100">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Financial Status &amp; Advance
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Tracks fees, advance received, and balances
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <Input
                      label="Estimated Total Fee (₹)"
                      type="number"
                      placeholder="e.g. 5500"
                      value={totalCost}
                      onChange={(e) => setTotalCost(e.target.value)}
                    />
                    <Input
                      label="Advance Received (₹)"
                      type="number"
                      placeholder="e.g. 2000"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                  </div>

                  {/* Live Balance Banner */}
                  {Boolean(totalCost || amountReceived) && (() => {
                    const bal = calculatePaymentBalance(Number(totalCost || 0), Number(amountReceived || 0));
                    if (bal.paymentStatus === 'REFUND_DUE') {
                      return (
                        <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center justify-between text-xs font-semibold animate-in fade-in">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                            Overpaid:
                          </span>
                          <span className="font-extrabold text-purple-700">
                            Return ₹{bal.balanceAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      );
                    } else if (bal.paymentStatus === 'BALANCE_DUE') {
                      return (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs font-semibold animate-in fade-in">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Pending:
                          </span>
                          <span className="font-extrabold text-amber-700">
                            Due ₹{bal.balanceAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs font-semibold animate-in fade-in">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            Settled:
                          </span>
                          <span className="font-extrabold text-emerald-700">
                            ₹{bal.totalCost.toLocaleString('en-IN')}
                          </span>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* 5. AGENT ASSIGNMENT & NOTES */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
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
                    label="Internal Notes (Optional)"
                    placeholder="e.g. Fast-track client, VIP renewal"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Form Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting} className="gap-2 font-semibold px-5">
                <CheckCircle2 className="w-4 h-4" />
                {initialVehicle ? 'Update Vehicle' : 'Save Vehicle'}
              </Button>
            </div>
          </form>        )}
      </div>
    </Modal>
  );
}
