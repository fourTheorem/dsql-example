import http from 'k6/http';
import { check, sleep } from 'k6';
const { BASE_URL } = __ENV;

if (!BASE_URL) {
  throw new Error(`BASE_URL must be set to the API backend URL. This is a CloudFormation output (ApplicationStack.apiEndpoint) printed when you run 'cdk deploy'`);
}

export const options = {
  vus: 100,           // number of concurrent users
  duration: '1m',     // test duration
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

function randomName(prefix = 'Name') {
  return `${prefix} ${Math.random().toString(36).substring(2, 10)}`;
}

export default function() {
  // 0. Read all lists
  const allRes = http.get(`${BASE_URL}/lists`)
  check(allRes, { 'lists read': (r) => r.status === 200 });

  // 1. Create a list
  const createRes = http.post(`${BASE_URL}/lists`, JSON.stringify({
    name: randomName('List'),
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  check(createRes, {
    'list created': (r) => r.status === 201,
  });

  if (createRes.status !== 201) return;

  const list = createRes.json();
  const listId = list.id;

  // 2. Get the list
  const getRes = http.get(`${BASE_URL}/lists/${listId}`);
  check(getRes, { 'list retrieved': (r) => r.status === 200 });

  // 3. Patch the list
  const patchRes = http.patch(`${BASE_URL}/lists/${listId}`, JSON.stringify({
    name: randomName('ListPatched'),
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  check(patchRes, { 'list patched': (r) => r.status === 200 });

  // 4. Put the list
  const putRes = http.put(`${BASE_URL}/lists/${listId}`, JSON.stringify({
    id: listId,
    name: randomName('ListPut'),
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  check(putRes, { 'list replaced': (r) => r.status === 200 });

  // 5. Create item(s) in the list
  const itemCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
  const itemIds = [];

  for (let i = 0; i < itemCount; i++) {
    const itemRes = http.post(`${BASE_URL}/lists/${listId}/items`, JSON.stringify({
      name: randomName('Item'),
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

    check(itemRes, { 'item created': (r) => r.status === 201 });

    if (itemRes.status === 201) {
      itemIds.push(itemRes.json().id);
    }
  }

  // 6. Get items in the list
  const itemsRes = http.get(`${BASE_URL}/lists/${listId}/items`);
  check(itemsRes, { 'items listed': (r) => r.status === 200 });

  // 7. Get each item individually
  for (const itemId of itemIds) {
    const itemGet = http.get(`${BASE_URL}/lists/${listId}/items/${itemId}`);
    check(itemGet, { 'item retrieved': (r) => r.status === 200 });
  }

  // 8. Delete the list
  const delRes = http.del(`${BASE_URL}/lists/${listId}`);
  check(delRes, { 'list deleted': (r) => r.status === 204 });

  // Sleep to simulate real user pacing
  sleep(Math.random());
}
