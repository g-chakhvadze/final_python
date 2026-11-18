/* =========================================================
   db.js — SQLite ბაზა (node:sqlite, დამატებითი პაკეტების გარეშე)
   სქემა იქმნება ავტომატურად, პირველივე გაშვებაზე ივსება seed.json-იდან.
   ========================================================= */

const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

const DB_PATH = path.join(__dirname, 'shop.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

/* ---------------------------------------------------------
   1. სქემა
   --------------------------------------------------------- */
db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  image TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  title       TEXT    NOT NULL,
  brand       TEXT    NOT NULL,
  category_id TEXT    NOT NULL REFERENCES categories(id),
  description TEXT,
  price       REAL    NOT NULL,
  before_price REAL   NOT NULL,
  currency    TEXT    NOT NULL DEFAULT 'USD',
  stock       INTEGER NOT NULL DEFAULT 0,
  warranty    TEXT,
  issue_date  TEXT,
  thumbnail   TEXT,
  images      TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,          -- scrypt hash
  salt       TEXT NOT NULL,
  age        INTEGER,
  address    TEXT,
  phone      TEXT,
  zipcode    TEXT,
  gender     TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS carts (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
  cart_id    TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS ratings (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  author     TEXT,                   -- ავტორის სახელი (seed მონაცემებისთვის)
  value      INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
  text       TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (product_id, user_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total      REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL,
  price      REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand    ON products(brand);
CREATE INDEX IF NOT EXISTS idx_ratings_product   ON ratings(product_id);
`);

/* ---------------------------------------------------------
   2. seed — მხოლოდ მაშინ, თუ ბაზა ცარიელია
   --------------------------------------------------------- */
function seed() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM products').get();
  if (count > 0) return false;

  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8'));

  const insCat = db.prepare('INSERT INTO categories (id, name, image) VALUES (?, ?, ?)');
  const insProd = db.prepare(`INSERT INTO products
    (id, title, brand, category_id, description, price, before_price, currency,
     stock, warranty, issue_date, thumbnail, images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insRate = db.prepare(`INSERT INTO ratings
    (id, product_id, user_id, author, value, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);

  data.categories.forEach((c) => insCat.run(c.id, c.name, c.image));

  data.products.forEach((p) => {
    const id = p._id.replace(/^local-/, '');
    insProd.run(
      id,
      p.title,
      p.brand,
      p.category.id,
      p.description,
      p.price.current,
      p.price.beforeDiscount,
      p.price.currency,
      p.stock,
      p.warranty,
      p.issueDate,
      p.thumbnail,
      JSON.stringify(p.images)
    );
    (p.ratings || []).forEach((r) =>
      insRate.run(uid(), id, r.userId, r.name || null, r.value, r.text || null, r.createdAt)
    );
  });

  return true;
}

/* ---------------------------------------------------------
   3. დამხმარეები
   --------------------------------------------------------- */
const uid = () => crypto.randomUUID();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
}

/* პროდუქტის მწკრივი → ფრონტენდის ფორმატი */
function toProduct(row, ratings = []) {
  const discount =
    row.before_price > row.price
      ? Math.round(((row.before_price - row.price) / row.before_price) * 100)
      : 0;
  const avg = ratings.length
    ? ratings.reduce((s, r) => s + r.value, 0) / ratings.length
    : 0;

  return {
    _id: row.id,
    title: row.title,
    brand: row.brand,
    description: row.description,
    issueDate: row.issue_date,
    thumbnail: row.thumbnail,
    images: JSON.parse(row.images || '[]'),
    stock: row.stock,
    warranty: row.warranty,
    rating: Math.round(avg * 10) / 10,
    price: {
      current: row.price,
      currency: row.currency,
      beforeDiscount: row.before_price,
      discountPercentage: discount,
    },
    category: { id: row.category_id, name: row.category_name, image: row.category_image },
    ratings: ratings.map((r) => ({
      userId: r.user_id,
      name: r.author || undefined,
      text: r.text || undefined,
      value: r.value,
      createdAt: r.created_at,
    })),
  };
}

module.exports = { db, seed, uid, hashPassword, verifyPassword, toProduct, DB_PATH };
