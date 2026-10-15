'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { useApp } from '@/lib/store/app-context';
import { FuelType, Vehicle, VehicleType } from '@/lib/types';
import { normalizeRegistrationNumber, calculatePaymentBalance } from '@/lib/utils';
import { validateMobile, validateEmail, onlyDigits } from '@/lib/validation';
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
  UserCheck,
  Receipt,
  IndianRupee,
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

  // Financial Tracking & Billing Status
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
  const [registrationDate, setRegistrationDate] = useState('');
  const [manufacturingMonthYear, setManufacturingMonthYear] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [notes, setNotes] = useState('');

  // Core 4 Periodic Compliances (Expiry Dates for Automated Renewal Alerts)
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');
  const [roadTaxExpiryDate, setRoadTaxExpiryDate] = useState('');
  const [fitnessExpiryDate, setFitnessExpiryDate] = useState('');
  const [pucExpiryDate, setPucExpiryDate] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [fitnessNumber, setFitnessNumber] = useState('');
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
      setRegistrationDate(initialVehicle.registrationDate || '');
      setManufacturingMonthYear(initialVehicle.manufacturingMonthYear || (initialVehicle.manufacturingYear ? String(initialVehicle.manufacturingYear) : ''));
      setAssignedAgentId(initialVehicle.assignedAgentId);
      setNotes(initialVehicle.notes || '');

      // Load POC details
      setPocName(initialVehicle.pocName || '');
      setPocMobile(initialVehicle.pocMobile || '');
      setPocDesignation(initialVehicle.pocDesignation || 'Driver');
      setHasSeparatePoc(Boolean(initialVehicle.pocName || initialVehicle.pocMobile));

      // Financial details
      setTotalCost(initialVehicle.totalCost !== undefined ? String(initialVehicle.totalCost) : '');
      setAmountReceived(initialVehicle.amountReceived !== undefined ? String(initialVehicle.amountReceived) : '');

      // Load existing active documents
      const activeDocs = documents.filter((d) => d.vehicleId === initialVehicle.id && !d.isHistorical);
      const insDoc = activeDocs.find((d) => d.documentType === 'INSURANCE');
      if (insDoc) {
        setInsuranceExpiryDate(insDoc.expiryDate || '');
        setInsurancePolicyNumber(insDoc.documentNumber || '');
        setInsuranceProvider(insDoc.insuranceProvider || '');
      }

      const taxDoc = activeDocs.find((d) => d.documentType === 'ROAD_TAX');
      if (taxDoc) {
        setRoadTaxExpiryDate(taxDoc.expiryDate || '');
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

      setRegistrationDate('');
      setManufacturingMonthYear('');
      setInsuranceExpiryDate('');
      setInsurancePolicyNumber('');
      setInsuranceProvider('');
      setRoadTaxExpiryDate('');
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
    if (data.registrationDate) setRegistrationDate(data.registrationDate);
    if (data.manufacturingMonthYear) setManufacturingMonthYear(data.manufacturingMonthYear);
    else if (data.manufacturingYear) setManufacturingMonthYear(String(data.manufacturingYear));
    if (data.registrationValidity) setFitnessExpiryDate(data.registrationValidity);
    if (data.insuranceValidity) setInsuranceExpiryDate(data.insuranceValidity);
    if (data.pollutionValidity) setPucExpiryDate(data.pollutionValidity);
    if (data.ownerName) {
      setClientName(data.ownerName);
      setClientMode('AUTO_LOOKUP');
    }

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
        const mobileCheck = validateMobile(clientMobile, 'Client Mobile Number', true);
        if (!mobileCheck.isValid) {
          setErrorMsg(mobileCheck.error || 'Please provide a valid 10-digit client mobile number.');
          setIsSubmitting(false);
          return;
        }

        if (!clientName.trim() || clientName.trim().length < 2) {
          setErrorMsg('Please enter a valid client / vehicle owner name (at least 2 characters).');
          setIsSubmitting(false);
          return;
        }

        if (clientEmail.trim()) {
          const emailCheck = validateEmail(clientEmail, false);
          if (!emailCheck.isValid) {
            setErrorMsg(emailCheck.error || 'Please enter a valid email address.');
            setIsSubmitting(false);
            return;
          }
        }

        if (matchedExistingClient) {
          finalClientId = matchedExistingClient.id;
          if (clientEmail && clientEmail !== matchedExistingClient.email) {
            await updateClient(matchedExistingClient.id, { email: clientEmail.trim().toLowerCase() });
          }
        } else {
          const cleaned = mobileCheck.cleaned;
          const found = clients.find((c) => cleanPhone(c.mobile) === cleaned);

          if (found) {
            finalClientId = found.id;
          } else {
            const newClientId = await addClient({
              name: clientName.trim(),
              mobile: cleaned,
              address: 'Address not specified',
              email: clientEmail.trim().toLowerCase() || undefined,
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

      // Validate POC Mobile if provided
      if (hasSeparatePoc && pocMobile.trim()) {
        const pocCheck = validateMobile(pocMobile, 'POC Mobile Number', false);
        if (!pocCheck.isValid) {
          setErrorMsg(pocCheck.error || 'Invalid POC mobile number.');
          setIsSubmitting(false);
          return;
        }
      }

      const parsedCost = totalCost.trim() ? Number(totalCost) : undefined;
      const parsedReceived = amountReceived.trim() ? Number(amountReceived) : undefined;
      const billingSummary = (parsedCost !== undefined || parsedReceived !== undefined)
        ? calculatePaymentBalance(parsedCost || 0, parsedReceived || 0)
        : null;

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
        registrationDate: registrationDate || undefined,
        manufacturingMonthYear: manufacturingMonthYear.trim() || undefined,
        manufacturingYear: manufacturingMonthYear.match(/\b((?:19|20)\d{2})\b/)
          ? parseInt(manufacturingMonthYear.match(/\b((?:19|20)\d{2})\b/)![1], 10)
          : undefined,
        registrationValidity: fitnessExpiryDate || undefined,
        assignedAgentId: assignedAgentId || currentUser?.id || 'agent',
        status: 'ACTIVE' as const,
        notes: notes.trim() || undefined,
        // Point of Contact (POC) details
        pocName: hasSeparatePoc && pocName.trim() ? pocName.trim() : undefined,
        pocMobile: hasSeparatePoc && pocMobile.trim() ? pocMobile.trim() : undefined,
        pocDesignation: hasSeparatePoc && pocName.trim() ? pocDesignation : undefined,
        // Financial Tracking & Billing Status
        totalCost: parsedCost,
        amountReceived: parsedReceived,
        balanceAmount: billingSummary ? billingSummary.balanceAmount : undefined,
        paymentStatus: billingSummary ? billingSummary.paymentStatus : undefined,
      };

      let vehicleId = initialVehicle?.id;
      if (initialVehicle) {
        await updateVehicle(initialVehicle.id, vehiclePayload);
      } else {
        vehicleId = await addVehicle(vehiclePayload);
      }

      // Automatically Create / Sync the Core 4 Compliance Documents for every vehicle
      if (vehicleId) {
        const activeDocs = documents.filter((d) => d.vehicleId === vehicleId && !d.isHistorical);

        // 1. Fitness Document
        const existingFit = activeDocs.find((d) => d.documentType === 'FITNESS');
        if (existingFit) {
          if (fitnessExpiryDate) {
            await updateDocument(existingFit.id, { expiryDate: fitnessExpiryDate });
          }
        } else {
          await addDocument({
            vehicleId,
            clientId: finalClientId,
            documentType: 'FITNESS',
            expiryDate: fitnessExpiryDate || undefined,
            reminderDays: 30,
            notes: 'Fitness certificate compliance',
          });
        }

        // 2. Insurance Document
        const existingIns = activeDocs.find((d) => d.documentType === 'INSURANCE');
        if (existingIns) {
          if (insuranceExpiryDate) {
            await updateDocument(existingIns.id, { expiryDate: insuranceExpiryDate });
          }
        } else {
          await addDocument({
            vehicleId,
            clientId: finalClientId,
            documentType: 'INSURANCE',
            expiryDate: insuranceExpiryDate || undefined,
            reminderDays: 30,
            notes: 'Insurance policy compliance',
          });
        }

        // 3. Road Tax Document
        const existingTax = activeDocs.find((d) => d.documentType === 'ROAD_TAX');
        if (existingTax) {
          if (roadTaxExpiryDate) {
            await updateDocument(existingTax.id, { expiryDate: roadTaxExpiryDate });
          }
        } else {
          await addDocument({
            vehicleId,
            clientId: finalClientId,
            documentType: 'ROAD_TAX',
            expiryDate: roadTaxExpiryDate || undefined,
            reminderDays: 30,
            notes: 'Road tax compliance',
          });
        }

        // 4. Pollution Certificate (PUC)
        const existingPuc = activeDocs.find((d) => d.documentType === 'PUC');
        if (existingPuc) {
          if (pucExpiryDate) {
            await updateDocument(existingPuc.id, { expiryDate: pucExpiryDate });
          }
        } else {
          await addDocument({
            vehicleId,
            clientId: finalClientId,
            documentType: 'PUC',
            expiryDate: pucExpiryDate || undefined,
            reminderDays: 15,
            notes: 'Emission compliance (PUC)',
          });
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

  const parsedCost = totalCost.trim() ? Number(totalCost) : undefined;
  const parsedReceived = amountReceived.trim() ? Number(amountReceived) : undefined;
  const billingSummary = (parsedCost !== undefined || parsedReceived !== undefined)
    ? calculatePaymentBalance(parsedCost || 0, parsedReceived || 0)
    : null;

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

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {extractedData.registrationNumber && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Registration</span>
                      <strong className="text-slate-900 font-mono">{extractedData.registrationNumber}</strong>
                    </div>
                  )}
                  {extractedData.ownerName && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Customer / Owner Name</span>
                      <strong className="text-slate-900 truncate block">{extractedData.ownerName}</strong>
                    </div>
                  )}
                  {extractedData.make && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Make &amp; Model</span>
                      <strong className="text-slate-900 truncate block">{extractedData.make} {extractedData.model}</strong>
                    </div>
                  )}
                  {extractedData.chassisNumber && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100 sm:col-span-2 md:col-span-1">
                      <span className="text-[10px] text-slate-500 block">Chassis (VIN)</span>
                      <strong className="text-slate-900 font-mono text-[11px] truncate block">{extractedData.chassisNumber}</strong>
                    </div>
                  )}
                  {extractedData.engineNumber && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Engine Number</span>
                      <strong className="text-slate-900 font-mono text-[11px] truncate block">{extractedData.engineNumber}</strong>
                    </div>
                  )}
                  {extractedData.registrationDate && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Date of Regn</span>
                      <strong className="text-slate-900 font-mono">{extractedData.registrationDate}</strong>
                    </div>
                  )}
                  {extractedData.registrationValidity && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Fitness Expiry</span>
                      <strong className="text-emerald-700 font-mono">{extractedData.registrationValidity}</strong>
                    </div>
                  )}
                  {extractedData.fuelType && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">Fuel &amp; Category</span>
                      <strong className="text-slate-900 truncate block">{extractedData.fuelType} {extractedData.vehicleClass ? `• ${extractedData.vehicleClass}` : ''}</strong>
                    </div>
                  )}
                  {extractedData.rto && (
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">RTO Office</span>
                      <strong className="text-slate-900 truncate block">{extractedData.rto}</strong>
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

                  {/* Registration Date & Mfg. Date / Year */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Registration Date (Date of Regn)"
                      type="date"
                      value={registrationDate}
                      onChange={(e) => setRegistrationDate(e.target.value)}
                    />
                    <Input
                      label="Mfg. Date / Year (Month & Year)"
                      placeholder="e.g. 09/2025 or 2025"
                      value={manufacturingMonthYear}
                      onChange={(e) => setManufacturingMonthYear(e.target.value)}
                    />
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
                          type="tel"
                          placeholder="10-digit mobile (e.g. 9846012345)"
                          value={clientMobile}
                          onChange={(e) => handlePhoneChange(onlyDigits(e.target.value, 10))}
                          className="font-mono"
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
                          type="tel"
                          placeholder="10-digit mobile"
                          value={pocMobile}
                          onChange={(e) => setPocMobile(onlyDigits(e.target.value, 10))}
                          className="font-mono"
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
                {/* 3. PERIODIC COMPLIANCES (EXPIRY DATES ONLY) */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/20 border border-indigo-200/80 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Periodic Compliances (Expiry Dates)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Expiry dates for automated renewal reminders &amp; WhatsApp alerts
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 3.1 Motor Insurance Policy */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-blue-600" />
                          <span>1. Motor Insurance</span>
                        </div>
                      </div>
                      <Input
                        label="Insurance Expiry Date"
                        type="date"
                        value={insuranceExpiryDate}
                        onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                      />
                    </div>

                    {/* 3.2 Road Tax (State RTO) */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                          <span>2. Road Tax (RTO)</span>
                        </div>
                      </div>
                      <Input
                        label="Road Tax Expiry Date"
                        type="date"
                        value={roadTaxExpiryDate}
                        onChange={(e) => setRoadTaxExpiryDate(e.target.value)}
                      />
                    </div>

                    {/* 3.3 Fitness / RC Expiry */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                        <div className="flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>3. Fitness / RC Expiry</span>
                        </div>
                      </div>
                      <Input
                        label="Fitness Expiry Date"
                        type="date"
                        value={fitnessExpiryDate}
                        onChange={(e) => setFitnessExpiryDate(e.target.value)}
                      />
                    </div>

                    {/* 3.4 Pollution Certificate (PUC) */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-600" />
                          <span>4. Pollution (PUC)</span>
                        </div>
                      </div>
                      <Input
                        label="PUC Expiry Date"
                        type="date"
                        value={pucExpiryDate}
                        onChange={(e) => setPucExpiryDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. BILLING & ADVANCE PAYMENT */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/30 border border-purple-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Billing &amp; Advance Payment (അഡ്വാൻസ് &amp; ഫീസ്)
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Initial token/advance received &amp; estimated cost
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded-md">
                      Optional
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Estimated Service Fee / Cost (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-semibold">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 2500"
                          value={totalCost}
                          onChange={(e) => setTotalCost(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Advance / Token Received (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-semibold">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 500"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Payment Status Preview */}
                  {billingSummary && (parsedCost !== undefined || parsedReceived !== undefined) && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all shadow-2xs ${
                        billingSummary.paymentStatus === 'SETTLED'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : billingSummary.paymentStatus === 'REFUND_DUE'
                          ? 'bg-blue-50 text-blue-900 border-blue-300'
                          : 'bg-amber-50 text-amber-950 border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {billingSummary.paymentStatus === 'SETTLED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>
                          {billingSummary.paymentStatus === 'BALANCE_DUE' && (
                            <>Balance Due from Client: <span className="font-mono font-extrabold">₹{billingSummary.balanceAmount.toLocaleString('en-IN')}</span> </>
                          )}
                          {billingSummary.paymentStatus === 'REFUND_DUE' && (
                            <>Refund / Return to Client: <span className="font-mono font-extrabold">₹{billingSummary.balanceAmount.toLocaleString('en-IN')}</span> </>
                          )}
                          {billingSummary.paymentStatus === 'SETTLED' && (
                            <>Fully Settled: <span className="font-mono font-extrabold">₹{billingSummary.totalCost.toLocaleString('en-IN')}</span></>
                          )}
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider bg-white/70 border border-slate-200/50 shrink-0">
                        {billingSummary.paymentStatus.replace('_', ' ')}
                      </span>
                    </div>
                  )}
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
