const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_PATH = path.join(__dirname, 'codex', '매장운영데이터.json');
const RUNTIME_STORE_PATH = process.env.PREP_STORE_PATH || path.join(__dirname, 'data', 'prep-cafe-store.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const sessions = new Map();

function ensureStore(dataPath = RUNTIME_STORE_PATH) {
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.copyFileSync(DATA_PATH, dataPath);
  }
  return dataPath;
}

function loadDataset(dataPath = RUNTIME_STORE_PATH) {
  return JSON.parse(fs.readFileSync(ensureStore(dataPath), 'utf8'));
}

function saveDataset(dataset, dataPath = RUNTIME_STORE_PATH) {
  ensureStore(dataPath);
  const temporaryPath = `${dataPath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(dataset, null, 2), 'utf8');
  fs.renameSync(temporaryPath, dataPath);
}

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

function getSession(req) {
  const id = parseCookies(req).prep_session;
  return id ? sessions.get(id) : null;
}

function requireSession(req, res) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { error: '로그인이 필요합니다.' });
    return null;
  }
  return session;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) reject(new Error('요청이 너무 큽니다.'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function buildStorePayload(url, dataPath = RUNTIME_STORE_PATH) {
  const dataset = loadDataset(dataPath);
  const date = url.searchParams.get('date') || dataset.meta.as_of;
  const channel = url.searchParams.get('channel') || '전체';
  const search = (url.searchParams.get('q') || '').trim().toLowerCase();
  const menuById = new Map(dataset.menus.map((menu) => [menu.menu_id, menu]));
  const rows = dataset.sales
    .filter((sale) => sale.date === date)
    .filter((sale) => channel === '전체' || sale.channel === channel)
    .map((sale) => {
      const menu = menuById.get(sale.menu_id);
      return {
        id: sale.sale_id,
        date: sale.date,
        menuId: sale.menu_id,
        menuName: menu?.name || '알 수 없는 메뉴',
        category: menu?.category || '분류 없음',
        channel: sale.channel,
        quantity: sale.quantity,
        unitPrice: sale.unit_price,
        discount: sale.discount_amount,
        netSales: sale.net_sales,
        foodCost: sale.unit_food_cost_snapshot * sale.quantity,
        packagingCost: sale.unit_packaging_cost_snapshot * sale.quantity,
        paymentFee: sale.payment_fee,
        recipeVersion: sale.recipe_version,
      };
    })
    .filter((sale) => !search || sale.menuName.toLowerCase().includes(search));

  const summary = rows.reduce((acc, row) => ({
    recordCount: acc.recordCount + 1,
    quantity: acc.quantity + row.quantity,
    netSales: acc.netSales + row.netSales,
    paymentFee: acc.paymentFee + row.paymentFee,
  }), { recordCount: 0, quantity: 0, netSales: 0, paymentFee: 0 });

  return {
    meta: dataset.meta,
    store: { name: '프렙 카페 본점', status: '영업 마감', asOf: dataset.meta.as_of },
    source: {
      label: '서버 저장 자료',
      file: 'codex/매장운영데이터.json',
      counts: {
        suppliers: dataset.suppliers.length,
        materials: dataset.materials.length,
        menus: dataset.menus.length,
        recipes: dataset.recipes.length,
        sales: dataset.sales.length,
        inventoryEvents: dataset.inventory_events.length,
        expenses: dataset.expenses.length,
      },
    },
    filters: { date, channel, search },
    summary,
    menus: dataset.menus,
    rows,
  };
}

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function periodRange(period, anchorDate) {
  const anchor = parseDate(anchorDate);
  if (!anchor) return null;
  if (period === 'day') return { start: anchor, end: anchor };
  if (period === 'month') {
    return { start: new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1)), end: new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)) };
  }
  const mondayOffset = (anchor.getUTCDay() + 6) % 7;
  const start = addDays(anchor, -mondayOffset);
  return { start, end: addDays(start, 6) };
}

function buildPerformancePayload(url, dataPath = RUNTIME_STORE_PATH) {
  const dataset = loadDataset(dataPath);
  const period = ['day', 'week', 'month'].includes(url.searchParams.get('period')) ? url.searchParams.get('period') : 'week';
  const anchor = url.searchParams.get('date') || dataset.meta.as_of;
  const range = periodRange(period, anchor);
  if (!range) throw new Error('날짜 형식이 올바르지 않습니다.');
  const startDate = formatDate(range.start);
  const endDate = formatDate(range.end);
  const menuById = new Map(dataset.menus.map((menu) => [menu.menu_id, menu]));
  const sales = dataset.sales.filter((sale) => sale.date >= startDate && sale.date <= endDate);
  const summary = sales.reduce((acc, sale) => ({
    recordCount: acc.recordCount + 1,
    quantity: acc.quantity + sale.quantity,
    netSales: acc.netSales + sale.net_sales,
    discount: acc.discount + sale.discount_amount,
    paymentFee: acc.paymentFee + sale.payment_fee,
  }), { recordCount: 0, quantity: 0, netSales: 0, discount: 0, paymentFee: 0 });
  const calendarByDate = new Map(dataset.calendar.map((day) => [day.date, day]));
  const daily = [];
  for (let cursor = range.start; cursor <= range.end; cursor = addDays(cursor, 1)) {
    const date = formatDate(cursor);
    const calendar = calendarByDate.get(date);
    const daySales = sales.filter((sale) => sale.date === date);
    const complete = Boolean(calendar?.record_complete);
    const status = complete ? '마감 완료' : calendar && !calendar.is_open ? '휴무' : '미마감';
    daily.push({ date, status, isOpen: calendar?.is_open ?? null, recordComplete: complete, quantity: complete ? daySales.reduce((sum, sale) => sum + sale.quantity, 0) : null, netSales: complete ? daySales.reduce((sum, sale) => sum + sale.net_sales, 0) : null, note: calendar?.note || '' });
  }
  const menuTotals = [...new Map(sales.map((sale) => [sale.menu_id, sale])).keys()].map((menuId) => {
    const menuSales = sales.filter((sale) => sale.menu_id === menuId);
    return { menuId, menuName: menuById.get(menuId)?.name || menuId, quantity: menuSales.reduce((sum, sale) => sum + sale.quantity, 0), netSales: menuSales.reduce((sum, sale) => sum + sale.net_sales, 0) };
  }).sort((a, b) => b.netSales - a.netSales);
  return { meta: dataset.meta, period, anchor, range: { start: startDate, end: endDate }, summary, daily, menuTotals, isComplete: daily.every((day) => day.recordComplete || day.status === '휴무') };
}

function buildProfitabilityPayload(url, dataPath = RUNTIME_STORE_PATH) {
  const dataset = loadDataset(dataPath);
  const period = ['day', 'week', 'month'].includes(url.searchParams.get('period')) ? url.searchParams.get('period') : 'day';
  const anchor = url.searchParams.get('date') || dataset.meta.as_of;
  const range = periodRange(period, anchor);
  if (!range) throw new Error('날짜 형식이 올바르지 않습니다.');
  const channel = url.searchParams.get('channel') || '전체';
  const sales = dataset.sales.filter((sale) => sale.date >= formatDate(range.start) && sale.date <= formatDate(range.end) && (channel === '전체' || sale.channel === channel));
  const rows = dataset.menus.map((menu) => {
    const menuSales = sales.filter((sale) => sale.menu_id === menu.menu_id);
    const quantity = menuSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const netSales = menuSales.reduce((sum, sale) => sum + sale.net_sales, 0);
    const foodCost = menuSales.every((sale) => Number.isFinite(sale.unit_food_cost_snapshot)) ? menuSales.reduce((sum, sale) => sum + sale.quantity * sale.unit_food_cost_snapshot, 0) : null;
    const packagingCost = menuSales.every((sale) => Number.isFinite(sale.unit_packaging_cost_snapshot)) ? menuSales.reduce((sum, sale) => sum + sale.quantity * sale.unit_packaging_cost_snapshot, 0) : null;
    const paymentFee = menuSales.every((sale) => Number.isFinite(sale.payment_fee)) ? menuSales.reduce((sum, sale) => sum + sale.payment_fee, 0) : null;
    const contribution = foodCost == null || packagingCost == null || paymentFee == null ? null : netSales - foodCost - packagingCost - paymentFee;
    return { menuId: menu.menu_id, menuName: menu.name, category: menu.category, quantity, netSales, foodCost, packagingCost, paymentFee, contribution, margin: contribution == null || netSales === 0 ? null : contribution / netSales * 100, status: !menuSales.length ? '기간 판매 없음' : contribution == null ? '원가 미입력' : '정상 기록됨' };
  });
  const active = rows.filter((row) => row.quantity > 0);
  const total = active.reduce((acc, row) => ({ netSales: acc.netSales + row.netSales, foodCost: acc.foodCost + (row.foodCost || 0), packagingCost: acc.packagingCost + (row.packagingCost || 0), paymentFee: acc.paymentFee + (row.paymentFee || 0), contribution: acc.contribution + (row.contribution || 0), quantity: acc.quantity + row.quantity }), { netSales: 0, foodCost: 0, packagingCost: 0, paymentFee: 0, contribution: 0, quantity: 0 });
  return { meta: dataset.meta, period, anchor, range: { start: formatDate(range.start), end: formatDate(range.end) }, channel, summary: { ...total, variableCost: total.foodCost + total.packagingCost + total.paymentFee, margin: total.netSales ? total.contribution / total.netSales * 100 : null }, rows };
}

function buildPnlPayload(url, dataPath = RUNTIME_STORE_PATH) {
  const dataset = loadDataset(dataPath);
  const period = ['day', 'week', 'month'].includes(url.searchParams.get('period')) ? url.searchParams.get('period') : 'day';
  const anchor = url.searchParams.get('date') || dataset.meta.as_of;
  const range = periodRange(period, anchor);
  if (!range) throw new Error('날짜 형식이 올바르지 않습니다.');
  const start = formatDate(range.start); const end = formatDate(range.end);
  const sales = dataset.sales.filter((sale) => sale.date >= start && sale.date <= end);
  const variable = sales.reduce((acc, sale) => ({ foodCost: acc.foodCost + sale.quantity * (sale.unit_food_cost_snapshot || 0), packagingCost: acc.packagingCost + sale.quantity * (sale.unit_packaging_cost_snapshot || 0), paymentFee: acc.paymentFee + sale.payment_fee }), { foodCost: 0, packagingCost: 0, paymentFee: 0 });
  const netSales = sales.reduce((sum, sale) => sum + sale.net_sales, 0);
  const expenses = dataset.expenses.filter((expense) => expense.date >= start && expense.date <= end);
  const actualExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categories = [...new Map(expenses.map((expense) => [expense.category, expense.category])).keys()].map((category) => { const items = expenses.filter((expense) => expense.category === category); return { category, count: items.length, amount: items.reduce((sum, expense) => sum + expense.amount, 0) }; }).sort((a, b) => b.amount - a.amount);
  const contribution = netSales - variable.foodCost - variable.packagingCost - variable.paymentFee;
  const planTotal = dataset.monthly_expense_plan.filter((plan) => plan.month >= start.slice(0, 7) && plan.month <= end.slice(0, 7)).reduce((sum, plan) => sum + plan.amount, 0);
  return { meta: dataset.meta, period, anchor, range: { start, end }, summary: { netSales, variableCost: variable.foodCost + variable.packagingCost + variable.paymentFee, ...variable, contribution, actualExpenses, operatingProfit: contribution - actualExpenses, margin: netSales ? (contribution - actualExpenses) / netSales * 100 : null }, expenses: categories, expenseRecordCount: expenses.length, monthlyPlanTotal: planTotal, monthlyPlanIncluded: false, expenseStatus: expenses.length ? '실제 비용 기록 반영' : '비용 기록 없음' };
}

function buildInventoryPayload(url, dataPath = RUNTIME_STORE_PATH) {
  const dataset = loadDataset(dataPath);
  const asOf = url.searchParams.get('date') || dataset.meta.as_of;
  if (!parseDate(asOf)) throw new Error('날짜 형식이 올바르지 않습니다.');
  const completeDates = new Set(dataset.calendar.filter((day) => day.date <= asOf && day.record_complete).map((day) => day.date));
  const menuById = new Map(dataset.menus.map((menu) => [menu.menu_id, menu]));
  const recipes = dataset.recipes;
  const rows = dataset.materials.map((material) => {
    const opening = dataset.opening_inventory.find((item) => item.material_id === material.material_id);
    const events = dataset.inventory_events.filter((event) => event.material_id === material.material_id && event.date <= asOf);
    const inbound = events.filter((event) => event.event_type === '입고').reduce((sum, event) => sum + event.quantity, 0);
    const waste = events.filter((event) => event.event_type === '폐기').reduce((sum, event) => sum + event.quantity, 0);
    const adjustment = events.filter((event) => event.event_type === '실사조정').reduce((sum, event) => sum + event.quantity, 0);
    const latestCount = events.filter((event) => event.event_type === '실사조정' && Number.isFinite(event.counted_quantity)).sort((a, b) => b.date.localeCompare(a.date))[0]?.counted_quantity ?? null;
    let usage = 0; let recipeKnown = true;
    for (const sale of dataset.sales.filter((sale) => sale.date <= asOf && completeDates.has(sale.date))) {
      const menu = menuById.get(sale.menu_id);
      const matching = recipes.filter((recipe) => recipe.menu_id === sale.menu_id && recipe.recipe_version === (sale.recipe_version || menu?.recipe_version) && recipe.material_id === material.material_id && (!recipe.channel_only || recipe.channel_only === sale.channel));
      if (!matching.length) continue;
      usage += matching.reduce((sum, recipe) => sum + recipe.quantity * sale.quantity, 0);
    }
    const calculated = (opening?.quantity || 0) + inbound + waste + adjustment - usage;
    const difference = latestCount == null ? null : latestCount - calculated;
    const status = !opening || !material.unit || !recipeKnown ? '확인 필요' : difference == null ? '실사 기록 없음' : difference === 0 ? '정상 일치' : '실사조정 필요';
    return { materialId: material.material_id, name: material.name, unit: material.unit, opening: opening?.quantity ?? null, inbound, waste, adjustment, usage, calculated, counted: latestCount, difference, safetyStock: material.safety_days, status };
  });
  return { meta: dataset.meta, asOf, summary: { total: rows.length, mismatch: rows.filter((row) => row.status === '실사조정 필요').length, normal: rows.filter((row) => row.status === '정상 일치').length, needsReview: rows.filter((row) => row.status !== '정상 일치').length }, rows };
}

function validateSale(input, dataset, existingId = null) {
  const errors = {};
  const date = String(input.date || '');
  if (!parseDate(date)) errors.date = '판매 일자를 YYYY-MM-DD 형식으로 입력해 주세요.';
  if (!dataset.menus.some((menu) => menu.menu_id === input.menuId)) errors.menuId = '등록된 메뉴를 선택해 주세요.';
  if (!['매장', '포장', '배달'].includes(input.channel)) errors.channel = '판매 채널을 선택해 주세요.';
  const quantity = Number(input.quantity);
  const unitPrice = Number(input.unitPrice);
  const discount = Number(input.discount || 0);
  if (!Number.isInteger(quantity) || quantity <= 0) errors.quantity = '판매 수량은 1 이상의 정수여야 합니다.';
  if (!Number.isFinite(unitPrice) || unitPrice < 0) errors.unitPrice = '단가는 0 이상의 숫자여야 합니다.';
  if (!Number.isFinite(discount) || discount < 0) errors.discount = '할인 금액은 0 이상의 숫자여야 합니다.';
  if (!errors.quantity && !errors.unitPrice && !errors.discount && discount > quantity * unitPrice) errors.discount = '할인 금액이 총 판매액을 초과할 수 없습니다.';
  if (Object.keys(errors).length) return { errors };
  const duplicate = dataset.sales.find((sale) => sale.sale_id !== existingId && sale.date === date && sale.menu_id === input.menuId && sale.channel === input.channel);
  if (duplicate) return { errors: { form: '같은 일자·메뉴·채널의 기록이 이미 있습니다. 기존 기록을 수정해 주세요.' } };
  return { value: { date, menu_id: input.menuId, channel: input.channel, quantity, unit_price: unitPrice, discount_amount: discount, net_sales: quantity * unitPrice - discount } };
}

function enrichSale(sale, dataset) {
  const sameMenu = dataset.sales.filter((row) => row.menu_id === sale.menu_id && row.sale_id !== sale.sale_id);
  const foodCosts = sameMenu.map((row) => row.unit_food_cost_snapshot).filter(Number.isFinite);
  const packagingCosts = sameMenu.filter((row) => row.channel === sale.channel).map((row) => row.unit_packaging_cost_snapshot).filter(Number.isFinite);
  const unitFood = foodCosts.length ? Math.round(foodCosts.reduce((a, b) => a + b, 0) / foodCosts.length) : 0;
  const unitPackaging = sale.channel === '매장' ? 0 : (packagingCosts.length ? Math.round(packagingCosts.reduce((a, b) => a + b, 0) / packagingCosts.length) : 0);
  return { ...sale, sale_id: sale.sale_id, payment_fee: Math.round(sale.net_sales * 0.015), recipe_version: dataset.menus.find((menu) => menu.menu_id === sale.menu_id)?.recipe_version || 'R1', unit_food_cost_snapshot: unitFood, unit_packaging_cost_snapshot: unitPackaging };
}

function nextSaleId(dataset) {
  const max = dataset.sales.reduce((current, sale) => Math.max(current, Number(String(sale.sale_id).replace(/^S/, '')) || 0), 0);
  return `S${String(max + 1).padStart(6, '0')}`;
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) { res.writeHead(404); res.end('Not Found'); return; }
    const ext = path.extname(filePath);
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

function createServer(options = {}) {
  const dataPath = options.dataPath || RUNTIME_STORE_PATH;
  ensureStore(dataPath);
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
    try {
      if (req.method === 'POST' && url.pathname === '/api/login') {
        const body = JSON.parse(await readBody(req) || '{}');
        if (body.email !== 'operator@prepcafe.local' || body.password !== 'prep-cafe-demo') {
          sendJson(res, 401, { error: '운영자 이메일 또는 비밀번호를 확인해 주세요.' });
          return;
        }
        const sessionId = crypto.randomBytes(24).toString('hex');
        sessions.set(sessionId, { email: body.email, role: '운영 관리자', storeName: '프렙 카페 본점' });
        sendJson(res, 200, { authenticated: true, user: sessions.get(sessionId) }, {
          'Set-Cookie': `prep_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/`,
        });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/session') {
        const session = getSession(req);
        sendJson(res, 200, session ? { authenticated: true, user: session } : { authenticated: false });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/logout') {
        const sessionId = parseCookies(req).prep_session;
        if (sessionId) sessions.delete(sessionId);
        sendJson(res, 200, { authenticated: false }, { 'Set-Cookie': 'prep_session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/' });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/store-data') {
        if (!requireSession(req, res)) return;
        sendJson(res, 200, buildStorePayload(url, dataPath));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/performance') {
        if (!requireSession(req, res)) return;
        sendJson(res, 200, buildPerformancePayload(url, dataPath));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/profitability') {
        if (!requireSession(req, res)) return;
        sendJson(res, 200, buildProfitabilityPayload(url, dataPath));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/pnl') {
        if (!requireSession(req, res)) return;
        sendJson(res, 200, buildPnlPayload(url, dataPath));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/inventory') {
        if (!requireSession(req, res)) return;
        sendJson(res, 200, buildInventoryPayload(url, dataPath));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/sales') {
        if (!requireSession(req, res)) return;
        const dataset = loadDataset(dataPath);
        const body = JSON.parse(await readBody(req) || '{}');
        const checked = validateSale(body, dataset);
        if (checked.errors) { sendJson(res, 422, { error: '입력값을 확인해 주세요.', errors: checked.errors }); return; }
        const sale = enrichSale({ ...checked.value, sale_id: nextSaleId(dataset) }, dataset);
        dataset.sales.push(sale);
        saveDataset(dataset, dataPath);
        sendJson(res, 201, { sale });
        return;
      }
      if (req.method === 'PUT' && url.pathname.startsWith('/api/sales/')) {
        if (!requireSession(req, res)) return;
        const saleId = decodeURIComponent(url.pathname.slice('/api/sales/'.length));
        const dataset = loadDataset(dataPath);
        const index = dataset.sales.findIndex((sale) => sale.sale_id === saleId);
        if (index < 0) { sendJson(res, 404, { error: '판매 기록을 찾을 수 없습니다.' }); return; }
        const body = JSON.parse(await readBody(req) || '{}');
        const checked = validateSale(body, dataset, saleId);
        if (checked.errors) { sendJson(res, 422, { error: '입력값을 확인해 주세요.', errors: checked.errors }); return; }
        const sale = enrichSale({ ...checked.value, sale_id: saleId }, dataset);
        dataset.sales[index] = sale;
        saveDataset(dataset, dataPath);
        sendJson(res, 200, { sale });
        return;
      }
      if (req.method === 'DELETE' && url.pathname.startsWith('/api/sales/')) {
        if (!requireSession(req, res)) return;
        const saleId = decodeURIComponent(url.pathname.slice('/api/sales/'.length));
        const dataset = loadDataset(dataPath);
        const index = dataset.sales.findIndex((sale) => sale.sale_id === saleId);
        if (index < 0) { sendJson(res, 404, { error: '판매 기록을 찾을 수 없습니다.' }); return; }
        dataset.sales.splice(index, 1);
        saveDataset(dataset, dataPath);
        sendJson(res, 200, { deleted: saleId });
        return;
      }
      if (req.method === 'GET') {
        serveStatic(req, res, url.pathname);
        return;
      }
      sendJson(res, 405, { error: '허용되지 않는 요청입니다.' });
    } catch (error) {
      sendJson(res, 500, { error: '서버에서 자료를 읽는 중 문제가 발생했습니다.' });
    }
  });
}

if (require.main === module) {
  createServer().listen(PORT, HOST, () => console.log(`Prep Cafe server listening at http://${HOST}:${PORT}`));
}

module.exports = { createServer, buildStorePayload, buildPerformancePayload, buildProfitabilityPayload, buildPnlPayload, buildInventoryPayload, loadDataset, validateSale };
