import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBw-LL1bmQ9FDTkR8Onr19VUtHtJZMJZR0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "vehicle-management-syste-f7254.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vehicle-management-syste-f7254",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "vehicle-management-syste-f7254.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "568137453217",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:568137453217:web:53b880b28ca32624146ae0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const now = new Date();
const formatDateOffset = (days) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const isoDateOffset = (days, hours = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
};

async function seed() {
  console.log('--- Seeding Apex Motor Consultancy Production Database ---');
  console.log('Project ID:', firebaseConfig.projectId);

  // Authenticate as Admin
  console.log('\n1. Authenticating as administrator (admin@gmail.com)...');
  const userCred = await signInWithEmailAndPassword(auth, 'admin@gmail.com', 'password');
  const adminUid = userCred.user.uid;
  console.log('Authenticated successfully! Admin UID:', adminUid);

  const agentRahmanId = 'user_agent_rahman';
  const agentSureshId = 'user_agent_suresh';

  // 1. Users
  console.log('\n2. Seeding Users (Admin + 2 Agents)...');
  const users = [
    {
      id: adminUid,
      name: 'Administrator',
      email: 'admin@gmail.com',
      mobile: '+91 98470 00001',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: isoDateOffset(-90),
      updatedAt: isoDateOffset(-1),
    },
    {
      id: agentRahmanId,
      name: 'Rahman (Field Agent)',
      email: 'rahman@apexmotors.com',
      mobile: '+91 98470 12345',
      role: 'AGENT',
      status: 'ACTIVE',
      createdAt: isoDateOffset(-60),
      updatedAt: isoDateOffset(-5),
    },
    {
      id: agentSureshId,
      name: 'Suresh Kumar (Senior Agent)',
      email: 'suresh@apexmotors.com',
      mobile: '+91 94470 54321',
      role: 'AGENT',
      status: 'ACTIVE',
      createdAt: isoDateOffset(-45),
      updatedAt: isoDateOffset(-2),
    },
  ];

  for (const u of users) {
    await setDoc(doc(db, 'users', u.id), u, { merge: true });
    console.log(`  ✓ User: ${u.name} (${u.role})`);
  }

  // 2. Settings
  console.log('\n3. Seeding Agency Global Settings...');
  const settings = {
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
    updatedAt: now.toISOString(),
  };
  await setDoc(doc(db, 'settings', 'global'), settings, { merge: true });
  console.log('  ✓ Agency Global Settings initialized.');

  // 3. Clients
  console.log('\n4. Seeding Clients (5 Realistic Client Profiles)...');
  const clients = [
    {
      id: 'client_1',
      name: 'Mohammed Ali',
      mobile: '+91 98471 23456',
      alternateMobile: '+91 98471 99999',
      address: 'Baitul Noor, Bypass Road, Perinthalmanna, Kerala 679322',
      email: 'mohammed.ali@example.com',
      assignedAgentId: agentRahmanId,
      status: 'ACTIVE',
      notes: 'VIP Client. Operates private fleet and delivery services. Prefers WhatsApp updates.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-60),
      updatedAt: isoDateOffset(-2),
    },
    {
      id: 'client_2',
      name: 'Fatima Zahra',
      mobile: '+91 97455 88990',
      alternateMobile: '+91 97455 11223',
      address: 'Green Meadows, Down Hill, Malappuram, Kerala 676505',
      email: 'fatima.zahra@example.com',
      assignedAgentId: agentRahmanId,
      status: 'ACTIVE',
      notes: 'Personal electric SUV and family luxury sedan.',
      createdBy: agentRahmanId,
      createdAt: isoDateOffset(-45),
      updatedAt: isoDateOffset(-10),
    },
    {
      id: 'client_3',
      name: 'Rajesh Varma (Varma Logistics)',
      mobile: '+91 94470 11223',
      alternateMobile: '+91 94470 33445',
      address: 'Plot 14, Industrial Estate, Mavoor Road, Kozhikode, Kerala 673004',
      email: 'rajesh.varma@varmalogistics.in',
      assignedAgentId: agentSureshId,
      status: 'ACTIVE',
      notes: 'Commercial transport operator with heavy multi-axle tippers and goods carriers.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-50),
      updatedAt: isoDateOffset(-1),
    },
    {
      id: 'client_4',
      name: 'Al-Madina Cargo & Parcel Service',
      mobile: '+91 98460 77889',
      alternateMobile: '+91 98460 22334',
      address: 'Near Old Bus Stand, Tirur, Malappuram, Kerala 676101',
      email: 'almadinacargo@gmail.com',
      assignedAgentId: agentRahmanId,
      status: 'ACTIVE',
      notes: 'Light commercial vehicle fleet. Requires timely quarterly tax and fitness renewals.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-30),
      updatedAt: isoDateOffset(-5),
    },
    {
      id: 'client_5',
      name: 'Dr. Hariprasad Nair',
      mobile: '+91 94461 44556',
      alternateMobile: '',
      address: 'Ayurveda College Junction, Kottakkal, Malappuram, Kerala 676503',
      email: 'dr.hariprasad@nairhospital.org',
      assignedAgentId: agentSureshId,
      status: 'ACTIVE',
      notes: 'Doctor at Kottakkal. Highly punctual with annual comprehensive insurance.',
      createdBy: agentSureshId,
      createdAt: isoDateOffset(-20),
      updatedAt: isoDateOffset(-3),
    },
  ];

  for (const c of clients) {
    await setDoc(doc(db, 'clients', c.id), c, { merge: true });
    console.log(`  ✓ Client: ${c.name} (${c.id})`);
  }

  // 4. Vehicles
  console.log('\n5. Seeding Vehicles (7 Diverse Fleet Units)...');
  const vehicles = [
    {
      id: 'veh_1',
      clientId: 'client_1',
      registrationNumber: 'KL-10-AB-1234',
      normalizedRegistrationNumber: 'KL10AB1234',
      vehicleType: 'PRIVATE_CAR',
      vehicleClass: 'Motor Car (LMV)',
      make: 'Toyota',
      model: 'Innova Crysta',
      variant: '2.4 VX 7-Seater',
      fuelType: 'DIESEL',
      manufacturingYear: 2021,
      registrationDate: '2021-04-12',
      chassisNumber: 'MBJ11BB4001234567',
      engineNumber: '2GDF9876543',
      rto: 'KL-10 Perinthalmanna',
      registrationValidity: '2036-04-11',
      assignedAgentId: agentRahmanId,
      status: 'ACTIVE',
      notes: 'VIP Family MPV. Keep insurance and PUC updated automatically.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-60),
      updatedAt: isoDateOffset(-2),
    },
    {
      id: 'veh_2',
      clientId: 'client_1',
      registrationNumber: 'KL-10-CD-5678',
      normalizedRegistrationNumber: 'KL10CD5678',
      vehicleType: 'COMMERCIAL_TAXI',
      vehicleClass: 'Motor Cab (LMV)',
      make: 'Maruti Suzuki',
      model: 'Dzire Tour',
      variant: 'VXI CNG',
      fuelType: 'CNG',
      manufacturingYear: 2022,
      registrationDate: '2022-08-20',
      chassisNumber: 'MA3EAA12S00998877',
      engineNumber: 'K12N882211',
      rto: 'KL-10 Perinthalmanna',
      registrationValidity: '2037-08-19',
      assignedAgentId: agentRahmanId,
      status: 'ACTIVE',
      notes: 'Contract carriage taxi on airport circuit. Fitness inspection due annually.',
      createdBy: agentRahmanId,
      createdAt: isoDateOffset(-55),
      updatedAt: isoDateOffset(-5),
    },
    {
      id: 'veh_3',
      clientId: 'client_1',
      registrationNumber: 'KL-11-EF-9999',
      normalizedRegistrationNumber: 'KL11EF9999',
      vehicleType: 'GOODS_CARRIER',
      vehicleClass: 'Goods Carrier (LGV)',
      make: 'Ashok Leyland',
      model: 'Bada Dost',
      variant: 'i4 Diesel LWB',
      fuelType: 'DIESEL',
      manufacturingYear: 2023,
      registrationDate: '2023-01-10',
      chassisNumber: 'MB1DCA34N00112233',
      engineNumber: 'P15F773344',
      rto: 'KL-11 Kozhikode',
      registrationValidity: '2038-01-09',
      assignedAgentId: agentRahmanId,
      status: 'ACTIVE',
      notes: 'Inter-district parcel van. Quarterly road tax cycle.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-50),
      updatedAt: isoDateOffset(-4),
    },
    {
      id: 'veh_4',
      clientId: 'client_2',
      registrationNumber: 'KL-55-XY-4321',
      normalizedRegistrationNumber: 'KL55XY4321',
      vehicleType: 'PRIVATE_CAR',
      vehicleClass: 'Motor Car (Electric)',
      make: 'Tata',
      model: 'Nexon EV',
      variant: 'Empowered Plus LR',
      fuelType: 'ELECTRIC',
      manufacturingYear: 2024,
      registrationDate: '2024-03-15',
      chassisNumber: 'MAT625000R1234567',
      engineNumber: 'EM543210',
      rto: 'KL-55 Tirur',
      registrationValidity: '2039-03-14',
      assignedAgentId: agentRahmanId,
      status: 'ACTIVE',
      notes: 'Zero emission EV. Kerala road tax concession active.',
      createdBy: agentRahmanId,
      createdAt: isoDateOffset(-45),
      updatedAt: isoDateOffset(-10),
    },
    {
      id: 'veh_5',
      clientId: 'client_3',
      registrationNumber: 'KL-07-ZZ-7788',
      normalizedRegistrationNumber: 'KL07ZZ7788',
      vehicleType: 'GOODS_CARRIER',
      vehicleClass: 'Heavy Goods Vehicle',
      make: 'Tata',
      model: 'Signa 2823.K',
      variant: 'Tipper 16 CuM',
      fuelType: 'DIESEL',
      manufacturingYear: 2020,
      registrationDate: '2020-06-10',
      chassisNumber: 'MAT445000P9988776',
      engineNumber: 'CUMMINS6BT9911',
      rto: 'KL-07 Ernakulam',
      registrationValidity: '2035-06-09',
      assignedAgentId: agentSureshId,
      status: 'ACTIVE',
      notes: 'Heavy mining/quarry tipper. Fitness test and speed governor calibration required.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-50),
      updatedAt: isoDateOffset(-1),
    },
    {
      id: 'veh_6',
      clientId: 'client_4',
      registrationNumber: 'KL-55-BM-3344',
      normalizedRegistrationNumber: 'KL55BM3344',
      vehicleType: 'GOODS_CARRIER',
      vehicleClass: 'Light Goods Vehicle',
      make: 'Mahindra',
      model: 'Bolero Maxi Truck Plus',
      variant: 'm2DiCR 1.2T',
      fuelType: 'DIESEL',
      manufacturingYear: 2022,
      registrationDate: '2022-11-05',
      chassisNumber: 'MA1TC2B40N908172',
      engineNumber: 'DI7452901',
      rto: 'KL-55 Tirur',
      registrationValidity: '2037-11-04',
      assignedAgentId: agentRahmanId,
      status: 'ACTIVE',
      notes: 'Daily wholesale market cargo transporter.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-30),
      updatedAt: isoDateOffset(-5),
    },
    {
      id: 'veh_7',
      clientId: 'client_5',
      registrationNumber: 'KL-10-BQ-5005',
      normalizedRegistrationNumber: 'KL10BQ5005',
      vehicleType: 'PRIVATE_CAR',
      vehicleClass: 'Motor Car (LMV)',
      make: 'Hyundai',
      model: 'Creta',
      variant: 'SX(O) 1.5 Turbo Petrol DCT',
      fuelType: 'PETROL',
      manufacturingYear: 2023,
      registrationDate: '2023-05-18',
      chassisNumber: 'MALC181CLPM109283',
      engineNumber: 'G4FP592019',
      rto: 'KL-10 Perinthalmanna',
      registrationValidity: '2038-05-17',
      assignedAgentId: agentSureshId,
      status: 'ACTIVE',
      notes: 'Doctor personal vehicle. Comprehensive policy with return-to-invoice cover.',
      createdBy: agentSureshId,
      createdAt: isoDateOffset(-20),
      updatedAt: isoDateOffset(-3),
    },
  ];

  for (const v of vehicles) {
    await setDoc(doc(db, 'vehicles', v.id), v, { merge: true });
    console.log(`  ✓ Vehicle: ${v.registrationNumber} - ${v.make} ${v.model}`);
  }

  // 5. Vehicle Documents (Realistic mix of Overdue, Due Soon, and Active)
  console.log('\n6. Seeding Vehicle Documents (Insurance, Tax, PUC, Fitness, Permit)...');
  const documents = [
    // --- KL-10-AB-1234 (Toyota Innova) ---
    {
      id: 'doc_1',
      vehicleId: 'veh_1',
      clientId: 'client_1',
      documentType: 'INSURANCE',
      documentNumber: 'POL-ORI-2025-981244',
      startDate: formatDateOffset(-358),
      expiryDate: formatDateOffset(7), // DUE SOON in 7 days!
      insuranceProvider: 'Oriental Insurance Co.',
      policyType: 'COMPREHENSIVE',
      amount: 28450,
      reminderDays: 30,
      status: 'DUE_SOON',
      fileName: 'innova_insurance_policy.pdf',
      fileUrl: '/sample-docs/innova_insurance.pdf',
      notes: 'Zero-dep policy with engine protector add-on. Client requested renewal quotation.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-60),
      updatedAt: isoDateOffset(-2),
    },
    {
      id: 'doc_2',
      vehicleId: 'veh_1',
      clientId: 'client_1',
      documentType: 'PUC',
      documentNumber: 'PUC-KL10-2026-7890',
      issueDate: formatDateOffset(-184),
      expiryDate: formatDateOffset(-4), // OVERDUE by 4 days!
      testCenter: 'Green Park Auto Emission Centre, Perinthalmanna',
      amount: 150,
      reminderDays: 15,
      status: 'OVERDUE',
      fileName: 'innova_puc_test.pdf',
      notes: 'Expired 4 days ago. Urgent client follow-up needed.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-60),
      updatedAt: isoDateOffset(-4),
    },
    {
      id: 'doc_3',
      vehicleId: 'veh_1',
      clientId: 'client_1',
      documentType: 'RC',
      documentNumber: 'RC-KL10-AB-1234',
      issueDate: '2021-04-12',
      expiryDate: '2036-04-11',
      amount: 600,
      reminderDays: 60,
      status: 'ACTIVE',
      notes: 'Original smart card RC with Hypothecation clear endorsement.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-60),
      updatedAt: isoDateOffset(-60),
    },

    // --- KL-10-CD-5678 (Maruti Dzire Taxi) ---
    {
      id: 'doc_4',
      vehicleId: 'veh_2',
      clientId: 'client_1',
      documentType: 'INSURANCE',
      documentNumber: 'POL-NIC-2025-110293',
      startDate: formatDateOffset(-360),
      expiryDate: formatDateOffset(5), // DUE SOON in 5 days!
      insuranceProvider: 'National Insurance Company',
      policyType: 'COMMERCIAL_THIRD_PARTY',
      amount: 16800,
      reminderDays: 30,
      status: 'DUE_SOON',
      notes: 'Commercial taxi passenger liability package policy.',
      createdBy: agentRahmanId,
      createdAt: isoDateOffset(-55),
      updatedAt: isoDateOffset(-2),
    },
    {
      id: 'doc_5',
      vehicleId: 'veh_2',
      clientId: 'client_1',
      documentType: 'FITNESS',
      documentNumber: 'FC-KL10-2025-4491',
      issueDate: formatDateOffset(-365),
      expiryDate: formatDateOffset(0), // DUE TODAY!
      fitnessType: 'Motor Cab Commercial Fitness Certificate',
      amount: 2200,
      reminderDays: 30,
      status: 'DUE_SOON',
      notes: 'Physical vehicle inspection scheduled at RTO test track today.',
      createdBy: agentRahmanId,
      createdAt: isoDateOffset(-55),
      updatedAt: isoDateOffset(-1),
    },
    {
      id: 'doc_6',
      vehicleId: 'veh_2',
      clientId: 'client_1',
      documentType: 'PERMIT',
      documentNumber: 'PER-TAXI-KL10-9912',
      issueDate: formatDateOffset(-300),
      expiryDate: formatDateOffset(65),
      permitType: 'All Kerala Contract Carriage Taxi Permit',
      amount: 5500,
      reminderDays: 30,
      status: 'ACTIVE',
      notes: 'Contract carriage permit valid across all Kerala districts.',
      createdBy: agentRahmanId,
      createdAt: isoDateOffset(-55),
      updatedAt: isoDateOffset(-55),
    },

    // --- KL-11-EF-9999 (Goods Carrier) ---
    {
      id: 'doc_7',
      vehicleId: 'veh_3',
      clientId: 'client_1',
      documentType: 'ROAD_TAX',
      documentNumber: 'TAX-QTR-KL11-9999-Q1',
      lastPaymentDate: formatDateOffset(-88),
      expiryDate: formatDateOffset(2), // DUE SOON in 2 days!
      validityValue: 3,
      validityUnit: 'MONTHS',
      amount: 3400,
      reminderDays: 15,
      status: 'DUE_SOON',
      notes: 'Quarterly goods transport road tax for Kozhikode RTO.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-50),
      updatedAt: isoDateOffset(-1),
    },

    // --- KL-55-XY-4321 (Tata Nexon EV) ---
    {
      id: 'doc_8',
      vehicleId: 'veh_4',
      clientId: 'client_2',
      documentType: 'INSURANCE',
      documentNumber: 'POL-DIG-2025-442299',
      startDate: formatDateOffset(-200),
      expiryDate: formatDateOffset(165),
      insuranceProvider: 'GoDigit General Insurance',
      policyType: 'COMPREHENSIVE',
      amount: 21500,
      reminderDays: 30,
      status: 'ACTIVE',
      notes: 'EV battery protection & roadside assistance rider included.',
      createdBy: agentRahmanId,
      createdAt: isoDateOffset(-45),
      updatedAt: isoDateOffset(-45),
    },

    // --- KL-07-ZZ-7788 (Tata Signa Heavy Tipper) ---
    {
      id: 'doc_9',
      vehicleId: 'veh_5',
      clientId: 'client_3',
      documentType: 'FITNESS',
      documentNumber: 'FC-KL07-2025-8811',
      issueDate: formatDateOffset(-372),
      expiryDate: formatDateOffset(-7), // OVERDUE by 7 days!
      fitnessType: 'Heavy Commercial Goods Vehicle (Multi-Axle)',
      amount: 4500,
      reminderDays: 30,
      status: 'OVERDUE',
      notes: 'Overdue by 7 days. Brake test, smoke opacity test, and reflective tape inspection needed.',
      createdBy: agentSureshId,
      createdAt: isoDateOffset(-50),
      updatedAt: isoDateOffset(-7),
    },
    {
      id: 'doc_10',
      vehicleId: 'veh_5',
      clientId: 'client_3',
      documentType: 'ROAD_TAX',
      documentNumber: 'TAX-ANNUAL-KL07-ZZ7788',
      lastPaymentDate: formatDateOffset(-370),
      expiryDate: formatDateOffset(-5), // OVERDUE by 5 days!
      validityValue: 1,
      validityUnit: 'YEARS',
      amount: 28500,
      reminderDays: 30,
      status: 'OVERDUE',
      notes: 'Annual heavy vehicle road tax overdue. Late penalty accumulating daily.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-50),
      updatedAt: isoDateOffset(-5),
    },

    // --- KL-55-BM-3344 (Mahindra Bolero Maxi Truck) ---
    {
      id: 'doc_11',
      vehicleId: 'veh_6',
      clientId: 'client_4',
      documentType: 'PUC',
      documentNumber: 'PUC-KL55-2026-3312',
      issueDate: formatDateOffset(-178),
      expiryDate: formatDateOffset(12), // DUE SOON in 12 days
      testCenter: 'Tirur Highway Emission Testing Centre',
      amount: 120,
      reminderDays: 15,
      status: 'DUE_SOON',
      notes: 'Light goods vehicle diesel smoke check due before month-end.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-30),
      updatedAt: isoDateOffset(-2),
    },

    // --- KL-10-BQ-5005 (Hyundai Creta) ---
    {
      id: 'doc_12',
      vehicleId: 'veh_7',
      clientId: 'client_5',
      documentType: 'INSURANCE',
      documentNumber: 'POL-ICICI-2025-776655',
      startDate: formatDateOffset(-120),
      expiryDate: formatDateOffset(245),
      insuranceProvider: 'ICICI Lombard General Insurance',
      policyType: 'COMPREHENSIVE',
      amount: 23800,
      reminderDays: 30,
      status: 'ACTIVE',
      notes: 'Comprehensive coverage with zero-dep and consumables cover.',
      createdBy: agentSureshId,
      createdAt: isoDateOffset(-20),
      updatedAt: isoDateOffset(-20),
    },
  ];

  for (const d of documents) {
    await setDoc(doc(db, 'vehicleDocuments', d.id), d, { merge: true });
    console.log(`  ✓ Document: ${d.documentType} (${d.status}) - ${d.documentNumber}`);
  }

  // 6. Tasks
  console.log('\n7. Seeding Operational Tasks & Follow-up Workflows...');
  const tasks = [
    {
      id: 'task_1',
      clientId: 'client_1',
      vehicleId: 'veh_1',
      documentId: 'doc_1',
      title: 'Insurance Renewal Follow-up: Innova KL-10-AB-1234',
      description: 'Call Mohammed Ali regarding Oriental Insurance policy expiring in 7 days. Provide premium quote and NCB discount options.',
      assignedTo: agentRahmanId,
      dueDate: formatDateOffset(3),
      status: 'PENDING',
      priority: 'HIGH',
      notes: 'Client prefers digital payment and policy delivered via WhatsApp.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-5),
      updatedAt: isoDateOffset(-1),
    },
    {
      id: 'task_2',
      clientId: 'client_1',
      vehicleId: 'veh_1',
      documentId: 'doc_2',
      title: 'URGENT: Overdue PUC Emission Test for Innova KL-10-AB-1234',
      description: 'PUC is already 4 days overdue. Contact client immediately to send vehicle to nearby testing center to avoid Rs. 2,000 traffic fine.',
      assignedTo: agentRahmanId,
      dueDate: formatDateOffset(0),
      status: 'CLIENT_CONTACTED',
      priority: 'HIGH',
      notes: 'Called client today morning; driver promised to get emission tested before 3 PM.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-2),
      updatedAt: isoDateOffset(0),
    },
    {
      id: 'task_3',
      clientId: 'client_1',
      vehicleId: 'veh_2',
      documentId: 'doc_5',
      title: 'RTO Fitness Track Inspection: Dzire Taxi KL-10-CD-5678',
      description: 'Coordinate physical vehicle inspection at Perinthalmanna RTO track today. Check speed governor and fare meter seal.',
      assignedTo: agentRahmanId,
      dueDate: formatDateOffset(0),
      status: 'PROCESSING',
      priority: 'HIGH',
      notes: 'Vehicle arrived at testing ground. Waiting for Motor Vehicle Inspector (MVI) signature.',
      createdBy: agentRahmanId,
      createdAt: isoDateOffset(-3),
      updatedAt: isoDateOffset(0),
    },
    {
      id: 'task_4',
      clientId: 'client_3',
      vehicleId: 'veh_5',
      documentId: 'doc_9',
      title: 'URGENT: Heavy Tipper Fitness Inspection & Tax Clearance',
      description: 'Signa 2823.K tipper has overdue fitness (7 days) and overdue road tax (5 days). Collect tax payment and arrange RTO fitness slot.',
      assignedTo: agentSureshId,
      dueDate: formatDateOffset(1),
      status: 'PENDING',
      priority: 'HIGH',
      notes: 'Quarry operations stalled until RTO receipt is generated. High commercial priority.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-3),
      updatedAt: isoDateOffset(-1),
    },
    {
      id: 'task_5',
      clientId: 'client_1',
      vehicleId: 'veh_3',
      documentId: 'doc_7',
      title: 'Quarterly Road Tax Payment: Ashok Leyland Bada Dost',
      description: 'Prepare Vahan tax challan of Rs. 3,400 for KL-11-EF-9999 before deadline in 2 days.',
      assignedTo: agentRahmanId,
      dueDate: formatDateOffset(2),
      status: 'PENDING',
      priority: 'MEDIUM',
      notes: 'Client authorized online payment via UPI.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-1),
      updatedAt: isoDateOffset(-1),
    },
    {
      id: 'task_6',
      clientId: 'client_4',
      vehicleId: 'veh_6',
      documentId: 'doc_11',
      title: 'Routine Emission Certificate Reminder: Bolero KL-55-BM-3344',
      description: 'Send automated WhatsApp message for PUC expiry in 12 days to Al-Madina Cargo manager.',
      assignedTo: agentRahmanId,
      dueDate: formatDateOffset(7),
      status: 'COMPLETED',
      priority: 'LOW',
      notes: 'WhatsApp notification sent and acknowledged by fleet manager.',
      createdBy: adminUid,
      createdAt: isoDateOffset(-5),
      updatedAt: isoDateOffset(-2),
    },
  ];

  for (const t of tasks) {
    await setDoc(doc(db, 'tasks', t.id), t, { merge: true });
    console.log(`  ✓ Task: [${t.priority}] ${t.title} (${t.status})`);
  }

  // 7. Notifications
  console.log('\n8. Seeding In-App Notifications...');
  const notifications = [
    {
      id: 'notif_1',
      userId: adminUid,
      title: 'URGENT: Overdue Fitness & Tax',
      message: 'Heavy Tipper KL-07-ZZ-7788 (Varma Logistics) has overdue fitness (-7 days) and road tax (-5 days).',
      type: 'DOCUMENT_EXPIRING',
      linkUrl: '/vehicles/veh_5',
      isRead: false,
      createdAt: isoDateOffset(0, 8),
    },
    {
      id: 'notif_2',
      userId: adminUid,
      title: 'Insurance Expiring in 7 Days',
      message: 'Toyota Innova Crysta KL-10-AB-1234 (Mohammed Ali) insurance policy expires on ' + formatDateOffset(7) + '.',
      type: 'DOCUMENT_EXPIRING',
      linkUrl: '/vehicles/veh_1',
      isRead: false,
      createdAt: isoDateOffset(0, 9),
    },
    {
      id: 'notif_3',
      userId: agentRahmanId,
      title: 'Task Assigned: Dzire Taxi Inspection',
      message: 'You have been assigned to coordinate RTO Fitness inspection for KL-10-CD-5678 today.',
      type: 'TASK_ASSIGNED',
      linkUrl: '/tasks',
      isRead: false,
      createdAt: isoDateOffset(0, 7),
    },
    {
      id: 'notif_4',
      userId: agentSureshId,
      title: 'High Priority Assignment',
      message: 'New task assigned: Resolve overdue fitness and road tax for Varma Logistics heavy tipper.',
      type: 'TASK_ASSIGNED',
      linkUrl: '/tasks',
      isRead: false,
      createdAt: isoDateOffset(-1, 14),
    },
  ];

  for (const n of notifications) {
    await setDoc(doc(db, 'notifications', n.id), n, { merge: true });
    console.log(`  ✓ Notification: ${n.title}`);
  }

  // 8. Activity Logs
  console.log('\n9. Seeding Audit & Activity Logs...');
  const logs = [
    {
      id: 'log_1',
      action: 'SYSTEM_SEEDED',
      entityType: 'SETTINGS',
      entityId: 'global',
      description: 'Production seed database initialized with clients, vehicles, documents, and tasks.',
      performedBy: adminUid,
      performedByName: 'Administrator',
      timestamp: now.toISOString(),
    },
    {
      id: 'log_2',
      action: 'DOCUMENT_EXPIRY_FLAGGED',
      entityType: 'DOCUMENT',
      entityId: 'doc_9',
      description: 'Document FC-KL07-2025-8811 marked OVERDUE (-7 days). Urgent task generated.',
      performedBy: 'SYSTEM',
      performedByName: 'Automated Renewal Engine',
      timestamp: isoDateOffset(-7),
    },
    {
      id: 'log_3',
      action: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: 'task_1',
      description: 'Insurance follow-up task created and assigned to Rahman (Field Agent).',
      performedBy: adminUid,
      performedByName: 'Administrator',
      timestamp: isoDateOffset(-5),
    },
  ];

  for (const l of logs) {
    await setDoc(doc(db, 'activityLogs', l.id), l, { merge: true });
    console.log(`  ✓ Activity Log: ${l.action}`);
  }

  console.log('\n==========================================================');
  console.log('✅ SEED DATA POPULATED SUCCESSFULLY ACROSS ALL MODULES!');
  console.log('   - 3 Users (Admin + 2 Agents)');
  console.log('   - 5 Clients (Individuals & Commercial Fleets)');
  console.log('   - 7 Vehicles (Cars, Taxis, LGV, EV, Heavy Tipper)');
  console.log('   - 12 Vehicle Documents (Overdue, Due Soon, Active)');
  console.log('   - 6 Operational Tasks');
  console.log('   - 4 In-App Notifications');
  console.log('   - 3 Audit Logs');
  console.log('   - 1 Global Agency Settings Document');
  console.log('==========================================================\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌ Seeding failed:', err);
  process.exit(1);
});
