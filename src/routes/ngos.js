const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

/**
 * GET /api/ngos/match?city=X&category=Y&quantity=Z
 * Return top 3 NGOs in that city with enough capacity, ranked by capacity fit (ascending).
 */
router.get('/match', async (req, res) => {
  try {
    const { city, quantity } = req.query;

    if (!city) {
      return res.status(400).json({ success: false, error: 'City query parameter is required.' });
    }

    const parsedQty = parseInt(quantity, 10) || 1;

    const [ngos] = await pool.query(
      `SELECT id, name, city, area, contact_phone, capacity_per_day, active
       FROM ngos
       WHERE LOWER(TRIM(city)) = LOWER(TRIM(?)) AND capacity_per_day >= ? AND (active = true OR active IS TRUE)
       ORDER BY capacity_per_day ASC
       LIMIT 3`,
      [city, parsedQty]
    );

    res.json({
      success: true,
      city,
      required_capacity: parsedQty,
      count: ngos.length,
      ngos
    });
  } catch (error) {
    console.error('Error matching NGOs:', error);
    res.status(500).json({ success: false, error: 'Internal server error matching NGOs.' });
  }
});

/**
 * GET /api/ngos
 * List all active NGOs (optionally filtered by city)
 */
router.get('/', async (req, res) => {
  try {
    const { city } = req.query;
    let query = 'SELECT * FROM ngos WHERE (active = true OR active IS TRUE)';
    const params = [];

    if (city) {
      query += ' AND LOWER(TRIM(city)) = LOWER(TRIM(?))';
      params.push(city);
    }
    query += ' ORDER BY city ASC, capacity_per_day DESC';

    const [ngos] = await pool.query(query, params);
    res.json({ success: true, count: ngos.length, ngos });
  } catch (error) {
    console.error('Error fetching NGOs:', error);
    res.status(500).json({ success: false, error: 'Internal server error fetching NGOs.' });
  }
});

module.exports = router;
