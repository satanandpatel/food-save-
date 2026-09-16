const pool = require('../src/db/connection');

async function testQueries() {
  console.log('Testing queries through Supabase connection wrapper...');

  // 1. SELECT NGOs
  const [ngos] = await pool.query(
    'SELECT * FROM ngos WHERE city = ? AND capacity_per_day >= ? AND active = 1 ORDER BY capacity_per_day ASC LIMIT 3',
    ['Bhopal', 40]
  );
  console.log('✓ Matched NGOs count:', ngos.length);
  console.log('  Names:', ngos.map(n => `${n.name} (${n.capacity_per_day})`));

  // 2. INSERT donor
  const [donorRows, donorRes] = await pool.query(
    'INSERT INTO donors (name, type, phone, city) VALUES (?, ?, ?, ?)',
    ['Test Donor Supabase', 'restaurant', '+91 99999 88888', 'Bhopal']
  );
  console.log('✓ Inserted donor ID:', donorRes.insertId);

  // 3. INSERT listing
  const [listingRows, listingRes] = await pool.query(
    `INSERT INTO listings (
      donor_id, category, quantity, prepared_at, shelf_life_hours, urgency, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [donorRes.insertId, 'Cooked meal', 40, new Date(), 3.0, 'high', 'matched']
  );
  console.log('✓ Inserted listing ID:', listingRes.insertId);

  // 4. UPDATE listing
  await pool.query(
    'UPDATE listings SET status = ?, matched_ngo_id = ? WHERE id = ?',
    ['confirmed', ngos[0].id, listingRes.insertId]
  );
  console.log('✓ Updated listing to confirmed with NGO ID:', ngos[0].id);

  // 5. SELECT JOIN
  const [listings] = await pool.query(
    `SELECT
      l.id, l.category, l.quantity, l.urgency, l.status, l.shelf_life_hours,
      d.name AS donor_name, d.city AS donor_city,
      n.name AS ngo_name, n.capacity_per_day
     FROM listings l
     JOIN donors d ON l.donor_id = d.id
     LEFT JOIN ngos n ON l.matched_ngo_id = n.id
     WHERE l.id = ?`,
    [listingRes.insertId]
  );
  console.log('✓ Retrieved joined record:', listings[0]);
  console.log('\n🎉 ALL SUPABASE QUERIES PASSED PERFECTLY!\n');
}

testQueries().catch(console.error);
