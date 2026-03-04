
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const app = express();
const db = new Database("database.db");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
    secret: "gradisur_secret",
    resave: false,
    saveUninitialized: true
}));

// Create tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
);

CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT,
    serial TEXT,
    area TEXT,
    description TEXT,
    status TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    equipment_id TEXT,
    action TEXT,
    notes TEXT,
    photo TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS maintenance (
    id TEXT PRIMARY KEY,
    equipment_id TEXT,
    type TEXT,
    scheduled_date TEXT,
    created_by TEXT
);
`);

// Default admin
const adminExists = db.prepare("SELECT * FROM users WHERE username=?").get("admin");
if (!adminExists) {
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare("INSERT INTO users VALUES (?, ?, ?, ?)")
      .run(uuidv4(), "admin", hash, "admin");
}

// File upload config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = "./public/uploads";
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Auth middleware
function auth(role) {
    return (req, res, next) => {
        if (!req.session.user) return res.redirect("/");
        if (role && req.session.user.role !== role && req.session.user.role !== "admin")
            return res.send("No autorizado");
        next();
    };
}

// Routes
app.post("/login", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE username=?").get(req.body.username);
    if (user && bcrypt.compareSync(req.body.password, user.password)) {
        req.session.user = user;
        res.redirect("/dashboard.html");
    } else {
        res.send("Login incorrecto");
    }
});

app.post("/add-equipment", auth(), (req, res) => {
    db.prepare("INSERT INTO equipment VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(uuidv4(), req.body.name, req.body.serial, req.body.area,
           req.body.description, "Activo", new Date().toISOString());
    res.redirect("/dashboard.html");
});

app.post("/log-action", auth(), upload.single("photo"), (req, res) => {
    db.prepare("INSERT INTO logs VALUES (?, ?, ?, ?, ?, ?)")
      .run(uuidv4(), req.body.equipment_id, req.body.action,
           req.body.notes,
           req.file ? "/uploads/" + req.file.filename : null,
           new Date().toISOString());
    res.redirect("/dashboard.html");
});

app.post("/schedule-maintenance", auth(), (req, res) => {
    db.prepare("INSERT INTO maintenance VALUES (?, ?, ?, ?, ?)")
      .run(uuidv4(), req.body.equipment_id, req.body.type,
           req.body.date, req.session.user.username);
    res.redirect("/dashboard.html");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});
