/* 华阳自营商城 · 前台 */
const state = { token: localStorage.getItem('hy_token') || '', user: null, home: null, cartItems: [], route: null };
const $ = (s, r = document) => r.querySelector(s);
const money = n => '¥' + Number(n || 0).toFixed(2);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function couponDate(v, endOfDay) {
  if (!v) return null;
  const s = String(v).trim();
  const text = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s + (endOfDay ? 'T23:59:59.999' : 'T00:00:00.000') : s;
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}
function couponActive(c, now = Date.now()) {
  const start = couponDate(c && c.start, false);
  const end = couponDate(c && c.end, true);
  return Boolean(start && end && now >= start.getTime() && now <= end.getTime());
}

async function api(path, opt = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch(path, { method: opt.method || 'GET', headers, body: opt.body ? JSON.stringify(opt.body) : undefined });
  const data = await res.json().catch(() => ({ ok: false, message: '服务响应异常' }));
  if (!data.ok) throw new Error(data.message || '请求失败');
  return data;
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

function openModal(html) {
  $('#modalBox').innerHTML = '<button class="close" onclick="closeModal()">×</button>' + html;
  $('#modalMask').classList.add('show');
}
function closeModal() { $('#modalMask').classList.remove('show'); }
window.closeModal = closeModal;
$('#modalMask').addEventListener('click', e => { if (e.target.id === 'modalMask') closeModal(); });

/* ---------------- 登录 ---------------- */
function needLogin() {
  if (!state.user) { toast('请先登录'); openLogin(); return true; }
  return false;
}

function openLogin(mode = 'login') {
  const isLogin = mode === 'login';
  openModal(`
    <h3>${isLogin ? '登录华阳自营商城' : '注册新账号'}</h3>
    <p class="muted">${isLogin ? '使用手机号登录，体验完整购物流程' : '注册即送 5 元新人券'}</p>
    <div class="field"><label>手机号</label><input id="mPhone" placeholder="请输入 11 位手机号" value="${isLogin ? '13900000001' : ''}"></div>
    ${isLogin ? '' : '<div class="field"><label>昵称</label><input id="mName" placeholder="怎么称呼您"></div>'}
    ${isLogin ? '' : '<div class="field"><label>业务员邀请码（选填）</label><input id="mCode" placeholder="如 S001，填写后客户归属该业务员"></div>'}
    <div class="field"><label>密码</label><input id="mPwd" type="password" placeholder="至少 6 位" value="${isLogin ? '123456' : ''}"></div>
    <button class="btn btn-primary" id="mSubmit">${isLogin ? '登录' : '注册并登录'}</button>
    <div class="switch">${isLogin ? '还没有账号？<a href="javascript:;" onclick="openLogin(\'register\')">立即注册</a>' : '已有账号？<a href="javascript:;" onclick="openLogin(\'login\')">去登录</a>'}</div>
    ${isLogin ? '<div class="switch" style="margin-top:6px">演示账号：13900000001 / 123456</div>' : ''}
  `);
  $('#mSubmit').onclick = async () => {
    const phone = $('#mPhone').value.trim(), password = $('#mPwd').value.trim();
    try {
      const body = isLogin ? { phone, password } : { phone, password, name: ($('#mName') || {}).value || '', salesCode: ($('#mCode') || {}).value || '' };
      const data = await api('/api/auth/' + (isLogin ? 'login' : 'register'), { method: 'POST', body });
      if (isLogin && data.user.role === 'sales') { closeModal(); toast('业务员请从业务员工作台登录'); location.href = '/sales'; return; }
      state.token = data.token; localStorage.setItem('hy_token', data.token); state.user = data.user;
      closeModal(); toast('登录成功，欢迎回来');
      syncHeader(); refreshCartCount(); render();
    } catch (e) { toast(e.message); }
  };
}
window.openLogin = openLogin;

async function loadUser() {
  if (!state.token) return;
  try { const d = await api('/api/auth/me'); state.user = d.user; }
  catch { state.token = ''; localStorage.removeItem('hy_token'); state.user = null; }
}

function signOut() {
  state.token = ''; state.user = null; localStorage.removeItem('hy_token');
  syncHeader(); toast('已退出登录'); render();
}
window.signOut = signOut;

function syncHeader() {
  $('#topUser').textContent = state.user ? `你好，${state.user.name}` : '你好，请登录';
  $('#topUser').onclick = e => { e.preventDefault(); if (state.user) location.hash = '#/mine'; else openLogin(); };
}

async function refreshCartCount() {
  if (!state.user) { $('#cartCount').textContent = 0; return; }
  try { const d = await api('/api/cart'); state.cartItems = d.list; $('#cartCount').textContent = d.list.reduce((s, i) => s + i.qty, 0); }
  catch { $('#cartCount').textContent = 0; }
}

/* ---------------- 通用组件 ---------------- */
function productCard(p) {
  const off = p.marketPrice > p.price ? (p.marketPrice - p.price) : 0;
  return `<a class="pcard" href="#/product/${p.id}">
    <div class="pic"><img src="${p.img}" alt="${esc(p.name)}" loading="lazy">
      <span class="badge${off ? ' gold' : ''}">${off ? '立省 ' + money(off) : '自营'}</span>
    </div>
    <div class="body">
      <h3>${esc(p.name)}</h3>
      <div class="sub">${esc(p.sub)}</div>
      <div class="tags">${(p.tags || []).slice(0, 2).map(t => `<span class="tag tag-green">${esc(t)}</span>`).join('')}</div>
      <div class="foot">
        <div><span class="price"><small>¥</small>${Number(p.price).toFixed(2)}</span>${p.marketPrice > p.price ? `<span class="market">${money(p.marketPrice)}</span>` : ''}</div>
        <span class="sales">已售 ${p.sales}</span>
      </div>
    </div>
  </a>`;
}

const STATUS_TEXT = { pending: '待付款', paid: '待发货', shipped: '已发货', completed: '已完成', cancelled: '已取消' };

/* ---------------- 首页 ---------------- */
function renderHome() {
  const h = state.home;
  if (!h) return '<div class="empty">加载中…</div>';
  const bannerHtml = h.banners.map((b, i) => `
    <div class="hero-slide${i === 0 ? ' on' : ''}">
      <img src="${b.img}" alt="${esc(b.title)}"><div class="veil"></div>
      <div class="hero-copy">
        <div class="eyebrow">HUAYANG SELF-OPERATED</div>
        <h1>${esc(b.title)}</h1>
        <p>${esc(b.sub)}</p>
        <a class="btn btn-primary btn-lg" href="${b.link}">${esc(b.cta || '立即选购')}</a>
      </div>
    </div>`).join('');
  const dots = h.banners.map((b, i) => `<i class="${i === 0 ? 'on' : ''}" data-i="${i}"></i>`).join('');
  const cats = h.categories.map(c => `
    <a class="cat-card" href="#/list?cat=${c.id}">
      <div class="ico">${c.icon}</div><b>${esc(c.name)}</b><small>${c.count} 件商品</small>
    </a>`).join('');
  return `
  <section class="hero">
    <div class="hero-main" id="heroMain">${bannerHtml}<div class="hero-dots">${dots}</div></div>
    <div class="hero-side">
      <div class="hero-mini">
        <h3>自营仓储 · 当日出库</h3>
        <p>16:00 前下单，仓库当天打包发出</p>
        <div class="amount">99<small> 元包邮</small></div>
      </div>
      <div class="hero-mini gold">
        <h3>会员积分当钱花</h3>
        <p>消费 1 元得 1 积分，100 积分抵 1 元</p>
        <div class="amount">${state.user ? state.user.points : '0'}<small> 当前积分</small></div>
      </div>
    </div>
  </section>

  <section class="services">
    ${[['🛡️', '正品保障', '平台自营采购，假一赔十'], ['🚚', '极速发货', '自营仓直发，当日出库'], ['↩️', '七天无理由', '不影响二次销售可退'], ['🎁', '满额包邮', '单笔满 99 元免运费']]
      .map(([i, t, s]) => `<div class="service"><div class="ico">${i}</div><div><b>${t}</b><small>${s}</small></div></div>`).join('')}
  </section>

  <section class="section">
    <div class="section-head"><h2>商品分类<span class="sub">按需求快速找到合适的商品</span></h2><a class="more" href="#/list">查看全部 ›</a></div>
    <div class="cat-grid">${cats}</div>
  </section>

  <section class="section">
    <div class="section-head"><h2>限时特惠<span class="sub">自营补贴价，售完即止</span></h2><a class="more" href="#/list?sort=default">更多优惠 ›</a></div>
    <div class="grid-products">${h.deals.map(productCard).join('')}</div>
  </section>

  <section class="section">
    <div class="section-head"><h2>热销榜单<span class="sub">近 30 天销量领先</span></h2><a class="more" href="#/list?sort=sales">完整榜单 ›</a></div>
    <div class="grid-products">${h.hot.map(productCard).join('')}</div>
  </section>

  <section class="section">
    <div class="section-head"><h2>新品上架<span class="sub">平台最新引入的自营商品</span></h2></div>
    <div class="grid-products">${h.fresh.slice(0, 4).map(productCard).join('')}</div>
  </section>`;
}

function bindHome() {
  const main = $('#heroMain'); if (!main) return;
  const slides = [...main.querySelectorAll('.hero-slide')];
  const dots = [...main.querySelectorAll('.hero-dots i')];
  let idx = 0, timer;
  const go = n => {
    idx = (n + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('on', i === idx));
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
  };
  dots.forEach(d => d.onclick = () => { go(Number(d.dataset.i)); reset(); });
  const reset = () => { clearInterval(timer); timer = setInterval(() => go(idx + 1), 5000); };
  reset();
}

/* ---------------- 商品列表 ---------------- */
async function renderList(query) {
  const cat = query.cat || '', keyword = query.q || '', sort = query.sort || 'default';
  const min = query.min || '', max = query.max || '';
  const page = Number(query.page || 1);
  const qs = new URLSearchParams({ page, size: 12 });
  if (cat) qs.set('cat', cat); if (keyword) qs.set('keyword', keyword); if (sort) qs.set('sort', sort);
  if (min) qs.set('min', min); if (max) qs.set('max', max);
  const data = await api('/api/products?' + qs.toString());
  const cats = state.home ? state.home.categories : [];
  const sorts = [['default', '综合'], ['sales', '销量'], ['priceAsc', '价格升序'], ['priceDesc', '价格降序'], ['new', '最新']];
  const catName = (cats.find(c => c.id === cat) || {}).name;
  const pages = Math.ceil(data.total / data.size);
  return `
  <div class="crumbs"><a href="#/">首页</a> / ${keyword ? '搜索“' + esc(keyword) + '”' : (catName ? esc(catName) : '全部商品')}</div>
  <div class="list-layout">
    <aside class="filter">
      <h4>商品分类</h4>
      <a class="cat-item${!cat ? ' on' : ''}" href="#/list${keyword ? '?q=' + encodeURIComponent(keyword) : ''}">全部商品</a>
      ${cats.map(c => `<a class="cat-item${cat === c.id ? ' on' : ''}" href="#/list?cat=${c.id}">${c.icon} ${esc(c.name)}</a>`).join('')}
      <h4 style="margin-top:22px">价格区间</h4>
      <div class="price-input">
        <input id="minPrice" placeholder="最低" value="${esc(min)}">
        <span class="muted">-</span>
        <input id="maxPrice" placeholder="最高" value="${esc(max)}">
      </div>
      <button class="apply" id="applyPrice">确定筛选</button>
    </aside>
    <div>
      <div class="list-toolbar">
        ${sorts.map(([k, t]) => `<a class="sort-item${sort === k ? ' on' : ''}" href="#/list?${new URLSearchParams(Object.assign({}, query, { sort: k, page: 1 })).toString()}">${t}</a>`).join('')}
        <span class="toolbar-count">共 ${data.total} 件商品</span>
      </div>
      ${data.list.length ? `<div class="grid-products">${data.list.map(productCard).join('')}</div>` : `<div class="empty card"><span class="ico">🔍</span>没有找到相关商品</div>`}
      ${pages > 1 ? `<div class="pager">${Array.from({ length: pages }, (_, i) => `<button class="${i + 1 === data.page ? 'on' : ''}" onclick="gotoPage(${i + 1})">${i + 1}</button>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

function bindList(query) {
  const btn = $('#applyPrice');
  if (btn) btn.onclick = () => {
    const min = $('#minPrice').value.trim(), max = $('#maxPrice').value.trim();
    const q = new URLSearchParams(Object.assign({}, state.route.query, { min, max, page: 1 }));
    location.hash = '#/list?' + q.toString();
  };
  window.gotoPage = n => {
    const q = new URLSearchParams(Object.assign({}, state.route.query, { page: n }));
    location.hash = '#/list?' + q.toString();
  };
}

/* ---------------- 商品详情 ---------------- */
function renderProduct(p, related) {
  const specs = p.specs.map((s, i) => `<div class="spec-opt${i === 0 ? ' on' : ''}" data-i="${i}">${esc(s.name)}</div>`).join('');
  const off = p.marketPrice > p.price ? Math.round(p.price / p.marketPrice * 100) / 10 : 0;
  return `
  <div class="crumbs"><a href="#/">首页</a> / <a href="#/list?cat=${p.catId}">${esc((state.home.categories.find(c => c.id === p.catId) || {}).name || '商品')}</a> / ${esc(p.name)}</div>
  <div class="detail">
    <div class="gallery"><div class="main"><img src="${p.img}" alt="${esc(p.name)}"></div></div>
    <div class="detail-info">
      <div class="tags">${(p.tags || []).map(t => `<span class="tag tag-gold">${esc(t)}</span>`).join('')}</div>
      <h1>${esc(p.name)}</h1>
      <p class="sub">${esc(p.sub)}</p>
      <div class="price-row">
        <span class="price now"><small>¥</small>${Number(p.price).toFixed(2)}</span>
        <span class="market">${money(p.marketPrice)}</span>
        <span class="off">${off ? off + ' 折' : '自营价'}</span>
      </div>
      <div class="meta-row"><span>累计销量 ${p.sales} 件</span><span>库存 ${p.stock} 件</span><span>发货地 广东湛江</span></div>
      <div class="spec-block"><div class="label">选择规格</div><div class="spec-opts" id="specOpts">${specs}</div></div>
      <div class="spec-block"><div class="label">购买数量</div>
        <div class="qty"><button id="qMinus">−</button><span id="qNum">1</span><button id="qPlus">+</button></div>
      </div>
      <div class="buy-row">
        <button class="btn btn-ghost btn-lg" id="addCart">加入购物车</button>
        <button class="btn btn-primary btn-lg" id="buyNow">立即购买</button>
      </div>
      <div class="assure"><span>正品保障</span><span>满 99 包邮</span><span>七天无理由</span><span>自营仓直发</span></div>
    </div>
  </div>
  <div class="detail-tabs">
    <div class="tabs">
      <div class="tab on" data-t="0">商品详情</div><div class="tab" data-t="1">规格参数</div><div class="tab" data-t="2">售后保障</div>
    </div>
    <div class="dtab-body" id="dtabBody">
      ${p.detail.map(t => `<p>${esc(t)}</p>`).join('')}
    </div>
  </div>
  ${related.length ? `<section class="section"><div class="section-head"><h2>同类商品推荐</h2></div><div class="grid-products">${related.map(productCard).join('')}</div></section>` : ''}`;
}

function bindProduct(p) {
  let specIdx = 0, qty = 1;
  const opts = [...$('#specOpts').querySelectorAll('.spec-opt')];
  const priceEl = $('.price.now');
  const update = () => {
    const s = p.specs[specIdx];
    priceEl.innerHTML = `<small>¥</small>${Number(s.price).toFixed(2)}`;
    $('#qNum').textContent = qty;
  };
  opts.forEach(o => o.onclick = () => {
    specIdx = Number(o.dataset.i); opts.forEach(x => x.classList.remove('on')); o.classList.add('on'); update();
  });
  $('#qMinus').onclick = () => { qty = Math.max(1, qty - 1); $('#qNum').textContent = qty; };
  $('#qPlus').onclick = () => { qty = Math.min(99, qty + 1); $('#qNum').textContent = qty; };
  const specName = () => p.specs[specIdx].name;
  $('#addCart').onclick = async () => {
    if (needLogin()) return;
    try { await api('/api/cart', { method: 'POST', body: { productId: p.id, spec: specName(), qty } }); await refreshCartCount(); toast('已加入购物车'); }
    catch (e) { toast(e.message); }
  };
  $('#buyNow').onclick = () => {
    if (needLogin()) return;
    const s = p.specs[specIdx];
    sessionStorage.setItem('hy_buynow', JSON.stringify([{ productId: p.id, name: p.name, spec: s.name, price: s.price, qty, img: p.img }]));
    location.hash = '#/checkout?mode=buynow';
  };
  document.querySelectorAll('.detail-tabs .tab').forEach(tab => tab.onclick = () => {
    document.querySelectorAll('.detail-tabs .tab').forEach(t => t.classList.remove('on'));
    tab.classList.add('on');
    const t = Number(tab.dataset.t);
    $('#dtabBody').innerHTML = t === 0
      ? p.detail.map(x => `<p>${esc(x)}</p>`).join('')
      : t === 1
        ? `<table class="param-table">${p.params.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`
        : `<p><b>正品保障：</b>平台自营采购，全链路可追溯，假一赔十。</p><p><b>七天无理由：</b>签收后 7 天内，商品不影响二次销售可申请退货。</p><p><b>发货时效：</b>每日 16:00 前支付的订单当日出库，节假日顺延。</p><p><b>售后客服：</b>0759-8888888（08:30–21:00）。</p>`;
  });
}

/* ---------------- 购物车 ---------------- */
async function renderCart() {
  if (!state.user) return `<div class="empty card"><span class="ico">🛒</span>登录后查看购物车<div style="margin-top:18px"><button class="btn btn-primary" onclick="openLogin()">去登录</button></div></div>`;
  const { list } = await api('/api/cart');
  state.cartItems = list;
  if (!list.length) return `<div class="empty card"><span class="ico">🛒</span>购物车还是空的<a href="#/list" style="display:inline-block;margin-top:18px"><button class="btn btn-primary">去逛逛</button></a></div>`;
  const allChecked = list.every(i => i.checked);
  const checkedItems = list.filter(i => i.checked);
  const total = checkedItems.reduce((s, i) => s + i.price * i.qty, 0);
  return `
  <div class="section-head" style="margin-top:18px"><h2>购物车<span class="sub">共 ${list.length} 种商品，已选 ${checkedItems.length} 种</span></h2></div>
  <div class="cart-wrap">
    <div class="cart-head"><div></div><div>商品</div><div>单价</div><div>数量</div><div>小计</div><div>操作</div></div>
    ${list.map(i => `
      <div class="cart-item">
        <div><span class="checkbox${i.checked ? ' on' : ''}" onclick="toggleCart('${i.productId}','${esc(i.spec)}',${!i.checked})">${i.checked ? '✓' : ''}</span></div>
        <div class="info">
          <a class="thumb" href="#/product/${i.productId}"><img src="${i.img}"></a>
          <div><a href="#/product/${i.productId}"><h3>${esc(i.name)}</h3></a><small>${esc(i.spec)}</small></div>
        </div>
        <div class="price">${money(i.price)}</div>
        <div><div class="qty"><button onclick="changeQty('${i.productId}','${esc(i.spec)}',${i.qty - 1})">−</button><span>${i.qty}</span><button onclick="changeQty('${i.productId}','${esc(i.spec)}',${i.qty + 1})">+</button></div></div>
        <div class="price"><small>¥</small>${(i.price * i.qty).toFixed(2)}</div>
        <div><button class="btn btn-sm btn-ghost" onclick="removeCart('${i.productId}','${esc(i.spec)}')">删除</button></div>
      </div>`).join('')}
    <div class="cart-sum">
      <span class="checkbox${allChecked ? ' on' : ''}" onclick="selectAll(${!allChecked})">${allChecked ? '✓' : ''}</span>
      <span class="muted">全选</span>
      <span class="total">已选商品合计<b>${money(total)}</b></span>
      <span class="muted" style="font-size:12.5px">${total >= 99 ? '已享包邮' : `再买 ${money(99 - total)} 免运费`}</span>
      <button class="btn btn-primary btn-lg" onclick="location.hash='#/checkout'">去结算</button>
    </div>
  </div>`;
}

window.toggleCart = async (pid, spec, checked) => { await api('/api/cart', { method: 'PUT', body: { productId: pid, spec, checked } }); render(); };
window.changeQty = async (pid, spec, qty) => { if (qty < 1) return; await api('/api/cart', { method: 'PUT', body: { productId: pid, spec, qty } }); render(); };
window.removeCart = async (pid, spec) => { await api('/api/cart/' + pid + '?spec=' + encodeURIComponent(spec), { method: 'DELETE' }); refreshCartCount(); render(); toast('已删除'); };
window.selectAll = async checked => {
  for (const i of state.cartItems) await api('/api/cart', { method: 'PUT', body: { productId: i.productId, spec: i.spec, checked } });
  render();
};

/* ---------------- 结算 ---------------- */
async function renderCheckout(mode) {
  if (!state.user) return `<div class="empty card"><span class="ico">🔒</span>请先登录后再结算<div style="margin-top:18px"><button class="btn btn-primary" onclick="openLogin()">去登录</button></div></div>`;
  const [addrRes, cartRes, couponRes] = await Promise.all([api('/api/addresses'), api('/api/cart'), api('/api/coupons/mine')]);
  const addrs = addrRes.list;
  const coupons = couponRes.list.filter(c => c.status === 'unused' && couponActive(c));
  const items = mode === 'buynow' ? JSON.parse(sessionStorage.getItem('hy_buynow') || '[]') : cartRes.list.filter(i => i.checked);
  if (!items.length) return `<div class="empty card"><span class="ico">📦</span>没有待结算的商品<a href="#/cart" style="display:inline-block;margin-top:16px">返回购物车</a></div>`;
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const freight = total >= 99 ? 0 : 8;
  state.checkout = { mode, items, total, freight, couponId: '', addressId: (addrs.find(a => a.isDefault) || addrs[0] || {}).id || '' };
  return `
  <div class="section-head" style="margin-top:18px"><h2>确认订单</h2></div>
  <div class="checkout-grid">
    <div>
      <div class="panel"><h3>收货地址</h3>
        <div class="addr-list" id="addrList">
          ${addrs.map(a => `<div class="addr${a.isDefault ? ' on' : ''}" data-id="${a.id}">
            ${a.isDefault ? '<span class="def">默认地址</span>' : ''}
            <b>${esc(a.name)}</b><span class="phone">${esc(a.phone)}</span>
            <p>${esc(a.region)} ${esc(a.detail)}</p></div>`).join('')}
          <div class="addr new" onclick="openAddress()">＋ 新增收货地址</div>
        </div>
      </div>
      <div class="panel" style="margin-top:18px"><h3>商品清单</h3>
        ${items.map(i => `<div class="ogood" style="width:100%;justify-content:space-between;margin-bottom:14px">
          <div style="display:flex;gap:12px;align-items:center"><img src="${i.img}"><div><b style="font-size:14px">${esc(i.name)}</b><br><small class="muted">${esc(i.spec)}</small></div></div>
          <div><span class="muted">${money(i.price)} × ${i.qty}</span>&nbsp;&nbsp;<span class="price">${money(i.price * i.qty)}</span></div>
        </div>`).join('')}
      </div>
      <div class="panel" style="margin-top:18px">
        <h3>订单备注</h3>
        <div class="field"><textarea id="remark" placeholder="如有特殊配送要求请在此说明（选填）"></textarea></div>
      </div>
    </div>
    <div class="panel" style="position:sticky;top:140px">
      <h3>订单汇总</h3>
      <div class="order-line"><span>商品合计</span><span>${money(total)}</span></div>
      <div class="order-line"><span>运费</span><span>${freight ? money(freight) : '包邮'}</span></div>
      <div class="coupon-select" id="couponPick"><span>优惠券</span><span id="couponText">${coupons.length ? coupons.length + ' 张可用' : '暂无可用'} ›</span></div>
      <div class="order-line"><span>优惠</span><span id="discountText">-¥0.00</span></div>
      <div class="order-line total"><span>应付金额</span><b id="payText">${money(total + freight)}</b></div>
      <button class="btn btn-primary btn-lg" style="width:100%;margin-top:18px" id="submitOrder">提交订单</button>
      <p class="muted" style="font-size:12px;margin-top:12px;text-align:center">提交后进入模拟支付，用于完整演示交易流程</p>
    </div>
  </div>`;
}

function bindCheckout() {
  const co = state.checkout;
  document.querySelectorAll('#addrList .addr[data-id]').forEach(el => el.onclick = () => {
    co.addressId = el.dataset.id;
    document.querySelectorAll('#addrList .addr').forEach(x => x.classList.remove('on'));
    el.classList.add('on');
  });
  $('#couponPick').onclick = async () => {
    const { list } = await api('/api/coupons/mine');
    const usable = list.filter(c => c.status === 'unused' && couponActive(c) && co.total >= c.min);
    openModal(`<h3>选择优惠券</h3><p class="muted">本单商品金额 ${money(co.total)}</p>
      <div id="cpList">
        <div class="addr${!co.couponId ? ' on' : ''}" data-cp="" style="margin-bottom:10px"><b>不使用优惠券</b></div>
        ${usable.map(c => `<div class="addr${co.couponId === c.id ? ' on' : ''}" data-cp="${c.id}" style="margin-bottom:10px">
          <b>${esc(c.name)}</b><p>满 ${c.min} 可用 · 立减 ${money(c.amount)}</p></div>`).join('') || '<div class="empty" style="padding:20px 0">暂无满足条件的优惠券</div>'}
      </div>
      <button class="btn btn-primary" onclick="closeModal()">确定</button>`);
    document.querySelectorAll('#cpList .addr').forEach(el => el.onclick = () => {
      co.couponId = el.dataset.cp;
      const c = usable.find(x => x.id === co.couponId);
      const disc = c ? c.amount : 0;
      co.discount = disc;
      $('#couponText').textContent = c ? c.name : '不使用';
      $('#discountText').textContent = '-' + money(disc);
      $('#payText').textContent = money(co.total + co.freight - disc);
      document.querySelectorAll('#cpList .addr').forEach(x => x.classList.remove('on'));
      el.classList.add('on');
    });
  };
  $('#submitOrder').onclick = async () => {
    if (!co.addressId) return toast('请选择收货地址');
    try {
      const body = { addressId: co.addressId, couponId: co.couponId || null, remark: $('#remark').value.trim() };
      if (co.mode === 'buynow') body.items = co.items.map(i => ({ productId: i.productId, spec: i.spec, qty: i.qty }));
      const { order } = await api('/api/orders', { method: 'POST', body });
      await refreshCartCount();
      sessionStorage.removeItem('hy_buynow');
      location.hash = '#/order/' + order.id;
      setTimeout(() => toast('订单已提交，请完成支付'), 300);
    } catch (e) { toast(e.message); }
  };
}

/* ---------------- 订单 ---------------- */
async function renderOrders(status = 'all') {
  if (!state.user) return `<div class="empty card"><span class="ico">📋</span>登录后查看订单<div style="margin-top:18px"><button class="btn btn-primary" onclick="openLogin()">去登录</button></div></div>`;
  const { list } = await api('/api/orders?status=' + status);
  const tabs = [['all', '全部'], ['pending', '待付款'], ['paid', '待发货'], ['shipped', '待收货'], ['completed', '已完成']];
  return `
  <div class="section-head" style="margin-top:18px"><h2>我的订单</h2></div>
  <div class="tabs" style="margin-bottom:18px">${tabs.map(([k, t]) => `<div class="tab${status === k ? ' on' : ''}"><a href="#/orders${k === 'all' ? '' : '?status=' + k}">${t}</a></div>`).join('')}</div>
  ${list.length ? list.map(orderCard).join('') : `<div class="empty card"><span class="ico">📭</span>暂无相关订单</div>`}`;
}

function orderCard(o) {
  return `<div class="order-card">
    <div class="order-top"><span>订单号 ${o.orderNo}</span><span>${new Date(o.createdAt).toLocaleString('zh-CN', { hour12: false })}</span>
      <span class="status status-${o.status}">${STATUS_TEXT[o.status]}</span></div>
    <div class="order-body">
      <div class="order-goods">${o.items.map(i => `<div class="ogood"><img src="${i.img}"><div><b style="font-size:13.5px">${esc(i.name)}</b><br><small>${esc(i.spec)} × ${i.qty}</small></div></div>`).join('')}</div>
      <div class="order-amount"><small class="muted">实付</small><br><b>${money(o.pay)}</b><br><small class="muted">含运费 ${money(o.freight)}</small></div>
    </div>
    <div class="order-actions">
      <button class="btn btn-sm btn-ghost" onclick="location.hash='#/order/${o.id}'">订单详情</button>
      ${o.status === 'pending' ? `<button class="btn btn-sm btn-ghost" onclick="cancelOrder(${o.id})">取消订单</button><button class="btn btn-sm btn-primary" onclick="payOrder(${o.id})">立即付款</button>` : ''}
      ${o.status === 'shipped' ? `<button class="btn btn-sm btn-primary" onclick="confirmOrder(${o.id})">确认收货</button>` : ''}
      ${o.status === 'completed' ? `<button class="btn btn-sm btn-ghost" onclick="location.hash='#/product/${o.items[0].productId}'">再次购买</button>` : ''}
    </div>
  </div>`;
}

window.payOrder = id => showPay(id);
window.cancelOrder = async id => { if (!confirm('确定取消该订单？')) return; await api('/api/orders/' + id + '/cancel', { method: 'POST' }); toast('订单已取消'); render(); };
window.confirmOrder = async id => { await api('/api/orders/' + id + '/confirm', { method: 'POST' }); toast('已确认收货'); render(); };

function showPay(id) {
  openModal(`<h3>收银台</h3><p class="muted">订单 ${id} · 演示环境不产生真实扣款</p>
    <div style="display:grid;gap:10px">
      <button class="btn btn-ghost" onclick="doPay(${id},'微信支付')">💚 微信支付</button>
      <button class="btn btn-ghost" onclick="doPay(${id},'支付宝')">💙 支付宝</button>
      <button class="btn btn-ghost" onclick="doPay(${id},'银行卡')">💳 银行卡</button>
    </div>`);
}
window.showPay = showPay;

window.doPay = async (id, way) => {
  try { await api('/api/orders/' + id + '/pay', { method: 'POST' }); closeModal(); toast(way + '支付成功'); refreshCartCount(); location.hash = '#/order/' + id; render(); }
  catch (e) { toast(e.message); }
};

async function renderOrderDetail(id) {
  if (!state.user) return `<div class="empty card"><span class="ico">🔒</span>请先登录</div>`;
  const { order: o } = await api('/api/orders/' + id);
  const a = o.address || {};
  return `
  <div class="crumbs"><a href="#/orders">我的订单</a> / 订单详情</div>
  <div class="panel">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <h3 style="margin:0">${STATUS_TEXT[o.status]}</h3>
      <span class="muted" style="font-size:12.5px">订单号 ${o.orderNo} · 下单时间 ${new Date(o.createdAt).toLocaleString('zh-CN', { hour12: false })}</span>
      <div style="margin-left:auto;display:flex;gap:10px">
        ${o.status === 'pending' ? `<button class="btn btn-sm btn-ghost" onclick="cancelOrder(${o.id})">取消订单</button><button class="btn btn-sm btn-primary" onclick="showPay(${o.id})">去支付</button>` : ''}
        ${o.status === 'shipped' ? `<button class="btn btn-sm btn-primary" onclick="confirmOrder(${o.id})">确认收货</button>` : ''}
      </div>
    </div>
    ${o.status === 'pending' ? `<p style="margin-top:14px;color:#c0392b;font-size:13px">请在 24 小时内完成支付，超时订单将自动取消（演示环境不会自动取消）。</p>` : ''}
  </div>
  <div class="panel" style="margin-top:18px">
    <h3>商品信息</h3>
    ${o.items.map(i => `<div class="ogood" style="width:100%;justify-content:space-between;margin-bottom:14px">
      <div style="display:flex;gap:12px"><img src="${i.img}"><div><b>${esc(i.name)}</b><br><small class="muted">${esc(i.spec)}</small></div></div>
      <div><span class="muted">${money(i.price)} × ${i.qty}</span> <span class="price" style="margin-left:14px">${money(i.price * i.qty)}</span></div>
    </div>`).join('')}
  </div>
  <div class="panel" style="margin-top:18px">
    <h3>收货信息</h3>
    <p><b>${esc(a.name || '')}</b> ${esc(a.phone || '')}</p>
    <p class="muted">${esc(a.region || '')} ${esc(a.detail || '')}</p>
    ${o.remark ? `<p class="muted">备注：${esc(o.remark)}</p>` : ''}
    ${o.express ? `<p class="muted">物流：${esc(o.express.company)} ${esc(o.express.no)}</p>` : ''}
  </div>
  <div class="checkout-grid" style="margin-top:18px">
    <div class="panel"><h3>订单进度</h3><div class="timeline">
      ${o.timeline.slice().reverse().map(t => `<div class="tl-item"><b>${esc(t.text)}</b><small>${new Date(t.time).toLocaleString('zh-CN', { hour12: false })}</small></div>`).join('')}
    </div></div>
    <div class="panel"><h3>费用明细</h3>
      <div class="order-line"><span>商品合计</span><span>${money(o.total)}</span></div>
      <div class="order-line"><span>运费</span><span>${money(o.freight)}</span></div>
      <div class="order-line"><span>优惠</span><span>-${money(o.discount)}</span></div>
      <div class="order-line total"><span>实付款</span><b>${money(o.pay)}</b></div>
    </div>
  </div>`;
}

/* ---------------- 会员中心 ---------------- */
async function renderMine() {
  if (!state.user) return `<div class="empty card"><span class="ico">👤</span>登录后进入会员中心<div style="margin-top:18px"><button class="btn btn-primary" onclick="openLogin()">登录 / 注册</button></div></div>`;
  const [addrRes, orderRes, couponRes] = await Promise.all([api('/api/addresses'), api('/api/orders'), api('/api/coupons/mine')]);
  const orders = orderRes.list;
  const stats = {
    total: orders.length, amount: orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.pay, 0),
    pending: orders.filter(o => o.status === 'pending').length, shipped: orders.filter(o => o.status === 'shipped').length
  };
  return `
  <div class="mine-head">
    <div class="avatar">${esc(state.user.name.slice(0, 1))}</div>
    <div><h2>${esc(state.user.name)}</h2><p>${esc(state.user.phone)} · 会员积分 ${state.user.points}</p></div>
    <div class="mine-stats">
      <div><b>${stats.total}</b><small>历史订单</small></div>
      <div><b>${money(stats.amount)}</b><small>累计消费</small></div>
      <div><b>${couponRes.list.filter(c => c.status === 'unused' && couponActive(c)).length}</b><small>可用优惠券</small></div>
    </div>
  </div>
  <div class="mine-grid">
    ${[['#/orders?status=pending', '⏳', '待付款', stats.pending + ' 笔待处理'],
       ['#/orders?status=shipped', '🚚', '待收货', stats.shipped + ' 笔在途'],
       ['#/coupons', '🎟️', '领券中心', '每日可领，先到先得'],
       ['#/orders', '📋', '全部订单', '查看历史购物记录']]
      .map(([href, ico, title, sub]) => `<a class="mine-tile" href="${href}"><div class="ico">${ico}</div><div><b>${title}</b><small>${sub}</small></div></a>`).join('')}
  </div>

  <div class="section-head" style="margin-top:30px"><h2>收货地址</h2><span class="more" style="cursor:pointer" onclick="openAddress()">＋ 新增地址</span></div>
  <div class="addr-manage">
    ${addrRes.list.map(a => `<div class="addr${a.isDefault ? ' on' : ''}">
      ${a.isDefault ? '<span class="def">默认</span>' : ''}
      <b>${esc(a.name)}</b><span class="phone">${esc(a.phone)}</span>
      <p>${esc(a.region)} ${esc(a.detail)}</p>
      <div style="margin-top:10px;display:flex;gap:12px"><a class="muted" style="font-size:12px" href="javascript:;" onclick="delAddress('${a.id}')">删除</a></div>
    </div>`).join('') || '<div class="muted" style="font-size:13px">还没有收货地址，点击右上角新增</div>'}
  </div>

  <div class="section-head" style="margin-top:30px"><h2>我的优惠券</h2><a class="more" href="#/coupons">去领券 ›</a></div>
  <div class="grid-products" style="grid-template-columns:repeat(3,1fr)">
    ${couponRes.list.map(c => `<div class="coupon${c.status !== 'unused' ? ' used' : ''}">
      <div class="left"><small>立减</small><b>¥${c.amount}</b><small>满 ${c.min} 可用</small></div>
      <div class="right"><div><h4>${esc(c.name)}</h4><p>有效期至 ${new Date(c.end).toLocaleDateString('zh-CN')}</p></div><span class="tag ${c.status === 'unused' && couponActive(c) ? 'tag-green' : ''}">${c.status === 'used' ? '已使用' : (couponActive(c) ? '可使用' : '已过期')}</span></div>
    </div>`).join('') || '<div class="muted">还没有优惠券</div>'}
  </div>
  <div style="text-align:center;margin:34px 0"><button class="btn btn-ghost btn-sm" onclick="signOut()">退出登录</button></div>`;
}

window.delAddress = async id => { if (!confirm('删除该地址？')) return; await api('/api/addresses/' + id, { method: 'DELETE' }); toast('已删除'); render(); };

function openAddress() {
  if (!state.user) { openLogin(); return; }
  openModal(`<h3>新增收货地址</h3>
    <div class="field"><label>收货人</label><input id="aName" placeholder="姓名"></div>
    <div class="field"><label>手机号</label><input id="aPhone" placeholder="11 位手机号"></div>
    <div class="field"><label>所在地区</label><input id="aRegion" placeholder="如 广东省 湛江市 赤坎区"></div>
    <div class="field"><label>详细地址</label><textarea id="aDetail" placeholder="街道、门牌号、楼层"></textarea></div>
    <div class="field"><label><input type="checkbox" id="aDefault" style="width:auto;height:auto;margin-right:6px">设为默认地址</label></div>
    <button class="btn btn-primary" id="aSave">保存地址</button>`);
  $('#aSave').onclick = async () => {
    try {
      await api('/api/addresses', { method: 'POST', body: { name: $('#aName').value.trim(), phone: $('#aPhone').value.trim(), region: $('#aRegion').value.trim(), detail: $('#aDetail').value.trim(), isDefault: $('#aDefault').checked } });
      closeModal(); toast('地址已保存'); render();
    } catch (e) { toast(e.message); }
  };
}
window.openAddress = openAddress;

/* ---------------- 领券中心 ---------------- */
async function renderCoupons() {
  const { list } = await api('/api/coupons');
  return `
  <div class="section-head" style="margin-top:18px"><h2>领券中心<span class="sub">自营补贴，领取后下单立减</span></h2></div>
  <div class="grid-products" style="grid-template-columns:repeat(2,1fr)">
    ${list.map(c => `<div class="coupon">
      <div class="left"><small>立减</small><b>¥${c.amount}</b><small>满 ${c.min} 可用</small></div>
      <div class="right"><div><h4>${esc(c.name)}</h4><p>有效期至 ${new Date(c.end).toLocaleDateString('zh-CN')} · 剩余 ${Math.max(0, c.total - c.used)} 张</p></div>
        <button class="btn btn-sm ${c.owned || !couponActive(c) ? 'btn-ghost' : 'btn-gold'}" onclick="claimCoupon('${c.id}',${c.owned || !couponActive(c)})">${c.owned ? '已领取' : (couponActive(c) ? '立即领取' : '已过期')}</button>
      </div>
    </div>`).join('')}
  </div>`;
}

window.claimCoupon = async (id, owned) => {
  if (owned) return;
  if (needLogin()) return;
  try { await api('/api/coupons/' + id + '/claim', { method: 'POST' }); toast('领取成功，去使用吧'); render(); }
  catch (e) { toast(e.message); }
};

/* ---------------- 路由 ---------------- */
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [p, q] = raw.split('?');
  return { seg: p.split('/').filter(Boolean), query: Object.fromEntries(new URLSearchParams(q || '')) };
}

async function render() {
  if (!state.home) {
    try { state.home = await api('/api/home'); } catch (e) { $('#app').innerHTML = `<div class="empty">服务未启动或数据加载失败：${esc(e.message)}</div>`; return; }
  }
  const r = state.route = parseHash();
  const app = $('#app');
  app.innerHTML = '<div class="empty">加载中…</div>';
  const seg = r.seg;
  try {
    if (!seg.length) {
      app.innerHTML = renderHome();
      bindHome();
    } else if (seg[0] === 'list') {
      app.innerHTML = await renderList(r.query); bindList(r.query);
    } else if (seg[0] === 'product') {
      const detail = await api('/api/products/' + seg[1]);
      app.innerHTML = renderProduct(detail.product, detail.related); bindProduct(detail.product);
    } else if (seg[0] === 'cart') {
      app.innerHTML = await renderCart();
    } else if (seg[0] === 'checkout') {
      app.innerHTML = await renderCheckout(r.query.mode); if (state.checkout) bindCheckout();
    } else if (seg[0] === 'orders') {
      app.innerHTML = await renderOrders(r.query.status || 'all');
    } else if (seg[0] === 'order') {
      app.innerHTML = await renderOrderDetail(seg[1]);
    } else if (seg[0] === 'mine') {
      app.innerHTML = await renderMine(); syncHeader();
    } else if (seg[0] === 'coupons') {
      app.innerHTML = await renderCoupons();
    } else {
      app.innerHTML = `<div class="empty">页面不存在</div>`;
    }
  } catch (e) {
    app.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
  // 导航高亮
  document.querySelectorAll('.mainnav a[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === (seg[0] || 'home')));
  if (seg[0] === 'list') document.querySelector('.mainnav a[data-nav="list"]').classList.add('active');
}

function buildCatDrop() {
  if (!state.home) return;
  $('#catDrop').innerHTML = `<span class="cat-trigger">全部分类 ▾</span>
    <div class="cat-panel">${state.home.categories.map(c => `<a href="#/list?cat=${c.id}"><span>${c.icon} ${esc(c.name)}</span><small>${c.count} 件</small></a>`).join('')}</div>`;
}

function boot() {
  syncHeader();
  $('#cartBtn').onclick = () => location.hash = '#/cart';
  $('#searchBtn').onclick = () => {
    const k = $('#searchInput').value.trim();
    location.hash = k ? '#/list?q=' + encodeURIComponent(k) : '#/list';
  };
  $('#searchInput').onkeydown = e => { if (e.key === 'Enter') $('#searchBtn').click(); };
  window.addEventListener('hashchange', render);
  (async () => {
    await loadUser();
    syncHeader();
    try { state.home = await api('/api/home'); } catch { }
    buildCatDrop();
    await refreshCartCount();
    render();
  })();
}
boot();
