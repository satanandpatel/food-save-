-- FoodSave PostgreSQL Schema (Supabase)

CREATE TABLE IF NOT EXISTS donors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'restaurant',
  phone VARCHAR(50),
  city VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ngos (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  area VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(50),
  capacity_per_day INT NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  donor_id INT NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  prepared_at TIMESTAMPTZ NOT NULL,
  shelf_life_hours NUMERIC(4, 1) NOT NULL,
  urgency VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  matched_ngo_id INT REFERENCES ngos(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ngos_city_capacity ON ngos (city, capacity_per_day, active);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings (created_at);
