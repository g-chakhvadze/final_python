/* =========================================================
   cart-service.js
   ერთი ინტერფეისი ორი საცავისთვის:
     • EverREST-ის ნივთები + ავტორიზებული მომხმარებელი → /shop/cart
     • ლოკალური კატალოგის ნივთები (local-…) და სტუმარი → localStorage
   ყოველი ცვლილების შემდეგ მდგომარეობა თავიდან იკრიბება ორივე წყაროდან.
   ========================================================= */

const GUEST_KEY = 'er_guest_cart';

const isLocalProduct = (id) => typeof id === 'string' && id.startsWith('local-');

const CartStore = {
  state: emptyCart(),

  /** ეს კონკრეტული ნივთი სერვერზე ინახება თუ ბრაუზერში? */
  usesServer(productId) {
    return Session.isAuthed && !isLocalProduct(productId);
  },

  /* ---------- წაკითხვა ---------- */
  async load() {
    let server = emptyCart();

    if (Session.isAuthed) {
      try {
        server = normalize(await API.cart.get());
      } catch (err) {
        if (err.status === 401) Session.clear();
        else if (err.status !== 404 && err.status !== 400) console.warn('cart load:', err.message);
      }
    }

    const guest = readGuest();
    const guestRows = Session.isAuthed
      ? guest.products.filter((p) => isLocalProduct(p.productId))
      : guest.products;

    const products = [...server.products, ...guestRows];
    this.state = { _id: server._id, products, total: recalc(products) };
    emitChange();
    return this.state;
  },

  quantityOf(productId) {
    const row = this.state.products.find((p) => p.productId === productId);
    return row ? row.quantity : 0;
  },

  get itemCount() {
    return this.state.products.reduce((n, p) => n + (p.quantity || 0), 0);
  },

  /** კალათაში არის თუ არა სერვერზე შესანახი ნივთი */
  get hasServerItems() {
    return this.state.products.some((p) => !isLocalProduct(p.productId));
  },

  /* ---------- ჩაწერა ---------- */

  /** დაამატებს `qty` ცალს არსებულ რაოდენობაზე */
  async add(product, qty = 1) {
    return this.setQuantity(product, this.quantityOf(product._id) + qty);
  },

  /** დააყენებს ნივთის ზუსტ რაოდენობას */
  async setQuantity(product, qty) {
    const id = product._id;
    if (qty <= 0) return this.remove(id);

    if (this.usesServer(id)) {
      try {
        // PATCH მუშაობს, როცა კალათა უკვე არსებობს …
        await API.cart.update(id, qty);
      } catch (err) {
        if (err.status === 401) {
          Session.clear();
          return this.setQuantity(product, qty); // ხელახლა, როგორც სტუმარი
        }
        // … წინააღმდეგ შემთხვევაში ჯერ უნდა შეიქმნას
        await API.cart.create(id, qty);
      }
    } else {
      writeGuestRow(id, qty, product);
    }
    return this.load();
  },

  async remove(productId) {
    if (this.usesServer(productId)) {
      try {
        await API.cart.removeProduct(productId);
      } catch (err) {
        if (err.status !== 404) throw err;
      }
    } else {
      const cart = readGuest();
      cart.products = cart.products.filter((p) => p.productId !== productId);
      writeGuest(cart);
    }
    return this.load();
  },

  async clear() {
    if (Session.isAuthed) {
      try {
        await API.cart.clear();
      } catch (err) {
        if (err.status !== 404) console.warn('cart clear:', err.message);
      }
    }
    writeGuest(emptyCart());
    return this.load();
  },

  /**
   * შეკვეთის გაფორმება.
   * სერვერის ნივთებს ამუშავებს /shop/cart/checkout, ლოკალურ (სადემონსტრაციო)
   * ნივთებს კი უბრალოდ ასუფთავებს ბრაუზერის კალათიდან.
   */
  async checkout() {
    let message = '';

    if (this.hasServerItems) {
      if (!Session.isAuthed) throw new ApiError(401, { message: 'შეკვეთისთვის გაიარეთ ავტორიზაცია' });
      const res = await API.cart.checkout();
      message = res.message || 'შეკვეთა გაფორმდა';
    } else {
      message = 'შეკვეთა გაფორმდა (ლოკალური კატალოგი — სადემონსტრაციო რეჟიმი)';
    }

    writeGuest(emptyCart());
    await this.load();
    return { success: true, message };
  },

  /** სტუმრის კალათის გადატანა სერვერზე შესვლის შემდეგ (ლოკალური ნივთების გარდა) */
  async mergeGuestCart() {
    if (!Session.isAuthed) return;
    const guest = readGuest();
    const toMove = guest.products.filter((p) => !isLocalProduct(p.productId));
    if (!toMove.length) return;

    for (const row of toMove) {
      try {
        await API.cart.update(row.productId, row.quantity);
      } catch {
        try {
          await API.cart.create(row.productId, row.quantity);
        } catch {
          /* ნივთი შესაძლოა აღარ იყოს მარაგში — გამოვტოვოთ */
        }
      }
    }
    writeGuest({ products: guest.products.filter((p) => isLocalProduct(p.productId)) });
    await this.load();
  },
};

/* ---------- დამხმარე ფუნქციები ---------- */
function pid(row) {
  return typeof row.productId === 'object' ? row.productId?._id : row.productId;
}

function emptyCart() {
  return {
    products: [],
    total: { price: { current: 0, beforeDiscount: 0 }, quantity: 0, products: 0 },
  };
}

function normalize(data) {
  if (!data || !Array.isArray(data.products)) return emptyCart();
  const products = data.products.map((p) => ({
    productId: pid(p),
    quantity: p.quantity,
    pricePerQuantity: p.pricePerQuantity,
    beforeDiscountPrice: p.beforeDiscountPrice,
  }));
  return { _id: data._id, products, total: recalc(products) };
}

function recalc(products) {
  const current = products.reduce((s, p) => s + (p.pricePerQuantity || 0) * p.quantity, 0);
  const before = products.reduce(
    (s, p) => s + (p.beforeDiscountPrice ?? p.pricePerQuantity ?? 0) * p.quantity,
    0
  );
  return {
    price: { current: round2(current), beforeDiscount: round2(before) },
    quantity: products.reduce((s, p) => s + p.quantity, 0),
    products: products.length,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function readGuest() {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null');
    if (!raw || !Array.isArray(raw.products)) return emptyCart();
    return { products: raw.products, total: recalc(raw.products) };
  } catch {
    return emptyCart();
  }
}

function writeGuest(cart) {
  localStorage.setItem(GUEST_KEY, JSON.stringify({ products: cart.products || [] }));
  return { products: cart.products || [], total: recalc(cart.products || []) };
}

function writeGuestRow(id, qty, product) {
  const cart = readGuest();
  const row = cart.products.find((p) => p.productId === id);
  const unit = product.price?.current ?? 0;
  const before = product.price?.beforeDiscount ?? unit;
  if (row) {
    row.quantity = qty;
    row.pricePerQuantity = unit;
    row.beforeDiscountPrice = before;
  } else {
    cart.products.push({ productId: id, quantity: qty, pricePerQuantity: unit, beforeDiscountPrice: before });
  }
  return writeGuest(cart);
}

function emitChange() {
  document.dispatchEvent(new CustomEvent('cart:change', { detail: CartStore.state }));
}
