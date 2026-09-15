const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const listingsRouter = require('./routes/listings');
const ngosRouter = require('./routes/ngos');
const pool = require('./db/connection');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// API Routes
app.use('/api/listings', listingsRouter);
app.use('/api/ngos', ngosRouter);

// Fallback to index.html for SPA-like navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled application error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n===========================================`);
    console.log(`🌿 FoodSave Server running on http://localhost:${PORT}`);
    console.log(`📊 Connected to MySQL database: ${process.env.DB_NAME || 'foodsave_db'}`);
    console.log(`===========================================\n`);
  });
}

module.exports = app;
