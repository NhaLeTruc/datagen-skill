-- Geospatial application schema
-- Demonstrates location-based data with coordinates and spatial relationships

CREATE TABLE cities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  country VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  population INT,
  timezone VARCHAR(50)
);

CREATE TABLE venues (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  city_id INT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  rating DECIMAL(3, 2),
  price_level INT,
  FOREIGN KEY (city_id) REFERENCES cities(id),
  INDEX idx_location (latitude, longitude)
);

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  home_city_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (home_city_id) REFERENCES cities(id)
);

CREATE TABLE check_ins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  venue_id INT NOT NULL,
  checked_in_at TIMESTAMP NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  comment TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  INDEX idx_user_time (user_id, checked_in_at)
);

CREATE TABLE routes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  start_city_id INT NOT NULL,
  end_city_id INT NOT NULL,
  distance_km DECIMAL(10, 2),
  duration_minutes INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (start_city_id) REFERENCES cities(id),
  FOREIGN KEY (end_city_id) REFERENCES cities(id)
);

-- Example usage:
-- testdatagen generate -s geospatial.sql -c 100 -l en_US -o geospatial.sql
--
-- Generates geospatial data with:
-- - Cities with realistic coordinates
-- - Venues distributed across cities
-- - User check-ins with location tracking
-- - Routes between cities with distance calculations
-- - Proper spatial indexing for location queries
