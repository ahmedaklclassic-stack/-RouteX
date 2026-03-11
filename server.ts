import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import fs from "fs";

const app = express();
const PORT = 3000;
const db = new Database("database.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'user'))
  );

  CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    stage TEXT,
    type TEXT,
    admin_area TEXT,
    address TEXT
  );

  CREATE TABLE IF NOT EXISTS inspectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    job_title TEXT,
    specialization TEXT,
    status TEXT DEFAULT 'active',
    disable_reason TEXT,
    leave_start TEXT,
    leave_end TEXT
  );

  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspector_id INTEGER,
    school_id INTEGER,
    date TEXT,
    FOREIGN KEY(inspector_id) REFERENCES inspectors(id),
    FOREIGN KEY(school_id) REFERENCES schools(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed default admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", "admin123", "admin");
}

app.use(express.json({ limit: '50mb' }));

// Auth API
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT id, username, role FROM users WHERE username = ? AND password = ?").get(username, password) as any;
  if (user) {
    res.json(user);
  } else {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
  }
});

// Users API
app.get("/api/users", (req, res) => {
  const users = db.prepare("SELECT id, username, role FROM users").all();
  res.json(users);
});

app.post("/api/users", (req, res) => {
  const { username, password, role } = req.body;
  try {
    const result = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, password, role || 'user');
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: "اسم المستخدم موجود مسبقاً" });
  }
});

app.put("/api/users/:id", (req, res) => {
  const { username, password, role } = req.body;
  if (password) {
    db.prepare("UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?").run(username, password, role, req.params.id);
  } else {
    db.prepare("UPDATE users SET username = ?, role = ? WHERE id = ?").run(username, role, req.params.id);
  }
  res.json({ success: true });
});

app.delete("/api/users/:id", (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post("/api/change-password", (req, res) => {
  const { userId, newPassword } = req.body;
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(newPassword, userId);
  res.json({ success: true });
});

// Schools API
app.get("/api/schools", (req, res) => {
  const schools = db.prepare("SELECT * FROM schools").all();
  res.json(schools);
});

app.post("/api/schools", (req, res) => {
  const { name, stage, type, admin_area, address } = req.body;
  const result = db.prepare("INSERT INTO schools (name, stage, type, admin_area, address) VALUES (?, ?, ?, ?, ?)").run(name, stage, type, admin_area, address);
  res.json({ id: result.lastInsertRowid });
});

app.put("/api/schools/:id", (req, res) => {
  const { name, stage, type, admin_area, address } = req.body;
  db.prepare("UPDATE schools SET name = ?, stage = ?, type = ?, admin_area = ?, address = ? WHERE id = ?").run(name, stage, type, admin_area, address, req.params.id);
  res.json({ success: true });
});

app.delete("/api/schools/:id", (req, res) => {
  db.prepare("DELETE FROM schools WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Inspectors API
app.get("/api/inspectors", (req, res) => {
  const inspectors = db.prepare("SELECT * FROM inspectors").all();
  res.json(inspectors);
});

app.post("/api/inspectors", (req, res) => {
  const { name, job_title, specialization, status, disable_reason, leave_start, leave_end } = req.body;
  const result = db.prepare("INSERT INTO inspectors (name, job_title, specialization, status, disable_reason, leave_start, leave_end) VALUES (?, ?, ?, ?, ?, ?, ?)").run(name, job_title, specialization, status || 'active', disable_reason, leave_start, leave_end);
  res.json({ id: result.lastInsertRowid });
});

app.put("/api/inspectors/:id", (req, res) => {
  const { name, job_title, specialization, status, disable_reason, leave_start, leave_end } = req.body;
  db.prepare("UPDATE inspectors SET name = ?, job_title = ?, specialization = ?, status = ?, disable_reason = ?, leave_start = ?, leave_end = ? WHERE id = ?").run(name, job_title, specialization, status, disable_reason, leave_start, leave_end, req.params.id);
  res.json({ success: true });
});

app.delete("/api/inspectors/:id", (req, res) => {
  db.prepare("DELETE FROM inspectors WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Routes API
app.get("/api/routes", (req, res) => {
  const routes = db.prepare(`
    SELECT r.*, i.name as inspector_name, s.name as school_name 
    FROM routes r
    JOIN inspectors i ON r.inspector_id = i.id
    JOIN schools s ON r.school_id = s.id
  `).all();
  res.json(routes);
});

app.post("/api/routes", (req, res) => {
  const { inspector_id, school_id, date } = req.body;
  const result = db.prepare("INSERT INTO routes (inspector_id, school_id, date) VALUES (?, ?, ?)").run(inspector_id, school_id, date);
  res.json({ id: result.lastInsertRowid });
});

app.delete("/api/routes/:id", (req, res) => {
  db.prepare("DELETE FROM routes WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Backup API
app.get("/api/backup", (req, res) => {
  const data = {
    schools: db.prepare("SELECT * FROM schools").all(),
    inspectors: db.prepare("SELECT * FROM inspectors").all(),
    routes: db.prepare("SELECT * FROM routes").all(),
    users: db.prepare("SELECT id, username, password, role FROM users").all()
  };
  res.setHeader('Content-disposition', 'attachment; filename=backup.json');
  res.setHeader('Content-type', 'application/json');
  res.send(JSON.stringify(data, null, 2));
});

app.post("/api/restore", (req, res) => {
  const { schools, inspectors, routes, users } = req.body;
  db.transaction(() => {
    db.prepare("DELETE FROM schools").run();
    db.prepare("DELETE FROM inspectors").run();
    db.prepare("DELETE FROM routes").run();
    db.prepare("DELETE FROM users").run();

    if (schools) schools.forEach((s: any) => db.prepare("INSERT INTO schools (id, name, stage, type, admin_area, address) VALUES (?, ?, ?, ?, ?, ?)").run(s.id, s.name, s.stage, s.type, s.admin_area, s.address));
    if (inspectors) inspectors.forEach((i: any) => db.prepare("INSERT INTO inspectors (id, name, job_title, specialization, status, disable_reason, leave_start, leave_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(i.id, i.name, i.job_title, i.specialization, i.status, i.disable_reason, i.leave_start, i.leave_end));
    if (routes) routes.forEach((r: any) => db.prepare("INSERT INTO routes (id, inspector_id, school_id, date) VALUES (?, ?, ?, ?)").run(r.id, r.inspector_id, r.school_id, r.date));
    if (users) users.forEach((u: any) => db.prepare("INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)").run(u.id, u.username, u.password, u.role));
  })();
  res.json({ success: true });
});

// License API (Simulated Machine ID)
app.get("/api/machine-id", (req, res) => {
  let machineId = db.prepare("SELECT value FROM settings WHERE key = 'machine_id'").get() as any;
  if (!machineId) {
    const newId = "CCS-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    db.prepare("INSERT INTO settings (key, value) VALUES ('machine_id', ?)").run(newId);
    machineId = { value: newId };
  }
  res.json({ machineId: machineId.value });
});

app.post("/api/activate", (req, res) => {
  const { key } = req.body;
  // Simple check: key should be reverse of machineId or something similar for demo
  // In real app, this would be a cryptographic check
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('activation_key', ?)").run(key);
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('activation_date', ?)").run(new Date().toISOString());
  res.json({ success: true });
});

app.get("/api/status", (req, res) => {
  const activationKey = db.prepare("SELECT value FROM settings WHERE key = 'activation_key'").get() as any;
  const activationDate = db.prepare("SELECT value FROM settings WHERE key = 'activation_date'").get() as any;
  
  if (!activationKey) return res.json({ active: false });
  
  const startDate = new Date(activationDate.value);
  const expiryDate = new Date(startDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  
  res.json({ 
    active: new Date() < expiryDate,
    expiryDate: expiryDate.toISOString()
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
