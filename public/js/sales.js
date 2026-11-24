/* 华阳自营商城 · 业务员工作台 */
const S = { token: localStorage.getItem('hy_sales_token') || '', user: null, page: 'dashboard', tab: {}, payMethod: 'online', cache: { customers: [], products: [], adminSales: [] }, cart: [], orderCustomer: '' };
const $ = (s, r = document) => r.querySelector(s);
const money = n => '¥' + Number(n || 0).toFixed(2);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = v => v ? new Date(v).toLocaleDateString('zh-CN') : '-';
const fmtTime = v => v ? new Date(v).toLocaleString('zh-CN', { hour12: false }) : '-';
const todayText = () => new Date().toISOString().slice(0, 10);

async function api(path, opt = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (S.token) headers['Authorization'] = 'Bearer ' + S.token;
  const res = await fetch(path, { method: opt.method || 'GET', headers, body: opt.body ? JSON.stringify(opt.body) : undefined });
  const data = await res.json().catch(() => ({ ok: false, message: '服务响应异常' }));
  if (!data.ok) throw new Error(data.message || '请求失败');
  return data;
}
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2400);
}
function openModal(html) { $('#modalBox').innerHTML = '<span class="close" onclick="closeModal()">×</span>' + html; $('#modalMask').classList.add('show'); }
function closeModal() { $('#modalMask').classList.remove('show'); }
window.closeModal = closeModal;
$('#modalMask').addEventListener('click', e => { if (e.target.id === 'modalMask') closeModal(); });

const MENU = [
  ['dashboard', '📊', '工作台'],
  ['customers', '👥', '客户管理'],
  ['place', '🛒', '代客下单'],
  ['orders', '🧾', '我的订单'],
  ['performance', '📈', '业绩提成'],
  ['products', '📦', '商品库存'],
  ['visits', '📝', '拜访记录']
];
const TITLES = {
  dashboard: ['工作台', '我的客户、订单与今日待办'],
  customers: ['客户管理', '维护客户档案、资质与归属'],
  place: ['代客下单', '帮客户选货、填地址并提交订单'],
  orders: ['我的订单', '跟踪代客订单与收款状态'],
  performance: ['业绩提成', '本月开单、回款与预估提成'],
  products: ['商品库存', '查看可售商品与实时库存'],
  visits: ['拜访记录', '客户回访、问题记录与下次跟进']
};
const STATUS_TEXT = { pending: '待付款', paid: '待发货', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
const STATUS_BADGE = { pending: 'b-gold', paid: 'b-blue', shipped: 'b-green', completed: 'b-gray', cancelled: 'b-gray' };
function orderStatusText(o) {
  const base = STATUS_TEXT[o.status] || o.status;
  if (o.paymentMethod === 'monthly') {
    if (o.paymentStatus === 'settled') return base + ' · 已结';
    if (o.status === 'paid') return '月结待发货';
    if (o.status === 'shipped') return '已发货 · 未结';
    if (o.status === 'completed') return '已完成 · 未结';
  }
  return base;
}
function orderBadgeClass(o) {
  if (o.paymentMethod === 'monthly' && o.paymentStatus !== 'settled' && o.status !== 'cancelled') return 'b-gold';
  return STATUS_BADGE[o.status] || 'b-gray';
}

/* ---------------- 登录 ---------------- */
$('#loginBtn').onclick = async () => {
  try {
    const data = await api('/api/auth/login', { method: 'POST', body: { phone: $('#loginPhone').value.trim(), password: $('#loginPwd').value.trim() } });
    if (data.user.role !== 'sales') throw new Error('该账号不是业务员账号');
    S.token = data.token; S.user = data.user; localStorage.setItem('hy_sales_token', data.token);
    enterSales();
  } catch (e) { toast(e.message); }
};
window.logout = () => { S.token = ''; localStorage.removeItem('hy_sales_token'); location.reload(); };

async function boot() {
  if (!S.token) return;
  try {
    const d = await api('/api/sales/profile');
    S.user = d.profile; enterSales();
  } catch { S.token = ''; localStorage.removeItem('hy_sales_token'); }
}
function enterSales() {
  $('#loginGate').hidden = true;
  $('#salesShell').hidden = false;
  $('#salesName').textContent = S.user.name;
  buildNav(); go(S.page);
}
function buildNav() {
  $('#sideNav').innerHTML = MENU.map(([k, ico, name]) => `<a href="javascript:;" data-k="${k}" class="${S.page === k ? 'on' : ''}"><span class="ico">${ico}</span>${name}</a>`).join('');
  document.querySelectorAll('#sideNav a').forEach(a => a.onclick = () => go(a.dataset.k));
}
function go(page) {
  S.page = page;
  document.querySelectorAll('#sideNav a').forEach(a => a.classList.toggle('on', a.dataset.k === page));
  $('#pageTitle').textContent = TITLES[page][0];
  $('#pageSub').textContent = TITLES[page][1];
  renderPage();
}
window.go = go;
window.switchTab = (page, k) => { S.tab[page] = k; renderPage(); };

function setTabs(page, tabs, active) {
  return `<div class="tabs">${tabs.map(([k, t]) => `<div class="tab${active === k ? ' on' : ''}" onclick="switchTab('${page}','${k}')">${t}</div>`).join('')}</div>`;
}

async function renderPage() {
  const page = $('#page');
  page.innerHTML = '<div class="empty">加载中…</div>';
  try {
    if (S.page === 'dashboard') await renderDashboard(page);
    else if (S.page === 'customers') await renderCustomers(page);
    else if (S.page === 'place') await renderPlace(page);
    else if (S.page === 'orders') await renderOrders(page);
    else if (S.page === 'performance') await renderPerformance(page);
    else if (S.page === 'products') await renderProducts(page);
    else if (S.page === 'visits') await renderVisits(page);
  } catch (e) {
    page.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    if (String(e.message).includes('权限') || String(e.message).includes('登录')) {
      S.token = ''; localStorage.removeItem('hy_sales_token'); setTimeout(() => location.reload(), 800);
    }
  }
}

/* ---------------- 工作台 ---------------- */
async function renderDashboard(page) {
  const d = await api('/api/sales/overview');
  const c = d.cards;
  const max = Math.max(1, ...d.recent.map(o => o.pay));
  page.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label"><i>👥</i>我的客户</div><b>${c.customers}</b><small>已归属我的客户账号</small></div>
      <div class="kpi"><div class="label"><i>💰</i>本月开单</div><b>${money(c.monthAmount)}</b><small>${c.monthOrders} 笔订单</small></div>
      <div class="kpi"><div class="label"><i>💵</i>待收款</div><b>${money(d.stats.pendingAmount)}</b><small>已回款 ${money(d.stats.paidAmount)}</small></div>
      <div class="kpi"><div class="label"><i>🎯</i>预估提成</div><b>${money(c.commission)}</b><small>按已回款 ${d.stats.rate}% 计算</small></div>
    </div>
    <div class="quick-grid">
      <div class="quick-card" onclick="go('place')"><span class="qico">🛒</span><div><b>代客下单</b><small>帮客户快速补货</small></div></div>
      <div class="quick-card" onclick="go('customers')"><span class="qico">👤</span><div><b>新增客户</b><small>建档并分配归属</small></div></div>
      <div class="quick-card" onclick="go('visits')"><span class="qico">📝</span><div><b>登记拜访</b><small>记录问题与下次跟进</small></div></div>
      <div class="quick-card" onclick="go('orders')"><span class="qico">🚚</span><div><b>订单跟踪</b><small>${c.pendingShip} 笔待发货</small></div></div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>最近代客订单</h3><span class="sub">最新 5 笔</span></div>
        <table><thead><tr><th>订单</th><th>客户</th><th>金额</th><th>状态</th><th>时间</th></tr></thead>
        <tbody>${d.recent.map(o => `<tr>
          <td><b>${o.orderNo}</b><br><small class="muted">${o.items.reduce((s, i) => s + i.qty, 0)} 件</small></td>
          <td>${esc(o.customerName || (o.address || {}).name || '-')}</td>
          <td class="price">${money(o.pay)}</td>
          <td><span class="badge ${orderBadgeClass(o)}">${orderStatusText(o)}</span></td>
          <td class="muted">${fmtDate(o.createdAt)}</td>
        </tr>`).join('') || '<tr><td colspan="5"><div class="empty-compact">还没有代客订单，去“代客下单”开第一单</div></td></tr>'}</tbody></table>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>7 天内待跟进</h3><span class="sub">共 ${c.pendingVisits} 个</span></div>
        ${d.visits.map(v => `<div class="visit-item">
          <div class="visit-date">${esc(v.nextAt || '待定')}</div>
          <div class="visit-body"><b>${esc(v.customerName)}</b>${v.company ? ` <small class="muted">${esc(v.company)}</small>` : ''}<p>${esc(v.content)}</p></div>
        </div>`).join('') || '<div class="empty-compact">近 7 天没有待跟进客户</div>'}
        <button class="btn btn-sm btn-ghost mt16" style="width:100%" onclick="go('visits')">查看全部拜访记录</button>
      </div>
    </div>`;
}

/* ---------------- 客户管理 ---------------- */
function licenseTag(c) {
  if (!c.licenseExpiry) return '<small class="license-warn">未登记许可证</small>';
  const days = Math.ceil((new Date(c.licenseExpiry + 'T23:59:59').getTime() - Date.now()) / 864e5);
  if (days < 0) return `<small class="license-warn">许可证已过期</small>`;
  if (days <= 30) return `<small class="license-warn">${days} 天后到期</small>`;
  return `<small class="license-ok">有效期至 ${esc(c.licenseExpiry)}</small>`;
}
async function renderCustomers(page) {
  const d = await api('/api/sales/customers');
  S.cache.customers = d.list;
  page.innerHTML = `
    <div class="toolbar">
      <input id="custKeyword" placeholder="搜索客户名称 / 手机号 / 单位" oninput="filterCustomers(this.value)">
      <span class="grow"></span>
      <span class="muted" style="font-size:12.5px">共 ${d.list.length} 个客户</span>
      <button class="btn btn-sm btn-primary" onclick="openCustomer()">＋ 新增客户</button>
    </div>
    <div class="panel" style="padding:0;overflow:hidden">
      <table><thead><tr><th>客户</th><th>手机号</th><th>单位 / 资质</th><th>订单 / 累计</th><th>最近下单</th><th style="text-align:right">操作</th></tr></thead>
      <tbody>${d.list.map(c => `<tr data-name="${esc((c.name + ' ' + c.phone + ' ' + c.company).toLowerCase())}">
        <td><b>${esc(c.name)}</b><br><small class="muted">${esc(c.region || '未填写区域')}</small></td>
        <td>${esc(c.phone)}</td>
        <td>${esc(c.company || '-')}<br>${licenseTag(c)}${c.monthlyEnabled ? `<br><small class="credit-ok">月结 ${money(c.creditAvailable)} / ${money(c.creditLimit)} · ${c.creditDays}天</small>` : '<br><small class="muted">现款结算</small>'}</td>
        <td>${c.orderCount} 单<br><span class="price">${money(c.amount)}</span></td>
        <td class="muted">${c.lastOrderAt ? fmtDate(c.lastOrderAt) : '暂无'}</td>
        <td style="text-align:right">
          <button class="btn btn-sm btn-primary" onclick="startOrder('${c.id}')">代下单</button>
          <button class="btn btn-sm btn-ghost" onclick="openVisit('${c.id}')">拜访</button>
          <button class="btn btn-sm btn-ghost" onclick="editCustomer('${c.id}')">编辑</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="6"><div class="empty">还没有客户，点击“新增客户”开始建档</div></td></tr>'}</tbody></table>
    </div>`;
}
window.filterCustomers = keyword => {
  const k = String(keyword || '').trim().toLowerCase();
  document.querySelectorAll('tbody tr[data-name]').forEach(tr => { tr.style.display = tr.dataset.name.includes(k) ? '' : 'none'; });
};
function customerForm(c) {
  const v = c || {};
  openModal(`<h3>${c ? '编辑客户' : '新增客户'}</h3>
    ${c ? `<div class="mini-note">支付方式：${c.monthlyEnabled ? `月结 · 额度 ${money(c.creditLimit)} · 已用 ${money(c.creditUsed)} · 账期 ${c.creditDays} 天` : '现款结算'}（月结由后台授信，业务员不可修改）</div>` : '<div class="mini-note">新客户默认现款结算，如需月结请由管理员在后台授信。</div>'}
    <div class="row2">
      <div class="field"><label>客户名称</label><input id="cuName" value="${esc(v.name || '')}" placeholder="联系人姓名"></div>
      <div class="field"><label>手机号（登录账号）</label><input id="cuPhone" value="${esc(v.phone || '')}" placeholder="11 位手机号"></div>
    </div>
    ${c ? '' : '<div class="field"><label>初始密码（留空默认 123456）</label><input id="cuPwd" placeholder="至少 6 位"></div>'}
    <div class="row2">
      <div class="field"><label>单位名称</label><input id="cuCompany" value="${esc(v.company || '')}" placeholder="诊所 / 药房名称"></div>
      <div class="field"><label>许可证号</label><input id="cuLicense" value="${esc(v.licenseNo || '')}" placeholder="药品经营许可证号"></div>
    </div>
    <div class="row2">
      <div class="field"><label>许可证到期日</label><input id="cuExpiry" type="date" value="${esc(v.licenseExpiry || '')}"></div>
      <div class="field"><label>区域</label><input id="cuRegion" value="${esc(v.region || '')}" placeholder="如 广东省 湛江市 赤坎区"></div>
    </div>
    <div class="field"><label>详细地址</label><input id="cuDetail" value="${esc(v.detail || '')}" placeholder="街道、门牌、楼层"></div>
    <div class="field"><label>备注</label><textarea id="cuNote" placeholder="经营品类、账期、注意事项等">${esc(v.note || '')}</textarea></div>
    <button class="btn btn-primary" onclick="saveCustomer(${c ? `'${c.id}'` : 'null'})">${c ? '保存修改' : '创建客户'}</button>`);
}
window.openCustomer = () => customerForm(null);
window.editCustomer = id => customerForm((S.cache.customers || []).find(c => c.id === id));
window.saveCustomer = async id => {
  const body = {
    name: $('#cuName').value.trim(), phone: $('#cuPhone').value.trim(), company: $('#cuCompany').value.trim(),
    licenseNo: $('#cuLicense').value.trim(), licenseExpiry: $('#cuExpiry').value,
    region: $('#cuRegion').value.trim(), detail: $('#cuDetail').value.trim(), note: $('#cuNote').value.trim()
  };
  if (!id && $('#cuPwd').value.trim()) body.password = $('#cuPwd').value.trim();
  try {
    const d = id ? await api('/api/sales/customers/' + id, { method: 'PUT', body }) : await api('/api/sales/customers', { method: 'POST', body });
    closeModal();
    toast(id ? '客户资料已更新' : `客户已创建${d.initialPassword ? '，初始密码 ' + d.initialPassword : ''}`);
    renderPage();
  } catch (e) { toast(e.message); }
};

/* ---------------- 代客下单 ---------------- */
function captureAddress() {
  if (!$('#poName')) return;
  S.cache.addr = { name: $('#poName').value, phone: $('#poPhone').value, region: $('#poRegion').value, detail: $('#poDetail').value };
}
window.changeOrderCustomer = id => {
  S.orderCustomer = id; S.cache.addr = null; S.payMethod = 'online';
  renderPage();
};
window.startOrder = id => { S.orderCustomer = id; S.cache.addr = null; S.payMethod = 'online'; S.cart = []; go('place'); };
window.startOrderProduct = pid => {
  const p = (S.cache.products || []).find(x => x.id === pid);
  if (!p) return;
  S.cache.addr = null; S.payMethod = 'online';
  S.cart = [{ productId: p.id, name: p.name, spec: p.specs[0].name, price: p.specs[0].price, qty: 1, img: p.img, stock: p.specs[0].stock }];
  go('place');
};
async function renderPlace(page) {
  const [custRes, prodRes, home] = await Promise.all([api('/api/sales/customers'), api('/api/sales/products'), api('/api/home')]);
  S.cache.customers = custRes.list; S.cache.products = prodRes.list;
  S.cache.freeFreight = Number(home.settings.freeFreight || 99); S.cache.freightFee = Number(home.settings.freight || 8);
  const customers = custRes.list;
  if (!customers.length) {
    page.innerHTML = `<div class="empty card"><span class="ico">👥</span>还没有客户，先新增客户再代客下单<div style="margin-top:16px"><button class="btn btn-primary" onclick="openCustomer()">新增客户</button></div></div>`;
    return;
  }
  if (!S.orderCustomer || !customers.some(c => c.id === S.orderCustomer)) S.orderCustomer = customers[0].id;
  const customer = customers.find(c => c.id === S.orderCustomer);
  if (S.payMethod === 'monthly' && customer.monthlyEnabled !== true) S.payMethod = 'online';
  if (!S.cache.addr) S.cache.addr = { name: customer.name, phone: customer.phone, region: customer.region || '', detail: customer.detail || '' };
  const addr = S.cache.addr;
  const subtotal = S.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const freeFreight = Number(home.settings.freeFreight || 99), freightFee = Number(home.settings.freight || 8);
  const freight = subtotal >= freeFreight ? 0 : freightFee;
  const total = subtotal + freight;
  page.innerHTML = `
    <div class="panel customer-picker">
      <div class="field" style="margin-bottom:10px"><label>选择客户</label>
        <select id="poCustomer" onchange="changeOrderCustomer(this.value)">${customers.map(c => `<option value="${c.id}" ${c.id === customer.id ? 'selected' : ''}>${esc(c.name)}${c.company ? ' · ' + esc(c.company) : ''} · ${esc(c.phone)}</option>`).join('')}</select>
      </div>
      <div class="mini-note">客户归属：${esc(customer.name)} · 累计 ${customer.orderCount} 单 ${money(customer.amount)} · ${customer.licenseExpiry ? '许可证到期 ' + customer.licenseExpiry : '未登记许可证'}<br>支付方式：${customer.monthlyEnabled ? `月结 · 可用 ${money(customer.creditAvailable)} / 额度 ${money(customer.creditLimit)} · 账期 ${customer.creditDays} 天` : '现款结算'}</div>
      <div class="address-grid" style="margin-top:14px">
        <div class="field"><label>收货人</label><input id="poName" value="${esc(addr.name || '')}"></div>
        <div class="field"><label>收货手机号</label><input id="poPhone" value="${esc(addr.phone || '')}"></div>
      </div>
      <div class="field"><label>区域</label><input id="poRegion" value="${esc(addr.region || '')}" placeholder="如 广东省 湛江市 赤坎区"></div>
      <div class="field"><label>详细地址</label><input id="poDetail" value="${esc(addr.detail || '')}" placeholder="街道、门牌、楼层"></div>
      <div class="field"><label>支付方式</label>
        <div class="pay-tabs" id="soPay">
          <button type="button" class="pay-tab ${S.payMethod === 'online' ? 'on' : ''}" data-pay="online" onclick="setSalesPay('online')"><b>现款结算</b><small>下单后由业务员登记收款</small></button>
          ${customer.monthlyEnabled ? `<button type="button" class="pay-tab ${S.payMethod === 'monthly' ? 'on' : ''}" data-pay="monthly" onclick="setSalesPay('monthly')"><b>月结</b><small>可用 ${money(customer.creditAvailable)} · 账期 ${customer.creditDays} 天</small></button>` : ''}
        </div>
      </div>
      <p class="pay-hint" id="soPayHint">${S.payMethod === 'monthly' ? '提交后先发货，客户在账期内回款，回款后释放额度' : '客户付款后，在订单页登记收款'}</p>
      <div class="field"><label>订单备注</label><textarea id="poRemark" placeholder="送货时间、拆零要求等（选填）"></textarea></div>
    </div>
    <div class="panel mt16" style="padding:0;overflow:hidden">
      <div class="panel-head" style="padding:18px 22px"><h3>选择商品</h3><span class="sub">库存实时同步</span></div>
      <div class="toolbar" style="padding:0 22px"><input id="pickKeyword" placeholder="搜索商品名称" oninput="filterProductPick(this.value)"><span class="grow"></span><span class="muted" style="font-size:12px">选择规格和数量后加入清单</span></div>
      <table><thead><tr><th>商品</th><th>价格</th><th>库存</th><th>规格</th><th>数量</th><th style="text-align:right">操作</th></tr></thead>
      <tbody>${prodRes.list.filter(p => p.status === 'on').map(p => `<tr data-pname="${esc((p.name + ' ' + (p.sub || '')).toLowerCase())}">
        <td><div class="product-pick"><img src="${p.img}"><div class="nm"><b>${esc(p.name)}</b><small>${esc(p.sub || '')}</small></div></div></td>
        <td class="price">${money(p.price)}</td>
        <td>${p.stock < 100 ? `<span class="stock-low">${p.stock}</span>` : p.stock}</td>
        <td><select class="pick-select" id="pickSpec-${p.id}">${p.specs.map(s => `<option value="${esc(s.name)}" data-price="${s.price}" data-stock="${s.stock}">${esc(s.name)} · ¥${s.price}</option>`).join('')}</select></td>
        <td><input id="pickQty-${p.id}" type="number" min="1" value="1" style="width:58px;height:30px;border:1px solid #e6eae7;border-radius:7px;text-align:center"></td>
        <td style="text-align:right"><button class="btn btn-sm btn-primary" onclick="addToCart('${p.id}')">加入</button></td>
      </tr>`).join('')}</tbody></table>
    </div>
    <div class="grid-2" style="grid-template-columns:1.6fr 1fr">
      <div class="panel">
        <div class="panel-head"><h3>本次代客清单</h3><span class="sub">${S.cart.length} 种商品</span></div>
        <table><thead><tr><th>商品</th><th>单价</th><th style="text-align:right">数量 / 小计</th><th></th></tr></thead>
        <tbody>${S.cart.map((i, idx) => `<tr class="cart-line">
          <td><div class="product-pick"><img src="${i.img}"><div class="nm"><b>${esc(i.name)}</b><small>${esc(i.spec)}</small></div></div></td>
          <td>${money(i.price)}</td>
          <td style="text-align:right"><div class="qty"><button class="qty-btn" onclick="changeLine(${idx},-1)">−</button><input value="${i.qty}" onchange="setLineQty(${idx},this.value)"><button class="qty-btn" onclick="changeLine(${idx},1)">＋</button></div><span class="price">${money(i.price * i.qty)}</span></td>
          <td><button class="btn btn-sm btn-ghost" onclick="removeLine(${idx})">删除</button></td>
        </tr>`).join('') || '<tr><td colspan="4"><div class="empty-compact">尚未选择商品</div></td></tr>'}</tbody></table>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>订单汇总</h3></div>
        <div class="order-line"><span>商品合计</span><span>${money(subtotal)}</span></div>
        <div class="order-line"><span>运费</span><span>${freight ? money(freight) : '包邮'}</span></div>
        <div class="order-line"><span>支付方式</span><b id="soPayText">${S.payMethod === 'monthly' ? `月结（${customer.creditDays} 天）` : '现款结算'}</b></div>
        <div class="order-line total"><span id="soTotalLabel">${S.payMethod === 'monthly' ? '本单月结金额' : '应付金额'}</span><b>${money(total)}</b></div>
        <button class="btn btn-primary" style="width:100%;margin-top:16px" onclick="submitSalesOrder()">提交代客订单</button>
        <p class="muted" id="soSubmitHint" style="font-size:11.5px;margin-top:10px;text-align:center">${S.payMethod === 'monthly' ? '提交后进入月结待发货，回款后在订单页登记' : '提交后进入待付款，收款后在订单页登记'}</p>
      </div>
    </div>`;
}
window.filterProductPick = keyword => {
  const k = String(keyword || '').trim().toLowerCase();
  document.querySelectorAll('tbody tr[data-pname]').forEach(tr => { tr.style.display = tr.dataset.pname.includes(k) ? '' : 'none'; });
};
window.setSalesPay = method => {
  const customer = (S.cache.customers || []).find(c => c.id === S.orderCustomer);
  if (!customer) return;
  captureAddress();
  const subtotal = S.cart.reduce((s, i) => s + i.price * i.qty, 0);
  const freight = subtotal >= (S.cache.freeFreight || 99) ? 0 : (S.cache.freightFee || 8);
  if (method === 'monthly') {
    if (customer.monthlyEnabled !== true) return toast('该客户未开通月结');
    if (subtotal + freight > customer.creditAvailable) return toast(`月结可用额度不足，还差 ${money(subtotal + freight - customer.creditAvailable)}`);
  }
  S.payMethod = method;
  document.querySelectorAll('#soPay .pay-tab').forEach(el => el.classList.toggle('on', el.dataset.pay === method));
  $('#soPayText').textContent = method === 'monthly' ? `月结（${customer.creditDays} 天）` : '现款结算';
  $('#soTotalLabel').textContent = method === 'monthly' ? '本单月结金额' : '应付金额';
  $('#soPayHint').textContent = method === 'monthly' ? '提交后先发货，客户在账期内回款，回款后释放额度' : '客户付款后，在订单页登记收款';
  $('#soSubmitHint').textContent = method === 'monthly' ? '提交后进入月结待发货，回款后在订单页登记' : '提交后进入待付款，收款后在订单页登记';
};
window.addToCart = pid => {
  captureAddress();
  const p = (S.cache.products || []).find(x => x.id === pid);
  if (!p) return;
  const sel = $('#pickSpec-' + pid);
  const opt = sel.options[sel.selectedIndex];
  const spec = sel.value, price = Number(opt.dataset.price), stock = Number(opt.dataset.stock);
  const qty = Math.max(1, Math.min(stock, Math.round(Number($('#pickQty-' + pid).value || 1))));
  const exists = S.cart.find(i => i.productId === pid && i.spec === spec);
  if (exists) {
    if (exists.qty + qty > stock) return toast('超过该规格库存');
    exists.qty += qty;
  } else {
    if (qty > stock) return toast('超过该规格库存');
    S.cart.push({ productId: pid, name: p.name, spec, price, qty, img: p.img, stock });
  }
  toast('已加入代客清单'); renderPage();
};
window.changeLine = (idx, delta) => {
  captureAddress();
  const it = S.cart[idx]; if (!it) return;
  const next = it.qty + delta;
  if (next < 1) return;
  if (next > it.stock) return toast('超过库存');
  it.qty = next; renderPage();
};
window.setLineQty = (idx, val) => {
  captureAddress();
  const it = S.cart[idx]; if (!it) return;
  const q = Math.round(Number(val || 1));
  if (!Number.isInteger(q) || q < 1) return toast('数量必须为大于 0 的整数');
  if (q > it.stock) { toast('超过库存'); it.qty = it.stock; }
  else it.qty = q;
  renderPage();
};
window.removeLine = idx => { captureAddress(); S.cart.splice(idx, 1); renderPage(); };
window.submitSalesOrder = async () => {
  if (!S.cart.length) return toast('请先选择商品');
  const address = { name: $('#poName').value.trim(), phone: $('#poPhone').value.trim(), region: $('#poRegion').value.trim(), detail: $('#poDetail').value.trim() };
  if (!address.name || !address.phone || !address.region || !address.detail) return toast('请填写完整的收货地址');
  try {
    const d = await api('/api/sales/orders', { method: 'POST', body: { customerId: S.orderCustomer, items: S.cart.map(i => ({ productId: i.productId, spec: i.spec, qty: i.qty })), address, remark: $('#poRemark').value.trim(), paymentMethod: S.payMethod } });
    const monthly = d.order.paymentMethod === 'monthly';
    S.cart = []; S.cache.addr = null; S.payMethod = 'online';
    toast(monthly ? `月结订单已提交：${d.order.orderNo}` : `订单已提交：${d.order.orderNo}`);
    S.tab.orders = 'all'; go('orders');
  } catch (e) { toast(e.message); }
};

/* ---------------- 我的订单 ---------------- */
async function renderOrders(page) {
  const tab = S.tab.orders || 'all';
  const qs = new URLSearchParams();
  if (tab === 'monthly') qs.set('settle', 'unpaid'); else qs.set('status', tab);
  const d = await api('/api/sales/orders?' + qs.toString());
  page.innerHTML = setTabs('orders', [['all', '全部'], ['pending', '待付款'], ['paid', '待发货'], ['monthly', '月结未结'], ['shipped', '已发货'], ['completed', '已完成']], tab) + `
    <div class="toolbar"><span class="muted" style="font-size:12.5px">共 ${d.list.length} 笔订单</span><span class="grow"></span><button class="btn btn-sm btn-primary" onclick="go('place')">＋ 代客下单</button></div>
    <div class="panel" style="padding:0;overflow:hidden">
      <table><thead><tr><th>订单号</th><th>客户</th><th>商品</th><th>金额</th><th>状态</th><th>时间</th><th style="text-align:right">操作</th></tr></thead>
      <tbody>${d.list.map(o => `<tr>
        <td><b>${o.orderNo}</b><br><small class="muted">${o.items.reduce((s, i) => s + i.qty, 0)} 件</small></td>
        <td>${esc(o.customerName || (o.address || {}).name || '-')}<br><small class="muted">${esc((o.address || {}).phone || '')}</small></td>
        <td><div class="goods-cell"><img src="${o.items[0].img}"><div>${esc(o.items[0].name)}${o.items.length > 1 ? `<br><small class="muted">等 ${o.items.length} 种</small>` : ''}</div></div></td>
        <td class="price">${money(o.pay)}${o.paymentMethod === 'monthly' ? '<br><small class="credit-ok">月结</small>' : ''}</td>
        <td><span class="badge ${orderBadgeClass(o)}">${orderStatusText(o)}</span></td>
        <td class="muted">${fmtDate(o.createdAt)}</td>
        <td style="text-align:right"><button class="btn btn-sm btn-ghost" onclick="viewSalesOrder(${o.id})">详情</button>${o.status === 'pending' ? `<button class="btn btn-sm btn-primary" onclick="markPaid(${o.id})">登记收款</button>` : ''}${o.paymentMethod === 'monthly' && o.paymentStatus !== 'settled' && o.status !== 'cancelled' ? `<button class="btn btn-sm btn-primary" onclick="markSettled(${o.id})">登记回款</button>` : ''}</td>
      </tr>`).join('') || '<tr><td colspan="7"><div class="empty">暂无相关订单</div></td></tr>'}</tbody></table>
    </div>`;
}
window.viewSalesOrder = async id => {
  try {
    const { order: o } = await api('/api/sales/orders/' + id);
    openModal(`<h3>订单 ${o.orderNo}</h3>
      <p class="muted">${orderStatusText(o)} · ${fmtTime(o.createdAt)} · 业务员 ${esc(o.salesName || '')}</p>
      <div style="margin:16px 0">${o.items.map(i => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f4f2"><span>${esc(i.name)} <small class="muted">${esc(i.spec)} × ${i.qty}</small></span><span class="price">${money(i.price * i.qty)}</span></div>`).join('')}</div>
      <table style="font-size:12.5px"><tr><td>商品合计</td><td style="text-align:right">${money(o.total)}</td></tr><tr><td>运费</td><td style="text-align:right">${money(o.freight)}</td></tr><tr><td>支付方式</td><td style="text-align:right">${o.paymentMethod === 'monthly' ? '月结' : '现款'}</td></tr><tr><td><b>${o.paymentMethod === 'monthly' ? '月结金额' : '应付'}</b></td><td style="text-align:right" class="price"><b>${money(o.pay)}</b></td></tr></table>
      ${o.paymentMethod === 'monthly' ? `<p class="credit-note">${o.paymentStatus === 'settled' ? `月结已回款（${fmtDate(o.settledAt)}）` : `月结未结 · 应结日期 ${fmtDate(o.settlementDueAt)}`}</p>` : ''}
      <p style="margin-top:14px;font-size:12.5px"><b>收货：</b>${esc((o.address || {}).name || '')} ${esc((o.address || {}).phone || '')}<br><span class="muted">${esc((o.address || {}).region || '')} ${esc((o.address || {}).detail || '')}</span></p>
      ${o.remark ? `<p style="font-size:12.5px;margin-top:8px"><b>备注：</b>${esc(o.remark)}</p>` : ''}
      ${o.express ? `<p style="font-size:12.5px;margin-top:8px"><b>物流：</b>${esc(o.express.company)} ${esc(o.express.no)}</p>` : ''}
      ${o.status === 'pending' ? `<button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="markPaid(${o.id})">登记收款</button><button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="cancelSalesOrder(${o.id})">取消订单</button>` : ''}
      ${o.paymentMethod === 'monthly' && o.paymentStatus !== 'settled' && o.status !== 'cancelled' ? `<button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="markSettled(${o.id})">登记月结回款</button>` : ''}
      ${o.paymentMethod === 'monthly' && o.paymentStatus !== 'settled' && o.status === 'paid' ? `<button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="cancelSalesOrder(${o.id})">取消订单</button>` : ''}`);
  } catch (e) { toast(e.message); }
};
window.markPaid = async id => {
  if (!confirm('确认已收到该笔货款？')) return;
  try { await api('/api/sales/orders/' + id + '/paid', { method: 'POST' }); closeModal(); toast('已登记收款'); renderPage(); }
  catch (e) { toast(e.message); }
};
window.markSettled = async id => {
  if (!confirm('确认该笔月结账款已回款？')) return;
  try { await api('/api/sales/orders/' + id + '/settle', { method: 'POST' }); closeModal(); toast('月结回款已登记'); renderPage(); }
  catch (e) { toast(e.message); }
};
window.cancelSalesOrder = async id => {
  if (!confirm('确定取消该订单并回补库存？')) return;
  try { await api('/api/sales/orders/' + id + '/cancel', { method: 'POST' }); closeModal(); toast('订单已取消'); renderPage(); }
  catch (e) { toast(e.message); }
};

/* ---------------- 业绩提成 ---------------- */
async function renderPerformance(page) {
  const now = new Date();
  const month = S.cache.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const d = await api('/api/sales/performance?month=' + month);
  const p = d.performance;
  const maxDay = Math.max(1, ...p.daily.map(x => x.amount));
  page.innerHTML = `
    <div class="toolbar"><input class="month-picker" type="month" id="perMonth" value="${month}" onchange="changeMonth(this.value)"><span class="grow"></span><span class="muted" style="font-size:12.5px">提成比例 ${d.profile.commissionRate}% · 按已回款计算</span></div>
    <div class="kpi-grid">
      <div class="kpi"><div class="label"><i>💰</i>本月开单</div><b>${money(p.amount)}</b><small>${p.orderCount} 笔订单</small></div>
      <div class="kpi"><div class="label"><i>💵</i>已回款</div><b>${money(p.paidAmount)}</b><small>${p.paidCount} 笔已付款</small></div>
      <div class="kpi"><div class="label"><i>⏳</i>待收款</div><b>${money(p.pendingAmount)}</b><small>待付款订单金额</small></div>
      <div class="kpi"><div class="label"><i>🎯</i>预估提成</div><b>${money(p.commission)}</b><small>已回款 × ${p.rate}%</small></div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>每日开单趋势</h3><span class="sub">${p.month}</span></div>
        <div class="day-bars">${p.daily.map(x => `<i title="${x.day}日 ${money(x.amount)} / ${x.orders}单" style="height:${Math.max(3, Math.round(x.amount / maxDay * 100))}%"></i>`).join('')}</div>
        <p class="muted" style="font-size:11.5px;margin-top:8px">按自然月统计，含待付款订单金额</p>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>客户开单排行</h3><span class="sub">TOP ${p.topCustomers.length}</span></div>
        <table><thead><tr><th>客户</th><th>订单</th><th style="text-align:right">开单额</th></tr></thead>
        <tbody>${p.topCustomers.map(c => `<tr><td>${esc(c.name)}<br><small class="muted">${esc(c.company || '')}</small></td><td>${c.orders}</td><td style="text-align:right" class="price">${money(c.amount)}</td></tr>`).join('') || '<tr><td colspan="3"><div class="empty-compact">本月还没有开单</div></td></tr>'}</tbody></table>
      </div>
    </div>`;
}
window.changeMonth = v => { S.cache.month = v; renderPage(); };

/* ---------------- 商品库存 ---------------- */
async function renderProducts(page) {
  const d = await api('/api/sales/products');
  S.cache.products = d.list;
  const onSale = d.list.filter(p => p.status === 'on');
  page.innerHTML = `
    <div class="toolbar"><input id="prodKeyword" placeholder="搜索商品名称" oninput="filterSalesProducts(this.value)"><span class="grow"></span><span class="muted" style="font-size:12.5px">${onSale.length} 个在售商品</span></div>
    <div class="panel" style="padding:0;overflow:hidden">
      <table><thead><tr><th>商品</th><th>价格</th><th>总库存</th><th>累计销量</th><th>规格库存</th><th style="text-align:right">操作</th></tr></thead>
      <tbody>${d.list.map(p => `<tr data-name="${esc((p.name + ' ' + (p.sub || '')).toLowerCase())}">
        <td><div class="goods-cell"><img src="${p.img}"><div><b>${esc(p.name)}</b><br><small class="muted">${esc(p.sub || '')}${p.status !== 'on' ? ' · 已下架' : ''}</small></div></div></td>
        <td class="price">${money(p.price)}</td>
        <td>${p.stock < 100 ? `<span class="stock-low">${p.stock}</span>` : p.stock}</td>
        <td>${p.sales}</td>
        <td>${p.specs.map(s => `<small class="muted">${esc(s.name)}：${s.stock} · ¥${s.price}</small>`).join('<br>')}</td>
        <td style="text-align:right">${p.status === 'on' ? `<button class="btn btn-sm btn-primary" onclick="startOrderProduct('${p.id}')">代下单</button>` : '<span class="muted">已下架</span>'}</td>
      </tr>`).join('')}</tbody></table>
    </div>`;
}
window.filterSalesProducts = keyword => {
  const k = String(keyword || '').trim().toLowerCase();
  document.querySelectorAll('tbody tr[data-name]').forEach(tr => { tr.style.display = tr.dataset.name.includes(k) ? '' : 'none'; });
};

/* ---------------- 拜访记录 ---------------- */
async function renderVisits(page) {
  const [vres, cres] = await Promise.all([api('/api/sales/visits'), api('/api/sales/customers')]);
  S.cache.customers = cres.list;
  page.innerHTML = `
    <div class="toolbar"><button class="btn btn-sm btn-primary" onclick="openVisit('')">＋ 新增拜访</button><span class="grow"></span><span class="muted" style="font-size:12.5px">共 ${vres.list.length} 条记录</span></div>
    <div class="panel">
      <div class="panel-head"><h3>拜访时间线</h3><span class="sub">按登记时间倒序</span></div>
      ${vres.list.map(v => `<div class="visit-item">
        <div class="visit-date">${fmtDate(v.createdAt)}</div>
        <div class="visit-body"><b>${esc(v.customerName)}</b>${v.company ? ` <small class="muted">${esc(v.company)}</small>` : ''}<p>${esc(v.content)}</p>${v.nextAt ? `<small class="${v.nextAt <= todayText() ? 'license-warn' : 'license-ok'}">下次跟进 ${esc(v.nextAt)}</small>` : ''}</div>
      </div>`).join('') || '<div class="empty">还没有拜访记录</div>'}
    </div>`;
}
window.openVisit = async customerId => {
  if (!S.cache.customers.length) { try { S.cache.customers = (await api('/api/sales/customers')).list; } catch (e) { return toast(e.message); } }
  const options = S.cache.customers.map(c => `<option value="${c.id}" ${c.id === customerId ? 'selected' : ''}>${esc(c.name)}${c.company ? ' · ' + esc(c.company) : ''}</option>`).join('');
  openModal(`<h3>新增拜访记录</h3>
    <div class="field"><label>拜访客户</label><select id="vCustomer"><option value="">不关联客户</option>${options}</select></div>
    <div class="field"><label>拜访内容</label><textarea id="vContent" placeholder="客户反馈、库存情况、政策沟通、需要协调的问题"></textarea></div>
    <div class="field"><label>下次跟进日期</label><input id="vNext" type="date" value="${todayText()}"></div>
    <button class="btn btn-primary" onclick="saveVisit()">保存记录</button>`);
};
window.saveVisit = async () => {
  const body = { customerId: $('#vCustomer').value, content: $('#vContent').value.trim(), nextAt: $('#vNext').value };
  if (!body.content) return toast('请填写拜访内容');
  try { await api('/api/sales/visits', { method: 'POST', body }); closeModal(); toast('拜访记录已保存'); renderPage(); }
  catch (e) { toast(e.message); }
};

boot();
