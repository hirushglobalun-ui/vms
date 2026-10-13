import { ActivityLog, Client, Notification, SystemSettings, Task, User, Vehicle, VehicleDocument } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user_admin_1',
    name: 'Anas (Admin)',
    email: 'admin@apexmotors.com',
    mobile: '+91 98470 00001',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-01T09:00:00Z',
    updatedAt: '2026-01-01T09:00:00Z',
  },
  {
    id: 'user_agent_rahman',
    name: 'Rahman (Agent)',
    email: 'rahman@apexmotors.com',
    mobile: '+91 98470 12345',
    role: 'AGENT',
    status: 'ACTIVE',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'user_agent_suresh',
    name: 'Suresh Kumar (Agent)',
    email: 'suresh@apexmotors.com',
    mobile: '+91 94470 54321',
    role: 'AGENT',
    status: 'ACTIVE',
    createdAt: '2026-01-15T11:00:00Z',
    updatedAt: '2026-01-15T11:00:00Z',
  },
];

export const INITIAL_SETTINGS: SystemSettings = {
  companyName: 'Apex Motor Consultancy',
  companyMobile: '+91 98470 12345',
  companyAddress: 'Calicut Road, Perinthalmanna, Malappuram, Kerala 679322',
  defaultReminderDays: 30,
  supportedDocumentTypes: [
    'INSURANCE',
    'ROAD_TAX',
    'GREEN_TAX',
    'PUC',
    'FITNESS',
    'PERMIT',
    'RC',
    'OTHER',
  ],
};

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'client_1',
    name: 'Mohammed Ali',
    mobile: '+91 98471 23456',
    alternateMobile: '+91 98471 99999',
    address: 'Baitul Noor, Bypass Road, Perinthalmanna, Kerala',
    email: 'mohammed.ali@example.com',
    assignedAgentId: 'user_agent_rahman',
    status: 'ACTIVE',
    notes: 'Premium client with multiple commercial and private vehicles.',
    createdBy: 'user_admin_1',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'client_2',
    name: 'Fatima Zahra',
    mobile: '+91 97455 88990',
    alternateMobile: '',
    address: 'Green Meadows, Down Hill, Malappuram, Kerala',
    email: 'fatima.zahra@example.com',
    assignedAgentId: 'user_agent_rahman',
    status: 'ACTIVE',
    notes: 'Personal vehicles fleet.',
    createdBy: 'user_agent_rahman',
    createdAt: '2026-02-15T11:30:00Z',
    updatedAt: '2026-02-15T11:30:00Z',
  },
  {
    id: 'client_3',
    name: 'Rajesh Varma',
    mobile: '+91 94470 11223',
    alternateMobile: '+91 94470 33445',
    address: 'Varma Logistics, Mavoor Road, Kozhikode, Kerala',
    email: 'rajesh.varma@example.com',
    assignedAgentId: 'user_agent_suresh',
    status: 'ACTIVE',
    notes: 'Commercial transport operator with goods carriers.',
    createdBy: 'user_admin_1',
    createdAt: '2026-03-01T09:15:00Z',
    updatedAt: '2026-03-01T09:15:00Z',
  },
];

export const INITIAL_VEHICLES: Vehicle[] = [];
export const INITIAL_DOCUMENTS: VehicleDocument[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_NOTIFICATIONS: Notification[] = [];
export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];
