const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database("boxhub.db");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-secret",
  resave:false, saveUninitialized:false,
  cookie:{httpOnly:true,maxAge:7*24*60*60*1000}
}));
app.use(express.static(path.join(__dirname,"public")));

db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT UNIQUE NOT NULL,
 password TEXT NOT NULL,
 wallet INTEGER DEFAULT 7074,
 points INTEGER DEFAULT 27248,
 level INTEGER DEFAULT 25,
 xp INTEGER DEFAULT 14409
);
CREATE TABLE IF NOT EXISTS products(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 category TEXT NOT NULL,
 price INTEGER NOT NULL,
 spins INTEGER DEFAULT 0,
 emoji TEXT NOT NULL,
 description TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS inventory(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 product_id INTEGER NOT NULL,
 qty INTEGER DEFAULT 1,
 FOREIGN KEY(user_id) REFERENCES users(id),
 FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS transactions(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 type TEXT NOT NULL,
 amount INTEGER DEFAULT 0,
 note TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const count = db.prepare("SELECT COUNT(*) c FROM products").get().c;
if (!count) {
  const ins = db.prepare("INSERT INTO products(name,category,price,spins,emoji,description) VALUES(?,?,?,?,?,?)");
  [
    ["One Piece: Wanted Parallel Series","Hot",36550,516,"🏝️🎴","Collector box bertema kartu premium."],
    ["Anya Adventure Treasury","Hot",1290,4744,"🧸🌸","Mystery box karakter lucu."],
    ["Premium Collector Box","Combo",12900,1250,"🎴✨","Box kolektor edisi premium."],
    ["Special Card Treasure","Battle",8500,720,"🃏💎","Koleksi kartu spesial."]
  ].forEach(x=>ins.run(...x));
}

function user(req){ return req.session.userId ? db.prepare("SELECT id,username,wallet,points,level,xp FROM users WHERE id=?").get(req.session.userId) : null; }
function auth(req,res,next){ if(!user(req)) return res.status(401).json({error:"Silakan login terlebih dahulu"}); next(); }

app.get("/api/me",(req,res)=>res.json({user:user(req)}));

app.post("/api/register",(req,res)=>{
  const {username,password}=req.body;
  if(!username || !password || username.length<3 || password.length<4)
    return res.status(400).json({error:"Username minimal 3 karakter dan password minimal 4 karakter."});
  try{
    const r=db.prepare("INSERT INTO users(username,password) VALUES(?,?)").run(username,password);
    req.session.userId=r.lastInsertRowid;
    res.json({ok:true,user:user(req)});
  }catch(e){res.status(409).json({error:"Username sudah digunakan."});}
});

app.post("/api/login",(req,res)=>{
  const u=db.prepare("SELECT * FROM users WHERE username=? AND password=?").get(req.body.username,req.body.password);
  if(!u) return res.status(401).json({error:"Username atau password salah."});
  req.session.userId=u.id; res.json({ok:true,user:user(req)});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.get("/api/products",(req,res)=>{
  const category=req.query.category;
  const rows=category && category!=="Semua"
    ? db.prepare("SELECT * FROM products WHERE category=? ORDER BY id DESC").all(category)
    : db.prepare("SELECT * FROM products ORDER BY id DESC").all();
  res.json({products:rows});
});

app.post("/api/topup",auth,(req,res)=>{
  const amount=Math.floor(Number(req.body.amount));
  if(!Number.isFinite(amount)||amount<1000||amount>100000000) return res.status(400).json({error:"Nominal top up 1.000 sampai 100.000.000."});
  const u=user(req);
  db.prepare("UPDATE users SET wallet=wallet+? WHERE id=?").run(amount,u.id);
  db.prepare("INSERT INTO transactions(user_id,type,amount,note) VALUES(?,?,?,?)").run(u.id,"TOPUP",amount,"Demo top up");
  res.json({ok:true,user:user(req)});
});

app.post("/api/buy/:id",auth,(req,res)=>{
  const p=db.prepare("SELECT * FROM products WHERE id=?").get(req.params.id);
  const u=user(req);
  if(!p) return res.status(404).json({error:"Produk tidak ditemukan."});
  if(u.wallet<p.price) return res.status(400).json({error:"Saldo tidak cukup."});
  db.prepare("UPDATE users SET wallet=wallet-? WHERE id=?").run(p.price,u.id);
  const old=db.prepare("SELECT * FROM inventory WHERE user_id=? AND product_id=?").get(u.id,p.id);
  if(old) db.prepare("UPDATE inventory SET qty=qty+1 WHERE id=?").run(old.id);
  else db.prepare("INSERT INTO inventory(user_id,product_id,qty) VALUES(?,?,1)").run(u.id,p.id);
  db.prepare("INSERT INTO transactions(user_id,type,amount,note) VALUES(?,?,?,?)").run(u.id,"BUY",-p.price,p.name);
  res.json({ok:true,user:user(req),message:"Produk masuk ke Gudang."});
});

app.get("/api/inventory",auth,(req,res)=>{
  res.json({items:db.prepare(`
    SELECT i.id,i.qty,p.name,p.price,p.emoji,p.description
    FROM inventory i JOIN products p ON p.id=i.product_id
    WHERE i.user_id=? ORDER BY i.id DESC`).all(user(req).id)});
});

app.get("/api/transactions",auth,(req,res)=>{
  res.json({items:db.prepare("SELECT * FROM transactions WHERE user_id=? ORDER BY id DESC LIMIT 50").all(user(req).id)});
});

app.listen(process.env.PORT||3000,()=>console.log("BoxHub berjalan di http://localhost:"+(process.env.PORT||3000)));