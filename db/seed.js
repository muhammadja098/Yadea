'use strict';
// Seeds db/yadea.db from the JSON data extracted from yadea.com.pk (db/data/*.json)
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'yadea.db');
const DATA = path.join(__dirname, 'data');

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8').replace(/^\uFEFF/, ''));

if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

const insertMany = (table, cols, rows) => {
  const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
  for (const r of rows) stmt.run(...cols.map(c => r[c]));
};
const Q = (sql, ...p) => db.prepare(sql).run(...p);
const G = (sql, ...p) => db.prepare(sql).get(...p);

// ---------------------------------------------------------------- categories
insertMany('categories', ['id', 'name', 'slug', 'description', 'sort_order'], [
  { id: 1, name: 'Electric Scooters', slug: 'electric-scooter', description: 'City commuter e-scooters', sort_order: 1 },
  { id: 2, name: 'Performance E-Bikes', slug: 'performance', description: 'High performance electric bikes', sort_order: 2 },
  { id: 3, name: 'Lithium Models', slug: 'lithium', description: 'Lithium Iron Phosphate battery models', sort_order: 3 }
]);

// ---------------------------------------------------------------- models + specs
const models = read('models.json');
const perf = new Set(['Yadea Keeness', 'GT70 Cyber', 'Yadea T5L', 'Yadea Velax', 'Ruibin L']);
const lithium = new Set(['Yadea T5L', 'Yadea Keeness', 'Yadea Velax', 'Yadea M3H', 'GT70 Cyber']);
for (const m of models) {
  const cat = perf.has(m.name) ? (lithium.has(m.name) ? 3 : 2) : 1;
  Q(`INSERT INTO models (category_id,name,slug,tagline,price,hero_image,gallery,short_description,description,stock_status,featured)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    cat, m.name, m.slug, m.tagline, m.price, m.hero_image, JSON.stringify(m.gallery || []),
    m.short_description, m.description, m.slug === 'yadea-g5' ? 'out-of-stock' : 'in-stock', m.featured);
  const id = G('SELECT id FROM models WHERE slug=?', m.slug).id;
  let i = 0;
  for (const [label, value] of m.specs || []) {
    Q('INSERT INTO model_specs (model_id,spec_group,label,value,sort_order) VALUES (?,?,?,?,?)',
      id, 'Specifications', label, value, i++);
  }
}

// ---------------------------------------------------------------- dealers
const dealers = read('dealers.json');
for (const d of dealers) {
  Q(`INSERT INTO dealers (name,city,address,sales_person,phone1,phone2,lat,lng,gmaps,hours,types)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    d.name, d.city, d.address, d.sales_person, d.phone1, d.phone2, d.lat, d.lng, d.gmaps, d.hours, d.types);
}

// ---------------------------------------------------------------- posts
for (const p of read('posts.json')) {
  Q(`INSERT OR IGNORE INTO posts (title,slug,excerpt,image,category,source_url,published_at)
     VALUES (?,?,?,?,?,?,?)`,
    p.title, p.slug, p.excerpt, p.image, p.category, p.url, p.date);
}

// ---------------------------------------------------------------- faqs
let fi = 0;
for (const f of read('faqs.json')) {
  Q('INSERT INTO faqs (question,answer,category,sort_order) VALUES (?,?,?,?)', f.question, f.answer, 'General', fi++);
}

// ---------------------------------------------------------------- pages
for (const p of read('pages.json')) {
  Q('INSERT OR IGNORE INTO pages (slug,title,body) VALUES (?,?,?)', p.slug, p.title, p.body);
}

// ---------------------------------------------------------------- impact stats
const home = read('home.json');
let si = 0;
for (const [value, label] of home.impact) Q('INSERT INTO impact_stats (value,label,sort_order) VALUES (?,?,?)', value, label, si++);

// ---------------------------------------------------------------- settings
const settings = {
  site_name: 'Yadea Pakistan: Shop Online EV Bikes & Electric Scooty',
  site_tagline: 'Best Electric Scooter | Electric Bikes in Pakistan',
  phone: '021-111-300-375',
  email: 'hello@yadea.com.pk',
  whatsapp: '021-111-300-375',
  address: 'Eiffel Industries Ltd., Karachi, Pakistan',
  facebook: 'https://www.facebook.com/yadeapakistan',
  instagram: 'https://www.instagram.com/yadeapakistan',
  youtube: 'https://www.youtube.com/@yadeapakistan',
  linkedin: 'https://www.linkedin.com/company/yadea',
  tiktok: 'https://www.tiktok.com/@yadeapakistan',
  shipping_fee: '5000',
  free_shipping_over: '0',
  currency: 'PKR',
  admin_password: 'yadea123'
};
for (const [k, v] of Object.entries(settings)) Q('INSERT INTO settings (key,value) VALUES (?,?)', k, String(v));

// ---------------------------------------------------------------- sample data
Q(`INSERT INTO leads (type,name,phone,email,city,model_name,message,status) VALUES (?,?,?,?,?,?,?,?)`,
  'test_drive', 'Ahmed Raza', '03001234567', 'ahmed@example.com', 'Lahore', 'Yadea T5L', 'Interested in a weekend test ride.', 'new');
Q(`INSERT INTO leads (type,name,phone,email,city,message,status) VALUES (?,?,?,?,?,?,?)`,
  'contact', 'Sara Khan', '03211234567', 'sara@example.com', 'Karachi', 'Do you offer 0% markup installments?', 'contacted');
Q(`INSERT INTO leads (type,name,email,message,status) VALUES (?,?,?,?,?)`,
  'newsletter', 'Bilal', 'bilal@example.com', 'Please share new model launches.', 'closed');

Q(`INSERT INTO orders (reference,customer_name,phone,email,address,city,subtotal,shipping,total,payment_method,status)
   VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  'YD-2026-0001', 'Hamza Ali', '03331234567', 'hamza@example.com', 'House 12, Gulberg III', 'Lahore', 305000, 0, 305000, 'cod', 'confirmed');
const oid = G('SELECT id FROM orders WHERE reference=?', 'YD-2026-0001').id;
const t5l = G('SELECT id,name,slug,price FROM models WHERE slug=?', 'yadea-t5l');
Q('INSERT INTO order_items (order_id,model_id,name,slug,price,qty,total) VALUES (?,?,?,?,?,?,?)',
  oid, t5l.id, t5l.name, t5l.slug, t5l.price, 1, t5l.price);

console.log(`Seeded ${DB_PATH}`);
console.log('  models:', models.length, '| dealers:', dealers.length, '| posts:', read('posts.json').length,
  '| faqs:', read('faqs.json').length, '| pages:', read('pages.json').length);
