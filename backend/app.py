#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Infinity Delivery — Flask backend API + static frontend server.
Chilakaluripet groceries & daily-essentials home-delivery.

Run:  python3 app.py   (serves on http://localhost:8000)
"""
import os, json, sqlite3, datetime, re, hashlib, secrets, functools
from flask import Flask, request, jsonify, send_from_directory, g

HERE   = os.path.dirname(os.path.abspath(__file__))
DB     = os.path.join(HERE, "..", "database", "infinity.db")
FRONT  = os.path.join(HERE, "..", "frontend")

app = Flask(__name__, static_folder=None)
app.config["JSON_AS_ASCII"] = False

# ---------------------------------------------------------------------------
#  DB helpers
# ---------------------------------------------------------------------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db:
        db.close()

def rows(cur):
    return [dict(r) for r in cur.fetchall()]

def row(cur):
    r = cur.fetchone()
    return dict(r) if r else None

def now():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# ---------------------------------------------------------------------------
#  STATIC FRONTEND
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return send_from_directory(FRONT, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONT, path)

# ---------------------------------------------------------------------------
#  HEALTH
# ---------------------------------------------------------------------------
@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "service": "infinity-delivery",
                    "location": "Chilakaluripet, Andhra Pradesh",
                    "time": now()})

# ---------------------------------------------------------------------------
#  CATALOG
# ---------------------------------------------------------------------------
@app.route("/api/categories")
def categories():
    db = get_db()
    cur = db.execute("""
        SELECT c.*, COUNT(p.id) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        WHERE c.is_active = 1
        GROUP BY c.id ORDER BY c.sort_order
    """)
    return jsonify(rows(cur))

@app.route("/api/products")
def products():
    db = get_db()
    q = request.args.get("q", "").strip()
    cat = request.args.get("category", "").strip()
    fresh = request.args.get("fresh", "").strip()
    best  = request.args.get("best", "").strip()
    sort  = request.args.get("sort", "popular")
    limit = min(int(request.args.get("limit", 200)), 500)

    where, args = ["p.is_active = 1"], []
    if cat:
        where.append("c.slug = ?"); args.append(cat)
    if fresh == "1":
        where.append("p.is_fresh = 1")
    if best == "1":
        where.append("p.is_best_seller = 1")
    if q:
        where.append("(p.name LIKE ? OR p.name_te LIKE ? OR p.brand LIKE ?)")
        like = "%" + q + "%"
        args += [like, like, like]
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    sort_map = {
        "popular":  "p.is_best_seller DESC, p.id",
        "price_asc":"p.price ASC",
        "price_desc":"p.price DESC",
        "name":     "p.name ASC",
        "discount": "(p.mrp - p.price) DESC",
    }
    order_sql = sort_map.get(sort, sort_map["popular"])

    cur = db.execute("""
        SELECT p.*, c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon
        FROM products p JOIN categories c ON c.id = p.category_id
        %s
        ORDER BY %s
        LIMIT ?
    """ % (where_sql, order_sql), args + [limit])
    data = rows(cur)
    # attach average rating
    for d in data:
        r = db.execute("SELECT AVG(rating) avg_r, COUNT(*) n FROM reviews WHERE product_id=?",
                       (d["id"],)).fetchone()
        d["avg_rating"] = round(r["avg_r"], 1) if r["avg_r"] else None
        d["review_count"] = r["n"]
    return jsonify(data)

@app.route("/api/products/<int:pid>")
def product(pid):
    db = get_db()
    d = row(db.execute("""
        SELECT p.*, c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon
        FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?
    """, (pid,)))
    if not d:
        return jsonify({"error": "not found"}), 404
    d["reviews"] = rows(db.execute("""
        SELECT r.rating, r.comment, r.created_at, u.full_name
        FROM reviews r JOIN users u ON u.id = r.user_id
        WHERE r.product_id = ? ORDER BY r.created_at DESC
    """, (pid,)))
    r = db.execute("SELECT AVG(rating) avg_r, COUNT(*) n FROM reviews WHERE product_id=?",
                   (pid,)).fetchone()
    d["avg_rating"] = round(r["avg_r"], 1) if r["avg_r"] else None
    d["review_count"] = r["n"]
    return jsonify(d)

# ---------------------------------------------------------------------------
#  DELIVERY ZONES
# ---------------------------------------------------------------------------
@app.route("/api/zones")
def zones():
    db = get_db()
    typ = request.args.get("type", "").strip()
    where = "WHERE type = ?" if typ else ""
    args = [typ] if typ else []
    cur = db.execute("SELECT * FROM delivery_zones %s ORDER BY type, name" % where, args)
    return jsonify(rows(cur))

# ---------------------------------------------------------------------------
#  PROMOTIONS
# ---------------------------------------------------------------------------
@app.route("/api/promos")
def promos():
    db = get_db()
    cur = db.execute("SELECT * FROM promotions WHERE is_active = 1 ORDER BY id")
    return jsonify(rows(cur))

@app.route("/api/promos/validate", methods=["POST"])
def promo_validate():
    data = request.get_json(force=True)
    code = (data.get("code") or "").upper().strip()
    subtotal = float(data.get("subtotal", 0))
    db = get_db()
    p = row(db.execute("SELECT * FROM promotions WHERE code = ? AND is_active = 1", (code,)))
    if not p:
        return jsonify({"valid": False, "error": "Invalid or expired promo code"}), 400
    if subtotal < p["min_order"]:
        return jsonify({"valid": False,
                        "error": "Add items worth ₹%.0f more to use %s" % (p["min_order"] - subtotal, code)}), 400
    if p["discount_type"] == "flat":
        discount = min(p["discount_value"], subtotal)
    else:
        discount = min((p["discount_value"] / 100.0) * subtotal, p["max_discount"] or 1e9)
    return jsonify({"valid": True, "code": code, "discount": round(discount, 2),
                    "description": p["description"]})

# ---------------------------------------------------------------------------
#  MANDI PRICES  (live APMC benchmark — our price-anchoring feature)
# ---------------------------------------------------------------------------
@app.route("/api/mandi-prices")
def mandi_prices():
    db = get_db()
    # Latest price per commodity using a subquery (SQLite 3.25+ window func compatible)
    cur = db.execute("""
        SELECT m1.commodity, m1.unit, m1.price, m1.min_price, m1.max_price, m1.price_date,
               (SELECT m2.price FROM mandi_prices m2
                WHERE m2.commodity = m1.commodity AND m2.price_date < m1.price_date
                ORDER BY m2.price_date DESC LIMIT 1) AS prev_price
        FROM mandi_prices m1
        WHERE m1.price_date = (
            SELECT MAX(m3.price_date) FROM mandi_prices m3
            WHERE m3.commodity = m1.commodity
        )
        ORDER BY m1.commodity
    """)
    data = rows(cur)
    for d in data:
        prev = d.pop("prev_price", None)
        if prev is None:
            d["trend"] = "same"
        elif d["price"] > prev:
            d["trend"] = "up"
        elif d["price"] < prev:
            d["trend"] = "down"
        else:
            d["trend"] = "same"
        d["source"] = "Agmarknet"
    return jsonify(data)

# ---------------------------------------------------------------------------
#  ORDERS
# ---------------------------------------------------------------------------
@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json(force=True)
    user_id   = data.get("user_id")
    address_id= data.get("address_id")
    zone_id   = data.get("zone_id")            # zone the customer picked at checkout
    items     = data.get("items", [])          # [{product_id, qty}]
    pmode     = data.get("payment_mode", "cod")
    promo     = (data.get("promo_code") or "").strip() or None

    if not user_id or not items:
        return jsonify({"error": "user_id and items are required"}), 400

    db = get_db()
    user = row(db.execute("SELECT * FROM users WHERE id=?", (user_id,)))
    if not user:
        return jsonify({"error": "user not found"}), 404
    addr = row(db.execute("SELECT * FROM addresses WHERE id=? AND user_id=?", (address_id, user_id))) if address_id else None
    if not addr:
        # fall back to the user's default address
        addr = row(db.execute("SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC, id LIMIT 1", (user_id,)))
    # delivery zone: prefer the one the customer picked at checkout, else the
    # address's zone. This must match the fee shown on the UPI QR at checkout.
    order_zone = zone_id if zone_id else (addr["zone_id"] if addr else None)
    if not order_zone:
        return jsonify({"error": "no delivery zone / address on file"}), 404

    # compute subtotal & validate stock
    subtotal = 0.0
    lines = []
    for it in items:
        pid, qty = it.get("product_id"), int(it.get("qty", 1))
        p = row(db.execute("SELECT * FROM products WHERE id=? AND is_active=1", (pid,)))
        if not p:
            return jsonify({"error": "product %s not available" % pid}), 400
        if p["stock"] < qty:
            return jsonify({"error": "insufficient stock for %s" % p["name"]}), 400
        line_total = round(p["price"] * qty, 2)
        subtotal += line_total
        lines.append((p, qty, line_total))
    subtotal = round(subtotal, 2)

    # promo
    discount = 0.0
    if promo:
        p_row = row(db.execute("SELECT * FROM promotions WHERE code=? AND is_active=1", (promo,)))
        if p_row and subtotal >= p_row["min_order"]:
            if p_row["discount_type"] == "flat":
                discount = min(p_row["discount_value"], subtotal)
            else:
                discount = min((p_row["discount_value"]/100.0)*subtotal, p_row["max_discount"] or 1e9)
    discount = round(discount, 2)

    # delivery fee (free for Plus members) — based on the selected zone
    fee = 0.0
    zone_row = row(db.execute("SELECT delivery_fee FROM delivery_zones WHERE id=?", (order_zone,)))
    if zone_row:
        fee = float(zone_row["delivery_fee"] or 0)
    if user["is_plus"]:
        fee = 0.0
    gst = round((subtotal - discount) * 0.05, 2)
    total = round(subtotal - discount + fee + gst, 2)

    merchant_id = lines[0][0].get("merchant_id") or 1
    order_no = "INF-%s-%05d" % (datetime.date.today().year,
                 db.execute("SELECT COUNT(*) FROM orders").fetchone()[0] + 1)
    cur = db.execute("""INSERT INTO orders(order_no,user_id,address_id,zone_id,status,subtotal,discount,
        delivery_fee,gst,total,payment_mode,payment_status,promo_code,placed_at,merchant_id)
        VALUES(?,?,?,?, 'placed', ?,?,?,?, ?,?,?,?,?,?)""",
        (order_no, user_id, addr["id"] if addr else None, order_zone, subtotal, discount, fee, gst,
         total, pmode, "pending", promo, now(), merchant_id))
    order_id = cur.lastrowid

    for p, qty, line_total in lines:
        db.execute("INSERT INTO order_items(order_id,product_id,qty,unit_price,line_total) VALUES(?,?,?,?,?)",
                   (order_id, p["id"], qty, p["price"], line_total))
        db.execute("UPDATE products SET stock = stock - ? WHERE id=?", (qty, p["id"]))
    db.execute("INSERT INTO payments(order_id,amount,mode,status,txn_ref) VALUES(?,?,?,?,?)",
               (order_id, total, pmode, "pending", "TXN-" + order_no[-6:]))
    db.commit()

    return jsonify({"order_id": order_id, "order_no": order_no, "total": total,
                    "subtotal": subtotal, "discount": discount, "delivery_fee": fee,
                    "gst": gst, "status": "placed", "message": "Order placed successfully!"})

@app.route("/api/orders")
def list_orders():
    db = get_db()
    user_id = request.args.get("user_id", "").strip()
    where = "WHERE o.user_id = ?" if user_id else ""
    args = [user_id] if user_id else []
    cur = db.execute("""
        SELECT o.*, u.full_name, a.line1, a.area, z.name AS zone_name
        FROM orders o
        JOIN users u ON u.id = o.user_id
        LEFT JOIN addresses a ON a.id = o.address_id
        LEFT JOIN delivery_zones z ON z.id = o.zone_id
        %s ORDER BY o.placed_at DESC
    """ % where, args)
    return jsonify(rows(cur))

@app.route("/api/orders/<int:oid>")
def order_detail(oid):
    db = get_db()
    o = row(db.execute("""
        SELECT o.*, u.full_name, u.phone, a.line1, a.area, a.pincode, z.name AS zone_name,
               z.sla_minutes
        FROM orders o
        JOIN users u ON u.id = o.user_id
        LEFT JOIN addresses a ON a.id = o.address_id
        LEFT JOIN delivery_zones z ON z.id = o.zone_id
        WHERE o.id = ?
    """, (oid,)))
    if not o:
        return jsonify({"error": "not found"}), 404
    o["items"] = rows(db.execute("""
        SELECT oi.qty, oi.unit_price, oi.line_total, p.name, p.name_te, p.image, p.unit
        FROM order_items oi JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
    """, (oid,)))
    o["payment"] = row(db.execute("SELECT * FROM payments WHERE order_id=?", (oid,)))
    return jsonify(o)

@app.route("/api/orders/<int:oid>/status", methods=["POST"])
def update_status(oid):
    data = request.get_json(force=True)
    status = data.get("status")
    allowed = ["placed","confirmed","packed","out_for_delivery","delivered","cancelled"]
    if status not in allowed:
        return jsonify({"error": "invalid status"}), 400
    db = get_db()
    extra = ""
    if status == "delivered":
        extra = ", delivered_at = ?"
        db.execute("UPDATE payments SET status='success' WHERE order_id=?", (oid,))
    if extra:
        db.execute("UPDATE orders SET status=?%s WHERE id=?" % extra, (status, now(), oid))
    else:
        db.execute("UPDATE orders SET status=? WHERE id=?", (status, oid))
    db.commit()
    return jsonify({"order_id": oid, "status": status})

# ---------------------------------------------------------------------------
#  DASHBOARD / STATS
# ---------------------------------------------------------------------------
@app.route("/api/stats")
def stats():
    db = get_db()
    def one(sql, args=()):
        r = db.execute(sql, args).fetchone()
        return dict(r)
    s = {
        "products":       one("SELECT COUNT(*) n FROM products WHERE is_active=1")["n"],
        "categories":     one("SELECT COUNT(*) n FROM categories")["n"],
        "users":          one("SELECT COUNT(*) n FROM users")["n"],
        "plus_members":   one("SELECT COUNT(*) n FROM users WHERE is_plus=1")["n"],
        "orders_total":   one("SELECT COUNT(*) n FROM orders")["n"],
        "orders_today":   one("SELECT COUNT(*) n FROM orders WHERE date(placed_at)=date('now')")["n"],
        "orders_delivered": one("SELECT COUNT(*) n FROM orders WHERE status='delivered'")["n"],
        "gmv":            one("SELECT ROUND(SUM(total),2) v FROM orders WHERE status='delivered'")["v"] or 0,
        "aov":            one("SELECT ROUND(AVG(total),2) v FROM orders WHERE status='delivered'")["v"] or 0,
        "zones":          one("SELECT COUNT(*) n FROM delivery_zones")["n"],
        "suppliers":      one("SELECT COUNT(*) n FROM suppliers")["n"],
        "fresh_products": one("SELECT COUNT(*) n FROM products WHERE is_fresh=1")["n"],
    }
    # orders by status
    s["by_status"] = rows(db.execute(
        "SELECT status, COUNT(*) n FROM orders GROUP BY status"))
    # top categories by sales
    s["top_categories"] = rows(db.execute("""
        SELECT c.name, SUM(oi.line_total) revenue, COUNT(DISTINCT oi.order_id) orders
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN categories c ON c.id = p.category_id
        JOIN orders o ON o.id = oi.order_id AND o.status='delivered'
        GROUP BY c.id ORDER BY revenue DESC LIMIT 5
    """))
    # top products
    s["top_products"] = rows(db.execute("""
        SELECT p.name, p.image, SUM(oi.qty) units, SUM(oi.line_total) revenue
        FROM order_items oi JOIN products p ON p.id = oi.product_id
        JOIN orders o ON o.id = oi.order_id AND o.status='delivered'
        GROUP BY p.id ORDER BY revenue DESC LIMIT 5
    """))
    # last 7 days GMV
    s["gmv_7d"] = rows(db.execute("""
        SELECT date(placed_at) day, ROUND(SUM(total),2) gmv, COUNT(*) orders
        FROM orders WHERE status='delivered'
        AND date(placed_at) >= date('now','-6 day')
        GROUP BY date(placed_at) ORDER BY day
    """))
    return jsonify(s)

# ---------------------------------------------------------------------------
#  USERS  (id, name, plus status — used by checkout for free-delivery logic)
# ---------------------------------------------------------------------------
@app.route("/api/users")
def users():
    db = get_db()
    cur = db.execute("SELECT id, full_name, is_plus FROM users WHERE is_active=1 ORDER BY id")
    return jsonify(rows(cur))

# ---------------------------------------------------------------------------
#  SUPPLIERS
# ---------------------------------------------------------------------------
@app.route("/api/suppliers")
def suppliers():
    db = get_db()
    return jsonify(rows(db.execute("SELECT * FROM suppliers WHERE is_active=1 ORDER BY type, name")))

from role_api import install as install_role_api
install_role_api(app, get_db, row, rows, now)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)