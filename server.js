'use strict';
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const db = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));

/* ------------------------------------------------------------------ utils */
const settingsCache = {};
function settings() {
  if (settingsCache._loaded) return settingsCache;
  for (const r of db.all('SELECT key, value FROM settings')) settingsCache[r.key] = r.value;
  settingsCache._loaded = true;
  return settingsCache;
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
const sign = (s) => crypto.createHmac('sha256', 'yadea-clone-secret').update(s).digest('hex').slice(0, 16);

function getCart(req) {
  const raw = parseCookies(req).cart;
  if (!raw) return [];
  try {
    const [data, mac] = raw.split('.');
    if (sign(data) !== mac) return [];
    const items = JSON.parse(Buffer.from(data, 'base64').toString());
    return items.map(i => {
      const m = db.one('SELECT id,name,slug,price,hero_image,stock_status FROM models WHERE slug=?', i.slug);
      return m ? { ...m, qty: i.qty } : null;
    }).filter(Boolean);
  } catch { return []; }
}
function setCart(res, items) {
  const clean = items.filter(i => i.qty > 0).map(i => ({ slug: i.slug, qty: Math.min(i.qty, 10) }));
  const data = Buffer.from(JSON.stringify(clean)).toString('base64');
  res.setHeader('Set-Cookie', `cart=${data}.${sign(data)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`);
}
function cartCount(req) { return getCart(req).reduce((n, i) => n + i.qty, 0); }
function money(n) { return 'PKR ' + Number(n || 0).toLocaleString('en-PK'); }
function fmtDate(d) { return d || ''; }

const modelRows = (where = '', ...params) =>
  db.all(`SELECT m.*, c.name AS category FROM models m LEFT JOIN categories c ON c.id=m.category_id ${where}`, ...params);

let navCache = null;
app.use((req, res, next) => {
  if (!navCache) navCache = modelRows('ORDER BY m.featured DESC, m.price DESC');
  res.locals = {
    site: settings(),
    cartCount: cartCount(req),
    path: req.path,
    money,
    fmtDate,
    navModels: navCache,
    models: [],
    year: new Date().getFullYear()
  };
  if (settings().admin_token && parseCookies(req).admin === settings().admin_token) res.locals.isAdmin = true;
  next();
});

const withSpecs = (m) => {
  m.specs = db.all('SELECT label, value FROM model_specs WHERE model_id=? ORDER BY sort_order', m.id);
  m.gallery = JSON.parse(m.gallery || '[]');
  return m;
};

/* ------------------------------------------------------------------ HOME */
const HOME_DATA = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'db', 'data', 'home.json'), 'utf8').replace(/^﻿/, ''));

const LATEST_TABS = [
  { slug: 'yadea-gt70-cyber-electric-scooter-e-bike', tab: 'GT70' },
  { slug: 'yadea-ruibin-l-electric-scooter-e-bike', tab: 'Ruibin L' },
  { slug: 'yadea-t5l', tab: 'Yadea T5L' },
  { slug: 'yadea-velax', tab: 'Yadea Velax' },
  { slug: 'yadea-keeness', tab: 'Yadea Keeness' }
];
const GT70_SPECS = [
  '2TTFAR Smart Drive System',
  '2,000W High-Torque Motor',
  '72V 50Ah Lithium Iron Phosphate (LFP) Battery',
  'Front and Rear Disc Brakes',
  '90/90-12 Front & 100/80-12 Rear Tires',
  'Energy-Retrieving Controller',
  'Smart Keyless Unlocking & Anti-Theft System'
];

const POPULAR_TABS = [
  { slug: 'yadea-gt70-cyber-electric-scooter-e-bike', tab: 'GT70' },
  { slug: 'yadea-ruibin-l-electric-scooter-e-bike', tab: 'Ruibin L' },
  { slug: 'yadea-t5l', tab: 'Yadea T5L' }
];

app.get('/', (req, res) => {
  const all = modelRows('ORDER BY m.featured DESC, m.price DESC');
  const featured = all.filter(m => m.featured);
  const latest = LATEST_TABS.map(t => {
    const m = db.one('SELECT m.*, c.name AS category FROM models m LEFT JOIN categories c ON c.id=m.category_id WHERE m.slug=?', t.slug);
    if (!m) return null;
    withSpecs(m);
    m.tab = t.tab;
    m.specList = m.slug === 'yadea-gt70-cyber-electric-scooter-e-bike'
      ? GT70_SPECS
      : m.specs.map(s => s.label + ': ' + s.value);
    return m;
  }).filter(Boolean);
  const posts = db.all("SELECT * FROM posts WHERE status='published' ORDER BY id DESC LIMIT 6");
  const stats = db.all('SELECT * FROM impact_stats ORDER BY sort_order');
  const popular = POPULAR_TABS.map(t => {
    const m = db.one('SELECT slug, price, hero_image FROM models WHERE slug=?', t.slug);
    return m ? { tab: t.tab, name: t.tab, slug: m.slug, image: m.hero_image, price: m.price } : null;
  }).filter(Boolean);
  res.render('home', { title: 'Best Electric Scooter | Electric Bikes in Pakistan - YADEA', models: all, latest, popular, featured, posts, stats, H: HOME_DATA });
});

/* ------------------------------------------------------------------ CATALOG */
app.get(['/products', '/shop'], (req, res) => {
  const cats = db.all('SELECT * FROM categories ORDER BY sort_order');
  const q = (req.query.q || '').trim();
  const cat = req.query.category || '';
  let sql = 'SELECT m.*, c.name AS category FROM models m LEFT JOIN categories c ON c.id=m.category_id WHERE 1=1';
  const params = [];
  if (q) { sql += ' AND (m.name LIKE ? OR m.tagline LIKE ?)'; params.push('%' + q + '%', '%' + q + '%'); }
  if (cat) { sql += ' AND c.slug = ?'; params.push(cat); }
  const sort = req.query.sort || 'featured';
  sql += sort === 'price_asc' ? ' ORDER BY m.price ASC' : sort === 'price_desc' ? ' ORDER BY m.price DESC' : sort === 'name' ? ' ORDER BY m.name ASC' : ' ORDER BY m.featured DESC, m.price DESC';
  const models = db.all(sql, ...params);
  res.render('shop', { title: 'Products - Yadea Pakistan', models, cats, q, cat, sort });
});

/* ------------------------------------------------------------------ MODEL DETAIL */
app.get('/models/:slug', (req, res, next) => {
  const m = db.one('SELECT m.*, c.name AS category, c.slug AS category_slug FROM models m LEFT JOIN categories c ON c.id=m.category_id WHERE m.slug=?', req.params.slug);
  if (!m) return next();
  db.run('UPDATE models SET views = views + 1 WHERE id=?', m.id);
  withSpecs(m);
  const related = modelRows('WHERE m.id != ? ORDER BY m.featured DESC, RANDOM() LIMIT 4', m.id);
  const dealers = db.all('SELECT * FROM dealers WHERE active=1 ORDER BY city LIMIT 8');
  res.render('product', { title: `${m.name} Price in Pakistan - ${money(m.price)} | YADEA`, m, related, dealers, models: related });
});

/* ------------------------------------------------------------------ PAGES */
const staticPages = {
  '/about-us': 'about-us',
  '/contact-us': 'contact-us',
  '/faq': null,
  '/find-a-dealer': null,
  '/news-events': null,
  '/become-a-dealer': 'become-a-dealer',
  '/test-drive': 'test-drive',
  '/product-support': 'product-support',
  '/service-support': 'service-support',
  '/terms-and-conditions': 'terms-and-conditions',
  '/privacy-policy': 'privacy-policy',
  '/refund_returns': 'refund_returns',
  '/govt-page': 'govt-page'
};

app.get('/about-us', (req, res) => {
  const p = db.one('SELECT * FROM pages WHERE slug=?', 'about-us');
  res.render('about', { title: 'About Yadea Pakistan', page: p, models: modelRows('WHERE featured=1') });
});

app.get('/faq', (req, res) => {
  const faqs = db.all('SELECT * FROM faqs ORDER BY sort_order');
  res.render('faq', { title: 'Yadea FAQ Pakistan | Warranty Support & Dealer Assistance', faqs });
});

app.get('/find-a-dealer', (req, res) => {
  const dealers = db.all('SELECT * FROM dealers WHERE active=1 ORDER BY city, name');
  const cities = [...new Set(dealers.map(d => d.city).filter(Boolean))].sort();
  res.render('dealers', { title: 'Yadea Dealer in Pakistan | Find a Showroom', dealers, cities });
});

app.get('/news-events', (req, res) => {
  const cat = req.query.category || '';
  const q = (req.query.q || '').trim();
  let sql = "SELECT * FROM posts WHERE status='published'";
  const params = [];
  if (cat) { sql += ' AND category=?'; params.push(cat); }
  if (q) { sql += ' AND title LIKE ?'; params.push('%' + q + '%'); }
  sql += ' ORDER BY id DESC';
  const posts = db.all(sql, ...params);
  const cats = db.all('SELECT category, COUNT(*) n FROM posts GROUP BY category');
  res.render('news', { title: 'News & Events - Yadea Pakistan', posts, cats, cat, q });
});

app.get('/news-events/:slug', (req, res, next) => {
  const post = db.one('SELECT * FROM posts WHERE slug=?', req.params.slug);
  if (!post) return next();
  const more = db.all('SELECT * FROM posts WHERE id != ? ORDER BY id DESC LIMIT 4', post.id);
  res.render('post', { title: post.title + ' | Yadea Pakistan', post, more });
});

app.get('/become-a-dealer', (req, res) => {
  const p = db.one('SELECT * FROM pages WHERE slug=?', 'become-a-dealer');
  res.render('dealer-form', { title: 'Become a Dealer - Yadea Pakistan', page: p });
});
app.get('/test-drive', (req, res) => {
  const models = modelRows('ORDER BY name');
  res.render('test-drive', { title: 'Book a Test Ride - Yadea Pakistan', models });
});
app.get('/contact-us', (req, res) => {
  res.render('contact', { title: 'Contact Us - Yadea Pakistan' });
});
['/product-support', '/service-support', '/terms-and-conditions', '/privacy-policy', '/refund_returns', '/govt-page'].forEach(route => {
  app.get(route, (req, res, next) => {
    const slug = route.slice(1);
    const p = db.one('SELECT * FROM pages WHERE slug=?', slug);
    if (!p) return next();
    res.render('page', { title: p.title + ' | Yadea Pakistan', page: p });
  });
});

/* ------------------------------------------------------------------ LEADS (forms) */
function saveLead(req, res, type, redirect) {
  const b = req.body || {};
  db.run(`INSERT INTO leads (type,name,phone,email,city,model_name,message,ip) VALUES (?,?,?,?,?,?,?,?)`,
    type, (b.name || '').slice(0, 120), (b.phone || '').slice(0, 40), (b.email || '').slice(0, 120),
    (b.city || '').slice(0, 80), (b.model || '').slice(0, 120), (b.message || '').slice(0, 2000),
    req.ip || '');
  res.redirect(redirect + '?sent=1');
}
app.post('/test-drive', (req, res) => saveLead(req, res, 'test_drive', '/test-drive'));
app.post('/contact-us', (req, res) => saveLead(req, res, 'contact', '/contact-us'));
app.post('/become-a-dealer', (req, res) => saveLead(req, res, 'dealer_enquiry', '/become-a-dealer'));
app.post('/newsletter', (req, res) => saveLead(req, res, 'newsletter', req.body.redirect || '/'));
app.post('/product-support', (req, res) => saveLead(req, res, 'support', '/product-support'));

/* ------------------------------------------------------------------ CART */
app.get('/cart', (req, res) => {
  const items = getCart(req);
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  res.render('cart', { title: 'Your Cart - Yadea Pakistan', items, subtotal, shipping: 0 });
});
app.post('/cart/add', (req, res) => {
  const items = getCart(req);
  const slug = req.body.slug;
  const m = db.one('SELECT slug FROM models WHERE slug=?', slug);
  if (m) {
    const ex = items.find(i => i.slug === slug);
    if (ex) ex.qty += 1; else items.push({ slug, price: 0, qty: 1 });
  }
  setCart(res, items);
  if (req.body.redirect) return res.redirect(req.body.redirect);
  res.redirect('/cart');
});
app.post('/cart/update', (req, res) => {
  const items = getCart(req);
  for (const it of items) { const q = parseInt(req.body['qty_' + it.slug], 10); if (!isNaN(q)) it.qty = q; }
  setCart(res, items);
  res.redirect('/cart');
});
app.post('/cart/remove', (req, res) => {
  setCart(res, getCart(req).filter(i => i.slug !== req.body.slug));
  res.redirect('/cart');
});

app.get('/checkout', (req, res) => {
  const items = getCart(req);
  if (!items.length) return res.redirect('/shop');
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  res.render('checkout', { title: 'Checkout - Yadea Pakistan', items, subtotal });
});
app.post('/checkout', (req, res) => {
  const items = getCart(req);
  if (!items.length) return res.redirect('/shop');
  const b = req.body;
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const shipping = 0;
  const ref = 'YD-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
  const info = db.run(`INSERT INTO orders (reference,customer_name,phone,email,address,city,note,subtotal,shipping,total,payment_method)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ref, b.name || '', b.phone || '', b.email || '', b.address || '', b.city || '', b.note || '',
    subtotal, shipping, subtotal + shipping, b.payment || 'cod');
  const oid = Number(info.lastInsertRowid);
  for (const it of items) {
    db.run('INSERT INTO order_items (order_id,model_id,name,slug,price,qty,total) VALUES (?,?,?,?,?,?,?)',
      oid, it.id, it.name, it.slug, it.price, it.qty, it.price * it.qty);
  }
  setCart(res, []);
  res.redirect('/order/' + ref);
});
app.get('/order/:ref', (req, res, next) => {
  const order = db.one('SELECT * FROM orders WHERE reference=?', req.params.ref);
  if (!order) return next();
  order.items = db.all('SELECT * FROM order_items WHERE order_id=?', order.id);
  res.render('order', { title: 'Order ' + order.reference + ' - Yadea Pakistan', order });
});

/* ------------------------------------------------------------------ JSON API */
app.get('/api/models', (req, res) => {
  const models = modelRows('ORDER BY m.name').map(m => ({ ...m, gallery: JSON.parse(m.gallery || '[]'), specs: db.all('SELECT label,value FROM model_specs WHERE model_id=? ORDER BY sort_order', m.id) }));
  res.json({ count: models.length, models });
});
app.get('/api/models/:slug', (req, res) => {
  const m = db.one('SELECT * FROM models WHERE slug=?', req.params.slug);
  if (!m) return res.status(404).json({ error: 'not found' });
  withSpecs(m);
  res.json(m);
});
app.get('/api/dealers', (req, res) => {
  const dealers = db.all('SELECT * FROM dealers WHERE active=1' + (req.query.city ? ' AND city=?' : ''), ...(req.query.city ? [req.query.city] : []));
  res.json({ count: dealers.length, dealers });
});
app.get('/api/faqs', (req, res) => res.json(db.all('SELECT * FROM faqs ORDER BY sort_order')));
app.get('/api/stats', (req, res) => res.json(db.all('SELECT * FROM impact_stats ORDER BY sort_order')));

/* ------------------------------------------------------------------ ADMIN */
function requireAdmin(req, res, next) {
  if (res.locals.isAdmin) return next();
  res.redirect('/admin/login');
}
app.get('/admin/login', (req, res) => res.render('admin/login', { title: 'Admin Login', layout: false }));
app.post('/admin/login', (req, res) => {
  if (req.body.password === settings().admin_password) {
    const token = crypto.randomBytes(16).toString('hex');
    settingsCache.admin_token = token;
    db.run('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)', 'admin_token', token);
    res.setHeader('Set-Cookie', `admin=${token}; Path=/; HttpOnly; SameSite=Lax`);
    return res.redirect('/admin');
  }
  res.redirect('/admin/login?error=1');
});
app.get('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'admin=; Path=/; Max-Age=0');
  res.redirect('/admin/login');
});
app.get('/admin', requireAdmin, (req, res) => {
  const stats = {
    models: db.one('SELECT COUNT(*) n FROM models').n,
    dealers: db.one('SELECT COUNT(*) n FROM dealers').n,
    leads: db.one('SELECT COUNT(*) n FROM leads').n,
    newLeads: db.one("SELECT COUNT(*) n FROM leads WHERE status='new'").n,
    orders: db.one('SELECT COUNT(*) n FROM orders').n,
    revenue: db.one("SELECT COALESCE(SUM(total),0) n FROM orders WHERE status!='cancelled'").n,
    posts: db.one('SELECT COUNT(*) n FROM posts').n
  };
  const leads = db.all('SELECT * FROM leads ORDER BY id DESC LIMIT 8');
  const orders = db.all('SELECT * FROM orders ORDER BY id DESC LIMIT 8');
  res.render('admin/dashboard', { title: 'Admin Dashboard', stats, leads, orders });
});
app.get('/admin/leads', requireAdmin, (req, res) => {
  const type = req.query.type || '';
  const leads = db.all('SELECT * FROM leads' + (type ? ' WHERE type=?' : '') + ' ORDER BY id DESC', ...(type ? [type] : []));
  res.render('admin/leads', { title: 'Leads', leads, type });
});
app.post('/admin/leads/:id/status', requireAdmin, (req, res) => {
  db.run('UPDATE leads SET status=? WHERE id=?', req.body.status, req.params.id);
  res.redirect(req.get('referer') || '/admin/leads');
});
app.get('/admin/orders', requireAdmin, (req, res) => {
  const orders = db.all('SELECT * FROM orders ORDER BY id DESC');
  for (const o of orders) o.items = db.all('SELECT * FROM order_items WHERE order_id=?', o.id);
  res.render('admin/orders', { title: 'Orders', orders });
});
app.post('/admin/orders/:id/status', requireAdmin, (req, res) => {
  db.run('UPDATE orders SET status=? WHERE id=?', req.body.status, req.params.id);
  res.redirect('/admin/orders');
});
app.get('/admin/models', requireAdmin, (req, res) => {
  const models = modelRows('ORDER BY m.name');
  res.render('admin/models', { title: 'Models', models });
});
app.post('/admin/models/:id', requireAdmin, (req, res) => {
  db.run('UPDATE models SET price=?, stock_status=?, featured=? WHERE id=?',
    parseInt(req.body.price, 10) || 0, req.body.stock_status, req.body.featured ? 1 : 0, req.params.id);
  res.redirect('/admin/models');
});
app.get('/admin/dealers', requireAdmin, (req, res) => {
  const dealers = db.all('SELECT * FROM dealers ORDER BY city');
  res.render('admin/dealers', { title: 'Dealers', dealers });
});

/* ------------------------------------------------------------------ LEGACY model-slug routes */
app.get('/:slug', (req, res, next) => {
  const m = db.one('SELECT slug FROM models WHERE slug=?', req.params.slug);
  if (m) return res.redirect('/models/' + m.slug);
  next();
});

/* ------------------------------------------------------------------ 404 */
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found - Yadea Pakistan' });
});

app.listen(PORT, () => console.log(`Yadea clone running: http://localhost:${PORT}`));
