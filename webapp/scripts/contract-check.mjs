#!/usr/bin/env node
/**
 * TirfMarket Contract Check Script (docs/API-CONTRACT.md v1.0.0)
 * 
 * Verifies backend compatibility:
 *   a. GET /health -> status 200, status "ok", mode "mock" | "live"
 *   b. GET /api/deals/nearby?lat=9.0054&lon=38.7840&radiusKm=2 -> 200, array matching schema
 *   c. POST /api/orders with invalid phone -> 400
 *   d. POST /api/orders with non-existent deal UUID -> 404
 *   e. GET /api/orders/00000000-0000-0000-0000-000000000000 -> 404
 *   f. GET /api/merchants/me without auth -> 401
 */

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://tirfmarket-backend.onrender.com').replace(/\/$/, '');

console.log('='.repeat(70));
console.log('TIRF MARKET API CONTRACT VERIFICATION (v1.0.0)');
console.log(`Backend Target: ${BACKEND_URL}`);
console.log('NOTE: Rate limit is 5 req/min per IP on POST /api/orders.');
console.log('      This test suite consumes 2 order requests.');
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
  'verified'
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
    if (!['mock', 'live'].includes(data.mode)) {
      throw new Error(`Expected mode to be 'mock' or 'live', got '${data.mode}'`);
    }
    return `status 200, ok=true, mode="${data.mode}", store="${data.store || 'n/a'}"`;
  });

  // Check (b): GET /api/deals/nearby?lat=9.0054&lon=38.7840&radiusKm=2
  await runCheck('b. GET /api/deals/nearby schema validation', async () => {
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

    deals.forEach((deal, idx) => {
      const keys = Object.keys(deal);
      EXPECTED_DEAL_KEYS.forEach(k => {
        if (!(k in deal)) missingKeysSet.add(`deal[${idx}].${k}`);
      });
      keys.forEach(k => {
        if (!expectedSet.has(k)) extraKeysSet.add(`deal[${idx}].${k}`);
      });
    });

    const report = [];
    report.push(`Checked ${EXPECTED_DEAL_KEYS.length} schema keys: [${EXPECTED_DEAL_KEYS.join(', ')}]`);
    report.push(`Received ${deals.length} deals.`);
    if (missingKeysSet.size > 0) {
      throw new Error(`Missing required keys: ${Array.from(missingKeysSet).join(', ')}`);
    }
    if (extraKeysSet.size > 0) {
      report.push(`Extra keys found: ${Array.from(extraKeysSet).join(', ')}`);
    } else {
      report.push(`No extra or missing keys detected.`);
    }

    return report.join('\n   └─ ');
  });

  // Check (c): POST /api/orders with invalid phone -> 400
  await runCheck('c. POST /api/orders with invalid phone -> 400', async () => {
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId: 'd0000000-0000-0000-0000-000000000001',
        phone: 'invalid-phone-string'
      })
    });
    if (res.status !== 400) {
      throw new Error(`Expected HTTP 400, got ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    return `status 400 (rejected invalid phone: "${data.error || 'Bad Request'}")`;
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
