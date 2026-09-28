const state = { channel: localStorage.getItem('salesChannel') || '전체', data: null, period: localStorage.getItem('performancePeriod') || 'day', performanceDate: localStorage.getItem('performanceDate') || '2026-09-18', profitPeriod: localStorage.getItem('profitPeriod') || 'day', pnlPeriod: localStorage.getItem('pnlPeriod') || 'day', inventoryFilter: localStorage.getItem('inventoryFilter') || 'all' };
const $ = (id) => document.getElementById(id);
const money = (value) => new Intl.NumberFormat('ko-KR').format(value);
const salesSections = [document.querySelector('.content > .info-banner'), document.querySelector('.content > .page-heading'), document.querySelector('.content > .filter-panel'), document.querySelector('.content > .data-section'), document.querySelector('.content > .data-proof')];

async function requestJson(url, options) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const payload = await response.json();
  if (!response.ok) {
    const message = payload.errors ? Object.values(payload.errors).join(' ') : payload.error;
    const error = new Error(message || '요청을 처리하지 못했습니다.');
    error.details = payload.errors || {};
    throw error;
  }
  return payload;
}

function showApp() { $('loginView').hidden = true; $('appView').hidden = false; }
function showLogin() { $('appView').hidden = true; $('loginView').hidden = false; }
function formatMaybe(value) { return value == null ? '—' : money(value); }

function setView(view) {
  const performance = view === 'performance';
  salesSections.forEach((section) => { if (section) section.hidden = performance; });
  salesSections.forEach((section) => { if (section) section.hidden = view !== 'sales'; });
  $('performanceView').hidden = !performance;
  $('profitabilityView').hidden = view !== 'profitability';
  $('inventoryView').hidden = view !== 'inventory';
  document.querySelectorAll('.nav-item[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  if (performance) loadPerformance();
  if (view === 'profitability') loadProfitability();
  if (view === 'inventory') loadPnlAndInventory();
}

function populateMenuOptions() {
  if (!state.data) return;
  const selected = $('saleMenu').value;
  $('saleMenu').innerHTML = state.data.menus.map((menu) => `<option value="${menu.menu_id}">${menu.name} · ${menu.category}</option>`).join('');
  if (selected && state.data.menus.some((menu) => menu.menu_id === selected)) $('saleMenu').value = selected;
}

function render(data) {
  state.data = data;
  const { meta, store, source, summary, rows } = data;
  $('storeAsOf').textContent = store.asOf;
  $('headerAsOf').textContent = store.asOf;
  $('periodText').textContent = `${meta.start_date} ~ ${meta.as_of}`;
  $('totalQuantity').textContent = money(summary.quantity);
  $('totalSales').textContent = money(summary.netSales);
  const variableCost = rows.reduce((sum, row) => sum + row.foodCost + row.packagingCost + row.paymentFee, 0);
  $('costRate').textContent = summary.netSales ? (variableCost / summary.netSales * 100).toFixed(1) : '—';
  $('rowCount').textContent = `${rows.length}건`;
  $('loadState').textContent = `${data.filters.date} · ${data.filters.channel} · 서버 원본에서 조회 완료`;
  $('salesCount').textContent = source.counts.sales.toLocaleString('ko-KR');
  $('menuCount').textContent = source.counts.menus;
  $('materialCount').textContent = source.counts.materials;
  $('recipeCount').textContent = source.counts.recipes;
  $('dateFilter').value = data.filters.date;
  populateMenuOptions();
  const body = $('salesBody'); body.innerHTML = '';
  $('emptyState').hidden = rows.length > 0;
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="mono">${row.date}</td><td><span class="menu-name">${row.menuName}</span><span class="menu-category">${row.category} · ${row.recipeVersion}</span></td><td><span class="channel-badge ${row.channel}">${row.channel}</span></td><td class="right mono">${money(row.quantity)}잔</td><td class="right mono">₩${money(row.unitPrice)}</td><td class="right mono">${row.discount ? `₩${money(row.discount)}` : '—'}</td><td class="right mono"><strong>₩${money(row.netSales)}</strong></td><td class="right mono">${row.id}</td><td class="right"><div class="action-buttons"><button class="table-action" data-edit="${row.id}" type="button">수정</button><button class="table-action delete" data-delete="${row.id}" type="button">삭제</button></div></td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => openSaleModal(rows.find((row) => row.id === button.dataset.edit))));
  body.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteSale(button.dataset.delete)));
}

async function loadData() {
  localStorage.setItem('salesDate', $('dateFilter').value || '2026-09-18');
  localStorage.setItem('salesSearch', $('searchFilter').value || '');
  const params = new URLSearchParams({ date: $('dateFilter').value || '2026-09-18', channel: state.channel, q: $('searchFilter').value });
  try { render(await requestJson(`/api/store-data?${params}`)); }
  catch (error) { if (error.message === '로그인이 필요합니다.') { showLogin(); return; } $('loadState').textContent = error.message; }
}

function openSaleModal(row = null) {
  populateMenuOptions();
  $('saleModal').hidden = false;
  $('saleFormError').hidden = true;
  $('saleModalTitle').textContent = row ? '판매 기록 수정' : '신규 판매 기록 입력';
  $('saleId').value = row?.id || '';
  $('saleDate').value = row?.date || $('dateFilter').value || '2026-09-18';
  $('saleMenu').value = row?.menuId || state.data?.menus[0]?.menu_id || '';
  $('saleChannel').value = row?.channel || '매장';
  $('saleQuantity').value = row?.quantity || 1;
  $('saleUnitPrice').value = row?.unitPrice ?? state.data?.menus.find((menu) => menu.menu_id === $('saleMenu').value)?.price ?? 0;
  $('saleDiscount').value = row?.discount || 0;
  updateSaleTotal();
  $('saleQuantity').focus();
}

function closeSaleModal() { $('saleModal').hidden = true; }

function updateSaleTotal() {
  const quantity = Number($('saleQuantity').value || 0);
  const unitPrice = Number($('saleUnitPrice').value || 0);
  const discount = Number($('saleDiscount').value || 0);
  $('saleNetSales').textContent = `₩${money(Math.max(0, quantity * unitPrice - discount))}`;
  $('saleCalculation').textContent = `${money(quantity)} × ₩${money(unitPrice)} - ₩${money(discount)}`;
}

async function saveSale(event) {
  event.preventDefault();
  $('saleFormError').hidden = true;
  const id = $('saleId').value;
  const body = { date: $('saleDate').value, menuId: $('saleMenu').value, channel: $('saleChannel').value, quantity: Number($('saleQuantity').value), unitPrice: Number($('saleUnitPrice').value), discount: Number($('saleDiscount').value) };
  try {
    await requestJson(id ? `/api/sales/${encodeURIComponent(id)}` : '/api/sales', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    closeSaleModal();
    $('dateFilter').value = body.date;
    await loadData();
  } catch (error) { $('saleFormError').textContent = error.message; $('saleFormError').hidden = false; }
}

async function deleteSale(id) {
  const row = state.data?.rows.find((item) => item.id === id);
  if (!window.confirm(`${row?.menuName || id} 판매 기록을 삭제하시겠습니까?`)) return;
  try { await requestJson(`/api/sales/${encodeURIComponent(id)}`, { method: 'DELETE' }); await loadData(); }
  catch (error) { $('loadState').textContent = error.message; }
}

function renderPerformance(data) {
  $('performanceDate').value = data.anchor;
  $('performanceRange').textContent = `${data.range.start} ~ ${data.range.end}`;
  $('completionBadge').textContent = data.isComplete ? '마감 완료 범위' : '미마감 날짜 포함';
  $('completionBadge').classList.toggle('incomplete', !data.isComplete);
  $('performanceStatus').textContent = `${data.range.start} ~ ${data.range.end} · ${data.period === 'day' ? '일간' : data.period === 'week' ? '주간' : '월간'} 저장 자료 집계`;
  $('performanceQuantity').textContent = money(data.summary.quantity);
  $('performanceSales').textContent = money(data.summary.netSales);
  $('performanceRecords').textContent = money(data.summary.recordCount);
  $('performanceDiscount').textContent = money(data.summary.discount);
  $('dailyPerformanceBody').innerHTML = data.daily.map((day) => `<tr><td class="mono">${day.date}</td><td><span class="status-badge ${day.status === '마감 완료' ? '' : day.status === '휴무' ? 'closed' : 'pending'}">${day.status}</span></td><td class="right mono">${formatMaybe(day.quantity)}${day.quantity == null ? '' : '잔'}</td><td class="right mono">${day.netSales == null ? '—' : `₩${money(day.netSales)}`}</td><td>${day.note || '—'}</td></tr>`).join('');
  $('menuPerformanceBody').innerHTML = data.menuTotals.length ? data.menuTotals.map((row) => `<tr><td class="menu-name">${row.menuName}</td><td class="right mono">${money(row.quantity)}잔</td><td class="right mono"><strong>₩${money(row.netSales)}</strong></td></tr>`).join('') : '<tr><td colspan="3" class="empty-state">선택 기간의 확정 판매 자료가 없습니다.</td></tr>';
}

async function loadPerformance() {
  state.performanceDate = $('performanceDate').value || state.performanceDate;
  localStorage.setItem('performancePeriod', state.period);
  localStorage.setItem('performanceDate', state.performanceDate);
  const params = new URLSearchParams({ period: state.period, date: state.performanceDate });
  try { renderPerformance(await requestJson(`/api/performance?${params}`)); }
  catch (error) { $('performanceStatus').textContent = error.message; }
}

function shiftPerformanceDate(direction) {
  const date = new Date(`${$('performanceDate').value}T00:00:00Z`);
  if (state.period === 'day') date.setUTCDate(date.getUTCDate() + direction);
  if (state.period === 'week') date.setUTCDate(date.getUTCDate() + direction * 7);
  if (state.period === 'month') date.setUTCMonth(date.getUTCMonth() + direction);
  $('performanceDate').value = date.toISOString().slice(0, 10);
  loadPerformance();
}

function renderProfitability(data) {
  $('profitabilityDate').value = data.anchor;
  $('profitabilityStatus').textContent = `${data.range.start} ~ ${data.range.end} · ${data.channel} · 판매 당시 원가 스냅샷 집계`;
  $('profitabilitySales').textContent = money(data.summary.netSales);
  $('profitabilityVariable').textContent = money(data.summary.variableCost);
  $('profitabilityContribution').textContent = money(data.summary.contribution);
  $('profitabilityMargin').textContent = data.summary.margin == null ? '—' : data.summary.margin.toFixed(1);
  $('profitabilityBody').innerHTML = data.rows.map((row) => {
    const statusClass = row.status === '정상 기록됨' ? 'inventory-ok' : row.status === '원가 미입력' ? 'inventory-alert' : 'inventory-pending';
    return `<tr><td><span class="menu-name">${row.menuName}</span><span class="menu-category">${row.category}</span></td><td class="right mono">${money(row.quantity)}잔</td><td class="right mono">${row.quantity ? `₩${money(row.netSales)}` : '—'}</td><td class="right mono">${row.foodCost == null ? '원가 미입력' : `₩${money(row.foodCost)}`}</td><td class="right mono">${row.packagingCost == null ? '—' : `₩${money(row.packagingCost)}`}</td><td class="right mono">${row.paymentFee == null ? '—' : `₩${money(row.paymentFee)}`}</td><td class="right mono">${row.contribution == null ? '계산 보류' : `₩${money(row.contribution)}`}</td><td class="${statusClass}">${row.status}</td></tr>`;
  }).join('');
}

async function loadProfitability() {
  const params = new URLSearchParams({ period: state.profitPeriod, date: $('profitabilityDate').value || state.data?.meta.as_of || '2026-09-18', channel: $('profitabilityChannel').value });
  localStorage.setItem('profitPeriod', state.profitPeriod);
  localStorage.setItem('profitDate', params.get('date'));
  try { renderProfitability(await requestJson(`/api/profitability?${params}`)); }
  catch (error) { $('profitabilityStatus').textContent = error.message; }
}

function renderPnl(data) {
  $('pnlDate').value = data.anchor;
  $('pnlStatus').textContent = `${data.range.start} ~ ${data.range.end} · ${data.expenseStatus} · 월별 계획은 중복 합산하지 않음`;
  $('pnlSales').textContent = money(data.summary.netSales);
  $('pnlVariable').textContent = money(data.summary.variableCost);
  $('pnlExpenses').textContent = money(data.summary.actualExpenses);
  $('pnlProfit').textContent = money(data.summary.operatingProfit);
  $('pnlExpenseNote').textContent = `${data.expenseRecordCount.toLocaleString('ko-KR')}건의 실제 비용 기록만 반영 · 참고 월별 계획 합계 ₩${money(data.monthlyPlanTotal)} (손익에는 미포함)`;
  $('expenseBody').innerHTML = data.expenses.length ? data.expenses.map((expense) => `<div class="expense-card"><span>${expense.category} · ${expense.count}건</span><strong>₩${money(expense.amount)}</strong><small>실제 발생 비용 기록</small></div>`).join('') : '<div class="empty-state">선택 기간의 비용 기록 없음</div>';
}

function inventoryValue(value, unit) { return value == null ? '—' : `${money(value)}${unit}`; }

function renderInventory(data) {
  const filter = state.inventoryFilter;
  const rows = data.rows.filter((row) => filter === 'all' || (filter === 'mismatch' ? row.status === '실사조정 필요' : row.status === '정상 일치'));
  $('inventoryBody').innerHTML = rows.map((row) => {
    const statusClass = row.status === '정상 일치' ? 'inventory-ok' : row.status === '실사조정 필요' ? 'inventory-alert' : 'inventory-pending';
    return `<tr><td><span class="menu-name">${row.name}</span><span class="menu-category">${row.materialId}</span></td><td class="mono">${row.unit}</td><td class="right mono">${inventoryValue(row.opening, row.unit)}</td><td class="right mono inventory-ok">+${inventoryValue(row.inbound, row.unit)}</td><td class="right mono inventory-alert">${inventoryValue(row.waste, row.unit)}</td><td class="right mono">-${inventoryValue(row.usage, row.unit)}</td><td class="right mono"><strong>${inventoryValue(row.calculated, row.unit)}</strong></td><td class="right mono">${inventoryValue(row.counted, row.unit)}</td><td class="right mono ${row.difference == null ? '' : row.difference === 0 ? 'inventory-ok' : 'inventory-alert'}">${row.difference == null ? '—' : inventoryValue(row.difference, row.unit)}</td><td class="${statusClass}">${row.status}</td></tr>`;
  }).join('');
  document.querySelectorAll('.inventory-filter').forEach((button) => button.classList.toggle('active', button.dataset.inventoryFilter === filter));
}

async function loadPnlAndInventory() {
  const date = $('pnlDate').value || localStorage.getItem('pnlDate') || state.data?.meta.as_of || '2026-09-18';
  $('pnlDate').value = date;
  localStorage.setItem('pnlPeriod', state.pnlPeriod);
  localStorage.setItem('pnlDate', date);
  const params = new URLSearchParams({ period: state.pnlPeriod, date });
  try {
    const [pnl, inventory] = await Promise.all([requestJson(`/api/pnl?${params}`), requestJson(`/api/inventory?date=${encodeURIComponent(date)}`)]);
    renderPnl(pnl); renderInventory(inventory);
  } catch (error) { $('pnlStatus').textContent = error.message; }
}

async function init() {
  const session = await requestJson('/api/session');
  if (!session.authenticated) { showLogin(); return; }
  showApp();
  $('dateFilter').value = localStorage.getItem('salesDate') || '2026-09-18';
  $('searchFilter').value = localStorage.getItem('salesSearch') || '';
  document.querySelectorAll('.channel').forEach((button) => button.classList.toggle('active', button.dataset.channel === state.channel));
  await loadData();
  $('performanceDate').value = localStorage.getItem('performanceDate') || state.data.meta.as_of;
  $('profitabilityDate').value = localStorage.getItem('profitDate') || state.data.meta.as_of;
  $('pnlDate').value = localStorage.getItem('pnlDate') || state.data.meta.as_of;
  document.querySelectorAll('.period-tab').forEach((button) => button.classList.toggle('active', button.dataset.period === state.period));
  document.querySelectorAll('.profit-period-tab').forEach((button) => button.classList.toggle('active', button.dataset.period === state.profitPeriod));
  document.querySelectorAll('.pnl-period-tab').forEach((button) => button.classList.toggle('active', button.dataset.period === state.pnlPeriod));
}

$('loginForm').addEventListener('submit', async (event) => { event.preventDefault(); $('loginError').hidden = true; try { await requestJson('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('email').value, password: $('password').value }) }); showApp(); await loadData(); } catch (error) { $('loginError').textContent = error.message; $('loginError').hidden = false; } });
$('logoutButton').addEventListener('click', async () => { await requestJson('/api/logout', { method: 'POST' }); showLogin(); });
$('refreshButton').addEventListener('click', loadData);
$('dateFilter').addEventListener('change', loadData);
$('searchFilter').addEventListener('input', loadData);
$('newSaleButton').addEventListener('click', () => openSaleModal());
$('closeSaleModal').addEventListener('click', closeSaleModal);
$('cancelSale').addEventListener('click', closeSaleModal);
$('saleForm').addEventListener('submit', saveSale);
['saleQuantity', 'saleUnitPrice', 'saleDiscount'].forEach((id) => $(id).addEventListener('input', updateSaleTotal));
$('saleMenu').addEventListener('change', () => { if (!$('saleId').value) $('saleUnitPrice').value = state.data?.menus.find((menu) => menu.menu_id === $('saleMenu').value)?.price || 0; updateSaleTotal(); });
document.querySelectorAll('.channel').forEach((button) => button.addEventListener('click', () => { state.channel = button.dataset.channel; localStorage.setItem('salesChannel', state.channel); document.querySelectorAll('.channel').forEach((item) => item.classList.toggle('active', item === button)); loadData(); }));
document.querySelectorAll('.nav-item[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
document.querySelectorAll('.period-tab').forEach((button) => button.addEventListener('click', () => { state.period = button.dataset.period; localStorage.setItem('performancePeriod', state.period); document.querySelectorAll('.period-tab').forEach((item) => item.classList.toggle('active', item === button)); loadPerformance(); }));
$('performanceDate').addEventListener('change', loadPerformance);
$('previousPeriod').addEventListener('click', () => shiftPerformanceDate(-1));
$('nextPeriod').addEventListener('click', () => shiftPerformanceDate(1));
$('todayPeriod').addEventListener('click', () => { $('performanceDate').value = state.data?.meta.as_of || '2026-09-18'; localStorage.setItem('performanceDate', $('performanceDate').value); loadPerformance(); });
document.querySelectorAll('.profit-period-tab').forEach((button) => button.addEventListener('click', () => { state.profitPeriod = button.dataset.period; document.querySelectorAll('.profit-period-tab').forEach((item) => item.classList.toggle('active', item === button)); loadProfitability(); }));
$('profitabilityDate').addEventListener('change', loadProfitability);
$('profitabilityChannel').addEventListener('change', loadProfitability);
document.querySelectorAll('.pnl-period-tab').forEach((button) => button.addEventListener('click', () => { state.pnlPeriod = button.dataset.period; document.querySelectorAll('.pnl-period-tab').forEach((item) => item.classList.toggle('active', item === button)); loadPnlAndInventory(); }));
$('pnlDate').addEventListener('change', loadPnlAndInventory);
document.querySelectorAll('.inventory-filter').forEach((button) => button.addEventListener('click', () => { state.inventoryFilter = button.dataset.inventoryFilter; localStorage.setItem('inventoryFilter', state.inventoryFilter); loadPnlAndInventory(); }));
init().catch((error) => { $('loginError').textContent = error.message; $('loginError').hidden = false; });
