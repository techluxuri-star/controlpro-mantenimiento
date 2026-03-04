const express = require("express");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

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

  res.send("Login correcto 🚀");
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
