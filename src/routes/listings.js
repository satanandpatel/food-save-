const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// Rule mapping:
// Cooked meal = 3 hrs (urgent), Bakery = 8 hrs, Fruits & Veg = 24 hrs, Packaged = 48+ hrs
const SHELF_RULES = {
  'Cooked meal': { shelf_life_hours: 3.0, urgency: 'high', label: '3 hours' },
  'Bakery': { shelf_life_hours: 8.0, urgency: 'normal', label: '8 hours' },
  'Fruits & Veg': { shelf_life_hours: 24.0, urgency: 'normal', label: '24 hours' },
  'Packaged': { shelf_life_hours: 48.0, urgency: 'normal', label: '48+ hours' }
};

/**
 * POST /api/listings
 * Create a new surplus food listing, calculate shelf life and urgency server-side,
 * and match with top 3 NGOs in that city.
 */
router.post('/', async (req, res) => {
  try {
    const {
      donor_name = 'Grand Palace Hotel & Banquet',
      donor_type = 'restaurant',
      donor_phone = '+91 98260 55001',
      city = 'Indore',
      category = 'Cooked meal',
      quantity,
      prepared_at
    } = req.body;

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be a positive integer.' });
    }

    if (!SHELF_RULES[category]) {
      return res.status(400).json({
        success: false,
        error: `Invalid category. Must be one of: ${Object.keys(SHELF_RULES).join(', ')}`
      });
    }

    const rule = SHELF_RULES[category];
    const shelf_life_hours = rule.shelf_life_hours;
    const urgency = rule.urgency;

    // Determine prepared_at timestamp
    let prepDate = new Date();
    if (prepared_at) {
      const parsed = new Date(prepared_at);
      if (!isNaN(parsed.getTime())) {
        prepDate = parsed;
      }
    }

    // 1. Find or create donor
    const [existingDonors] = await pool.query(
      'SELECT id FROM donors WHERE name = ? AND city = ? LIMIT 1',
      [donor_name, city]
    );

    let donor_id;
    if (existingDonors.length > 0) {
      donor_id = existingDonors[0].id;
    } else {
      const validTypes = ['restaurant', 'event', 'mess'];
      const sanitizedType = validTypes.includes(donor_type) ? donor_type : 'restaurant';
      const [donorRows, donorResult] = await pool.query(
        'INSERT INTO donors (name, type, phone, city) VALUES (?, ?, ?, ?)',
        [donor_name, sanitizedType, donor_phone, city]
      );
      donor_id = donorRows?.[0]?.id || donorResult?.insertId || donorResult?.rows?.[0]?.id;
    }

    // 2. Query top 3 matching NGOs in that city:
    // Capacity >= quantity, ordered by capacity_per_day ASC (best fit)
    const [matchedNgos] = await pool.query(
      `SELECT id, name, city, area, contact_phone, capacity_per_day
       FROM ngos
       WHERE city = ? AND capacity_per_day >= ? AND active = 1
       ORDER BY capacity_per_day ASC
       LIMIT 3`,
      [city, parsedQty]
    );

    // Initial status: 'matched' if matching NGOs found, else 'pending'
    const initialStatus = matchedNgos.length > 0 ? 'matched' : 'pending';

    // 3. Insert listing into database
    const [listingRows, listingResult] = await pool.query(
      `INSERT INTO listings (
        donor_id, category, quantity, prepared_at, shelf_life_hours, urgency, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [donor_id, category, parsedQty, prepDate, shelf_life_hours, urgency, initialStatus]
    );

    const listingId = listingRows?.[0]?.id || listingResult?.insertId || listingResult?.rows?.[0]?.id;

    const [createdListingRows] = await pool.query(
      `SELECT l.*, d.name AS donor_name, d.city AS donor_city, d.type AS donor_type, d.phone AS donor_phone
       FROM listings l
       JOIN donors d ON l.donor_id = d.id
       WHERE l.id = ?`,
      [listingId]
    );

    res.status(201).json({
      success: true,
      listing: createdListingRows[0],
      matched_ngos: matchedNgos,
      shelf_summary: {
        window: rule.label,
        shelf_life_hours,
        urgency
      }
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({ success: false, error: 'Internal server error creating listing.' });
  }
});

/**
 * POST /api/listings/:id/confirm
 * Mark a listing as confirmed with the chosen ngo_id, update status in DB.
 */
router.post('/:id/confirm', async (req, res) => {
  try {
    const listingId = parseInt(req.params.id, 10);
    const { ngo_id } = req.body;
    const parsedNgoId = parseInt(ngo_id, 10);

    if (isNaN(listingId) || isNaN(parsedNgoId)) {
      return res.status(400).json({ success: false, error: 'Valid listing ID and ngo_id are required.' });
    }

    // Verify listing exists
    const [listingRows] = await pool.query('SELECT * FROM listings WHERE id = ?', [listingId]);
    if (listingRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    // Verify NGO exists
    const [ngoRows] = await pool.query('SELECT * FROM ngos WHERE id = ?', [parsedNgoId]);
    if (ngoRows.length === 0) {
      return res.status(404).json({ success: false, error: 'NGO not found.' });
    }

    // Update listing status to confirmed
    await pool.query(
      'UPDATE listings SET matched_ngo_id = ?, status = ? WHERE id = ?',
      [parsedNgoId, 'confirmed', listingId]
    );

    // Fetch updated listing with NGO and donor details
    const [updatedRows] = await pool.query(
      `SELECT
        l.id, l.donor_id, l.category, l.quantity, l.prepared_at, l.shelf_life_hours, l.urgency, l.status, l.matched_ngo_id, l.closed_at, l.created_at,
        d.name AS donor_name, d.city AS donor_city, d.phone AS donor_phone,
        n.id AS ngo_id, n.name AS ngo_name, n.city AS ngo_city, n.area AS ngo_area,
        n.contact_phone AS ngo_phone, n.capacity_per_day AS ngo_capacity
       FROM listings l
       JOIN donors d ON l.donor_id = d.id
       LEFT JOIN ngos n ON l.matched_ngo_id = n.id
       WHERE l.id = ?`,
      [listingId]
    );

    res.json({
      success: true,
      message: 'Pickup confirmed successfully.',
      listing: updatedRows[0]
    });
  } catch (error) {
    console.error('Error confirming listing:', error);
    res.status(500).json({ success: false, error: 'Internal server error confirming listing.' });
  }
});

/**
 * POST /api/listings/:id/close
 * Mark a listing as closed (food no longer available), record closed_at timestamp.
 * Allowed from any current status (pending, matched, or confirmed).
 */
router.post('/:id/close', async (req, res) => {
  try {
    const listingId = parseInt(req.params.id, 10);
    if (isNaN(listingId)) {
      return res.status(400).json({ success: false, error: 'Valid listing ID is required.' });
    }

    const [listingRows] = await pool.query('SELECT * FROM listings WHERE id = ?', [listingId]);
    if (listingRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    const closedAt = new Date();
    await pool.query(
      'UPDATE listings SET status = ?, closed_at = ? WHERE id = ?',
      ['closed', closedAt, listingId]
    );

    const [updatedRows] = await pool.query(
      `SELECT
        l.id, l.donor_id, l.category, l.quantity, l.prepared_at, l.shelf_life_hours, l.urgency, l.status, l.matched_ngo_id, l.closed_at, l.created_at,
        d.name AS donor_name, d.city AS donor_city, d.phone AS donor_phone,
        n.id AS ngo_id, n.name AS ngo_name, n.city AS ngo_city, n.area AS ngo_area,
        n.contact_phone AS ngo_phone, n.capacity_per_day AS ngo_capacity
       FROM listings l
       JOIN donors d ON l.donor_id = d.id
       LEFT JOIN ngos n ON l.matched_ngo_id = n.id
       WHERE l.id = ?`,
      [listingId]
    );

    res.json({
      success: true,
      message: 'Listing closed successfully.',
      listing: updatedRows[0]
    });
  } catch (error) {
    console.error('Error closing listing:', error);
    res.status(500).json({ success: false, error: 'Internal server error closing listing.' });
  }
});

/**
 * GET /api/listings
 * List all listings with donor and NGO details for admin/history view.
 */
router.get('/', async (req, res) => {
  try {
    const [listings] = await pool.query(
      `SELECT
        l.id, l.donor_id, l.category, l.quantity, l.prepared_at, l.shelf_life_hours, l.urgency, l.status, l.matched_ngo_id, l.closed_at, l.created_at,
        d.id AS donor_id, d.name AS donor_name, d.type AS donor_type, d.phone AS donor_phone, d.city AS donor_city,
        n.id AS ngo_id, n.name AS ngo_name, n.city AS ngo_city, n.area AS ngo_area,
        n.contact_phone AS ngo_phone, n.capacity_per_day AS ngo_capacity
       FROM listings l
       JOIN donors d ON l.donor_id = d.id
       LEFT JOIN ngos n ON l.matched_ngo_id = n.id
       ORDER BY l.created_at DESC
       LIMIT 100`
    );

    res.json({
      success: true,
      count: listings.length,
      listings
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ success: false, error: 'Internal server error fetching listings.' });
  }
});

module.exports = router;
