const { Client } = require('pg');

async function testConn() {
  console.log('Testing Supabase PostgreSQL connection...');
  const client = new Client({
    host: 'db.yetorvhjkycpmrxsmykf.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Sattu@9739patel',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Successfully connected to Supabase PostgreSQL!');
    const res = await client.query('SELECT NOW() AS current_time, version();');
    console.log('  Current DB Time:', res.rows[0].current_time);
    console.log('  DB Version:', res.rows[0].version.split(',')[0]);
    await client.end();
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

testConn();
