/* =========================================================
   server.js — ბექენდი ონლაინ მაღაზიისთვის
   • Node.js-ის ჩაშენებული http + node:sqlite (npm install არ სჭირდება)
   • გასცემს როგორც API-ს, ისე თავად საიტს (იგივე origin → CORS პრობლემა არ არის)

   გაშვება:  node server/server.js      →  http://localhost:3000
   ========================================================= */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { db, seed, uid, hashPassword, verifyPassword, toProduct } = require('./db');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.join(__dirname, '..'); // საიტის ფაილები

/* ---------------------------------------------------------
   SQL
   --------------------------------------------------------- */
const PRODUCT_SELECT = `
  SELECT p.id, p.title, p.brand, p.category_id, p.description, p.price, p.before_price,
         p.currency, p.stock, p.warranty, p.issue_date, p.thumbnail, p.images,
         c.name AS category_name, c.image AS category_image,
         IFNULL((SELECT AVG(value) FROM ratings WHERE product_id = p.id), 0) AS avg_rating
  FROM products p
  JOIN categories c ON c.id = p.category_id`;

const SORT_COLUMNS = { price: 'p.price', rating: 'avg_rating', title: 'p.title' };

/** ნივთების ძიება ფილტრებით — აბრუნებს API-ის ფორმატს */
function searchProducts(q = {}) {
  const where = [];
  const params = [];

  if (q.keywords) {
    where.push('(LOWER(p.title) LIKE ? OR LOWER(p.brand) LIKE ? OR LOWER(p.description) LIKE ?)');
    const like = `%${String(q.keywords).toLowerCase()}%`;
    params.push(like, like, like);
  }
  if (q.category_id) { where.push('p.category_id = ?'); params.push(q.category_id); }
  if (q.brand)       { where.push('p.brand = ?');       params.push(q.brand); }
  if (q.price_min)   { where.push('p.price >= ?');      params.push(Number(q.price_min)); }
  if (q.price_max)   { where.push('p.price <= ?');      params.push(Number(q.price_max)); }
  if (q.rating)      { where.push('avg_rating >= ?');   params.push(Number(q.rating)); }

  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

  const column = SORT_COLUMNS[q.sort_by];
  const direction = String(q.sort_direction).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const orderSql = column ? ` ORDER BY ${column} ${direction}` : ' ORDER BY p.title ASC';

  const pageSize = Math.min(Number(q.page_size) || 12, 100);
  const pageIndex = Math.max(Number(q.page_index) || 0, 0);

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM (${PRODUCT_SELECT}${whereSql})`)
    .get(...params).n;

  const rows = db
    .prepare(`${PRODUCT_SELECT}${whereSql}${orderSql} LIMIT ? OFFSET ?`)
    .all(...params, pageSize, pageIndex * pageSize);

  return {
    products: rows.map((row) => toProduct(row, ratingsFor(row.id))),
    total,
    limit: pageSize,
    skip: pageIndex * pageSize,
    page: pageIndex,
  };
}

const ratingsFor = (productId) =>
  db.prepare('SELECT * FROM ratings WHERE product_id = ? ORDER BY created_at DESC').all(productId);

function productById(id) {
  const row = db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(id);
  return row ? toProduct(row, ratingsFor(id)) : null;
}

/* ---------------------------------------------------------
   კალათა
   --------------------------------------------------------- */
function cartOf(userId, create = false) {
  let cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  if (!cart && create) {
    const id = uid();
    db.prepare('INSERT INTO carts (id, user_id, created_at) VALUES (?, ?, ?)')
      .run(id, userId, new Date().toISOString());
    cart = db.prepare('SELECT * FROM carts WHERE id = ?').get(id);
  }
  return cart;
}

function cartPayload(userId) {
  const cart = cartOf(userId);
  if (!cart) return { products: [], total: { price: { current: 0, beforeDiscount: 0 }, quantity: 0, products: 0 } };

  const rows = db
    .prepare(
      `SELECT ci.product_id, ci.quantity, p.price, p.before_price
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = ?`
    )
    .all(cart.id);

  const products = rows.map((r) => ({
    productId: r.product_id,
    quantity: r.quantity,
    pricePerQuantity: r.price,
    beforeDiscountPrice: r.before_price,
  }));

  const current = products.reduce((s, p) => s + p.pricePerQuantity * p.quantity, 0);
  const before = products.reduce((s, p) => s + p.beforeDiscountPrice * p.quantity, 0);

  return {
    _id: cart.id,
    products,
    total: {
      price: { current: round2(current), beforeDiscount: round2(before) },
      quantity: products.reduce((s, p) => s + p.quantity, 0),
      products: products.length,
    },
  };
}

const round2 = (n) => Math.round(n * 100) / 100;

/* ---------------------------------------------------------
   ავტორიზაცია
   --------------------------------------------------------- */
function userFromRequest(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(header.slice(7));
  if (!session) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) || null;
}

const publicUser = (u) => ({
  _id: u.id,
  firstName: u.first_name,
  lastName: u.last_name,
  email: u.email,
  age: u.age,
  address: u.address,
  phone: u.phone,
  zipcode: u.zipcode,
  gender: u.gender,
  createdAt: u.created_at,
});

/* ---------------------------------------------------------
   HTTP დამხმარეები
   --------------------------------------------------------- */
function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  });
  res.end(data);
}

const fail = (res, status, message) => sendJson(res, status, { statusCode: status, message });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) reject(new Error('body too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

/** სტატიკური ფაილები — საიტი იმავე სერვერიდან */
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const file = path.normalize(path.join(ROOT, rel));

  // გზიდან გასვლის დაცვა (../../etc/passwd)
  if (!file.startsWith(ROOT)) return fail(res, 403, 'Forbidden');
  // ბაზა და სერვერის კოდი გარედან არ გაიცემა
  if (file.startsWith(path.join(ROOT, 'server'))) return fail(res, 403, 'Forbidden');

  fs.readFile(file, (err, data) => {
    if (err) return fail(res, 404, 'Not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

/* ---------------------------------------------------------
   მარშრუტები
   --------------------------------------------------------- */
async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;
  const method = req.method;
  const query = Object.fromEntries(searchParams);

  /* ---- ნივთები ---- */
  if (method === 'GET' && pathname === '/shop/products/all') {
    return sendJson(res, 200, searchProducts(query));
  }

  if (method === 'GET' && pathname === '/shop/products/search') {
    return sendJson(res, 200, searchProducts(query));
  }

  if (method === 'GET' && pathname.startsWith('/shop/products/id/')) {
    const product = productById(pathname.split('/').pop());
    return product ? sendJson(res, 200, product) : fail(res, 404, 'ასეთი ნივთი ვერ მოიძებნა');
  }

  if (method === 'GET' && pathname === '/shop/products/categories') {
    const rows = db
      .prepare(
        `SELECT c.id, c.name, c.image, COUNT(p.id) AS count
         FROM categories c LEFT JOIN products p ON p.category_id = c.id
         GROUP BY c.id ORDER BY c.name`
      )
      .all();
    return sendJson(res, 200, rows);
  }

  if (method === 'GET' && pathname === '/shop/products/brands') {
    const categoryId = query.category_id;
    const rows = categoryId
      ? db.prepare('SELECT brand AS name, COUNT(*) AS count FROM products WHERE category_id = ? GROUP BY brand ORDER BY brand').all(categoryId)
      : db.prepare('SELECT brand AS name, COUNT(*) AS count FROM products GROUP BY brand ORDER BY brand').all();
    return sendJson(res, 200, rows);
  }

  /* ---- შეფასება ---- */
  if (method === 'POST' && pathname === '/shop/products/rate') {
    const user = userFromRequest(req);
    if (!user) return fail(res, 401, 'საჭიროა ავტორიზაცია');

    const { productId, rate, text } = await readBody(req);
    const value = Number(rate);
    if (!productId || !(value >= 1 && value <= 5)) return fail(res, 400, 'არასწორი მონაცემები');
    if (!productById(productId)) return fail(res, 404, 'ასეთი ნივთი ვერ მოიძებნა');

    db.prepare(
      `INSERT INTO ratings (id, product_id, user_id, author, value, text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (product_id, user_id)
       DO UPDATE SET value = excluded.value, text = excluded.text, created_at = excluded.created_at`
    ).run(
      uid(),
      productId,
      user.id,
      `${user.first_name} ${user.last_name}`.trim(),
      value,
      text || null,
      new Date().toISOString()
    );

    return sendJson(res, 200, productById(productId));
  }

  /* ---- კალათა ---- */
  if (pathname === '/shop/cart' || pathname === '/shop/cart/product' || pathname === '/shop/cart/checkout') {
    const user = userFromRequest(req);
    if (!user) return fail(res, 401, 'საჭიროა ავტორიზაცია');

    if (method === 'GET' && pathname === '/shop/cart') {
      const cart = cartOf(user.id);
      if (!cart) return fail(res, 404, 'კალათა ცარიელია');
      return sendJson(res, 200, cartPayload(user.id));
    }

    if (method === 'DELETE' && pathname === '/shop/cart') {
      const cart = cartOf(user.id);
      if (cart) db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
      return sendJson(res, 200, cartPayload(user.id));
    }

    if (pathname === '/shop/cart/product' && ['POST', 'PATCH', 'DELETE'].includes(method)) {
      const { id, quantity } = await readBody(req);
      const product = id && db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!product) return fail(res, 404, 'ასეთი ნივთი ვერ მოიძებნა');

      if (method === 'DELETE') {
        const cart = cartOf(user.id);
        if (cart) db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').run(cart.id, id);
        return sendJson(res, 200, cartPayload(user.id));
      }

      const qty = Number(quantity) || 1;
      if (qty < 1) return fail(res, 400, 'რაოდენობა უნდა იყოს 1 ან მეტი');
      if (qty > product.stock) return fail(res, 400, `მარაგშია მხოლოდ ${product.stock} ცალი`);

      const cart = cartOf(user.id, true);
      const exists = db
        .prepare('SELECT 1 FROM cart_items WHERE cart_id = ? AND product_id = ?')
        .get(cart.id, id);

      if (method === 'POST' && exists) return fail(res, 400, 'ნივთი უკვე კალათაშია — გამოიყენეთ PATCH');

      db.prepare(
        `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)
         ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = excluded.quantity`
      ).run(cart.id, id, qty);

      return sendJson(res, 200, cartPayload(user.id));
    }

    if (method === 'POST' && pathname === '/shop/cart/checkout') {
      const payload = cartPayload(user.id);
      if (!payload.products.length) return fail(res, 400, 'კალათა ცარიელია');

      const orderId = uid();
      db.prepare('INSERT INTO orders (id, user_id, total, created_at) VALUES (?, ?, ?, ?)')
        .run(orderId, user.id, payload.total.price.current, new Date().toISOString());

      const addItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
      const dropStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');

      for (const item of payload.products) {
        addItem.run(orderId, item.productId, item.quantity, item.pricePerQuantity);
        dropStock.run(item.quantity, item.productId, item.quantity);
      }

      const cart = cartOf(user.id);
      db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);

      return sendJson(res, 200, {
        success: true,
        orderId,
        total: payload.total.price.current,
        message: 'შეკვეთა წარმატებით გაფორმდა',
      });
    }
  }

  /* ---- ავტორიზაცია ---- */
  if (method === 'POST' && pathname === '/auth/sign_up') {
    const b = await readBody(req);
    if (!b.email || !b.password || !b.firstName || !b.lastName)
      return fail(res, 400, 'შეავსეთ ყველა სავალდებულო ველი');
    if (String(b.password).length < 6) return fail(res, 400, 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(b.email))
      return fail(res, 409, 'ასეთი ელ. ფოსტა უკვე რეგისტრირებულია');

    const { hash, salt } = hashPassword(b.password);
    const id = uid();
    db.prepare(
      `INSERT INTO users (id, first_name, last_name, email, password, salt, age, address, phone, zipcode, gender, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, b.firstName, b.lastName, b.email, hash, salt, Number(b.age) || null,
          b.address || null, b.phone || null, b.zipcode || null, b.gender || null,
          new Date().toISOString());

    return sendJson(res, 201, { message: 'რეგისტრაცია წარმატებულია', userId: id });
  }

  if (method === 'POST' && pathname === '/auth/sign_in') {
    const { email, password } = await readBody(req);
    const user = email && db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !password || !verifyPassword(password, user.password, user.salt))
      return fail(res, 401, 'ელ. ფოსტა ან პაროლი არასწორია');

    const token = uid() + uid();
    db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)')
      .run(token, user.id, new Date().toISOString());

    return sendJson(res, 200, { access_token: token, refresh_token: token, user: publicUser(user) });
  }

  if (method === 'GET' && pathname === '/auth') {
    const user = userFromRequest(req);
    return user ? sendJson(res, 200, publicUser(user)) : fail(res, 401, 'საჭიროა ავტორიზაცია');
  }

  if (method === 'GET' && pathname.startsWith('/auth/id/')) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(pathname.split('/').pop());
    return user ? sendJson(res, 200, publicUser(user)) : fail(res, 404, 'მომხმარებელი ვერ მოიძებნა');
  }

  if (method === 'POST' && pathname === '/auth/sign_out') {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) db.prepare('DELETE FROM sessions WHERE token = ?').run(header.slice(7));
    return sendJson(res, 200, { message: 'წარმატებით გახვედით' });
  }

  return fail(res, 404, 'ასეთი endpoint არ არსებობს');
}

/* ---------------------------------------------------------
   სერვერი
   --------------------------------------------------------- */
const API_PREFIXES = ['/shop/', '/auth'];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    });
    return res.end();
  }

  const isApi = API_PREFIXES.some((p) => url.pathname.startsWith(p));

  try {
    if (isApi) await handleApi(req, res, url);
    else serveStatic(req, res, url.pathname);
  } catch (err) {
    console.error('შეცდომა:', err.message);
    if (!res.headersSent) fail(res, 500, 'სერვერის შეცდომა');
  }
});

const fresh = seed();
server.listen(PORT, () => {
  console.log('─'.repeat(54));
  console.log('  ონლაინ მაღაზია მუშაობს');
  console.log(`  საიტი:  http://localhost:${PORT}`);
  console.log(`  ბაზა:   server/shop.db ${fresh ? '(ახლად შეიქმნა და შეივსო)' : '(არსებული)'}`);
  console.log('  გასაჩერებლად დააჭირეთ Ctrl+C');
  console.log('─'.repeat(54));
});
