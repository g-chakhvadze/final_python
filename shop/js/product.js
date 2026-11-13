/* =========================================================
   product.js — ნივთის დეტალური ინფორმაციის გვერდი
   ტაბები: Details / Review  +  შეფასების მოდალი
   ========================================================= */

const productId = new URLSearchParams(location.search).get('id');

let product = null;
let qty = 1;
let pickedRating = 0;

const root = document.getElementById('detailRoot');

/* =========================================================
   markup
   ========================================================= */
function stockState(stock) {
  if (!stock) return { cls: 'dot--out', text: 'არ არის მარაგში' };
  if (stock <= 5) return { cls: 'dot--low', text: `მარაგში დარჩა ${stock} ცალი` };
  return { cls: '', text: `მარაგშია — ${stock} ცალი` };
}

function render() {
  const currency = product.price?.currency || 'USD';
  const discounted = product.price?.beforeDiscount > product.price?.current;
  const images = (product.images && product.images.length ? product.images : [product.thumbnail]).filter(Boolean);
  const stock = stockState(product.stock);
  const reviews = product.ratings || [];

  document.title = `${product.title} — STEP Store`;
  document.getElementById('breadcrumbs').innerHTML = `
    <a href="index.html">მთავარი</a> <span>/</span>
    <a href="index.html?category=${product.category?.id || ''}">${escapeHtml(product.category?.name || 'კატეგორია')}</a>
    <span>/</span> <span>${escapeHtml(product.title)}</span>`;

  root.innerHTML = `
  <div class="detail">
    <!-- გალერეა -->
    <div class="gallery">
      <div class="gallery__main">
        <img id="mainImage" src="${images[0]}" alt="${escapeHtml(product.title)}" />
      </div>
      ${
        images.length > 1
          ? `<div class="gallery__thumbs">
              ${images
                .map(
                  (src, i) =>
                    `<button class="thumb ${i === 0 ? 'is-active' : ''}" data-src="${src}"><img src="${src}" alt="" loading="lazy" /></button>`
                )
                .join('')}
            </div>`
          : ''
      }
    </div>

    <!-- ინფორმაცია -->
    <div class="detail__info">
      <div class="detail__brand">${escapeHtml(product.brand || '—')}</div>
      <h1 class="detail__title">${escapeHtml(product.title)}</h1>

      <div class="detail__meta">
        <span class="rating-line">${starsHTML(product.rating)}</span>
        <span>·</span>
        <a href="#reviews" data-goto-reviews>${reviews.length} შეფასება</a>
        <span>·</span>
        <span>${escapeHtml(product.category?.name || '')}</span>
      </div>

      <div class="detail__price">
        <span class="price__now">${money(product.price?.current, currency)}</span>
        ${discounted ? `<span class="price__was">${money(product.price.beforeDiscount, currency)}</span>` : ''}
        ${
          product.price?.discountPercentage
            ? `<span class="price__off">-${Math.round(product.price.discountPercentage)}%</span>`
            : ''
        }
      </div>

      <div class="stock-line"><span class="dot ${stock.cls}"></span> ${stock.text}</div>

      <!-- სპეციფიკაცია: გამოშვების თარიღი, ბრენდი, მარაგი -->
      <div class="specs">
        <div class="spec">
          <div class="spec__label">გამოშვების თარიღი</div>
          <div class="spec__value">${formatDate(product.issueDate)}</div>
        </div>
        <div class="spec">
          <div class="spec__label">ბრენდი</div>
          <div class="spec__value">${escapeHtml(product.brand || '—')}</div>
        </div>
        <div class="spec">
          <div class="spec__label">საწყობში (stock)</div>
          <div class="spec__value">${product.stock ?? 0} ცალი</div>
        </div>
        <div class="spec">
          <div class="spec__label">გარანტია</div>
          <div class="spec__value">${escapeHtml(product.warranty || '—')}</div>
        </div>
      </div>

      <!-- რაოდენობა + ყიდვისა და კალათაში დამატების ღილაკები -->
      <div class="buy-row">
        <div class="stepper" ${product.stock ? '' : 'hidden'}>
          <button type="button" id="qtyMinus" aria-label="კლება">−</button>
          <span class="stepper__value" id="qtyValue">1</span>
          <button type="button" id="qtyPlus" aria-label="ზრდა">+</button>
        </div>
        <button class="btn btn--primary" id="buyNow" ${product.stock ? '' : 'disabled'}>ყიდვა</button>
        <button class="btn btn--dark" id="addToCart" ${product.stock ? '' : 'disabled'}>🛒 კალათაში დამატება</button>
      </div>

      <!-- ტაბები -->
      <div class="tabs" id="tabs">
        <button class="tab is-active" data-tab="details">Details</button>
        <button class="tab" data-tab="review" id="reviews">Review <span class="tab__count">(${reviews.length})</span></button>
      </div>

      <div class="tab-panel" data-panel="details">
        <div class="prose">
          <p>${escapeHtml(product.description || 'აღწერა მიუწვდომელია.')}</p>
        </div>
      </div>

      <div class="tab-panel is-hidden" data-panel="review">
        <div class="reviews__head">
          <div class="score">
            <div>
              <div class="score__num">${Number(product.rating || 0).toFixed(1)}</div>
              <div class="score__meta">${reviews.length} შეფასება</div>
            </div>
            <div>${starsHTML(product.rating, { showValue: false })}</div>
          </div>
          <button class="btn btn--primary" id="openReview">შეფასების დატოვება</button>
        </div>
        <div id="reviewList"></div>
      </div>
    </div>
  </div>`;

  bindDetail();
  renderReviews(reviews);
}

/* რეიტინგების სია: შემფასებლის სახელი და გვარი + ვარსკვლავები */
async function renderReviews(reviews) {
  const list = document.getElementById('reviewList');
  if (!list) return;

  if (!reviews.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty__icon">💬</div>
        <h3>ჯერ არავის შეუფასებია</h3>
        <p>იყავი პირველი, ვინც ამ ნივთს შეაფასებს.</p>
        <button class="btn btn--dark" onclick="openReviewModal()">შეფასების დატოვება</button>
      </div>`;
    return;
  }

  const sorted = [...reviews].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );

  list.innerHTML = sorted
    .map((r, i) => {
      /* ტექსტი: ან თავად შეფასებაში (ლოკალური), ან localStorage-ში */
      const text = r.text || ReviewText.get(product._id, r.userId);
      const known = r.name || '';
      return `
      <div class="review" data-i="${i}">
        <div class="avatar">${known ? escapeHtml((known[0] || '?').toUpperCase()) : '…'}</div>
        <div>
          <div class="review__name">${known ? escapeHtml(known) : 'იტვირთება…'}</div>
          <div class="review__date">${formatDate(r.createdAt)}</div>
          <div class="rating-line" style="margin-top:4px">${starsHTML(r.value, { showValue: false })}</div>
          ${
            text
              ? `<p class="review__text">${escapeHtml(text)}</p>`
              : `<p class="review__text is-empty">მომხმარებელმა დატოვა მხოლოდ შეფასება, ტექსტის გარეშე.</p>`
          }
        </div>
      </div>`;
    })
    .join('');

  /* უცნობი ავტორების სახელები ცალკე იტვირთება, რომ სია მაშინვე დაიხატოს */
  sorted.forEach(async (r, i) => {
    if (r.name) return;
    const name = await UserCache.name(r.userId);
    const row = list.querySelector(`[data-i="${i}"]`);
    if (!row) return;
    row.querySelector('.review__name').textContent = name;
    row.querySelector('.avatar').textContent = (name[0] || '?').toUpperCase();
  });
}

/* =========================================================
   events
   ========================================================= */
function bindDetail() {
  /* გალერეა */
  root.querySelectorAll('.thumb').forEach((t) => {
    t.addEventListener('click', () => {
      root.querySelectorAll('.thumb').forEach((x) => x.classList.remove('is-active'));
      t.classList.add('is-active');
      document.getElementById('mainImage').src = t.dataset.src;
    });
  });

  /* რაოდენობა */
  const qtyValue = document.getElementById('qtyValue');
  const setQty = (n) => {
    qty = Math.max(1, Math.min(product.stock || 1, n));
    qtyValue.textContent = qty;
    document.getElementById('qtyMinus').disabled = qty <= 1;
    document.getElementById('qtyPlus').disabled = qty >= (product.stock || 1);
  };
  document.getElementById('qtyMinus')?.addEventListener('click', () => setQty(qty - 1));
  document.getElementById('qtyPlus')?.addEventListener('click', () => setQty(qty + 1));
  setQty(1);

  /* კალათაში დამატება */
  document.getElementById('addToCart')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await CartStore.add(product, qty);
      toast(`„${product.title}" დაემატა კალათაში (${qty})`, 'success');
    } catch (err) {
      toast(err.message || 'ვერ დაემატა', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  /* ყიდვა — ამატებს კალათაში და გადადის კალათის გვერდზე */
  document.getElementById('buyNow')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await CartStore.add(product, qty);
      location.href = 'cart.html';
    } catch (err) {
      toast(err.message || 'ვერ დაემატა', 'error');
      btn.disabled = false;
    }
  });

  /* ტაბები */
  const tabs = document.getElementById('tabs');
  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    tabs.querySelectorAll('.tab').forEach((t) => t.classList.remove('is-active'));
    tab.classList.add('is-active');
    root.querySelectorAll('[data-panel]').forEach((p) => {
      p.classList.toggle('is-hidden', p.dataset.panel !== tab.dataset.tab);
    });
  });

  root.querySelector('[data-goto-reviews]')?.addEventListener('click', (e) => {
    e.preventDefault();
    tabs.querySelector('[data-tab="review"]').click();
    tabs.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.getElementById('openReview')?.addEventListener('click', openReviewModal);

  /* ბმულით პირდაპირ Review ჩანართზე გადასვლა: product.html?id=…&tab=review */
  if (new URLSearchParams(location.search).get('tab') === 'review') {
    tabs.querySelector('[data-tab="review"]').click();
  }
}

/* =========================================================
   შეფასების მოდალი
   ========================================================= */
function openReviewModal() {
  /* ლოკალურ ნივთზე შეფასება ბრაუზერში ინახება, ამიტომ ავტორიზაცია არ სჭირდება */
  if (!LocalCatalog.isLocalId(product._id) && !requireAuth('შეფასების დასატოვებლად გაიარეთ ავტორიზაცია')) return;
  document.getElementById('reviewProductName').textContent = product.title;
  setPickedRating(0);
  document.getElementById('reviewTextarea').value = '';
  openModal('reviewModal');
}

function setPickedRating(value) {
  pickedRating = value;
  document.querySelectorAll('#starPicker button').forEach((b) => {
    b.classList.toggle('is-on', Number(b.dataset.value) <= value);
  });
  document.getElementById('ratingHint').textContent = value
    ? `თქვენი შეფასება: ${value} / 5`
    : 'აირჩიეთ შეფასება 1-დან 5-მდე';
}

function bindReviewModal() {
  document.getElementById('starPicker').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-value]');
    if (b) setPickedRating(Number(b.dataset.value));
  });

  document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!pickedRating) {
      toast('აირჩიეთ ვარსკვლავების რაოდენობა', 'error');
      return;
    }
    const btn = document.getElementById('reviewSubmit');
    const text = document.getElementById('reviewTextarea').value.trim();
    btn.disabled = true;
    btn.textContent = '…';
    try {
      if (LocalCatalog.isLocalId(product._id)) {
        const me = Session.user;
        const updated = LocalCatalog.rate(product._id, pickedRating, me);
        if (text) ReviewText.set(product._id, me?._id || 'local-you', text);
        product = updated;
      } else {
        const updated = await API.products.rate(product._id, pickedRating);
        const me = Session.user || (await API.auth.me().catch(() => null));
        if (me && text) ReviewText.set(product._id, me._id, text);
        product = { ...product, ...updated };
      }
      closeModal('reviewModal');
      toast('გმადლობთ შეფასებისთვის!', 'success');
      render();
      document.querySelector('[data-tab="review"]').click();
    } catch (err) {
      if (err.status === 401) {
        Session.clear();
        updateAuthUI();
        closeModal('reviewModal');
        requireAuth('სესიას ვადა გაუვიდა — გაიარეთ ავტორიზაცია თავიდან');
      } else {
        toast(err.message || 'შეფასება ვერ გაიგზავნა', 'error');
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'OK';
    }
  });
}

/* ---------- boot ---------- */
(async function init() {
  await initShell();
  bindReviewModal();

  if (!productId) {
    root.innerHTML = `<div class="empty"><div class="empty__icon">🤷</div><h3>ნივთი არ არის მითითებული</h3>
      <p>დაბრუნდით მთავარ გვერდზე და აირჩიეთ ნივთი.</p>
      <a class="btn btn--dark" href="index.html">მთავარი გვერდი</a></div>`;
    return;
  }

  try {
    product = LocalCatalog.isLocalId(productId)
      ? LocalCatalog.byId(productId)
      : await API.products.byId(productId);
    if (!product) throw new ApiError(404, { message: 'ასეთი ნივთი ვერ მოიძებნა' });
    render();
  } catch (err) {
    root.innerHTML = `<div class="empty"><div class="empty__icon">⚠️</div><h3>ნივთი ვერ ჩაიტვირთა</h3>
      <p>${escapeHtml(err.message)}</p>
      <a class="btn btn--dark" href="index.html">მთავარ გვერდზე დაბრუნება</a></div>`;
  }
})();
