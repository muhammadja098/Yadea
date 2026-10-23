-- ============================================================
--  Yadea Pakistan - Website Clone Database Schema (SQLite)
-- ============================================================
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS model_specs;
DROP TABLE IF EXISTS models;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS dealers;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS pages;
DROP TABLE IF EXISTS impact_stats;
DROP TABLE IF EXISTS settings;

-- ---------------------------------------------------------- settings
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------- categories
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  sort_order  INTEGER DEFAULT 0
);

-- ---------------------------------------------------------- models (scooters)
CREATE TABLE models (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  tagline           TEXT DEFAULT '',
  price             INTEGER DEFAULT 0,          -- PKR, 0 = price on request
  old_price         INTEGER DEFAULT 0,
  battery_type      TEXT DEFAULT 'Lithium Iron Phosphate (LFP)',
  hero_image        TEXT DEFAULT '',
  gallery           TEXT DEFAULT '[]',          -- JSON array of image urls
  short_description TEXT DEFAULT '',
  description       TEXT DEFAULT '',
  stock_status      TEXT DEFAULT 'in-stock',    -- in-stock | out-of-stock | pre-order
  featured          INTEGER DEFAULT 0,
  views             INTEGER DEFAULT 0,
  created_at        TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_models_slug ON models(slug);
CREATE INDEX idx_models_featured ON models(featured);

-- ---------------------------------------------------------- model_specs
CREATE TABLE model_specs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id    INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  spec_group  TEXT DEFAULT 'General',
  label       TEXT NOT NULL,
  value       TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0
);
CREATE INDEX idx_specs_model ON model_specs(model_id);

-- ---------------------------------------------------------- dealers
CREATE TABLE dealers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  city         TEXT DEFAULT '',
  address      TEXT DEFAULT '',
  sales_person TEXT DEFAULT '',
  phone1       TEXT DEFAULT '',
  phone2       TEXT DEFAULT '',
  email        TEXT DEFAULT '',
  lat          REAL,
  lng          REAL,
  gmaps        TEXT DEFAULT '',
  hours        TEXT DEFAULT '',
  types        TEXT DEFAULT 'showroom',
  active       INTEGER DEFAULT 1
);
CREATE INDEX idx_dealers_city ON dealers(city);

-- ---------------------------------------------------------- posts (news & events)
CREATE TABLE posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  excerpt      TEXT DEFAULT '',
  body         TEXT DEFAULT '',
  image        TEXT DEFAULT '',
  category     TEXT DEFAULT 'blogs',
  source_url   TEXT DEFAULT '',
  published_at TEXT DEFAULT '',
  status       TEXT DEFAULT 'published'
);
CREATE INDEX idx_posts_category ON posts(category);

-- ---------------------------------------------------------- faqs
CREATE TABLE faqs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  category   TEXT DEFAULT 'General',
  sort_order INTEGER DEFAULT 0
);

-- ---------------------------------------------------------- pages (static content)
CREATE TABLE pages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  body       TEXT DEFAULT '',
  meta_desc  TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------- impact stats
CREATE TABLE impact_stats (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  value   TEXT NOT NULL,
  label   TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- ---------------------------------------------------------- leads (forms)
CREATE TABLE leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL,        -- test_drive | contact | dealer_enquiry | newsletter | service | support
  name       TEXT DEFAULT '',
  phone      TEXT DEFAULT '',
  email      TEXT DEFAULT '',
  city       TEXT DEFAULT '',
  model_id   INTEGER REFERENCES models(id) ON DELETE SET NULL,
  model_name TEXT DEFAULT '',
  message    TEXT DEFAULT '',
  status     TEXT DEFAULT 'new',   -- new | contacted | closed
  ip         TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_leads_type ON leads(type);
CREATE INDEX idx_leads_status ON leads(status);

-- ---------------------------------------------------------- orders
CREATE TABLE orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  reference      TEXT NOT NULL UNIQUE,
  customer_name  TEXT NOT NULL,
  phone          TEXT NOT NULL,
  email          TEXT DEFAULT '',
  address        TEXT DEFAULT '',
  city           TEXT DEFAULT '',
  note           TEXT DEFAULT '',
  subtotal       INTEGER DEFAULT 0,
  shipping       INTEGER DEFAULT 0,
  total          INTEGER DEFAULT 0,
  payment_method TEXT DEFAULT 'cod',
  status         TEXT DEFAULT 'pending',   -- pending | confirmed | dispatched | delivered | cancelled
  created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  model_id   INTEGER REFERENCES models(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  slug       TEXT DEFAULT '',
  price      INTEGER DEFAULT 0,
  qty        INTEGER DEFAULT 1,
  total      INTEGER DEFAULT 0
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
