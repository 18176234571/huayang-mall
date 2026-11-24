/* 华阳自营商城 · 管理后台 */
const S = { token: localStorage.getItem('hy_admin_token') || '', user: null, page: 'dashboard', tab: {}, cache: {} };
const $ = (s, r = document) => r.querySelector(s);
const money = n => '¥' + Number(n || 0).toFixed(2);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2200);
}
function openModal(html) { $('#modalBox').innerHTML = '<span class="close" onclick="closeModal()">×</span>' + html; $('#modalMask').classList.add('show'); }
function closeModal() { $('#modalMask').classList.remove('show'); }
window.closeModal = closeModal;
$('#modalMask').addEventListener('click', e => { if (e.target.id === 'modalMask') closeModal(); });

const MENU = [
  ['dashboard', '📊', '数据看板'],
  ['products', '📦', '商品管理'],
  ['orders', '🧾', '订单管理'],
  ['inventory', '📥', '库存管理'],
  ['marketing', '🎟️', '营销中心'],
  ['members', '👥', '会员管理'],
  ['settings', '⚙️', '店铺设置']
];
const TITLES = {
  dashboard: ['数据看板', '今日经营概览与近 7 日销售趋势'],
  products: ['商品管理', '维护自营商品、规格与上下架状态'],
  orders: ['订单管理', '处理待发货订单、查看交易明细'],
  inventory: ['库存管理', '监控可售库存，及时补货'],
  marketing: ['营销中心', '优惠券与包邮规则配置'],
  members: ['会员管理', '查看会员消费与订单情况'],
  settings: ['店铺设置', '店铺基础信息与首页轮播']
};
const STATUS_TEXT = { pending: '待付款', paid: '待发货', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
const STATUS_BADGE = { pending: 'b-gold', paid: 'b-blue', shipped: 'b-green', completed: 'b-gray', cancelled: 'b-gray' };

/* ---------------- 登录 ---------------- */
$('#loginBtn').onclick = async () => {
  try {
    const data = await api('/api/auth/login', { method: 'POST', body: { phone: $('#loginPhone').value.trim(), password: $('#loginPwd').value.trim() } });
    if (data.user.role !== 'admin') throw new Error('该账号不是管理员');
    S.token = data.token; S.user = data.user; localStorage.setItem('hy_admin_token', data.token);
    enterAdmin();
  } catch (e) { toast(e.message); }
};
window.logout = () => { S.token = ''; localStorage.removeItem('hy_admin_token'); location.reload(); };

function enterAdmin() {
  $('#loginGate').hidden = true;
  $('#adminShell').hidden = false;
  $('#adminName').textContent = S.user.name;
  buildNav();
  go(S.page);
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

/* ---------------- 框架 ---------------- */
function setTabs(page, tabs, active) {
  return `<div class="tabs">${tabs.map(([k, t]) => `<div class="tab${active === k ? ' on' : ''}" onclick="switchTab('${page}','${k}')">${t}</div>`).join('')}</div>`;
}
window.switchTab = (page, k) => { S.tab[page] = k; renderPage(); };

async function renderPage() {
  const page = $('#page');
  page.innerHTML = '<div class="empty">加载中…</div>';
  try {
    if (S.page === 'dashboard') await renderDashboard(page);
    else if (S.page === 'products') await renderProducts(page);
    else if (S.page === 'orders') await renderOrders(page);
    else if (S.page === 'inventory') await renderInventory(page);
    else if (S.page === 'marketing') await renderMarketing(page);
    else if (S.page === 'members') await renderMembers(page);
    else if (S.page === 'settings') await renderSettings(page);
  } catch (e) {
    page.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    if (String(e.message).includes('权限')) { S.token = ''; localStorage.removeItem('hy_admin_token'); setTimeout(() => location.reload(), 800); }
  }
}

/* ---------------- 数据看板 ---------------- */
async function renderDashboard(page) {
  const d = await api('/api/admin/overview');
  const c = d.cards;
  const maxSales = Math.max(1, ...d.trend.map(t => t.sales));
  const catMax = Math.max(1, ...d.catSales.map(c2 => c2.amount));
  const catColors = ['#0f6b57', '#2f9a7d', '#6cb9a1', '#b8924a', '#c9a55f', '#a9b3ad'];
  page.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label"><i>💰</i>今日销售额</div><b>${money(c.todaySales)}</b><small>累计 ${money(c.totalSales)}</small></div>
      <div class="kpi"><div class="label"><i>🧾</i>今日订单</div><b>${c.todayOrders}</b><small>累计 ${c.totalOrders} 笔订单</small></div>
      <div class="kpi"><div class="label"><i>🚚</i>待发货</div><b>${c.pendingShip}</b><small>待付款 ${c.pendingPay} 笔</small></div>
      <div class="kpi"><div class="label"><i>📦</i>库存预警</div><b>${c.lowStock}</b><small>共 ${c.products} 个在售商品</small></div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>近 7 日销售趋势</h3><span class="sub">按支付金额统计</span></div>
        <div class="chart">
          ${d.trend.map(t => `<div class="bar-wrap"><div class="bar" style="height:${Math.round(t.sales / maxSales * 100)}%"><span class="val">${t.sales ? Math.round(t.sales) : ''}</span></div><span class="day">${t.date}</span></div>`).join('')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>分类销售占比</h3></div>
        <div class="donut">
          ${d.catSales.map((x, i) => `<div class="donut-row"><span class="dot" style="background:${catColors[i % 6]}"></span><span class="name">${esc(x.name)}</span><span class="val">${money(x.amount)}</span></div>
            <div class="progress" style="grid-column:1/-1"><i style="width:${Math.round(x.amount / catMax * 100)}%;background:${catColors[i % 6]}"></i></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>最新订单</h3><a class="btn btn-sm btn-ghost" href="javascript:;" onclick="go('orders')">全部订单</a></div>
        <table><thead><tr><th>订单号</th><th>收货人</th><th>金额</th><th>状态</th><th>下单时间</th></tr></thead>
        <tbody>${d.recent.map(o => `<tr><td>${o.orderNo}</td><td>${esc((o.address || {}).name || '-')}</td><td class="price">${money(o.pay)}</td><td><span class="badge ${STATUS_BADGE[o.status]}">${STATUS_TEXT[o.status]}</span></td><td class="muted">${new Date(o.createdAt).toLocaleString('zh-CN', { hour12: false })}</td></tr>`).join('')}</tbody></table>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>热销商品 TOP5</h3></div>
        <table><thead><tr><th>商品</th><th>单价</th><th>销量</th><th>库存</th></tr></thead>
        <tbody>${d.top.map(p => `<tr><td><div class="goods-cell"><img src="${p.img}"><div>${esc(p.name)}</div></div></td><td>${money(p.price)}</td><td>${p.sales}</td><td>${p.stock}</td></tr>`).join('')}</tbody></table>
      </div>
    </div>`;
}

/* ---------------- 商品管理 ---------------- */
async function renderProducts(page) {
  const tab = S.tab.products || 'list';
  const qs = new URLSearchParams();
  if (S.cache.pKeyword) qs.set('keyword', S.cache.pKeyword);
  if (S.cache.pCat) qs.set('cat', S.cache.pCat);
  const d = await api('/api/admin/products?' + qs.toString());
  S.cache.products = d;
  if (tab === 'cats') {
    page.innerHTML = setTabs('products', [['list', '商品列表'], ['cats', '分类管理']], 'cats') + `
      <div class="panel">
        <div class="panel-head"><h3>商品分类</h3><button class="btn btn-sm btn-primary" onclick="editCategory()">＋ 新增分类</button></div>
        <table><thead><tr><th>图标</th><th>分类名称</th><th>描述</th><th>商品数</th><th style="text-align:right">操作</th></tr></thead>
        <tbody>${d.categories.map(c => {
          const n = d.list.filter(p => p.catId === c.id).length;
          return `<tr><td style="font-size:18px">${c.icon}</td><td><b>${esc(c.name)}</b></td><td class="muted">${esc(c.desc)}</td><td>${n}</td><td style="text-align:right"><span class="muted" style="font-size:12px">分类 ID：${c.id}</span></td></tr>`;
        }).join('')}</tbody></table>
      </div>`;
    return;
  }
  page.innerHTML = setTabs('products', [['list', '商品列表'], ['cats', '分类管理']], 'list') + `
    <div class="toolbar">
      <input id="pKeyword" placeholder="搜索商品名称" value="${esc(S.cache.pKeyword || '')}">
      <select id="pCat"><option value="">全部分类</option>${d.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
      <button class="btn btn-sm btn-ghost" onclick="searchProducts()">查询</button>
      <span class="grow"></span>
      <button class="btn btn-sm btn-primary" onclick="editProduct()">＋ 新增商品</button>
    </div>
    <div class="panel" style="padding:0;overflow:hidden">
      <table><thead><tr><th>商品</th><th>分类</th><th>价格</th><th>库存</th><th>销量</th><th>规格数</th><th>状态</th><th style="text-align:right">操作</th></tr></thead>
      <tbody>${d.list.map(p => `<tr>
        <td><div class="goods-cell"><img src="${p.img}"><div><b>${esc(p.name)}</b><br><small class="muted">${esc(p.sub)}</small></div></div></td>
        <td>${esc((d.categories.find(c => c.id === p.catId) || {}).name || '-')}</td>
        <td><span class="price">${money(p.price)}</span><br><small class="muted" style="text-decoration:line-through">${money(p.marketPrice)}</small></td>
        <td>${p.stock}${p.stock < 100 ? ' <span class="badge b-red">偏低</span>' : ''}</td>
        <td>${p.sales}</td>
        <td>${p.specs.length}</td>
        <td><span class="badge ${p.status === 'on' ? 'b-green' : 'b-gray'}">${p.status === 'on' ? '在售' : '已下架'}</span></td>
        <td style="text-align:right"><button class="btn btn-sm btn-ghost" onclick="editProduct('${p.id}')">编辑</button>
          <button class="btn btn-sm btn-ghost" onclick="toggleProduct('${p.id}','${p.status}')">${p.status === 'on' ? '下架' : '上架'}</button>
          <button class="btn btn-sm btn-danger" onclick="delProduct('${p.id}')">删除</button></td>
      </tr>`).join('') || '<tr><td colspan="8"><div class="empty">暂无商品</div></td></tr>'}</tbody></table>
    </div>`;
  $('#pCat').value = S.cache.pCat || '';
  window.searchProducts = () => { S.cache.pKeyword = $('#pKeyword').value.trim(); S.cache.pCat = $('#pCat').value; renderPage(); };
  page.querySelector('#pKeyword').onkeydown = e => { if (e.key === 'Enter') searchProducts(); };
}

window.toggleProduct = async (id, status) => {
  await api('/api/admin/products/' + id + '/status', { method: 'POST', body: { status: status === 'on' ? 'off' : 'on' } });
  toast('状态已更新'); renderPage();
};
window.delProduct = async id => {
  if (!confirm('删除后不可恢复，确定删除该商品？')) return;
  await api('/api/admin/products/' + id, { method: 'DELETE' }); toast('商品已删除'); renderPage();
};

window.editProduct = id => {
  const d = S.cache.products;
  const p = id ? d.list.find(x => x.id === id) : { name: '', sub: '', catId: d.categories[0].id, brand: '华阳严选', price: '', marketPrice: '', stock: '', img: '/images/p1.jpg', tags: [], status: 'on', specs: [] };
  const specText = (p.specs || []).map(s => `${s.name}|${s.price}|${s.stock}`).join('\n');
  openModal(`<h3>${id ? '编辑商品' : '新增商品'}</h3>
    <div class="row2">
      <div class="field"><label>商品名称</label><input id="fName" value="${esc(p.name)}"></div>
      <div class="field"><label>所属分类</label><select id="fCat">${d.categories.map(c => `<option value="${c.id}" ${p.catId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>副标题</label><input id="fSub" value="${esc(p.sub)}"></div>
    <div class="row2">
      <div class="field"><label>售价（元）</label><input id="fPrice" type="number" step="0.01" value="${p.price}"></div>
      <div class="field"><label>划线价（元）</label><input id="fMarket" type="number" step="0.01" value="${p.marketPrice}"></div>
    </div>
    <div class="row2">
      <div class="field"><label>总库存</label><input id="fStock" type="number" value="${p.stock}"></div>
      <div class="field"><label>状态</label><select id="fStatus"><option value="on" ${p.status === 'on' ? 'selected' : ''}>在售</option><option value="off" ${p.status === 'off' ? 'selected' : ''}>下架</option></select></div>
    </div>
    <div class="field"><label>主图地址</label><input id="fImg" value="${esc(p.img)}"></div>
    <div class="field"><label>标签（逗号分隔）</label><input id="fTags" value="${esc((p.tags || []).join(','))}"></div>
    <div class="field"><label>规格（每行：规格名|价格|库存）</label><textarea id="fSpecs" placeholder="0.3g×20粒/盒|19.9|200">${esc(specText)}</textarea></div>
    <button class="btn btn-primary" onclick="saveProduct(${id ? "'" + id + "'" : 'null'})">保存商品</button>`);
};

window.saveProduct = async id => {
  const body = {
    name: $('#fName').value.trim(), sub: $('#fSub').value.trim(), catId: $('#fCat').value,
    price: Number($('#fPrice').value), marketPrice: Number($('#fMarket').value), stock: Number($('#fStock').value),
    img: $('#fImg').value.trim(), status: $('#fStatus').value,
    tags: $('#fTags').value.split(',').map(s => s.trim()).filter(Boolean),
    specs: $('#fSpecs').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [n, pr, st] = l.split('|'); return { name: n, price: Number(pr || 0), stock: Number(st || 0) }; })
  };
  if (!body.name || !body.price) return toast('请填写商品名称与价格');
  try {
    if (id) await api('/api/admin/products/' + id, { method: 'PUT', body });
    else await api('/api/admin/products', { method: 'POST', body });
    closeModal(); toast('保存成功'); renderPage();
  } catch (e) { toast(e.message); }
};

window.editCategory = () => {
  openModal(`<h3>新增商品分类</h3>
    <div class="field"><label>分类名称</label><input id="cName" placeholder="如 家庭常备"></div>
    <div class="field"><label>图标（emoji）</label><input id="cIcon" value="📦"></div>
    <div class="field"><label>分类描述</label><input id="cDesc" placeholder="一句话说明"></div>
    <button class="btn btn-primary" onclick="saveCategory()">保存分类</button>`);
};
window.saveCategory = async () => {
  try { await api('/api/admin/categories', { method: 'POST', body: { name: $('#cName').value.trim(), icon: $('#cIcon').value.trim(), desc: $('#cDesc').value.trim() } }); closeModal(); toast('分类已新增'); renderPage(); }
  catch (e) { toast(e.message); }
};

/* ---------------- 订单管理 ---------------- */
async function renderOrders(page) {
  const tab = S.tab.orders || 'all';
  const qs = new URLSearchParams({ status: tab });
  if (S.cache.oKeyword) qs.set('keyword', S.cache.oKeyword);
  const d = await api('/api/admin/orders?' + qs.toString());
  page.innerHTML = setTabs('orders', [['all', '全部'], ['pending', '待付款'], ['paid', '待发货'], ['shipped', '已发货'], ['completed', '已完成']], tab) + `
    <div class="toolbar">
      <input id="oKeyword" placeholder="搜索订单号 / 收货人" value="${esc(S.cache.oKeyword || '')}"><button class="btn btn-sm btn-ghost" onclick="searchOrders()">查询</button>
      <span class="grow"></span><span class="muted" style="font-size:12.5px">共 ${d.list.length} 笔订单</span>
    </div>
    <div class="panel" style="padding:0;overflow:hidden">
      <table><thead><tr><th>订单号</th><th>商品</th><th>收货人</th><th>实付</th><th>状态</th><th>下单时间</th><th style="text-align:right">操作</th></tr></thead>
      <tbody>${d.list.map(o => `<tr>
        <td><b>${o.orderNo}</b><br><small class="muted">${o.items.reduce((s, i) => s + i.qty, 0)} 件</small></td>
        <td><div class="goods-cell"><img src="${o.items[0].img}"><div>${esc(o.items[0].name)}${o.items.length > 1 ? `<br><small class="muted">等 ${o.items.length} 种</small>` : ''}</div></div></td>
        <td>${esc((o.address || {}).name || '-')}<br><small class="muted">${esc((o.address || {}).phone || '')}</small></td>
        <td class="price">${money(o.pay)}</td>
        <td><span class="badge ${STATUS_BADGE[o.status]}">${STATUS_TEXT[o.status]}</span></td>
        <td class="muted">${new Date(o.createdAt).toLocaleString('zh-CN', { hour12: false })}</td>
        <td style="text-align:right">
          <button class="btn btn-sm btn-ghost" onclick="viewOrder(${o.id})">详情</button>
          ${o.status === 'paid' ? `<button class="btn btn-sm btn-primary" onclick="shipOrder(${o.id})">发货</button>` : ''}
        </td></tr>`).join('') || '<tr><td colspan="7"><div class="empty">暂无订单</div></td></tr>'}</tbody></table>
    </div>`;
  window.searchOrders = () => {
    S.cache.oKeyword = $('#oKeyword').value.trim();
    renderPage();
  };
  page.querySelector('#oKeyword').onkeydown = e => { if (e.key === 'Enter') searchOrders(); };
}

window.viewOrder = id => {
  api('/api/admin/orders?status=all').then(({ list }) => {
    const o = list.find(x => x.id === id);
    if (!o) return;
    openModal(`<h3>订单 ${o.orderNo}</h3>
      <p class="muted">状态：${STATUS_TEXT[o.status]} · 下单 ${new Date(o.createdAt).toLocaleString('zh-CN', { hour12: false })}</p>
      <div style="margin:16px 0">${o.items.map(i => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f4f2"><span>${esc(i.name)} <small class="muted">${esc(i.spec)} × ${i.qty}</small></span><span class="price">${money(i.price * i.qty)}</span></div>`).join('')}</div>
      <table style="font-size:12.5px"><tr><td>商品合计</td><td style="text-align:right">${money(o.total)}</td></tr><tr><td>运费</td><td style="text-align:right">${money(o.freight)}</td></tr><tr><td>优惠</td><td style="text-align:right">-${money(o.discount)}</td></tr><tr><td><b>实付款</b></td><td style="text-align:right" class="price"><b>${money(o.pay)}</b></td></tr></table>
      <p style="margin-top:14px;font-size:12.5px"><b>收货：</b>${esc((o.address || {}).name || '')} ${esc((o.address || {}).phone || '')}<br><span class="muted">${esc((o.address || {}).region || '')} ${esc((o.address || {}).detail || '')}</span></p>
      ${o.express ? `<p style="font-size:12.5px;margin-top:8px"><b>物流：</b>${esc(o.express.company)} ${esc(o.express.no)}</p>` : ''}
      ${o.remark ? `<p style="font-size:12.5px;margin-top:8px"><b>备注：</b>${esc(o.remark)}</p>` : ''}`);
  });
};

window.shipOrder = id => {
  openModal(`<h3>订单发货</h3>
    <div class="field"><label>快递公司</label><select id="sCompany"><option>顺丰速运</option><option>京东物流</option><option>中通快递</option><option>圆通速递</option><option>邮政EMS</option></select></div>
    <div class="field"><label>运单号</label><input id="sNo" placeholder="留空将自动生成"></div>
    <button class="btn btn-primary" onclick="doShip(${id})">确认发货</button>`);
};
window.doShip = async id => {
  try { await api('/api/admin/orders/' + id + '/ship', { method: 'POST', body: { company: $('#sCompany').value, no: $('#sNo').value.trim() } }); closeModal(); toast('已发货'); renderPage(); }
  catch (e) { toast(e.message); }
};

/* ---------------- 库存管理 ---------------- */
async function renderInventory(page) {
  const d = await api('/api/admin/inventory');
  page.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi"><div class="label"><i>📦</i>商品总数</div><b>${d.list.length}</b><small>含下架商品</small></div>
      <div class="kpi"><div class="label"><i>⚠️</i>库存预警</div><b>${d.list.filter(x => x.warn).length}</b><small>库存低于 100 件</small></div>
      <div class="kpi"><div class="label"><i>💤</i>滞销商品</div><b>${d.list.filter(x => x.sales < 500).length}</b><small>累计销量低于 500</small></div>
    </div>
    <div class="panel mt16" style="padding:0;overflow:hidden">
      <div style="padding:18px 22px" class="panel-head"><h3>库存明细</h3><span class="sub">可直接修改总库存，保存后商城实时生效</span></div>
      <table><thead><tr><th>商品</th><th>规格库存</th><th>总库存</th><th>累计销量</th><th style="text-align:right">操作</th></tr></thead>
      <tbody>${d.list.map(p => `<tr>
        <td><div class="goods-cell"><img src="${p.img}"><div><b>${esc(p.name)}</b><br><small class="muted">${p.status === 'on' ? '在售' : '已下架'}</small></div></div></td>
        <td>${p.specs.map(s => `<small class="muted">${esc(s.name)}：${s.stock}</small>`).join('<br>')}</td>
        <td><input id="st-${p.id}" type="number" value="${p.stock}" style="width:90px;height:32px;border:1px solid #e6eae7;border-radius:7px;padding:0 8px"> ${p.warn ? '<span class="badge b-red">预警</span>' : ''}</td>
        <td>${p.sales}</td>
        <td style="text-align:right"><button class="btn btn-sm btn-primary" onclick="saveStock('${p.id}')">保存</button></td>
      </tr>`).join('')}</tbody></table>
    </div>`;
}
window.saveStock = async id => {
  const v = $('#st-' + id).value;
  const p = (await api('/api/admin/inventory')).list.find(x => x.id === id);
  try {
    await api('/api/admin/inventory/' + id, { method: 'POST', body: { stock: Number(v), specs: p.specs.map(s => ({ name: s.name, price: s.price, stock: Math.max(0, Math.round(Number(v) * (s.stock / (p.stock || 1)))) })) } });
    toast('库存已更新'); renderPage();
  } catch (e) { toast(e.message); }
};

/* ---------------- 营销中心 ---------------- */
async function renderMarketing(page) {
  const tab = S.tab.marketing || 'coupons';
  if (tab === 'coupons') {
    const d = await api('/api/admin/coupons');
    page.innerHTML = setTabs('marketing', [['coupons', '优惠券'], ['freight', '包邮与运费']], tab) + `
      <div class="toolbar"><button class="btn btn-sm btn-primary" onclick="newCoupon()">＋ 新建优惠券</button><span class="grow"></span><span class="muted" style="font-size:12.5px">共 ${d.list.length} 种优惠券</span></div>
      <div class="panel" style="padding:0;overflow:hidden">
        <table><thead><tr><th>券名称</th><th>面额</th><th>使用门槛</th><th>发放/领取</th><th>有效期</th><th style="text-align:right">操作</th></tr></thead>
        <tbody>${d.list.map(c => `<tr>
          <td><b>${esc(c.name)}</b></td><td class="price">¥${c.amount}</td><td>满 ${c.min} 元可用</td>
          <td>${c.used} / ${c.total}</td><td class="muted">${new Date(c.start).toLocaleDateString('zh-CN')} 至 ${new Date(c.end).toLocaleDateString('zh-CN')}</td>
          <td style="text-align:right"><button class="btn btn-sm btn-danger" onclick="delCoupon('${c.id}')">删除</button></td></tr>`).join('')}</tbody></table>
      </div>`;
    return;
  }
  const d = await api('/api/admin/settings');
  page.innerHTML = setTabs('marketing', [['coupons', '优惠券'], ['freight', '包邮与运费']], 'freight') + `
    <div class="panel" style="max-width:560px">
      <div class="panel-head"><h3>配送规则</h3></div>
      <div class="field"><label>包邮门槛（元）</label><input id="fFree" type="number" value="${d.settings.freeFreight}"></div>
      <div class="field"><label>基础运费（元）</label><input id="fFreight" type="number" value="${d.settings.freight}"></div>
      <div class="field"><label>店铺公告</label><textarea id="fNotice">${esc(d.settings.notice)}</textarea></div>
      <button class="btn btn-primary" onclick="saveFreight()">保存配送规则</button>
    </div>`;
}
window.newCoupon = () => {
  openModal(`<h3>新建优惠券</h3>
    <div class="field"><label>券名称</label><input id="nName" placeholder="如 满199减25"></div>
    <div class="row2"><div class="field"><label>立减金额（元）</label><input id="nAmount" type="number" value="10"></div>
      <div class="field"><label>使用门槛（元）</label><input id="nMin" type="number" value="99"></div></div>
    <div class="field"><label>发放数量</label><input id="nTotal" type="number" value="200"></div>
    <button class="btn btn-primary" onclick="saveCoupon()">创建</button>`);
};
window.saveCoupon = async () => {
  try { await api('/api/admin/coupons', { method: 'POST', body: { name: $('#nName').value.trim(), amount: Number($('#nAmount').value), min: Number($('#nMin').value), total: Number($('#nTotal').value) } }); closeModal(); toast('优惠券已创建'); renderPage(); }
  catch (e) { toast(e.message); }
};
window.delCoupon = async id => { if (!confirm('确定删除该优惠券？')) return; await api('/api/admin/coupons/' + id, { method: 'DELETE' }); toast('已删除'); renderPage(); };
window.saveFreight = async () => {
  try { await api('/api/admin/settings', { method: 'PUT', body: { settings: { freeFreight: Number($('#fFree').value), freight: Number($('#fFreight').value), notice: $('#fNotice').value.trim() } } }); toast('配送规则已保存'); }
  catch (e) { toast(e.message); }
};

/* ---------------- 会员管理 ---------------- */
async function renderMembers(page) {
  const d = await api('/api/admin/users');
  page.innerHTML = `
    <div class="panel" style="padding:0;overflow:hidden">
      <div class="panel-head" style="padding:18px 22px"><h3>会员列表</h3><span class="sub">共 ${d.list.length} 个账号</span></div>
      <table><thead><tr><th>会员</th><th>手机号</th><th>角色</th><th>订单数</th><th>累计消费</th><th>积分</th><th>注册时间</th></tr></thead>
      <tbody>${d.list.map(u => `<tr>
        <td><div class="goods-cell"><div style="width:34px;height:34px;border-radius:50%;background:#eaf5f0;color:#0f6b57;display:flex;align-items:center;justify-content:center">${esc(u.name.slice(0, 1))}</div><b>${esc(u.name)}</b></div></td>
        <td>${u.phone}</td><td><span class="badge ${u.role === 'admin' ? 'b-gold' : 'b-green'}">${u.role === 'admin' ? '管理员' : '会员'}</span></td>
        <td>${u.orderCount}</td><td class="price">${money(u.amount)}</td><td>${u.points}</td>
        <td class="muted">${new Date(u.createdAt).toLocaleDateString('zh-CN')}</td></tr>`).join('')}</tbody></table>
    </div>`;
}

/* ---------------- 店铺设置 ---------------- */
async function renderSettings(page) {
  const d = await api('/api/admin/settings');
  page.innerHTML = `
    <div class="grid-2" style="grid-template-columns:1fr 1fr">
      <div class="panel">
        <div class="panel-head"><h3>店铺基础信息</h3></div>
        <div class="field"><label>店铺名称</label><input id="sName" value="${esc(d.settings.shopName)}"></div>
        <div class="field"><label>品牌口号</label><input id="sSlogan" value="${esc(d.settings.slogan)}"></div>
        <div class="field"><label>客服电话</label><input id="sPhone" value="${esc(d.settings.servicePhone)}"></div>
        <button class="btn btn-primary" onclick="saveSettings()">保存信息</button>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>首页轮播</h3><span class="sub">共 ${d.banners.length} 张</span></div>
        ${d.banners.map((b, i) => `<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f1f4f2">
          <img src="${b.img}" style="width:88px;height:60px;border-radius:8px;object-fit:cover">
          <div style="flex:1"><b style="font-size:13.5px">${esc(b.title)}</b><br><small class="muted">${esc(b.sub)}</small></div>
        </div>`).join('')}
        <p class="muted" style="font-size:12px;margin-top:14px">轮播图片建议 800×800，前台按横幅裁切展示。</p>
      </div>
    </div>
    <div class="panel mt16" style="max-width:560px">
      <div class="panel-head"><h3>管理员密码</h3><span class="sub">公网部署后请立即修改默认密码</span></div>
      <div class="field"><label>原密码</label><input id="pwdOld" type="password" placeholder="当前登录密码"></div>
      <div class="row2">
        <div class="field"><label>新密码</label><input id="pwdNew" type="password" placeholder="至少 6 位"></div>
        <div class="field"><label>确认新密码</label><input id="pwdNew2" type="password" placeholder="再次输入"></div>
      </div>
      <button class="btn btn-primary" onclick="savePassword()">修改密码</button>
    </div>`;
}
window.savePassword = async () => {
  const oldPassword = $('#pwdOld').value, newPassword = $('#pwdNew').value, again = $('#pwdNew2').value;
  if (newPassword !== again) return toast('两次输入的新密码不一致');
  try {
    await api('/api/auth/password', { method: 'POST', body: { oldPassword, newPassword } });
    $('#pwdOld').value = ''; $('#pwdNew').value = ''; $('#pwdNew2').value = '';
    toast('密码已修改，下次登录请使用新密码');
  } catch (e) { toast(e.message); }
};
window.saveSettings = async () => {
  try {
    await api('/api/admin/settings', { method: 'PUT', body: { settings: { shopName: $('#sName').value.trim(), slogan: $('#sSlogan').value.trim(), servicePhone: $('#sPhone').value.trim() } } });
    toast('店铺信息已保存');
  } catch (e) { toast(e.message); }
};

/* ---------------- 启动 ---------------- */
(async () => {
  if (!S.token) { $('#loginGate').hidden = false; return; }
  try {
    const d = await api('/api/auth/me');
    if (d.user.role !== 'admin') throw new Error('非管理员');
    S.user = d.user; enterAdmin();
  } catch {
    S.token = ''; localStorage.removeItem('hy_admin_token');
    $('#loginGate').hidden = false;
  }
})();
