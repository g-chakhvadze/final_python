/* =========================================================
   cart.js — კალათის მართვის გვერდი
   ========================================================= */

const listEl = document.getElementById('cartList');
const summaryLine = document.getElementById('cartSummaryLine');

/** productId -> full product object (needed for image, stock, rating, reviews) */
const productCache = new Map();

async function getProduct(id) {
  if (productCache.has(id)) return productCache.get(id);
  const p = LocalCatalog.isLocalId(id)
    ? LocalCatalog.byId(id)
    : await API.products.byId(id).catch(() => null);
  productCache.set(id, p);
  return p;
}

/* =========================================================
   render
   ========================================================= */
function cartRow(row, product) {
  if (!product) {
    return `
      <div class="cart-item" data-id="${row.productId}">
        <div class="cart-item__media">?</div>
        <div>
          <div class="cart-item__title">ნივთი აღარ არის ხელმისაწვდომი</div>
          <div class="cart-item__meta">ID: ${escapeHtml(row.productId)}</div>
        </div>
        <div class="cart-item__right">
          <button class="icon-del" data-remove="${row.productId}" title="წაშლა">🗑</button>
        </div>
      </div>`;
  }

  const currency = product.price?.currency || 'USD';
  const unit = row.pricePerQuantity ?? product.price?.current ?? 0;
  const reviewCount = (product.ratings || []).length;
  const stockLabel = product.stock
    ? `საწყობში: ${product.stock} ცალი`
    : '<span style="color:var(--red)">არ არის მარაგში</span>';

  return `
  <div class="cart-item" data-id="${product._id}">
    <a class="cart-item__media" href="product.html?id=${product._id}">
      <img src="${product.thumbnail}" alt="${escapeHtml(product.title)}" loading="lazy" />
    </a>

    <div>
      <a class="cart-item__title" href="product.html?id=${product._id}">${escapeHtml(product.title)}</a>
      <div class="cart-item__meta">
        <span class="rating-line">${starsHTML(product.rating)}</span>
        <span>💬 ${reviewCount} შეფასება</span>
        <span>${stockLabel}</span>
      </div>
      <div class="cart-item__meta" style="margin-top:10px">
        <div class="stepper">
          <button type="button" data-dec="${product._id}" ${row.quantity <= 1 ? 'disabled' : ''}>−</button>
          <span class="stepper__value">${row.quantity}</span>
          <button type="button" data-inc="${product._id}" ${row.quantity >= (product.stock || 0) ? 'disabled' : ''}>+</button>
        </div>
      </div>
    </div>

    <div class="cart-item__right">
      <button class="icon-del" data-remove="${product._id}" title="კალათიდან წაშლა">🗑</button>
      <div class="cart-item__sum">${money(unit * row.quantity, currency)}</div>
      <div class="cart-item__unit">${money(unit, currency)} × ${row.quantity}</div>
    </div>
  </div>`;
}

function renderSummary(currency = 'USD') {
  const t = CartStore.state.total || {};
  const current = t.price?.current || 0;
  const before = t.price?.beforeDiscount || current;
  const discount = Math.max(0, before - current);

  document.getElementById('sumItems').textContent = `${t.products || 0} დასახელება · ${t.quantity || 0} ცალი`;
  document.getElementById('sumBefore').textContent = money(before, currency);
  document.getElementById('sumDiscount').textContent = discount ? '− ' + money(discount, currency) : money(0, currency);
  document.getElementById('sumTotal').textContent = money(current, currency);

  const note = document.getElementById('summaryNote');
  if (!CartStore.hasServerItems && (t.quantity || 0) > 0) {
    note.textContent = 'ლოკალური კატალოგის ნივთები ინახება ამ ბრაუზერში (სადემონსტრაციო რეჟიმი).';
  } else {
    note.textContent = Session.isAuthed
      ? 'API-ის ნივთები ინახება სერვერზე თქვენს ანგარიშზე.'
      : 'ავტორიზაციის გარეშე კალათა ინახება მხოლოდ ამ ბრაუზერში.';
  }

  document.getElementById('checkoutBtn').disabled = !(t.quantity > 0);
}

async function renderCart() {
  const rows = CartStore.state.products || [];

  if (!rows.length) {
    listEl.innerHTML = `
      <div class="empty">
        <div class="empty__icon">🛒</div>
        <h3>კალათა ცარიელია</h3>
        <p>აირჩიეთ ნივთები მთავარ გვერდზე და დაამატეთ კალათაში.</p>
        <a class="btn btn--dark" href="index.html">ნივთების ნახვა</a>
      </div>`;
    summaryLine.textContent = 'კალათაში ნივთები არ არის';
    renderSummary();
    return;
  }

  summaryLine.textContent = `${rows.length} დასახელება · სულ ${CartStore.itemCount} ცალი`;

  const products = await Promise.all(rows.map((r) => getProduct(r.productId)));
  listEl.innerHTML = rows.map((r, i) => cartRow(r, products[i])).join('');
  renderSummary(products.find(Boolean)?.price?.currency || 'USD');
}

/* =========================================================
   events
   ========================================================= */
listEl.addEventListener('click', async (e) => {
  const inc = e.target.closest('[data-inc]');
  const dec = e.target.closest('[data-dec]');
  const del = e.target.closest('[data-remove]');
  if (!inc && !dec && !del) return;

  const id = inc ? inc.dataset.inc : dec ? dec.dataset.dec : del.dataset.remove;
  const row = CartStore.state.products.find((p) => p.productId === id);
  const product = await getProduct(id);

  listEl.querySelectorAll('button').forEach((b) => (b.disabled = true));
  try {
    if (del) {
      await CartStore.remove(id);
      toast('ნივთი წაიშალა კალათიდან', 'info');
    } else if (product && row) {
      const next = row.quantity + (inc ? 1 : -1);
      if (next > (product.stock || 0)) {
        toast('მარაგში მეტი აღარ არის', 'error');
      } else {
        await CartStore.setQuantity(product, next);
      }
    }
  } catch (err) {
    toast(err.message || 'ოპერაცია ვერ შესრულდა', 'error');
  }
  await renderCart();
});

document.getElementById('clearCart').addEventListener('click', async () => {
  if (!CartStore.state.products.length) return;
  if (!confirm('დარწმუნებული ხართ, რომ გსურთ კალათის გასუფთავება?')) return;
  try {
    await CartStore.clear();
    toast('კალათა გასუფთავდა', 'info');
  } catch (err) {
    toast(err.message || 'ვერ გასუფთავდა', 'error');
  }
  renderCart();
});

document.getElementById('checkoutBtn').addEventListener('click', async (e) => {
  /* ავტორიზაცია მხოლოდ მაშინ სჭირდება, როცა კალათაში API-ის ნივთებია */
  if (CartStore.hasServerItems && !requireAuth('შეკვეთის გასაფორმებლად გაიარეთ ავტორიზაცია')) return;
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.textContent = 'მიმდინარეობს…';
  try {
    const res = await CartStore.checkout();
    toast(res.message || 'შეკვეთა გაფორმდა!', 'success');
    productCache.clear();
    await renderCart();
  } catch (err) {
    toast(err.message || 'შეკვეთა ვერ გაფორმდა', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'შეკვეთის გაფორმება';
  }
});

document.addEventListener('auth:change', renderCart);

/* ---------- boot ---------- */
(async function init() {
  await initShell();
  renderCart();
})();
