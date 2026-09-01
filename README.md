# 🛒 Infinity Delivery — Chilakaluripet

**Your local mandi, delivered to your door in 30 minutes.**

A complete, production-ready groceries & daily-essentials home-delivery platform
built for **Chilakaluripet, Palnadu (Guntur) district, Andhra Pradesh** —
grounded in in-depth local market research.

> Brand: **Infinity Delivery** (infinity logo, yellow→orange gradient, Telugu-first).

---

## ✨ What's inside

| Layer | Tech | Path |
|---|---|---|
| **Research** | In-depth Chilakaluripet market study | `RESEARCH.md` |
| **Database** | SQLite (portable to Postgres/MySQL) | `database/` |
| **Backend API** | Python 3 + Flask (REST) | `backend/app.py` |
| **Frontend** | Vanilla HTML/CSS/JS, mobile-first SPA | `frontend/` |

### Features
- 🛍️ **Shop** — 146 products across 10 categories, Telugu + English names,
  search, category & filter chips, sorting, live cart.
- 🌱 **Farm-fresh** — mandi-sourced produce with **live APMC mandi price
  benchmarking** (Agmarknet-style) and 7-day price trends.
- 📍 **Delivery zones** — 38 municipality wards + 15 mandal villages, each with
  its own SLA and fee.
- 🎟️ **Promotions** — 6 working promo codes (flat & %), validated server-side.
- 📦 **Orders** — full lifecycle (placed → confirmed → packed → out_for_delivery
  → delivered), per-user order history, itemised bills with GST.
- 💳 **Payments** — UPI / Card / COD / Wallet (simulated).
- ⭐ **Infinity Plus** — subscription members get free delivery.
- 📊 **Business Dashboard** — GMV, AOV, orders-by-status, top categories &
  products, 7-day GMV chart, supply-chain (mandi & farms) view.
- 📱 **Mobile-first** responsive UI, cart drawer, product detail modals, toasts.

---

## 🚀 Run it

```bash
# 1. Build the database (creates database/infinity.db)
cd database && python3 seed.py

# 2. Start the app (serves API + frontend)
cd ../backend && python3 app.py
```

Then open **http://localhost:8000**

> Requires Python 3.8+ and Flask (`pip3 install flask`).

---

## 🗄️ Database

`database/schema.sql` — 14 tables:
`categories`, `products`, `suppliers`, `mandi_prices`, `delivery_zones`,
`delivery_persons`, `users`, `addresses`, `orders`, `order_items`, `payments`,
`promotions`, `reviews`, `subscriptions`.

`database/seed.py` — populates everything with **Chilakaluripet-specific data**:
local rice/dal brands, Nandini dairy, the Tenali APMC mandi, real ward & village
names, Telugu product names, and 20 historical orders.

### Sample data at a glance
- **146 products** (30 fruits & veg, 14 rice & staples, 12 pulses, …)
- **53 delivery zones** (38 wards + 15 villages)
- **10 suppliers** (mandi, farms, wholesalers, distributors)
- **126 mandi price records** (7 days × 18 commodities)
- **15 users**, **20 orders**, **20 reviews**

---

## 🔌 API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Service status |
| GET | `/api/categories` | Categories + product counts |
| GET | `/api/products?q=&category=&fresh=&best=&sort=` | Search/filter products |
| GET | `/api/products/<id>` | Product detail + reviews |
| GET | `/api/zones?type=` | Delivery zones |
| GET | `/api/promos` | Active promotions |
| POST | `/api/promos/validate` | Validate a promo code |
| GET | `/api/mandi-prices` | Live APMC prices + trend |
| POST | `/api/orders` | Place an order |
| GET | `/api/orders?user_id=` | List orders |
| GET | `/api/orders/<id>` | Order detail + items |
| POST | `/api/orders/<id>/status` | Update order status |
| GET | `/api/stats` | Dashboard metrics |
| GET | `/api/suppliers` | Supply chain |

---

## 📁 Structure

```
infinity-delivery/
├── RESEARCH.md              # Deep Chilakaluripet market research
├── README.md                # This file
├── database/
│   ├── schema.sql           # Relational schema (portable)
│   ├── seed.py              # Seeder (Chilakaluripet data)
│   └── infinity.db          # Generated SQLite DB
├── backend/
│   └── app.py               # Flask API + static server
└── frontend/
    ├── index.html           # SPA shell
    ├── css/style.css        # Brand styling (mobile-first)
    └── js/app.js            # App logic (vanilla JS)
```

---

## 📌 Localisation notes (from research)
- **Telugu-first** UI and product names (Noto Sans Telugu).
- **Mandi-anchored pricing** — we buy at the APMC and show the wholesale rate.
- **Village batching** — 15 villages served with same-day batched runs.
- **COD + UPI** — both remain important in a Tier-3 town.

*Built for the Vijayawada–Chilakaluripet growth corridor. 🚀*