# Example: Products Table (Basic)

**Complexity**: Basic (Single table, no foreign keys)

**Demonstrates**:
- Primary key generation (sequential IDs)
- Unique constraint (SKU)
- NOT NULL constraints (name, price, stock)
- Check constraint (price >= 0, stock >= 0)
- DECIMAL precision (price with 2 decimal places)

**User Story**: US1 - Generate Constraint-Valid Test Data

---

## Input Schema

```sql
CREATE TABLE products (
    id INT PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL CHECK (stock >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Constraint Analysis

| Constraint Type | Column | Rule |
|-----------------|--------|------|
| **Primary Key** | `id` | Unique, non-null integers |
| **UNIQUE** | `sku` | No duplicate SKUs |
| **NOT NULL** | `sku`, `name`, `price`, `stock` | Must have values |
| **CHECK** | `price` | Must be >= 0.00 |
| **CHECK** | `stock` | Must be >= 0 |
| **Data Type** | `price` | DECIMAL(10,2) - max 99999999.99, 2 decimal places |
| **Data Type** | `sku` | Max 50 characters |
| **Data Type** | `name` | Max 255 characters |
| **Data Type** | `description` | TEXT (unlimited, nullable) |

---

## Generation Parameters

- **Seed**: 42 (for reproducibility)
- **Record Count**: 10
- **Edge Case Coverage**: 0% (basic example, no edge cases)

---

## Generated Data

### SQL INSERT Format

```sql
-- Seed: 42
-- Record Count: 10
-- Generated: 2024-01-04 15:35:00 UTC

INSERT INTO products (id, sku, name, description, price, stock, created_at) VALUES
  (1, 'PROD-001-A2X', 'Wireless Bluetooth Headphones', 'High-quality wireless headphones with noise cancellation and 30-hour battery life.', 79.99, 156, '2023-01-15 09:12:34'),
  (2, 'PROD-002-B5K', 'USB-C Charging Cable', 'Durable 6ft USB-C cable with fast charging support.', 12.49, 423, '2023-02-22 11:45:18'),
  (3, 'PROD-003-C9M', 'Mechanical Keyboard', 'RGB backlit mechanical keyboard with Cherry MX switches.', 149.99, 87, '2023-03-10 14:23:56'),
  (4, 'PROD-004-D1P', 'Laptop Stand', 'Adjustable aluminum laptop stand for ergonomic workspace.', 34.95, 210, '2023-04-05 08:37:42'),
  (5, 'PROD-005-E7Q', 'Wireless Mouse', 'Ergonomic wireless mouse with 6 programmable buttons.', 24.99, 312, '2023-05-18 16:55:29'),
  (6, 'PROD-006-F3R', '4K Webcam', 'Professional 4K webcam with auto-focus and noise-canceling microphone.', 89.99, 64, '2023-06-30 10:18:07'),
  (7, 'PROD-007-G8S', 'Monitor Arm', 'Dual monitor mount with adjustable height and rotation.', 119.00, 45, '2023-07-12 13:42:51'),
  (8, 'PROD-008-H4T', 'Desk Mat', 'Extra-large waterproof desk mat with stitched edges.', 19.99, 567, '2023-08-25 15:29:33'),
  (9, 'PROD-009-J6U', 'Blue Light Glasses', 'Computer glasses with blue light filtering lenses.', 29.95, 198, '2023-09-14 09:51:14'),
  (10, 'PROD-010-K2V', 'Cable Organizer', 'Magnetic cable management clips, pack of 10.', 8.99, 834, '2023-10-03 12:07:26');
```

---

## Validation Report

### Generation Metadata

- **Seed**: 42
- **Timestamp**: 2024-01-04 15:35:00 UTC
- **Record Count**: 10
- **Schema**: products (single table)
- **Generator Version**: 1.0

### Constraint Satisfaction Checks

#### Primary Key (id)

- ✅ All IDs unique: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`
- ✅ All IDs non-null
- ✅ Sequential generation (1..10)

#### UNIQUE (sku)

- ✅ All 10 SKUs unique (no duplicates)
- ✅ Sample SKUs: `["PROD-001-A2X", "PROD-002-B5K", "PROD-003-C9M", ...]`
- ✅ Format: `PROD-{id:03d}-{random}`

#### NOT NULL Constraints

- ✅ **sku**: All 10 records non-null
- ✅ **name**: All 10 records non-null
- ✅ **price**: All 10 records non-null
- ✅ **stock**: All 10 records non-null

#### CHECK (price >= 0)

- ✅ All 10 prices satisfy constraint: `price >= 0.00`
- ✅ Price range in dataset: `[8.99, 12.49, 19.99, 24.99, 29.95, 34.95, 79.99, 89.99, 119.00, 149.99]`
- ✅ Min price: $8.99 (satisfies >= 0.00)
- ✅ Max price: $149.99

#### CHECK (stock >= 0)

- ✅ All 10 stock values satisfy constraint: `stock >= 0`
- ✅ Stock range in dataset: `[45, 64, 87, 156, 198, 210, 312, 423, 567, 834]`
- ✅ Min stock: 45 (satisfies >= 0)
- ✅ Max stock: 834

#### Data Type Constraints

- ✅ **sku (VARCHAR 50)**: All SKUs ≤ 50 chars
  - Max length in dataset: 14 chars ("PROD-010-K2V")
- ✅ **name (VARCHAR 255)**: All names ≤ 255 chars
  - Max length in dataset: 30 chars ("Wireless Bluetooth Headphones")
- ✅ **description (TEXT)**: All descriptions valid (nullable, some could be NULL)
  - All 10 records have non-null descriptions in this dataset
- ✅ **price (DECIMAL 10,2)**: All prices have exactly 2 decimal places
  - Examples: 79.99, 12.49, 149.99, 34.95
- ✅ **stock (INT)**: All stock values are valid integers
- ✅ **created_at (TIMESTAMP)**: All timestamps valid
  - Range: 2023-01-15 to 2023-10-03

### Referential Integrity Audit

**N/A**: Single table, no foreign key relationships

### Edge Case Coverage

**Edge Cases**: 0% (basic example)

**Note**: This is a basic example demonstrating constraint satisfaction. For edge cases, see examples in User Story 3.

### Distribution Analysis

**Price Distribution**:
- $0-$25: 4 products (40%)
- $25-$50: 2 products (20%)
- $50-$100: 2 products (20%)
- $100+: 2 products (20%)

**Stock Distribution**:
- 0-100: 3 products (30%)
- 101-300: 3 products (30%)
- 301-500: 2 products (20%)
- 501+: 2 products (20%)

**Category Breakdown** (by name):
- Accessories: 7 products (70%)
- Peripherals: 3 products (30%)

### Warnings

None. All constraints satisfied with zero violations.

---

## Reproducibility

To regenerate this exact dataset:

```bash
# Using seed 42 with products.sql schema
generate_data --schema products.sql --seed 42 --count 10
```

**Guarantee**: Same seed (42) + same schema → identical output

---

## How This Example Was Generated

### Workflow Steps

1. **Schema Analysis** ([Workflow](../../workflows/01-schema-analysis.md))
   - Parsed DDL to extract constraints
   - Identified: PK (id), UNIQUE (sku), NOT NULL (sku, name, price, stock), CHECK (price >= 0, stock >= 0)

2. **Dependency Graphing** ([Workflow](../../workflows/02-dependency-graphing.md))
   - Single table → no dependencies
   - Generation order: products (no parent tables)

3. **Data Generation** ([Workflow](../../workflows/03-data-generation.md))
   - **PK (id)**: Sequential integers [1..10] ([Pattern](../../patterns/constraint-handling.md#primary-key-pk-constraints))
   - **sku**: Unique pattern `PROD-{id:03d}-{random}`, tracked for uniqueness ([Pattern](../../patterns/constraint-handling.md#unique-constraints))
   - **name**: Realistic product names
   - **description**: Product descriptions matching name
   - **price**: Random DECIMAL(10,2) in range, satisfying `>= 0` CHECK ([Pattern](../../patterns/constraint-handling.md#decimal--numeric))
   - **stock**: Random int in [0, 1000] satisfying CHECK constraint ([Pattern](../../patterns/constraint-handling.md#check-constraints))
   - **created_at**: Random timestamps in 2023 ([Pattern](../../patterns/constraint-handling.md#date--timestamp))

4. **Validation** ([Workflow](../../workflows/04-validation.md))
   - Pre-delivery checks: All constraints satisfied
   - Validation report generated (above)

---

## Patterns Demonstrated

| Pattern | Example in This Dataset |
|---------|-------------------------|
| **Sequential PK** | IDs: 1, 2, 3, ..., 10 |
| **Unique Tracking** | SKUs tracked in set to prevent duplicates |
| **NOT NULL Enforcement** | All required fields have values |
| **Check Constraint (>=)** | All prices >= 0.00, all stock >= 0 |
| **DECIMAL Precision** | All prices have exactly 2 decimal places (10,2) |
| **Data Type Matching** | VARCHAR lengths respected, valid DECIMAL/INT/TIMESTAMP |
| **Reproducibility** | Seed 42 → identical output on re-run |

**See**:
- [Constraint Handling Pattern](../../patterns/constraint-handling.md)
- [Reproducibility Pattern](../../patterns/reproducibility.md)

---

## Comparison with Users Table

| Aspect | Users Table | Products Table |
|--------|-------------|----------------|
| **Constraints** | PK, UNIQUE email, NOT NULL name, CHECK age | PK, UNIQUE sku, NOT NULL (4 columns), CHECK price/stock |
| **Check Type** | Range (18 <= age <= 100) | Greater-than-or-equal (price >= 0, stock >= 0) |
| **Decimal Usage** | No | Yes (price DECIMAL 10,2) |
| **TEXT Column** | No | Yes (description) |
| **Complexity** | Simple | Simple+ (more NOT NULL constraints, DECIMAL type) |

---

## Next Steps

### Progressive Examples

1. **Basic**: [Users Table](users-table.md) - Basic constraints ✓
2. **Basic** (This example): Products Table - CHECK with >=, DECIMAL precision ✓
3. **Intermediate**: [E-Commerce Schema](../intermediate/ecommerce-schema.md) - Multi-table with FK relationships (users + products + orders)

### Add Edge Cases

For edge cases in product data:
- Price edge cases: $0.00 (minimum), $99999999.99 (maximum DECIMAL precision)
- Stock edge cases: 0 (out of stock), maximum int value
- SKU edge cases: Maximum length (50 chars), special characters

---

**Related**:
- **Workflows**: [Schema Analysis](../../workflows/01-schema-analysis.md), [Data Generation](../../workflows/03-data-generation.md), [Validation](../../workflows/04-validation.md)
- **Patterns**: [Constraint Handling](../../patterns/constraint-handling.md), [Reproducibility](../../patterns/reproducibility.md)
- **Templates**: [Validation Report](../../templates/validation-report.md), [SQL Insert Format](../../templates/sql-insert-format.md)

---

**Last Updated**: 2026-01-04
