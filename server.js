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
    <title>Panel Administrativo</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: linear-gradient(135deg, #1e3c72, #2a5298);
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        color: white;
      }

      .card {
        background: rgba(255, 255, 255, 0.1);
        padding: 40px;
        border-radius: 15px;
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        text-align: center;
        width: 350px;
      }

      h1 {
        margin-bottom: 10px;
      }

      p {
        margin-bottom: 25px;
        font-size: 18px;
      }

      a {
        display: inline-block;
        padding: 10px 20px;
        background: #ff4b2b;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        transition: 0.3s;
      }

      a:hover {
        background: #ff416c;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Panel Administrativo</h1>
      <p>Bienvenido <strong>${req.session.user}</strong></p>
      <a href="/logout">Cerrar sesión</a>
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
