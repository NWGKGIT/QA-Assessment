import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    products_read: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:4000';

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
  });

  sleep(1);
}
