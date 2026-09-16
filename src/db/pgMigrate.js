const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const seedNgos = [
  // Bhopal
  { name: 'Umeed Ashray Kendra', city: 'Bhopal', area: 'Shahpura', contact_phone: '+91 98260 11001', capacity_per_day: 60, active: true },
  { name: 'Anna Sewa Samiti', city: 'Bhopal', area: 'MP Nagar', contact_phone: '+91 98260 11002', capacity_per_day: 45, active: true },
  { name: 'Roshni Balgrih', city: 'Bhopal', area: 'Kolar Road', contact_phone: '+91 98260 11003', capacity_per_day: 35, active: true },
  // Indore
  { name: 'Asha Night Shelter', city: 'Indore', area: 'Vijay Nagar', contact_phone: '+91 98260 22001', capacity_per_day: 70, active: true },
  { name: 'Hope Kitchen Trust', city: 'Indore', area: 'Rajwada', contact_phone: '+91 98260 22002', capacity_per_day: 50, active: true },
  { name: 'Sahyog Foundation', city: 'Indore', area: 'Palasia', contact_phone: '+91 98260 22003', capacity_per_day: 40, active: true },
  // Sehore
  { name: 'Gramin Sewa Sangathan', city: 'Sehore', area: 'Bus Stand', contact_phone: '+91 98260 33001', capacity_per_day: 25, active: true },
  { name: 'Jan Kalyan Ashram', city: 'Sehore', area: 'Civil Lines', contact_phone: '+91 98260 33002', capacity_per_day: 20, active: true }
];

const seedDonors = [
  { name: 'Grand Palace Hotel & Banquet', type: 'event', phone: '+91 98260 55001', city: 'Indore' },
  { name: 'Bhopal Residency Club', type: 'restaurant', phone: '+91 98260 55002', city: 'Bhopal' },
  { name: 'Highway Highway Mess', type: 'mess', phone: '+91 98260 55003', city: 'Sehore' }
];

async function migrateSupabase() {
  console.log('🔄 Starting FoodSave Supabase PostgreSQL migration...');

  const client = new Client({
    host: process.env.PGHOST || 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: parseInt(process.env.PGPORT, 10) || 6543,
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER || 'postgres.yetorvhjkycpmrxsmykf',
    password: process.env.PGPASSWORD || 'Sattu@9739patel',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✓ Connected to Supabase PostgreSQL');

  // 1. Run Schema SQL
  const schemaPath = path.join(__dirname, 'pgSchema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await client.query(schemaSql);
  console.log('✓ Tables (donors, ngos, listings) created/verified in Supabase.');

  // 2. Seed NGOs
  for (const ngo of seedNgos) {
    const res = await client.query('SELECT id FROM ngos WHERE name = $1 AND city = $2', [ngo.name, ngo.city]);
    if (res.rows.length === 0) {
      await client.query(
        'INSERT INTO ngos (name, city, area, contact_phone, capacity_per_day, active) VALUES ($1, $2, $3, $4, $5, $6)',
        [ngo.name, ngo.city, ngo.area, ngo.contact_phone, ngo.capacity_per_day, ngo.active]
      );
      console.log(`  + Seeded NGO: ${ngo.name} (${ngo.city}, capacity ${ngo.capacity_per_day})`);
    } else {
      console.log(`  • NGO already exists: ${ngo.name} (${ngo.city})`);
    }
  }

  // 3. Seed Donors
  for (const donor of seedDonors) {
    const res = await client.query('SELECT id FROM donors WHERE name = $1 AND city = $2', [donor.name, donor.city]);
    if (res.rows.length === 0) {
      await client.query(
        'INSERT INTO donors (name, type, phone, city) VALUES ($1, $2, $3, $4)',
        [donor.name, donor.type, donor.phone, donor.city]
      );
      console.log(`  + Seeded Donor: ${donor.name} (${donor.city})`);
    }
  }

  await client.end();
  console.log('🎉 Supabase migration and seeding completed successfully!\n');
}

if (require.main === module) {
  migrateSupabase().catch(err => {
    console.error('❌ Supabase migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrateSupabase;
