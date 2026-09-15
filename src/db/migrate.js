const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const seedNgos = [
  // Bhopal
  { name: 'Umeed Ashray Kendra', city: 'Bhopal', area: 'Shahpura', contact_phone: '+91 98260 11001', capacity_per_day: 60, active: 1 },
  { name: 'Anna Sewa Samiti', city: 'Bhopal', area: 'MP Nagar', contact_phone: '+91 98260 11002', capacity_per_day: 45, active: 1 },
  { name: 'Roshni Balgrih', city: 'Bhopal', area: 'Kolar Road', contact_phone: '+91 98260 11003', capacity_per_day: 35, active: 1 },
  // Indore
  { name: 'Asha Night Shelter', city: 'Indore', area: 'Vijay Nagar', contact_phone: '+91 98260 22001', capacity_per_day: 70, active: 1 },
  { name: 'Hope Kitchen Trust', city: 'Indore', area: 'Rajwada', contact_phone: '+91 98260 22002', capacity_per_day: 50, active: 1 },
  { name: 'Sahyog Foundation', city: 'Indore', area: 'Palasia', contact_phone: '+91 98260 22003', capacity_per_day: 40, active: 1 },
  // Sehore
  { name: 'Gramin Sewa Sangathan', city: 'Sehore', area: 'Bus Stand', contact_phone: '+91 98260 33001', capacity_per_day: 25, active: 1 },
  { name: 'Jan Kalyan Ashram', city: 'Sehore', area: 'Civil Lines', contact_phone: '+91 98260 33002', capacity_per_day: 20, active: 1 }
];

const seedDonors = [
  { name: 'Grand Palace Hotel & Banquet', type: 'event', phone: '+91 98260 55001', city: 'Indore' },
  { name: 'Bhopal Residency Club', type: 'restaurant', phone: '+91 98260 55002', city: 'Bhopal' },
  { name: 'Highway Highway Mess', type: 'mess', phone: '+91 98260 55003', city: 'Sehore' }
];

async function migrate() {
  console.log('🔄 Starting FoodSave database migration...');
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '#Lmnop098';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const dbName = process.env.DB_NAME || 'foodsave_db';

  // 1. Connect without database to ensure DB creation
  const conn = await mysql.createConnection({ host, user, password, port, multipleStatements: true });
  console.log(`✓ Connected to MySQL server at ${host}:${port}`);

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  console.log(`✓ Database '${dbName}' verified/created.`);
  await conn.changeUser({ database: dbName });

  // 2. Read and run schema.sql
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await conn.query(schemaSql);
  console.log('✓ Tables (donors, ngos, listings) created/verified.');

  // 3. Apply schema updates for existing tables
  try {
    // Ensure ENUM includes 'closed'
    await conn.query(
      "ALTER TABLE listings MODIFY COLUMN status ENUM('pending', 'matched', 'confirmed', 'closed') DEFAULT 'pending'"
    );
    console.log("✓ Updated listings.status ENUM to include 'closed'.");
  } catch (err) {
    console.log('  • listings.status ENUM alteration note:', err.message);
  }

  try {
    // Ensure column closed_at exists
    const [cols] = await conn.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'closed_at'",
      [dbName]
    );
    if (cols.length === 0) {
      await conn.query("ALTER TABLE listings ADD COLUMN closed_at DATETIME NULL AFTER matched_ngo_id");
      console.log("✓ Added column 'closed_at' to listings table.");
    } else {
      console.log("• Column 'closed_at' already exists in listings table.");
    }
  } catch (err) {
    console.log('  • listings.closed_at column check note:', err.message);
  }

  // 4. Seed NGOs if not present
  for (const ngo of seedNgos) {
    const [existing] = await conn.query('SELECT id FROM ngos WHERE name = ? AND city = ?', [ngo.name, ngo.city]);
    if (existing.length === 0) {
      await conn.query(
        'INSERT INTO ngos (name, city, area, contact_phone, capacity_per_day, active) VALUES (?, ?, ?, ?, ?, ?)',
        [ngo.name, ngo.city, ngo.area, ngo.contact_phone, ngo.capacity_per_day, ngo.active]
      );
      console.log(`  + Seeded NGO: ${ngo.name} (${ngo.city}, capacity ${ngo.capacity_per_day})`);
    } else {
      console.log(`  • NGO already exists: ${ngo.name} (${ngo.city})`);
    }
  }

  // 5. Seed Donors if not present
  for (const donor of seedDonors) {
    const [existing] = await conn.query('SELECT id FROM donors WHERE name = ? AND city = ?', [donor.name, donor.city]);
    if (existing.length === 0) {
      await conn.query(
        'INSERT INTO donors (name, type, phone, city) VALUES (?, ?, ?, ?)',
        [donor.name, donor.type, donor.phone, donor.city]
      );
      console.log(`  + Seeded Donor: ${donor.name} (${donor.city})`);
    }
  }

  await conn.end();
  console.log('🎉 Migration & seeding completed successfully!\n');
}

if (require.main === module) {
  migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrate;
