/**
 * 华阳自营商城 · 平台服务端
 * 零依赖：Node 原生 http + JSON 文件存储，双击「启动商城.bat」即可运行
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'public', 'images', 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SECRET = 'huayang-mall-2026';

/* ------------------------------------------------------------------ 存储 */
function nowISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

function hash(pwd) {
  return crypto.createHash('sha256').update(pwd + '::huayang').digest('hex');
}

function seedDB() {
  const cats = [
    { id: 'c1', name: '常备用药', icon: '💊', desc: '家庭常备 · OTC 非处方药', sort: 1 },
    { id: 'c2', name: '滋补保健', icon: '🌿', desc: '营养补充 · 日常调理', sort: 2 },
    { id: 'c3', name: '医疗器械', icon: '🩺', desc: '家用检测 · 防护用品', sort: 3 },
    { id: 'c4', name: '母婴护理', icon: '🍼', desc: '宝宝专用 · 温和安全', sort: 4 },
    { id: 'c5', name: '个护清洁', icon: '🧼', desc: '口腔护理 · 手部清洁', sort: 5 },
    { id: 'c6', name: '健康食品', icon: '🍯', desc: '天然食材 · 轻养生', sort: 6 }
  ];

  const P = (o) => Object.assign({
    status: 'on', brand: '华阳严选', specs: [], detail: [], params: [], tags: [], createdAt: nowISO(-20)
  }, o);

  const products = [
    P({
      id: 'p1', name: '布洛芬缓释胶囊', sub: '0.3g×20粒 · 缓解轻中度疼痛', catId: 'c1', brand: '华阳严选',
      price: 19.9, marketPrice: 26.8, stock: 320, sales: 1860, img: '/images/p1.jpg',
      tags: ['OTC', '24小时发货', '正品保障'],
      specs: [{ name: '0.3g×20粒/盒', price: 19.9, stock: 200 }, { name: '0.3g×20粒×3盒', price: 52.0, stock: 120 }],
      params: [['批准文号', '国药准字H20260001'], ['生产企业', '华阳制药有限公司'], ['有效期', '24个月'], ['储存', '密封，阴凉干燥处']],
      detail: ['用于缓解轻至中度疼痛，如头痛、关节痛、牙痛、肌肉痛及痛经。', '缓释剂型，每粒持续释放12小时，每日2次，用温水送服。', '饭后服用可减少胃部不适；连续使用不超过5天，症状未缓解请咨询医师。']
    }),
    P({
      id: 'p2', name: '感冒灵颗粒', sub: '10g×9袋 · 解热镇痛', catId: 'c1',
      price: 16.5, marketPrice: 22.0, stock: 260, sales: 1420, img: '/images/p2.jpg',
      tags: ['OTC', '家庭常备'],
      specs: [{ name: '10g×9袋/盒', price: 16.5, stock: 180 }, { name: '10g×9袋×2盒', price: 30.0, stock: 80 }],
      params: [['批准文号', '国药准字Z20260012'], ['规格', '10g×9袋'], ['用法', '开水冲服，一次1袋']],
      detail: ['用于感冒引起的头痛、发热、鼻塞、流涕、咽痛。', '开水冲服，一次1袋，一日3次。', '服药期间不宜饮酒，避免驾驶及高空作业。']
    }),
    P({
      id: 'p3', name: '维生素C泡腾片', sub: '1000mg×20片 · 补充维C', catId: 'c2',
      price: 39.0, marketPrice: 49.0, stock: 180, sales: 980, img: '/images/p3.jpg',
      tags: ['每日一片', '进口原料'],
      specs: [{ name: '1000mg×20片/管', price: 39.0, stock: 120 }, { name: '1000mg×20片×3管', price: 108.0, stock: 60 }],
      params: [['规格', '1000mg×20片'], ['口味', '甜橙味'], ['适宜人群', '成人']],
      detail: ['每片含维生素C 1000mg，投入200ml温水或冷水即可快速崩解。', '每日1片，不建议空腹饮用，冲泡后请尽快饮用。', '日常补充维C，帮助维持机体正常免疫功能。']
    }),
    P({
      id: 'p4', name: '乳清蛋白粉', sub: '750g/罐 · 高蛋白低脂', catId: 'c2',
      price: 268.0, marketPrice: 328.0, stock: 96, sales: 420, img: '/images/p4.jpg',
      tags: ['高蛋白', '无添加蔗糖'],
      specs: [{ name: '750g/罐（香草味）', price: 268.0, stock: 60 }, { name: '750g×2罐', price: 508.0, stock: 36 }],
      params: [['净含量', '750g'], ['蛋白质含量', '≥80%'], ['保质期', '18个月']],
      detail: ['每份（30g）提供约24g优质乳清蛋白，易冲泡不结块。', '运动后30分钟内冲调一杯，也可作为日常蛋白质补充。', '开罐后请密封保存于阴凉干燥处，建议30天内食用完。']
    }),
    P({
      id: 'p5', name: '家用电子血压计', sub: '上臂式 · 智能加压 · 双人记忆', catId: 'c3',
      price: 299.0, marketPrice: 399.0, stock: 65, sales: 310, img: '/images/p5.jpg',
      tags: ['两年质保', '大屏显示'],
      specs: [{ name: '标准版（含袖带）', price: 299.0, stock: 45 }, { name: '语音版（含电源适配器）', price: 359.0, stock: 20 }],
      params: [['测量方式', '示波法'], ['袖带范围', '22–42cm'], ['供电', '4节5号电池 / USB'], ['记忆组数', '2×99组']],
      detail: ['上臂式设计，测量更稳定，适合家庭日常血压监测。', '一键启动自动加压，大字体显示收缩压、舒张压与脉搏。', '建议每日固定时间测量，静坐5分钟后开始，连续测2次取平均值。']
    }),
    P({
      id: 'p6', name: '医用外科口罩', sub: '50只/盒 · 三层过滤 · 独立包装', catId: 'c3',
      price: 29.9, marketPrice: 45.0, stock: 500, sales: 3200, img: '/images/p6.jpg',
      tags: ['爆款', '医疗器械注册'],
      specs: [{ name: '50只/盒（蓝色）', price: 29.9, stock: 300 }, { name: '50只×3盒', price: 82.0, stock: 200 }],
      params: [['执行标准', 'YY 0469-2011'], ['材质', '无纺布三层'], ['佩戴方式', '耳挂式']],
      detail: ['三层无纺布结构，细菌过滤效率≥95%。', '独立包装，外出携带方便，开封后请尽快使用。', '一次性使用，佩戴时压紧鼻夹，潮湿或污染后及时更换。']
    }),
    P({
      id: 'p7', name: '婴儿纸尿裤', sub: 'L码 54片 · 超薄透气 · 干爽一整晚', catId: 'c4',
      price: 129.0, marketPrice: 168.0, stock: 120, sales: 760, img: '/images/p7.jpg',
      tags: ['母婴专用', '弱酸性表层'],
      specs: [{ name: 'L码 54片/包', price: 129.0, stock: 80 }, { name: 'XL码 48片/包', price: 129.0, stock: 40 }],
      params: [['适用体重', 'L码 9–14kg'], ['芯体', '高分子吸水树脂'], ['表层', '弱酸性无纺布']],
      detail: ['3D立体剪裁贴合腿型，活动时不侧漏。', '高分子芯体快速锁水，整夜干爽不闷红。', '尿湿指示条变蓝即需更换，建议2–3小时更换一次。']
    }),
    P({
      id: 'p8', name: '婴儿润肤霜', sub: '50g · 温和保湿 · 面部全身可用', catId: 'c4',
      price: 59.0, marketPrice: 79.0, stock: 150, sales: 540, img: '/images/p8.jpg',
      tags: ['无香精', '敏感肌适用'],
      specs: [{ name: '50g/支', price: 59.0, stock: 100 }, { name: '50g×2支', price: 108.0, stock: 50 }],
      params: [['净含量', '50g'], ['适用人群', '婴幼儿'], ['保质期', '36个月']],
      detail: ['添加角鲨烷与神经酰胺，秋冬干燥季节锁水保湿。', '质地轻盈不油腻，面部与身体均可使用。', '首次使用建议在耳后小面积试用，无不适后再大面积涂抹。']
    }),
    P({
      id: 'p9', name: '益生菌牙膏', sub: '100g · 清新口气 · 温和不刺激', catId: 'c5',
      price: 32.9, marketPrice: 45.0, stock: 200, sales: 890, img: '/images/p9.jpg',
      tags: ['清新口气', '低泡配方'],
      specs: [{ name: '100g/支（薄荷味）', price: 32.9, stock: 150 }, { name: '100g×3支', price: 89.0, stock: 50 }],
      params: [['净含量', '100g'], ['含氟量', '0.1%'], ['适用人群', '成人及6岁以上儿童']],
      detail: ['益生菌发酵配方，帮助平衡口腔菌群，减少异味。', '低泡温和，早晚各一次，每次刷牙不少于2分钟。', '6岁以下儿童请在成人指导下使用豌豆大小用量。']
    }),
    P({
      id: 'p10', name: '泡沫洗手液', sub: '500ml · 抑菌洁净 · 温和不紧绷', catId: 'c5',
      price: 25.9, marketPrice: 36.0, stock: 240, sales: 1100, img: '/images/p10.jpg',
      tags: ['抑菌率99.9%', '泵头设计'],
      specs: [{ name: '500ml/瓶（清香型）', price: 25.9, stock: 160 }, { name: '500ml×2瓶', price: 46.0, stock: 80 }],
      params: [['净含量', '500ml'], ['抑菌成分', '植物提取物'], ['保质期', '24个月']],
      detail: ['按压即出绵密泡沫，免揉搓起泡，洗手更省水。', '含保湿成分，频繁洗手也不易干裂。', '取适量泡沫搓洗双手20秒以上，清水冲净即可。']
    }),
    P({
      id: 'p11', name: '洋槐蜂蜜', sub: '500g · 天然成熟蜜 · 无添加', catId: 'c6',
      price: 69.0, marketPrice: 89.0, stock: 88, sales: 630, img: '/images/p11.jpg',
      tags: ['原蜜灌装', '自然成熟'],
      specs: [{ name: '500g/罐', price: 69.0, stock: 60 }, { name: '500g×2罐礼盒', price: 128.0, stock: 28 }],
      params: [['净含量', '500g'], ['蜜源', '洋槐花'], ['产地', '陕西']],
      detail: ['色泽清亮、口感清甜，适合冲泡蜂蜜水或搭配早餐。', '建议用40℃以下温水冲调，避免高温破坏活性成分。', '自然成熟蜜低温下可能结晶，属正常现象。']
    }),
    P({
      id: 'p12', name: '宁夏枸杞', sub: '250g · 头茬大果 · 颗粒饱满', catId: 'c6',
      price: 45.0, marketPrice: 62.0, stock: 110, sales: 720, img: '/images/p12.jpg',
      tags: ['头茬果', '自然晾晒'],
      specs: [{ name: '250g/袋', price: 45.0, stock: 70 }, { name: '250g×2袋', price: 82.0, stock: 40 }],
      params: [['净含量', '250g'], ['产地', '宁夏中宁'], ['等级', '特级']],
      detail: ['颗粒饱满、色泽自然，干嚼、泡水、煲汤皆宜。', '每日10–15粒为宜，泡水后可将果肉一并食用。', '开袋后建议密封冷藏，避免受潮。']
    })
  ];

  const users = [
    { id: 'u1', phone: '13800000000', name: '平台管理员', pwd: hash('admin123'), role: 'admin', points: 0, createdAt: nowISO(-120) },
    { id: 'u2', phone: '13900000001', name: '陈先生', pwd: hash('123456'), role: 'user', points: 1200, createdAt: nowISO(-60) },
    { id: 'u3', phone: '13700000002', name: '李女士', pwd: hash('123456'), role: 'user', points: 680, createdAt: nowISO(-15) }
  ];

  const coupons = [
    { id: 'cp1', name: '新人无门槛券', amount: 5, min: 0, total: 1000, used: 132, start: nowISO(-30), end: nowISO(30) },
    { id: 'cp2', name: '满99减10', amount: 10, min: 99, total: 800, used: 260, start: nowISO(-10), end: nowISO(20) },
    { id: 'cp3', name: '满199减25', amount: 25, min: 199, total: 500, used: 148, start: nowISO(-10), end: nowISO(20) },
    { id: 'cp4', name: '满299减45', amount: 45, min: 299, total: 300, used: 76, start: nowISO(-3), end: nowISO(27) }
  ];

  const addresses = {
    u2: [{ id: 'a1', name: '陈石生', phone: '13900000001', region: '广东省 湛江市 赤坎区', detail: '海田路 88 号华阳大厦 6 楼', isDefault: true }],
    u3: [{ id: 'a2', name: '李女士', phone: '13700000002', region: '广东省 湛江市 霞山区', detail: '人民大道南 12 号 3 栋 502', isDefault: true }]
  };

  const mk = (id, userId, status, daysAgo, items, extra = {}) => {
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const freight = total >= 99 ? 0 : 8;
    const discount = extra.discount || 0;
    return {
      id, orderNo: 'HY' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + String(1000 + id), userId, status,
      items, total: +total.toFixed(2), freight, discount, pay: +(total + freight - discount).toFixed(2),
      address: extra.address || addresses[userId][0], remark: extra.remark || '',
      createdAt: nowISO(-daysAgo), paidAt: status === 'pending' ? null : nowISO(-daysAgo),
      express: extra.express || null,
      timeline: [{ time: nowISO(-daysAgo), text: '订单提交成功' }]
    };
  };

  const item = (pid, qty, specIdx = 0) => {
    const p = products.find(x => x.id === pid);
    const sp = p.specs[specIdx];
    return { productId: p.id, name: p.name, spec: sp.name, price: sp.price, qty, img: p.img };
  };

  const orders = [
    mk(13, 'u2', 'paid', 0, [item('p1', 2), item('p11', 1)], { remark: '客户急要，请优先发货' }),
    mk(9, 'u2', 'completed', 6, [item('p6', 3), item('p10', 1)], { discount: 10 }),
    mk(10, 'u3', 'shipped', 2, [item('p4', 1), item('p12', 1)], { express: { company: '顺丰速运', no: 'SF1234567890123' } }),
    mk(11, 'u2', 'paid', 1, [item('p3', 2)], { remark: '请在工作日下午送达' }),
    mk(12, 'u3', 'pending', 0, [item('p7', 1), item('p8', 1)])
  ];

  return {
    settings: {
      shopName: '华阳自营商城', slogan: '正品直供 · 健康到家',
      notice: '自营仓直发，16:00 前下单当日出库；单笔满 99 元包邮，偏远地区除外。',
      freeFreight: 99, freight: 8, servicePhone: '0759-8888888',
      services: ['正品保障', '极速发货', '七天无理由', '满99包邮']
    },
    banners: [
      { id: 'b1', title: '华阳自营 · 正品直供', sub: '全品类健康好物，仓直发当日出库', img: '/images/banner1.jpg', link: '#/list', cta: '立即选购' },
      { id: 'b2', title: '年终焕新季', sub: '满 199 减 25 · 会员再享专属价', img: '/images/banner2.jpg', link: '#/list', cta: '去逛逛' }
    ],
    categories: cats, products, users, addresses, coupons,
    carts: {}, orders,
    userCoupons: {
      u2: [{ couponId: 'cp1', status: 'unused' }, { couponId: 'cp2', status: 'unused' }],
      u3: [{ couponId: 'cp3', status: 'unused' }]
    },
    seq: { order: 14 }
  };
}

function loadDB() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
    catch (e) { console.error('[db] 解析失败，使用种子数据：', e.message); }
  }
  const seed = seedDB();
  fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
  return seed;
}
function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

const db = loadDB();

/* ------------------------------------------------------------------ 工具 */
function send(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function fail(res, message, code = 400) { send(res, code, { ok: false, message }); }
function ok(res, data = {}) { send(res, 200, Object.assign({ ok: true }, data)); }

function readBody(req, limit = 2e6) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > limit) { req.destroy(); reject(new Error('body too large')); } });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('请求体不是合法 JSON')); }
    });
    req.on('error', reject);
  });
}

const b64 = s => Buffer.from(s).toString('base64url');
function signToken(user) {
  const payload = b64(JSON.stringify({ uid: user.id, role: user.role, t: Date.now() }));
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}
function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expect = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (sig !== expect) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return db.users.find(u => u.id === data.uid) || null;
  } catch { return null; }
}
function currentUser(req) {
  const auth = req.headers['authorization'] || '';
  return verifyToken(auth.replace(/^Bearer\s+/i, ''));
}

const round = n => Math.round(n * 100) / 100;
function genOrderNo(n) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `HY${stamp}${String(n).padStart(5, '0')}`;
}
function orderTotal(items, coupon) {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const freight = total >= db.settings.freeFreight ? 0 : db.settings.freight;
  const discount = coupon && total >= coupon.min ? coupon.amount : 0;
  return { total: round(total), freight: round(freight), discount: round(discount), pay: round(total + freight - discount) };
}

/* ------------------------------------------------------------------ 路由 */
const routes = [];
function route(method, path, handler, opt = {}) {
  routes.push({ method, path, handler, ...opt });
}
function matchPath(pattern, pathname) {
  const ps = pattern.split('/').filter(Boolean);
  const as = pathname.split('/').filter(Boolean);
  if (ps.length !== as.length) return null;
  const params = {};
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].startsWith(':')) params[ps[i].slice(1)] = decodeURIComponent(as[i]);
    else if (ps[i] !== as[i]) return null;
  }
  return params;
}

/* ---- 公共数据 ---- */
route('GET', '/api/health', (req, res) => ok(res, { service: 'huayang-mall', time: new Date().toISOString() }));

route('GET', '/api/home', (req, res) => {
  const onSale = db.products.filter(p => p.status === 'on');
  ok(res, {
    settings: db.settings,
    banners: db.banners,
    categories: db.categories.slice().sort((a, b) => a.sort - b.sort).map(c => ({
      ...c, count: onSale.filter(p => p.catId === c.id).length,
      cover: (onSale.find(p => p.catId === c.id) || {}).img || ''
    })),
    hot: onSale.slice().sort((a, b) => b.sales - a.sales).slice(0, 8),
    fresh: onSale.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6),
    deals: onSale.filter(p => p.marketPrice > p.price).sort((a, b) => (b.marketPrice - b.price) - (a.marketPrice - a.price)).slice(0, 4)
  });
});

route('GET', '/api/categories', (req, res) => ok(res, { list: db.categories.slice().sort((a, b) => a.sort - b.sort) }));

route('GET', '/api/products', (req, res, params, query) => {
  let list = db.products.filter(p => p.status === 'on');
  if (query.cat) list = list.filter(p => p.catId === query.cat);
  if (query.keyword) {
    const k = query.keyword.trim();
    list = list.filter(p => p.name.includes(k) || p.sub.includes(k) || p.tags.join(' ').includes(k));
  }
  if (query.min) list = list.filter(p => p.price >= Number(query.min));
  if (query.max) list = list.filter(p => p.price <= Number(query.max));
  const sort = query.sort || 'default';
  if (sort === 'priceAsc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'priceDesc') list.sort((a, b) => b.price - a.price);
  else if (sort === 'sales') list.sort((a, b) => b.sales - a.sales);
  else if (sort === 'new') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else list.sort((a, b) => b.sales - a.sales);

  const page = Math.max(1, Number(query.page || 1));
  const size = Math.min(50, Math.max(1, Number(query.size || 12)));
  const total = list.length;
  ok(res, { total, page, size, list: list.slice((page - 1) * size, page * size) });
});

route('GET', '/api/products/:id', (req, res, p) => {
  const product = db.products.find(x => x.id === p.id);
  if (!product) return fail(res, '商品不存在', 404);
  const related = db.products.filter(x => x.status === 'on' && x.catId === product.catId && x.id !== product.id).slice(0, 4);
  ok(res, { product, related });
});

/* ---- 账号 ---- */
route('POST', '/api/auth/register', async (req, res) => {
  const { phone, name, password } = await readBody(req);
  if (!/^1\d{10}$/.test(phone || '')) return fail(res, '请输入正确的 11 位手机号');
  if (!password || password.length < 6) return fail(res, '密码至少 6 位');
  if (db.users.some(u => u.phone === phone)) return fail(res, '该手机号已注册');
  const user = { id: 'u' + (db.users.length + 1) + Date.now().toString(36), phone, name: name || '新用户', pwd: hash(password), role: 'user', points: 0, createdAt: new Date().toISOString() };
  db.users.push(user); save();
  ok(res, { token: signToken(user), user: { id: user.id, phone, name: user.name, role: 'user', points: 0 } });
});

route('POST', '/api/auth/login', async (req, res) => {
  const { phone, password } = await readBody(req);
  const user = db.users.find(u => u.phone === phone);
  if (!user || user.pwd !== hash(password || '')) return fail(res, '手机号或密码错误');
  ok(res, { token: signToken(user), user: { id: user.id, phone: user.phone, name: user.name, role: user.role, points: user.points } });
});

route('GET', '/api/auth/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return fail(res, '请先登录', 401);
  ok(res, { user: { id: user.id, phone: user.phone, name: user.name, role: user.role, points: user.points } });
});

route('POST', '/api/auth/password', async (req, res) => {
  const user = currentUser(req);
  if (!user) return fail(res, '请先登录', 401);
  const b = await readBody(req);
  if (user.pwd !== hash(b.oldPassword || '')) return fail(res, '原密码不正确');
  if (!b.newPassword || String(b.newPassword).length < 6) return fail(res, '新密码至少 6 位');
  user.pwd = hash(b.newPassword);
  save();
  ok(res, {});
});

/* ---- 地址 ---- */
route('GET', '/api/addresses', (req, res) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  ok(res, { list: db.addresses[user.id] || [] });
});

route('POST', '/api/addresses', async (req, res) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const b = await readBody(req);
  if (!b.name || !b.phone || !b.region || !b.detail) return fail(res, '请填写完整的收货信息');
  const list = db.addresses[user.id] || (db.addresses[user.id] = []);
  const addr = { id: 'a' + Date.now().toString(36), name: b.name, phone: b.phone, region: b.region, detail: b.detail, isDefault: list.length === 0 ? true : !!b.isDefault };
  if (addr.isDefault) list.forEach(a => a.isDefault = false);
  list.push(addr); save(); ok(res, { address: addr, list });
});

route('PUT', '/api/addresses/:id', async (req, res, p) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const list = db.addresses[user.id] || [];
  const addr = list.find(a => a.id === p.id);
  if (!addr) return fail(res, '地址不存在', 404);
  const b = await readBody(req);
  Object.assign(addr, { name: b.name ?? addr.name, phone: b.phone ?? addr.phone, region: b.region ?? addr.region, detail: b.detail ?? addr.detail });
  if (b.isDefault) { list.forEach(a => a.isDefault = false); addr.isDefault = true; }
  save(); ok(res, { address: addr, list });
});

route('DELETE', '/api/addresses/:id', (req, res, p) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const list = db.addresses[user.id] || [];
  const idx = list.findIndex(a => a.id === p.id);
  if (idx < 0) return fail(res, '地址不存在', 404);
  list.splice(idx, 1); if (list.length && !list.some(a => a.isDefault)) list[0].isDefault = true;
  save(); ok(res, { list });
});

/* ---- 购物车 ---- */
route('GET', '/api/cart', (req, res) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const items = (db.carts[user.id] || []).map(it => {
    const p = db.products.find(x => x.id === it.productId);
    if (!p) return null;
    const spec = p.specs.find(s => s.name === it.spec) || p.specs[0];
    return { productId: p.id, name: p.name, spec: spec.name, price: spec.price, qty: it.qty, img: p.img, stock: spec.stock, checked: it.checked !== false };
  }).filter(Boolean);
  ok(res, { list: items });
});

route('POST', '/api/cart', async (req, res) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const b = await readBody(req);
  const p = db.products.find(x => x.id === b.productId);
  if (!p) return fail(res, '商品不存在', 404);
  const cart = db.carts[user.id] || (db.carts[user.id] = []);
  const specName = b.spec || p.specs[0].name;
  const exists = cart.find(i => i.productId === p.id && i.spec === specName);
  if (exists) exists.qty += Number(b.qty || 1);
  else cart.push({ productId: p.id, spec: specName, qty: Number(b.qty || 1), checked: true });
  save(); ok(res, { count: cart.reduce((s, i) => s + i.qty, 0) });
});

route('PUT', '/api/cart', async (req, res) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const b = await readBody(req);
  const cart = db.carts[user.id] || [];
  const it = cart.find(i => i.productId === b.productId && i.spec === b.spec);
  if (!it) return fail(res, '购物车中无此商品', 404);
  if (typeof b.qty === 'number') it.qty = Math.max(1, b.qty);
  if (typeof b.checked === 'boolean') it.checked = b.checked;
  save(); ok(res, {});
});

route('DELETE', '/api/cart/:productId', (req, res, p, query) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const cart = db.carts[user.id] || [];
  const idx = cart.findIndex(i => i.productId === p.productId && (!query.spec || i.spec === query.spec));
  if (idx >= 0) cart.splice(idx, 1);
  save(); ok(res, {});
});

/* ---- 优惠券 ---- */
route('GET', '/api/coupons', (req, res) => {
  const user = currentUser(req);
  const owned = user ? (db.userCoupons[user.id] || []) : [];
  ok(res, { list: db.coupons.map(c => ({ ...c, owned: owned.some(u => u.couponId === c.id) })) });
});

route('POST', '/api/coupons/:id/claim', (req, res, p) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const coupon = db.coupons.find(c => c.id === p.id);
  if (!coupon) return fail(res, '优惠券不存在', 404);
  const mine = db.userCoupons[user.id] || (db.userCoupons[user.id] = []);
  if (mine.some(u => u.couponId === coupon.id)) return fail(res, '已领取过该券');
  if (coupon.used >= coupon.total) return fail(res, '优惠券已领完');
  mine.push({ couponId: coupon.id, status: 'unused' });
  save(); ok(res, {});
});

route('GET', '/api/coupons/mine', (req, res) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const mine = db.userCoupons[user.id] || [];
  const list = mine.map(m => {
    const c = db.coupons.find(x => x.id === m.couponId);
    return c ? { ...c, status: m.status } : null;
  }).filter(Boolean);
  ok(res, { list });
});

/* ---- 订单 ---- */
route('POST', '/api/orders', async (req, res) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const b = await readBody(req);
  const addressList = db.addresses[user.id] || [];
  const addr = addressList.find(a => a.id === b.addressId) || addressList.find(a => a.isDefault);
  if (!addr) return fail(res, '请选择收货地址');

  let items = [];
  if (Array.isArray(b.items) && b.items.length) {
    // 立即购买
    for (const it of b.items) {
      const p = db.products.find(x => x.id === it.productId);
      if (!p) return fail(res, `商品已下架：${it.productId}`);
      const spec = p.specs.find(s => s.name === it.spec) || p.specs[0];
      if (spec.stock < it.qty) return fail(res, `库存不足：${p.name}`);
      items.push({ productId: p.id, name: p.name, spec: spec.name, price: spec.price, qty: it.qty, img: p.img });
    }
  } else {
    const cart = (db.carts[user.id] || []).filter(i => i.checked !== false);
    if (!cart.length) return fail(res, '请选择要结算的商品');
    for (const it of cart) {
      const p = db.products.find(x => x.id === it.productId);
      if (!p) continue;
      const spec = p.specs.find(s => s.name === it.spec) || p.specs[0];
      if (spec.stock < it.qty) return fail(res, `库存不足：${p.name}`);
      items.push({ productId: p.id, name: p.name, spec: spec.name, price: spec.price, qty: it.qty, img: p.img });
    }
  }
  if (!items.length) return fail(res, '订单商品为空');

  let coupon = null;
  if (b.couponId) {
    const mine = db.userCoupons[user.id] || [];
    const uc = mine.find(u => u.couponId === b.couponId && u.status === 'unused');
    const c = db.coupons.find(x => x.id === b.couponId);
    if (uc && c) coupon = c;
  }

  const calc = orderTotal(items, coupon);
  const id = db.seq.order++;
  const order = {
    id, orderNo: genOrderNo(id), userId: user.id, status: 'pending', items,
    total: calc.total, freight: calc.freight, discount: calc.discount, pay: calc.pay,
    address: addr, remark: b.remark || '', createdAt: new Date().toISOString(), paidAt: null,
    express: null, timeline: [{ time: new Date().toISOString(), text: '订单提交成功' }]
  };
  // 扣库存
  for (const it of items) {
    const p = db.products.find(x => x.id === it.productId);
    const spec = p.specs.find(s => s.name === it.spec);
    spec.stock -= it.qty; p.stock -= it.qty; p.sales += it.qty;
  }
  if (coupon) {
    const mine = db.userCoupons[user.id];
    mine.find(u => u.couponId === coupon.id).status = 'used';
    coupon.used += 1;
  }
  // 清空已结算购物车
  if (!Array.isArray(b.items)) db.carts[user.id] = (db.carts[user.id] || []).filter(i => i.checked === false);
  db.orders.unshift(order); save();
  ok(res, { order });
});

route('GET', '/api/orders', (req, res, p, query) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  let list = db.orders.filter(o => o.userId === user.id);
  if (query.status && query.status !== 'all') list = list.filter(o => o.status === query.status);
  ok(res, { list });
});

route('GET', '/api/orders/:id', (req, res, p) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const order = db.orders.find(o => o.id === Number(p.id) && o.userId === user.id);
  if (!order) return fail(res, '订单不存在', 404);
  ok(res, { order });
});

route('POST', '/api/orders/:id/pay', (req, res, p) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const order = db.orders.find(o => o.id === Number(p.id) && o.userId === user.id);
  if (!order) return fail(res, '订单不存在', 404);
  if (order.status !== 'pending') return fail(res, '当前订单状态不支持支付');
  order.status = 'paid'; order.paidAt = new Date().toISOString();
  order.timeline.push({ time: order.paidAt, text: '支付成功（模拟支付）' });
  const u = db.users.find(x => x.id === user.id);
  if (u) u.points = (u.points || 0) + Math.floor(order.pay);
  save(); ok(res, { order });
});

route('POST', '/api/orders/:id/cancel', (req, res, p) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const order = db.orders.find(o => o.id === Number(p.id) && o.userId === user.id);
  if (!order) return fail(res, '订单不存在', 404);
  if (order.status !== 'pending') return fail(res, '仅待付款订单可取消');
  order.status = 'cancelled';
  order.timeline.push({ time: new Date().toISOString(), text: '用户取消订单' });
  for (const it of order.items) {
    const pr = db.products.find(x => x.id === it.productId);
    const spec = pr && pr.specs.find(s => s.name === it.spec);
    if (spec) { spec.stock += it.qty; pr.stock += it.qty; pr.sales -= it.qty; }
  }
  save(); ok(res, { order });
});

route('POST', '/api/orders/:id/confirm', (req, res, p) => {
  const user = currentUser(req); if (!user) return fail(res, '请先登录', 401);
  const order = db.orders.find(o => o.id === Number(p.id) && o.userId === user.id);
  if (!order) return fail(res, '订单不存在', 404);
  if (order.status !== 'shipped') return fail(res, '当前订单不可确认收货');
  order.status = 'completed';
  order.timeline.push({ time: new Date().toISOString(), text: '已确认收货' });
  save(); ok(res, { order });
});

/* ---- 管理后台 ---- */
function adminGuard(req, res) {
  const user = currentUser(req);
  if (!user || user.role !== 'admin') { fail(res, '无管理权限', 401); return null; }
  return user;
}

route('GET', '/api/admin/overview', (req, res) => {
  if (!adminGuard(req, res)) return;
  const now = new Date();
  const dayKey = d => d.toISOString().slice(0, 10);
  const today = dayKey(now);
  const valid = db.orders.filter(o => o.status !== 'cancelled' && o.status !== 'pending');
  const todayOrders = valid.filter(o => dayKey(new Date(o.createdAt)) === today);
  const todaySales = todayOrders.reduce((s, o) => s + o.pay, 0);
  const totalSales = valid.reduce((s, o) => s + o.pay, 0);

  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const rows = valid.filter(o => dayKey(new Date(o.createdAt)) === k);
    trend.push({ date: k.slice(5), sales: round(rows.reduce((s, o) => s + o.pay, 0)), orders: rows.length });
  }
  // 补充种子订单日期之外的真实分布：若无数据保持 0

  const catSales = db.categories.map(c => {
    let amount = 0, qty = 0;
    valid.forEach(o => o.items.forEach(it => {
      const p = db.products.find(x => x.id === it.productId);
      if (p && p.catId === c.id) { amount += it.price * it.qty; qty += it.qty; }
    }));
    return { name: c.name, amount: round(amount), qty };
  });

  const top = db.products.slice().sort((a, b) => b.sales - a.sales).slice(0, 5).map(p => ({ name: p.name, sales: p.sales, stock: p.stock, img: p.img, price: p.price }));

  ok(res, {
    cards: {
      todaySales: round(todaySales), todayOrders: todayOrders.length,
      totalSales: round(totalSales), totalOrders: db.orders.length,
      pendingPay: db.orders.filter(o => o.status === 'pending').length,
      pendingShip: db.orders.filter(o => o.status === 'paid').length,
      customers: db.users.filter(u => u.role === 'user').length,
      lowStock: db.products.filter(p => p.stock < 100).length,
      products: db.products.length
    },
    trend, catSales, top,
    recent: db.orders.slice(0, 6)
  });
});

route('GET', '/api/admin/products', (req, res, p, query) => {
  if (!adminGuard(req, res)) return;
  let list = db.products.slice();
  if (query.cat) list = list.filter(x => x.catId === query.cat);
  if (query.keyword) list = list.filter(x => x.name.includes(query.keyword));
  ok(res, { list, categories: db.categories });
});

function productFromBody(b) {
  return {
    name: b.name, sub: b.sub || '', catId: b.catId, brand: b.brand || '华阳严选',
    price: Number(b.price || 0), marketPrice: Number(b.marketPrice || b.price || 0),
    stock: Number(b.stock || 0), sales: Number(b.sales || 0), img: b.img || '/images/p1.jpg',
    tags: (b.tags || []).filter(Boolean), status: b.status || 'on',
    specs: b.specs && b.specs.length ? b.specs.map(s => ({ name: s.name, price: Number(s.price), stock: Number(s.stock) })) : [{ name: '默认规格', price: Number(b.price || 0), stock: Number(b.stock || 0) }],
    params: b.params || [], detail: b.detail || []
  };
}

route('POST', '/api/admin/products', async (req, res) => {
  if (!adminGuard(req, res)) return;
  const b = await readBody(req);
  if (!b.name || !b.catId || !b.price) return fail(res, '商品名称、分类、价格为必填');
  const product = Object.assign({ id: 'p' + Date.now().toString(36), createdAt: new Date().toISOString() }, productFromBody(b));
  db.products.push(product); save(); ok(res, { product });
});

route('PUT', '/api/admin/products/:id', async (req, res, p) => {
  if (!adminGuard(req, res)) return;
  const product = db.products.find(x => x.id === p.id);
  if (!product) return fail(res, '商品不存在', 404);
  const b = await readBody(req);
  Object.assign(product, productFromBody(Object.assign({}, product, b)));
  save(); ok(res, { product });
});

route('DELETE', '/api/admin/products/:id', (req, res, p) => {
  if (!adminGuard(req, res)) return;
  const idx = db.products.findIndex(x => x.id === p.id);
  if (idx < 0) return fail(res, '商品不存在', 404);
  db.products.splice(idx, 1); save(); ok(res, {});
});

route('POST', '/api/admin/products/:id/status', async (req, res, p) => {
  if (!adminGuard(req, res)) return;
  const product = db.products.find(x => x.id === p.id);
  if (!product) return fail(res, '商品不存在', 404);
  const b = await readBody(req);
  product.status = b.status === 'off' ? 'off' : 'on';
  save(); ok(res, { product });
});

route('GET', '/api/admin/orders', (req, res, p, query) => {
  if (!adminGuard(req, res)) return;
  let list = db.orders.slice();
  if (query.status && query.status !== 'all') list = list.filter(o => o.status === query.status);
  if (query.keyword) list = list.filter(o => o.orderNo.includes(query.keyword) || (o.address && o.address.name.includes(query.keyword)));
  ok(res, { list });
});

route('POST', '/api/admin/orders/:id/ship', async (req, res, p) => {
  if (!adminGuard(req, res)) return;
  const order = db.orders.find(o => o.id === Number(p.id));
  if (!order) return fail(res, '订单不存在', 404);
  if (order.status !== 'paid') return fail(res, '仅待发货订单可发货');
  const b = await readBody(req);
  order.status = 'shipped';
  order.express = { company: b.company || '顺丰速运', no: b.no || ('SF' + Date.now()) };
  order.timeline.push({ time: new Date().toISOString(), text: `已发货：${order.express.company} ${order.express.no}` });
  save(); ok(res, { order });
});

route('POST', '/api/admin/orders/:id/status', async (req, res, p) => {
  if (!adminGuard(req, res)) return;
  const order = db.orders.find(o => o.id === Number(p.id));
  if (!order) return fail(res, '订单不存在', 404);
  const b = await readBody(req);
  const allow = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
  if (!allow.includes(b.status)) return fail(res, '状态不合法');
  order.status = b.status;
  order.timeline.push({ time: new Date().toISOString(), text: '后台修改状态为 ' + b.status });
  save(); ok(res, { order });
});

route('GET', '/api/admin/inventory', (req, res) => {
  if (!adminGuard(req, res)) return;
  const list = db.products.map(p => ({ id: p.id, name: p.name, img: p.img, stock: p.stock, sales: p.sales, status: p.status, specs: p.specs, warn: p.stock < 100 }))
    .sort((a, b) => a.stock - b.stock);
  ok(res, { list });
});

route('POST', '/api/admin/inventory/:id', async (req, res, p) => {
  if (!adminGuard(req, res)) return;
  const product = db.products.find(x => x.id === p.id);
  if (!product) return fail(res, '商品不存在', 404);
  const b = await readBody(req);
  product.stock = Number(b.stock || 0);
  if (Array.isArray(b.specs)) product.specs = b.specs.map(s => ({ name: s.name, price: Number(s.price), stock: Number(s.stock) }));
  save(); ok(res, { product });
});

route('GET', '/api/admin/coupons', (req, res) => {
  if (!adminGuard(req, res)) return;
  ok(res, { list: db.coupons });
});

route('POST', '/api/admin/coupons', async (req, res) => {
  if (!adminGuard(req, res)) return;
  const b = await readBody(req);
  const c = {
    id: 'cp' + Date.now().toString(36), name: b.name, amount: Number(b.amount || 0), min: Number(b.min || 0),
    total: Number(b.total || 100), used: 0, start: new Date().toISOString(), end: b.end || new Date(Date.now() + 30 * 864e5).toISOString()
  };
  db.coupons.push(c); save(); ok(res, { coupon: c });
});

route('DELETE', '/api/admin/coupons/:id', (req, res, p) => {
  if (!adminGuard(req, res)) return;
  db.coupons = db.coupons.filter(c => c.id !== p.id); save(); ok(res, {});
});

route('GET', '/api/admin/users', (req, res) => {
  if (!adminGuard(req, res)) return;
  const list = db.users.map(u => {
    const orders = db.orders.filter(o => o.userId === u.id && o.status !== 'cancelled');
    return { id: u.id, phone: u.phone, name: u.name, role: u.role, points: u.points, orderCount: orders.length, amount: round(orders.reduce((s, o) => s + o.pay, 0)), createdAt: u.createdAt };
  });
  ok(res, { list });
});

route('GET', '/api/admin/settings', (req, res) => {
  if (!adminGuard(req, res)) return;
  ok(res, { settings: db.settings, banners: db.banners, categories: db.categories });
});

route('PUT', '/api/admin/settings', async (req, res) => {
  if (!adminGuard(req, res)) return;
  const b = await readBody(req);
  Object.assign(db.settings, b.settings || {});
  if (Array.isArray(b.banners)) db.banners = b.banners;
  save(); ok(res, { settings: db.settings, banners: db.banners });
});

route('POST', '/api/admin/categories', async (req, res) => {
  if (!adminGuard(req, res)) return;
  const b = await readBody(req);
  if (!b.name) return fail(res, '分类名称必填');
  const c = { id: 'c' + Date.now().toString(36), name: b.name, icon: b.icon || '📦', desc: b.desc || '', sort: db.categories.length + 1 };
  db.categories.push(c); save(); ok(res, { category: c });
});

/* ------------------------------------------------------------------ 图片上传 */
const UPLOAD_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };

route('POST', '/api/admin/upload', async (req, res) => {
  if (!adminGuard(req, res)) return;
  const b = await readBody(req, 9e6);
  const m = /^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || ''));
  if (!m) return fail(res, '只支持 JPG / PNG / WebP / GIF 图片');
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length) return fail(res, '图片内容为空');
  if (buf.length > 5 * 1024 * 1024) return fail(res, '图片不能超过 5MB');
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = 'u' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex') + UPLOAD_EXT[m[1]];
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  ok(res, { url: '/images/uploads/' + name, size: buf.length });
});

/* ------------------------------------------------------------------ 静态资源 */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function serveStatic(req, res, pathname) {
  let filePath;
  if (pathname === '/' || pathname === '/index.html') filePath = path.join(PUBLIC_DIR, 'index.html');
  else if (pathname === '/admin' || pathname === '/admin.html') filePath = path.join(PUBLIC_DIR, 'admin.html');
  else filePath = path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) return fail(res, '禁止访问', 403);
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 页面不存在');
    }
    const ext = path.extname(filePath).toLowerCase();
    const cache = ['.html', '.js', '.css'].includes(ext) ? 'no-cache' : 'public, max-age=86400';
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': cache });
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ------------------------------------------------------------------ 主循环 */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname;
  if (pathname.startsWith('/api/')) {
    const query = Object.fromEntries(url.searchParams.entries());
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const params = matchPath(r.path, pathname);
      if (!params) continue;
      try { await r.handler(req, res, params, query); }
      catch (e) { console.error('[api]', pathname, e); fail(res, e.message || '服务端异常', 500); }
      return;
    }
    return fail(res, `接口不存在：${req.method} ${pathname}`, 404);
  }
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  const line = `华阳自营商城已启动\n  商城前台  http://localhost:${PORT}/\n  商家后台  http://localhost:${PORT}/admin\n  管理员    13800000000 / admin123\n  测试用户  13900000001 / 123456`;
  console.log('\n' + line + '\n');
});
