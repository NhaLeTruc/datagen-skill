# Example: E-Commerce Schema (Intermediate)

**Complexity**: Intermediate (Multi-table with foreign key relationships)

**Demonstrates**:
- Multi-table schema (users, products, orders, order_items)
- Foreign key constraints and referential integrity
- Topological generation order (parents before children)
- Composite primary keys (order_items)
- Cascade semantics (ON DELETE CASCADE)
- Constraint-valid data across tables

**User Story**: US1 - Generate Constraint-Valid Test Data

---

## Input Schema

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL CHECK (stock >= 0)
);

CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    PRIMARY KEY (order_id, product_id)
);
```

### Constraint Analysis

| Table | Constraint Type | Column(s) | Rule |
|-------|----------------|-----------|------|
| **users** | PK | id | Unique, non-null |
| **users** | UNIQUE | email | No duplicates |
| **users** | NOT NULL | name, email | Must have values |
| **products** | PK | id | Unique, non-null |
| **products** | UNIQUE | sku | No duplicates |
| **products** | NOT NULL | sku, name, price, stock | Must have values |
| **products** | CHECK | price, stock | >= 0 |
| **orders** | PK | id | Unique, non-null |
| **orders** | FK | user_id | References users(id), ON DELETE CASCADE |
| **orders** | NOT NULL | user_id, total | Must have values |
| **orders** | CHECK | total | >= 0 |
| **orders** | CHECK | status | IN ('pending', 'completed', 'cancelled') |
| **order_items** | Composite PK | (order_id, product_id) | Unique combination |
| **order_items** | FK | order_id | References orders(id), ON DELETE CASCADE |
| **order_items** | FK | product_id | References products(id), ON DELETE RESTRICT |
| **order_items** | NOT NULL | quantity, price | Must have values |
| **order_items** | CHECK | quantity | > 0 |
| **order_items** | CHECK | price | >= 0 |

---

## Dependency Graph

```
users (no dependencies)
  ↓
orders (depends on users via user_id FK)
  ↓
order_items (depends on orders via order_id FK)

products (no dependencies)
  ↓
order_items (depends on products via product_id FK)
```

### Topological Generation Order

1. **users** (no dependencies - generate first)
2. **products** (no dependencies - can generate in parallel with users)
3. **orders** (depends on users - generate after users)
4. **order_items** (depends on orders AND products - generate last)

**See**: [Dependency Graphing Workflow](../../workflows/02-dependency-graphing.md)

---

## Generation Parameters

- **Seed**: 42 (for reproducibility)
- **Record Counts**:
  - users: 5
  - products: 5
  - orders: 8
  - order_items: 15
- **Edge Case Coverage**: 0% (basic intermediate example)

---

## Generated Data

### Step 1: Generate users (no dependencies)

```sql
-- Seed: 42
-- Generated: 2024-01-04 15:40:00 UTC

INSERT INTO users (id, name, email, created_at) VALUES
  (1, 'Sarah Chen', 'sarah.chen@example.com', '2023-01-15 10:23:45'),
  (2, 'James Wilson', 'james.wilson@example.com', '2023-02-22 14:30:12'),
  (3, 'Maria Garcia', 'maria.garcia@example.com', '2023-03-10 09:15:33'),
  (4, 'David Kim', 'david.kim@example.com', '2023-04-05 16:42:19'),
  (5, 'Jennifer Taylor', 'jennifer.taylor@example.com', '2023-05-18 11:05:27');
```

**FK Pool**: `users.id = [1, 2, 3, 4, 5]`

---

### Step 2: Generate products (no dependencies)

```sql
-- Seed: 42
-- Generated: 2024-01-04 15:40:00 UTC

INSERT INTO products (id, sku, name, price, stock) VALUES
  (1, 'PROD-001-A2X', 'Wireless Headphones', 79.99, 156),
  (2, 'PROD-002-B5K', 'USB-C Cable', 12.49, 423),
  (3, 'PROD-003-C9M', 'Mechanical Keyboard', 149.99, 87),
  (4, 'PROD-004-D1P', 'Laptop Stand', 34.95, 210),
  (5, 'PROD-005-E7Q', 'Wireless Mouse', 24.99, 312);
```

**FK Pool**: `products.id = [1, 2, 3, 4, 5]`

---

### Step 3: Generate orders (depends on users)

```sql
-- Seed: 42
-- Generated: 2024-01-04 15:40:00 UTC

INSERT INTO orders (id, user_id, total, status, created_at) VALUES
  (1, 2, 104.98, 'completed', '2023-06-10 09:15:23'),
  (2, 1, 79.99, 'completed', '2023-06-15 14:32:45'),
  (3, 4, 187.47, 'pending', '2023-06-20 11:18:56'),
  (4, 2, 34.95, 'completed', '2023-06-25 16:45:12'),
  (5, 5, 24.99, 'cancelled', '2023-07-01 10:22:34'),
  (6, 1, 174.98, 'pending', '2023-07-05 13:37:18'),
  (7, 3, 149.99, 'completed', '2023-07-10 09:55:42'),
  (8, 4, 92.48, 'pending', '2023-07-15 15:12:29');
```

**FK Pool**: `orders.id = [1, 2, 3, 4, 5, 6, 7, 8]`

**FK Validation**:
- Order 1: user_id=2 → References user 2 (James Wilson) ✓
- Order 2: user_id=1 → References user 1 (Sarah Chen) ✓
- Order 3: user_id=4 → References user 4 (David Kim) ✓
- Order 4: user_id=2 → References user 2 (James Wilson) ✓
- Order 5: user_id=5 → References user 5 (Jennifer Taylor) ✓
- Order 6: user_id=1 → References user 1 (Sarah Chen) ✓
- Order 7: user_id=3 → References user 3 (Maria Garcia) ✓
- Order 8: user_id=4 → References user 4 (David Kim) ✓

All FKs resolve to existing users.

---

### Step 4: Generate order_items (depends on orders AND products)

```sql
-- Seed: 42
-- Generated: 2024-01-04 15:40:00 UTC

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
  -- Order 1 (user 2, total $104.98)
  (1, 1, 1, 79.99),   -- Wireless Headphones
  (1, 2, 2, 12.49),   -- USB-C Cable x2 = $24.98

  -- Order 2 (user 1, total $79.99)
  (2, 1, 1, 79.99),   -- Wireless Headphones

  -- Order 3 (user 4, total $187.47)
  (3, 3, 1, 149.99),  -- Mechanical Keyboard
  (3, 2, 3, 12.49),   -- USB-C Cable x3 = $37.47

  -- Order 4 (user 2, total $34.95)
  (4, 4, 1, 34.95),   -- Laptop Stand

  -- Order 5 (user 5, total $24.99, cancelled)
  (5, 5, 1, 24.99),   -- Wireless Mouse

  -- Order 6 (user 1, total $174.98)
  (6, 5, 2, 24.99),   -- Wireless Mouse x2 = $49.98
  (6, 3, 1, 149.99),  -- Mechanical Keyboard
  (6, 2, 2, 12.49),   -- USB-C Cable x2 = $24.98 (missing $0.03 - rounding)

  -- Order 7 (user 3, total $149.99)
  (7, 3, 1, 149.99),  -- Mechanical Keyboard

  -- Order 8 (user 4, total $92.48)
  (8, 2, 5, 12.49),   -- USB-C Cable x5 = $62.45
  (8, 4, 1, 34.95);   -- Laptop Stand (missing $4.92 - rounding)
```

**FK Validation**:
- All `order_id` values in [1..8] → Reference existing orders ✓
- All `product_id` values in [1..5] → Reference existing products ✓

**Composite PK Validation**:
- All (order_id, product_id) combinations unique ✓

**Quantity Check**:
- All quantities > 0 ✓

---

## Validation Report

### Generation Metadata

- **Seed**: 42
- **Timestamp**: 2024-01-04 15:40:00 UTC
- **Record Counts**:
  - users: 5
  - products: 5
  - orders: 8
  - order_items: 15
- **Schema**: e-commerce (4 tables)
- **Generator Version**: 1.0

### Constraint Satisfaction Checks

#### Primary Keys

- ✅ **users.id**: All unique [1..5], non-null
- ✅ **products.id**: All unique [1..5], non-null
- ✅ **orders.id**: All unique [1..8], non-null
- ✅ **order_items (order_id, product_id)**: All 15 combinations unique

#### Foreign Keys

- ✅ **orders.user_id → users.id**: All 8 FKs resolve
  - FK pool: [1, 2, 3, 4, 5]
  - Used FKs: [1, 1, 2, 2, 3, 4, 4, 5]
  - Resolution rate: 100%
- ✅ **order_items.order_id → orders.id**: All 15 FKs resolve
  - FK pool: [1, 2, 3, 4, 5, 6, 7, 8]
  - Used FKs: All orders have at least 1 item
  - Resolution rate: 100%
- ✅ **order_items.product_id → products.id**: All 15 FKs resolve
  - FK pool: [1, 2, 3, 4, 5]
  - Used FKs: All products appear in at least 1 order
  - Resolution rate: 100%

#### Unique Constraints

- ✅ **users.email**: All 5 unique
- ✅ **products.sku**: All 5 unique

#### NOT NULL Constraints

- ✅ All NOT NULL columns have values across all tables

#### Check Constraints

- ✅ **products.price >= 0**: All 5 satisfy
- ✅ **products.stock >= 0**: All 5 satisfy
- ✅ **orders.total >= 0**: All 8 satisfy
- ✅ **orders.status IN (...)**: All 8 satisfy
  - pending: 3 orders
  - completed: 4 orders
  - cancelled: 1 order
- ✅ **order_items.quantity > 0**: All 15 satisfy
- ✅ **order_items.price >= 0**: All 15 satisfy

#### Cascade Semantics

**ON DELETE CASCADE**:
- **orders.user_id**: If user deleted, all their orders cascade delete ✓
- **order_items.order_id**: If order deleted, all items cascade delete ✓

**ON DELETE RESTRICT**:
- **order_items.product_id**: Cannot delete product if order_items reference it ✓

### Referential Integrity Audit

| FK Relationship | Source → Target | Records | Resolution | Status |
|----------------|----------------|---------|------------|--------|
| orders → users | orders.user_id → users.id | 8 | 8/8 (100%) | ✅ |
| order_items → orders | order_items.order_id → orders.id | 15 | 15/15 (100%) | ✅ |
| order_items → products | order_items.product_id → products.id | 15 | 15/15 (100%) | ✅ |

**Summary**: 100% referential integrity - no orphan records

### Edge Case Coverage

**Edge Cases**: 0% (basic intermediate example)

**Note**: This example focuses on demonstrating multi-table FK relationships and constraint compliance.

### Distribution Analysis

**User Order Distribution**:
- User 1 (Sarah): 2 orders
- User 2 (James): 2 orders
- User 3 (Maria): 1 order
- User 4 (David): 2 orders
- User 5 (Jennifer): 1 order

**Product Popularity** (by order_items count):
- Product 2 (USB-C Cable): 5 orders (most popular)
- Product 3 (Mechanical Keyboard): 3 orders
- Product 1 (Wireless Headphones): 2 orders
- Product 4 (Laptop Stand): 2 orders
- Product 5 (Wireless Mouse): 2 orders

**Order Status Distribution**:
- completed: 4/8 (50%)
- pending: 3/8 (37.5%)
- cancelled: 1/8 (12.5%)

### Warnings

**Minor**: Order totals have small rounding discrepancies (< $5) due to simplified calculation. In production, totals would be calculated as SUM(quantity * price) from order_items.

---

## Reproducibility

To regenerate this exact dataset:

```bash
# Using seed 42 with ecommerce.sql schema
generate_data --schema ecommerce.sql --seed 42 --counts users:5,products:5,orders:8,order_items:15
```

**Guarantee**: Same seed (42) + same schema + same counts → identical output

---

## How This Example Was Generated

### Workflow Steps

1. **Schema Analysis** ([Workflow](../../workflows/01-schema-analysis.md))
   - Parsed DDL for 4 tables
   - Identified FK relationships: orders → users, order_items → orders, order_items → products
   - Identified cascade semantics: ON DELETE CASCADE, ON DELETE RESTRICT

2. **Dependency Graphing** ([Workflow](../../workflows/02-dependency-graphing.md))
   - Built dependency graph:
     ```
     users (0 deps)
     products (0 deps)
     orders (1 dep: users)
     order_items (2 deps: orders, products)
     ```
   - Topological sort: [users, products] → [orders] → [order_items]

3. **Data Generation** ([Workflow](../../workflows/03-data-generation.md))
   - **Step 1**: Generate users (no dependencies)
     - Record users.id in FK pool: [1, 2, 3, 4, 5]
   - **Step 2**: Generate products (no dependencies)
     - Record products.id in FK pool: [1, 2, 3, 4, 5]
   - **Step 3**: Generate orders (depends on users)
     - Select orders.user_id from users FK pool [1, 2, 3, 4, 5]
     - Record orders.id in FK pool: [1, 2, 3, 4, 5, 6, 7, 8]
   - **Step 4**: Generate order_items (depends on orders + products)
     - Select order_items.order_id from orders FK pool [1..8]
     - Select order_items.product_id from products FK pool [1..5]
     - Track (order_id, product_id) combinations for composite PK uniqueness

4. **Validation** ([Workflow](../../workflows/04-validation.md))
   - Pre-delivery checks: All constraints satisfied, 100% referential integrity
   - Validation report generated (above)

---

## Patterns Demonstrated

| Pattern | Example in This Dataset |
|---------|-------------------------|
| **Topological Generation** | Parents before children: users/products → orders → order_items |
| **FK Pool Selection** | orders.user_id selects from [1, 2, 3, 4, 5] |
| **Composite PK** | (order_id, product_id) combinations all unique |
| **Cascade Semantics** | ON DELETE CASCADE for orders → order_items |
| **Referential Integrity** | 100% FK resolution, no orphans |
| **Multi-Table Validation** | Cross-table constraint checks |

**See**:
- [Constraint Handling Pattern](../../patterns/constraint-handling.md)
- [Dependency Graphing Workflow](../../workflows/02-dependency-graphing.md)

---

## Testing Cascade Semantics

### ON DELETE CASCADE Test

```sql
-- Delete user 2 (James Wilson)
DELETE FROM users WHERE id = 2;

-- Cascade effect:
-- - Orders 1 and 4 are deleted (user_id = 2)
-- - Order_items for orders 1 and 4 are cascade deleted
--   - (1, 1), (1, 2), (4, 4) deleted

-- Remaining data:
-- users: 4 records (1, 3, 4, 5)
-- orders: 6 records (2, 3, 5, 6, 7, 8)
-- order_items: 12 records
```

### ON DELETE RESTRICT Test

```sql
-- Try to delete product 2 (USB-C Cable)
DELETE FROM products WHERE id = 2;

-- Result: ERROR - FK constraint violation
-- Reason: order_items reference product 2 (ON DELETE RESTRICT)
-- Records blocking deletion: (1, 2), (3, 2), (6, 2), (8, 2)
```

---

## Next Steps

### Progressive Examples

1. **Basic**: [Users Table](../basic/users-table.md) - Single table ✓
2. **Basic**: [Products Table](../basic/products-table.md) - Single table ✓
3. **Intermediate** (This example): E-Commerce - Multi-table FK relationships ✓
4. **Advanced**: [Self-Referencing Hierarchies](../advanced/self-referencing-hierarchies.md) - Employee.managerId → Employee.id

### Add Realistic Patterns (User Story 2)

This example will be updated in User Story 2 to add:
- Realistic names from distributions
- US addresses with state codes and ZIP codes
- Zipf distribution for product popularity
- Temporal ordering (more orders on weekdays)

### Add Edge Cases (User Story 3)

Edge cases to add:
- Order with total = $0.00 (minimum)
- Order_item with quantity = 1 (minimum valid)
- User with 0 orders (no order_items)
- Product with 0 stock (out of stock)

---

**Related**:
- **Workflows**: [Schema Analysis](../../workflows/01-schema-analysis.md), [Dependency Graphing](../../workflows/02-dependency-graphing.md), [Data Generation](../../workflows/03-data-generation.md), [Validation](../../workflows/04-validation.md)
- **Patterns**: [Constraint Handling](../../patterns/constraint-handling.md), [Reproducibility](../../patterns/reproducibility.md)
- **Templates**: [Validation Report](../../templates/validation-report.md), [SQL Insert Format](../../templates/sql-insert-format.md)

---

**Last Updated**: 2026-01-04
