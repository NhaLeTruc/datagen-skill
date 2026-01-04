# Example: Users Table (Basic)

**Complexity**: Basic (Single table, no foreign keys)

**Demonstrates**:
- Primary key generation (sequential IDs)
- Unique constraint (email)
- NOT NULL constraint (name)
- Check constraint (age >= 18)
- Data type constraints (VARCHAR length, INT range)
- Edge case coverage (5%)

**User Stories**: US1 (Constraint-Valid Data), US3 (Edge Case Coverage)

---

## Input Schema

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    age INT CHECK (age >= 18 AND age <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Constraint Analysis

| Constraint Type | Column | Rule |
|-----------------|--------|------|
| **Primary Key** | `id` | Unique, non-null integers |
| **NOT NULL** | `name` | Must have value |
| **UNIQUE** | `email` | No duplicate emails (NULL allowed) |
| **CHECK** | `age` | Must be between 18 and 100 (inclusive) |
| **Data Type** | `name` | Max 255 characters |
| **Data Type** | `email` | Max 255 characters |
| **Data Type** | `created_at` | Valid timestamp |

---

## Generation Parameters

- **Seed**: 42 (for reproducibility)
- **Record Count**: 20
- **Edge Case Coverage**: 5% (1 edge case record)

---

## Generated Data

### SQL INSERT Format

```sql
-- Seed: 42
-- Record Count: 20
-- Edge Case Coverage: 5% (1 edge case record)
-- Generated: 2024-01-04 15:30:00 UTC

INSERT INTO users (id, name, email, age, created_at) VALUES
  (1, 'Sarah Chen', 'sarah.chen@example.com', 34, '2022-07-15 10:23:45'),
  (2, 'James Wilson', 'james.wilson@example.com', 28, '2021-03-22 14:30:12'),
  (3, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789012345678901234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789012345678901234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789012345678901234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789012345678901234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890123', 'edge+case@example.com', 18, '1970-01-01 00:00:00'),
  (4, 'David Kim', 'david.kim@example.com', 52, '2020-05-17 16:42:19'),
  (5, 'Jennifer Taylor', 'jennifer.taylor@example.com', 23, '2024-02-10 11:05:27'),
  (6, 'Michael Brown', 'michael.brown@example.com', 67, '2022-09-30 13:18:54'),
  (7, 'Lisa Anderson', 'lisa.anderson@example.com', 41, '2021-12-14 08:37:41'),
  (8, 'Robert Martinez', 'robert.martinez@example.com', 19, '2023-06-25 15:22:03'),
  (9, 'Emily Davis', 'emily.davis@example.com', 38, '2020-10-03 12:49:16'),
  (10, 'Christopher Lee', 'christopher.lee@example.com', 55, '2024-01-18 17:11:29'),
  (11, 'Daniel Anderson', 'daniel.anderson@example.com', 31, '2022-04-12 09:27:33'),
  (12, 'Jessica Moore', 'jessica.moore@example.com', 26, '2021-08-05 11:14:58'),
  (13, 'Matthew Thomas', 'matthew.thomas@example.com', 48, '2023-02-19 14:52:07'),
  (14, 'Ashley Martin', 'ashley.martin@example.com', 39, '2020-11-28 08:35:21'),
  (15, 'Andrew Jackson', 'andrew.jackson@example.com', 62, '2024-06-14 16:08:44'),
  (16, 'Amanda White', 'amanda.white@example.com', 29, '2022-10-07 12:41:19'),
  (17, 'Joshua Harris', 'joshua.harris@example.com', 44, '2021-05-23 10:17:52'),
  (18, 'Melissa Clark', 'melissa.clark@example.com', 57, '2023-09-11 15:29:36'),
  (19, 'Brian Lewis', 'brian.lewis@example.com', 33, '2020-07-30 13:54:08'),
  (20, 'Nicole Robinson', 'nicole.robinson@example.com', 51, '2024-03-25 09:22:14');
```

---

## Validation Report

### Generation Metadata

- **Seed**: 42
- **Timestamp**: 2024-01-04 15:30:00 UTC
- **Record Count**: 20
- **Edge Case Coverage**: 5% (1 record)
- **Schema**: users (single table)
- **Generator Version**: 1.0

### Constraint Satisfaction Checks

#### Primary Key (id)

- ✅ All IDs unique: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]`
- ✅ All IDs non-null
- ✅ Sequential generation (1..20)

#### NOT NULL (name)

- ✅ All 20 records have non-null `name`
- ✅ Sample names: `["Sarah Chen", "James Wilson", ...]`
- ✅ Edge case (ID 3): Max length name (255 characters)

#### UNIQUE (email)

- ✅ All 20 emails unique (no duplicates)
- ✅ Sample emails: `["sarah.chen@example.com", "james.wilson@example.com", ...]`
- ✅ Edge case (ID 3): Special character + in email (`edge+case@example.com`)
- ✅ No NULL emails in this dataset (column allows NULL but none generated)

#### CHECK (age >= 18 AND age <= 100)

- ✅ All 20 ages satisfy constraint: `18 <= age <= 100`
- ✅ Age range in dataset: `[18, 19, 23, 26, 28, 29, 31, 33, 34, 38, 39, 41, 44, 45, 48, 51, 52, 55, 57, 62, 67]`
- ✅ Edge case (ID 3): Minimum age 18 (boundary test for >= 18 constraint)
- ✅ Max age: 67 (satisfies <= 100)

#### Data Type Constraints

- ✅ **name (VARCHAR 255)**: All names ≤ 255 chars
  - Max length in dataset: 255 chars (ID 3, edge case)
  - Regular names: 10-20 chars
- ✅ **email (VARCHAR 255)**: All emails ≤ 255 chars
  - Max length in dataset: 32 chars ("christopher.lee@example.com")
- ✅ **age (INT)**: All ages valid integers
- ✅ **created_at (TIMESTAMP)**: All timestamps valid
  - Range: 1970-01-01 to 2024-06-14
  - Edge case (ID 3): Epoch timestamp (1970-01-01 00:00:00)

### Referential Integrity Audit

**N/A**: Single table, no foreign key relationships

### Edge Case Coverage

**Edge Case Percentage**: 5% (1 edge case record out of 20)

**Edge Case Record**: ID 3

| Edge Case Type | Column | Value | Constraint Compliance |
| -------------- | ------ | ----- | --------------------- |
| **Boundary (min)** | age | 18 | ✅ Satisfies CHECK (age >= 18) |
| **Max length** | name | 255 chars | ✅ Satisfies VARCHAR(255) |
| **Special char** | email | `edge+case@example.com` | ✅ Valid email format |
| **Epoch** | created_at | 1970-01-01 00:00:00 | ✅ Valid timestamp |

**Constraint-First Principle**: All edge cases satisfy constraints (Principle I > Principle IV)

**See**: [Edge Case Catalog](../../patterns/edge-case-catalog.md) for full edge case library

### Distribution Analysis

**Age Distribution**:

- 18-30: 6 records (30%) - includes edge case at 18
- 31-50: 9 records (45%)
- 51-70: 5 records (25%)
- 71-100: 0 records (0%)

**Temporal Distribution** (created_at):

- 1970: 1 record (edge case: epoch)
- 2020: 3 records
- 2021: 3 records
- 2022: 4 records
- 2023: 4 records
- 2024: 5 records

**Name Diversity**:

- Unique first names: 19/20 (95%) - one 255-char edge case
- Unique last names: 19/20 (95%)

### Warnings

None. All constraints satisfied with zero violations.

---

## Reproducibility

To regenerate this exact dataset:

```bash
# Using seed 42 with users.sql schema
generate_data --schema users.sql --seed 42 --count 20 --edge-cases 0.05
```

**Guarantee**: Same seed (42) + same schema → identical output

---

## How This Example Was Generated

### Workflow Steps

1. **Schema Analysis** ([Workflow](../../workflows/01-schema-analysis.md))
   - Parsed DDL to extract constraints
   - Identified: PK (id), UNIQUE (email), NOT NULL (name), CHECK (age), data types

2. **Dependency Graphing** ([Workflow](../../workflows/02-dependency-graphing.md))
   - Single table → no dependencies
   - Generation order: users (no parent tables)

3. **Data Generation** ([Workflow](../../workflows/03-data-generation.md))
   - **PK (id)**: Sequential integers [1..10] ([Pattern](../../patterns/constraint-handling.md#primary-key-pk-constraints))
   - **name**: Realistic names from distributions ([Pattern](../../patterns/locale-patterns.md))
   - **email**: Derived from name + "@example.com", tracked for uniqueness ([Pattern](../../patterns/constraint-handling.md#unique-constraints))
   - **age**: Random int in [18, 100] satisfying CHECK constraint ([Pattern](../../patterns/constraint-handling.md#check-constraints))
   - **created_at**: Random timestamps in [2020-01-01, 2024-12-31] ([Pattern](../../patterns/constraint-handling.md#date--timestamp))

4. **Validation** ([Workflow](../../workflows/04-validation.md))
   - Pre-delivery checks: All constraints satisfied
   - Validation report generated (above)

---

## Patterns Demonstrated

| Pattern | Example in This Dataset |
| ------- | ----------------------- |
| **Sequential PK** | IDs: 1, 2, 3, ..., 20 |
| **Unique Tracking** | Emails tracked in set to prevent duplicates |
| **NOT NULL Enforcement** | All names have values (including 255-char edge case) |
| **Check Constraint Satisfaction** | All ages: 18 ≤ age ≤ 100 (includes min boundary at 18) |
| **Data Type Matching** | VARCHAR lengths respected, valid timestamps |
| **Edge Case Injection** | 5% coverage: max length, min boundary, special chars, epoch |
| **Constraint-First Principle** | All edge cases satisfy constraints (no violations) |
| **Reproducibility** | Seed 42 → identical output on re-run |

**See**:

- [Constraint Handling Pattern](../../patterns/constraint-handling.md)
- [Edge Case Catalog Pattern](../../patterns/edge-case-catalog.md)
- [Reproducibility Pattern](../../patterns/reproducibility.md)

---

## Next Steps

### Progressive Examples

1. **Basic** (This example): Single table with edge cases ✓
2. **Intermediate**: [Products Table](products-table.md) - CHECK constraint with price >= 0
3. **Intermediate**: [E-Commerce Schema](../intermediate/ecommerce-schema.md) - Multi-table with FK relationships
4. **Intermediate**: [Blog Platform](../intermediate/blog-platform.md) - Realistic distributions (Zipf, Normal)
5. **Advanced**: [Self-Referencing Hierarchies](../advanced/self-referencing-hierarchies.md) - Employee.managerId → Employee.id

### Edge Case Examples

This example demonstrates basic edge case coverage (5%). For more complex edge case scenarios:

- [Circular Dependencies](../advanced/circular-dependencies.md) - Edge cases with circular FK relationships
- [Multi-Tenant System](../advanced/multi-tenant-system.md) - Edge cases in tenant isolation

---

**Related**:

- **Workflows**: [Schema Analysis](../../workflows/01-schema-analysis.md), [Data Generation](../../workflows/03-data-generation.md), [Validation](../../workflows/04-validation.md)
- **Patterns**: [Constraint Handling](../../patterns/constraint-handling.md), [Edge Case Catalog](../../patterns/edge-case-catalog.md), [Reproducibility](../../patterns/reproducibility.md)
- **Templates**: [Validation Report](../../templates/validation-report.md), [SQL Insert Format](../../templates/sql-insert-format.md)

---

**Last Updated**: 2026-01-04
