/* =========================================================
   api.js — EverREST API layer
   Base: https://api.everrest.educata.dev
   Docs: https://api.everrest.educata.dev/swagger
   ========================================================= */

/* ---------------------------------------------------------
   სერვერის მისამართი.
   ცარიელი სტრიქონი ნიშნავს „იმავე სერვერს, რომელმაც ეს გვერდი გასცა" —
   ანუ ჩვენს SQLite ბექენდს (node server/server.js → localhost:3000).

   თუ გინდა STEP-ის საერთო სერვერზე გადართვა, ჩაწერე:
   const API_BASE = 'https://api.everrest.educata.dev';
   --------------------------------------------------------- */
const API_BASE = '';

/* ---------- token storage ---------- */
const Session = {
  get access() {
    return localStorage.getItem('er_access_token');
  },
  get refresh() {
    return localStorage.getItem('er_refresh_token');
  },
  set(access, refresh) {
    if (access) localStorage.setItem('er_access_token', access);
    if (refresh) localStorage.setItem('er_refresh_token', refresh);
  },
  clear() {
    localStorage.removeItem('er_access_token');
    localStorage.removeItem('er_refresh_token');
    localStorage.removeItem('er_user');
  },
  get user() {
    try {
      return JSON.parse(localStorage.getItem('er_user') || 'null');
    } catch {
      return null;
    }
  },
  set user(u) {
    if (u) localStorage.setItem('er_user', JSON.stringify(u));
    else localStorage.removeItem('er_user');
  },
  get isAuthed() {
    return Boolean(this.access);
  },
};

/* ---------- low level request ---------- */
class ApiError extends Error {
  constructor(status, body) {
    const msg =
      (body && (body.message || body.error)) || `HTTP ${status}`;
    super(Array.isArray(msg) ? msg.join(', ') : msg);
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = 'GET', body, auth = false, query } = {}) {
  let url = API_BASE + path;

  if (query) {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const s = qs.toString();
    if (s) url += '?' + s;
  }

  const headers = { accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    if (!Session.access) throw new ApiError(401, { message: 'საჭიროა ავტორიზაცია' });
    headers['Authorization'] = 'Bearer ' + Session.access;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

/* ---------- public API ---------- */
const API = {
  /* ----- products ----- */
  products: {
    all(pageIndex = 0, pageSize = 12) {
      return request('/shop/products/all', {
        query: { page_index: pageIndex, page_size: pageSize },
      });
    },

    byId(id) {
      return request(`/shop/products/id/${encodeURIComponent(id)}`);
    },

    /**
     * filters: { keywords, category_id, brand, rating, price_min, price_max,
     *            sort_by, sort_direction, page_index, page_size }
     */
    async search(filters = {}) {
      try {
        return await request('/shop/products/search', { query: filters });
      } catch (err) {
        // Some filter combinations are rejected by the API — fall back to
        // the plain list so the grid never ends up empty because of a 400.
        if (err.status === 400 || err.status === 404) {
          return API.products.all(filters.page_index || 0, filters.page_size || 12);
        }
        throw err;
      }
    },

    categories() {
      return request('/shop/products/categories');
    },

    /** ბრენდები; კატეგორიის მითითებისას — მხოლოდ იმ კატეგორიის ბრენდები */
    brands(categoryId = '') {
      return request('/shop/products/brands', { query: { category_id: categoryId } });
    },

    byCategory(categoryId, pageIndex = 0, pageSize = 12) {
      return request(`/shop/products/category/${encodeURIComponent(categoryId)}`, {
        query: { page_index: pageIndex, page_size: pageSize },
      });
    },

    byBrand(brand, pageIndex = 0, pageSize = 12) {
      return request(`/shop/products/brand/${encodeURIComponent(brand)}`, {
        query: { page_index: pageIndex, page_size: pageSize },
      });
    },

    /** ნივთის შეფასება — საჭიროებს ავტორიზაციას. ტექსტიც სერვერზე ინახება */
    rate(productId, rate, text = '') {
      return request('/shop/products/rate', {
        method: 'POST',
        auth: true,
        body: { productId, rate: Number(rate), text },
      });
    },
  },

  /* ----- cart (server side, requires auth) ----- */
  cart: {
    get() {
      return request('/shop/cart', { auth: true });
    },
    create(id, quantity) {
      return request('/shop/cart/product', {
        method: 'POST',
        auth: true,
        body: { id, quantity },
      });
    },
    update(id, quantity) {
      return request('/shop/cart/product', {
        method: 'PATCH',
        auth: true,
        body: { id, quantity },
      });
    },
    removeProduct(id) {
      return request('/shop/cart/product', {
        method: 'DELETE',
        auth: true,
        body: { id },
      });
    },
    clear() {
      return request('/shop/cart', { method: 'DELETE', auth: true });
    },
    checkout() {
      return request('/shop/cart/checkout', { method: 'POST', auth: true });
    },
  },

  /* ----- auth ----- */
  auth: {
    async signIn(email, password) {
      const data = await request('/auth/sign_in', {
        method: 'POST',
        body: { email, password },
      });
      Session.set(data.access_token, data.refresh_token);
      return data;
    },
    signUp(payload) {
      return request('/auth/sign_up', { method: 'POST', body: payload });
    },
    verifyEmail(email) {
      return request('/auth/verify_email', { method: 'POST', body: { email } });
    },
    me() {
      return request('/auth', { auth: true });
    },
    userById(id) {
      return request(`/auth/id/${encodeURIComponent(id)}`);
    },
  },
};

/* ---------- user name cache (used by the review list) ---------- */
const UserCache = {
  _map: new Map(),
  async name(userId) {
    if (!userId) return 'ანონიმური მომხმარებელი';
    if (this._map.has(userId)) return this._map.get(userId);
    const pending = API.auth
      .userById(userId)
      .then((u) => {
        const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
        return full || u.email || 'მომხმარებელი';
      })
      .catch(() => 'მომხმარებელი ' + String(userId).slice(-4));
    this._map.set(userId, pending);
    return pending;
  },
};
