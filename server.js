const express = require("express");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const session = require("express-session");
const app = express();
const PORT = process.env.PORT || 3000;

// Base de datos
const db = new Database("database.db");

// Crear tabla si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`).run();
// Crear tabla servicios si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS servicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT,
    estado TEXT,
    fecha TEXT,
    precio REAL
  )
`).run();

// Crear tabla clientes si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    email TEXT
  )
`).run();

// Crear usuario admin si no existe
const hashedPassword = bcrypt.hashSync("1234", 10);

try {
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)")
    .run("admin", hashedPassword);
  console.log("Usuario admin creado");
} catch (err) {
  console.log("El usuario ya existe");
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
  secret: "mi_secreto_super_seguro",
  resave: false,
  saveUninitialized: false
}));
// Ruta login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE username = ?")
    .get(username);

  if (!user) {
    return res.send("Usuario no encontrado");
  }

  const validPassword = bcrypt.compareSync(password, user.password);

  if (!validPassword) {
    return res.send("Contraseña incorrecta");
  }

  req.session.user = user.username;
res.redirect("/admin");
});

// Iniciar servidor
function authMiddleware(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/");
  }
  next();
}

app.get("/admin", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/public/dashboard.html");

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});
  app.get("/api/dashboard", authMiddleware, async (req, res) => {
  try {

    const totalServicios = await pool.query("SELECT COUNT(*) FROM servicios");
    const totalClientes = await pool.query("SELECT COUNT(*) FROM clientes");
    const totalIngresos = await pool.query("SELECT COALESCE(SUM(precio),0) FROM servicios");
    const ultimosServicios = await pool.query(
      "SELECT cliente, estado, fecha, precio FROM servicios ORDER BY fecha DESC LIMIT 5"
    );

    res.json({
      totalServicios: totalServicios.rows[0].count,
      totalClientes: totalClientes.rows[0].count,
      totalIngresos: totalIngresos.rows[0].coalesce,
      ultimosServicios: ultimosServicios.rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error cargando dashboard" });
  }
});
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
