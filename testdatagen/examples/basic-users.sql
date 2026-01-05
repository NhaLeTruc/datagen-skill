-- Basic Users Table Example
-- Single table with common constraints

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  age INTEGER,
  created_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  CHECK (age >= 18 AND age <= 120)
);
