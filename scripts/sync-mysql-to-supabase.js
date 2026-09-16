const mysql = require('mysql2/promise');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function syncData() {
  console.log('🔄 Syncing ALL data from local MySQL to Supabase PostgreSQL...\n');

  // 1. Connect to MySQL
  const mysqlConn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '#Lmnop098',
    database: process.env.MYSQL_DATABASE || 'foodsave_db',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306
  });
  console.log('✓ Connected to local MySQL (foodsave_db)');

  // 2. Connect to Supabase
  const pgConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.PGHOST || 'aws-0-ap-northeast-1.pooler.supabase.com',
        port: parseInt(process.env.PGPORT, 10) || 6543,
        database: process.env.PGDATABASE || 'postgres',
        user: process.env.PGUSER || 'postgres.yetorvhjkycpmrxsmykf',
        password: process.env.PGPASSWORD,
        ssl: { rejectUnauthorized: false }
      };

  const pgClient = new Client(pgConfig);
  await pgClient.connect();
  console.log('✓ Connected to Supabase PostgreSQL');

  // 3. Fetch from MySQL
  const [mysqlDonors] = await mysqlConn.query('SELECT * FROM donors ORDER BY id ASC');
  const [mysqlNgos] = await mysqlConn.query('SELECT * FROM ngos ORDER BY id ASC');
  const [mysqlListings] = await mysqlConn.query('SELECT * FROM listings ORDER BY id ASC');

  console.log(`\nFound in MySQL:`);
  console.log(`  - Donors: ${mysqlDonors.length}`);
  console.log(`  - NGOs: ${mysqlNgos.length}`);
  console.log(`  - Listings: ${mysqlListings.length}`);

  // 4. Sync Donors to Supabase
  console.log('\nSyncing Donors to Supabase...');
  for (const d of mysqlDonors) {
    await pgClient.query(
      `INSERT INTO donors (id, name, type, phone, city, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name, type = EXCLUDED.type, phone = EXCLUDED.phone, city = EXCLUDED.city`,
      [d.id, d.name, d.type, d.phone, d.city, d.created_at]
    );
  }
  console.log(`✓ ${mysqlDonors.length} donors synced.`);

  // 5. Sync NGOs to Supabase
  console.log('Syncing NGOs to Supabase...');
  for (const n of mysqlNgos) {
    await pgClient.query(
      `INSERT INTO ngos (id, name, city, area, contact_phone, capacity_per_day, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name, city = EXCLUDED.city, area = EXCLUDED.area,
           contact_phone = EXCLUDED.contact_phone, capacity_per_day = EXCLUDED.capacity_per_day,
           active = EXCLUDED.active`,
      [n.id, n.name, n.city, n.area, n.contact_phone, n.capacity_per_day, !!n.active]
    );
  }
  console.log(`✓ ${mysqlNgos.length} NGOs synced.`);

  // 6. Sync Listings to Supabase
  console.log('Syncing Listings to Supabase...');
  for (const l of mysqlListings) {
    await pgClient.query(
      `INSERT INTO listings (id, donor_id, category, quantity, prepared_at, shelf_life_hours, urgency, status, matched_ngo_id, closed_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE
       SET donor_id = EXCLUDED.donor_id, category = EXCLUDED.category, quantity = EXCLUDED.quantity,
           prepared_at = EXCLUDED.prepared_at, shelf_life_hours = EXCLUDED.shelf_life_hours,
           urgency = EXCLUDED.urgency, status = EXCLUDED.status, matched_ngo_id = EXCLUDED.matched_ngo_id,
           closed_at = EXCLUDED.closed_at`,
      [l.id, l.donor_id, l.category, l.quantity, l.prepared_at, l.shelf_life_hours, l.urgency, l.status, l.matched_ngo_id, l.closed_at, l.created_at]
    );
  }
  console.log(`✓ ${mysqlListings.length} listings synced.`);

  // 7. Reset Postgres Sequences so new inserts don't collide
  await pgClient.query(`SELECT setval('donors_id_seq', COALESCE((SELECT MAX(id) FROM donors), 1));`);
  await pgClient.query(`SELECT setval('ngos_id_seq', COALESCE((SELECT MAX(id) FROM ngos), 1));`);
  await pgClient.query(`SELECT setval('listings_id_seq', COALESCE((SELECT MAX(id) FROM listings), 1));`);
  console.log('✓ PostgreSQL sequences reset.');

  // 8. Verify Count in Supabase
  const donorsCount = await pgClient.query('SELECT COUNT(*) FROM donors');
  const ngosCount = await pgClient.query('SELECT COUNT(*) FROM ngos');
  const listingsCount = await pgClient.query('SELECT COUNT(*) FROM listings');

  console.log('\n📊 Current Supabase Database Totals:');
  console.log(`  - Total Donors: ${donorsCount.rows[0].count}`);
  console.log(`  - Total NGOs: ${ngosCount.rows[0].count}`);
  console.log(`  - Total Listings: ${listingsCount.rows[0].count}`);

  await mysqlConn.end();
  await pgClient.end();
  console.log('\n🎉 ALL DATA HAS BEEN SUCCESSFULLY PUSHED TO SUPABASE!\n');
}

syncData().catch(e => {
  console.error('❌ Sync failed:', e);
  process.exit(1);
});
