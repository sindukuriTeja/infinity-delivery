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
};

/* ---------------- API ---------------- */
async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
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
    const orders = await api("/orders");
    const map = {};
    orders.forEach(o => { if (!map[o.user_id]) map[o.user_id] = o.full_name; });
    state.users = Object.entries(map).map(([id, name]) => ({ id: +id, name }));
    renderUserPicker();
    await loadOrders();
  } catch (e) {
    toast("Could not load users", "error");
  }
}
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

/* ---------------- ADMIN ---------------- */
async function loadAdmin() {
  try {
    state.stats = await api("/stats");
    const s = state.stats;
    const cards = [
      ["GMV (Delivered)", inr(s.gmv), "Total revenue"],
      ["Orders", s.orders_total, s.orders_today + " today"],
      ["Customers", s.users, s.plus_members + " Plus members"],
      ["Products", s.products, s.fresh_products + " farm fresh"],
      ["Avg Order Value", inr(s.aov), "per order"],
      ["Zones", s.zones, "wards + villages"],
      ["Suppliers", s.suppliers, "mandi &amp; farms"],
    ];
    $("#statCards").innerHTML = cards.map(([l, v, sub]) =>
      `<div class="stat-card"><div class="sc-label">${l}</div><div class="sc-val">${v}</div><div class="sc-sub">${sub}</div></div>`).join("");

    // GMV 7d chart
    const days = s.gmv_7d || [];
    const max = Math.max(1, ...days.map(d => d.gmv));
    $("#gmvChart").innerHTML = days.length ? days.map(d => `
      <div class="bar">
        <div class="bar-val">${inr(d.gmv)}</div>
        <div class="bar-fill" style="height:${Math.max(4, (d.gmv / max) * 100)}%"></div>
        <div class="bar-day">${d.day.slice(5)}</div>
      </div>`).join("") : '<p style="color:var(--muted)">No data yet</p>';

    // status list
    const total = s.orders_total || 1;
    $("#statusList").innerHTML = s.by_status.map(x => `
      <div class="status-row"><span class="sl">${x.status.replace(/_/g, " ")}</span>
      <div class="track"><div class="fill" style="width:${(x.n / total) * 100}%"></div></div>
      <span class="sv">${x.n}</span></div>`).join("");

    // top categories
    $("#topCats").innerHTML = s.top_categories.length
      ? s.top_categories.map((c, i) => `
        <div class="rank-row"><span class="rk">${i + 1}</span><span class="rn">${c.name}</span><span class="rv">${inr(c.revenue)}</span></div>`).join("")
      : '<p style="color:var(--muted)">No sales data yet</p>';

    // top products
    $("#topProds").innerHTML = s.top_products.length
      ? s.top_products.map((p, i) => `
        <div class="rank-row"><span class="rk">${i + 1}</span>${img(p.image, "rk")}<span class="rn">${p.name}</span><span class="rv">${inr(p.revenue)}</span></div>`).join("")
      : '<p style="color:var(--muted)">No sales data yet</p>';

    // suppliers
    const sup = await api("/suppliers");
    $("#supplierGrid").innerHTML = sup.map(x => `
      <div class="supplier-card"><span class="st">${x.type}</span><b>${x.name}</b><small>📍 ${x.location}</small><small>📞 ${x.phone}</small></div>`).join("");
  } catch (e) {
    toast("Could not load dashboard", "error");
  }
}

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
      <select id="coZone">${state.zones.map(z => `<option value="${z.id}" ${state.zone && state.zone.id === z.id ? "selected" : ""}>${z.name} · ${z.sla_minutes} min · ${z.delivery_fee > 0 ? inr(z.delivery_fee) : "Free"}</option>`).join("")}</select>
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
    <button type="button" class="place-btn" id="placeOrder">Place Order · ${inr(sub)}</button>`;

  let pay = "upi", promoDiscount = 0, promoCode = null;
  const getSelectedZone = () => state.zones.find(x => x.id === +$("#coZone").value);
  const zoneFee = () => { const z = getSelectedZone(); return z ? (z.delivery_fee || 0) : 0; };

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
    $("#placeOrder").textContent = "Place Order · " + inr(total);
  };
  renderSummary();

  $$("#payGrid .pay-opt").forEach(o => o.onclick = () => {
    $$("#payGrid .pay-opt").forEach(x => x.classList.remove("active"));
    o.classList.add("active");
    pay = o.dataset.pay;
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
      btn.disabled = false;
      renderSummary();
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

/* ---------------- ROUTER ---------------- */
function route() {
  const hash = location.hash.replace("#/", "") || "home";
  const tab = hash.split("/")[0];
  const views = { home: "home", mandi: "mandi", orders: "orders", admin: "admin" };
  $$(".view").forEach(v => v.classList.remove("active"));
  const viewEl = $("#view-" + (views[tab] || "home"));
  if (viewEl) viewEl.classList.add("active");
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  if (tab === "mandi") loadMandi();
  if (tab === "orders") loadUsers();
  if (tab === "admin") loadAdmin();
  if (tab === "home") renderProducts();
  window.scrollTo(0, 0);
}

/* ---------------- INIT ---------------- */
async function init() {
  try {
    const [cats, prods, promos, zones] = await Promise.all([
      api("/categories"), api("/products?limit=200"), api("/promos"), api("/zones"),
    ]);
    state.categories = cats;
    state.products = prods;
    state.promos = promos;
    state.zones = zones;

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
