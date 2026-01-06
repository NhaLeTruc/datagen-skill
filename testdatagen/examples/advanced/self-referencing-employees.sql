-- Self-referencing Employee table
-- Demonstrates hierarchical organization structure where employees can have managers

CREATE TABLE employees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  hire_date DATE NOT NULL,
  salary DECIMAL(10, 2) NOT NULL,
  manager_id INT,
  department VARCHAR(100),
  title VARCHAR(100),
  FOREIGN KEY (manager_id) REFERENCES employees(id)
);

-- Example usage:
-- testdatagen generate -s self-referencing-employees.sql -c 100 -o employees.sql
--
-- This will generate:
-- - Root employees (CEO, executives) with NULL manager_id
-- - Mid-level managers reporting to executives
-- - Regular employees reporting to managers
-- - Proper hierarchical structure with tiered generation
