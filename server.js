const express = require("express");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
BASE DE DATOS
========================= */

const db = new Database("database.db");

/* USERS */

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
id INTEGER PRIMARY KEY AUTOINCREMENT,
username TEXT UNIQUE,
password TEXT
)
`).run();

/* CLIENTES */

db.prepare(`
CREATE TABLE IF NOT EXISTS clientes (
id INTEGER PRIMARY KEY AUTOINCREMENT,
nombre TEXT,
email TEXT,
telefono TEXT
)
`).run();

/* EQUIPOS */

db.prepare(`
CREATE TABLE IF NOT EXISTS equipos (
id INTEGER PRIMARY KEY AUTOINCREMENT,
nombre TEXT,
serial TEXT,
area TEXT,
descripcion TEXT,
frecuencia_meses INTEGER DEFAULT 6,
ultima_fecha TEXT
)
`).run();

/* SERVICIOS */

db.prepare(`
CREATE TABLE IF NOT EXISTS servicios (
id INTEGER PRIMARY KEY AUTOINCREMENT,
equipo_id INTEGER,
cliente TEXT,
estado TEXT,
fecha TEXT,
precio REAL
)
`).run();

/* CREAR ADMIN */

const password = bcrypt.hashSync("1234", 10);

try {

db.prepare(`
INSERT INTO users (username,password)
VALUES (?,?)
`).run("admin", password);

console.log("ADMIN CREADO");

} catch {
console.log("ADMIN YA EXISTE");
}

/* =========================
MIDDLEWARE
========================= */

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(express.static("public"));

app.use(session({
secret:"controlpro123",
resave:false,
saveUninitialized:false
}));

/* =========================
AUTH
========================= */

function auth(req,res,next){

if(req.session.user){

next();

}else{

res.redirect("/");

}

}

/* =========================
LOGIN
========================= */

app.post("/login",(req,res)=>{

const {username,password} = req.body;

const user = db.prepare(`
SELECT * FROM users WHERE username = ?
`).get(username);

if(!user){

return res.send("Usuario no existe");

}

const valid = bcrypt.compareSync(password,user.password);

if(!valid){

return res.send("Contraseña incorrecta");

}

req.session.user = user.username;

res.redirect("/dashboard.html");

});

/* =========================
LOGOUT
========================= */

app.get("/logout",(req,res)=>{

req.session.destroy();

res.redirect("/");

});

/* =========================
EQUIPOS
========================= */

app.get("/api/equipos",auth,(req,res)=>{

const data = db.prepare(`
SELECT * FROM equipos ORDER BY id DESC
`).all();

res.json(data);

});


app.post("/api/equipos",auth,(req,res)=>{

const {nombre,serial,area,descripcion,frecuencia_meses} = req.body;

db.prepare(`
INSERT INTO equipos
(nombre,serial,area,descripcion,frecuencia_meses,ultima_fecha)
VALUES (?,?,?,?,?,date('now'))
`).run(nombre,serial,area,descripcion,frecuencia_meses);

res.json({ok:true});

});


app.delete("/api/equipos/:id",auth,(req,res)=>{

db.prepare(`
DELETE FROM equipos WHERE id=?
`).run(req.params.id);

res.json({ok:true});

});

/* =========================
CLIENTES
========================= */

app.get("/api/clientes",auth,(req,res)=>{

const data = db.prepare(`
SELECT * FROM clientes
`).all();

res.json(data);

});

app.post("/api/clientes",auth,(req,res)=>{

const {nombre,email,telefono} = req.body;

db.prepare(`
INSERT INTO clientes
(nombre,email,telefono)
VALUES (?,?,?)
`).run(nombre,email,telefono);

res.json({ok:true});

});

/* =========================
SERVICIOS
========================= */

app.get("/api/servicios",auth,(req,res)=>{

const data = db.prepare(`
SELECT * FROM servicios
ORDER BY fecha DESC
`).all();

res.json(data);

});

app.post("/api/servicios",auth,(req,res)=>{

const {equipo_id,cliente,estado,fecha,precio} = req.body;

db.prepare(`
INSERT INTO servicios
(equipo_id,cliente,estado,fecha,precio)
VALUES (?,?,?,?,?)
`).run(equipo_id,cliente,estado,fecha,precio);

res.json({ok:true});

});

/* =========================
DASHBOARD
========================= */

app.get("/api/dashboard",auth,(req,res)=>{

const equipos = db.prepare(`
SELECT COUNT(*) total FROM equipos
`).get();

const clientes = db.prepare(`
SELECT COUNT(*) total FROM clientes
`).get();

const ingresos = db.prepare(`
SELECT COALESCE(SUM(precio),0) total FROM servicios
`).get();

const ultimos = db.prepare(`
SELECT cliente,estado,fecha,precio
FROM servicios
ORDER BY fecha DESC
LIMIT 5
`).all();

res.json({

equipos:equipos.total,
clientes:clientes.total,
ingresos:ingresos.total,
ultimos

});

});

/* =========================
SERVER
========================= */

app.listen(PORT,()=>{

console.log("Servidor funcionando puerto "+PORT);

});
