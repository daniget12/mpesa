#!/usr/bin/env node
/**
 * TirfMarket Contract Check Script (docs/API-CONTRACT.md v1.1.2)
 * 
 * Verifies backend compatibility:
 *   a. GET /health -> status 200, status "ok", mode "mock" | "live"
 *   b. GET /api/deals/nearby?lat=9.0054&lon=38.7840&radiusKm=2 -> 200, array matching exact 13-field schema and types
 *   c. POST /api/orders with invalid phone -> 400
 *   d. POST /api/orders with non-existent deal UUID -> 404
 *   e. GET /api/orders/00000000-0000-0000-0000-000000000000 -> 404
 *   f. GET /api/merchants/me without auth -> 401
 *   g. POST /api/merchant/redeem without auth -> 401
 */

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://tirfmarket-backend.onrender.com').replace(/\/$/, '');

console.log('='.repeat(70));
console.log('TIRF MARKET API CONTRACT VERIFICATION (v1.1.2)');
console.log(`Backend Target: ${BACKEND_URL}`);
console.log('='.repeat(70));
console.log('');

async function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const EXPECTED_DEAL_KEYS = [
  'dealId',
  'title',
  'price',
  'discountPct',
  'finalAmount',
  'merchantId',
  'merchantName',
  'category',
  'lat',
  'lon',
  'distanceMeters',
  'verified',
  'itemCode'
];

const results = [];

async function runCheck(name, fn) {
  process.stdout.write(`Checking ${name}... `);
  try {
    const detail = await fn();
    console.log('\x1b[32mPASS\x1b[0m');
    if (detail) console.log(`   └─ ${detail}`);
    results.push({ name, pass: true, detail });
  } catch (err) {
    console.log('\x1b[31mFAIL\x1b[0m');
    console.log(`   └─ Error: ${err.message}`);
    results.push({ name, pass: false, error: err.message });
  }
}

async function main() {
  // Check (a): GET /health
  await runCheck('a. GET /health', async () => {
    const res = await fetchWithTimeout(`${BACKEND_URL}/health`);
    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, got ${res.status}`);
    }
    const data = await res.json();
    if (!data || data.ok !== true) {
      throw new Error(`Expected ok === true, got ${JSON.stringify(data?.ok)}`);
    }
    if (!['mock', 'live', 'real'].includes(data.mode)) {
      throw new Error(`Expected mode to be 'mock', 'live', or 'real', got '${data.mode}'`);
    }
    return `status 200, ok=true, mode="${data.mode}", store="${data.store || 'n/a'}"`;
  });

  // Check (b): GET /api/deals/nearby?lat=9.0054&lon=38.7840&radiusKm=2
  await runCheck('b. GET /api/deals/nearby schema validation (13 fields & types)', async () => {
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/deals/nearby?lat=9.0054&lon=38.7840&radiusKm=2`);
    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, got ${res.status}`);
    }
    const deals = await res.json();
    if (!Array.isArray(deals)) {
      throw new Error(`Expected JSON array, got ${typeof deals}`);
    }
    if (deals.length === 0) {
      return `status 200, received 0 deals (empty array, schema valid)`;
    }

    const expectedSet = new Set(EXPECTED_DEAL_KEYS);
    const missingKeysSet = new Set();
    const extraKeysSet = new Set();
    const typeErrors = [];

    deals.forEach((deal, idx) => {
      const keys = Object.keys(deal);
      if (keys.length !== 13) {
        typeErrors.push(`deal[${idx}] has ${keys.length} keys instead of exactly 13`);
      }

      EXPECTED_DEAL_KEYS.forEach(k => {
        if (!(k in deal)) missingKeysSet.add(`deal[${idx}].${k}`);
      });
      keys.forEach(k => {
        if (!expectedSet.has(k)) extraKeysSet.add(`deal[${idx}].${k}`);
      });

      // Type checks
      if (typeof deal.dealId !== 'string') typeErrors.push(`deal[${idx}].dealId expected string, got ${typeof deal.dealId}`);
      if (typeof deal.title !== 'string') typeErrors.push(`deal[${idx}].title expected string, got ${typeof deal.title}`);
      if (typeof deal.price !== 'number') typeErrors.push(`deal[${idx}].price expected number, got ${typeof deal.price}`);
      if (typeof deal.discountPct !== 'number') typeErrors.push(`deal[${idx}].discountPct expected number, got ${typeof deal.discountPct}`);
      if (typeof deal.finalAmount !== 'number') typeErrors.push(`deal[${idx}].finalAmount expected number, got ${typeof deal.finalAmount}`);
      if (typeof deal.merchantId !== 'string') typeErrors.push(`deal[${idx}].merchantId expected string, got ${typeof deal.merchantId}`);
      if (typeof deal.merchantName !== 'string') typeErrors.push(`deal[${idx}].merchantName expected string, got ${typeof deal.merchantName}`);
      if (typeof deal.category !== 'string') typeErrors.push(`deal[${idx}].category expected string, got ${typeof deal.category}`);
      if (typeof deal.lat !== 'number') typeErrors.push(`deal[${idx}].lat expected number, got ${typeof deal.lat}`);
      if (typeof deal.lon !== 'number') typeErrors.push(`deal[${idx}].lon expected number, got ${typeof deal.lon}`);
      if (typeof deal.distanceMeters !== 'number') typeErrors.push(`deal[${idx}].distanceMeters expected number, got ${typeof deal.distanceMeters}`);
      if (typeof deal.verified !== 'boolean') typeErrors.push(`deal[${idx}].verified expected boolean, got ${typeof deal.verified}`);
      if (deal.itemCode !== null && typeof deal.itemCode !== 'string') typeErrors.push(`deal[${idx}].itemCode expected string | null, got ${typeof deal.itemCode}`);
    });

    if (missingKeysSet.size > 0) {
      throw new Error(`Missing required keys: ${Array.from(missingKeysSet).join(', ')}`);
    }
    if (extraKeysSet.size > 0) {
      throw new Error(`Unexpected extra keys found: ${Array.from(extraKeysSet).join(', ')}`);
    }
    if (typeErrors.length > 0) {
      throw new Error(`Schema type violations: ${typeErrors.slice(0, 3).join('; ')}`);
    }

    const report = [];
    report.push(`Validated exactly ${EXPECTED_DEAL_KEYS.length} schema keys & types: [${EXPECTED_DEAL_KEYS.join(', ')}]`);
    report.push(`Received ${deals.length} deals with 100% type conformance.`);
    return report.join('\n   └─ ');
  });

  // Check (c): POST /api/orders with invalid phone -> 400
  await runCheck('c. POST /api/orders with invalid phone -> 400', async () => {
    let dealIdToUse = null;
    const dealsRes = await fetchWithTimeout(`${BACKEND_URL}/api/deals/nearby?lat=9.0054&lon=38.7840&radiusKm=2`);
    if (dealsRes.status === 200) {
      const dealsData = await dealsRes.json().catch(() => []);
      if (Array.isArray(dealsData) && dealsData.length > 0) {
        dealIdToUse = dealsData[0].dealId;
      }
    }
    if (!dealIdToUse) {
      throw new Error('No active deal returned from GET /api/deals/nearby for check (c)');
    }

    const res = await fetchWithTimeout(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId: dealIdToUse,
        phone: 'invalid-phone-string'
      })
    });
    if (res.status !== 400) {
      throw new Error(`Expected HTTP 400, got ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    return `status 400 (rejected invalid phone with live dealId "${dealIdToUse}": "${data.error || 'Bad Request'}")`;
  });

  // Check (d): POST /api/orders with non-existent deal UUID -> 404
  await runCheck('d. POST /api/orders with non-existent deal UUID -> 404', async () => {
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId: '00000000-0000-0000-0000-000000000000',
        phone: '0911223344'
      })
    });
    if (res.status !== 404) {
      throw new Error(`Expected HTTP 404, got ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    return `status 404 (deal not found: "${data.error || 'Not Found'}")`;
  });

  // Check (e): GET /api/orders/00000000-0000-0000-0000-000000000000 -> 404
  await runCheck('e. GET /api/orders/:id non-existent -> 404', async () => {
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/orders/00000000-0000-0000-0000-000000000000`);
    if (res.status !== 404) {
      throw new Error(`Expected HTTP 404, got ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    return `status 404 (order not found: "${data.error || 'Not Found'}")`;
  });

  // Check (f): GET /api/merchants/me without auth -> 401
  await runCheck('f. GET /api/merchant(s)/me without auth -> 401', async () => {
    // Contract section 11 defines GET /api/merchant/me (singular).
    // Test /api/merchant/me and /api/merchants/me
    let res = await fetchWithTimeout(`${BACKEND_URL}/api/merchant/me`);
    let pathUsed = '/api/merchant/me';

    if (res.status !== 401) {
      const resPlural = await fetchWithTimeout(`${BACKEND_URL}/api/merchants/me`);
      if (resPlural.status === 401) {
        res = resPlural;
        pathUsed = '/api/merchants/me';
      }
    }

    if (res.status !== 401) {
      throw new Error(`Expected HTTP 401, got ${res.status} from ${pathUsed}`);
    }
    const data = await res.json().catch(() => ({}));
    return `status 401 on ${pathUsed} ("${data.error || 'Unauthorized'}")`;
  });

  // Check (g): POST /api/merchant/redeem without auth -> 401
  await runCheck('g. POST /api/merchant/redeem without auth -> 401', async () => {
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/merchant/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'RANDOM-TEST-CODE-NONEXISTENT' })
    });
    if (res.status !== 401) {
      throw new Error(`Expected HTTP 401, got ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    return `status 401 ("${data.error || 'Unauthorized'}")`;
  });

  // Summary
  console.log('');
  console.log('='.repeat(70));
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;
  console.log(`SUMMARY: ${passed}/${total} checks passed (${failed} failed)`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
