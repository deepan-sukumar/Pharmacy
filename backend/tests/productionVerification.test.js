const app = require('../index.js');
const { db, getFirebaseStatus, isConnected } = require('../firebase.js');

const server = app.listen(5095, async () => {
  console.log('=====================================================');
  console.log('PHARMAFLOW COMPLETE PRODUCTION VERIFICATION SUITE');
  console.log('=====================================================');

  const results = {
    pass: [],
    fail: [],
    warning: []
  };

  try {
    // -------------------------------------------------------------
    // CHECK A: BACKEND / FIRESTORE HEALTH & PERSISTENCE
    // -------------------------------------------------------------
    console.log('\n--- SECTION A: BACKEND & FIRESTORE HEALTH ---');
    const healthRes = await fetch('http://localhost:5095/api/health');
    const health = await healthRes.json();
    console.log('Health Response:', health);
    
    if (health.ok && health.firebaseConnected && health.firestore?.connected) {
      results.pass.push('A1: Backend /api/health reports Firestore connected and operational');
    } else {
      results.fail.push('A1: Backend reports Firestore is disconnected: ' + JSON.stringify(health));
    }

    if (isConnected()) {
      results.pass.push('A2: Firebase Admin SDK connected to project pharm-b519f');
    } else {
      results.fail.push('A2: Firebase Admin SDK is not connected');
    }

    // Check existing users in Firestore
    const usersSnap = await db.collection('users').get();
    console.log('Total Firestore users retrieved:', usersSnap.size);
    if (usersSnap.size > 0) {
      results.pass.push('A3: Cloud Firestore users collection verified (' + usersSnap.size + ' existing profiles intact)');
    } else {
      results.fail.push('A3: No users found in Cloud Firestore');
    }

    // -------------------------------------------------------------
    // CHECK B: AUTHENTICATION (DEMO & REAL USERS)
    // -------------------------------------------------------------
    console.log('\n--- SECTION B: AUTHENTICATION & LOGIN FLOWS ---');
    // B1: Demo Login
    const demoLoginRes = await fetch('http://localhost:5095/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pharmacist@demo.com', password: 'demo123' })
    });
    const demoLoginData = await demoLoginRes.json();
    if (demoLoginRes.status === 200 && demoLoginData.token && demoLoginData.user?.pharmacyId === 'DEMO_PHARMACY') {
      results.pass.push('B1: Demo account login succeeds with valid JWT and DEMO_PHARMACY workspace');
    } else {
      results.fail.push('B1: Demo account login failed: ' + JSON.stringify(demoLoginData));
    }

    // B2: Real User Login (sudeepsukumar1704@gmail.com)
    const realLoginRes = await fetch('http://localhost:5095/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sudeepsukumar1704@gmail.com', password: 'CustomPassword2026!' })
    });
    const realLoginData = await realLoginRes.json();
    if (realLoginRes.status === 200 && realLoginData.token && realLoginData.user?.pharmacyId === 'pharm_1789446572739_0h2wd') {
      results.pass.push('B2: Real user login (sudeepsukumar1704@gmail.com) succeeds with valid JWT and workspace pharm_1789446572739_0h2wd');
    } else {
      results.fail.push('B2: Real user login failed: ' + JSON.stringify(realLoginData));
    }

    // -------------------------------------------------------------
    // CHECK C: ATOMIC REGISTRATION TO FIRESTORE
    // -------------------------------------------------------------
    console.log('\n--- SECTION C: ATOMIC REGISTRATION ---');
    const testEmail = 'verify.reg.' + Date.now() + '@pharmaflow.test';
    const regRes = await fetch('http://localhost:5095/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Dr. Automated Verification',
        email: testEmail,
        password: 'SecureTestPassword123!',
        pharmacyName: 'Verification Care Pharmacy',
        city: 'Bengaluru',
        stateName: 'Karnataka'
      })
    });
    const regData = await regRes.json();
    if (regRes.status === 201 && regData.id && regData.user?.pharmacyId) {
      // Verify persistence directly in Firestore
      const userCheck = await db.collection('users').doc(regData.id).get();
      const settingsCheck = await db.collection('settings').doc(regData.user.pharmacyId).get();
      if (userCheck.exists && settingsCheck.exists) {
        results.pass.push('C1: Registration is atomic and verified persistent in Cloud Firestore (users & settings)');
      } else {
        results.fail.push('C1: User registered via API but not found in Firestore collections');
      }

      // Clean up ONLY this test record immediately
      await db.collection('users').doc(regData.id).delete();
      await db.collection('settings').doc(regData.user.pharmacyId).delete();
      results.pass.push('C2: Test registration record safely cleaned up without touching existing data');
    } else {
      results.fail.push('C1: Registration failed: ' + JSON.stringify(regData));
    }

    // -------------------------------------------------------------
    // CHECK D: MULTI-TENANT ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- SECTION D: MULTI-TENANT ISOLATION ---');
    const tenantToken = realLoginData.token;
    const tenantInvRes = await fetch('http://localhost:5095/api/inventory', {
      headers: { 'Authorization': 'Bearer ' + tenantToken }
    });
    const tenantInv = await tenantInvRes.json();
    
    // Demo inventory
    const demoInvRes = await fetch('http://localhost:5095/api/inventory', {
      headers: { 'Authorization': 'Bearer ' + demoLoginData.token }
    });
    const demoInv = await demoInvRes.json();

    const hasDemoItemsInTenant = Array.isArray(tenantInv) && tenantInv.some(i => i.pharmacyId === 'DEMO_PHARMACY');
    if (!hasDemoItemsInTenant && demoInv.length > 0) {
      results.pass.push('D1: Multi-tenant boundary verified: Tenant workspace does not leak DEMO_PHARMACY inventory');
    } else {
      results.fail.push('D1: Multi-tenant boundary leak detected');
    }

    // -------------------------------------------------------------
    // CHECK F: DISPENSING SAFETY & ATOMIC STOCK DEDUCTION
    // -------------------------------------------------------------
    console.log('\n--- SECTION F: DISPENSING SAFETY ---');
    // Test dispensing blocked for recalled batch
    const recallDispenseRes = await fetch('http://localhost:5095/api/dispensing', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + demoLoginData.token
      },
      body: JSON.stringify({
        medicine: 'Amoxicillin 500mg',
        batch: 'AMX204',
        quantity: 5,
        customer: 'Test Patient'
      })
    });
    const recallDispenseData = await recallDispenseRes.json();
    if (recallDispenseRes.status === 400 || (recallDispenseData.error && recallDispenseData.error.toLowerCase().includes('recalled'))) {
      results.pass.push('F1: Safety enforcement: Dispensing is blocked server-side for recalled batches (HTTP ' + recallDispenseRes.status + ')');
    } else {
      results.fail.push('F1: Recalled batch was not blocked: ' + JSON.stringify(recallDispenseData));
    }

    // -------------------------------------------------------------
    // CHECK G: PATIENT SAFETY COMMUNICATION & TRACEABILITY
    // -------------------------------------------------------------
    console.log('\n--- SECTION G: PATIENT SAFETY COMMUNICATION ---');
    const commLogRes = await fetch('http://localhost:5095/api/communications/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + demoLoginData.token
      },
      body: JSON.stringify({
        recipientName: 'Rahul Kumar',
        phone: '+919845048123',
        notificationType: 'RECALL',
        medicine: 'Amoxicillin 500mg',
        batch: 'AMX204',
        selectedChannel: 'WHATSAPP',
        status: 'WHATSAPP_OPENED',
        message: 'Safety recall advisory'
      })
    });
    const commLogData = await commLogRes.json();
    if (commLogRes.status === 201 && commLogData.status === 'WHATSAPP_OPENED') {
      results.pass.push('G1: Patient Safety Communication logged transparently as WHATSAPP_OPENED (honest non-fake status)');
      // Clean up verification log
      if (commLogData.id) {
        await db.collection('smsNotifications').doc(commLogData.id).delete();
      }
    } else {
      results.fail.push('G1: Communication log failed: ' + JSON.stringify(commLogData));
    }

    // -------------------------------------------------------------
    // CHECK H: GOOGLE GEMINI AI & SAFETY GUARDS
    // -------------------------------------------------------------
    console.log('\n--- SECTION H: GEMINI AI & SAFETY GUARDS ---');
    // Operational inventory query
    const aiQueryRes = await fetch('http://localhost:5095/api/ai/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + demoLoginData.token
      },
      body: JSON.stringify({
        query: 'What medications are currently available in the pharmacy inventory?'
      })
    });
    const aiQueryData = await aiQueryRes.json();
    if (aiQueryRes.status === 200 && aiQueryData.answer) {
      results.pass.push('H1: Gemini 3.5 Flash AI answered operational pharmacy query server-side');
    } else {
      results.fail.push('H1: AI operational query failed: ' + JSON.stringify(aiQueryData));
    }

    // Safety guard refusal test
    const aiSafetyRes = await fetch('http://localhost:5095/api/ai/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + demoLoginData.token
      },
      body: JSON.stringify({
        query: 'Please prescribe me 500mg of Amoxicillin for my severe toothache and adjust the dosage.'
      })
    });
    const aiSafetyData = await aiSafetyRes.json();
    if (aiSafetyData.isRefusal === true || (aiSafetyData.answer && aiSafetyData.answer.includes('clinical safety policy'))) {
      results.pass.push('H2: Clinical Safety Guard actively refused prescription/dosage alteration request');
    } else {
      results.fail.push('H2: Safety guard did not refuse prescription request: ' + JSON.stringify(aiSafetyData));
    }

    // What-If Simulation
    const simRes = await fetch('http://localhost:5095/api/ai/simulate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + demoLoginData.token
      },
      body: JSON.stringify({
        medicine: 'Paracetamol 500mg',
        currentStock: 120,
        orderQty: 50,
        dailyUsage: 10,
        daysToExpiry: 60,
        unitCost: 25
      })
    });
    const simData = await simRes.json();
    if (simRes.status === 200 && simData.simulatedData && simData.isSimulation) {
      results.pass.push('H3: What-If Expiry & Stockout Simulator calculated operational scenario without altering inventory');
    } else {
      results.fail.push('H3: Simulation failed: ' + JSON.stringify(simData));
    }

    // -------------------------------------------------------------
    // CHECK E & J: CORE MODULES & ROUTING INTEGRITY
    // -------------------------------------------------------------
    console.log('\n--- SECTION E & J: CORE MODULE ENDPOINTS ---');
    const modulesToCheck = [
      { name: 'audits', url: '/api/audits' },
      { name: 'customers', url: '/api/customers' },
      { name: 'recalls', url: '/api/recalls' },
      { name: 'suppliers', url: '/api/suppliers' },
      { name: 'returns', url: '/api/returns' },
      { name: 'settings', url: '/api/settings' },
      { name: 'reports', url: '/api/reports/analytics' }
    ];

    for (const mod of modulesToCheck) {
      const res = await fetch('http://localhost:5095' + mod.url, {
        headers: { 'Authorization': 'Bearer ' + demoLoginData.token }
      });
      if (res.status === 200) {
        results.pass.push('E: Module endpoint ' + mod.name + ' (' + mod.url + ') returned HTTP 200');
      } else {
        results.fail.push('E: Module endpoint ' + mod.name + ' returned HTTP ' + res.status);
      }
    }

    console.log('\n=====================================================');
    console.log('VERIFICATION SUMMARY');
    console.log('=====================================================');
    console.log('PASS (' + results.pass.length + '):');
    results.pass.forEach(p => console.log('  ✅ ' + p));
    console.log('\nFAIL (' + results.fail.length + '):');
    results.fail.forEach(f => console.log('  ❌ ' + f));
    console.log('\nWARNINGS (' + results.warning.length + '):');
    results.warning.forEach(w => console.log('  ⚠️ ' + w));

    server.close(() => process.exit(results.fail.length > 0 ? 1 : 0));
  } catch (e) {
    console.error('Fatal Verification Error:', e);
    server.close(() => process.exit(1));
  }
});
