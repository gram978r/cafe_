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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prep-cafe-epic3-'));
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

test('메뉴별 변동 수익성은 판매 스냅샷 원가만 차감한다', async () => {
  const result = await call('/api/profitability?period=day&date=2026-09-18');
  assert.equal(result.response.status, 200);
  const row = result.payload.rows.find((item) => item.menuId === 'M01');
  assert.equal(row.status, '정상 기록됨');
  assert.equal(row.contribution, row.netSales - row.foodCost - row.packagingCost - row.paymentFee);
  assert.ok(Math.abs(result.payload.summary.contribution - (result.payload.summary.netSales - result.payload.summary.variableCost)) < 0.001);
});

test('실제 손익은 실제 비용만 반영하고 월별 계획을 중복 합산하지 않는다', async () => {
  const result = await call('/api/pnl?period=day&date=2026-09-18');
  const dataset = loadDataset(dataPath);
  const expectedExpenses = dataset.expenses.filter((item) => item.date === '2026-09-18').reduce((sum, item) => sum + item.amount, 0);
  assert.equal(result.response.status, 200);
  assert.equal(result.payload.summary.actualExpenses, expectedExpenses);
  assert.equal(result.payload.summary.operatingProfit, result.payload.summary.contribution - expectedExpenses);
  assert.equal(result.payload.monthlyPlanIncluded, false);
  assert.ok(result.payload.monthlyPlanTotal > 0);
});

test('재료 잔량은 단위별로 계산하고 실사 차이를 분리한다', async () => {
  const result = await call('/api/inventory?date=2026-09-18');
  const beans = result.payload.rows.find((item) => item.materialId === 'I01');
  const milk = result.payload.rows.find((item) => item.materialId === 'I02');
  assert.equal(result.response.status, 200);
  assert.equal(beans.unit, 'g');
  assert.equal(milk.unit, 'ml');
  assert.equal(beans.calculated, beans.opening + beans.inbound + beans.waste + beans.adjustment - beans.usage);
  assert.equal(beans.difference, beans.counted - beans.calculated);
  assert.ok(beans.usage > 0);
  assert.notEqual(beans.unit, milk.unit);
});

test('판매 수량 수정은 수익성과 재료 사용량에 함께 반영된다', async () => {
  const beforeProfit = await call('/api/profitability?period=day&date=2026-09-18');
  const beforeInventory = await call('/api/inventory?date=2026-09-18');
  const beforeRow = beforeProfit.payload.rows.find((item) => item.menuId === 'M01');
  const beforeBeans = beforeInventory.payload.rows.find((item) => item.materialId === 'I01');
  const update = await call('/api/sales/S006097', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: '2026-09-18', menuId: 'M01', channel: '매장', quantity: 22, unitPrice: 4000, discount: 0 }) });
  assert.equal(update.response.status, 200);
  const afterProfit = await call('/api/profitability?period=day&date=2026-09-18');
  const afterInventory = await call('/api/inventory?date=2026-09-18');
  assert.equal(afterProfit.payload.rows.find((item) => item.menuId === 'M01').quantity, beforeRow.quantity + 1);
  assert.equal(afterInventory.payload.rows.find((item) => item.materialId === 'I01').usage, beforeBeans.usage + 20);
  await call('/api/sales/S006097', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: '2026-09-18', menuId: 'M01', channel: '매장', quantity: 21, unitPrice: 4000, discount: 0 }) });
});
