# Template: SQL INSERT Format

**Purpose**: Standard format for SQL INSERT statements in generated test data

**Constitutional Principle**: Principle I - Database Constraint Compliance (NON-NEGOTIABLE)

---

## Overview

Generated SQL INSERT statements MUST:
1. **Be syntactically valid**: Parse without errors
2. **Satisfy all constraints**: Execute without constraint violations
3. **Be readable**: Human-inspectable for debugging
4. **Be annotated**: Include comments for context
5. **Use proper escaping**: Handle special characters correctly

---

## Basic Format

### Single Record Insert

```sql
INSERT INTO table_name (column1, column2, column3) VALUES
  (value1, value2, value3);
```

### Multi-Record Insert (Preferred)

```sql
INSERT INTO table_name (column1, column2, column3) VALUES
  (value1_row1, value2_row1, value3_row1),
  (value1_row2, value2_row2, value3_row2),
  (value1_row3, value2_row3, value3_row3);
```

**Why Multi-Record**: Faster execution, fewer transactions, more compact

---

## Column Ordering

### Explicit Column List (Required)

```sql
-- ✅ CORRECT: Explicit column list
INSERT INTO users (id, name, email, created_at) VALUES
  (1, 'Alice', 'alice@example.com', '2024-01-15 10:00:00');

-- ❌ WRONG: Implicit column order (fragile if schema changes)
INSERT INTO users VALUES
  (1, 'Alice', 'alice@example.com', '2024-01-15 10:00:00');
```

**Why Explicit**: Schema changes don't break inserts, self-documenting

---

### Column Order

**Recommended Order**:
1. Primary key(s) first
2. Foreign key(s) next
3. Required fields (NOT NULL)
4. Optional fields (nullable)
5. Timestamps last

**Example**:
```sql
INSERT INTO orders (
  id,              -- PK
  user_id,         -- FK
  total,           -- NOT NULL
  status,          -- NOT NULL
  notes,           -- Nullable
  created_at       -- Timestamp
) VALUES
  (1, 42, 100.00, 'pending', NULL, '2024-01-15 10:00:00');
```

---

## Data Type Formatting

### Integers (INT, BIGINT, SERIAL)

```sql
-- No quotes, plain integers
INSERT INTO users (id, age) VALUES
  (1, 34),
  (2, 28),
  (3, 45);
```

---

### Strings (VARCHAR, CHAR, TEXT)

```sql
-- Single quotes, escaped apostrophes
INSERT INTO users (name, bio) VALUES
  ('Alice', 'Software engineer'),
  ('O''Brien', 'Database expert'),  -- Apostrophe escaped as ''
  ('Sarah "Saz" Chen', 'Designer'); -- Double quotes OK inside single quotes
```

**Escaping Rules**:
- Apostrophe: `'` → `''` (double single quote)
- Backslash (if needed): `\` → `\\`
- Double quotes: OK inside single quotes

---

### Decimals (DECIMAL, NUMERIC, FLOAT)

```sql
-- No quotes, decimal notation
INSERT INTO products (price, weight) VALUES
  (79.99, 0.5),     -- 2 decimal places
  (12.49, 1.25),
  (149.99, 2.0);    -- Trailing zero OK
```

**Precision**: Match schema precision (e.g., DECIMAL(10,2) → exactly 2 decimal places)

---

### Dates and Timestamps

```sql
-- Single quotes, ISO 8601 format
INSERT INTO users (created_at, birth_date) VALUES
  ('2024-01-15 10:23:45', '1990-05-17'),  -- TIMESTAMP, DATE
  ('2024-02-20 14:30:00', '1985-11-22'),
  ('2024-03-10 09:15:33', '1992-03-08');
```

**Format**:
- **DATE**: `YYYY-MM-DD`
- **TIMESTAMP**: `YYYY-MM-DD HH:MM:SS`
- **TIMESTAMP WITH TIME ZONE**: `YYYY-MM-DD HH:MM:SS+00` (or UTC)

---

### Booleans

```sql
-- Use TRUE/FALSE (PostgreSQL) or 1/0 (MySQL)
-- PostgreSQL:
INSERT INTO users (is_active, is_verified) VALUES
  (TRUE, FALSE),
  (TRUE, TRUE);

-- MySQL:
INSERT INTO users (is_active, is_verified) VALUES
  (1, 0),
  (1, 1);
```

**Note**: Check target database syntax

---

### NULL Values

```sql
-- No quotes, uppercase NULL
INSERT INTO users (id, name, email, phone) VALUES
  (1, 'Alice', 'alice@example.com', NULL),        -- phone is NULL
  (2, 'Bob', 'bob@example.com', '555-1234'),
  (3, 'Charlie', NULL, '555-5678');               -- email is NULL (if nullable)
```

**Important**: Only use NULL for nullable columns

---

### UUIDs

```sql
-- Single quotes, lowercase hex (PostgreSQL standard)
INSERT INTO users (id, name) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Alice'),
  ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Bob');
```

---

### JSON (if applicable)

```sql
-- Single quotes, escaped JSON (use database's JSON functions)
-- PostgreSQL:
INSERT INTO users (id, metadata) VALUES
  (1, '{"role": "admin", "permissions": ["read", "write"]}'),
  (2, '{"role": "user", "permissions": ["read"]}');
```

**Escaping**: Inner quotes are double quotes (JSON standard), outer quotes are single (SQL)

---

## Special Character Escaping

### Apostrophes (Single Quotes)

```sql
-- Apostrophe → double single quote ''
INSERT INTO users (name) VALUES
  ('O''Brien'),           -- O'Brien
  ('It''s working'),      -- It's working
  ('L''Oréal');           -- L'Oréal
```

---

### Backslashes

```sql
-- Backslash → double backslash \\ (if needed)
INSERT INTO files (path) VALUES
  ('C:\\Users\\Alice\\Documents'),   -- Windows path
  ('/home/alice/documents');         -- Unix path (single backslash)
```

**Note**: Depends on database SQL mode (e.g., PostgreSQL doesn't require doubling)

---

### Newlines and Tabs

```sql
-- Use literal characters or escape sequences
INSERT INTO posts (content) VALUES
  ('Line 1
Line 2
Line 3'),  -- Literal newlines OK

  ('Line 1\nLine 2\nLine 3');  -- Escape sequences (if supported)
```

---

### Unicode Characters

```sql
-- UTF-8 encoding (ensure database supports UTF-8)
INSERT INTO users (name, bio) VALUES
  ('María García', 'Speaks español'),
  ('李明', '工程师'),
  ('Émilie Dubois', 'Française');
```

---

## Comments and Annotations

### Header Comment Block

```sql
-- ============================================================
-- Generated Test Data: Users Table
-- ============================================================
-- Seed: 42
-- Record Count: 10
-- Generated: 2024-01-04 15:30:00 UTC
-- Schema: users.sql
-- Generator: Test Data Generation Skill v1.0
-- ============================================================

INSERT INTO users (id, name, email, age, created_at) VALUES
  (1, 'Alice', 'alice@example.com', 34, '2024-01-15 10:00:00'),
  ...
```

---

### Section Comments (Multi-Table)

```sql
-- ============================================================
-- Table: users (5 records)
-- ============================================================

INSERT INTO users (id, name, email) VALUES
  (1, 'Alice', 'alice@example.com'),
  (2, 'Bob', 'bob@example.com'),
  (3, 'Charlie', 'charlie@example.com'),
  (4, 'Diana', 'diana@example.com'),
  (5, 'Eve', 'eve@example.com');

-- ============================================================
-- Table: orders (8 records)
-- Dependencies: users
-- ============================================================

INSERT INTO orders (id, user_id, total, created_at) VALUES
  (1, 2, 100.00, '2024-01-10 09:00:00'),
  (2, 1, 79.99, '2024-01-11 10:30:00'),
  ...
```

---

### Inline Comments (Record Context)

```sql
INSERT INTO orders (id, user_id, total, status) VALUES
  -- Order 1: User 2 (Bob), completed
  (1, 2, 100.00, 'completed'),

  -- Order 2: User 1 (Alice), pending
  (2, 1, 79.99, 'pending'),

  -- Order 3: User 4 (Diana), cancelled (edge case)
  (3, 4, 0.00, 'cancelled');
```

---

## One Statement Per Record vs Multi-Record

### Multi-Record INSERT (Preferred)

```sql
-- Preferred: Single statement, multiple rows
INSERT INTO users (id, name, email) VALUES
  (1, 'Alice', 'alice@example.com'),
  (2, 'Bob', 'bob@example.com'),
  (3, 'Charlie', 'charlie@example.com');
```

**Advantages**:
- ✅ Faster execution (single transaction)
- ✅ More compact
- ✅ Easier to read

**Use When**: Generating for direct database insertion

---

### One Statement Per Record

```sql
-- Alternative: Separate statements
INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'alice@example.com');
INSERT INTO users (id, name, email) VALUES (2, 'Bob', 'bob@example.com');
INSERT INTO users (id, name, email) VALUES (3, 'Charlie', 'charlie@example.com');
```

**Advantages**:
- ✅ Easier to comment individual records
- ✅ Easier to cherry-pick records
- ✅ Easier to debug (can run subset)

**Use When**: Generating for manual review or testing subsets

---

## Transaction Wrapping

### With Transaction (Recommended for Production)

```sql
BEGIN TRANSACTION;

-- Disable constraints during bulk insert (optional, use with caution)
-- SET CONSTRAINTS ALL DEFERRED;  -- PostgreSQL

INSERT INTO users (id, name, email) VALUES
  (1, 'Alice', 'alice@example.com'),
  (2, 'Bob', 'bob@example.com'),
  (3, 'Charlie', 'charlie@example.com');

INSERT INTO orders (id, user_id, total) VALUES
  (1, 1, 100.00),
  (2, 2, 79.99);

COMMIT;
```

**Advantages**:
- ✅ Atomic (all-or-nothing)
- ✅ Can rollback on error
- ✅ Faster (single commit)

---

### Without Transaction (For Testing)

```sql
-- Direct inserts (auto-commit after each)
INSERT INTO users (id, name, email) VALUES
  (1, 'Alice', 'alice@example.com'),
  (2, 'Bob', 'bob@example.com');

INSERT INTO orders (id, user_id, total) VALUES
  (1, 1, 100.00);
```

**Use When**: Testing individual inserts, debugging

---

## Handling Large Datasets

### Batch Inserts

```sql
-- Batch 1: Records 1-1000
INSERT INTO users (id, name, email) VALUES
  (1, 'Alice', 'alice@example.com'),
  (2, 'Bob', 'bob@example.com'),
  ...
  (1000, 'Zara', 'zara@example.com');

-- Batch 2: Records 1001-2000
INSERT INTO users (id, name, email) VALUES
  (1001, 'Aaron', 'aaron@example.com'),
  ...
  (2000, 'Zoe', 'zoe@example.com');
```

**Why Batch**: Avoid max query size limits, easier to manage

**Batch Size**: 1000-5000 records per INSERT statement (adjust based on database)

---

## Complete Example

```sql
-- ============================================================
-- Generated Test Data: E-Commerce Schema
-- ============================================================
-- Seed: 42
-- Record Counts: users:5, products:5, orders:8, order_items:15
-- Generated: 2024-01-04 15:40:00 UTC
-- Schema: ecommerce.sql
-- Generator: Test Data Generation Skill v1.0
-- ============================================================

BEGIN TRANSACTION;

-- ============================================================
-- Table: users (5 records)
-- Dependencies: None
-- ============================================================

INSERT INTO users (id, name, email, created_at) VALUES
  (1, 'Sarah Chen', 'sarah.chen@example.com', '2023-01-15 10:23:45'),
  (2, 'James Wilson', 'james.wilson@example.com', '2023-02-22 14:30:12'),
  (3, 'Maria Garcia', 'maria.garcia@example.com', '2023-03-10 09:15:33'),
  (4, 'David Kim', 'david.kim@example.com', '2023-04-05 16:42:19'),
  (5, 'Jennifer Taylor', 'jennifer.taylor@example.com', '2023-05-18 11:05:27');

-- ============================================================
-- Table: products (5 records)
-- Dependencies: None
-- ============================================================

INSERT INTO products (id, sku, name, price, stock) VALUES
  (1, 'PROD-001-A2X', 'Wireless Headphones', 79.99, 156),
  (2, 'PROD-002-B5K', 'USB-C Cable', 12.49, 423),
  (3, 'PROD-003-C9M', 'Mechanical Keyboard', 149.99, 87),
  (4, 'PROD-004-D1P', 'Laptop Stand', 34.95, 210),
  (5, 'PROD-005-E7Q', 'Wireless Mouse', 24.99, 312);

-- ============================================================
-- Table: orders (8 records)
-- Dependencies: users
-- ============================================================

INSERT INTO orders (id, user_id, total, status, created_at) VALUES
  (1, 2, 104.98, 'completed', '2023-06-10 09:15:23'),
  (2, 1, 79.99, 'completed', '2023-06-15 14:32:45'),
  (3, 4, 187.47, 'pending', '2023-06-20 11:18:56'),
  (4, 2, 34.95, 'completed', '2023-06-25 16:45:12'),
  (5, 5, 24.99, 'cancelled', '2023-07-01 10:22:34'),
  (6, 1, 174.98, 'pending', '2023-07-05 13:37:18'),
  (7, 3, 149.99, 'completed', '2023-07-10 09:55:42'),
  (8, 4, 92.48, 'pending', '2023-07-15 15:12:29');

-- ============================================================
-- Table: order_items (15 records)
-- Dependencies: orders, products
-- ============================================================

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
  -- Order 1: User 2, total $104.98
  (1, 1, 1, 79.99),
  (1, 2, 2, 12.49),

  -- Order 2: User 1, total $79.99
  (2, 1, 1, 79.99),

  -- Order 3: User 4, total $187.47
  (3, 3, 1, 149.99),
  (3, 2, 3, 12.49),

  -- Order 4: User 2, total $34.95
  (4, 4, 1, 34.95),

  -- Order 5: User 5, total $24.99 (cancelled)
  (5, 5, 1, 24.99),

  -- Order 6: User 1, total $174.98
  (6, 5, 2, 24.99),
  (6, 3, 1, 149.99),
  (6, 2, 2, 12.49),

  -- Order 7: User 3, total $149.99
  (7, 3, 1, 149.99),

  -- Order 8: User 4, total $92.48
  (8, 2, 5, 12.49),
  (8, 4, 1, 34.95);

COMMIT;

-- ============================================================
-- End of Generated Data
-- Validation: All constraints satisfied ✅
-- Referential Integrity: 100% ✅
-- See validation-report.md for full details
-- ============================================================
```

---

## Anti-Patterns to Avoid

### ❌ DON'T: Omit Column List

```sql
-- BAD: Fragile if schema changes
INSERT INTO users VALUES (1, 'Alice', 'alice@example.com');

-- GOOD: Explicit columns
INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'alice@example.com');
```

---

### ❌ DON'T: Use Double Quotes for Strings

```sql
-- BAD: Double quotes are for identifiers, not strings
INSERT INTO users (name) VALUES ("Alice");

-- GOOD: Single quotes for strings
INSERT INTO users (name) VALUES ('Alice');
```

---

### ❌ DON'T: Forget to Escape Apostrophes

```sql
-- BAD: Syntax error (unescaped apostrophe)
INSERT INTO users (name) VALUES ('O'Brien');

-- GOOD: Escaped apostrophe
INSERT INTO users (name) VALUES ('O''Brien');
```

---

### ❌ DON'T: Mix Data Type Formats

```sql
-- BAD: Inconsistent decimal places
INSERT INTO products (price) VALUES (79.9, 12.49, 149.999);

-- GOOD: Consistent precision (DECIMAL 10,2)
INSERT INTO products (price) VALUES (79.90, 12.49, 149.99);
```

---

### ❌ DON'T: Omit Metadata Comments

```sql
-- BAD: No context
INSERT INTO users (id, name) VALUES (1, 'Alice'), (2, 'Bob');

-- GOOD: Header with metadata
-- Seed: 42, Generated: 2024-01-04, Records: 2
INSERT INTO users (id, name) VALUES (1, 'Alice'), (2, 'Bob');
```

---

## Database-Specific Variations

### PostgreSQL

```sql
-- Returning clause (useful for debugging)
INSERT INTO users (name, email) VALUES
  ('Alice', 'alice@example.com')
RETURNING id, created_at;

-- ON CONFLICT (upsert)
INSERT INTO users (id, name, email) VALUES
  (1, 'Alice', 'alice@example.com')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email;
```

---

### MySQL

```sql
-- INSERT IGNORE (skip duplicates)
INSERT IGNORE INTO users (id, name, email) VALUES
  (1, 'Alice', 'alice@example.com'),
  (2, 'Bob', 'bob@example.com');

-- ON DUPLICATE KEY UPDATE
INSERT INTO users (id, name, email) VALUES
  (1, 'Alice', 'alice@example.com')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  email = VALUES(email);
```

---

### SQLite

```sql
-- INSERT OR REPLACE
INSERT OR REPLACE INTO users (id, name, email) VALUES
  (1, 'Alice', 'alice@example.com');

-- INSERT OR IGNORE
INSERT OR IGNORE INTO users (id, name, email) VALUES
  (1, 'Alice', 'alice@example.com');
```

---

## Related

- **Examples**: [Users Table](../examples/basic/users-table.md), [Products Table](../examples/basic/products-table.md), [E-Commerce Schema](../examples/intermediate/ecommerce-schema.md)
- **Workflows**: [Data Generation](../workflows/03-data-generation.md), [Validation](../workflows/04-validation.md)
- **Templates**: [Validation Report](validation-report.md)

---

**Last Updated**: 2026-01-04
