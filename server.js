const express = require("express");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// =======================
// BASE DE DATOS
// =======================

const db = new Database("database.db");

// Tabla usuarios
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`).run();

// Tabla servicios
db.prepare(`
  CREATE TABLE IF NOT EXISTS servicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT,
    estado TEXT,
    fecha TEXT,
    precio REAL
  )
`).run();

// Tabla clientes
db.prepare(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    email TEXT
  )
`).run();
// Tabla equipos
db.prepare(`
  CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    serial TEXT,
    area TEXT,
    descripcion TEXT
  )
`).run();

// Crear usuario admin si no existe
const hashedPassword = bcrypt.hashSync("1234", 10);

try {
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)")
    .run("admin", hashedPassword);
  console.log("Usuario admin creado");
} catch (err) {
  console.log("El usuario admin ya existe");
}

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

// =======================
// LOGIN
// =======================

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

// =======================
// AUTH MIDDLEWARE
// =======================

function authMiddleware(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/");
  }
}

// =======================
// RUTAS
// =======================

<h1>Panel de Administración</h1>

<h2>Agregar Equipo</h2>

<form id="formEquipo">
  <input type="text" name="nombre" placeholder="Nombre equipo" required>
  <input type="text" name="serial" placeholder="Serial" required>
  <input type="text" name="area" placeholder="Área" required>
  <input type="text" name="descripcion" placeholder="Descripción">
  <button type="submit">Guardar</button>
</form>

<h2>Lista de Equipos</h2>
<ul id="listaEquipos"></ul>

<button onclick="logout()">Cerrar sesión</button>

<script>
async function cargarEquipos() {
  const res = await fetch("/api/equipos");
  const equipos = await res.json();

  const lista = document.getElementById("listaEquipos");
  lista.innerHTML = "";

  equipos.forEach(e => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${e.nombre}</strong> - ${e.serial} - ${e.area}
      <button onclick="eliminar(${e.id})">Eliminar</button>
    `;
    lista.appendChild(li);
  });
}

document.getElementById("formEquipo").addEventListener("submit", async function(e) {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(this));

  await fetch("/api/equipos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  this.reset();
  cargarEquipos();
});

async function eliminar(id) {
  await fetch("/api/equipos/" + id, { method: "DELETE" });
  cargarEquipos();
}

function logout() {
  window.location.href = "/logout";
}

cargarEquipos();
</script>

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get("/api/dashboard", authMiddleware, (req, res) => {
  try {
    const totalServicios = db.prepare("SELECT COUNT(*) as count FROM servicios").get();
    const totalClientes = db.prepare("SELECT COUNT(*) as count FROM clientes").get();
    const totalIngresos = db.prepare("SELECT COALESCE(SUM(precio),0) as total FROM servicios").get();
    const ultimosServicios = db.prepare(
      "SELECT cliente, estado, fecha, precio FROM servicios ORDER BY fecha DESC LIMIT 5"
    ).all();

    res.json({
      totalServicios: totalServicios.count,
      totalClientes: totalClientes.count,
      totalIngresos: totalIngresos.total,
      ultimosServicios: ultimosServicios
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error cargando dashboard" });
  }
});

// =======================
// INICIAR SERVIDOR
// =======================

// Crear equipo
app.post("/api/equipos", authMiddleware, (req, res) => {
  try {
    const { nombre, serial, area, descripcion } = req.body;

    db.prepare(`
      INSERT INTO equipos (nombre, serial, area, descripcion)
      VALUES (?, ?, ?, ?)
    `).run(nombre, serial, area, descripcion);

    res.json({ success: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error guardando equipo" });
  }
});

// Obtener equipos
app.get("/api/equipos", authMiddleware, (req, res) => {
  try {
    const equipos = db.prepare("SELECT * FROM equipos ORDER BY id DESC").all();
    res.json(equipos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo equipos" });
  }
});
// Eliminar equipo
app.delete("/api/equipos/:id", authMiddleware, (req, res) => {
  try {
    const { id } = req.params;

    db.prepare("DELETE FROM equipos WHERE id = ?").run(id);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error eliminando equipo" });
  }
});
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
