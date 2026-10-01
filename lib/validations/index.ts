import { z } from 'zod';

export const ClientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().regex(/^[0-9+\s-]{10,15}$/, 'Enter a valid mobile number (min 10 digits)'),
  alternateMobile: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().min(3, 'Address is required'),
  assignedAgentId: z.string().min(1, 'Please select an assigned agent'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().optional(),
});

export type ClientFormData = z.infer<typeof ClientSchema>;

export const VehicleSchema = z.object({
  clientId: z.string().min(1, 'Please select a client'),
  registrationNumber: z.string().min(4, 'Registration number is required (e.g. KL-10-AB-1234)'),
  vehicleType: z.enum([
    'PRIVATE_CAR',
    'COMMERCIAL_TAXI',
    'GOODS_CARRIER',
    'BUS',
    'TWO_WHEELER',
    'AUTO_RICKSHAW',
    'TRACTOR',
    'OTHER',
  ]),
  vehicleClass: z.string().optional(),
  make: z.string().min(1, 'Make is required (e.g. Toyota)'),
  model: z.string().min(1, 'Model is required (e.g. Innova)'),
  variant: z.string().optional(),
  fuelType: z.enum(['PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID', 'OTHER']),
  manufacturingYear: z.coerce.number().min(1970).max(2035).optional(),
  registrationDate: z.string().optional(),
  chassisNumber: z.string().optional(),
  engineNumber: z.string().optional(),
  rto: z.string().min(2, 'RTO location is required'),
  registrationValidity: z.string().optional(),
  assignedAgentId: z.string().min(1, 'Assigned agent is required'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().optional(),
});

export type VehicleFormData = z.infer<typeof VehicleSchema>;

export const DocumentSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  clientId: z.string().min(1, 'Client is required'),
  documentType: z.enum([
    'INSURANCE',
    'ROAD_TAX',
    'GREEN_TAX',
    'PUC',
    'FITNESS',
    'PERMIT',
    'RC',
    'OTHER',
  ]),
  documentName: z.string().optional(),
  documentNumber: z.string().optional(),
  issueDate: z.string().optional(),
  startDate: z.string().optional(),
  expiryDate: z.string().optional(),
  lastPaymentDate: z.string().optional(),
  validityValue: z.coerce.number().positive().optional(),
  validityUnit: z.enum(['DAYS', 'MONTHS', 'YEARS']).optional(),
  amount: z.coerce.number().min(0).optional(),
  reminderDays: z.coerce.number().min(0, 'Reminder days must be 0 or more').default(30),
  notes: z.string().optional(),
  // Type specific
  insuranceProvider: z.string().optional(),
  policyType: z.enum(['COMPREHENSIVE', 'THIRD_PARTY', 'BUMPER_TO_BUMPER', 'OTHER']).optional(),
  testingCentre: z.string().optional(),
  fitnessType: z.string().optional(),
  permitType: z.string().optional(),
});

export type DocumentFormData = z.infer<typeof DocumentSchema>;

export const TaskSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  documentId: z.string().optional(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  assignedTo: z.string().min(1, 'Assigned agent is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).default('NORMAL'),
  status: z.enum([
    'PENDING',
    'CLIENT_CONTACTED',
    'PROCESSING',
    'COMPLETED',
    'CANCELLED',
    'WAITING_FOR_DOCUMENT',
    'CLIENT_NOT_RESPONDING',
  ]).default('PENDING'),
  notes: z.string().optional(),
});

export type TaskFormData = z.infer<typeof TaskSchema>;
