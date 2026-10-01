// Automobile Consultancy Vehicle & Renewal Management System Types

export type UserRole = 'ADMIN' | 'AGENT';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export type ClientStatus = 'ACTIVE' | 'INACTIVE';

export interface Client {
  id: string;
  name: string;
  mobile: string;
  alternateMobile?: string;
  address: string;
  email?: string;
  assignedAgentId: string;
  status: ClientStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type VehicleStatus = 'ACTIVE' | 'INACTIVE';

export type FuelType = 'PETROL' | 'DIESEL' | 'CNG' | 'ELECTRIC' | 'HYBRID' | 'OTHER';

export type VehicleType = 
  | 'PRIVATE_CAR'
  | 'COMMERCIAL_TAXI'
  | 'GOODS_CARRIER'
  | 'BUS'
  | 'TWO_WHEELER'
  | 'AUTO_RICKSHAW'
  | 'TRACTOR'
  | 'OTHER';

export interface Vehicle {
  id: string;
  clientId: string;
  registrationNumber: string;
  normalizedRegistrationNumber: string; // e.g. KL10AB1234
  vehicleType: VehicleType;
  vehicleClass?: string;
  make: string;
  model: string;
  variant?: string;
  fuelType: FuelType;
  manufacturingYear?: number;
  registrationDate?: string;
  chassisNumber?: string;
  engineNumber?: string;
  rto: string;
  registrationValidity?: string;
  assignedAgentId: string;
  status: VehicleStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 
  | 'INSURANCE'
  | 'ROAD_TAX'
  | 'GREEN_TAX'
  | 'PUC'
  | 'FITNESS'
  | 'PERMIT'
  | 'RC'
  | 'OTHER';

export type ValidityUnit = 'DAYS' | 'MONTHS' | 'YEARS';

export type RenewalStatus = 
  | 'ACTIVE'
  | 'DUE_SOON'
  | 'DUE_TODAY'
  | 'OVERDUE'
  | 'COMPLETED';

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  clientId: string;
  documentType: DocumentType;
  documentName?: string; // used for OTHER or custom label
  documentNumber?: string;
  issueDate?: string;
  startDate?: string;
  expiryDate?: string;
  lastPaymentDate?: string;
  validityValue?: number;
  validityUnit?: ValidityUnit;
  amount?: number;
  reminderDays: number;
  status: RenewalStatus;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  notes?: string;
  // Specific fields
  insuranceProvider?: string;
  policyType?: 'COMPREHENSIVE' | 'THIRD_PARTY' | 'BUMPER_TO_BUMPER' | 'OTHER';
  testingCentre?: string;
  fitnessType?: string;
  permitType?: string;
  isHistorical?: boolean; // True if this document belongs to a completed previous renewal cycle
  renewalCycleId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 
  | 'PENDING'
  | 'CLIENT_CONTACTED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'WAITING_FOR_DOCUMENT'
  | 'CLIENT_NOT_RESPONDING';

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH';

export interface Task {
  id: string;
  clientId: string;
  vehicleId: string;
  documentId?: string;
  title: string;
  description?: string;
  assignedTo: string; // userId of agent
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  notes?: string;
  completionNotes?: string;
  completedAt?: string;
  completedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'RENEWAL_DUE' | 'OVERDUE' | 'TASK_ASSIGNED' | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedVehicleId?: string;
  relatedTaskId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: 'CLIENT' | 'VEHICLE' | 'DOCUMENT' | 'TASK' | 'USER' | 'SETTINGS';
  entityId: string;
  description: string;
  createdAt: string;
}

export interface SystemSettings {
  companyName: string;
  companyMobile: string;
  companyAddress: string;
  defaultReminderDays: number;
  supportedDocumentTypes: DocumentType[];
}
