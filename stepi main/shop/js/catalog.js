/* =========================================================
   catalog.js — მთავარი გვერდი: ნივთების სია, ძიება, ფილტრაცია
   ========================================================= */

const PAGE_SIZE = 12;

const state = {
  /* 'api'   — SQLite ბექენდი (node server/server.js)
     'local' — სარეზერვო კატალოგი ბრაუზერში, თუ სერვერი მიუწვდომელია */
  source: 'api',
  keywords: '',
  categoryId: '',
  categoryName: '',
  brand: '',
  rating: '',
  priceMin: '',
  priceMax: '',
  sortBy: '',
  sortDirection: '',
  page: 0,
  total: 0,
};

/** products currently on screen, kept so "კალათაში დამატება" has the full object */
let currentProducts = [];

/* ---------- element refs ---------- */
const el = {
  grid: document.getElementById('productGrid'),
  pagination: document.getElementById('pagination'),
  summary: document.getElementById('resultSummary'),
  chips: document.getElementById('activeChips'),
  searchForm: document.getElementById('searchForm'),
  searchInput: document.getElementById('searchInput'),
  searchClear: document.getElementById('searchClear'),
  categoryFilter: document.getElementById('categoryFilter'),
  brandFilter: document.getElementById('brandFilter'),
  ratingFilter: document.getElementById('ratingFilter'),
  priceMin: document.getElementById('priceMin'),
  priceMax: document.getElementById('priceMax'),
  priceApply: document.getElementById('priceApply'),
  resetBtn: document.getElementById('resetFilters'),
  sortSelect: document.getElementById('sortSelect'),
  sourceFilter: document.getElementById('sourceFilter'),
};

/* ---------- მონაცემთა წყარო: ლოკალური კატალოგი ან API ---------- */
const Source = {
  products(query) {
    return state.source === 'local'
      ? Promise.resolve(LocalCatalog.query(query))
      : API.products.search(query);
  },
  categories() {
    return state.source === 'local'
      ? Promise.resolve(LocalCatalog.categories())
      : API.products.categories();
  },
  /** ბრენდები არჩეული კატეგორიის მიხედვით: [{ name, count }] */
  async brands() {
    if (state.source === 'local') return LocalCatalog.brands(state.categoryId);
    const list = await API.products.brands(state.categoryId);
    /* სერვერი აბრუნებს ობიექტებს, everrest კი უბრალო სტრიქონებს */
    return list.map((b) => (typeof b === 'string' ? { name: b, count: null } : b));
  },
};

/** სერვერი მიუწვდომელია → ვაგრძელებთ ლოკალური კატალოგით */
let fellBackToLocal = false;
function fallbackToLocal(err) {
  if (state.source !== 'api' || fellBackToLocal) return false;
  fellBackToLocal = true;
  state.source = 'local';
  console.warn('სერვერთან კავშირი ვერ დამყარდა, ვრთავთ ლოკალურ კატალოგს:', err.message);
  toast('სერვერი მიუწვდომელია — ჩაირთო ლოკალური კატალოგი', 'info');
  return true;
}

/* =========================================================
   rendering
   ========================================================= */
function skeletonGrid(n = PAGE_SIZE) {
  el.grid.innerHTML = Array.from({ length: n })
    .map(() => '<div class="skeleton sk-card"></div>')
    .join('');
  el.pagination.innerHTML = '';
}

function stockTag(product) {
  if (!product.stock) return '<span class="tag tag--out">არ არის მარაგში</span>';
  if (product.stock <= 5) return `<span class="tag tag--low">დარჩა ${product.stock}</span>`;
  const off = product.price?.discountPercentage;
  if (off) return `<span class="tag tag--sale">-${Math.round(off)}%</span>`;
  return '';
}

/** ნივთის ბარათი: სურათი, დასახელება, ფასი, რეიტინგი, კალათაში დამატების ღილაკი */
function productCard(p) {
  const currency = p.price?.currency || 'USD';
  const discounted = p.price?.beforeDiscount && p.price.beforeDiscount > p.price.current;
  return `
  <article class="card" data-id="${p._id}">
    <a class="card__media" href="product.html?id=${p._id}">
      ${stockTag(p)}
      <img src="${p.thumbnail}" alt="${escapeHtml(p.title)}" loading="lazy" />
    </a>
    <div class="card__body">
      <div class="card__brand">${escapeHtml(p.brand || '—')}</div>
      <a class="card__title" href="product.html?id=${p._id}">${escapeHtml(p.title)}</a>
      <div class="rating-line">${starsHTML(p.rating)}</div>
      <div class="price">
        <span class="price__now">${money(p.price?.current, currency)}</span>
        ${discounted ? `<span class="price__was">${money(p.price.beforeDiscount, currency)}</span>` : ''}
      </div>
      <div class="card__foot">
        <button class="btn btn--primary btn--sm" data-add="${p._id}" ${p.stock ? '' : 'disabled'}>
          ${p.stock ? '🛒 კალათაში' : 'არ არის მარაგში'}
        </button>
      </div>
    </div>
  </article>`;
}

function renderProducts(products) {
  currentProducts = products;

  if (!products.length) {
    el.grid.innerHTML = `
      <div class="empty">
        <div class="empty__icon">🔎</div>
        <h3>ნივთი ვერ მოიძებნა</h3>
        <p>სცადეთ სხვა საძიებო სიტყვა ან შეცვალეთ ფილტრები.</p>
        <button class="btn btn--dark" onclick="resetFilters()">ფილტრების გასუფთავება</button>
      </div>`;
    return;
  }
  el.grid.innerHTML = products.map(productCard).join('');
}

function renderPagination() {
  const pages = Math.ceil(state.total / PAGE_SIZE);
  if (pages <= 1) {
    el.pagination.innerHTML = '';
    return;
  }

  const cur = state.page;
  const items = [];
  items.push(
    `<button class="page-btn page-btn--nav" data-page="${cur - 1}" ${cur === 0 ? 'disabled' : ''}>← წინა</button>`
  );

  const push = (i) =>
    items.push(
      `<button class="page-btn ${i === cur ? 'is-active' : ''}" data-page="${i}">${i + 1}</button>`
    );
  const dots = () => items.push('<span class="page-dots">…</span>');

  const window_ = 1;
  for (let i = 0; i < pages; i++) {
    if (i === 0 || i === pages - 1 || Math.abs(i - cur) <= window_) push(i);
    else if (i === cur - window_ - 1 || i === cur + window_ + 1) dots();
  }

  items.push(
    `<button class="page-btn page-btn--nav" data-page="${cur + 1}" ${cur >= pages - 1 ? 'disabled' : ''}>შემდეგი →</button>`
  );
  el.pagination.innerHTML = items.join('');
}

function renderChips() {
  const chips = [];
  if (state.keywords) chips.push(['keywords', `ძიება: ${state.keywords}`]);
  if (state.categoryId) chips.push(['categoryId', `კატეგორია: ${state.categoryName}`]);
  if (state.brand) chips.push(['brand', `ბრენდი: ${state.brand}`]);
  if (state.rating) chips.push(['rating', `რეიტინგი: ${state.rating}+`]);
  if (state.priceMin || state.priceMax)
    chips.push(['price', `ფასი: ${state.priceMin || 0} – ${state.priceMax || '∞'}`]);

  el.chips.innerHTML = chips
    .map(([key, label]) => `<span class="chip">${escapeHtml(label)}<button data-clear="${key}">&times;</button></span>`)
    .join('');
}

/* =========================================================
   data loading
   ========================================================= */
async function loadProducts() {
  skeletonGrid();
  el.summary.textContent = 'იტვირთება…';

  const query = {
    page_index: state.page,
    page_size: PAGE_SIZE,
    keywords: state.keywords || undefined,
    category_id: state.categoryId || undefined,
    brand: state.brand || undefined,
    rating: state.rating || undefined,
    price_min: state.priceMin || undefined,
    price_max: state.priceMax || undefined,
  };
  if (state.sortBy) {
    query.sort_by = state.sortBy;
    query.sort_direction = state.sortDirection || 'asc';
  }

  try {
    const data = await Source.products(query);
    state.total = data.total ?? data.products?.length ?? 0;
    renderProducts(data.products || []);
    renderPagination();
    renderChips();
    el.summary.textContent = state.total
      ? `ნაპოვნია ${state.total} ნივთი · გვერდი ${state.page + 1} / ${Math.max(1, Math.ceil(state.total / PAGE_SIZE))}`
      : 'ნივთი ვერ მოიძებნა';
    syncUrl();
  } catch (err) {
    /* სერვერი არ მუშაობს → ლოკალურ კატალოგზე გადართვა და ხელახლა ცდა */
    if (fallbackToLocal(err)) {
      await loadFilters();
      return loadProducts();
    }
    el.grid.innerHTML = `
      <div class="empty">
        <div class="empty__icon">⚠️</div>
        <h3>მონაცემები ვერ ჩაიტვირთა</h3>
        <p>${escapeHtml(err.message)}</p>
        <button class="btn btn--dark" onclick="loadProducts()">ხელახლა ცდა</button>
      </div>`;
    el.summary.textContent = 'შეცდომა';
  }
}

async function loadFilters() {
  /* --- categories --- */
  try {
    const categories = await Source.categories();

    /* ბმულიდან მოსული კატეგორიის სახელი (ჩიპისთვის) */
    if (state.categoryId && !state.categoryName) {
      state.categoryName = categories.find((c) => c.id === state.categoryId)?.name || '';
    }

    el.categoryFilter.innerHTML =
      `<label class="check"><input type="radio" name="cat" value="" ${state.categoryId ? '' : 'checked'} /> ყველა კატეგორია</label>` +
      categories
        .map(
          (c) =>
            `<label class="check"><input type="radio" name="cat" value="${c.id}" data-name="${escapeHtml(c.name)}" ${
              state.categoryId === c.id ? 'checked' : ''
            } /> ${escapeHtml(c.name)}${
              c.count != null ? `<span class="check__count">${c.count}</span>` : ''
            }</label>`
        )
        .join('');
  } catch {
    el.categoryFilter.innerHTML = '<p class="hint">კატეგორიები ვერ ჩაიტვირთა</p>';
  }

  /* --- brands --- */
  try {
    const brands = await Source.brands();
    el.brandFilter.innerHTML =
      `<label class="check"><input type="radio" name="brand" value="" ${state.brand ? '' : 'checked'} /> ყველა ბრენდი</label>` +
      brands
        .map(
          (b) =>
            `<label class="check"><input type="radio" name="brand" value="${escapeHtml(b.name)}" ${
              state.brand === b.name ? 'checked' : ''
            } /> ${escapeHtml(b.name)}${
              b.count != null ? `<span class="check__count">${b.count}</span>` : ''
            }</label>`
        )
        .join('');
  } catch {
    el.brandFilter.innerHTML = '<p class="hint">ბრენდები ვერ ჩაიტვირთა</p>';
  }

  /* --- rating --- */
  if (!el.ratingFilter.children.length) {
    el.ratingFilter.innerHTML =
      `<label class="check"><input type="radio" name="rating" value="" checked /> ნებისმიერი</label>` +
      [4, 3, 2, 1]
        .map(
          (r) =>
            `<label class="check"><input type="radio" name="rating" value="${r}" /> ${'<i>★</i>'.repeat(r)} და მეტი</label>`
        )
        .join('');
  }
}

/* =========================================================
   events
   ========================================================= */
function bindEvents() {
  /* წყაროს გადართვა: ლოკალური კატალოგი ↔ API */
  el.sourceFilter.addEventListener('change', async (e) => {
    state.source = e.target.value;
    state.categoryId = state.categoryName = state.brand = '';
    state.page = 0;
    await loadFilters();
    loadProducts();
  });

  /* კატეგორია — ბრენდების სია ახალ კატეგორიას ერგება */
  el.categoryFilter.addEventListener('change', async (e) => {
    state.categoryId = e.target.value;
    state.categoryName = e.target.dataset.name || '';
    state.page = 0;

    /* თუ არჩეული ბრენდი ამ კატეგორიაში აღარ გვხვდება, არჩევანი უქმდება */
    const brands = await Source.brands();
    if (state.brand && !brands.some((b) => b.name === state.brand)) state.brand = '';

    await loadFilters();
    loadProducts();
  });

  /* ბრენდი */
  el.brandFilter.addEventListener('change', (e) => {
    state.brand = e.target.value;
    state.page = 0;
    loadProducts();
  });

  /* რეიტინგი */
  el.ratingFilter.addEventListener('change', (e) => {
    state.rating = e.target.value;
    state.page = 0;
    loadProducts();
  });

  /* ძიება */
  el.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.keywords = el.searchInput.value.trim();
    state.page = 0;
    loadProducts();
  });

  let timer;
  el.searchInput.addEventListener('input', () => {
    el.searchClear.classList.toggle('is-hidden', !el.searchInput.value);
    clearTimeout(timer);
    timer = setTimeout(() => {
      const v = el.searchInput.value.trim();
      if (v === state.keywords) return;
      state.keywords = v;
      state.page = 0;
      loadProducts();
    }, 450);
  });

  el.searchClear.addEventListener('click', () => {
    el.searchInput.value = '';
    el.searchClear.classList.add('is-hidden');
    state.keywords = '';
    state.page = 0;
    loadProducts();
  });

  /* ფასი */
  el.priceApply.addEventListener('click', () => {
    state.priceMin = el.priceMin.value;
    state.priceMax = el.priceMax.value;
    state.page = 0;
    loadProducts();
  });

  /* დალაგება */
  el.sortSelect.addEventListener('change', () => {
    const [by, dir] = (el.sortSelect.value || '').split(':');
    state.sortBy = by || '';
    state.sortDirection = dir || '';
    state.page = 0;
    loadProducts();
  });

  el.resetBtn.addEventListener('click', resetFilters);

  /* pagination */
  el.pagination.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn) return;
    state.page = Number(btn.dataset.page);
    loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* chips */
  el.chips.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-clear]');
    if (!btn) return;
    const key = btn.dataset.clear;
    if (key === 'price') {
      state.priceMin = state.priceMax = '';
      el.priceMin.value = el.priceMax.value = '';
    } else if (key === 'keywords') {
      state.keywords = '';
      el.searchInput.value = '';
    } else if (key === 'categoryId') {
      state.categoryId = state.categoryName = '';
      el.categoryFilter.querySelector('input[value=""]').checked = true;
    } else if (key === 'brand') {
      state.brand = '';
      el.brandFilter.querySelector('input[value=""]').checked = true;
    } else if (key === 'rating') {
      state.rating = '';
      el.ratingFilter.querySelector('input[value=""]').checked = true;
    }
    state.page = 0;
    loadProducts();
  });

  /* კალათაში დამატება ბარათიდან */
  el.grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const product = currentProducts.find((p) => p._id === btn.dataset.add);
    if (!product) return;

    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = '…';
    try {
      await CartStore.add(product, 1);
      btn.textContent = '✓ დამატებულია';
      toast(`„${product.title}" დაემატა კალათაში`, 'success');
      setTimeout(() => {
        btn.textContent = label;
        btn.disabled = false;
      }, 1200);
    } catch (err) {
      btn.textContent = label;
      btn.disabled = false;
      toast(err.message || 'კალათაში დამატება ვერ მოხერხდა', 'error');
    }
  });

  document.addEventListener('auth:change', () => loadProducts());
}

function resetFilters() {
  state.keywords = state.categoryId = state.categoryName = '';
  state.brand = state.rating = state.priceMin = state.priceMax = '';
  state.sortBy = state.sortDirection = '';
  state.page = 0;
  el.searchInput.value = '';
  el.priceMin.value = el.priceMax.value = '';
  el.sortSelect.value = '';
  el.categoryFilter.querySelector('input[value=""]')?.click();
  document.querySelectorAll('.sidebar input[type=radio][value=""]').forEach((i) => (i.checked = true));
  loadProducts();
}

/* keep the address bar in sync so filtered views can be shared */
function syncUrl() {
  const qs = new URLSearchParams();
  if (state.source !== 'local') qs.set('source', state.source);
  if (state.keywords) qs.set('q', state.keywords);
  if (state.categoryId) qs.set('category', state.categoryId);
  if (state.brand) qs.set('brand', state.brand);
  if (state.rating) qs.set('rating', state.rating);
  if (state.page) qs.set('page', state.page);
  const s = qs.toString();
  history.replaceState(null, '', s ? '?' + s : location.pathname);
}

function readUrl() {
  const qs = new URLSearchParams(location.search);
  state.source = qs.get('source') === 'local' ? 'local' : 'api';
  const sourceInput = el.sourceFilter?.querySelector(`input[value="${state.source}"]`);
  if (sourceInput) sourceInput.checked = true;
  state.keywords = qs.get('q') || '';
  state.categoryId = qs.get('category') || '';
  state.brand = qs.get('brand') || '';
  state.rating = qs.get('rating') || '';
  state.page = Number(qs.get('page') || 0);
  if (state.keywords) {
    el.searchInput.value = state.keywords;
    el.searchClear.classList.remove('is-hidden');
  }
}

/* ---------- boot ---------- */
(async function init() {
  readUrl();
  bindEvents();
  await initShell();
  loadFilters();
  loadProducts();
})();
