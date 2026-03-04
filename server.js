const express = require("express");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database("database.db");

// =======================
// TABLAS
// =======================

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS servicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT,
    estado TEXT,
    fecha TEXT,
    precio REAL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    email TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    serial TEXT,
    area TEXT,
    descripcion TEXT
  )
`).run();

// Crear admin si no existe
const hashedPassword = bcrypt.hashSync("1234", 10);

try {
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)")
    .run("admin", hashedPassword);
} catch (err) {}

// =======================
// MIDDLEWARE
// =======================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
  secret: "mi_secreto_super_seguro",
  resave: false,
  saveUninitialized: false
}));

function authMiddleware(req, res, next) {
  if (req.session.user) next();
  else res.redirect("/");
}

// =======================
// LOGIN
// =======================

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  if (!user) return res.send("Usuario no encontrado");

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.send("Contraseña incorrecta");

  req.session.user = user.username;
  res.redirect("/admin");
});

// =======================
// RUTAS
// =======================

app.get("/admin", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/public/dashboard.html");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// API EQUIPOS

app.post("/api/equipos", authMiddleware, (req, res) => {
  const { nombre, serial, area, descripcion } = req.body;

  db.prepare(`
    INSERT INTO equipos (nombre, serial, area, descripcion)
    VALUES (?, ?, ?, ?)
  `).run(nombre, serial, area, descripcion);

  res.json({ success: true });
});

app.get("/api/equipos", authMiddleware, (req, res) => {
  const equipos = db.prepare("SELECT * FROM equipos ORDER BY id DESC").all();
  res.json(equipos);
});

app.delete("/api/equipos/:id", authMiddleware, (req, res) => {
  db.prepare("DELETE FROM equipos WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// =======================
// SERVIDOR
// =======================

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
