const express = require("express");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// BASE DE DATOS
// =========================

const db = new Database("database.db");

// Usuarios
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
id INTEGER PRIMARY KEY AUTOINCREMENT,
username TEXT UNIQUE,
password TEXT
)
`).run();

// Clientes
db.prepare(`
CREATE TABLE IF NOT EXISTS clientes (
id INTEGER PRIMARY KEY AUTOINCREMENT,
nombre TEXT,
email TEXT,
telefono TEXT
)
`).run();

// Equipos
db.prepare(`
CREATE TABLE IF NOT EXISTS equipos (
id INTEGER PRIMARY KEY AUTOINCREMENT,
nombre TEXT,
serial TEXT,
marca TEXT,
area TEXT,
descripcion TEXT,
frecuencia INTEGER
)
`).run();

// Mantenimientos
db.prepare(`
CREATE TABLE IF NOT EXISTS mantenimientos (
id INTEGER PRIMARY KEY AUTOINCREMENT,
equipo_id INTEGER,
fecha_programada TEXT,
fecha_realizada TEXT,
estado TEXT,
observaciones TEXT
)
`).run();

// =========================
// CREAR ADMIN
// =========================

const hashedPassword = bcrypt.hashSync("1234", 10);

try {
db.prepare("INSERT INTO users (username,password) VALUES (?,?)")
.run("admin", hashedPassword);
console.log("Admin creado");
} catch {
console.log("Admin ya existe");
}

// =========================
// MIDDLEWARE
// =========================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
secret: "controlpro_secret",
resave: false,
saveUninitialized: false
}));

// =========================
// AUTH
// =========================

function auth(req,res,next){
if(req.session.user){
next();
}else{
res.redirect("/");
}
}

// =========================
// LOGIN
// =========================

app.post("/login",(req,res)=>{

const {username,password}=req.body;

const user=db.prepare("SELECT * FROM users WHERE username=?")
.get(username);

if(!user){
return res.send("Usuario no encontrado");
}

const valid=bcrypt.compareSync(password,user.password);

if(!valid){
return res.send("Contraseña incorrecta");
}

req.session.user=user.username;

res.redirect("/admin");

});

// =========================
// PANEL
// =========================

app.get("/admin",auth,(req,res)=>{
res.sendFile(path.join(__dirname,"public","dashboard.html"));
});

// =========================
// DASHBOARD API
// =========================

app.get("/api/dashboard",auth,(req,res)=>{

const equipos=db.prepare("SELECT COUNT(*) as total FROM equipos").get();
const clientes=db.prepare("SELECT COUNT(*) as total FROM clientes").get();
const mantenimientos=db.prepare("SELECT COUNT(*) as total FROM mantenimientos").get();

res.json({
equipos:equipos.total,
clientes:clientes.total,
mantenimientos:mantenimientos.total
});

});

// =========================
// EQUIPOS
// =========================

// obtener equipos
app.get("/api/equipos",auth,(req,res)=>{

const data=db.prepare("SELECT * FROM equipos ORDER BY id DESC").all();

res.json(data);

});

// crear equipo
app.post("/api/equipos",auth,(req,res)=>{

const {nombre,serial,marca,area,descripcion,frecuencia}=req.body;

db.prepare(`
INSERT INTO equipos
(nombre,serial,marca,area,descripcion,frecuencia)
VALUES (?,?,?,?,?,?)
`).run(nombre,serial,marca,area,descripcion,frecuencia);

res.json({ok:true});

});

// eliminar equipo
app.delete("/api/equipos/:id",auth,(req,res)=>{

db.prepare("DELETE FROM equipos WHERE id=?")
.run(req.params.id);

res.json({ok:true});

});

// =========================
// CLIENTES
// =========================

// obtener clientes
app.get("/api/clientes",auth,(req,res)=>{

const data=db.prepare("SELECT * FROM clientes").all();

res.json(data);

});

// crear cliente
app.post("/api/clientes",auth,(req,res)=>{

const {nombre,email,telefono}=req.body;

db.prepare(`
INSERT INTO clientes
(nombre,email,telefono)
VALUES (?,?,?)
`).run(nombre,email,telefono);

res.json({ok:true});

});

// =========================
// MANTENIMIENTOS
// =========================

// programar mantenimiento
app.post("/api/mantenimiento",auth,(req,res)=>{

const {equipo_id,fecha}=req.body;

db.prepare(`
INSERT INTO mantenimientos
(equipo_id,fecha_programada,estado)
VALUES (?,?,?)
`).run(equipo_id,fecha,"programado");

res.json({ok:true});

});

// historial mantenimiento
app.get("/api/mantenimiento/:id",auth,(req,res)=>{

const data=db.prepare(`
SELECT * FROM mantenimientos
WHERE equipo_id=?
ORDER BY fecha_programada DESC
`).all(req.params.id);

res.json(data);

});

// =========================
// LOGOUT
// =========================

app.get("/logout",(req,res)=>{

req.session.destroy();

res.redirect("/");

});

// =========================
// SERVIDOR
// =========================

app.listen(PORT,()=>{

console.log("Servidor corriendo en puerto "+PORT);

});
