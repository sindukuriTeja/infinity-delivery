/* ============================================================================
   INFINITY DELIVERY — app.js
   Vanilla JS single-page app for the Chilakaluripet groceries platform.
   ============================================================================ */
(function () {
"use strict";

const API = "/api";
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const inr = (n) => "₹" + (Math.round(n * 100) / 100).toLocaleString("en-IN");

/* Render a product image: real photo if present, else the emoji fallback. */
const img = (v, cls = "") =>
  v && v.startsWith("/")
    ? `<img class="p-photo ${cls}" src="${v}" alt="" loading="lazy"
        onerror="this.onerror=null;this.outerHTML='<span class=&quot;ph-emoji ${cls}&quot;>🛒</span>'">`
    : `<span class="ph-emoji ${cls}">${v || ""}</span>`;

/* ---------------- STATE ---------------- */
const state = {
  categories: [],
  products: [],
  promos: [],
  zones: [],
  stats: null,
  users: [],
  activeCat: "all",
  filter: "all",
  sort: "popular",
  search: "",
  cart: JSON.parse(localStorage.getItem("id_cart") || "[]"),
  zone: JSON.parse(localStorage.getItem("id_zone") || "null"),
  lang: localStorage.getItem("id_lang") || "en",
  currentUser: 1,
  mdTab: "overview",
  adTab: "overview",
  shops: [],
  activeShop: 1,
};

/* ---------------- API ---------------- */
async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json", ...(localStorage.id_token ? {Authorization: "Bearer " + localStorage.id_token} : {}) },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { localStorage.removeItem("id_token"); localStorage.removeItem("id_account"); location.hash="#/login"; }
  if (!res.ok) throw new Error(data.error || res.status);
  return data;
}
function toast(msg, type = "") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show " + type;
  clearTimeout(t._t);
  t._t = setTimeout(() => (t.className = "toast"), 2600);
}

/* ---------------- CART ---------------- */
function saveCart() { localStorage.setItem("id_cart", JSON.stringify(state.cart)); }
function cartCount() { return state.cart.reduce((a, c) => a + c.qty, 0); }
function cartSubtotal() {
  return state.cart.reduce((a, c) => {
    const p = state.products.find(x => x.id === c.id);
    return a + (p ? p.price * c.qty : 0);
  }, 0);
}
function cartMrp() {
  return state.cart.reduce((a, c) => {
    const p = state.products.find(x => x.id === c.id);
    return a + (p ? (p.mrp || p.price) * c.qty : 0);
  }, 0);
}
function addToCart(id) {
  const it = state.cart.find(c => c.id === id);
  if (it) { it.qty++; } else { state.cart.push({ id, qty: 1 }); }
  saveCart(); renderCartBadge(); renderCart();
  const p = state.products.find(x => x.id === id);
  if (p) toast("Added " + p.name + " to cart", "success");
}
function setQty(id, qty) {
  const it = state.cart.find(c => c.id === id);
  if (!it) return;
  it.qty = qty;
  if (it.qty <= 0) state.cart = state.cart.filter(c => c.id !== id);
  saveCart(); renderCartBadge(); renderCart(); renderProducts();
}
function renderCartBadge() {
  const count = cartCount();
  const badge = $("#cartBadge");
  badge.textContent = count;
  badge.style.display = count > 0 ? "" : "none";
  $("#cartTotal").textContent = count > 0 ? inr(cartSubtotal()) : "";
}

/* ---------------- RENDER: HERO STATS ---------------- */
function renderHeroStats() {
  const s = state.stats || {};
  $("#heroStats").innerHTML = `
    <div class="hs"><b>${s.products || "146"}+</b><span>Products</span></div>
    <div class="hs"><b>30 min</b><span>Delivery</span></div>
    <div class="hs"><b>${s.zones || 53}</b><span>Zones Covered</span></div>
    <div class="hs"><b>${s.fresh_products || 40}+</b><span>Farm Fresh</span></div>`;
}

/* ---------------- RENDER: PROMOS ---------------- */
function renderPromos() {
  const icons = { WELCOME50: "🎉", FRESH20: "🥦", PLUSFREE: "⭐", BULK10: "📦", MONDAY15: "📅", FESTIVE25: "🪔" };
  $("#promoStrip").innerHTML = state.promos.slice(0, 3).map(p => `
    <div class="promo-card">
      <span class="promo-emoji">${icons[p.code] || "🏷️"}</span>
      <div><b>${p.description.split("(")[0].trim()}</b><small>Min order ${inr(p.min_order)}</small></div>
      <span class="promo-code">${p.code}</span>
    </div>`).join("");
}

/* ---------------- RENDER: SHOP (shop name + details, then its products) ---------------- */
function renderShop() {
  const head = $("#shopHead"), tabs = $("#shopTabs");
  if (!head) return;
  const shop = state.shops.find(s => s.id === state.activeShop) || state.shops[0];
  if (!shop) { head.innerHTML = ""; tabs.innerHTML = ""; return; }
  state.activeShop = shop.id;
  const zones = Array.isArray(shop.zone_ids) ? shop.zone_ids : [];
  head.innerHTML = `
    <div class="shop-ident">
      <div class="shop-logo">🏪</div>
      <div class="shop-ident-txt">
        <div class="shop-name">${shop.name}${shop.is_default ? ' <span class="shop-flag">Flagship</span>' : ""}</div>
        <div class="shop-name-te">${shop.name_te || ""}</div>
        <div class="shop-meta">
          <span class="shop-chip">🕒 ${shop.open_hours || "7:00 AM – 10:00 PM"}</span>
          ${shop.phone ? `<span class="shop-chip">📞 ${shop.phone}</span>` : ""}
          ${shop.address ? `<span class="shop-chip">📍 ${shop.address}</span>` : ""}
          <span class="shop-chip">🚚 ${zones.length} zones</span>
        </div>
      </div>
    </div>
    <div class="shop-count">${shop.product_count || 0} products</div>`;
  // shop switcher tabs (shown when there is more than one shop)
  if (state.shops.length > 1) {
    tabs.innerHTML = state.shops.map(s => `
      <button type="button" class="shop-tab ${s.id === shop.id ? "active" : ""}" data-shop="${s.id}">
        <span class="st-name">${s.name}</span><span class="st-count">${s.product_count || 0}</span>
      </button>`).join("");
    $$("#shopTabs .shop-tab").forEach(b => b.onclick = () => {
      state.activeShop = +b.dataset.shop;
      state.activeCat = "all"; state.filter = "all"; state.search = "";
      $("#searchInput").value = "";
      renderShop(); renderCategories(); loadProducts();
    });
  } else {
    tabs.innerHTML = "";
  }
}

/* ---------------- RENDER: CATEGORIES ---------------- */
function renderCategories() {
  const all = [{ id: 0, name: "All", name_te: "అందటి", slug: "all", icon: "🛒", product_count: state.products.length }];
  const list = all.concat(state.categories);
  $("#catChips").innerHTML = list.map(c => `
    <button type="button" class="cat-chip ${state.activeCat === c.slug ? "active" : ""}" data-cat="${c.slug}">
      <span class="ci">${c.icon}</span>
      <span class="cn">${c.name}</span>
    </button>`).join("");
  $$("#catChips .cat-chip").forEach(b => b.onclick = () => {
    state.activeCat = b.dataset.cat;
    renderCategories(); loadProducts();
  });
}

/* ---------------- RENDER: PRODUCTS ---------------- */
function productCard(p) {
  const off = p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  const inCart = state.cart.find(c => c.id === p.id);
  const outOfStock = p.stock <= 0;
  const ctrl = outOfStock
    ? `<span class="out-stock">Out of stock</span>`
    : inCart
      ? `<div class="qty-ctrl"><button type="button" data-dec="${p.id}">−</button><span>${inCart.qty}</span><button type="button" data-inc="${p.id}">+</button></div>`
      : `<button type="button" class="add-btn" data-add="${p.id}" aria-label="Add to cart">+</button>`;
  return `
  <div class="p-card" data-pid="${p.id}">
    <div class="p-img">${img(p.image)}
      ${p.is_fresh ? '<span class="p-badge">FRESH</span>' : p.is_best_seller ? '<span class="p-badge best">BEST</span>' : ""}
      ${off ? `<span class="p-off">${off}% OFF</span>` : ""}
    </div>
    <div class="p-body">
      <div class="p-name">${p.name}</div>
      <div class="p-name-te">${p.name_te || ""}</div>
      <div class="p-brand">${p.brand || ""} · ${p.unit}</div>
      <div class="p-meta">
        ${p.avg_rating ? `<span class="p-rate">★ ${p.avg_rating} <span class="n">(${p.review_count})</span></span>` : ""}
      </div>
      <div class="p-foot">
        <div class="p-price">
          <b>${inr(p.price)}</b>
          ${p.mrp && p.mrp > p.price ? `<s>${inr(p.mrp)}</s>` : ""}
          ${p.mandi_price ? `<span class="mandi-tag">Mandi ${inr(p.mandi_price)}</span>` : ""}
        </div>
        ${ctrl}
      </div>
    </div>
  </div>`;
}
function renderProducts() {
  let list = state.products.slice();
  if (state.activeCat !== "all") list = list.filter(p => p.category_slug === state.activeCat);
  if (state.filter === "fresh") list = list.filter(p => p.is_fresh);
  else if (state.filter === "best") list = list.filter(p => p.is_best_seller);
  else if (state.filter === "offers") list = list.filter(p => p.mrp && p.mrp > p.price);
  if (state.search) {
    const q = state.search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) ||
      (p.name_te || "").includes(state.search) || (p.brand || "").toLowerCase().includes(q));
  }
  $("#productGrid").innerHTML = list.map(productCard).join("");
  $("#resultsCount").textContent = list.length + " items";
  $("#emptyState").hidden = list.length > 0;
  $("#productGrid").style.display = list.length ? "" : "none";

  const titles = { all: "All Products", fresh: "Farm Fresh", best: "Best Sellers", offers: "Offers" };
  $("#resultsTitle").textContent = state.activeCat === "all"
    ? (titles[state.filter] || "All Products")
    : (state.categories.find(c => c.slug === state.activeCat) || {}).name || "Products";

  // bind button events
  $$("#productGrid [data-add]").forEach(b => b.onclick = e => { e.stopPropagation(); addToCart(+b.dataset.add); });
  $$("#productGrid [data-inc]").forEach(b => b.onclick = e => { e.stopPropagation(); addToCart(+b.dataset.inc); });
  $$("#productGrid [data-dec]").forEach(b => b.onclick = e => {
    e.stopPropagation();
    const it = state.cart.find(c => c.id === +b.dataset.dec);
    if (it) setQty(+b.dataset.dec, it.qty - 1);
  });
  $$("#productGrid .p-card").forEach(c => c.onclick = () => openProduct(+c.dataset.pid));
}
async function loadProducts() {
  const p = new URLSearchParams();
  if (state.activeShop) p.set("shop", state.activeShop);
  if (state.activeCat !== "all") p.set("category", state.activeCat);
  if (state.filter === "fresh") p.set("fresh", "1");
  if (state.filter === "best") p.set("best", "1");
  if (state.search) p.set("q", state.search);
  p.set("sort", state.sort);
  p.set("limit", "200");
  state.products = await api("/products?" + p);
  renderProducts();
}

/* ---------------- RENDER: CART ---------------- */
function renderCart() {
  const body = $("#cartBody"), foot = $("#cartFoot");
  if (!state.cart.length) {
    body.innerHTML = `<div class="cart-empty"><div class="ce-em">🛒</div><p>Your cart is empty.<br>Add fresh groceries!</p></div>`;
    foot.innerHTML = "";
    return;
  }
  body.innerHTML = state.cart.map(c => {
    const p = state.products.find(x => x.id === c.id);
    if (!p) return "";
    return `
    <div class="cart-item">
      <div class="ci-em">${img(p.image, "ci")}</div>
      <div class="ci-info">
        <div class="ci-name">${p.name}</div>
        <div class="ci-price">${inr(p.price)} · ${p.unit}</div>
        <div class="ci-ctrl">
          <button type="button" data-cdec="${p.id}">−</button>
          <span class="ci-qty">${c.qty}</span>
          <button type="button" data-cinc="${p.id}">+</button>
        </div>
      </div>
      <div class="ci-line">${inr(p.price * c.qty)}</div>
    </div>`;
  }).join("");
  const sub = cartSubtotal(), mrp = cartMrp(), save = mrp - sub;
  const fee = state.zone ? (state.zone.delivery_fee || 0) : 0;
  const total = sub + fee;
  foot.innerHTML = `
    <div class="cart-line"><span>Subtotal</span><span>${inr(sub)}</span></div>
    ${save > 0 ? `<div class="cart-line"><span>You save</span><span class="save">−${inr(save)}</span></div>` : ""}
    <div class="cart-line"><span>Delivery</span><span id="cartDelivery">${fee > 0 ? inr(fee) : "—"}</span></div>
    <div class="cart-line total"><span>Total (excl. GST)</span><span>${inr(total)}</span></div>
    <button type="button" class="checkout-btn" id="goCheckout">Proceed to Checkout →</button>`;
  $$("#cartBody [data-cinc]").forEach(b => b.onclick = () => addToCart(+b.dataset.cinc));
  $$("#cartBody [data-cdec]").forEach(b => b.onclick = () => {
    const it = state.cart.find(c => c.id === +b.dataset.cdec);
    if (it) setQty(+b.dataset.cdec, it.qty - 1);
  });
  $("#goCheckout").onclick = () => openCheckout();
}

/* ---------------- DRAWER ---------------- */
function openDrawer() { $("#cartDrawer").classList.add("open"); $("#drawerOverlay").classList.add("open"); }
function closeDrawer() { $("#cartDrawer").classList.remove("open"); $("#drawerOverlay").classList.remove("open"); }

/* ---------------- PRODUCT DETAIL ---------------- */
async function openProduct(pid) {
  try {
    const p = await api("/products/" + pid);
    const off = p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
    const stars = (n) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
    const outOfStock = p.stock <= 0;
    $("#prodBody").innerHTML = `
      <div class="pd-hero">${img(p.image, "hero")}</div>
      <div class="pd-body">
        <div class="pd-name">${p.name}</div>
        <div class="pd-name-te">${p.name_te || ""}</div>
        <div class="pd-meta">
          <span class="pd-tag">${p.category_name}</span>
          <span class="pd-tag">${p.brand || ""} · ${p.unit}</span>
          ${p.is_fresh ? '<span class="pd-tag fresh">🌱 Farm Fresh</span>' : ""}
          ${p.is_best_seller ? '<span class="pd-tag best">⭐ Best Seller</span>' : ""}
          ${p.avg_rating ? `<span class="pd-tag">★ ${p.avg_rating} (${p.review_count} reviews)</span>` : ""}
          ${outOfStock ? '<span class="pd-tag" style="background:var(--red-soft);color:var(--red)">Out of Stock</span>' : ""}
        </div>
        <div class="pd-price">
          <b>${inr(p.price)}</b>
          ${p.mrp && p.mrp > p.price ? `<s>${inr(p.mrp)}</s><span class="off">${off}% OFF</span>` : ""}
        </div>
        ${p.mandi_price ? `<div class="pd-mandi">📊 <b>Mandi price today:</b> ${inr(p.mandi_price)}/${p.unit} — we sell at ${inr(p.price)}, sourced fresh from Chilakaluripet APMC.</div>` : ""}
        ${outOfStock
          ? `<button type="button" class="place-btn" disabled style="opacity:.5;cursor:not-allowed">Out of Stock</button>`
          : `<button type="button" class="place-btn" data-pdadd="${p.id}">Add to Cart · ${inr(p.price)}</button>`}
        <div class="pd-reviews">
          <h4>Customer Reviews</h4>
          ${p.reviews.length ? p.reviews.map(r => `
            <div class="review">
              <div class="rh"><b>${r.full_name}</b><span class="stars">${stars(r.rating)}</span></div>
              <p>${r.comment}</p>
            </div>`).join("") : '<p style="color:var(--muted)">No reviews yet.</p>'}
        </div>
      </div>`;
    $("#prodOverlay").classList.add("open");
    const addBtn = $("#prodBody [data-pdadd]");
    if (addBtn) {
      addBtn.onclick = () => {
        addToCart(p.id);
        $("#prodOverlay").classList.remove("open");
        openDrawer();
      };
    }
  } catch (e) {
    toast("Could not load product", "error");
  }
}
function closeProduct() { $("#prodOverlay").classList.remove("open"); }

/* ---------------- MANDI ---------------- */
async function loadMandi() {
  try {
    const data = await api("/mandi-prices");
    const arrow = { up: "▲", down: "▼", same: "▬" };
    $("#mandiGrid").innerHTML = data.map(m => `
      <div class="mandi-card">
        <div class="mandi-top"><b>${m.commodity}</b><span class="mandi-unit">/ ${m.unit}</span></div>
        <div class="mandi-price">${inr(m.price)} <small>avg</small></div>
        <div class="mandi-range">Range ${inr(m.min_price)} – ${inr(m.max_price)}</div>
        <div style="margin-top:10px"><span class="trend ${m.trend}">${arrow[m.trend]} ${m.trend === "up" ? "Rising" : m.trend === "down" ? "Falling" : "Stable"}</span></div>
      </div>`).join("");
  } catch (e) {
    $("#mandiGrid").innerHTML = `<p style="color:var(--muted);padding:20px">Could not load mandi prices.</p>`;
  }
}

/* ---------------- ORDERS ---------------- */
async function loadUsers() {
  try {
    const users = await api("/users");
    state.users = users.map(u => ({ id: u.id, name: u.full_name, plus: !!u.is_plus }));
    if (!state.users.find(u => u.id === state.currentUser)) state.currentUser = state.users[0] ? state.users[0].id : 1;
    renderUserPicker();
    await loadOrders();
  } catch (e) {
    toast("Could not load users", "error");
  }
}
/* True if the current user is an Infinity Plus member (free delivery). */
const currentUserIsPlus = () => {
  const u = state.users.find(x => x.id === state.currentUser);
  return !!(u && u.plus);
};
function renderUserPicker() {
  $("#userPicker").innerHTML = state.users.map(u =>
    `<button type="button" class="user-chip ${state.currentUser === u.id ? "active" : ""}" data-u="${u.id}">${u.name}</button>`).join("");
  $$("#userPicker .user-chip").forEach(b => b.onclick = () => {
    state.currentUser = +b.dataset.u;
    renderUserPicker();
    loadOrders();
  });
}
async function loadOrders() {
  const list = $("#ordersList");
  list.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div><p>Loading orders…</p></div>`;
  try {
    const orders = await api("/orders?user_id=" + state.currentUser);
    if (!orders.length) {
      list.innerHTML = `<div class="empty"><div class="empty-emoji">📦</div><p>No orders yet. Start shopping!</p></div>`;
      return;
    }
    list.innerHTML = orders.map(o => {
      const next = { placed: "confirmed", confirmed: "packed", packed: "out_for_delivery", out_for_delivery: "delivered" }[o.status];
      const statusLabel = o.status.replace(/_/g, " ");
      return `
      <div class="order-card">
        <div class="order-head">
          <div><div class="order-no">${o.order_no}</div><div class="order-date">${o.placed_at} · ${o.zone_name || "Chilakaluripet"}</div></div>
          <span class="status-pill ${o.status}">${statusLabel}</span>
        </div>
        <div class="order-body">
          <div class="order-items" data-oid="${o.id}"><div class="oi-loading">Loading items…</div></div>
          <div class="order-foot">
            <span>Subtotal <b>${inr(o.subtotal)}</b></span>
            ${o.discount ? `<span>Discount <b style="color:var(--green)">−${inr(o.discount)}</b></span>` : ""}
            <span>Delivery <b>${inr(o.delivery_fee)}</b></span>
            <span>GST <b>${inr(o.gst)}</b></span>
            <span style="margin-left:auto">Total <b style="font-size:16px">${inr(o.total)}</b></span>
            <span>${o.payment_mode.toUpperCase()}</span>
          </div>
          ${next ? `<div class="order-actions"><button type="button" class="status-btn primary" data-next="${o.id}:${next}">Mark as ${next.replace(/_/g, " ")} →</button></div>` : ""}
        </div>
      </div>`;
    }).join("");

    // load items for each order in parallel
    await Promise.all(orders.map(async o => {
      try {
        const det = await api("/orders/" + o.id);
        const box = $(`.order-items[data-oid="${o.id}"]`);
        if (box) box.innerHTML = det.items.map(i =>
          `<div class="oi">${img(i.image, "oi")}<span class="nm">${i.name}</span><span class="qt">× ${i.qty}</span><span class="lt">${inr(i.line_total)}</span></div>`).join("");
      } catch (_) {}
    }));

    $$("#ordersList [data-next]").forEach(b => b.onclick = async () => {
      const [id, st] = b.dataset.next.split(":");
      b.disabled = true;
      try {
        await api(`/orders/${id}/status`, { method: "POST", body: { status: st } });
        toast("Order " + st.replace(/_/g, " "), "success");
        loadOrders();
      } catch (e) {
        toast("Error: " + e.message, "error");
        b.disabled = false;
      }
    });
  } catch (e) {
    list.innerHTML = `<div class="empty"><div class="empty-emoji">⚠️</div><p>Could not load orders.</p></div>`;
  }
}

/* (admin dashboard now lives in the ROLES section below — renderAdminTab) */

/* ---------------- CHECKOUT ---------------- */
function openCheckout() {
  if (!state.cart.length) return;
  closeDrawer();
  const sub = cartSubtotal();
  const body = $("#checkoutBody");

  // find the user object matching state.currentUser
  const user = state.users.find(u => u.id === state.currentUser);
  const userName = user ? user.name : "Guest";

  body.innerHTML = `
    <h2>Checkout</h2>
    <div class="sub">Complete your order for delivery in Chilakaluripet</div>
    <div class="field"><label>Full Name</label><input id="coName" value="${userName}"></div>
    <div class="field"><label>Phone</label><input id="coPhone" placeholder="Enter phone number"></div>
    <div class="field"><label>Delivery Address</label><input id="coAddr" placeholder="House no, Street, Area"></div>
    <div class="field"><label>Delivery Zone</label>
      <select id="coZone">${state.zones.map(z => `<option value="${z.id}" ${state.zone && state.zone.id === z.id ? "selected" : ""}>${z.name} · ${z.sla_minutes} min · ${(currentUserIsPlus() || z.delivery_fee <= 0) ? "Free" : inr(z.delivery_fee)}</option>`).join("")}</select>
    </div>
    <div class="field"><label>Payment Method</label>
      <div class="pay-grid" id="payGrid">
        <div class="pay-opt active" data-pay="upi"><span class="pe">📱</span>UPI</div>
        <div class="pay-opt" data-pay="card"><span class="pe">💳</span>Card</div>
        <div class="pay-opt" data-pay="cod"><span class="pe">💵</span>COD</div>
        <div class="pay-opt" data-pay="wallet"><span class="pe">👛</span>Wallet</div>
      </div>
    </div>
    <div class="field"><label>Promo Code (optional)</label>
      <div class="promo-input"><input id="coPromo" placeholder="e.g. WELCOME50"><button type="button" id="applyPromo">Apply</button></div>
      <div class="promo-msg" id="promoMsg"></div>
    </div>
    <div class="summary-box" id="coSummary"></div>
    <div class="upi-panel" id="upiPanel" hidden>
      <div class="upi-head">
        <span class="upi-title">📲 Pay with UPI</span>
        <span class="upi-amt" id="upiAmt"></span>
      </div>
      <div class="upi-qr" id="upiQr"></div>
      <div class="upi-vpa-row">
        <span class="upi-vpa-label">UPI ID</span>
        <span class="upi-vpa" id="upiVpa"></span>
        <button type="button" class="upi-copy" id="upiCopy">Copy</button>
      </div>
      <div class="upi-apps">
        <span class="upi-apps-label">Or tap to pay with your app</span>
        <div class="upi-app-grid">
          <button type="button" class="upi-app gp" data-app="gpay"><span class="aa">📱</span>GPay</button>
          <button type="button" class="upi-app pp" data-app="phonepe"><span class="aa">📲</span>PhonePe</button>
          <button type="button" class="upi-app pt" data-app="paytm"><span class="aa">💜</span>Paytm</button>
          <button type="button" class="upi-app bh" data-app="bhim"><span class="aa">🇮🇳</span>BHIM</button>
        </div>
      </div>
      <p class="upi-hint">Tap an app to pay <b id="upiAmt2"></b> in it, or scan the QR with any UPI app. The money goes to <b>8500116578</b>.</p>
      <label class="upi-confirm">
        <input type="checkbox" id="upiPaid">
        <span>I have paid the amount above ✓</span>
      </label>
    </div>
    <div class="upi-panel cod-panel" id="codPanel" hidden>
      <p class="upi-hint">💵 <b>Cash on Delivery</b> — pay the delivery person when your order arrives. No advance payment needed.</p>
    </div>
    <button type="button" class="place-btn" id="placeOrder">Place Order · ${inr(sub)}</button>`;

  let pay = "upi", promoDiscount = 0, promoCode = null;
  const getSelectedZone = () => state.zones.find(x => x.id === +$("#coZone").value);
  const zoneFee = () => {
    const z = getSelectedZone();
    if (!z) return 0;
    return currentUserIsPlus() ? 0 : (z.delivery_fee || 0);  // Plus = free delivery
  };
  /* Must mirror the backend formula in app.py exactly (subtotal rounded first,
     then GST rounded), so the amount on the QR always equals the amount the
     server actually charges. */
  const currentTotal = () => {
    const fee = zoneFee();
    const subtotal = Math.round(sub * 100) / 100;
    const taxable = subtotal - promoDiscount;
    const gst = Math.round(taxable * 0.05 * 100) / 100;
    return Math.round((taxable + fee + gst) * 100) / 100;
  };

  /* ---- UPI QR (pays to 8500116578) ---- */
  const UPI_VPA = "8500116578@upi";
  let qr = null;
  const upiUrl = (total) =>
    "upi://pay?pa=" + UPI_VPA + "&pn=" + encodeURIComponent("Infinity Delivery") +
    "&am=" + total.toFixed(2) + "&cu=INR&tn=" + encodeURIComponent("Infinity Delivery order");
  function renderUpi(total) {
    const panel = $("#upiPanel");
    panel.hidden = false;
    $("#upiAmt").textContent = inr(total);
    $("#upiAmt2").textContent = inr(total);
    $("#upiVpa").textContent = UPI_VPA;
    const box = $("#upiQr");
    box.innerHTML = "";
    qr = new QRCode(box, { text: upiUrl(total), width: 200, height: 200,
      correctLevel: QRCode.CorrectLevel.M });
  }
  function refreshPayPanel() {
    const upiPanel = $("#upiPanel"), codPanel = $("#codPanel");
    upiPanel.hidden = pay !== "upi";
    codPanel.hidden = pay !== "cod";
    if (pay === "upi") renderUpi(currentTotal());
    updatePlaceBtn();
  }
  function updatePlaceBtn() {
    const btn = $("#placeOrder");
    const paid = $("#upiPaid").checked;
    if (pay === "upi" && !paid) {
      btn.disabled = true;
      btn.textContent = "Scan QR & tick “I have paid” to continue";
    } else {
      btn.disabled = false;
      btn.textContent = "Place Order · " + inr(currentTotal());
    }
  }

  const renderSummary = () => {
    const fee = zoneFee();
    const taxable = sub - promoDiscount;
    const gst = Math.round(taxable * 0.05 * 100) / 100;
    const total = Math.round((taxable + fee + gst) * 100) / 100;
    $("#coSummary").innerHTML = `
      <div class="cart-line"><span>Subtotal</span><span>${inr(sub)}</span></div>
      ${promoDiscount ? `<div class="cart-line"><span>Promo (${promoCode})</span><span class="save">−${inr(promoDiscount)}</span></div>` : ""}
      <div class="cart-line"><span>Delivery</span><span>${fee > 0 ? inr(fee) : "Free"}</span></div>
      <div class="cart-line"><span>GST (5%)</span><span>${inr(gst)}</span></div>
      <div class="cart-line total"><span>Total</span><span>${inr(total)}</span></div>`;
    refreshPayPanel();
  };
  renderSummary();

  $$("#payGrid .pay-opt").forEach(o => o.onclick = () => {
    $$("#payGrid .pay-opt").forEach(x => x.classList.remove("active"));
    o.classList.add("active");
    pay = o.dataset.pay;
    refreshPayPanel();
  });
  $("#upiCopy").onclick = () => {
    const done = () => toast("UPI ID copied: " + UPI_VPA, "success");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(UPI_VPA).then(done).catch(done);
    } else { done(); }
  };
  $("#upiPaid").onchange = () => updatePlaceBtn();
  // Tap-to-pay: launch the customer's UPI app with the exact amount pre-filled.
  // All UPI apps (GPay / PhonePe / Paytm / BHIM) register to handle the
  // standard upi:// intent, so firing it opens the app on the phone.
  $$("#upiPanel .upi-app").forEach(b => b.onclick = () => {
    const appName = b.querySelector(".aa") ? b.childNodes[b.childNodes.length - 1].textContent.trim() : b.textContent.trim();
    const url = upiUrl(currentTotal());
    const a = document.createElement("a");
    a.href = url; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    toast("Opening " + appName + " to pay " + inr(currentTotal()) +
      " — complete the payment, then tick “I have paid”", "success");
  });
  $("#coZone").onchange = () => {
    const z = getSelectedZone();
    if (z) { state.zone = z; localStorage.setItem("id_zone", JSON.stringify(z)); }
    renderSummary();
  };
  $("#applyPromo").onclick = async () => {
    const code = $("#coPromo").value.trim();
    const msg = $("#promoMsg");
    if (!code) return;
    try {
      const r = await api("/promos/validate", { method: "POST", body: { code, subtotal: sub } });
      promoDiscount = r.discount; promoCode = code;
      msg.textContent = "✓ " + r.description + " (−" + inr(r.discount) + ")";
      msg.className = "promo-msg ok";
      renderSummary();
    } catch (e) {
      msg.textContent = "✕ " + e.message;
      msg.className = "promo-msg err";
    }
  };
  $("#placeOrder").onclick = async () => {
    const btn = $("#placeOrder");
    const selectedZone = getSelectedZone();
    btn.disabled = true; btn.textContent = "Placing order…";
    try {
      const r = await api("/orders", { method: "POST", body: {
        user_id: state.currentUser,
        address_id: null,
        zone_id: selectedZone ? selectedZone.id : null,
        payment_mode: pay,
        promo_code: promoCode,
        items: state.cart.map(c => ({ product_id: c.id, qty: c.qty })),
      }});
      state.cart = [];
      saveCart(); renderCartBadge(); renderCart();
      $("#checkoutOverlay").classList.remove("open");
      toast("🎉 Order " + r.order_no + " placed! Total " + inr(r.total), "success");
      loadProducts();
      if (location.hash.includes("orders")) loadOrders();
    } catch (e) {
      toast("Error: " + e.message, "error");
      updatePlaceBtn();
    }
  };
  $("#checkoutOverlay").classList.add("open");
}
function closeCheckout() { $("#checkoutOverlay").classList.remove("open"); }

/* ---------------- LOCATION ---------------- */
function openLocation() {
  renderZones("ward");
  $("#locOverlay").classList.add("open");
}
function renderZones(type) {
  const list = state.zones.filter(z => z.type === type);
  $("#locList").innerHTML = list.map(z => `
    <div class="loc-item ${state.zone && state.zone.id === z.id ? "active" : ""}" data-z="${z.id}">
      <div><div class="ln">${z.name}</div><div class="lm">PIN ${z.pincode} · ${z.type}</div></div>
      <span class="ls">${z.sla_minutes} min · ${z.delivery_fee > 0 ? inr(z.delivery_fee) : "Free"}</span>
    </div>`).join("");
  $$("#locList .loc-item").forEach(b => b.onclick = () => {
    const z = state.zones.find(x => x.id === +b.dataset.z);
    if (!z) return;
    state.zone = z;
    localStorage.setItem("id_zone", JSON.stringify(z));
    $("#locName").textContent = z.name + " · " + z.pincode;
    renderZones(type);
    $("#locOverlay").classList.remove("open");
    toast("Delivering to " + z.name, "success");
  });
}
function closeLocation() { $("#locOverlay").classList.remove("open"); }

/* ============================================================================
   ROLES — MERCHANT + ADMIN DASHBOARDS
   ============================================================================ */
const NEXT_STATUS = { placed:"confirmed", confirmed:"packed", packed:"out_for_delivery", out_for_delivery:"delivered" };
const STATUS_LABEL = s => s.replace(/_/g, " ");
const esc = (v) => (v == null ? "" : String(v).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])));

/* ---- generic CRUD modal ---- */
function openCrud({ title, sub, fields, values = {}, submitLabel = "Save", onSubmit }) {
  $("#crudBody").innerHTML = `
    <h3>${title}</h3>
    ${sub ? `<p class="crud-sub">${sub}</p>` : ""}
    <div class="form-grid">
      ${fields.map(f => {
        const v = values[f.key] != null ? values[f.key] : (f.def != null ? f.def : "");
        if (f.type === "select")
          return `<div class="field ${f.full ? "full" : ""}"><label>${f.label}</label>
            <select data-f="${f.key}">${f.options.map(o => `<option value="${o[0]}" ${String(o[0]) === String(v) ? "selected" : ""}>${o[1]}</option>`).join("")}</select></div>`;
        if (f.type === "textarea")
          return `<div class="field ${f.full ? "full" : ""}"><label>${f.label}</label><textarea data-f="${f.key}" rows="3">${esc(v)}</textarea></div>`;
        if (f.type === "checkbox")
          return `<div class="field check"><label><input type="checkbox" data-f="${f.key}" ${v ? "checked" : ""}> ${f.label}</label></div>`;
        return `<div class="field ${f.full ? "full" : ""}"><label>${f.label}</label><input data-f="${f.key}" type="${f.type || "text"}" value="${esc(v)}" ${f.ph ? `placeholder="${f.ph}"` : ""}></div>`;
      }).join("")}
    </div>
    <div class="crud-actions">
      <button type="button" class="btn-ghost" id="crudCancel">Cancel</button>
      <button type="button" class="btn-primary" id="crudSubmit">${submitLabel}</button>
    </div>`;
  $("#crudOverlay").classList.add("open");
  const read = () => {
    const o = {};
    $$("#crudBody [data-f]").forEach(el => {
      const k = el.dataset.f;
      if (el.type === "checkbox") o[k] = el.checked ? 1 : 0;
      else if (el.type === "number") o[k] = el.value === "" ? null : Number(el.value);
      else o[k] = el.value;
    });
    return o;
  };
  $("#crudCancel").onclick = closeCrud;
  $("#crudSubmit").onclick = async () => {
    const btn = $("#crudSubmit"); btn.disabled = true;
    try { await onSubmit(read()); closeCrud(); }
    catch (e) { toast(e.message, "error"); btn.disabled = false; }
  };
}
function closeCrud() { $("#crudOverlay").classList.remove("open"); }

/* ---- shared order card (merchant + admin) ---- */
function orderCard(o, { withMerchant = false, advance = true } = {}) {
  const next = NEXT_STATUS[o.status];
  return `
  <div class="order-card">
    <div class="order-head">
      <div>
        <div class="order-no">${o.order_no}</div>
        <div class="order-date">${o.placed_at} · ${esc(o.zone_name || "Chilakaluripet")}</div>
      </div>
      <span class="status-pill ${o.status}">${STATUS_LABEL(o.status)}</span>
    </div>
    <div class="order-body">
      <div class="order-items">
        ${(o.items || []).map(i => `<div class="oi">${img(i.image, "oi")}<span class="nm">${esc(i.name)}</span><span class="qt">× ${i.qty}</span><span class="lt">${inr(i.line_total)}</span></div>`).join("")}
      </div>
      <div class="order-foot">
        <span>👤 ${esc(o.full_name)}${o.phone ? " · " + esc(o.phone) : ""}</span>
        ${withMerchant && o.merchant_name ? `<span>🏪 ${esc(o.merchant_name)}</span>` : ""}
        <span style="margin-left:auto">Total <b style="font-size:16px">${inr(o.total)}</b></span>
        <span>${(o.payment_mode || "").toUpperCase()}</span>
      </div>
      ${advance && next ? `<div class="order-actions">
        <button type="button" class="status-btn primary" data-next="${o.id}:${next}">Mark as ${STATUS_LABEL(next)} →</button>
        ${o.status !== "delivered" && o.status !== "cancelled" ? `<button type="button" class="status-btn danger" data-cancel="${o.id}">Cancel</button>` : ""}
      </div>` : ""}
    </div>
  </div>`;
}
function bindOrderActions(container, reload) {
  $$(container + " [data-next]").forEach(b => b.onclick = async () => {
    const [id, st] = b.dataset.next.split(":"); b.disabled = true;
    try { await api(`/merchant/orders/${id}/status`, { method: "POST", body: { status: st } });
      toast("Order → " + STATUS_LABEL(st), "success"); reload(); }
    catch (e) { toast(e.message, "error"); b.disabled = false; }
  });
  $$(container + " [data-cancel]").forEach(b => b.onclick = async () => {
    if (!confirm("Cancel this order?")) return;
    try { await api(`/merchant/orders/${b.dataset.cancel}/status`, { method: "POST", body: { status: "cancelled" } });
      toast("Order cancelled", "success"); reload(); }
    catch (e) { toast(e.message, "error"); }
  });
}

/* ============================================================================
   MERCHANT DASHBOARD
   ============================================================================ */
async function loadRole(kind) {
  const a = JSON.parse(localStorage.getItem("id_account") || "null");
  if (!a || a.role !== kind) { location.hash = "#/login"; return; }
  if (kind === "merchant") renderMerchantTab();
  else renderAdminTab();
}
async function signin() {
  try {
    const r = await api("/auth/login", { method: "POST", body: { username: $("#loginUser").value, password: $("#loginPass").value } });
    localStorage.id_token = r.token;
    localStorage.id_account = JSON.stringify(r.account);
    location.hash = "#/" + r.account.role;
    toast("Signed in as " + r.account.full_name, "success");
  } catch (e) { toast(e.message, "error"); }
}

/* ---- MERCHANT: OVERVIEW ---- */
async function mdOverview() {
  const box = $("#merchantContent");
  box.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div><p>Loading…</p></div>`;
  const s = await api("/merchant/stats");
  const low = await api("/merchant/products?stock=low&limit=50");
  const cards = [
    ["Today's Orders", s.today_orders, "new today"],
    ["Today's Revenue", inr(s.today_revenue || 0), "delivered"],
    ["Total Revenue", inr(s.total_revenue || 0), "all time"],
    ["Avg Order Value", inr(s.avg_order_value || 0), "per order"],
    ["Low Stock", s.low_stock, "≤ 5 units"],
    ["Active Products", s.active_products, "in catalog"],
  ];
  const days = s.gmv_7d || [];
  const max = Math.max(1, ...days.map(d => d.gmv));
  box.innerHTML = `
    <div class="kpi-strip">${cards.map(([l, v, sub]) => `<div class="md-kpi"><b>${v}</b><span>${l}</span><small>${sub}</small></div>`).join("")}</div>
    <div class="admin-cols">
      <div class="admin-card">
        <h3>GMV — Last 7 Days <span class="te">గత 7 రోజుల విక్రయాలు</span></h3>
        <div class="bar-chart">${days.length ? days.map(d => `
          <div class="bar"><div class="bar-val">${inr(d.gmv)}</div><div class="bar-fill" style="height:${Math.max(4, (d.gmv / max) * 100)}%"></div><div class="bar-day">${d.day.slice(5)}</div></div>`).join("") : '<p style="color:var(--muted)">No delivered orders yet</p>'}</div>
      </div>
      <div class="admin-card">
        <h3>Orders by Status</h3>
        <div class="status-list">${(s.by_status || []).map(x => `
          <div class="status-row"><span class="sl">${STATUS_LABEL(x.status)}</span><div class="track"><div class="fill" style="width:${(x.n / (s.orders_total || 1)) * 100}%"></div></div><span class="sv">${x.n}</span></div>`).join("") || '<p style="color:var(--muted)">No orders yet</p>'}</div>
      </div>
    </div>
    <div class="admin-cols">
      <div class="admin-card">
        <h3>Top Products <span class="te">అత్యధిక అమ్మకాలు</span></h3>
        <div class="rank-list">${(s.top_products || []).map((p, i) => `
          <div class="rank-row"><span class="rk">${i + 1}</span>${img(p.image, "rk")}<span class="rn">${esc(p.name)}</span><span class="rv">${inr(p.revenue || 0)}</span></div>`).join("") || '<p style="color:var(--muted)">No sales yet</p>'}</div>
      </div>
      <div class="admin-card">
        <h3>⚠️ Low Stock Alerts <span class="te">తక్కువ స్టాక్</span></h3>
        <div class="rank-list">${low.length ? low.map(p => `
          <div class="rank-row"><span class="rk">⚠️</span>${img(p.image, "rk")}<span class="rn">${esc(p.name)} <small style="color:var(--muted)">· ${p.category_name}</small></span>
          <span class="rv"><b style="color:var(--red)">${p.stock} left</b> <button type="button" class="mini-btn" data-restock="${p.id}" data-stock="${p.stock}">+10</button></span></div>`).join("") : '<p style="color:var(--green)">✓ All products well stocked</p>'}</div>
      </div>
    </div>`;
  $$("#merchantContent [data-restock]").forEach(b => b.onclick = async () => {
    try { await api(`/merchant/products/${b.dataset.restock}`, { method: "PUT", body: { stock: +b.dataset.stock + 10 } });
      toast("Restocked +10", "success"); mdOverview(); }
    catch (e) { toast(e.message, "error"); }
  });
}

/* ---- MERCHANT: PRODUCTS ---- */
let mdProdFilter = { q: "", low: false };
async function mdProducts() {
  const box = $("#merchantContent");
  box.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div><p>Loading…</p></div>`;
  const p = new URLSearchParams();
  if (mdProdFilter.q) p.set("q", mdProdFilter.q);
  if (mdProdFilter.low) p.set("stock", "low");
  const list = await api("/merchant/products?" + p);
  const catOpts = state.categories.map(c => [c.id, c.name]);
  box.innerHTML = `
    <div class="md-toolbar">
      <input class="md-search" id="mdProdSearch" placeholder="Search your products…" value="${esc(mdProdFilter.q)}">
      <button type="button" class="chip ${mdProdFilter.low ? "active" : ""}" id="mdLowChip">⚠️ Low stock</button>
      <button type="button" class="btn-primary" id="mdAddProd" style="margin-left:auto">+ Add Product</button>
    </div>
    <div class="data-table-wrap"><table class="data-table">
      <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>MRP</th><th>Stock</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map(pr => `
        <tr class="${pr.stock <= 5 ? "row-low" : ""}">
          <td>${img(pr.image, "td")} <b>${esc(pr.name)}</b><br><small style="color:var(--muted)">${esc(pr.name_te || "")} · ${esc(pr.unit)}</small></td>
          <td>${esc(pr.category_name)}</td>
          <td><b>${inr(pr.price)}</b></td>
          <td>${pr.mrp ? inr(pr.mrp) : "—"}</td>
          <td>${pr.stock <= 5 ? `<b style="color:var(--red)">${pr.stock}</b>` : pr.stock}</td>
          <td>${pr.is_active ? '<span class="tag on">Active</span>' : '<span class="tag off">Hidden</span>'}</td>
          <td class="row-actions">
            <button type="button" class="mini-btn" data-edit="${pr.id}">Edit</button>
            <button type="button" class="mini-btn" data-toggle="${pr.id}" data-on="${pr.is_active}">${pr.is_active ? "Hide" : "Show"}</button>
            <button type="button" class="mini-btn danger" data-del="${pr.id}">Delete</button>
          </td>
        </tr>`).join("") || `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No products found</td></tr>`}
      </tbody>
    </table></div>`;
  let t;
  $("#mdProdSearch").oninput = e => { clearTimeout(t); t = setTimeout(() => { mdProdFilter.q = e.target.value; mdProducts(); }, 300); };
  $("#mdLowChip").onclick = () => { mdProdFilter.low = !mdProdFilter.low; mdProducts(); };
  $("#mdAddProd").onclick = () => mdProductForm(null, catOpts);
  $$("#merchantContent [data-edit]").forEach(b => b.onclick = () => mdProductForm(list.find(x => x.id === +b.dataset.edit), catOpts));
  $$("#merchantContent [data-toggle]").forEach(b => b.onclick = async () => {
    try { await api(`/merchant/products/${b.dataset.toggle}`, { method: "PUT", body: { is_active: b.dataset.on === "1" ? 0 : 1 } });
      toast(b.dataset.on === "1" ? "Product hidden" : "Product shown", "success"); mdProducts(); }
    catch (e) { toast(e.message, "error"); }
  });
  $$("#merchantContent [data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("Delete this product? It will be hidden from the shop.")) return;
    try { await api(`/merchant/products/${b.dataset.del}`, { method: "DELETE" }); toast("Product deleted", "success"); mdProducts(); }
    catch (e) { toast(e.message, "error"); }
  });
}
function mdProductForm(pr, catOpts) {
  openCrud({
    title: pr ? "Edit Product" : "Add Product",
    sub: pr ? esc(pr.name) : "New product for your shop",
    submitLabel: pr ? "Save changes" : "Add product",
    fields: [
      { key: "name", label: "Product name", ph: "e.g. Tomato (1 kg)" },
      { key: "name_te", label: "Telugu name", ph: "టమాటో (1 కిలో)" },
      { key: "category_id", label: "Category", type: "select", options: catOpts },
      { key: "brand", label: "Brand", ph: "e.g. Nandini" },
      { key: "unit", label: "Unit", ph: "e.g. 1 kg / 1 L / 1 pc" },
      { key: "price", label: "Price (₹)", type: "number" },
      { key: "mrp", label: "MRP (₹)", type: "number" },
      { key: "stock", label: "Stock", type: "number", def: 0 },
      { key: "image", label: "Image (emoji or /path)", ph: "🍅" },
      { key: "is_fresh", label: "Farm fresh", type: "checkbox" },
      { key: "is_best_seller", label: "Best seller", type: "checkbox" },
      { key: "is_active", label: "Active (visible in shop)", type: "checkbox", def: 1 },
    ],
    values: pr || {},
    onSubmit: async (v) => {
      if (!v.name || !v.price) throw new Error("Name and price are required");
      if (pr) await api(`/merchant/products/${pr.id}`, { method: "PUT", body: v });
      else await api("/merchant/products", { method: "POST", body: v });
      toast(pr ? "Product updated" : "Product added", "success");
      mdProducts();
    },
  });
}

/* ---- MERCHANT: ORDERS ---- */
let mdOrderStatus = "";
async function mdOrders() {
  const box = $("#merchantContent");
  box.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div><p>Loading…</p></div>`;
  const p = mdOrderStatus ? "?status=" + mdOrderStatus : "";
  const list = await api("/merchant/orders" + p);
  const chips = ["", "placed", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"];
  box.innerHTML = `
    <div class="subtabs" style="margin-top:0">${chips.map(c => `<button type="button" class="chip ${mdOrderStatus === c ? "active" : ""}" data-mos="${c}">${c ? STATUS_LABEL(c) : "All"}</button>`).join("")}</div>
    <div class="orders-list">${list.map(o => orderCard(o, { advance: true })).join("") || '<div class="empty"><div class="empty-emoji">📦</div><p>No orders in this status.</p></div>'}</div>`;
  $$("#merchantContent [data-mos]").forEach(b => b.onclick = () => { mdOrderStatus = b.dataset.mos; mdOrders(); });
  bindOrderActions("#merchantContent .orders-list", mdOrders);
}

/* ---- MERCHANT: SHOP SETTINGS ---- */
async function mdSettings() {
  const box = $("#merchantContent");
  const shop = await api("/merchant/shop");
  const zones = state.zones;
  let zoneIds = [];
  try { zoneIds = JSON.parse(shop.zone_ids || "[]"); } catch (_) {}
  box.innerHTML = `
    <h3>Shop Profile <span class="te">వ్యాపారం సెట్టింగ్స్</span></h3>
    <div class="form-grid">
      <div class="field"><label>Shop name</label><input id="shName" value="${esc(shop.name)}"></div>
      <div class="field"><label>Telugu name</label><input id="shNameTe" value="${esc(shop.name_te || "")}"></div>
      <div class="field"><label>Phone</label><input id="shPhone" value="${esc(shop.phone || "")}"></div>
      <div class="field"><label>Open hours</label><input id="shHours" value="${esc(shop.open_hours || "")}"></div>
      <div class="field full"><label>Address</label><textarea id="shAddr" rows="2">${esc(shop.address || "")}</textarea></div>
    </div>
    <h4 style="margin:18px 0 8px">Delivery zones served (${zoneIds.length} selected)</h4>
    <div class="zone-checks">${zones.map(z => `<label class="zchk"><input type="checkbox" data-z="${z.id}" ${zoneIds.includes(z.id) ? "checked" : ""}> ${esc(z.name)} <small>(${z.type})</small></label>`).join("")}</div>
    <div class="crud-actions"><button type="button" class="btn-primary" id="shSave">Save shop settings</button></div>`;
  $("#shSave").onclick = async () => {
    const sel = $$("#merchantContent .zchk input:checked").map(i => +i.dataset.z);
    try {
      await api("/merchant/shop", { method: "PUT", body: {
        name: $("#shName").value, name_te: $("#shNameTe").value, phone: $("#shPhone").value,
        open_hours: $("#shHours").value, address: $("#shAddr").value, zone_ids: JSON.stringify(sel),
      }});
      toast("Shop settings saved", "success");
    } catch (e) { toast(e.message, "error"); }
  };
}

function renderMerchantTab() {
  const map = { overview: mdOverview, products: mdProducts, orders: mdOrders, settings: mdSettings };
  (map[state.mdTab] || mdOverview)();
}

/* ============================================================================
   ADMIN DASHBOARD
   ============================================================================ */
async function renderAdminTab() {
  const map = { overview: adOverview, merchants: adMerchants, orders: adOrders, customers: adCustomers, catalog: adCatalog, promos: adPromos, delivery: adDelivery };
  (map[state.adTab] || adOverview)();
}

/* ---- ADMIN: OVERVIEW ---- */
async function adOverview() {
  const box = $("#adminContent");
  box.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div><p>Loading…</p></div>`;
  const s = await api("/admin/stats");
  const [cats, prods] = await Promise.all([api("/stats").catch(() => ({})), api("/admin/products").catch(() => [])]);
  const cards = [
    ["GMV (Delivered)", inr(s.gmv || 0), "total revenue"],
    ["Orders", s.orders_total, s.orders_today + " today"],
    ["Customers", s.customers, s.plus_members + " Plus"],
    ["Merchants", s.merchants, "active shops"],
    ["Products", s.products, "in catalog"],
    ["Avg Order Value", inr(s.aov || 0), "per order"],
    ["Completion Rate", s.completion_rate + "%", "delivered"],
    ["Avg Delivery", s.avg_delivery_time + " min", "placed→delivered"],
  ];
  const days = s.gmv_7d || [];
  const max = Math.max(1, ...days.map(d => d.gmv));
  box.innerHTML = `
    <div class="stat-cards">${cards.map(([l, v, sub]) => `<div class="stat-card"><div class="sc-label">${l}</div><div class="sc-val">${v}</div><div class="sc-sub">${sub}</div></div>`).join("")}</div>
    <div class="admin-cols">
      <div class="admin-card"><h3>GMV — Last 7 Days</h3>
        <div class="bar-chart">${days.length ? days.map(d => `<div class="bar"><div class="bar-val">${inr(d.gmv)}</div><div class="bar-fill" style="height:${Math.max(4, (d.gmv / max) * 100)}%"></div><div class="bar-day">${d.day.slice(5)}</div></div>`).join("") : '<p style="color:var(--muted)">No data</p>'}</div></div>
      <div class="admin-card"><h3>Orders by Status</h3>
        <div class="status-list">${(s.by_status || []).map(x => `<div class="status-row"><span class="sl">${STATUS_LABEL(x.status)}</span><div class="track"><div class="fill" style="width:${(x.n / (s.orders_total || 1)) * 100}%"></div></div><span class="sv">${x.n}</span></div>`).join("")}</div></div>
    </div>
    <div class="admin-cols">
      <div class="admin-card"><h3>Revenue by Merchant <span class="te">వ్యాపారాల ఆదాయం</span></h3>
        <div class="rank-list">${(s.merchant_revenue || []).map((m, i) => `<div class="rank-row"><span class="rk">${i + 1}</span><span class="rn">🏪 ${esc(m.name)}</span><span class="rv">${inr(m.revenue || 0)} <small>· ${m.orders} orders</small></span></div>`).join("")}</div></div>
      <div class="admin-card"><h3>Top Categories</h3>
        <div class="rank-list">${(cats.top_categories || []).map((c, i) => `<div class="rank-row"><span class="rk">${i + 1}</span><span class="rn">${esc(c.name)}</span><span class="rv">${inr(c.revenue || 0)}</span></div>`).join("") || '<p style="color:var(--muted)">No data</p>'}</div></div>
    </div>`;
}

/* ---- ADMIN: MERCHANTS ---- */
async function adMerchants() {
  const box = $("#adminContent");
  box.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div><p>Loading…</p></div>`;
  const list = await api("/admin/merchants");
  box.innerHTML = `
    <div class="md-toolbar"><h3 style="margin:0">Shops on Platform</h3><button type="button" class="btn-primary" id="adAddMerchant" style="margin-left:auto">+ Add Merchant</button></div>
    <div class="data-table-wrap"><table class="data-table">
      <thead><tr><th>Shop</th><th>Products</th><th>Revenue</th><th>Active Orders</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map(m => `
        <tr>
          <td><b>${esc(m.name)}</b>${m.is_default ? ' <span class="tag on">Flagship</span>' : ""}<br><small style="color:var(--muted)">${esc(m.phone || "")} · ${esc(m.address || "")}</small></td>
          <td>${m.product_count}</td>
          <td><b>${inr(m.revenue || 0)}</b></td>
          <td>${m.active_orders || 0}</td>
          <td>${m.is_active ? '<span class="tag on">Active</span>' : '<span class="tag off">Disabled</span>'}</td>
          <td class="row-actions">
            <button type="button" class="mini-btn" data-medit="${m.id}">Edit</button>
            <button type="button" class="mini-btn ${m.is_active ? "danger" : ""}" data-mtoggle="${m.id}" data-on="${m.is_active}">${m.is_active ? "Disable" : "Enable"}</button>
          </td>
        </tr>`).join("")}
      </tbody>
    </table></div>`;
  $("#adAddMerchant").onclick = () => adMerchantForm(null);
  $$("#adminContent [data-medit]").forEach(b => b.onclick = () => adMerchantForm(list.find(x => x.id === +b.dataset.medit)));
  $$("#adminContent [data-mtoggle]").forEach(b => b.onclick = async () => {
    try { await api(`/admin/merchants/${b.dataset.mtoggle}`, { method: "PUT", body: { is_active: b.dataset.on === "1" ? 0 : 1 } });
      toast("Merchant updated", "success"); adMerchants(); }
    catch (e) { toast(e.message, "error"); }
  });
}
function adMerchantForm(m) {
  openCrud({
    title: m ? "Edit Merchant" : "Add Merchant",
    submitLabel: m ? "Save" : "Add merchant",
    fields: [
      { key: "name", label: "Shop name" },
      { key: "name_te", label: "Telugu name" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
      { key: "open_hours", label: "Open hours", def: "7:00 AM – 10:00 PM" },
      { key: "is_active", label: "Active", type: "checkbox", def: 1 },
    ],
    values: m || {},
    onSubmit: async (v) => {
      if (!v.name) throw new Error("Name is required");
      if (m) await api(`/admin/merchants/${m.id}`, { method: "PUT", body: v });
      else await api("/admin/merchants", { method: "POST", body: v });
      toast(m ? "Merchant updated" : "Merchant added", "success"); adMerchants();
    },
  });
}

/* ---- ADMIN: ORDERS ---- */
let adOrderStatus = "";
async function adOrders() {
  const box = $("#adminContent");
  box.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div><p>Loading…</p></div>`;
  const list = await api("/admin/orders");
  const filtered = adOrderStatus ? list.filter(o => o.status === adOrderStatus) : list;
  const chips = ["", "placed", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"];
  box.innerHTML = `
    <div class="subtabs" style="margin-top:0">${chips.map(c => `<button type="button" class="chip ${adOrderStatus === c ? "active" : ""}" data-aos="${c}">${c ? STATUS_LABEL(c) : "All (" + list.length + ")"}</button>`).join("")}</div>
    <div class="orders-list">${filtered.map(o => orderCard(o, { withMerchant: true, advance: true })).join("") || '<div class="empty"><div class="empty-emoji">📦</div><p>No orders.</p></div>'}</div>`;
  $$("#adminContent [data-aos]").forEach(b => b.onclick = () => { adOrderStatus = b.dataset.aos; adOrders(); });
  // admin advance uses admin endpoint
  $$("#adminContent [data-next]").forEach(b => b.onclick = async () => {
    const [id, st] = b.dataset.next.split(":"); b.disabled = true;
    try { await api(`/admin/orders/${id}/status`, { method: "POST", body: { status: st } });
      toast("Order → " + STATUS_LABEL(st), "success"); adOrders(); }
    catch (e) { toast(e.message, "error"); b.disabled = false; }
  });
  $$("#adminContent [data-cancel]").forEach(b => b.onclick = async () => {
    if (!confirm("Cancel this order?")) return;
    try { await api(`/admin/orders/${b.dataset.cancel}/status`, { method: "POST", body: { status: "cancelled" } });
      toast("Order cancelled", "success"); adOrders(); }
    catch (e) { toast(e.message, "error"); }
  });
}

/* ---- ADMIN: CUSTOMERS ---- */
async function adCustomers() {
  const box = $("#adminContent");
  box.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div><p>Loading…</p></div>`;
  const list = await api("/admin/users");
  box.innerHTML = `
    <h3>Customers <span class="te">కస్టమర్ల వివరాలు</span></h3>
    <div class="data-table-wrap"><table class="data-table">
      <thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Total Spent</th><th>Plus</th><th>Active</th><th></th></tr></thead>
      <tbody>${list.map(u => `
        <tr>
          <td><b>${esc(u.full_name)}</b></td>
          <td>${esc(u.phone || "")}</td>
          <td>${u.order_count || 0}</td>
          <td><b>${inr(u.total_spent || 0)}</b></td>
          <td>${u.is_plus ? '<span class="tag on">⭐ Plus</span>' : "—"}</td>
          <td>${u.is_active ? '<span class="tag on">Active</span>' : '<span class="tag off">Disabled</span>'}</td>
          <td class="row-actions">
            <button type="button" class="mini-btn" data-uplus="${u.id}" data-on="${u.is_plus}">${u.is_plus ? "Remove Plus" : "Make Plus"}</button>
            <button type="button" class="mini-btn ${u.is_active ? "danger" : ""}" data-uact="${u.id}" data-on="${u.is_active}">${u.is_active ? "Disable" : "Enable"}</button>
          </td>
        </tr>`).join("")}
      </tbody>
    </table></div>`;
  $$("#adminContent [data-uplus]").forEach(b => b.onclick = async () => {
    try { await api(`/admin/users/${b.dataset.uplus}`, { method: "PUT", body: { is_plus: b.dataset.on === "1" ? 0 : 1 } });
      toast("Customer updated", "success"); adCustomers(); }
    catch (e) { toast(e.message, "error"); }
  });
  $$("#adminContent [data-uact]").forEach(b => b.onclick = async () => {
    try { await api(`/admin/users/${b.dataset.uact}`, { method: "PUT", body: { is_active: b.dataset.on === "1" ? 0 : 1 } });
      toast("Customer updated", "success"); adCustomers(); }
    catch (e) { toast(e.message, "error"); }
  });
}

/* ---- ADMIN: CATALOG ---- */
async function adCatalog() {
  const box = $("#adminContent");
  box.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div><p>Loading…</p></div>`;
  const list = await api("/admin/products");
  box.innerHTML = `
    <h3>All Products (all shops) <span class="te">అన్ని ఉత్పత్తులు</span></h3>
    <div class="data-table-wrap"><table class="data-table">
      <thead><tr><th>Product</th><th>Shop</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
      <tbody>${list.map(p => `
        <tr class="${p.stock <= 5 ? "row-low" : ""}">
          <td>${img(p.image, "td")} <b>${esc(p.name)}</b></td>
          <td>${esc(p.merchant_name || "—")}</td>
          <td>${esc(p.category_name)}</td>
          <td><b>${inr(p.price)}</b></td>
          <td>${p.stock <= 5 ? `<b style="color:var(--red)">${p.stock}</b>` : p.stock}</td>
          <td>${p.is_active ? '<span class="tag on">Active</span>' : '<span class="tag off">Hidden</span>'}</td>
        </tr>`).join("")}
      </tbody>
    </table></div>
    <p style="color:var(--muted);font-size:13px;margin-top:10px">Edit products from the Merchant dashboard (per-shop) or via API. ${list.length} products total.</p>`;
}

/* ---- ADMIN: PROMOTIONS ---- */
async function adPromos() {
  const box = $("#adminContent");
  box.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div><p>Loading…</p></div>`;
  const list = await api("/admin/promos");
  box.innerHTML = `
    <div class="md-toolbar"><h3 style="margin:0">Promotions</h3><button type="button" class="btn-primary" id="adAddPromo" style="margin-left:auto">+ Add Promo</button></div>
    <div class="data-table-wrap"><table class="data-table">
      <thead><tr><th>Code</th><th>Description</th><th>Discount</th><th>Min Order</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map(p => `
        <tr>
          <td><b>${esc(p.code)}</b></td>
          <td>${esc(p.description)}</td>
          <td>${p.discount_type === "flat" ? inr(p.discount_value) : p.discount_value + "%"}${p.max_discount ? " (max " + inr(p.max_discount) + ")" : ""}</td>
          <td>${inr(p.min_order)}</td>
          <td>${p.is_active ? '<span class="tag on">Active</span>' : '<span class="tag off">Inactive</span>'}</td>
          <td class="row-actions"><button type="button" class="mini-btn ${p.is_active ? "danger" : ""}" data-pact="${p.id}" data-on="${p.is_active}">${p.is_active ? "Disable" : "Enable"}</button></td>
        </tr>`).join("")}
      </tbody>
    </table></div>`;
  $("#adAddPromo").onclick = () => adPromoForm(null);
  $$("#adminContent [data-pact]").forEach(b => b.onclick = async () => {
    try { await api(`/admin/promos/${b.dataset.pact}`, { method: "PUT", body: { is_active: b.dataset.on === "1" ? 0 : 1 } });
      toast("Promo updated", "success"); adPromos(); }
    catch (e) { toast(e.message, "error"); }
  });
}
function adPromoForm() {
  openCrud({
    title: "Add Promotion",
    submitLabel: "Create promo",
    fields: [
      { key: "code", label: "Code", ph: "e.g. WELCOME50" },
      { key: "description", label: "Description", ph: "₹50 off on first order" },
      { key: "discount_type", label: "Type", type: "select", options: [["flat", "Flat ₹"], ["percent", "Percentage %"]] },
      { key: "discount_value", label: "Value (₹ or %)", type: "number" },
      { key: "min_order", label: "Min order (₹)", type: "number", def: 0 },
      { key: "max_discount", label: "Max discount (₹, for %)", type: "number" },
      { key: "is_active", label: "Active", type: "checkbox", def: 1 },
    ],
    onSubmit: async (v) => {
      if (!v.code || !v.discount_value) throw new Error("Code and value are required");
      await api("/admin/promos", { method: "POST", body: v });
      toast("Promo created", "success"); adPromos();
    },
  });
}

/* ---- ADMIN: ZONES & DELIVERY ---- */
async function adDelivery() {
  const box = $("#adminContent");
  box.innerHTML = `<div class="empty"><div class="empty-emoji">⏳</div><p>Loading…</p></div>`;
  const [zones, persons, suppliers] = await Promise.all([api("/admin/zones"), api("/admin/delivery-persons"), api("/admin/suppliers")]);
  box.innerHTML = `
    <div class="admin-cols">
      <div class="admin-card">
        <h3>Delivery Zones (${zones.length}) <span class="te">డెలివరీ జోన్లు</span></h3>
        <div class="data-table-wrap" style="max-height:340px;overflow:auto"><table class="data-table">
          <thead><tr><th>Zone</th><th>Type</th><th>Fee</th><th>SLA</th><th></th></tr></thead>
          <tbody>${zones.map(z => `
            <tr>
              <td><b>${esc(z.name)}</b></td><td>${z.type}</td>
              <td><input class="mini-input" data-fee="${z.id}" type="number" value="${z.delivery_fee}"></td>
              <td><input class="mini-input" data-sla="${z.id}" type="number" value="${z.sla_minutes}"></td>
              <td><button type="button" class="mini-btn" data-zsave="${z.id}">Save</button></td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      </div>
      <div class="admin-card">
        <h3>Delivery Persons (${persons.length})</h3>
        <div class="rank-list">${persons.map(p => `<div class="rank-row"><span class="rk">🚴</span><span class="rn">${esc(p.name)} <small>· ${esc(p.vehicle || "")}</small></span><span class="rv">${esc(p.phone || "")}</span></div>`).join("") || '<p style="color:var(--muted)">None</p>'}</div>
        <div class="form-grid" style="margin-top:12px">
          <div class="field"><label>Name</label><input id="dpName"></div>
          <div class="field"><label>Phone</label><input id="dpPhone"></div>
          <div class="field"><label>Vehicle</label><select id="dpVehicle"><option value="bike">Bike</option><option value="tempo">Tempo</option></select></div>
          <div class="field"><label>Zone</label><select id="dpZone">${zones.map(z => `<option value="${z.id}">${esc(z.name)}</option>`).join("")}</select></div>
        </div>
        <button type="button" class="btn-primary" id="dpAdd" style="margin-top:10px">+ Add Delivery Person</button>
      </div>
    </div>
    <div class="admin-card" style="margin-top:16px">
      <h3>Suppliers — Mandi & Farms (${suppliers.length})</h3>
      <div class="supplier-grid">${suppliers.map(s => `<div class="supplier-card"><span class="st">${esc(s.type)}</span><b>${esc(s.name)}</b><small>📍 ${esc(s.location || "")}</small><small>📞 ${esc(s.phone || "")}</small></div>`).join("")}</div>
      <div class="form-grid" style="margin-top:12px">
        <div class="field"><label>Supplier name</label><input id="supName"></div>
        <div class="field"><label>Type</label><select id="supType"><option value="mandi">Mandi</option><option value="farm">Farm</option><option value="wholesaler">Wholesaler</option><option value="distributor">Distributor</option></select></div>
        <div class="field"><label>Location</label><input id="supLoc"></div>
        <div class="field"><label>Phone</label><input id="supPhone"></div>
      </div>
      <button type="button" class="btn-primary" id="supAdd" style="margin-top:10px">+ Add Supplier</button>
    </div>`;
  $$("#adminContent [data-zsave]").forEach(b => b.onclick = async () => {
    const id = b.dataset.zsave;
    const fee = $(`#adminContent [data-fee="${id}"]`).value;
    const sla = $(`#adminContent [data-sla="${id}"]`).value;
    try { await api(`/admin/zones/${id}`, { method: "PUT", body: { delivery_fee: Number(fee), sla_minutes: Number(sla) } });
      toast("Zone updated", "success"); }
    catch (e) { toast(e.message, "error"); }
  });
  $("#dpAdd").onclick = async () => {
    try { await api("/admin/delivery-persons", { method: "POST", body: { name: $("#dpName").value, phone: $("#dpPhone").value, vehicle: $("#dpVehicle").value, zone_id: +$("#dpZone").value } });
      toast("Delivery person added", "success"); adDelivery(); }
    catch (e) { toast(e.message, "error"); }
  };
  $("#supAdd").onclick = async () => {
    try { await api("/admin/suppliers", { method: "POST", body: { name: $("#supName").value, type: $("#supType").value, location: $("#supLoc").value, phone: $("#supPhone").value } });
      toast("Supplier added", "success"); adDelivery(); }
    catch (e) { toast(e.message, "error"); }
  };
}

/* ---------------- ROUTER ---------------- */
function route() {
  const hash = location.hash.replace("#/", "") || "home";
  const tab = hash.split("/")[0];
  const views = { home: "home", mandi: "mandi", orders: "orders", admin: "admin", merchant:"merchant", login:"login" };
  $$(".view").forEach(v => v.classList.remove("active"));
  const viewEl = $("#view-" + (views[tab] || "home"));
  if (viewEl) viewEl.classList.add("active");
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  if (tab === "mandi") loadMandi();
  if (tab === "orders") loadUsers();
  if (tab === "admin") loadRole("admin");
  if (tab === "merchant") loadRole("merchant");
  if (tab === "home") renderProducts();
  window.scrollTo(0, 0);
}
function bindSubtabs(sel, attr, tabKey, reload) {
  $$(sel).forEach(b => b.onclick = () => {
    $$(sel).forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    state[tabKey] = b.dataset[attr];
    reload();
  });
}

/* ---------------- INIT ---------------- */
async function init() {
  try {
    const [cats, prods, promos, zones, users, shops] = await Promise.all([
      api("/categories"), api("/products?limit=200"), api("/promos"), api("/zones"), api("/users"),
      api("/shops").catch(() => []),
    ]);
    state.categories = cats;
    state.products = prods;
    state.promos = promos;
    state.zones = zones;
    state.users = users.map(u => ({ id: u.id, name: u.full_name, plus: !!u.is_plus }));
    state.shops = shops;
    if (shops.length) state.activeShop = shops[0].id;

    // set default zone if none saved
    if (!state.zone && zones.length) {
      state.zone = zones[0];
    }
    if (state.zone) {
      $("#locName").textContent = state.zone.name + " · " + state.zone.pincode;
    }

    state.stats = await api("/stats").catch(() => null);

    renderHeroStats();
    renderPromos();
    renderShop();
    renderCategories();
    renderProducts();
    renderCartBadge();
    renderCart();

    // search
    let searchTimer;
    $("#searchInput").oninput = (e) => {
      state.search = e.target.value;
      $("#searchClear").hidden = !e.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadProducts, 250);
    };
    $("#searchClear").onclick = () => {
      $("#searchInput").value = "";
      state.search = "";
      $("#searchClear").hidden = true;
      clearTimeout(searchTimer);
      loadProducts();
    };
    $("#sortSelect").onchange = (e) => { state.sort = e.target.value; loadProducts(); };
    $$("#filterBar .chip").forEach(c => c.onclick = () => {
      $$("#filterBar .chip").forEach(x => x.classList.remove("active"));
      c.classList.add("active");
      state.filter = c.dataset.filter;
      loadProducts();
    });

    // cart
    $("#cartBtn").onclick = openDrawer;
    $("#cartClose").onclick = closeDrawer;
    $("#drawerOverlay").onclick = closeDrawer;
    $("#heroShop").onclick = () => $("#catChips").scrollIntoView({ behavior: "smooth", block: "center" });

    // modals
    $("#checkoutClose").onclick = closeCheckout;
    $("#checkoutOverlay").onclick = (e) => { if (e.target.id === "checkoutOverlay") closeCheckout(); };
    $("#prodClose").onclick = closeProduct;
    $("#prodOverlay").onclick = (e) => { if (e.target.id === "prodOverlay") closeProduct(); };
    $("#locClose").onclick = closeLocation;
    $("#locOverlay").onclick = (e) => { if (e.target.id === "locOverlay") closeLocation(); };
    $("#locationBtn").onclick = openLocation;
    $$("#locOverlay .loc-tabs .chip").forEach(c => c.onclick = () => {
      $$("#locOverlay .loc-tabs .chip").forEach(x => x.classList.remove("active"));
      c.classList.add("active");
      renderZones(c.dataset.ztype);
    });

    // lang toggle
    const updateLang = () => {
      $("#langToggle").textContent = state.lang === "en" ? "తె" : "EN";
      $$(".p-name-te, .pd-name-te").forEach(el => {
        el.style.display = state.lang === "te" ? "block" : "";
      });
    };
    updateLang();
    $("#langToggle").onclick = () => {
      state.lang = state.lang === "en" ? "te" : "en";
      localStorage.setItem("id_lang", state.lang);
      updateLang();
      toast(state.lang === "te" ? "తెలుగులో చూస్తున్నారు" : "Showing in English", "success");
    };

    $("#loginSubmit").onclick = signin;
    $$(".demo-login").forEach(b=>b.onclick=()=>{$("#loginUser").value=b.dataset.user;$("#loginPass").value=b.dataset.pass;});
    $$(".signout").forEach(b=>b.onclick=()=>{localStorage.removeItem("id_token");localStorage.removeItem("id_account");location.hash="#/login";});

    // dashboard sub-tabs
    bindSubtabs("#merchantSubtabs .chip", "mtab", "mdTab", renderMerchantTab);
    bindSubtabs("#adminSubtabs .chip", "atab", "adTab", renderAdminTab);
    // generic CRUD modal
    $("#crudClose").onclick = closeCrud;
    $("#crudOverlay").onclick = (e) => { if (e.target.id === "crudOverlay") closeCrud(); };

    // router
    window.addEventListener("hashchange", route);
    route();
  } catch (e) {
    console.error("Init error:", e);
    toast("Failed to load app. Is the server running?", "error");
  }
}

document.addEventListener("DOMContentLoaded", init);
})();
