// ===== STATE =====
let holdings = [];
let expenses = [];
let editId = null;
let pieChart = null;
let expChart = null;
let monthChart = null;

const COLORS = ['#4f8ef7','#26c97a','#f05b5b','#f5a623','#a78bfa','#34d399','#fb923c','#60a5fa','#f472b6','#4ade80'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ===== LOAD FROM STORAGE =====
function loadData() {
  try { holdings = JSON.parse(localStorage.getItem('pflio_holdings') || '[]'); } catch(e) { holdings = []; }
  try { expenses = JSON.parse(localStorage.getItem('pflio_expenses') || '[]'); } catch(e) { expenses = []; }
}

function saveData() {
  try {
    localStorage.setItem('pflio_holdings', JSON.stringify(holdings));
    localStorage.setItem('pflio_expenses', JSON.stringify(expenses));
  } catch(e) { console.warn('Storage save failed:', e); }
}

// ===== HELPERS =====
function fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
function fmtPct(n) { return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'; }
function showErr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}

// ===== TABS =====
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'expenses') renderExpenses();
  });
});

// ===== HOLDINGS =====
function addHolding() {
  const ticker = document.getElementById('h-ticker').value.trim().toUpperCase();
  const name   = document.getElementById('h-name').value.trim();
  const qty    = parseFloat(document.getElementById('h-qty').value);
  const cost   = parseFloat(document.getElementById('h-cost').value);
  const price  = parseFloat(document.getElementById('h-price').value);

  if (!ticker || !name || isNaN(qty) || isNaN(cost) || isNaN(price) || qty <= 0 || cost <= 0 || price <= 0) {
    showErr('h-err', 'Please fill all fields with valid positive values.'); return;
  }
  holdings.push({ id: Date.now(), ticker, name, qty, cost, price });
  saveData();
  ['h-ticker','h-name','h-qty','h-cost','h-price'].forEach(id => document.getElementById(id).value = '');
  renderHoldings();
}

function startEdit(id) { editId = id; renderHoldings(); }
function cancelEdit() { editId = null; renderHoldings(); }

function saveEdit(id) {
  const h = holdings.find(x => x.id === id);
  const qty   = parseFloat(document.getElementById('eq-' + id).value);
  const cost  = parseFloat(document.getElementById('ec-' + id).value);
  const price = parseFloat(document.getElementById('ep-' + id).value);
  if (isNaN(qty) || isNaN(cost) || isNaN(price) || qty <= 0 || cost <= 0 || price <= 0) {
    alert('Enter valid values before saving.'); return;
  }
  h.qty = qty; h.cost = cost; h.price = price;
  editId = null; saveData(); renderHoldings();
}

function removeHolding(id) {
  if (!confirm('Remove this holding?')) return;
  holdings = holdings.filter(h => h.id !== id);
  saveData(); renderHoldings();
}

function renderHoldings() {
  const body = document.getElementById('holdings-body');
  if (holdings.length === 0) {
    body.innerHTML = '<tr><td colspan="8" class="empty">No holdings yet — add one above.</td></tr>';
    document.getElementById('alloc-section').style.display = 'none';
    updateHMetrics(0, 0); return;
  }

  let totalValue = 0, totalInvested = 0;
  body.innerHTML = '';

  holdings.forEach(h => {
    const value    = h.qty * h.price;
    const invested = h.qty * h.cost;
    const pl       = value - invested;
    const plPct    = (pl / invested) * 100;
    totalValue    += value;
    totalInvested += invested;

    const tr = document.createElement('tr');
    if (editId === h.id) {
      tr.innerHTML = `
        <td class="ticker-cell">${h.ticker}</td>
        <td class="name-cell">${h.name}</td>
        <td class="r"><input class="edit-inp" id="eq-${h.id}" value="${h.qty}" type="number" style="width:65px"/></td>
        <td class="r"><input class="edit-inp" id="ec-${h.id}" value="${h.cost}" type="number" /></td>
        <td class="r"><input class="edit-inp" id="ep-${h.id}" value="${h.price}" type="number" /></td>
        <td class="r" colspan="2" style="color:var(--text3);font-size:12px;font-style:italic">editing…</td>
        <td class="r">
          <button class="icon-btn" onclick="saveEdit(${h.id})" title="Save" style="color:var(--green)">✓</button>
          <button class="icon-btn" onclick="cancelEdit()" title="Cancel">✕</button>
        </td>`;
    } else {
      tr.innerHTML = `
        <td class="ticker-cell">${h.ticker}</td>
        <td class="name-cell">${h.name}</td>
        <td class="r" style="font-family:var(--font-mono)">${h.qty}</td>
        <td class="r" style="color:var(--text2);font-family:var(--font-mono)">${fmt(h.cost)}</td>
        <td class="r" style="font-family:var(--font-mono)">${fmt(h.price)}</td>
        <td class="r" style="font-family:var(--font-mono)">${fmt(value)}</td>
        <td class="r pl-cell ${pl >= 0 ? 'pos' : 'neg'}">
          ${pl >= 0 ? '+' : ''}${fmt(pl)}
          <div class="pl-pct">${fmtPct(plPct)}</div>
        </td>
        <td class="r">
          <button class="icon-btn" onclick="startEdit(${h.id})" title="Edit">✎</button>
          <button class="icon-btn del" onclick="removeHolding(${h.id})" title="Delete">✕</button>
        </td>`;
    }
    body.appendChild(tr);
  });

  updateHMetrics(totalValue, totalInvested);
  renderPieChart();
}

function updateHMetrics(tv, ti) {
  const gain = tv - ti;
  const pct  = ti > 0 ? (gain / ti) * 100 : 0;
  document.getElementById('m-value').textContent    = fmt(tv);
  document.getElementById('m-invested').textContent = fmt(ti);
  const gEl = document.getElementById('m-gain');
  gEl.textContent = (gain >= 0 ? '+' : '') + fmt(gain);
  gEl.className = 'metric-value ' + (gain >= 0 ? 'pos' : 'neg');
  const pEl = document.getElementById('m-pct');
  pEl.textContent = fmtPct(pct);
  pEl.className = 'metric-sub ' + (gain >= 0 ? 'pos' : 'neg');
  document.getElementById('m-count').textContent = holdings.length;
}

function renderPieChart() {
  document.getElementById('alloc-section').style.display = 'block';
  const labels = holdings.map(h => h.ticker);
  const data   = holdings.map(h => Math.round(h.qty * h.price));
  const colors = holdings.map((_, i) => COLORS[i % COLORS.length]);
  const total  = data.reduce((a, b) => a + b, 0);

  // Legend
  document.getElementById('alloc-legend').innerHTML = holdings.map((h, i) => {
    const pct = total > 0 ? ((data[i] / total) * 100).toFixed(1) : '0.0';
    return `<span class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${h.ticker} ${pct}%</span>`;
  }).join('');

  if (pieChart) pieChart.destroy();
  const canvas = document.getElementById('pieChart');
  canvas.width = 200; canvas.height = 200;
  pieChart = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: false,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.parsed) + ' (' + ((ctx.parsed / total) * 100).toFixed(1) + '%)' } }
      }
    }
  });
  pieChart.resize(200, 200);
}

// ===== EXPENSES =====
function addExpense() {
  const month = document.getElementById('e-month').value;
  const year  = document.getElementById('e-year').value.trim();
  const cat   = document.getElementById('e-cat').value;
  const desc  = document.getElementById('e-desc').value.trim();
  const amt   = parseFloat(document.getElementById('e-amt').value);

  if (!desc || isNaN(amt) || amt <= 0) {
    showErr('e-err', 'Please enter a description and a valid amount.'); return;
  }
  expenses.push({ id: Date.now(), month, year, cat, desc, amt });
  saveData();
  document.getElementById('e-desc').value = '';
  document.getElementById('e-amt').value  = '';
  populateYearFilter();
  renderExpenses();
}

function removeExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  saveData(); populateYearFilter(); renderExpenses();
}

function clearFilter() {
  document.getElementById('f-month').value = '';
  document.getElementById('f-year').value  = '';
  renderExpenses();
}

function getFilteredExpenses() {
  const fm = document.getElementById('f-month').value;
  const fy = document.getElementById('f-year').value;
  return expenses.filter(e => {
    if (fm && e.month !== fm) return false;
    if (fy && String(e.year) !== String(fy)) return false;
    return true;
  });
}

function populateYearFilter() {
  const years = [...new Set(expenses.map(e => String(e.year)))].sort((a, b) => b - a);
  const sel   = document.getElementById('f-year');
  const cur   = sel.value;
  sel.innerHTML = '<option value="">All years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
  sel.value = cur;
}

function renderExpenses() {
  populateYearFilter();
  const filtered = getFilteredExpenses();
  const body     = document.getElementById('exp-body');

  if (expenses.length === 0) {
    body.innerHTML = '<tr><td colspan="5" class="empty">No expenses yet — add one above.</td></tr>';
    document.getElementById('exp-metrics-wrap').innerHTML = '';
    document.getElementById('exp-chart-section').style.display    = 'none';
    document.getElementById('monthly-chart-section').style.display = 'none';
    return;
  }

  // Sort newest first
  const sorted = [...filtered].sort((a, b) => {
    if (String(b.year) !== String(a.year)) return String(b.year) - String(a.year);
    return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
  });

  if (sorted.length === 0) {
    body.innerHTML = '<tr><td colspan="5" class="empty">No expenses for this filter.</td></tr>';
  } else {
    body.innerHTML = '';
    sorted.forEach(e => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:var(--font-mono);font-size:12px;color:var(--text2)">${e.month} ${e.year}</td>
        <td><span class="badge">${e.cat}</span></td>
        <td>${e.desc}</td>
        <td class="r" style="font-family:var(--font-mono);font-weight:500">${fmt(e.amt)}</td>
        <td class="r"><button class="icon-btn del" onclick="removeExpense(${e.id})" title="Delete">✕</button></td>`;
      body.appendChild(tr);
    });
  }

  renderExpMetrics(filtered);
  renderCatChart(filtered);
  renderMonthChart();
}

function renderExpMetrics(filtered) {
  const total     = filtered.reduce((s, e) => s + e.amt, 0);
  const thisMonth = new Date().toLocaleString('default', { month: 'short' });
  const thisYear  = String(new Date().getFullYear());
  const monthTot  = expenses.filter(e => e.month === thisMonth && String(e.year) === thisYear).reduce((s, e) => s + e.amt, 0);
  const catMap    = {};
  filtered.forEach(e => { catMap[e.cat] = (catMap[e.cat] || 0) + e.amt; });
  const top = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

  document.getElementById('exp-metrics-wrap').innerHTML = `
    <div class="metrics">
      <div class="metric"><div class="metric-label">Filtered Total</div><div class="metric-value">${fmt(total)}</div></div>
      <div class="metric"><div class="metric-label">This Month</div><div class="metric-value">${fmt(monthTot)}</div></div>
      <div class="metric"><div class="metric-label">Top Category</div><div class="metric-value" style="font-size:15px">${top ? top[0] : '—'}</div><div class="metric-sub">${top ? fmt(top[1]) : ''}</div></div>
      <div class="metric"><div class="metric-label">Entries</div><div class="metric-value">${filtered.length}</div></div>
    </div>`;
}

function renderCatChart(filtered) {
  const sec = document.getElementById('exp-chart-section');
  if (filtered.length === 0) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';

  const catMap = {};
  filtered.forEach(e => { catMap[e.cat] = (catMap[e.cat] || 0) + e.amt; });
  const labels = Object.keys(catMap);
  const data   = labels.map(l => Math.round(catMap[l]));
  const colors = labels.map((_, i) => COLORS[i % COLORS.length]);

  document.getElementById('exp-legend').innerHTML = labels.map((l, i) =>
    `<span class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${l} ${fmt(data[i])}</span>`
  ).join('');

  if (expChart) expChart.destroy();
  expChart = new Chart(document.getElementById('expChart'), {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 5, borderWidth: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.parsed.y) } } },
      scales: {
        x: { ticks: { color: '#555d6e', font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: '#555d6e', callback: v => '₹' + Math.round(v).toLocaleString('en-IN'), font: { size: 11 } }, grid: { color: '#1a1e25' } }
      }
    }
  });
}

function renderMonthChart() {
  const sec = document.getElementById('monthly-chart-section');
  if (expenses.length === 0) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';

  // Group by "Mon YYYY"
  const map = {};
  expenses.forEach(e => {
    const key = `${e.month} ${e.year}`;
    map[key] = (map[key] || 0) + e.amt;
  });
  const sortedKeys = Object.keys(map).sort((a, b) => {
    const [am, ay] = a.split(' '); const [bm, by] = b.split(' ');
    return (parseInt(ay) - parseInt(by)) || (MONTHS.indexOf(am) - MONTHS.indexOf(bm));
  });

  if (monthChart) monthChart.destroy();
  monthChart = new Chart(document.getElementById('monthChart'), {
    type: 'bar',
    data: {
      labels: sortedKeys,
      datasets: [{ data: sortedKeys.map(k => Math.round(map[k])), backgroundColor: '#4f8ef7', borderRadius: 5, borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.parsed.y) } } },
      scales: {
        x: { ticks: { color: '#555d6e', font: { size: 11 }, maxRotation: 35 }, grid: { display: false } },
        y: { ticks: { color: '#555d6e', callback: v => '₹' + Math.round(v).toLocaleString('en-IN'), font: { size: 11 } }, grid: { color: '#1a1e25' } }
      }
    }
  });
}

// ===== FILTER LISTENERS =====
document.getElementById('f-month').addEventListener('change', renderExpenses);
document.getElementById('f-year').addEventListener('change', renderExpenses);

// ===== INIT =====
loadData();
renderHoldings();
renderExpenses();
