-- FoodSave Database Schema

CREATE TABLE IF NOT EXISTS donors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('restaurant', 'event', 'mess') NOT NULL DEFAULT 'restaurant',
  phone VARCHAR(20),
  city VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ngos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  area VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(20),
  capacity_per_day INT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  INDEX idx_ngos_city_capacity (city, capacity_per_day, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS listings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  category ENUM('Cooked meal', 'Bakery', 'Fruits & Veg', 'Packaged') NOT NULL,
  quantity INT NOT NULL,
  prepared_at DATETIME NOT NULL,
  shelf_life_hours DECIMAL(4, 1) NOT NULL,
  urgency ENUM('high', 'normal') NOT NULL,
  status ENUM('pending', 'matched', 'confirmed', 'closed') DEFAULT 'pending',
  matched_ngo_id INT NULL,
  closed_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  FOREIGN KEY (matched_ngo_id) REFERENCES ngos(id) ON DELETE SET NULL,
  INDEX idx_listings_status (status),
  INDEX idx_listings_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
