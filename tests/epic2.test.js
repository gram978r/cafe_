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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prep-cafe-epic2-'));
  dataPath = path.join(tempDir, 'store.json');
  fs.copyFileSync(path.join(__dirname, '..', 'codex', '매장운영데이터.json'), dataPath);
  server = createServer({ dataPath });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const login = await call('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'operator@prepcafe.local', password: 'prep-cafe-demo' }) });
  assert.equal(login.response.status, 200);
});

test.after(() => server.close());

async function call(pathname, options = {}) {
  const headers = { ...(options.headers || {}), ...(cookie ? { Cookie: cookie } : {}) };
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
  const payload = await response.json();
  if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
  return { response, payload };
}

test('판매액 계산과 서버 입력 검증이 동작한다', async () => {
  const before = loadDataset(dataPath).sales.length;
  const invalid = await call('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: '2026-09-18', menuId: 'M01', channel: '배달', quantity: 2, unitPrice: 4500, discount: 9001 }) });
  assert.equal(invalid.response.status, 422);
  assert.match(invalid.payload.errors.discount, /초과/);
  assert.equal(loadDataset(dataPath).sales.length, before);
  const created = await call('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: '2026-09-18', menuId: 'M01', channel: '배달', quantity: 2, unitPrice: 4500, discount: 500 }) });
  assert.equal(created.response.status, 201);
  assert.equal(created.payload.sale.net_sales, 8500);
  assert.equal(loadDataset(dataPath).sales.length, before + 1);
  globalThis.createdSaleId = created.payload.sale.sale_id;
});

test('수정·삭제가 같은 기간 실적에 즉시 반영된다', async () => {
  const id = globalThis.createdSaleId;
  const updated = await call(`/api/sales/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: '2026-09-18', menuId: 'M01', channel: '배달', quantity: 3, unitPrice: 4500, discount: 500 }) });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.payload.sale.net_sales, 13000);
  const afterUpdate = await call('/api/performance?period=day&date=2026-09-18');
  assert.equal(afterUpdate.payload.summary.netSales, 671900 + 13000);
  const deleted = await call(`/api/sales/${id}`, { method: 'DELETE' });
  assert.equal(deleted.response.status, 200);
  const afterDelete = await call('/api/performance?period=day&date=2026-09-18');
  assert.equal(afterDelete.payload.summary.netSales, 671900);
});

test('일·주·월 기간 경계와 미마감 날짜를 구분한다', async () => {
  const day = await call('/api/performance?period=day&date=2026-09-18');
  assert.equal(day.payload.range.start, '2026-09-18');
  assert.equal(day.payload.range.end, '2026-09-18');
  assert.equal(day.payload.summary.netSales, 671900);
  const week = await call('/api/performance?period=week&date=2026-09-18');
  assert.equal(week.payload.range.start, '2026-09-14');
  assert.equal(week.payload.range.end, '2026-09-20');
  assert.equal(week.payload.isComplete, false);
  assert.equal(week.payload.daily.find((dayItem) => dayItem.date === '2026-09-19').netSales, null);
  const month = await call('/api/performance?period=month&date=2026-09-18');
  assert.equal(month.payload.range.start, '2026-09-01');
  assert.equal(month.payload.range.end, '2026-09-30');
  assert.equal(month.payload.isComplete, false);
});
