import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    // Scenario 1: read-heavy load on the products list endpoint
    products_read: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
    },
    // Scenario 2: write path — create user + product + transaction under load
    transaction_write: {
      executor: 'constant-vus',
      vus: 3,
      duration: '30s',
      startTime: '5s', // let the DB warm up
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:4000';
const headers = { 'Content-Type': 'application/json' };

// ── Scenario 1: GET /products ──────────────────────────────────────────────
export default function () {
  const response = http.get(`${baseUrl}/products`);

  check(response, {
    'GET /products returns 200': (res) => res.status === 200,
    'response contains a data array': (res) => {
      try {
        return Array.isArray(res.json('data'));
      } catch {
        return false;
      }
    },
    'each product has numeric price': (res) => {
      try {
        const data = res.json('data');
        return data.every((p) => typeof p.price === 'number');
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}

// ── Scenario 2: full create-and-purchase happy path ────────────────────────
export function transaction_write() {
  const ts = Date.now();

  // Create a user
  const userRes = http.post(
    `${baseUrl}/users`,
    JSON.stringify({ name: `k6 User ${ts}`, email: `k6-${ts}@example.com` }),
    { headers },
  );
  const userOk = check(userRes, {
    'POST /users returns 201': (res) => res.status === 201,
  });
  if (!userOk) return;
  const userId = userRes.json('data.id');

  // Create a product
  const productRes = http.post(
    `${baseUrl}/products`,
    JSON.stringify({ name: `k6 Product ${ts}`, price: 99.99, quantity: 100 }),
    { headers },
  );
  const productOk = check(productRes, {
    'POST /products returns 201': (res) => res.status === 201,
    'product price is a number': (res) =>
      typeof res.json('data.price') === 'number',
  });
  if (!productOk) return;
  const productId = productRes.json('data.id');

  // Create a transaction
  const txRes = http.post(
    `${baseUrl}/transactions`,
    JSON.stringify({ userId, productId, quantity: 1 }),
    { headers },
  );
  check(txRes, {
    'POST /transactions returns 201': (res) => res.status === 201,
  });

  // Verify inventory was decremented
  const productAfter = http.get(`${baseUrl}/products/${productId}`);
  check(productAfter, {
    'GET /products/:id returns 200': (res) => res.status === 200,
    'stock was decremented by 1': (res) => {
      try {
        return res.json('data.quantity') === 99;
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
