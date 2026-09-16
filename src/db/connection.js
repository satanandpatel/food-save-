const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    }
  : {
      host: process.env.PGHOST || 'aws-0-ap-northeast-1.pooler.supabase.com',
      port: parseInt(process.env.PGPORT, 10) || 6543,
      database: process.env.PGDATABASE || 'postgres',
      user: process.env.PGUSER || 'postgres.yetorvhjkycpmrxsmykf',
      password: process.env.PGPASSWORD || 'Sattu@9739patel',
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    };

const pgPool = new Pool(poolConfig);

const poolWrapper = {
  async query(sql, params = []) {
    let paramIndex = 1;
    let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    // Replace MySQL boolean comparisons like 'active = 1' with 'active = true'
    pgSql = pgSql.replace(/active\s*=\s*1/gi, 'active = true');

    // For INSERT statements, auto-append RETURNING id if not present
    const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
    if (isInsert && !/RETURNING/i.test(pgSql)) {
      pgSql += ' RETURNING id';
    }

    const result = await pgPool.query(pgSql, params);
    const insertId = isInsert && result.rows.length > 0 ? result.rows[0].id : null;
    result.insertId = insertId;
    result.rows.insertId = insertId;

    return [result.rows, result];
  }
};

module.exports = poolWrapper;
