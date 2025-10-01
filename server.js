// server.js
const express = require('express');
const cors    = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const path    = require('path');
const terminalRoutes = require('./routes/terminal'); // adjust the path if needed

const app = express();

// — Middlewares —
app.use(cors());
app.use(express.json());
app.use('/api', terminalRoutes);

// — Sequelize & SQLite setup —
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'fs.sqlite'),
  logging: false,     // turn off SQL logging
});

// Define FSStates model
const FSState = sequelize.define('FSState', {
  id:   { type: DataTypes.STRING, primaryKey: true },
  data: { type: DataTypes.TEXT,   allowNull: false },
}, {
  tableName: 'FSStates',
  timestamps: false,
});

// — Persistence Endpoints —
// Save the full FS JSON under a fixed key
app.post('/api/fs/save', async (req, res) => {
  try {
    await FSState.upsert({
      id:   'terminal_file_system',
      data: JSON.stringify(req.body),
    });
    res.sendStatus(204);
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).send({ error: err.message });
  }
});

// Load it back
app.get('/api/fs/load', async (req, res) => {
  try {
    const row = await FSState.findByPk('terminal_file_system');
    res.json(row ? JSON.parse(row.data) : {});
  } catch (err) {
    console.error('Load error:', err);
    res.status(500).send({ error: err.message });
  }
});

// server.js (near the top, right after you instantiate `sequelize`)
(async () => {
  try {
    // 1) Check the connection
    await sequelize.authenticate();
    console.log('Sequelize connection OK');

    // 2) Sync & inspect the tables
    await sequelize.sync();  
    console.log('Models synced to the DB');

    // 3) List all tables in the SQLite file
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('Tables in SQLite:', tables);

    // 4) (Optional) Run a quick find to prove the FSState model exists
    const rows = await FSState.findAll();
    console.log(`🗄️  FSStates table has ${rows.length} rows`);
  } catch (err) {
    console.error('Sequelize setup error:', err);
    process.exit(1);
  }
})();


// — Start Server after syncing DB —
const PORT = process.env.PORT || 3000;
(async () => {
  try {
    await sequelize.sync(); // create table if not exist
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to sync database:', err);
  }
})();
