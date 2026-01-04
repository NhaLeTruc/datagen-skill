# Example: Circular Dependencies (Advanced)

**Complexity**: Advanced (Circular foreign key dependencies)

**Demonstrates**:

- Circular FK dependency resolution (User ↔ Organization)
- Nullable FK strategy for breaking cycles
- Tiered generation approach
- Edge case coverage in circular relationships
- Constraint-valid data with deferred constraints

**User Stories**: US1 (Constraint-Valid Data), US3 (Edge Case Coverage)

---

## Input Schema

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    primary_org_id INT,
    FOREIGN KEY (primary_org_id) REFERENCES organizations(id)
);

CREATE TABLE organizations (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id INT NOT NULL,
    founded_date DATE,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

### Circular Dependency Analysis

**The Cycle**:

```text
users.primary_org_id → organizations.id
organizations.owner_id → users.id
```

**Problem**: Cannot insert users without organizations (FK constraint), and cannot insert organizations without users (FK constraint).

**Solution**: Break cycle using nullable FK + tiered generation

---

## Constraint Analysis

### Users Table

| Constraint Type | Column | Rule |
| --------------- | ------ | ---- |
| **Primary Key** | `id` | Unique, non-null integers |
| **NOT NULL** | `name`, `email` | Must have value |
| **UNIQUE** | `email` | No duplicate emails |
| **Foreign Key** | `primary_org_id` | References organizations.id (NULLABLE) |

### Organizations Table

| Constraint Type | Column | Rule |
| --------------- | ------ | ---- |
| **Primary Key** | `id` | Unique, non-null integers |
| **NOT NULL** | `name`, `owner_id` | Must have value |
| **Foreign Key** | `owner_id` | References users.id (NOT NULL) |

**Key Insight**: `users.primary_org_id` is nullable → can break the cycle

---

## Generation Strategy

### Tiered Generation Approach

```text
Tier 1: Create users without primary_org_id (NULL)
        ↓
Tier 2: Create organizations (owner_id references Tier 1 users)
        ↓
Tier 3: Update users to set primary_org_id (references Tier 2 orgs)
```

**Alternative**: Use deferred constraints (supported in PostgreSQL)

---

## Generation Parameters

- **Seed**: 100 (for reproducibility)
- **Record Count**: 10 users, 5 organizations
- **Edge Case Coverage**: 5%

---

## Generated Data

### Step 1: Create Users (primary_org_id = NULL)

```sql
-- Seed: 100
-- Tier 1: Users without primary_org_id
-- Generated: 2024-01-04 16:00:00 UTC

INSERT INTO users (id, name, email, primary_org_id) VALUES
  (1, 'Sarah Chen', 'sarah.chen@example.com', NULL),
  (2, 'James Wilson', 'james.wilson@example.com', NULL),
  (3, 'Maria Garcia', 'maria.garcia@example.com', NULL),
  (4, 'David Kim', 'david.kim@example.com', NULL),
  (5, 'Jennifer Taylor', 'jennifer.taylor@example.com', NULL),
  (6, 'Michael Brown', 'michael.brown@example.com', NULL),
  (7, 'Lisa Anderson', 'lisa.anderson@example.com', NULL),
  (8, 'Robert Martinez', 'robert.martinez@example.com', NULL),
  (9, 'Emily Davis', 'emily.davis@example.com', NULL),
  (10, 'Christopher Lee', 'christopher.lee@example.com', NULL);
```

### Step 2: Create Organizations (owner_id references users)

```sql
-- Tier 2: Organizations with owner_id
INSERT INTO organizations (id, name, owner_id, founded_date) VALUES
  (1, 'TechCorp', 1, '2010-05-15'),         -- Owner: Sarah Chen
  (2, 'DataInc', 3, '2015-08-22'),          -- Owner: Maria Garcia
  (3, 'CloudSystems', 5, '2018-03-10'),     -- Owner: Jennifer Taylor
  (4, 'DevStudio', 7, '2020-11-01'),        -- Owner: Lisa Anderson
  (5, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345', 9, '1970-01-01');  -- Edge: max length name, epoch date, Owner: Emily Davis
```

### Step 3: Update Users (set primary_org_id)

```sql
-- Tier 3: Update users with primary_org_id
UPDATE users SET primary_org_id = 1 WHERE id = 1;  -- Sarah → TechCorp
UPDATE users SET primary_org_id = 1 WHERE id = 2;  -- James → TechCorp
UPDATE users SET primary_org_id = 2 WHERE id = 3;  -- Maria → DataInc
UPDATE users SET primary_org_id = 2 WHERE id = 4;  -- David → DataInc
UPDATE users SET primary_org_id = 3 WHERE id = 5;  -- Jennifer → CloudSystems
UPDATE users SET primary_org_id = 3 WHERE id = 6;  -- Michael → CloudSystems
UPDATE users SET primary_org_id = 4 WHERE id = 7;  -- Lisa → DevStudio
UPDATE users SET primary_org_id = 4 WHERE id = 8;  -- Robert → DevStudio
UPDATE users SET primary_org_id = 5 WHERE id = 9;  -- Emily → Edge Case Org
UPDATE users SET primary_org_id = NULL WHERE id = 10;  -- Christopher → NULL (edge case: user with no primary org)
```

### Final Dataset (After Updates)

```sql
-- Final state: Users with primary_org_id set
SELECT * FROM users;
/*
id | name              | email                         | primary_org_id
---|-------------------|-------------------------------|----------------
1  | Sarah Chen        | sarah.chen@example.com        | 1 (TechCorp)
2  | James Wilson      | james.wilson@example.com      | 1 (TechCorp)
3  | Maria Garcia      | maria.garcia@example.com      | 2 (DataInc)
4  | David Kim         | david.kim@example.com         | 2 (DataInc)
5  | Jennifer Taylor   | jennifer.taylor@example.com   | 3 (CloudSystems)
6  | Michael Brown     | michael.brown@example.com     | 3 (CloudSystems)
7  | Lisa Anderson     | lisa.anderson@example.com     | 4 (DevStudio)
8  | Robert Martinez   | robert.martinez@example.com   | 4 (DevStudio)
9  | Emily Davis       | emily.davis@example.com       | 5 (Edge Org)
10 | Christopher Lee   | christopher.lee@example.com   | NULL (edge case)
*/

SELECT * FROM organizations;
/*
id | name                  | owner_id | founded_date
---|----------------------|----------|-------------
1  | TechCorp             | 1        | 2010-05-15
2  | DataInc              | 3        | 2015-08-22
3  | CloudSystems         | 5        | 2018-03-10
4  | DevStudio            | 7        | 2020-11-01
5  | ABCDEFG...255 chars  | 9        | 1970-01-01 (edge case)
*/
```

---

## Validation Report

### Generation Metadata

- **Seed**: 100
- **Timestamp**: 2024-01-04 16:00:00 UTC
- **Record Count**: 10 users, 5 organizations
- **Edge Case Coverage**: 5% (1 org edge case, 1 user NULL edge case)
- **Schema**: users ↔ organizations (circular dependency)
- **Generator Version**: 1.0

### Constraint Satisfaction Checks

#### Primary Keys

- ✅ Users: All IDs unique [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
- ✅ Organizations: All IDs unique [1, 2, 3, 4, 5]

#### Foreign Keys

**users.primary_org_id → organizations.id**:

- ✅ All non-NULL values reference valid organizations
- ✅ Values: [1, 1, 2, 2, 3, 3, 4, 4, 5, NULL]
- ✅ Edge case (ID 10): NULL primary_org_id (valid for nullable FK)

**organizations.owner_id → users.id**:

- ✅ All owner_id values reference valid users (NOT NULL constraint)
- ✅ Values: [1, 3, 5, 7, 9]
- ✅ All owners exist in users table

#### Unique Constraints

**users.email**:

- ✅ All 10 emails unique (no duplicates)
- ✅ All emails non-null (NOT NULL + UNIQUE constraint)

#### NOT NULL Constraints

- ✅ users.name: All 10 records have non-null names
- ✅ users.email: All 10 records have non-null emails
- ✅ organizations.name: All 5 records have non-null names
- ✅ organizations.owner_id: All 5 records have non-null owner_id

### Referential Integrity Audit

**Circular Dependency Resolution**:

- ✅ Cycle broken using nullable FK (users.primary_org_id)
- ✅ Tier 1: Users created with primary_org_id = NULL
- ✅ Tier 2: Organizations created with valid owner_id
- ✅ Tier 3: Users updated with valid primary_org_id
- ✅ No orphan FKs (all references valid or NULL)

**Ownership Validation**:

- ✅ Organization 1 owned by User 1 (Sarah)
- ✅ Organization 2 owned by User 3 (Maria)
- ✅ Organization 3 owned by User 5 (Jennifer)
- ✅ Organization 4 owned by User 7 (Lisa)
- ✅ Organization 5 owned by User 9 (Emily)

**Primary Organization Validation**:

- ✅ 9 users have valid primary organizations
- ✅ 1 user (Christopher) has NULL primary organization (valid edge case)

### Edge Case Coverage

**Edge Case Percentage**: 10% (1 org + 1 user edge case out of 15 total records)

**Organization Edge Cases**:

| Edge Case Type | Column | Value | Constraint Compliance |
| -------------- | ------ | ----- | --------------------- |
| **Max length** | name | 255 chars | ✅ Satisfies VARCHAR(255) |
| **Epoch** | founded_date | 1970-01-01 | ✅ Valid DATE |

**User Edge Cases**:

| Edge Case Type | Column | Value | Constraint Compliance |
| -------------- | ------ | ----- | --------------------- |
| **NULL FK** | primary_org_id | NULL | ✅ Nullable FK allows NULL |

**Constraint-First Principle**: All edge cases satisfy constraints (Principle I > Principle IV)

**See**: [Edge Case Catalog](../../patterns/edge-case-catalog.md) for full edge case library

### Distribution Analysis

**Users per Organization**:

- TechCorp: 2 users (20%)
- DataInc: 2 users (20%)
- CloudSystems: 2 users (20%)
- DevStudio: 2 users (20%)
- Edge Org: 1 user (10%)
- No primary org: 1 user (10%)

**Organization Founding Dates**:

- 1970s: 1 org (edge case: epoch)
- 2010-2015: 2 orgs
- 2016-2020: 2 orgs

### Warnings

None. All constraints satisfied with zero violations. Circular dependency successfully resolved.

---

## Reproducibility

To regenerate this exact dataset:

```bash
# Using seed 100 with circular schema
generate_data --schema circular.sql --seed 100 --users 10 --orgs 5 --edge-cases 0.05
```

**Guarantee**: Same seed (100) + same schema → identical output

---

## How This Example Was Generated

### Workflow Steps

1. **Schema Analysis** ([Workflow](../../workflows/01-schema-analysis.md))
   - Parsed DDL to extract constraints
   - **Detected circular dependency**: users ↔ organizations
   - Identified nullable FK: users.primary_org_id (can be NULL)

2. **Dependency Graphing** ([Workflow](../../workflows/02-dependency-graphing.md))
   - **Cycle Detection**: users → organizations → users
   - **Resolution Strategy**: Break cycle at nullable FK
   - **Generation Order**: users (NULL FK) → organizations → UPDATE users

3. **Data Generation** ([Workflow](../../workflows/03-data-generation.md))
   - **Tier 1**: Generate users with primary_org_id = NULL
   - **Tier 2**: Generate organizations with owner_id from users PK pool
   - **Tier 3**: Update users to set primary_org_id from organizations PK pool
   - **Edge Cases**: Inject max-length org name, epoch date, NULL FK

4. **Validation** ([Workflow](../../workflows/04-validation.md))
   - Pre-delivery checks: All constraints satisfied
   - Circular dependency resolution verified
   - Validation report generated (above)

---

## Patterns Demonstrated

| Pattern | Example in This Dataset |
| ------- | ----------------------- |
| **Circular Dependency Resolution** | Break cycle at nullable FK (users.primary_org_id) |
| **Tiered Generation** | 3 tiers: users → orgs → update users |
| **Nullable FK Strategy** | Use NULL to bootstrap circular references |
| **FK Pool Management** | Track PKs for both tables across tiers |
| **Edge Case Injection** | Max length name, epoch date, NULL FK |
| **Constraint-First Principle** | All edge cases satisfy constraints |
| **Reproducibility** | Seed 100 → identical output on re-run |

**See**:

- [Constraint Handling Pattern](../../patterns/constraint-handling.md) - Circular dependencies section
- [Edge Case Catalog Pattern](../../patterns/edge-case-catalog.md)
- [Reproducibility Pattern](../../patterns/reproducibility.md)

---

## Circular Dependency Strategies

### Strategy 1: Nullable FK (Used Here)

**Pros**:

- Simple implementation
- Works with standard SQL
- No special database features required

**Cons**:

- Requires nullable FK in schema
- Multi-tier generation (INSERT → INSERT → UPDATE)

**When to Use**: When one FK in the cycle is nullable

---

### Strategy 2: Deferred Constraints (PostgreSQL)

```sql
SET CONSTRAINTS ALL DEFERRED;

-- Insert both tables in same transaction
INSERT INTO users (id, name, email, primary_org_id) VALUES
  (1, 'Sarah Chen', 'sarah.chen@example.com', 1);

INSERT INTO organizations (id, name, owner_id, founded_date) VALUES
  (1, 'TechCorp', 1, '2010-05-15');

COMMIT;  -- Constraints checked at commit time
```

**Pros**:

- Single-pass generation (no UPDATE needed)
- All FKs can be NOT NULL

**Cons**:

- Requires database support for deferred constraints
- PostgreSQL-specific (not portable)

**When to Use**: When targeting PostgreSQL and both FKs are NOT NULL

---

### Strategy 3: Disable Constraints (Not Recommended)

```sql
-- DANGER: Do not use in production
ALTER TABLE users NOCHECK CONSTRAINT FK_primary_org_id;
ALTER TABLE organizations NOCHECK CONSTRAINT FK_owner_id;

-- Insert data
INSERT INTO users ...;
INSERT INTO organizations ...;

-- Re-enable constraints
ALTER TABLE users CHECK CONSTRAINT FK_primary_org_id;
ALTER TABLE organizations CHECK CONSTRAINT FK_owner_id;
```

**Pros**:

- Simple insertion logic

**Cons**:

- ❌ Violates Constitutional Principle I (constraint compliance)
- ❌ Dangerous: can insert invalid data
- ❌ Not suitable for test data generation

**When to Use**: **NEVER** (violates constraint-first principle)

---

## Advanced Scenarios

### Scenario 1: Multi-Table Circular Dependency

```sql
-- A → B → C → A (3-table cycle)
CREATE TABLE table_a (id INT PRIMARY KEY, c_id INT REFERENCES table_c(id));
CREATE TABLE table_b (id INT PRIMARY KEY, a_id INT REFERENCES table_a(id));
CREATE TABLE table_c (id INT PRIMARY KEY, b_id INT REFERENCES table_b(id));
```

**Solution**: Break at nullable FK (choose one FK to be nullable)

---

### Scenario 2: Self-Referencing + Circular Dependency

```sql
-- Users have managers (self-ref) AND primary org (circular)
CREATE TABLE users (
    id INT PRIMARY KEY,
    manager_id INT REFERENCES users(id),      -- Self-reference
    primary_org_id INT REFERENCES organizations(id)  -- Circular
);
```

**Solution**: Combine tiered generation + nullable FKs for both cycles

---

## Next Steps

### Progressive Examples

1. **Basic**: [Users Table](../basic/users-table.md) - Single table with edge cases
2. **Intermediate**: [E-Commerce Schema](../intermediate/ecommerce-schema.md) - Multi-table (no cycles)
3. **Advanced**: [Self-Referencing Hierarchies](self-referencing-hierarchies.md) - Employee.managerId
4. **Advanced** (This example): Circular dependencies ✓
5. **Advanced**: [Multi-Tenant System](multi-tenant-system.md) - Tenant isolation with edge cases

### Related Examples

- [Self-Referencing Hierarchies](self-referencing-hierarchies.md) - Similar tiered approach for self-FKs
- [Multi-Tenant System](multi-tenant-system.md) - Complex multi-table with edge cases

---

**Related**:

- **Workflows**: [Dependency Graphing](../../workflows/02-dependency-graphing.md), [Data Generation](../../workflows/03-data-generation.md)
- **Patterns**: [Constraint Handling](../../patterns/constraint-handling.md), [Edge Case Catalog](../../patterns/edge-case-catalog.md)
- **Templates**: [Validation Report](../../templates/validation-report.md)

---

**Last Updated**: 2026-01-04
