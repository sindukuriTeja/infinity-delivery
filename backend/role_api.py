import json,datetime,hashlib,secrets,functools
from flask import request,jsonify,g

def install(app,get_db,row,rows,now):
 def ph(p,s=None):
  s=s or secrets.token_hex(16);return s+'$'+hashlib.pbkdf2_hmac('sha256',p.encode(),s.encode(),120000).hex()
 def migrate(db):
  db.executescript("""CREATE TABLE IF NOT EXISTS merchants(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,name_te TEXT,phone TEXT,address TEXT,zone_ids TEXT,open_hours TEXT DEFAULT '7:00 AM – 10:00 PM',is_active INTEGER DEFAULT 1,is_default INTEGER DEFAULT 0,created_at TEXT DEFAULT(datetime('now')));CREATE TABLE IF NOT EXISTS accounts(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,full_name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN('admin','merchant')),merchant_id INTEGER,is_active INTEGER DEFAULT 1,created_at TEXT DEFAULT(datetime('now')));CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,account_id INTEGER NOT NULL,created_at TEXT DEFAULT(datetime('now')),expires_at TEXT NOT NULL);""")
  for t,c,d in [('products','merchant_id','INTEGER DEFAULT 1'),('orders','merchant_id','INTEGER DEFAULT 1'),('users','role',"TEXT DEFAULT 'customer'")]:
   if c not in {x[1] for x in db.execute('PRAGMA table_info('+t+')')}:db.execute('ALTER TABLE %s ADD COLUMN %s %s'%(t,c,d))
  if not db.execute('SELECT 1 FROM merchants WHERE id=1').fetchone():db.execute('INSERT INTO merchants(id,name,name_te,phone,address,zone_ids,is_default) VALUES(1,?,?,?,?,?,1)',('Infinity Delivery','ఇన్ఫినిటీ డెలివరీ','1800-XXX-XXXX','Chilakaluripet',json.dumps([x[0] for x in db.execute('SELECT id FROM delivery_zones')])))
  db.execute('UPDATE products SET merchant_id=1 WHERE merchant_id IS NULL');db.execute('UPDATE orders SET merchant_id=1 WHERE merchant_id IS NULL');db.execute("UPDATE users SET role='customer' WHERE role IS NULL")
  # backfill realistic delivered_at (seed data has placed==delivered same day)
  for r in db.execute("SELECT id,placed_at FROM orders WHERE status='delivered' AND (delivered_at IS NULL OR date(delivered_at)=date(placed_at))").fetchall():
    db.execute("UPDATE orders SET delivered_at=datetime(placed_at, '+'||?||' minutes') WHERE id=?", (25+(r[0]*7)%25, r[0]))
  for u,p,n,r,m in [('admin','admin123','Infinity Admin','admin',None),('merchant','merchant123','Infinity Delivery Owner','merchant',1)]:
   if not db.execute('SELECT 1 FROM accounts WHERE username=?',(u,)).fetchone():db.execute('INSERT INTO accounts(username,password_hash,full_name,role,merchant_id) VALUES(?,?,?,?,?)',(u,ph(p),n,r,m))
  db.commit()
 with app.app_context():migrate(get_db())
 def account():
  h=request.headers.get('Authorization','');tok=h[7:] if h.startswith('Bearer ') else ''
  return row(get_db().execute("SELECT a.id,a.username,a.full_name,a.role,a.merchant_id FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token=? AND s.expires_at>datetime('now') AND a.is_active=1",(tok,))) if tok else None
 def role(need):
  def dec(f):
   @functools.wraps(f)
   def w(*a,**kw):
    x=account()
    if not x:return jsonify(error='authentication required'),401
    if x['role']!=need:return jsonify(error='forbidden'),403
    g.account=x;return f(*a,**kw)
   return w
  return dec
 def d():return request.get_json(silent=True) or {}
 def stat(mid=None):
  db=get_db(); q=lambda sql,args=():db.execute(sql,args).fetchone()[0] or 0; wh=' WHERE merchant_id=?' if mid else ''; args=(mid,) if mid else ()
  r={'gmv':q("SELECT round(sum(total),2) FROM orders"+wh+(" AND" if wh else " WHERE")+" status='delivered'",args),'orders_total':q('SELECT count(*) FROM orders'+wh,args),'orders_today':q("SELECT count(*) FROM orders"+wh+(" AND" if wh else " WHERE")+" date(placed_at)=date('now')",args),'orders_delivered':q("SELECT count(*) FROM orders"+wh+(" AND" if wh else " WHERE")+" status='delivered'",args),'aov':q("SELECT round(avg(total),2) FROM orders"+wh+(" AND" if wh else " WHERE")+" status='delivered'",args),'products':q('SELECT count(*) FROM products'+(' WHERE merchant_id=? AND is_active=1' if mid else ' WHERE is_active=1'),args),'low_stock':q('SELECT count(*) FROM products WHERE merchant_id=? AND stock<=5 AND is_active=1',(mid,)) if mid else 0}
  r['by_status']=rows(db.execute('SELECT status,count(*) n FROM orders'+wh+' GROUP BY status',args));r['gmv_7d']=rows(db.execute("SELECT date(placed_at) day,sum(total) gmv,count(*) orders FROM orders"+wh+(" AND" if wh else " WHERE")+" status='delivered' AND date(placed_at)>=date('now','-6 day') GROUP BY date(placed_at)",args));return r
 @app.post('/api/auth/login')
 def login():
  x=d();a=row(get_db().execute('SELECT * FROM accounts WHERE username=? AND is_active=1',(x.get('username',''),)))
  if not a or not ('$',) or ph(x.get('password',''),a['password_hash'].split('$')[0]).split('$')[1]=='' :return jsonify(error='invalid username or password'),401
  if not secrets.compare_digest(ph(x.get('password',''),a['password_hash'].split('$')[0]),a['password_hash']):return jsonify(error='invalid username or password'),401
  t=secrets.token_hex(32);get_db().execute('INSERT INTO sessions(token,account_id,expires_at) VALUES(?,?,?)',(t,a['id'],(datetime.datetime.now()+datetime.timedelta(days=7)).strftime('%F %T')));get_db().commit();return jsonify(token=t,account={k:a[k] for k in ['id','username','full_name','role','merchant_id']})
 @app.post('/api/auth/logout')
 def logout():
  h=request.headers.get('Authorization','');get_db().execute('DELETE FROM sessions WHERE token=?',(h[7:],));get_db().commit();return jsonify(ok=True)
 @app.get('/api/auth/me')
 def me():
  a=account()
  if not a:return jsonify(error='authentication required'),401
  out={'account':a}
  if a['role']=='merchant':out['merchant']=row(get_db().execute('SELECT * FROM merchants WHERE id=?',(a['merchant_id'],)))
  return jsonify(out)
 @app.get('/api/merchant/stats')
 @role('merchant')
 def ms():
  r=stat(g.account['merchant_id']);r.update(today_orders=r.pop('orders_today'),today_revenue=0,total_revenue=r.pop('gmv'),avg_order_value=r.pop('aov'),active_products=r.pop('products'));r['top_products']=rows(get_db().execute("SELECT p.name,p.image,sum(oi.qty) units,sum(oi.line_total) revenue FROM order_items oi JOIN products p ON p.id=oi.product_id JOIN orders o ON o.id=oi.order_id WHERE p.merchant_id=? GROUP BY p.id ORDER BY revenue DESC LIMIT 5",(g.account['merchant_id'],)));return jsonify(r)
 @app.route('/api/merchant/products',methods=['GET','POST'])
 @role('merchant')
 def mp():
  db=get_db();mid=g.account['merchant_id']
  if request.method=='POST':
   x=d();fs=['sku','name','name_te','category_id','brand','unit','unit_qty','price','mrp','stock','image','is_fresh','is_best_seller','is_active','merchant_id'];v=[x.get(f,1 if f in ['unit_qty','is_active'] else 0 if f in ['stock','is_fresh','is_best_seller'] else None) for f in fs];v[0]=x.get('sku') or 'M-'+secrets.token_hex(4);v[-1]=mid;c=db.execute('INSERT INTO products('+','.join(fs)+') VALUES('+','.join('?'*len(fs))+')',v);db.commit();return jsonify(id=c.lastrowid),201
  wh='p.merchant_id=?';a=[mid];
  if request.args.get('q'):wh+=' AND p.name LIKE ?';a+=['%'+request.args['q']+'%']
  if request.args.get('stock')=='low':wh+=' AND p.stock<=5'
  return jsonify(rows(db.execute('SELECT p.*,c.name category_name FROM products p JOIN categories c ON c.id=p.category_id WHERE '+wh+' ORDER BY p.id DESC LIMIT ? ',a+[min(int(request.args.get('limit',200)),500)])))
 @app.route('/api/merchant/products/<int:i>',methods=['PUT','DELETE'])
 @role('merchant')
 def mpi(i):
  db=get_db();
  if not db.execute('SELECT 1 FROM products WHERE id=? AND merchant_id=?',(i,g.account['merchant_id'])).fetchone():return jsonify(error='not found'),404
  if request.method=='DELETE':db.execute('UPDATE products SET is_active=0 WHERE id=?',(i,));db.commit();return jsonify(ok=True)
  x=d();ok=['name','name_te','category_id','brand','unit','unit_qty','price','mrp','stock','image','is_fresh','is_best_seller','is_active'];f=[z for z in ok if z in x];db.execute('UPDATE products SET '+','.join(z+'=?' for z in f)+' WHERE id=?',[x[z] for z in f]+[i]);db.commit();return jsonify(row(db.execute('SELECT * FROM products WHERE id=?',(i,))))
 @app.route('/api/merchant/shop',methods=['GET','PUT'])
 @role('merchant')
 def shop():
  db=get_db();mid=g.account['merchant_id'];x=d();f=[z for z in ['name','name_te','phone','address','open_hours','zone_ids'] if z in x]
  if request.method=='PUT' and f:db.execute('UPDATE merchants SET '+','.join(z+'=?' for z in f)+' WHERE id=?',[x[z] for z in f]+[mid]);db.commit()
  return jsonify(row(db.execute('SELECT * FROM merchants WHERE id=?',(mid,))))
 @app.get('/api/merchant/orders')
 @role('merchant')
 def mo():
  db=get_db();a=[g.account['merchant_id']];wh='o.merchant_id=?';
  if request.args.get('status'):wh+=' AND o.status=?';a+=[request.args['status']]
  out=rows(db.execute('SELECT o.*,u.full_name,u.phone,z.name zone_name FROM orders o JOIN users u ON u.id=o.user_id LEFT JOIN delivery_zones z ON z.id=o.zone_id WHERE '+wh+' ORDER BY o.placed_at DESC',a))
  for o in out:o['items']=rows(db.execute('SELECT oi.*,p.name,p.image,p.unit FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=?',(o['id'],)))
  return jsonify(out)
 @app.post('/api/merchant/orders/<int:i>/status')
 @role('merchant')
 def mos(i):
  db=get_db();x=d().get('status');
  if not db.execute('SELECT 1 FROM orders WHERE id=? AND merchant_id=?',(i,g.account['merchant_id'])).fetchone():return jsonify(error='not found'),404
  if x not in ['placed','confirmed','packed','out_for_delivery','delivered','cancelled']:return jsonify(error='invalid status'),400
  db.execute('UPDATE orders SET status=?,delivered_at=CASE WHEN ?="delivered" THEN datetime("now") ELSE delivered_at END WHERE id=?',(x,x,i));db.commit();return jsonify(order_id=i,status=x)
 @app.get('/api/admin/stats')
 @role('admin')
 def ads():
  db=get_db();r=stat();r.update(customers=db.execute('SELECT count(*) FROM users').fetchone()[0],plus_members=db.execute('SELECT count(*) FROM users WHERE is_plus=1').fetchone()[0],merchants=db.execute('SELECT count(*) FROM merchants').fetchone()[0],zones=db.execute('SELECT count(*) FROM delivery_zones').fetchone()[0],suppliers=db.execute('SELECT count(*) FROM suppliers').fetchone()[0]);r['completion_rate']=round(100*r['orders_delivered']/r['orders_total'],1) if r['orders_total'] else 0;r['avg_delivery_time']=db.execute("SELECT round(avg((julianday(delivered_at)-julianday(placed_at))*1440),1) FROM orders WHERE delivered_at IS NOT NULL").fetchone()[0] or 0;r['merchant_revenue']=rows(db.execute("SELECT m.id,m.name,count(o.id) orders,coalesce(sum(CASE WHEN o.status='delivered' THEN o.total END),0) revenue FROM merchants m LEFT JOIN orders o ON o.merchant_id=m.id GROUP BY m.id"));return jsonify(r)
 @app.route('/api/admin/merchants',methods=['GET','POST'])
 @role('admin')
 def adm():
  db=get_db()
  if request.method=='POST':
   x=d();c=db.execute('INSERT INTO merchants(name,name_te,phone,address,zone_ids,open_hours,is_active) VALUES(?,?,?,?,?,?,?)',(x.get('name'),x.get('name_te'),x.get('phone'),x.get('address'),x.get('zone_ids','[]'),x.get('open_hours'),x.get('is_active',1)));db.commit();return jsonify(id=c.lastrowid),201
  return jsonify(rows(db.execute('SELECT m.id,m.name,m.name_te,m.phone,m.address,m.zone_ids,m.open_hours,m.is_active,m.is_default,m.created_at,(SELECT count(*) FROM products p WHERE p.merchant_id=m.id) product_count,(SELECT coalesce(sum(CASE WHEN o.status="delivered" THEN o.total END),0) FROM orders o WHERE o.merchant_id=m.id) revenue,(SELECT coalesce(sum(CASE WHEN o.status NOT IN("delivered","cancelled") THEN 1 ELSE 0 END),0) FROM orders o WHERE o.merchant_id=m.id) active_orders FROM merchants m ORDER BY m.id')))
 @app.put('/api/admin/merchants/<int:i>')
 @role('admin')
 def admi(i):
  x=d();fs=[z for z in ['name','name_te','phone','address','zone_ids','open_hours','is_active'] if z in x];db=get_db();db.execute('UPDATE merchants SET '+','.join(z+'=?' for z in fs)+' WHERE id=?',[x[z] for z in fs]+[i]);db.commit();return jsonify(ok=True)
 @app.get('/api/admin/products')
 @role('admin')
 def adp():return jsonify(rows(get_db().execute('SELECT p.*,c.name category_name,m.name merchant_name FROM products p JOIN categories c ON c.id=p.category_id LEFT JOIN merchants m ON m.id=p.merchant_id ORDER BY p.id DESC')))
 @app.get('/api/admin/orders')
 @role('admin')
 def ado():return jsonify(rows(get_db().execute('SELECT o.*,u.full_name,m.name merchant_name FROM orders o JOIN users u ON u.id=o.user_id LEFT JOIN merchants m ON m.id=o.merchant_id ORDER BY o.placed_at DESC')))
 @app.post('/api/admin/orders/<int:i>/status')
 @role('admin')
 def ados(i):
  x=d().get('status');
  if x not in ['placed','confirmed','packed','out_for_delivery','delivered','cancelled']:return jsonify(error='invalid status'),400
  get_db().execute('UPDATE orders SET status=? WHERE id=?',(x,i));get_db().commit();return jsonify(order_id=i,status=x)
 @app.get('/api/admin/users')
 @role('admin')
 def adu():return jsonify(rows(get_db().execute('SELECT u.id,u.full_name,u.phone,u.is_plus,u.is_active,count(o.id) order_count,coalesce(sum(o.total),0) total_spent FROM users u LEFT JOIN orders o ON o.user_id=u.id GROUP BY u.id')))
 @app.put('/api/admin/users/<int:i>')
 @role('admin')
 def adui(i):
  x=d();fs=[z for z in ['is_plus','is_active'] if z in x];get_db().execute('UPDATE users SET '+','.join(z+'=?' for z in fs)+' WHERE id=?',[x[z] for z in fs]+[i]);get_db().commit();return jsonify(ok=True)
 @app.route('/api/admin/promos',methods=['GET','POST'])
 @role('admin')
 def adpr():
  db=get_db()
  if request.method=='POST':
   x=d();c=db.execute('INSERT INTO promotions(code,description,discount_type,discount_value,min_order,max_discount,valid_from,valid_to,is_active) VALUES(?,?,?,?,?,?,?,?,?)',(x.get('code','').upper(),x.get('description',''),x.get('discount_type','flat'),x.get('discount_value',0),x.get('min_order',0),x.get('max_discount'),x.get('valid_from'),x.get('valid_to'),x.get('is_active',1)));db.commit();return jsonify(id=c.lastrowid),201
  return jsonify(rows(db.execute('SELECT * FROM promotions ORDER BY id DESC')))
 @app.put('/api/admin/promos/<int:i>')
 @role('admin')
 def adpri(i):
  x=d();fs=[z for z in ['code','description','discount_type','discount_value','min_order','max_discount','valid_from','valid_to','is_active'] if z in x];get_db().execute('UPDATE promotions SET '+','.join(z+'=?' for z in fs)+' WHERE id=?',[x[z] for z in fs]+[i]);get_db().commit();return jsonify(ok=True)
 @app.get('/api/admin/zones')
 @role('admin')
 def adz():return jsonify(rows(get_db().execute('SELECT * FROM delivery_zones')))
 @app.put('/api/admin/zones/<int:i>')
 @role('admin')
 def adzi(i):
  x=d();fs=[z for z in ['delivery_fee','sla_minutes','is_active'] if z in x];get_db().execute('UPDATE delivery_zones SET '+','.join(z+'=?' for z in fs)+' WHERE id=?',[x[z] for z in fs]+[i]);get_db().commit();return jsonify(ok=True)
 @app.route('/api/admin/suppliers',methods=['GET','POST'])
 @role('admin')
 def adsup():
  if request.method=='POST':
   x=d();c=get_db().execute('INSERT INTO suppliers(name,type,location,phone) VALUES(?,?,?,?)',(x.get('name'),x.get('type','supplier'),x.get('location'),x.get('phone')));get_db().commit();return jsonify(id=c.lastrowid),201
  return jsonify(rows(get_db().execute('SELECT * FROM suppliers')))
 @app.route('/api/admin/delivery-persons',methods=['GET','POST'])
 @role('admin')
 def addp():
  if request.method=='POST':
   x=d();c=get_db().execute('INSERT INTO delivery_persons(name,phone,vehicle,zone_id) VALUES(?,?,?,?)',(x.get('name'),x.get('phone'),x.get('vehicle'),x.get('zone_id')));get_db().commit();return jsonify(id=c.lastrowid),201
  return jsonify(rows(get_db().execute('SELECT * FROM delivery_persons')))
