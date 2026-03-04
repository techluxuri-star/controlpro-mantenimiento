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
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Dashboard Admin</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: Arial, sans-serif;
      }

      body {
        display: flex;
        height: 100vh;
        background: #f4f6f9;
      }

      .sidebar {
        width: 250px;
        background: #1e293b;
        color: white;
        padding: 20px;
      }

      .sidebar h2 {
        margin-bottom: 30px;
      }

      .sidebar a {
        display: block;
        color: white;
        text-decoration: none;
        margin: 15px 0;
        padding: 10px;
        border-radius: 6px;
        transition: 0.3s;
      }

      .sidebar a:hover {
        background: #334155;
      }

      .main {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .header {
        background: white;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }

      .cards {
        display: flex;
        gap: 20px;
        padding: 20px;
      }

      .card {
        flex: 1;
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
      }

      .table-container {
        padding: 20px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border-radius: 10px;
        overflow: hidden;
      }

      th, td {
        padding: 15px;
        text-align: left;
        border-bottom: 1px solid #eee;
      }

      th {
        background: #f1f5f9;
      }

      .logout {
        background: #ef4444;
        color: white;
        padding: 8px 15px;
        border-radius: 6px;
        text-decoration: none;
      }

      .logout:hover {
        background: #dc2626;
      }
    </style>
  </head>
  <body>

    <div class="sidebar">
      <h2>ControlPro</h2>
      <a href="#">Dashboard</a>
      <a href="#">Servicios</a>
      <a href="#">Usuarios</a>
      <a href="#">Configuración</a>
    </div>

    <div class="main">
      <div class="header">
        <h3>Bienvenido ${req.session.user}</h3>
        <a class="logout" href="/logout">Cerrar sesión</a>
      </div>

      <div class="cards">
        <div class="card">
          <h4>Servicios</h4>
          <p>12 activos</p>
        </div>
        <div class="card">
          <h4>Clientes</h4>
          <p>8 registrados</p>
        </div>
        <div class="card">
          <h4>Ingresos</h4>
          <p>$2,450</p>
        </div>
      </div>

      <div class="table-container">
        <h3>Últimos Servicios</h3>
        <table>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
          <tr>
            <td>1</td>
            <td>Juan Pérez</td>
            <td>En proceso</td>
            <td>03/06/2026</td>
          </tr>
          <tr>
            <td>2</td>
            <td>María López</td>
            <td>Finalizado</td>
            <td>02/06/2026</td>
          </tr>
        </table>
      </div>

    </div>

  </body>
  </html>
  `);
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
