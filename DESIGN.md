# Infinity Delivery — Merchant & Admin Dashboards · DESIGN SPEC

**Goal:** Add two role-based dashboards to the existing grocery SPA + Flask API:
1. **Merchant (shop owner) dashboard** — manage own shop: products/stock, orders, sales KPIs, shop profile.
2. **Main Admin (platform owner) dashboard** — full control center: all shops, all orders, all users, promotions, zones, suppliers, delivery persons, platform KPIs.

**Hard constraints (do NOT break):**
- Keep the existing customer-facing app (Shop / Mandi Prices / My Orders tabs) working exactly as-is.
- Vanilla HTML/CSS/JS frontend (no frameworks), Flask + SQLite backend, no new Python deps beyond Flask.
- Preserve the brand: Poppins + Noto Sans Telugu, yellow→orange gradient (`--grad`), `--ink` text, card style `--r:16px`, `--shadow`. Reuse existing CSS variables and patterns (stat-cards, rank-list, status-pill, bar-chart, chips, modals, toast).
- Telugu-first: every new screen needs a Telugu subtitle (`.te` span) like existing screens.
- The current `#/admin` read-only dashboard becomes the **Main Admin** dashboard (upgraded). The **Merchant** dashboard is a new `#/merchant` route.
- All new backend endpoints must be role-protected (see Auth below). Existing public endpoints stay public.
- `infinity.db` is committed to the repo — migrations must be idempotent (`ALTER TABLE` guarded, `CREATE TABLE IF NOT EXISTS`) so re-running is safe.

---

## 1. Data model changes

### 1.1 New table: `merchants`
```sql
CREATE TABLE IF NOT EXISTS merchants (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    name_te       TEXT,
    phone         TEXT,
    address       TEXT,
    zone_ids      TEXT,          -- JSON array of delivery_zones ids this shop serves
    open_hours    TEXT DEFAULT '7:00 AM – 10:00 PM',
    is_active     INTEGER DEFAULT 1,
    is_default    INTEGER DEFAULT 0,   -- 1 = the Infinity Delivery flagship shop
    created_at    TEXT DEFAULT (datetime('now'))
);
```
Seed: one row — `Infinity Delivery` (flagship, is_default=1, serves all 53 zones).

### 1.2 New table: `accounts` (login + roles)
```sql
CREATE TABLE IF NOT EXISTS accounts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin','merchant')),
    merchant_id   INTEGER REFERENCES merchants(id),  -- set when role='merchant'
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now'))
);
```
Demo accounts (seeded):
- `admin` / `admin123` — full platform admin (role=admin).
- `merchant` / `merchant123` — Infinity Delivery shop owner (role=merchant, merchant_id=1).

### 1.3 New table: `sessions` (stateless-ish token store)
```sql
CREATE TABLE IF NOT EXISTS sessions (
    token         TEXT PRIMARY KEY,
    account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at    TEXT DEFAULT (datetime('now')),
    expires_at    TEXT NOT NULL
);
```
Token = `secrets.token_hex(32)`, expiry 7 days.

### 1.4 Altered tables (idempotent migration)
- `products`: add `merchant_id INTEGER REFERENCES merchants(id)` (default 1). All existing 146 products → merchant 1.
- `orders`: add `merchant_id INTEGER REFERENCES merchants(id)` (default 1). Orders are attributed to the merchant that supplied the items (for single-merchant orders this is the product's merchant; keep simple: order.merchant_id = merchant of first item, but the merchant dashboard filters by products belonging to the merchant via order_items).
- `users`: add `role TEXT DEFAULT 'customer'` (so admin can manage customers; customers keep role='customer').

Migration approach in `seed.py` (or a new `migrate.py` run by app.py at startup):
```python
def migrate(db):
    # add column if missing
    cols = {r[1] for r in db.execute("PRAGMA table_info(products)")}
    if "merchant_id" not in cols:
        db.execute("ALTER TABLE products ADD COLUMN merchant_id INTEGER DEFAULT 1")
        db.execute("UPDATE products SET merchant_id=1 WHERE merchant_id IS NULL")
    # same pattern for orders.merchant_id, users.role
```
Run `migrate(db)` in `app.py` before first request (once per process).

---

## 2. Backend API (Flask)

### 2.1 Auth
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/login` | `{username, password}` | `{token, account:{id,username,full_name,role,merchant_id}}` |
| POST | `/api/auth/logout` | (header token) | `{ok:true}` |
| GET  | `/api/auth/me` | (header token) | `{account:{...}, merchant:{...}}` (merchant only for role=merchant) |

- Passwords hashed with `hashlib.pbkdf2_hmac('sha256', pw, salt, 120_000)` + salt stored as `salt$hash`.
- Token passed via header `Authorization: Bearer <token>` (frontend stores in `localStorage.id_token`).
- Decorators: `@require_auth` (valid token) and `@require_role('admin')`.

### 2.2 Merchant endpoints (role=merchant, scoped to their merchant_id)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/merchant/stats` | Today's orders, today's revenue, total revenue, avg order value, low-stock count, active products, recent 7d GMV, top 5 products, orders by status |
| GET | `/api/merchant/products?q=&category=&stock=low` | List own products (with category name, avg rating, stock) |
| POST | `/api/merchant/products` | Create product `{name,name_te,category_id,brand,unit,price,mrp,stock,image,is_fresh,is_best_seller}` |
| PUT | `/api/merchant/products/<id>` | Update any product field (incl. stock, is_active) |
| DELETE | `/api/merchant/products/<id>` | Soft-delete (is_active=0) |
| GET | `/api/merchant/orders?status=` | Orders containing own products, with items, customer name/phone, zone |
| POST | `/api/merchant/orders/<id>/status` | Advance status (same allowed list as existing) |
| GET | `/api/merchant/shop` | Own merchant profile |
| PUT | `/api/merchant/shop` | Update name, phone, address, open_hours, zone_ids |

### 2.3 Admin endpoints (role=admin)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/stats` | Platform KPIs: GMV, orders (total/today/delivered), AOV, customers, plus members, merchants, products, zones, suppliers, by_status, gmv_7d, top categories, top products, **per-merchant revenue**, **order completion rate**, **avg delivery time** |
| GET | `/api/admin/merchants` | All merchants + product count + revenue + active orders |
| POST | `/api/admin/merchants` | Create merchant |
| PUT | `/api/admin/merchants/<id>` | Update (incl. is_active) |
| GET | `/api/admin/products` | All products across merchants (with merchant name) |
| GET | `/api/admin/orders?status=&merchant_id=` | All orders with customer + merchant + items |
| POST | `/api/admin/orders/<id>/status` | Advance any order |
| GET | `/api/admin/users` | All customers (id, name, phone, is_plus, order count, total spent) |
| PUT | `/api/admin/users/<id>` | Toggle is_plus / is_active |
| GET | `/api/admin/promos` | All promos (incl. inactive) |
| POST | `/api/admin/promos` | Create promo |
| PUT | `/api/admin/promos/<id>` | Update / toggle is_active |
| GET | `/api/admin/zones` | All zones |
| PUT | `/api/admin/zones/<id>` | Update fee / sla / is_active |
| GET | `/api/admin/suppliers` | All suppliers |
| POST | `/api/admin/suppliers` | Add supplier |
| GET | `/api/admin/delivery-persons` | All delivery persons |
| POST | `/api/admin/delivery-persons` | Add delivery person |

### 2.4 Keep existing public endpoints unchanged
`/api/health, /api/categories, /api/products, /api/products/<id>, /api/zones, /api/promos, /api/promos/validate, /api/mandi-prices, /api/orders (GET/POST), /api/orders/<id>, /api/orders/<id>/status, /api/stats, /api/users, /api/suppliers`.

---

## 3. Frontend

### 3.1 Auth screen + session
- New route `#/login` — a centered card (brand gradient header, infinity logo) with username + password + "Sign in" button. Below: a "Demo accounts" hint box listing `admin / admin123` and `merchant / merchant123` with quick-fill buttons.
- On success: store `id_token` + account in localStorage, route to `#/admin` (role=admin) or `#/merchant` (role=merchant).
- On 401 from any protected call: clear token, redirect to `#/login`.
- A "Sign out" button in each dashboard header.

### 3.2 Nav tabs (updated)
Existing: Shop / Mandi Prices / My Orders. Add:
- **Merchant** tab (visible to all in demo, but clicking without merchant session → login).
- **Admin** tab (same pattern).
Keep the existing 4-tab layout; the two new tabs sit after "My Orders".

### 3.3 Merchant dashboard (`#/merchant`, view `view-merchant`)
Layout: a sub-tab bar (chips) switching between 4 panels:
1. **Overview** — KPI strip (Today's Orders, Today's Revenue, Total Revenue, Avg Order, Low Stock, Active Products) + 7-day GMV bar chart + orders-by-status + Top 5 products + Low Stock alert list (products with stock ≤ 5) with a quick "+10" restock button.
2. **Products** — search + category filter + "Low stock" filter. Table/grid of own products: image, name, category, price, MRP, stock, status (Active/Inactive), rating. Actions: Edit (modal form), Toggle Active, Delete. "Add Product" button → modal form (name, Telugu name, category select, brand, unit, price, MRP, stock, image emoji, fresh/best-seller checkboxes).
3. **Orders** — status filter chips (All / Placed / Confirmed / Packed / Out for delivery / Delivered / Cancelled). Order cards: order no, customer name+phone, zone, items, total, payment mode, status pill, "Advance →" button (same flow as existing orders).
4. **Shop Settings** — form: shop name, Telugu name, phone, address, open hours, multi-select of zones served. Save → PUT.

### 3.4 Admin dashboard (`#/admin`, view `view-admin` — upgrade existing)
Keep the existing stat-cards + charts, then add sub-tab bar with panels:
1. **Overview** — existing KPI cards (GMV, Orders, Customers, Products, AOV, Zones, Suppliers) + NEW: Merchants, Order Completion Rate, Avg Delivery Time. Keep 7d GMV chart, status list, top categories, top products. Add **Revenue by Merchant** rank list.
2. **Merchants** — cards/table: shop name, product count, revenue, active orders, status; Add Merchant + Edit + Activate/Deactivate.
3. **Orders** — global orders table with merchant + customer + status filter; advance status.
4. **Customers** — table: name, phone, Plus?, orders, total spent; toggle Plus / active.
5. **Catalog** — all products across merchants (read + quick price/stock edit).
6. **Promotions** — list all promos, add new (code, description, flat/percent, value, min order, max discount, valid from/to, active), toggle active.
7. **Zones & Delivery** — zones table (fee, SLA, active) editable; delivery persons list + add; suppliers list + add.

### 3.5 Reuse
- `stat-card`, `bar-chart`, `rank-list`, `status-pill`, `status-row`, `supplier-card`, `chip`, `modal`, `toast`, `field`, `promo-input` — all exist in `style.css`. Add new classes prefixed `md-` (merchant) / `ad-` (admin) only where needed (sub-tab bar, data tables, forms).
- Add a `.subtabs` (chip row) + `.data-table` + `.form-grid` + `.kpi-strip` to `style.css`.

---

## 4. Demo accounts (document in README)
| Role | Username | Password | Access |
|---|---|---|---|
| Admin | `admin` | `admin123` | Full platform |
| Merchant | `merchant` | `merchant123` | Infinity Delivery shop |

---

## 5. Files to change
- `database/schema.sql` — add merchants, accounts, sessions tables + new columns.
- `database/seed.py` — seed 1 merchant, 2 accounts, assign products/orders to merchant 1, add users.role.
- `backend/app.py` — add `migrate()`, auth + merchant + admin endpoints, role decorators.
- `frontend/index.html` — add `#/login` view, `view-merchant`, upgrade `view-admin`, new nav tabs.
- `frontend/js/app.js` — auth state, login/logout, merchant + admin renderers, sub-tab switching, CRUD modals.
- `frontend/css/style.css` — new dashboard styles.
- `README.md` — document demo accounts + new dashboards.

## 6. Acceptance criteria
- `python3 app.py` boots, migrates the committed DB in place, serves the app.
- Customer app (Shop/Mandi/Orders) still works, all 146 products show.
- Login with `admin/admin123` → Admin dashboard with all 7 panels working.
- Login with `merchant/merchant123` → Merchant dashboard with all 4 panels working.
- Merchant can add/edit/delete a product → it appears/disappears in the Shop tab live.
- Merchant can advance an order status → reflects in customer My Orders.
- Admin can add a merchant, add a promo (appears in Shop promo strip), toggle a user's Plus.
- No console errors; Telugu subtitles present on all new screens.