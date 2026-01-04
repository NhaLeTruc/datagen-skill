# Example: Users Table (Basic)

**Complexity**: Basic (Single table, no foreign keys)

**Demonstrates**:
- Primary key generation (sequential IDs)
- Unique constraint (email)
- NOT NULL constraint (name)
- Check constraint (age >= 18)
- Data type constraints (VARCHAR length, INT range)

**User Story**: US1 - Generate Constraint-Valid Test Data

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
- **Record Count**: 10
- **Edge Case Coverage**: 0% (basic example, no edge cases)

---

## Generated Data

### SQL INSERT Format

```sql
-- Seed: 42
-- Record Count: 10
-- Generated: 2024-01-04 15:30:00 UTC

INSERT INTO users (id, name, email, age, created_at) VALUES
  (1, 'Sarah Chen', 'sarah.chen@example.com', 34, '2022-07-15 10:23:45'),
  (2, 'James Wilson', 'james.wilson@example.com', 28, '2021-03-22 14:30:12'),
  (3, 'Maria Garcia', 'maria.garcia@example.com', 45, '2023-11-08 09:15:33'),
  (4, 'David Kim', 'david.kim@example.com', 52, '2020-05-17 16:42:19'),
  (5, 'Jennifer Taylor', 'jennifer.taylor@example.com', 23, '2024-02-10 11:05:27'),
  (6, 'Michael Brown', 'michael.brown@example.com', 67, '2022-09-30 13:18:54'),
  (7, 'Lisa Anderson', 'lisa.anderson@example.com', 41, '2021-12-14 08:37:41'),
  (8, 'Robert Martinez', 'robert.martinez@example.com', 19, '2023-06-25 15:22:03'),
  (9, 'Emily Davis', 'emily.davis@example.com', 38, '2020-10-03 12:49:16'),
  (10, 'Christopher Lee', 'christopher.lee@example.com', 55, '2024-01-18 17:11:29');
```

---

## Validation Report

### Generation Metadata

- **Seed**: 42
- **Timestamp**: 2024-01-04 15:30:00 UTC
- **Record Count**: 10
- **Schema**: users (single table)
- **Generator Version**: 1.0

### Constraint Satisfaction Checks

#### Primary Key (id)

- ✅ All IDs unique: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`
- ✅ All IDs non-null
- ✅ Sequential generation (1..10)

#### NOT NULL (name)

- ✅ All 10 records have non-null `name`
- ✅ Sample names: `["Sarah Chen", "James Wilson", "Maria Garcia", ...]`

#### UNIQUE (email)

- ✅ All 10 emails unique (no duplicates)
- ✅ Sample emails: `["sarah.chen@example.com", "james.wilson@example.com", ...]`
- ✅ No NULL emails in this dataset (column allows NULL but none generated)

#### CHECK (age >= 18 AND age <= 100)

- ✅ All 10 ages satisfy constraint: `18 <= age <= 100`
- ✅ Age range in dataset: `[19, 23, 28, 34, 38, 41, 45, 52, 55, 67]`
- ✅ Min age: 19 (satisfies >= 18)
- ✅ Max age: 67 (satisfies <= 100)

#### Data Type Constraints

- ✅ **name (VARCHAR 255)**: All names ≤ 255 chars
  - Max length in dataset: 17 chars ("Christopher Lee")
- ✅ **email (VARCHAR 255)**: All emails ≤ 255 chars
  - Max length in dataset: 32 chars ("christopher.lee@example.com")
- ✅ **age (INT)**: All ages valid integers
- ✅ **created_at (TIMESTAMP)**: All timestamps valid
  - Range: 2020-05-17 to 2024-02-10

### Referential Integrity Audit

**N/A**: Single table, no foreign key relationships

### Edge Case Coverage

**Edge Cases**: 0% (basic example)

**Note**: This is a basic example demonstrating constraint satisfaction. See [Users Table with Edge Cases](../intermediate/users-table-edge-cases.md) for edge case examples.

### Distribution Analysis

**Age Distribution**:
- 18-30: 2 records (20%)
- 31-50: 5 records (50%)
- 51-70: 3 records (30%)
- 71-100: 0 records (0%)

**Temporal Distribution** (created_at):
- 2020: 2 records
- 2021: 2 records
- 2022: 2 records
- 2023: 2 records
- 2024: 2 records

**Name Diversity**:
- Unique first names: 10/10 (100%)
- Unique last names: 10/10 (100%)

### Warnings

None. All constraints satisfied with zero violations.

---

## Reproducibility

To regenerate this exact dataset:

```bash
# Using seed 42 with users.sql schema
generate_data --schema users.sql --seed 42 --count 10
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
|---------|-------------------------|
| **Sequential PK** | IDs: 1, 2, 3, ..., 10 |
| **Unique Tracking** | Emails tracked in set to prevent duplicates |
| **NOT NULL Enforcement** | All names have values |
| **Check Constraint Satisfaction** | All ages: 18 ≤ age ≤ 100 |
| **Data Type Matching** | VARCHAR lengths respected, valid timestamps |
| **Reproducibility** | Seed 42 → identical output on re-run |

**See**:
- [Constraint Handling Pattern](../../patterns/constraint-handling.md)
- [Reproducibility Pattern](../../patterns/reproducibility.md)

---

## Next Steps

### Progressive Examples

1. **Basic** (This example): Single table, basic constraints ✓
2. **Intermediate**: [Products Table](products-table.md) - CHECK constraint with price >= 0
3. **Intermediate**: [E-Commerce Schema](../intermediate/ecommerce-schema.md) - Multi-table with FK relationships
4. **Advanced**: [Self-Referencing Hierarchies](../advanced/self-referencing-hierarchies.md) - Employee.managerId → Employee.id

### Add Edge Cases

To see this same schema with edge case coverage:
- [Users Table with Edge Cases](../intermediate/users-table-edge-cases.md) (User Story 3)

### Multi-Format Export

To see this same dataset exported in JSON and CSV:
- [Users Table - Multi-Format](../intermediate/users-table-formats.md) (User Story 4)

---

**Related**:
- **Workflows**: [Schema Analysis](../../workflows/01-schema-analysis.md), [Data Generation](../../workflows/03-data-generation.md), [Validation](../../workflows/04-validation.md)
- **Patterns**: [Constraint Handling](../../patterns/constraint-handling.md), [Reproducibility](../../patterns/reproducibility.md)
- **Templates**: [Validation Report](../../templates/validation-report.md), [SQL Insert Format](../../templates/sql-insert-format.md)

---

**Last Updated**: 2026-01-04
