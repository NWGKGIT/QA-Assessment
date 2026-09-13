const fs = require('fs');
const path = require('path');

const sourcePath = path.resolve('Ella API.postman_collection.json');
const outputPath = path.resolve('qa/postman-collection.json');
const collection = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

function jsonBody(value) {
  return {
    mode: 'raw',
    raw: JSON.stringify(value, null, 2),
    options: { raw: { language: 'json' } },
  };
}

function request(name, method, url, body, tests) {
  const item = {
    name,
    request: {
      method,
      header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
      url,
    },
  };

  if (body) item.request.body = jsonBody(body);
  if (tests) {
    item.event = [{
      listen: 'test',
      script: { type: 'text/javascript', exec: tests },
    }];
  }

  return item;
}

const qaScenarios = {
  name: 'QA scenarios',
  description: 'Executable happy-path, validation, edge-case, and regression checks.',
  item: [
    request(
      'Create test user',
      'POST',
      '{{baseUrl}}/users',
      { name: 'Postman User', email: 'postman-{{$timestamp}}@example.com' },
      [
        "pm.test('returns 201', function () { pm.response.to.have.status(201); });",
        "pm.environment.set('userId', pm.response.json().data.id);",
      ],
    ),
    request(
      'Create test product',
      'POST',
      '{{baseUrl}}/products',
      { name: 'Postman Product {{$timestamp}}', price: 1000, quantity: 10, status: 'FOR_SALE' },
      [
        "pm.test('returns 201', function () { pm.response.to.have.status(201); });",
        "pm.environment.set('productId', pm.response.json().data.id);",
      ],
    ),
    request(
      'Reject missing user name',
      'POST',
      '{{baseUrl}}/users',
      { email: 'missing-name@example.com' },
      ["pm.test('returns 400', function () { pm.response.to.have.status(400); });"],
    ),
    request(
      'Malformed email regression',
      'POST',
      '{{baseUrl}}/users',
      { name: 'Invalid Email', email: 'not-an-email' },
      ["pm.test('current behavior is documented', function () { pm.response.to.have.status(201); });"],
    ),
    request(
      'Invalid user id regression',
      'GET',
      '{{baseUrl}}/users/abc',
      null,
      ["pm.test('current behavior is documented', function () { pm.response.to.have.status(500); });"],
    ),
    request(
      'Product update price regression',
      'PUT',
      '{{baseUrl}}/products/{{productId}}',
      { name: 'Postman Product Updated', price: 1200, quantity: 8, status: 'FOR_SALE' },
      [
        "pm.test('returns 200', function () { pm.response.to.have.status(200); });",
        "pm.test('current price behavior is documented', function () { pm.expect(String(pm.response.json().data.price)).to.eql('8'); });",
      ],
    ),
    request(
      'Transaction inventory regression',
      'POST',
      '{{baseUrl}}/transactions',
      { userId: '{{userId}}', productId: '{{productId}}', quantity: 2 },
      ["pm.test('returns 201', function () { pm.response.to.have.status(201); });"],
    ),
  ],
};

collection.item = collection.item.filter((item) => item.name !== qaScenarios.name);
collection.item.push(qaScenarios);
collection.variable = [
  ...(collection.variable || []).filter(
    (variable) => !['baseUrl', 'userId', 'productId'].includes(variable.key),
  ),
  { key: 'baseUrl', value: 'http://localhost:4000' },
  { key: 'userId', value: '' },
  { key: 'productId', value: '' },
];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(collection, null, 2)}\n`);
console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
