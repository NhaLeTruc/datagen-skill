-- Time-series sensor data schema
-- Demonstrates high-volume temporal data with measurements and aggregations

CREATE TABLE sensors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(100) NOT NULL UNIQUE,
  location VARCHAR(200) NOT NULL,
  sensor_type VARCHAR(50) NOT NULL,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE measurements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sensor_id INT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  value DECIMAL(10, 4) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  quality_score DECIMAL(3, 2),
  FOREIGN KEY (sensor_id) REFERENCES sensors(id),
  INDEX idx_sensor_timestamp (sensor_id, timestamp),
  INDEX idx_timestamp (timestamp)
);

CREATE TABLE alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sensor_id INT NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  message TEXT,
  triggered_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP,
  FOREIGN KEY (sensor_id) REFERENCES sensors(id)
);

CREATE TABLE hourly_aggregates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sensor_id INT NOT NULL,
  hour_start TIMESTAMP NOT NULL,
  min_value DECIMAL(10, 4),
  max_value DECIMAL(10, 4),
  avg_value DECIMAL(10, 4),
  count INT NOT NULL,
  FOREIGN KEY (sensor_id) REFERENCES sensors(id),
  UNIQUE (sensor_id, hour_start)
);

-- Example usage:
-- testdatagen generate -s time-series.sql -c 1000 -o time-series.sql --streaming
--
-- Generates time-series data with:
-- - Multiple sensors at different locations
-- - High-frequency measurements with timestamps
-- - Alerts based on threshold violations
-- - Pre-aggregated hourly statistics
-- - Proper indexing for time-based queries
