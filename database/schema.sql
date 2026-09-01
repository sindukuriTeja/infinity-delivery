-- ============================================================================
--  INFINITY DELIVERY  ·  Chilakaluripet, Andhra Pradesh
--  Groceries & daily-essentials home-delivery — relational schema (SQLite)
--  Portable: runs on SQLite (as-is) and adapts cleanly to Postgres/MySQL.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
--  CATALOG
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    name_te       TEXT,                 -- Telugu name
    slug          TEXT    NOT NULL UNIQUE,
    icon          TEXT,                 -- emoji / icon key
    sort_order    INTEGER DEFAULT 0,
    is_active     INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    sku           TEXT    NOT NULL UNIQUE,
    name          TEXT    NOT NULL,
    name_te       TEXT,                 -- Telugu name
    category_id   INTEGER NOT NULL REFERENCES categories(id),
    brand         TEXT,
    unit          TEXT    NOT NULL,     -- e.g. 1 kg, 500 g, 1 L, 1 pc
    unit_qty      REAL    NOT NULL DEFAULT 1,
    price         REAL    NOT NULL,     -- selling price (INR)
    mrp           REAL,                 -- list price (INR)
    mandi_price   REAL,                 -- today's APMC mandi benchmark (INR)
    stock         INTEGER DEFAULT 0,
    image         TEXT,                 -- emoji / image key
    is_fresh      INTEGER DEFAULT 0,    -- 1 = farm-fresh (mandi-sourced)
    is_best_seller INTEGER DEFAULT 0,
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT    DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name     ON products(name);

-- ---------------------------------------------------------------------------
--  SUPPLY CHAIN  (mandi + farms — our cost advantage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    type          TEXT    NOT NULL,     -- 'mandi' | 'farm' | 'wholesaler' | 'distributor'
    location      TEXT,
    phone         TEXT,
    is_active     INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS mandi_prices (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    commodity     TEXT    NOT NULL,
    price         REAL    NOT NULL,     -- INR per unit
    unit          TEXT    NOT NULL,
    min_price     REAL,
    max_price     REAL,
    price_date    TEXT    NOT NULL,     -- YYYY-MM-DD
    source        TEXT    DEFAULT 'Agmarknet'
);
CREATE INDEX IF NOT EXISTS idx_mandi_date ON mandi_prices(price_date);

-- ---------------------------------------------------------------------------
--  CUSTOMERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT    NOT NULL,
    phone         TEXT    NOT NULL UNIQUE,
    email         TEXT,
    password_hash TEXT,
    is_plus       INTEGER DEFAULT 0,    -- Infinity Plus member
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS addresses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label         TEXT,                 -- 'Home' | 'Work' | 'Village'
    line1         TEXT    NOT NULL,
    area          TEXT,                 -- ward / village
    pincode       TEXT,
    zone_id       INTEGER,              -- delivery zone
    is_default    INTEGER DEFAULT 0
);

-- ---------------------------------------------------------------------------
--  DELIVERY ZONES  (38 wards + 15 villages)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_zones (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    type          TEXT    NOT NULL,     -- 'ward' | 'village'
    pincode       TEXT,
    sla_minutes   INTEGER DEFAULT 45,   -- delivery SLA
    delivery_fee  REAL    DEFAULT 0,
    is_active     INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS delivery_persons (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    phone         TEXT,
    vehicle       TEXT,                 -- 'bike' | 'tempo'
    zone_id       INTEGER REFERENCES delivery_zones(id),
    is_active     INTEGER DEFAULT 1
);

-- ---------------------------------------------------------------------------
--  ORDERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no      TEXT    NOT NULL UNIQUE,
    user_id       INTEGER NOT NULL REFERENCES users(id),
    address_id    INTEGER REFERENCES addresses(id),
    zone_id       INTEGER REFERENCES delivery_zones(id),
    status        TEXT    NOT NULL DEFAULT 'placed',
        -- placed | confirmed | packed | out_for_delivery | delivered | cancelled
    subtotal      REAL    NOT NULL,
    discount      REAL    DEFAULT 0,
    delivery_fee  REAL    DEFAULT 0,
    gst           REAL    DEFAULT 0,
    total         REAL    NOT NULL,
    payment_mode  TEXT,                 -- 'upi' | 'card' | 'cod' | 'wallet'
    payment_status TEXT DEFAULT 'pending',
    promo_code    TEXT,
    placed_at     TEXT    DEFAULT (datetime('now')),
    delivered_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id    INTEGER NOT NULL REFERENCES products(id),
    qty           INTEGER NOT NULL,
    unit_price    REAL    NOT NULL,
    line_total    REAL    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount        REAL    NOT NULL,
    mode          TEXT    NOT NULL,
    status        TEXT    DEFAULT 'success',   -- success | failed | refunded
    txn_ref       TEXT,
    paid_at       TEXT    DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
--  PROMOTIONS & REVIEWS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promotions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    code          TEXT    NOT NULL UNIQUE,
    description   TEXT    NOT NULL,
    discount_type TEXT    NOT NULL,   -- 'flat' | 'percent'
    discount_value REAL   NOT NULL,
    min_order     REAL    DEFAULT 0,
    max_discount  REAL,
    valid_from    TEXT,
    valid_to      TEXT,
    is_active     INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS reviews (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id    INTEGER REFERENCES products(id),
    user_id       INTEGER REFERENCES users(id),
    order_id      INTEGER REFERENCES orders(id),
    rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    created_at    TEXT    DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
--  SUBSCRIPTIONS  (Infinity Plus)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan          TEXT    DEFAULT 'plus_monthly',
    price         REAL    DEFAULT 99,
    starts_at     TEXT    DEFAULT (datetime('now')),
    expires_at    TEXT,
    is_active     INTEGER DEFAULT 1
);