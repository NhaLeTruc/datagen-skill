-- Multi-tenant SaaS application schema
-- Demonstrates tenant isolation with organization-level data separation

CREATE TABLE organizations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  plan VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  organization_id INT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  organization_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL,
  owner_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  assigned_to INT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date DATE,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Example usage:
-- testdatagen generate -s multi-tenant.sql -c 50 -o multi-tenant.sql
--
-- Generates realistic multi-tenant data:
-- - Multiple organizations with different plans
-- - Users scoped to their organizations
-- - Projects owned by users within same organization
-- - Tasks assigned within project scope
