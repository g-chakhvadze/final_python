/* =========================================================
   ui.js — shared UI: header, cart badge, stars, toasts, auth modal
   ========================================================= */

/* ---------- formatting ---------- */
function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

const money =(value, currency = 'USD') => {
  const n = Number(value || 0);
  const symbol = { USD: '$', EUR: '€', GEL: '₾' }[currency] || '';
  return symbol + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' });
};

/** read-only star row */
function starsHTML(rating = 0, { showValue = true } = {}) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  let out = '<span class="stars" aria-label="რეიტინგი ' + r.toFixed(1) + '">';
  for (let i = 1; i <= 5; i++) {
    let cls = 'star';
    if (i <= full) cls += ' is-full';
    else if (i === full + 1 && half) cls += ' is-half';
    out += `<i class="${cls}">★</i>`;
  }
  out += '</span>';
  if (showValue) out += `<span class="rating-value">${r.toFixed(1)}</span>`;
  return out;
}

/* ---------- toasts ---------- */
function toast(message, type = 'info') {
  let host = document.querySelector('.toast-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

/* ---------- generic modal ---------- */
function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('is-open');
  document.body.classList.add('no-scroll');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('is-open');
  document.body.classList.remove('no-scroll');
}
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-close-modal]')) {
    closeModal(e.target.closest('.modal').id);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.is-open').forEach((m) => closeModal(m.id));
  }
});

/* ---------- review text store ----------
   The API stores only a numeric rating per user (productId + userId + value).
   The written text of a review is kept in localStorage so the Review tab can
   show a full review. Ratings themselves always come from the server.        */
const ReviewText = {
  _key: 'er_review_texts',
  _all() {
    try {
      return JSON.parse(localStorage.getItem(this._key) || '{}');
    } catch {
      return {};
    }
  },
  get(productId, userId) {
    return this._all()[`${productId}:${userId}`] || '';
  },
  set(productId, userId, text) {
    const all = this._all();
    all[`${productId}:${userId}`] = text;
    localStorage.setItem(this._key, JSON.stringify(all));
  },
};

/* ---------- header ---------- */
function updateCartBadge() {
  const badge = document.querySelector('[data-cart-count]');
  if (!badge) return;
  const n = CartStore.itemCount;
  badge.textContent = n;
  badge.classList.toggle('is-empty', n === 0);
}

function updateAuthUI() {
  const btn = document.querySelector('[data-auth-btn]');
  const label = document.querySelector('[data-auth-label]');
  if (!btn) return;
  const user = Session.user;
  if (Session.isAuthed) {
    btn.dataset.state = 'in';
    if (label) label.textContent = (user && user.firstName) || 'გასვლა';
    btn.title = 'გასვლა';
  } else {
    btn.dataset.state = 'out';
    if (label) label.textContent = 'შესვლა';
    btn.title = 'შესვლა';
  }
}

/* auth modal markup is shared by every page, so it is injected once */
function injectAuthModal() {
  if (document.getElementById('authModal')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <div class="modal" id="authModal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
    <div class="modal__backdrop" data-close-modal></div>
    <div class="modal__box">
      <button class="modal__x" data-close-modal aria-label="დახურვა">&times;</button>
      <h2 class="modal__title" id="authTitle">ავტორიზაცია</h2>
      <p class="modal__sub">კალათა და შეფასება ინახება სერვერზე, ამიტომ საჭიროა ანგარიში.</p>

      <div class="tabs tabs--sm">
        <button class="tab is-active" data-auth-tab="in">შესვლა</button>
        <button class="tab" data-auth-tab="up">რეგისტრაცია</button>
      </div>

      <form class="form" data-auth-pane="in">
        <label class="field">
          <span>ელ. ფოსტა</span>
          <input type="email" name="email" required placeholder="john@doe.com" />
        </label>
        <label class="field">
          <span>პაროლი</span>
          <input type="password" name="password" required placeholder="••••••••" />
        </label>
        <button class="btn btn--primary btn--block" type="submit">შესვლა</button>
      </form>

      <form class="form is-hidden" data-auth-pane="up">
        <div class="form__row">
          <label class="field"><span>სახელი</span><input name="firstName" required /></label>
          <label class="field"><span>გვარი</span><input name="lastName" required /></label>
        </div>
        <div class="form__row">
          <label class="field"><span>ასაკი</span><input name="age" type="number" min="1" value="20" required /></label>
          <label class="field"><span>სქესი</span>
            <select name="gender">
              <option value="MALE">მამრობითი</option>
              <option value="FEMALE">მდედრობითი</option>
              <option value="OTHER">სხვა</option>
            </select>
          </label>
        </div>
        <label class="field"><span>ელ. ფოსტა</span><input name="email" type="email" required /></label>
        <label class="field"><span>პაროლი</span><input name="password" type="password" minlength="6" required /></label>
        <div class="form__row">
          <label class="field"><span>მისამართი</span><input name="address" value="Tbilisi" required /></label>
          <label class="field"><span>ტელეფონი</span><input name="phone" value="+995555000000" required /></label>
        </div>
        <label class="field"><span>საფოსტო ინდექსი</span><input name="zipcode" value="0100" required /></label>
        <button class="btn btn--primary btn--block" type="submit">რეგისტრაცია</button>
        <p class="hint">რეგისტრაციის შემდეგ ხდება ელ. ფოსტის დადასტურება და ავტომატური შესვლა.</p>
      </form>
    </div>
  </div>`;
  document.body.appendChild(wrap.firstElementChild);

  const modal = document.getElementById('authModal');

  modal.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      modal.querySelectorAll('[data-auth-tab]').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      modal.querySelectorAll('[data-auth-pane]').forEach((p) => {
        p.classList.toggle('is-hidden', p.dataset.authPane !== tab.dataset.authTab);
      });
    });
  });

  /* sign in */
  modal.querySelector('[data-auth-pane="in"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    const fd = new FormData(e.target);
    btn.disabled = true;
    btn.textContent = 'მიმდინარეობს…';
    try {
      await API.auth.signIn(fd.get('email'), fd.get('password'));
      try { Session.user = await API.auth.me(); } catch { /* ignore */ }
      await CartStore.mergeGuestCart();
      await CartStore.load();
      updateAuthUI();
      closeModal('authModal');
      toast('კეთილი იყოს თქვენი დაბრუნება!', 'success');
      document.dispatchEvent(new CustomEvent('auth:change'));
    } catch (err) {
      toast(err.message || 'შესვლა ვერ მოხერხდა', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'შესვლა';
    }
  });

  /* sign up */
  modal.querySelector('[data-auth-pane="up"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    const fd = new FormData(e.target);
    const payload = {
      firstName: fd.get('firstName'),
      lastName: fd.get('lastName'),
      age: Number(fd.get('age')),
      email: fd.get('email'),
      password: fd.get('password'),
      address: fd.get('address'),
      phone: fd.get('phone'),
      zipcode: fd.get('zipcode'),
      gender: fd.get('gender'),
      avatar: 'https://everrest.educata.dev/favicon.ico',
    };
    btn.disabled = true;
    btn.textContent = 'მიმდინარეობს…';
    try {
      await API.auth.signUp(payload);
      try { await API.auth.verifyEmail(payload.email); } catch { /* optional */ }
      await API.auth.signIn(payload.email, payload.password);
      try { Session.user = await API.auth.me(); } catch { /* ignore */ }
      await CartStore.mergeGuestCart();
      await CartStore.load();
      updateAuthUI();
      closeModal('authModal');
      toast('ანგარიში შეიქმნა', 'success');
      document.dispatchEvent(new CustomEvent('auth:change'));
    } catch (err) {
      toast(err.message || 'რეგისტრაცია ვერ მოხერხდა', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'რეგისტრაცია';
    }
  });
}

function requireAuth(reason) {
  if (Session.isAuthed) return true;
  if (reason) toast(reason, 'info');
  openModal('authModal');
  return false;
}

/* ---------- boot ---------- */
async function initShell() {
  injectAuthModal();
  updateAuthUI();

  const authBtn = document.querySelector('[data-auth-btn]');
  if (authBtn) {
    authBtn.addEventListener('click', async () => {
      if (Session.isAuthed) {
        Session.clear();
        updateAuthUI();
        await CartStore.load();
        toast('თქვენ გახვედით ანგარიშიდან', 'info');
        document.dispatchEvent(new CustomEvent('auth:change'));
      } else {
        openModal('authModal');
      }
    });
  }

  document.addEventListener('cart:change', updateCartBadge);

  const filterToggle = document.querySelector('[data-filter-toggle]');
  if (filterToggle) {
    filterToggle.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('is-open');
    });
  }

  await CartStore.load();
  updateCartBadge();
}
