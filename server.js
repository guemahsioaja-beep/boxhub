const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "boxhub-demo-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname, "public")));

// Demo data
const users = [];
const inventory = {};
const transactions = {};

const products = [
  {
    id: 1,
    name: "One Piece: Wanted Parallel Series",
    category: "Hot",
    price: 36550,
    spins: 516,
    emoji: "🏝️🎴",
    description: "Collector box bertema kartu premium."
  },
  {
    id: 2,
    name: "Anya Adventure Treasury",
    category: "Hot",
    price: 1290,
    spins: 4744,
    emoji: "🧸🌸",
    description: "Mystery box karakter lucu."
  },
  {
    id: 3,
    name: "Premium Collector Box",
    category: "Combo",
    price: 12900,
    spins: 1250,
    emoji: "🎴✨",
    description: "Box kolektor edisi premium."
  },
  {
    id: 4,
    name: "Special Card Treasure",
    category: "Battle",
    price: 8500,
    spins: 720,
    emoji: "🃏💎",
    description: "Koleksi kartu spesial."
  }
];

function getUser(req) {
  if (!req.session.userId) return null;

  const u = users.find(x => x.id === req.session.userId);
  if (!u) return null;

  return {
    id: u.id,
    username: u.username,
    wallet: u.wallet,
    points: u.points,
    level: u.level,
    xp: u.xp
  };
}

function auth(req, res, next) {
  if (!getUser(req)) {
    return res.status(401).json({
      error: "Silakan login terlebih dahulu"
    });
  }

  next();
}

// User
app.get("/api/me", (req, res) => {
  res.json({
    user: getUser(req)
  });
});

// Register
app.post("/api/register", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (username.length < 3 || password.length < 4) {
    return res.status(400).json({
      error: "Username minimal 3 karakter dan password minimal 4 karakter."
    });
  }

  if (users.some(u => u.username === username)) {
    return res.status(409).json({
      error: "Username sudah digunakan."
    });
  }

  const newUser = {
    id: users.length + 1,
    username,
    password,
    wallet: 7074,
    points: 27248,
    level: 25,
    xp: 14409
  };

  users.push(newUser);
  inventory[newUser.id] = [];
  transactions[newUser.id] = [];

  req.session.userId = newUser.id;

  res.json({
    ok: true,
    user: getUser(req)
  });
});

// Login
app.post("/api/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  const u = users.find(
    x => x.username === username && x.password === password
  );

  if (!u) {
    return res.status(401).json({
      error: "Username atau password salah."
    });
  }

  req.session.userId = u.id;

  res.json({
    ok: true,
    user: getUser(req)
  });
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// Products
app.get("/api/products", (req, res) => {
  const category = req.query.category;

  let result = products;

  if (category && category !== "Semua") {
    result = products.filter(p => p.category === category);
  }

  res.json({
    products: result
  });
});

// Demo top up
app.post("/api/topup", auth, (req, res) => {
  const amount = Math.floor(Number(req.body.amount));

  if (
    !Number.isFinite(amount) ||
    amount < 1000 ||
    amount > 100000000
  ) {
    return res.status(400).json({
      error: "Nominal top up 1.000 sampai 100.000.000."
    });
  }

  const u = users.find(x => x.id === req.session.userId);

  u.wallet += amount;

  transactions[u.id].push({
    id: Date.now(),
    type: "TOPUP",
    amount,
    note: "Demo top up",
    created_at: new Date().toISOString()
  });

  res.json({
    ok: true,
    user: getUser(req)
  });
});

// Buy product
app.post("/api/buy/:id", auth, (req, res) => {
  const product = products.find(
    p => p.id === Number(req.params.id)
  );

  const u = users.find(x => x.id === req.session.userId);

  if (!product) {
    return res.status(404).json({
      error: "Produk tidak ditemukan."
    });
  }

  if (u.wallet < product.price) {
    return res.status(400).json({
      error: "Saldo tidak cukup."
    });
  }

  u.wallet -= product.price;

  inventory[u.id].push({
    id: Date.now(),
    product_id: product.id,
    name: product.name,
    price: product.price,
    emoji: product.emoji,
    description: product.description,
    qty: 1
  });

  transactions[u.id].push({
    id: Date.now(),
    type: "BUY",
    amount: -product.price,
    note: product.name,
    created_at: new Date().toISOString()
  });

  res.json({
    ok: true,
    user: getUser(req),
    message: "Produk masuk ke Gudang."
  });
});

// Inventory
app.get("/api/inventory", auth, (req, res) => {
  res.json({
    items: inventory[req.session.userId] || []
  });
});

// Transactions
app.get("/api/transactions", auth, (req, res) => {
  res.json({
    items: (transactions[req.session.userId] || [])
      .slice()
      .reverse()
      .slice(0, 50)
  });
});

// Vercel membutuhkan export
module.exports = app;
