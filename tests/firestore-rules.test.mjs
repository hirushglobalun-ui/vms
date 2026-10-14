/**
 * Apex Motor Consultancy ERP — Real Firestore Rules Unit Tests
 * Uses @firebase/rules-unit-testing
 *
 * Requirements:
 *   1. Java Runtime Environment (JRE 11+) installed on host machine.
 *   2. Firebase Emulator Suite running:
 *      npx firebase emulators:exec --only firestore "node tests/firestore-rules.test.mjs"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ID = 'apex-rules-gate-test';

async function runRulesSuite() {
  const rulesPath = path.resolve(__dirname, '../firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  console.log('========================================================');
  console.log(' APEX MOTOR ERP — REAL FIRESTORE RULES UNIT TEST SUITE ');
  console.log('========================================================\n');

  let testEnv;
  try {
    const emulatorHostStr = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    const [host, portStr] = emulatorHostStr.split(':');
    const port = parseInt(portStr || '8080', 10);

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: rulesContent,
        host,
        port,
      },
    });
  } catch (err) {
    console.error('\x1b[31m[ERROR] Unable to connect to Firebase Firestore Emulator.\x1b[0m');
    console.error('Details:', err.message);
    console.error('\nPREREQUISITE: Java Runtime Environment (JRE 11+) is required on the host system.');
    console.error('Command to execute once Java is installed:');
    console.error('  npx firebase emulators:exec --only firestore "node tests/firestore-rules.test.mjs"\n');
    process.exit(1);
  }

  const unauthedDb = testEnv.unauthenticatedContext().firestore();
  const adminDb = testEnv.authenticatedContext('admin_uid', { email: 'admin@apex.com' }).firestore();
  const agent1Db = testEnv.authenticatedContext('agent_1', { email: 'agent1@apex.com' }).firestore();
  const agent2Db = testEnv.authenticatedContext('agent_2', { email: 'agent2@apex.com' }).firestore();

  // Seed user profiles in emulator
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('users').doc('admin_uid').set({
      role: 'ADMIN',
      status: 'ACTIVE',
      name: 'System Admin',
      email: 'admin@apex.com',
    });
    await db.collection('users').doc('agent_1').set({
      role: 'AGENT',
      status: 'ACTIVE',
      name: 'Agent One',
      email: 'agent1@apex.com',
    });
    await db.collection('users').doc('agent_2').set({
      role: 'AGENT',
      status: 'ACTIVE',
      name: 'Agent Two',
      email: 'agent2@apex.com',
    });
    await db.collection('clients').doc('client_agent1').set({
      name: 'Client of Agent 1',
      assignedAgentId: 'agent_1',
    });
    await db.collection('vehicles').doc('veh_agent1').set({
      registrationNumber: 'KL10AZ1234',
      assignedAgentId: 'agent_1',
    });
    await db.collection('settings').doc('system_settings').set({
      companyName: 'Apex Motor Consultancy',
    });
  });

  console.log('--- 1. Unauthenticated Access Tests ---');
  await assertFails(unauthedDb.collection('clients').get());
  console.log('✔ Unauthenticated read to clients denied');
  await assertFails(unauthedDb.collection('vehicles').get());
  console.log('✔ Unauthenticated read to vehicles denied');
  await assertFails(unauthedDb.collection('users').doc('admin_uid').get());
  console.log('✔ Unauthenticated read to users denied');

  console.log('\n--- 2. Admin Permissions Tests ---');
  await assertSucceeds(adminDb.collection('settings').doc('system_settings').update({ reminderThresholdDays: 45 }));
  console.log('✔ Admin can update system settings');
  await assertSucceeds(adminDb.collection('users').doc('new_agent').set({ role: 'AGENT', status: 'ACTIVE', name: 'New' }));
  console.log('✔ Admin can create new users');

  console.log('\n--- 3. Agent Isolation & Escalation Tests ---');
  await assertFails(agent1Db.collection('settings').doc('system_settings').update({ reminderThresholdDays: 10 }));
  console.log('✔ Agent cannot update system settings');
  await assertFails(agent1Db.collection('users').doc('agent_1').update({ role: 'ADMIN' }));
  console.log('✔ Agent cannot escalate role to ADMIN');
  await assertFails(agent1Db.collection('users').doc('agent_1').update({ status: 'SUSPENDED' }));
  console.log('✔ Agent cannot alter user status');
  await assertSucceeds(agent1Db.collection('users').doc('agent_1').update({ name: 'Agent One Updated', mobile: '9847000000' }));
  console.log('✔ Agent can update personal non-sensitive profile fields (name, mobile)');

  console.log('\n--- 4. Cross-Agent Record Isolation ---');
  await assertFails(agent2Db.collection('clients').doc('client_agent1').update({ name: 'Tampered Name' }));
  console.log('✔ Agent 2 cannot update Agent 1 client record');
  await assertFails(agent2Db.collection('vehicles').doc('veh_agent1').update({ make: 'TAMPERED' }));
  console.log('✔ Agent 2 cannot update Agent 1 vehicle record');
  await assertSucceeds(agent1Db.collection('clients').doc('client_agent1').update({ name: 'Legitimate Update by Agent 1' }));
  console.log('✔ Agent 1 can update assigned client record');

  console.log('\n--- 5. Audit Log Validation & Immutability ---');
  await assertFails(agent1Db.collection('activityLogs').add({ userId: 'admin_uid', action: 'FORGED_AUDIT', details: 'test' }));
  console.log('✔ Forging audit log under another user UID is blocked');
  await assertSucceeds(agent1Db.collection('activityLogs').doc('log_legit_1').set({
    id: 'log_legit_1',
    userId: 'agent_1',
    action: 'RECORD_VIEWED',
    details: 'Viewed assigned client record',
    createdAt: new Date().toISOString(),
  }));
  console.log('✔ Legitimate user-attributed audit log is allowed');
  await assertFails(adminDb.collection('activityLogs').doc('log_1').delete());
  console.log('✔ Activity logs are strictly immutable (deletion rejected even for admin)');

  console.log('\n--- 6. Query Security & Isolation (Rules Are Not Filters) ---');
  // Agent 2 attempts to query all clients without filtering by their assignedAgentId
  await assertFails(agent2Db.collection('clients').get());
  console.log('✔ Unfiltered client query by agent is rejected (cannot query unassigned records)');
  // Agent 2 querying strictly their own records with where clause succeeds
  await assertSucceeds(agent2Db.collection('clients').where('assignedAgentId', '==', 'agent_2').get());
  console.log('✔ Properly filtered query matching assignedAgentId is permitted');
  // Agent 1 attempts to query vehicles assigned to agent 2
  await assertFails(agent1Db.collection('vehicles').where('assignedAgentId', '==', 'agent_2').get());
  console.log('✔ Query targeting another agent\'s vehicles is strictly rejected');

  console.log('\n========================================================');
  console.log(' ALL EMULATOR RULES TESTS COMPLETED SUCCESSFULLY! ');
  console.log('========================================================\n');

  await testEnv.cleanup();
}

runRulesSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
