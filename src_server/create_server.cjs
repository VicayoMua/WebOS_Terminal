const
    express = require('express'),
    cors = require('cors'),
    sqlite3 = require('sqlite3').verbose(),
    path = require('path');

const app = express();
app.use(express.json());
app.use(cors()); // ok for dev. lock this down in prod.

// --- DB ---
const db = new sqlite3.Database(
  path.join(__dirname, 'MyCloud.db'),
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => { if (err) console.error('DB open error:', err.message); }
);

// init schema
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON;');
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name  TEXT NOT NULL,
      username   TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,   -- TODO: hash in real apps!
      email      TEXT NOT NULL UNIQUE
    );
  `);
});

// --- REST API ---
// List users (optional simple pagination: ?limit=20&offset=0)
app.get('/api/users', (req, res) => {
  const limit = Math.max(0, parseInt(req.query.limit ?? '100', 10));
  const offset = Math.max(0, parseInt(req.query.offset ?? '0', 10));
  db.all(
    `SELECT id, first_name, last_name, username, email
       FROM users
      ORDER BY id
      LIMIT ? OFFSET ?`,
    [limit, offset],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get one user
app.get('/api/users/:id', (req, res) => {
  db.get(
    `SELECT id, first_name, last_name, username, email
       FROM users WHERE id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    }
  );
});

// Create user
app.post('/api/users', (req, res) => {
  const { first_name, last_name, username, password, email } = req.body || {};
  if (!first_name || !last_name || !username || !password || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  db.run(
    `INSERT INTO users(first_name, last_name, username, password, email)
     VALUES (?,?,?,?,?)`,
    [first_name, last_name, username, password, email],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Update user (partial update allowed)
app.put('/api/users/:id', (req, res) => {
  const { first_name, last_name, username, password, email } = req.body || {};
  // Build dynamic update
  const fields = [];
  const params = [];
  if (first_name !== undefined) { fields.push('first_name = ?'); params.push(first_name); }
  if (last_name  !== undefined) { fields.push('last_name  = ?'); params.push(last_name); }
  if (username   !== undefined) { fields.push('username   = ?'); params.push(username); }
  if (password   !== undefined) { fields.push('password   = ?'); params.push(password); }
  if (email      !== undefined) { fields.push('email      = ?'); params.push(email); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  db.run(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    params,
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  db.run(`DELETE FROM users WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.status(204).end();
  });
});

// --- Static front-end (optional): serve index.html from /public ---
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
