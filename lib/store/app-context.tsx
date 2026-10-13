'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  ActivityLog,
  Client,
  Notification,
  RenewalStatus,
  SystemSettings,
  Task,
  User,
  Vehicle,
  VehicleDocument,
} from '../types';
import { isFirebaseConfigured } from '../firebase/config';
import { signInStaff, signOutStaff, subscribeAuthState, createStaffAccount } from '../firebase/auth';
import {
  subscribeClients,
  addClientDoc,
  updateClientDoc,
  deleteClientDoc,
  subscribeVehicles,
  addVehicleDoc,
  updateVehicleDoc,
  deleteVehicleDoc,
  subscribeDocuments,
  addVehicleDocumentDoc,
  updateVehicleDocumentDoc,
  deleteDocumentDoc,
  completeRenewalCycleDoc,
  subscribeTasks,
  addTaskDoc,
  updateTaskDoc,
  completeTaskDoc,
  deleteTaskDoc,
  subscribeNotifications,
  markNotificationReadDoc,
  markAllNotificationsReadDoc,
  clearAllNotificationsDoc,
  deleteNotificationDoc,
  subscribeActivityLogs,
  addActivityLogDoc,
  subscribeUsers,
  addUserDoc,
  updateUserDoc,
  deleteUserDoc,
  getSystemSettingsDoc,
  updateSystemSettingsDoc,
} from '../firebase/firestore';
import {
  INITIAL_ACTIVITY_LOGS,
  INITIAL_CLIENTS,
  INITIAL_DOCUMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SETTINGS,
  INITIAL_TASKS,
  INITIAL_USERS,
  INITIAL_VEHICLES,
} from './mock-data';
import { calculateRenewalStatus } from '../renewals/engine';
import { normalizeRegistrationNumber } from '../utils';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  clients: Client[];
  vehicles: Vehicle[];
  documents: VehicleDocument[];
  tasks: Task[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  settings: SystemSettings;
  isLoading: boolean;
  isFirebaseActive: boolean;
  firebaseConfigError?: string;
  
  // Real Auth methods
  loginStaff: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;

  // Client operations
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<string>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deactivateClient: (id: string) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  // Vehicle operations
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'normalizedRegistrationNumber' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<string>;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<void>;
  deactivateVehicle: (id: string) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;

  // Document operations
  addDocument: (doc: Omit<VehicleDocument, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<string>;
  updateDocument: (id: string, updates: Partial<VehicleDocument>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  completeRenewalCycle: (
    oldDocumentId: string,
    newDetails: {
      newExpiryDate?: string;
      newIssueDate?: string;
      newAmount?: number;
      amountReceived?: number;
      balanceAmount?: number;
      paymentStatus?: 'SETTLED' | 'BALANCE_DUE' | 'REFUND_DUE';
      newDocumentNumber?: string;
      notes?: string;
      fileName?: string;
      fileUrl?: string;
    },
    taskIdToComplete?: string
  ) => Promise<string>;

  // Task operations
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<string>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  completeTask: (id: string, notes?: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Staff / Agent operations
  addAgent: (
    agent: Omit<User, 'id' | 'createdAt' | 'updatedAt'>,
    password?: string
  ) => Promise<string>;
  updateAgent: (id: string, updates: Partial<User>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;

  // Notifications
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  // Settings
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;

  // Filtered queries according to role
  filteredClients: Client[];
  filteredVehicles: Vehicle[];
  filteredDocuments: VehicleDocument[];
  filteredTasks: Task[];
  filteredNotifications: Notification[];

  // Global fast search
  searchGlobal: (query: string) => {
    vehicles: Vehicle[];
    clients: Client[];
    documents: VehicleDocument[];
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'auto_consultancy_prod_';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirebaseActive, setIsFirebaseActive] = useState(isFirebaseConfigured);
  const [firebaseConfigError, setFirebaseConfigError] = useState<string | undefined>(
    !isFirebaseConfigured
      ? 'Firebase configuration is missing. Set NEXT_PUBLIC_FIREBASE_* in your environment.'
      : undefined
  );

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [documents, setDocuments] = useState<VehicleDocument[]>(INITIAL_DOCUMENTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);

  // Persistence for local dev mode
  const saveState = (key: string, data: any) => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  };

  // Check auth state & subscribe to Firestore when configured
  useEffect(() => {
    if (isFirebaseConfigured) {
      setIsLoading(true);
      // Subscribe to real Firebase Auth
      const unsubAuth = subscribeAuthState(async (user, error) => {
        if (error) {
          console.warn('Auth state message:', error);
        }
        setCurrentUser(user);
        setIsLoading(false);
      });

      return () => {
        unsubAuth();
      };
    } else {
      // In development when env variables are not yet populated
      try {
        const storedUser = localStorage.getItem(`${STORAGE_KEY_PREFIX}user`);
        const storedClients = localStorage.getItem(`${STORAGE_KEY_PREFIX}clients`);
        const storedVehicles = localStorage.getItem(`${STORAGE_KEY_PREFIX}vehicles`);
        const storedDocs = localStorage.getItem(`${STORAGE_KEY_PREFIX}documents`);
        const storedTasks = localStorage.getItem(`${STORAGE_KEY_PREFIX}tasks`);
        const storedLogs = localStorage.getItem(`${STORAGE_KEY_PREFIX}activityLogs`);
        const storedNotifs = localStorage.getItem(`${STORAGE_KEY_PREFIX}notifications`);
        const storedSettings = localStorage.getItem(`${STORAGE_KEY_PREFIX}settings`);

        if (storedUser) setCurrentUser(JSON.parse(storedUser));
        if (storedClients) setClients(JSON.parse(storedClients));
        const isDummyVeh = (id: string) => /^veh_[0-9]{1,3}$/.test(id);
        const isDummyDoc = (id: string) => /^doc_[0-9]{1,3}$/.test(id);
        const isDummyTask = (id: string) => /^task_[0-9]{1,3}$/.test(id);
        const isDummyNotif = (id: string) => /^notif_[0-9]{1,3}$/.test(id);
        const isDummyLog = (id: string) => /^log_[0-9]{1,3}$/.test(id);

        if (storedVehicles) {
          const parsed: Vehicle[] = JSON.parse(storedVehicles);
          const cleaned = parsed.filter((v) => !isDummyVeh(v.id));
          setVehicles(cleaned);
          saveState('vehicles', cleaned);
        }
        if (storedDocs) {
          const parsed: VehicleDocument[] = JSON.parse(storedDocs);
          const cleaned = parsed.filter((d) => !isDummyDoc(d.id) && !isDummyVeh(d.vehicleId));
          setDocuments(cleaned);
          saveState('documents', cleaned);
        }
        if (storedTasks) {
          const parsed: Task[] = JSON.parse(storedTasks);
          const cleaned = parsed.filter((t) => !isDummyTask(t.id) && (!t.vehicleId || !isDummyVeh(t.vehicleId)));
          setTasks(cleaned);
          saveState('tasks', cleaned);
        }
        if (storedLogs) {
          const parsed: ActivityLog[] = JSON.parse(storedLogs);
          const cleaned = parsed.filter((l) => !isDummyLog(l.id) && (!l.entityId || !isDummyVeh(l.entityId)));
          setActivityLogs(cleaned);
          saveState('activityLogs', cleaned);
        }
        if (storedNotifs) {
          const parsed: Notification[] = JSON.parse(storedNotifs);
          const cleaned = parsed.filter((n) => !isDummyNotif(n.id) && (!n.relatedVehicleId || !isDummyVeh(n.relatedVehicleId)));
          setNotifications(cleaned);
          saveState('notifications', cleaned);
        }
        if (storedSettings) setSettings(JSON.parse(storedSettings));
      } catch (e) {
        console.error('LocalStorage load error:', e);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  // When Firebase is configured and user is logged in, attach live Firestore listeners
  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser) return;

    const unsubClients = subscribeClients(currentUser.role, currentUser.id, (data) => setClients(data));
    const unsubVehicles = subscribeVehicles(currentUser.role, currentUser.id, (data) => setVehicles(data));
    const unsubDocs = subscribeDocuments((data) => setDocuments(data));
    const unsubTasks = subscribeTasks(currentUser.role, currentUser.id, (data) => setTasks(data));
    const unsubNotifs = subscribeNotifications(currentUser.id, (data) => setNotifications(data));
    const unsubLogs = subscribeActivityLogs((data) => setActivityLogs(data));
    const unsubUsers = subscribeUsers((data) => setUsers(data));

    getSystemSettingsDoc().then((s) => {
      if (s) setSettings(s);
    });

    return () => {
      unsubClients();
      unsubVehicles();
      unsubDocs();
      unsubTasks();
      unsubNotifs();
      unsubLogs();
      unsubUsers();
    };
  }, [currentUser]);

  // LOGIN / LOGOUT
  const loginStaff = async (email: string, password: string) => {
    let resolvedEmail = email.toLowerCase().trim();
    if (resolvedEmail === 'admin@gmail.com') resolvedEmail = 'admin@apexmotors.com';
    if (resolvedEmail === 'agent1@gmail.com' || resolvedEmail === 'agent@gmail.com') resolvedEmail = 'rahman@apexmotors.com';
    if (resolvedEmail === 'agent2@gmail.com') resolvedEmail = 'suresh@apexmotors.com';

    if (isFirebaseConfigured) {
      try {
        const user = await signInStaff(email, password);
        setCurrentUser(user);
        return;
      } catch (fbErr: any) {
        // If Firebase Auth fails, gracefully check if it's one of our mock demo accounts
        const existingMock = users.find(
          (u) =>
            u.email.toLowerCase() === resolvedEmail ||
            u.email.toLowerCase() === email.toLowerCase().trim()
        );

        if (existingMock) {
          if (existingMock.status === 'INACTIVE') {
            throw new Error('Your account is currently INACTIVE. Please contact administrator.');
          }
          setCurrentUser(existingMock);
          saveState('user', existingMock);
          return;
        }

        // If not a mock account, throw original Firebase error
        throw fbErr;
      }
    } else {
      // Local fallback for testing - normalize alias emails to actual mock users
      const existing = users.find(
        (u) =>
          u.email.toLowerCase() === resolvedEmail ||
          u.email.toLowerCase() === email.toLowerCase().trim()
      );
      if (existing) {
        if (existing.status === 'INACTIVE') {
          throw new Error('Your account is currently INACTIVE. Please contact administrator.');
        }
        setCurrentUser(existing);
        saveState('user', existing);
      } else {
        const newUser: User = {
          id: `user_${Date.now()}`,
          name: email.split('@')[0],
          email,
          mobile: '+91 98000 00000',
          role: email.toLowerCase().includes('admin') ? 'ADMIN' : 'AGENT',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCurrentUser(newUser);
        setUsers((prev) => [...prev, newUser]);
        saveState('user', newUser);
      }
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured) {
      await signOutStaff();
    }
    setCurrentUser(null);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}user`);
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setCurrentUser(updatedUser);
    saveState('user', updatedUser);
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      saveState('users', updated);
      return updated;
    });
  };

  // CLIENTS CRUD
  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> => {
    const creatorId = currentUser?.id || 'system';
    if (isFirebaseConfigured) {
      const id = await addClientDoc(clientData, creatorId);
      await addActivityLogDoc({
        userId: creatorId,
        userName: currentUser?.name || 'Staff',
        action: 'CLIENT_CREATED',
        entityType: 'CLIENT',
        entityId: id,
        description: `Registered new client: ${clientData.name} (${clientData.mobile})`,
      });
      return id;
    } else {
      const id = `client_${Date.now()}`;
      const newClient: Client = {
        ...clientData,
        id,
        createdBy: creatorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setClients((prev) => {
        const updated = [newClient, ...prev];
        saveState('clients', updated);
        return updated;
      });
      return id;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    if (isFirebaseConfigured) {
      await updateClientDoc(id, updates);
      await addActivityLogDoc({
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Staff',
        action: 'CLIENT_UPDATED',
        entityType: 'CLIENT',
        entityId: id,
        description: `Updated client record.`,
      });
    } else {
      setClients((prev) => {
        const updated = prev.map((c) =>
          c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
        );
        saveState('clients', updated);
        return updated;
      });
    }
  };

  const deactivateClient = async (id: string) => {
    await updateClient(id, { status: 'INACTIVE' });
  };

  // VEHICLES CRUD
  const addVehicle = async (
    vehData: Omit<Vehicle, 'id' | 'normalizedRegistrationNumber' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<string> => {
    const creatorId = currentUser?.id || 'system';
    const norm = normalizeRegistrationNumber(vehData.registrationNumber);

    if (isFirebaseConfigured) {
      const id = await addVehicleDoc(vehData, creatorId);
      await addActivityLogDoc({
        userId: creatorId,
        userName: currentUser?.name || 'Staff',
        action: 'VEHICLE_CREATED',
        entityType: 'VEHICLE',
        entityId: id,
        description: `Registered vehicle ${vehData.registrationNumber} (${vehData.make} ${vehData.model})`,
      });
      return id;
    } else {
      // Local duplicate check
      const dup = vehicles.find((v) => v.normalizedRegistrationNumber === norm && v.status === 'ACTIVE');
      if (dup) {
        throw new Error(`Vehicle with registration number ${vehData.registrationNumber} is already registered!`);
      }

      const id = `veh_${Date.now()}`;
      const newVeh: Vehicle = {
        ...vehData,
        id,
        normalizedRegistrationNumber: norm,
        createdBy: creatorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setVehicles((prev) => {
        const updated = [newVeh, ...prev];
        saveState('vehicles', updated);
        return updated;
      });
      return id;
    }
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    if (isFirebaseConfigured) {
      await updateVehicleDoc(id, updates);
    } else {
      setVehicles((prev) => {
        const updated = prev.map((v) => {
          if (v.id === id) {
            const norm = updates.registrationNumber
              ? normalizeRegistrationNumber(updates.registrationNumber)
              : v.normalizedRegistrationNumber;
            return { ...v, ...updates, normalizedRegistrationNumber: norm, updatedAt: new Date().toISOString() };
          }
          return v;
        });
        saveState('vehicles', updated);
        return updated;
      });
    }
  };

  const deactivateVehicle = async (id: string) => {
    await updateVehicle(id, { status: 'INACTIVE' });
  };

  const deleteClient = async (id: string) => {
    if (isFirebaseConfigured) {
      await deleteClientDoc(id);
    } else {
      setClients((prev) => {
        const updated = prev.filter((c) => c.id !== id);
        saveState('clients', updated);
        return updated;
      });
    }
  };

  const deleteVehicle = async (id: string) => {
    if (isFirebaseConfigured) {
      await deleteVehicleDoc(id);
    } else {
      setVehicles((prev) => {
        const updated = prev.filter((v) => v.id !== id);
        saveState('vehicles', updated);
        return updated;
      });
    }
  };

  const deleteDocument = async (id: string) => {
    if (isFirebaseConfigured) {
      await deleteDocumentDoc(id);
    } else {
      setDocuments((prev) => {
        const updated = prev.filter((d) => d.id !== id);
        saveState('documents', updated);
        return updated;
      });
    }
  };

  // DOCUMENTS CRUD
  const addDocument = async (
    docData: Omit<VehicleDocument, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<string> => {
    const creatorId = currentUser?.id || 'system';
    if (isFirebaseConfigured) {
      const id = await addVehicleDocumentDoc(docData, creatorId);
      return id;
    } else {
      const status = calculateRenewalStatus(docData.expiryDate, docData.reminderDays);
      const id = `doc_${Date.now()}`;
      const newDoc: VehicleDocument = {
        ...docData,
        id,
        status,
        isHistorical: false,
        createdBy: creatorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDocuments((prev) => {
        const updated = [newDoc, ...prev];
        saveState('documents', updated);
        return updated;
      });
      return id;
    }
  };

  const updateDocument = async (id: string, updates: Partial<VehicleDocument>) => {
    if (isFirebaseConfigured) {
      await updateVehicleDocumentDoc(id, updates);
    } else {
      setDocuments((prev) => {
        const updated = prev.map((d) => {
          if (d.id === id) {
            const merged = { ...d, ...updates, updatedAt: new Date().toISOString() };
            merged.status = calculateRenewalStatus(merged.expiryDate, merged.reminderDays, merged.isHistorical);
            return merged;
          }
          return d;
        });
        saveState('documents', updated);
        return updated;
      });
    }
  };

  const completeRenewalCycle = async (
    oldDocumentId: string,
    newDetails: {
      newExpiryDate?: string;
      newIssueDate?: string;
      newAmount?: number;
      amountReceived?: number;
      balanceAmount?: number;
      paymentStatus?: 'SETTLED' | 'BALANCE_DUE' | 'REFUND_DUE';
      newDocumentNumber?: string;
      notes?: string;
      fileName?: string;
      fileUrl?: string;
    },
    taskIdToComplete?: string
  ): Promise<string> => {
    const oldDoc = documents.find((d) => d.id === oldDocumentId);
    if (!oldDoc) throw new Error('Document record not found');

    const userId = currentUser?.id || 'system';

    if (isFirebaseConfigured) {
      return await completeRenewalCycleDoc(oldDoc, newDetails, userId, taskIdToComplete);
    } else {
      const updatedOld: VehicleDocument = {
        ...oldDoc,
        isHistorical: true,
        status: 'COMPLETED',
        updatedAt: new Date().toISOString(),
      };

      const newDocStatus = calculateRenewalStatus(newDetails.newExpiryDate, oldDoc.reminderDays, false);
      const newDocId = `doc_${Date.now()}`;
      const newDoc: VehicleDocument = {
        ...oldDoc,
        id: newDocId,
        documentNumber: newDetails.newDocumentNumber || oldDoc.documentNumber,
        issueDate: newDetails.newIssueDate || new Date().toISOString().split('T')[0],
        expiryDate: newDetails.newExpiryDate,
        amount: newDetails.newAmount ?? oldDoc.amount,
        amountReceived: newDetails.amountReceived,
        balanceAmount: newDetails.balanceAmount,
        paymentStatus: newDetails.paymentStatus,
        notes: newDetails.notes || `Renewed. Previous cycle archived to history.`,
        fileName: newDetails.fileName || oldDoc.fileName,
        fileUrl: newDetails.fileUrl || oldDoc.fileUrl,
        isHistorical: false,
        status: newDocStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId,
      };

      setDocuments((prev) => {
        const filtered = prev.filter((d) => d.id !== oldDocumentId);
        const updated = [newDoc, updatedOld, ...filtered];
        saveState('documents', updated);
        return updated;
      });

      // Update vehicle financial status if vehicleId present
      if (oldDoc.vehicleId) {
        setVehicles((prev) => {
          const updated = prev.map((v) => {
            if (v.id === oldDoc.vehicleId) {
              return {
                ...v,
                totalCost: newDetails.newAmount ?? v.totalCost,
                amountReceived: newDetails.amountReceived ?? v.amountReceived,
                balanceAmount: newDetails.balanceAmount ?? v.balanceAmount,
                paymentStatus: newDetails.paymentStatus ?? v.paymentStatus,
                updatedAt: new Date().toISOString(),
              };
            }
            return v;
          });
          saveState('vehicles', updated);
          return updated;
        });
      }

      // Update task with financial details
      if (taskIdToComplete) {
        setTasks((prev) => {
          const updated = prev.map((t) => {
            if (t.id === taskIdToComplete) {
              return {
                ...t,
                status: 'COMPLETED' as const,
                completedAt: new Date().toISOString(),
                completedBy: userId,
                completionNotes: newDetails.notes || `Renewal completed with new expiry: ${newDetails.newExpiryDate}`,
                estimatedCost: newDetails.newAmount,
                amountReceived: newDetails.amountReceived,
                balanceAmount: newDetails.balanceAmount,
                paymentStatus: newDetails.paymentStatus,
                updatedAt: new Date().toISOString(),
              };
            }
            return t;
          });
          saveState('tasks', updated);
          return updated;
        });
      }

      return newDocId;
    }
  };

  // TASKS CRUD
  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> => {
    const creatorId = currentUser?.id || 'system';

    if (isFirebaseConfigured) {
      return await addTaskDoc(taskData, creatorId);
    } else {
      // Local duplicate task check (Section 12)
      if (taskData.documentId && taskData.vehicleId) {
        const existing = tasks.find(
          (t) =>
            t.vehicleId === taskData.vehicleId &&
            t.documentId === taskData.documentId &&
            (t.status === 'PENDING' || t.status === 'CLIENT_CONTACTED' || t.status === 'PROCESSING')
        );
        if (existing) {
          throw new Error('An active task already exists for this vehicle renewal follow-up.');
        }
      }

      const id = `task_${Date.now()}`;
      const newTask: Task = {
        ...taskData,
        id,
        createdBy: creatorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks((prev) => {
        const updated = [newTask, ...prev];
        saveState('tasks', updated);
        return updated;
      });
      return id;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (isFirebaseConfigured) {
      await updateTaskDoc(id, updates);
    } else {
      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        );
        saveState('tasks', updated);
        return updated;
      });
    }
  };

  const completeTask = async (id: string, notes?: string) => {
    if (isFirebaseConfigured) {
      await completeTaskDoc(id, currentUser?.id || 'system', notes);
    } else {
      setTasks((prev) => {
        const updated = prev.map((t) => {
          if (t.id === id) {
            return {
              ...t,
              status: 'COMPLETED' as const,
              completedAt: new Date().toISOString(),
              completedBy: currentUser?.id || 'system',
              completionNotes: notes || t.completionNotes,
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        });
        saveState('tasks', updated);
        return updated;
      });
    }
  };

  const deleteTask = async (id: string) => {
    if (isFirebaseConfigured) {
      await deleteTaskDoc(id);
    } else {
      setTasks((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        saveState('tasks', updated);
        return updated;
      });
    }
  };

  const addAgent = async (
    agentData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>,
    password?: string
  ): Promise<string> => {
    if (isFirebaseConfigured) {
      if (password && password.trim().length >= 6) {
        try {
          const created = await createStaffAccount(
            agentData.email,
            password.trim(),
            agentData.name,
            agentData.mobile,
            agentData.role
          );
          return created.id;
        } catch (err) {
          console.warn('Firebase Auth user creation fallback to Firestore doc:', err);
          return await addUserDoc(agentData);
        }
      }
      return await addUserDoc(agentData);
    } else {
      const id = `user_${Date.now()}`;
      const newAgent: User = {
        ...agentData,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUsers((prev) => {
        const updated = [newAgent, ...prev];
        saveState('users', updated);
        return updated;
      });
      return id;
    }
  };

  const updateAgent = async (id: string, updates: Partial<User>) => {
    if (isFirebaseConfigured) {
      await updateUserDoc(id, updates);
    } else {
      setUsers((prev) => {
        const updated = prev.map((u) => (u.id === id ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u));
        saveState('users', updated);
        return updated;
      });
    }
  };

  const deleteAgent = async (id: string) => {
    if (isFirebaseConfigured) {
      await deleteUserDoc(id);
    } else {
      setUsers((prev) => {
        const updated = prev.filter((u) => u.id !== id);
        saveState('users', updated);
        return updated;
      });
    }
  };

  // NOTIFICATIONS
  const markNotificationAsRead = async (id: string) => {
    if (isFirebaseConfigured) {
      await markNotificationReadDoc(id);
    } else {
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
        saveState('notifications', updated);
        return updated;
      });
    }
  };

  const markAllNotificationsRead = async () => {
    if (isFirebaseConfigured) {
      if (currentUser) await markAllNotificationsReadDoc(currentUser.id);
    } else {
      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, isRead: true }));
        saveState('notifications', updated);
        return updated;
      });
    }
  };

  const clearAllNotifications = async () => {
    if (isFirebaseConfigured && currentUser) {
      await clearAllNotificationsDoc(currentUser.id);
    }
    setNotifications((prev) => {
      const updated = isAgent ? prev.filter((n) => n.userId !== agentId) : [];
      saveState('notifications', updated);
      return updated;
    });
  };

  const deleteNotification = async (id: string) => {
    if (isFirebaseConfigured) {
      await deleteNotificationDoc(id);
    }
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveState('notifications', updated);
      return updated;
    });
  };

  // SETTINGS
  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    if (isFirebaseConfigured) {
      await updateSystemSettingsDoc(newSettings);
      setSettings((prev) => ({ ...prev, ...newSettings }));
    } else {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        saveState('settings', updated);
        return updated;
      });
    }
  };

  // Evaluate dynamic renewal statuses
  const evaluatedDocuments = useMemo(() => {
    return documents.map((doc) => ({
      ...doc,
      status: calculateRenewalStatus(doc.expiryDate, doc.reminderDays, doc.isHistorical),
    }));
  }, [documents]);

  // Automated Compliance Expiry & Multi-Task Generator
  useEffect(() => {
    if (isLoading || documents.length === 0 || vehicles.length === 0) return;

    const dueDocs = evaluatedDocuments.filter(
      (d) =>
        !d.isHistorical &&
        d.expiryDate &&
        (d.status === 'DUE_SOON' || d.status === 'DUE_TODAY' || d.status === 'OVERDUE')
    );

    if (dueDocs.length === 0) return;

    const newTasksToAdd: Task[] = [];
    const newNotifsToAdd: Notification[] = [];
    const newLogsToAdd: ActivityLog[] = [];

    dueDocs.forEach((doc) => {
      const veh = vehicles.find((v) => v.id === doc.vehicleId);
      if (!veh || veh.status === 'INACTIVE') return;

      const client = clients.find((c) => c.id === doc.clientId);
      const targetAgentId = veh.assignedAgentId || users.find((u) => u.role === 'AGENT')?.id || 'agent';
      const agent = users.find((u) => u.id === targetAgentId);

      // Check if an active task exists for this vehicle's specific document
      const alreadyHasTask = tasks.concat(newTasksToAdd).some(
        (t) =>
          t.documentId === doc.id &&
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED'
      );

      if (!alreadyHasTask) {
        const taskId = `task_auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const docLabel =
          doc.documentType === 'INSURANCE'
            ? 'Motor Insurance'
            : doc.documentType === 'FITNESS'
            ? 'Fitness Certificate'
            : doc.documentType === 'PUC'
            ? 'Pollution Certificate (PUC)'
            : doc.documentType;

        const priority = doc.status === 'OVERDUE' ? 'HIGH' : doc.status === 'DUE_TODAY' ? 'HIGH' : 'NORMAL';

        const newTask: Task = {
          id: taskId,
          clientId: doc.clientId,
          vehicleId: doc.vehicleId,
          documentId: doc.id,
          title: `${veh.registrationNumber} - ${docLabel} Renewal`,
          description: `Compliance follow-up: ${docLabel} is ${doc.status === 'OVERDUE' ? 'OVERDUE' : 'due on ' + doc.expiryDate}. Please contact ${client?.name || 'Client'} (${client?.mobile || 'No contact phone'}) to arrange renewal quotation and collection.`,
          assignedTo: targetAgentId,
          dueDate: doc.expiryDate || new Date().toISOString().split('T')[0],
          priority,
          status: 'PENDING',
          notes: `System generated compliance alert (${doc.status})`,
          createdBy: 'system',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newTasksToAdd.push(newTask);

        // In-App Notification for Assigned Agent
        newNotifsToAdd.push({
          id: `notif_${Date.now()}_agent_${newNotifsToAdd.length}`,
          userId: targetAgentId,
          title: `Renewal Assigned: ${veh.registrationNumber}`,
          message: `${docLabel} is ${doc.status} (Expires: ${doc.expiryDate}). Immediate follow-up required.`,
          type: 'TASK_ASSIGNED',
          relatedVehicleId: veh.id,
          relatedTaskId: taskId,
          isRead: false,
          createdAt: new Date().toISOString(),
        });

        // In-App Notification for Admin
        const adminUser = users.find((u) => u.role === 'ADMIN');
        if (adminUser && adminUser.id !== targetAgentId) {
          newNotifsToAdd.push({
            id: `notif_${Date.now()}_admin_${newNotifsToAdd.length}`,
            userId: adminUser.id,
            title: `Compliance Due: ${veh.registrationNumber}`,
            message: `${docLabel} is ${doc.status}. Assigned to ${agent?.name || 'Agent'}.`,
            type: doc.status === 'OVERDUE' ? 'OVERDUE' : 'RENEWAL_DUE',
            relatedVehicleId: veh.id,
            relatedTaskId: taskId,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }

        // Email Alert Simulation Log
        newLogsToAdd.push({
          id: `log_email_${Date.now()}_${newLogsToAdd.length}`,
          userId: 'system',
          userName: 'Alert Engine',
          action: 'EMAIL_DISPATCHED',
          entityType: 'DOCUMENT',
          entityId: doc.id,
          description: `Dispatched renewal alert emails to Admin (${adminUser?.email || 'admin@apexmotors.com'}), Agent (${agent?.email || 'agent@apexmotors.com'}), and Client (${client?.email || client?.mobile}) for ${veh.registrationNumber} ${docLabel}.`,
          createdAt: new Date().toISOString(),
        });
      }
    });

    if (newTasksToAdd.length > 0) {
      setTasks((prev) => {
        const updated = [...newTasksToAdd, ...prev];
        saveState('tasks', updated);
        return updated;
      });

      if (newNotifsToAdd.length > 0) {
        setNotifications((prev) => {
          const updated = [...newNotifsToAdd, ...prev];
          saveState('notifications', updated);
          return updated;
        });
      }

      if (newLogsToAdd.length > 0) {
        setActivityLogs((prev) => {
          const updated = [...newLogsToAdd, ...prev];
          saveState('activityLogs', updated);
          return updated;
        });
      }
    }
  }, [evaluatedDocuments, vehicles, clients, users, isLoading]);

  // ROLE-BASED FILTERED VIEWS (Sections 7, 8, 9, 37, 38)
  const isAgent = currentUser?.role === 'AGENT';
  const agentId = currentUser?.id;

  const filteredClients = useMemo(() => {
    if (!isAgent) return clients;
    return clients.filter((c) => c.assignedAgentId === agentId);
  }, [clients, isAgent, agentId]);

  const filteredVehicles = useMemo(() => {
    if (!isAgent) return vehicles;
    const clientIds = new Set(filteredClients.map((c) => c.id));
    return vehicles.filter((v) => v.assignedAgentId === agentId || clientIds.has(v.clientId));
  }, [vehicles, isAgent, agentId, filteredClients]);

  const filteredDocuments = useMemo(() => {
    if (!isAgent) return evaluatedDocuments;
    const vehicleIds = new Set(filteredVehicles.map((v) => v.id));
    return evaluatedDocuments.filter((d) => vehicleIds.has(d.vehicleId));
  }, [evaluatedDocuments, isAgent, filteredVehicles]);

  const filteredTasks = useMemo(() => {
    if (!isAgent) return tasks;
    return tasks.filter((t) => t.assignedTo === agentId);
  }, [tasks, isAgent, agentId]);

  const filteredNotifications = useMemo(() => {
    if (!isAgent) return notifications;
    return notifications.filter((n) => n.userId === agentId);
  }, [notifications, isAgent, agentId]);

  const unreadNotificationCount = useMemo(() => {
    return filteredNotifications.filter((n) => !n.isRead).length;
  }, [filteredNotifications]);

  // Global search
  const searchGlobal = (query: string) => {
    const q = query.trim().toLowerCase();
    const normalizedQ = normalizeRegistrationNumber(query);

    if (!q) {
      return { vehicles: [], clients: [], documents: [] };
    }

    const matchedVehicles = filteredVehicles.filter(
      (v) =>
        v.normalizedRegistrationNumber.includes(normalizedQ) ||
        v.registrationNumber.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.chassisNumber && v.chassisNumber.toLowerCase().includes(q))
    );

    const matchedClients = filteredClients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (c.email && c.email.toLowerCase().includes(q))
    );

    const matchedDocs = filteredDocuments.filter(
      (d) =>
        (d.documentNumber && d.documentNumber.toLowerCase().includes(q)) ||
        d.documentType.toLowerCase().includes(q) ||
        (d.insuranceProvider && d.insuranceProvider.toLowerCase().includes(q))
    );

    return {
      vehicles: matchedVehicles,
      clients: matchedClients,
      documents: matchedDocs,
    };
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        clients,
        vehicles,
        documents: evaluatedDocuments,
        tasks,
        notifications,
        activityLogs,
        settings,
        isLoading,
        isFirebaseActive,
        firebaseConfigError,
        loginStaff,
        logout,
        updateUserProfile,
        addClient,
        updateClient,
        deactivateClient,
        deleteClient,
        addVehicle,
        updateVehicle,
        deactivateVehicle,
        deleteVehicle,
        addDocument,
        updateDocument,
        deleteDocument,
        completeRenewalCycle,
        addTask,
        updateTask,
        completeTask,
        deleteTask,
        addAgent,
        updateAgent,
        deleteAgent,
        unreadNotificationCount,
        markNotificationAsRead,
        markAllNotificationsRead,
        clearAllNotifications,
        deleteNotification,
        updateSettings,
        filteredClients,
        filteredVehicles,
        filteredDocuments,
        filteredTasks,
        filteredNotifications,
        searchGlobal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
