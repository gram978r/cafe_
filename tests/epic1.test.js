const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer, loadDataset } = require('../server');

let server;
let baseUrl;
let cookie;
let dataPath;

test.before(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prep-cafe-epic1-'));
  dataPath = path.join(tempDir, 'store.json');
  fs.copyFileSync(path.join(__dirname, '..', 'codex', '매장운영데이터.json'), dataPath);
  server = createServer({ dataPath });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

async function json(pathname, options = {}) {
  const headers = { ...(options.headers || {}), ...(cookie ? { Cookie: cookie } : {}) };
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
  const payload = await response.json();
  if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
  return { response, payload };
}

test('비로그인 사용자는 저장 자료를 조회할 수 없다', async () => {
  const result = await json('/api/store-data');
  assert.equal(result.response.status, 401);
});

test('운영자 로그인 후 원본 매장 자료를 조회하고 같은 조건으로 다시 읽을 수 있다', async () => {
  const login = await json('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'operator@prepcafe.local', password: 'prep-cafe-demo' }),
  });
  assert.equal(login.response.status, 200);
  const first = await json('/api/store-data?date=2026-09-18');
  const second = await json('/api/store-data?date=2026-09-18');
  assert.equal(first.response.status, 200);
  assert.deepEqual(second.payload.rows, first.payload.rows);
  assert.equal(first.payload.meta.dataset_id, 'prep-cafe-operations');
  assert.equal(first.payload.source.counts.sales, loadDataset(dataPath).sales.length);
  assert.ok(first.payload.rows.length > 0);
  assert.ok(first.payload.rows.every((row) => row.menuName && row.id && row.date === '2026-09-18'));
});

test('판매 채널 필터는 저장된 원본 행만 좁힌다', async () => {
  const result = await json('/api/store-data?date=2026-09-18&channel=포장');
  assert.equal(result.response.status, 200);
  assert.ok(result.payload.rows.length > 0);
  assert.ok(result.payload.rows.every((row) => row.channel === '포장'));
});
