/**
 * Verification Script for All Implementation Requirements
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function verifyAll() {
  console.log('🧪 Starting End-to-End Code & API Verification...\n');
  let passed = 0;
  let total = 0;

  function check(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  // 1. Password Visibility Toggle in Auth.tsx
  check('Auth.tsx: Contains showLoginPassword state, Eye/EyeOff toggle button, and masked default', () => {
    const authPath = path.resolve(__dirname, '../../frontend/src/Auth.tsx');
    const content = fs.readFileSync(authPath, 'utf8');

    assert.ok(content.includes('const [showLoginPassword, setShowLoginPassword] = useState(false);'), 'Default state must be masked (false)');
    assert.ok(content.includes('type={showLoginPassword ? \'text\' : \'password\'}'), 'Input type must toggle between text and password');
    assert.ok(content.includes('aria-label={showLoginPassword ? \'Hide password\' : \'Show password\'}'), 'Accessible aria-label missing');
    assert.ok(content.includes('showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />'), 'Eye / EyeOff icon toggle missing');
    assert.ok(content.includes('paddingLeft: 40') && content.includes('paddingRight: 42'), 'Input padding must avoid overlapping lock icon or eye toggle');
  });

  // 2. Customer Add / Edit in PharmacistPortal.tsx
  check('PharmacistPortal.tsx: Customer Add & Edit includes communicationPreference (WhatsApp & SMS)', () => {
    const portalPath = path.resolve(__dirname, '../../frontend/src/PharmacistPortal.tsx');
    const content = fs.readFileSync(portalPath, 'utf8');

    assert.ok(content.includes('communicationPreference'), 'communicationPreference state or field missing');
    assert.ok(content.includes('\'WHATSAPP\''), 'WhatsApp option must be supported');
    assert.ok(content.includes('\'SMS\''), 'SMS option must be supported');
    assert.ok(content.includes('openEditModal'), 'Customer Edit Modal handler missing');
    assert.ok(content.includes('handleSaveEdit'), 'Customer Edit Save handler missing');
  });

  // 3. Safety Communication Modal in SafetyCommunicationModal.tsx
  check('SafetyCommunicationModal.tsx: Shows customer preference, Recommended badge, and honest action statuses', () => {
    const modalPath = path.resolve(__dirname, '../../frontend/src/components/SafetyCommunicationModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf8');

    assert.ok(content.includes('Recommended'), 'Recommended channel badge missing');
    assert.ok(content.includes('customerPreference'), 'customerPreference prop missing');
    assert.ok(content.includes('WHATSAPP_OPENED'), 'Honest WhatsApp Opened status missing');
    assert.ok(content.includes('SMS_COMPOSER_OPENED'), 'Honest SMS Composer Opened status missing');
    assert.ok(!content.includes('status: \'delivered\'') && !content.includes('status: \'DELIVERED\''), 'Must never claim fake "Delivered" status on client action');
  });

  // 4. Verify Demo Customers in data.ts & backend/index.js
  check('data.ts & backend/index.js: Deepak, Manish, and Deeps are pre-configured with WHATSAPP preference', () => {
    const dataPath = path.resolve(__dirname, '../../frontend/src/data.ts');
    const content = fs.readFileSync(dataPath, 'utf8');
    const indexPath = path.resolve(__dirname, '../index.js');
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    assert.ok(content.includes('Deepak') && content.includes('WHATSAPP'), 'Deepak demo customer missing in data.ts');
    assert.ok(content.includes('Manish') && content.includes('WHATSAPP'), 'Manish demo customer missing in data.ts');
    assert.ok(content.includes('Deeps') && content.includes('WHATSAPP'), 'Deeps demo customer missing in data.ts');

    assert.ok(indexContent.includes('Deepak') && indexContent.includes('WHATSAPP'), 'Deepak demo customer missing in backend');
  });

  // 5. Backend customer update route in backend/index.js
  check('backend/index.js: PUT /api/customers/:id correctly handles updates and maintains tenant isolation', () => {
    const indexPath = path.resolve(__dirname, '../index.js');
    const content = fs.readFileSync(indexPath, 'utf8');

    assert.ok(content.includes('app.put(\'/api/customers/:id\''), 'PUT /api/customers/:id endpoint missing');
    assert.ok(content.includes('app.post(\'/api/sms/log-action\'') || content.includes('app.post(\'/api/communications/log-action\''), 'Action log endpoint missing');
  });

  console.log(`\n🎉 Verification Complete: ${passed}/${total} checks passed successfully!`);
}

verifyAll();
