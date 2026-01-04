# Workflow 1: Schema Analysis

**Purpose**: Parse database schema and extract all constraints for data generation

**Input**: SQL DDL (CREATE TABLE statements), JSON Schema, or ORM model definitions

**Output**: Structured constraint catalog with tables, columns, data types, and all constraints

---

## Step 1: Parse Schema Input

### SQL DDL Format (Primary)

**Expected Input**:
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    age INT CHECK (age >= 18),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total DECIMAL(10, 2) CHECK (total >= 0),
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'cancelled'))
);
```

**Parsing Steps**:
1. **Identify table definitions**: Each `CREATE TABLE <name> (...)`
2. **Extract table name**: `users`, `orders`
3. **Parse column definitions**: For each line between parentheses
   - Column name: `id`, `email`, `name`, etc.
   - Data type: `SERIAL`, `VARCHAR(255)`, `INT`, `DECIMAL(10, 2)`, etc.
   - Inline constraints: `PRIMARY KEY`, `UNIQUE`, `NOT NULL`, `CHECK (...)`
   - Default values: `DEFAULT CURRENT_TIMESTAMP`
   - Foreign keys: `REFERENCES <table>(<column>)` with cascade semantics

### JSON Schema Format (Secondary)

**Expected Input**:
```json
{
  "tables": {
    "users": {
      "columns": {
        "id": {"type": "integer", "primaryKey": true, "autoIncrement": true},
        "email": {"type": "string", "maxLength": 255, "unique": true, "nullable": false},
        "age": {"type": "integer", "check": "age >= 18"}
      }
    }
  }
}
```

**Parsing Steps**: Extract same information as SQL DDL but from JSON structure

### ORM Model Format (Documented Patterns)

Common ORM patterns to recognize:
- **SQLAlchemy (Python)**: `Column(Integer, primary_key=True)`, `Column(String(255), unique=True)`
- **Django ORM (Python)**: `models.CharField(max_length=255, unique=True)`
- **Prisma (JavaScript)**: `@id`, `@unique`, `@relation`
- **TypeORM (TypeScript)**: `@PrimaryKey()`, `@Column({unique: true})`

**Conversion**: Map ORM syntax to standard constraint representation

---

## Step 2: Extract Constraints by Type

### 2a. Primary Key Constraints

**Indicators**:
- `PRIMARY KEY` keyword inline or as table constraint
- `@id` in ORM models
- `primaryKey: true` in JSON schema

**Extract**:
- Table name
- Column name(s) - can be composite (multiple columns)
- Data type (for generation strategy selection)

**Example**:
```text
Table: users
PK: id (INT, auto-increment)

Table: orders
PK: id (INT, auto-increment)
```

### 2b. Foreign Key Constraints

**Indicators**:
- `REFERENCES <parent_table>(<parent_column>)` syntax
- `@relation` in ORM models
- `foreignKey` in JSON schema

**Extract**:
- Child table
- Child column
- Parent table
- Parent column
- Cascade semantics: `ON DELETE CASCADE`, `ON DELETE SET NULL`, `ON DELETE RESTRICT`, `ON UPDATE CASCADE`
- Nullability: Can FK be NULL?

**Example**:
```text
FK: orders.user_id → users.id
  - ON DELETE CASCADE
  - NOT NULL (required relationship)
```

### 2c. Unique Constraints

**Indicators**:
- `UNIQUE` keyword
- `@unique` in ORM models
- `unique: true` in JSON schema

**Extract**:
- Table name
- Column name(s) - can be composite
- Nullability: Can unique column be NULL?

**Example**:
```text
Table: users
UNIQUE: email (VARCHAR(255), NOT NULL)
```

### 2d. NOT NULL Constraints

**Indicators**:
- `NOT NULL` keyword
- `nullable: false` in JSON schema
- ORM columns without `null=True`

**Extract**:
- Table name
- Column name
- Data type (for default value generation)

**Example**:
```text
Table: users
NOT NULL: email (VARCHAR(255))
NOT NULL: name (VARCHAR(100))
```

### 2e. Check Constraints

**Indicators**:
- `CHECK (condition)` syntax
- `check` property in JSON schema
- Validators in ORM models

**Extract**:
- Table name
- Column name(s) involved in check
- Condition expression: `age >= 18`, `status IN ('pending', 'completed', 'cancelled')`, `total >= 0`
- Parse condition to determine:
  - Comparison operator: `>=`, `<=`, `=`, `!=`, `IN`, `BETWEEN`
  - Constraint values: `18`, `0`, `['pending', 'completed', 'cancelled']`

**Example**:
```text
Table: users
CHECK: age >= 18
  - Column: age
  - Operator: >=
  - Value: 18

Table: orders
CHECK: status IN ('pending', 'completed', 'cancelled')
  - Column: status
  - Operator: IN
  - Values: ['pending', 'completed', 'cancelled']
```

### 2f. Data Type Constraints

**Extract for Each Column**:
- Base type: `INT`, `VARCHAR`, `DECIMAL`, `DATE`, `TIMESTAMP`, `BOOLEAN`, etc.
- Length/Precision: `VARCHAR(255)`, `DECIMAL(10, 2)`
- Scale: Second number in `DECIMAL(10, 2)` = 2 decimal places
- Range: `SMALLINT` (-32768 to 32767), `INT` (-2^31 to 2^31-1), etc.

**Example**:
```text
Table: users
Column: email
  - Type: VARCHAR
  - Max Length: 255
  - Nullable: false

Table: orders
Column: total
  - Type: DECIMAL
  - Precision: 10
  - Scale: 2
  - Nullable: true
```

---

## Step 3: Build Constraint Catalog

Organize extracted constraints into structured catalog:

```text
CONSTRAINT CATALOG
==================

TABLE: users
------------
Columns:
  - id: SERIAL (INT, auto-increment, NOT NULL, PRIMARY KEY)
  - email: VARCHAR(255) (NOT NULL, UNIQUE)
  - name: VARCHAR(100) (NOT NULL)
  - age: INT (nullable, CHECK: age >= 18)
  - created_at: TIMESTAMP (nullable, DEFAULT: CURRENT_TIMESTAMP)

Primary Key: id
Unique Constraints: email
NOT NULL Constraints: id, email, name
Check Constraints: age >= 18
Foreign Keys: None

TABLE: orders
-------------
Columns:
  - id: SERIAL (INT, auto-increment, NOT NULL, PRIMARY KEY)
  - user_id: INT (NOT NULL, FK → users.id ON DELETE CASCADE)
  - total: DECIMAL(10,2) (nullable, CHECK: total >= 0)
  - status: VARCHAR(20) (nullable, CHECK: status IN ('pending', 'completed', 'cancelled'))

Primary Key: id
Unique Constraints: None
NOT NULL Constraints: id, user_id
Check Constraints: total >= 0, status IN ('pending', 'completed', 'cancelled')
Foreign Keys: user_id → users.id (ON DELETE CASCADE)
```

---

## Step 4: Identify Data Types for Generation

Map SQL data types to generation strategies:

| SQL Type | Generation Strategy |
|----------|-------------------|
| `INT`, `SERIAL`, `BIGINT` | Sequential integers or random in range |
| `VARCHAR(n)`, `TEXT` | Random strings up to length n |
| `DECIMAL(p,s)` | Random decimals with precision p, scale s |
| `DATE` | Random dates in range (default: 2020-01-01 to today) |
| `TIMESTAMP`, `DATETIME` | Random timestamps in range |
| `BOOLEAN` | Random true/false |
| `UUID` | Random UUID v4 |

**Example Mapping**:
```text
users.id (SERIAL) → Sequential: 1, 2, 3, 4, ...
users.email (VARCHAR(255)) → Random realistic email: firstname.lastname@example.com
users.age (INT, CHECK >= 18) → Random int in range [18, 100]
orders.total (DECIMAL(10,2), CHECK >= 0) → Random decimal in range [0.00, 9999.99]
orders.status (VARCHAR(20), CHECK IN (...)) → Random choice from ['pending', 'completed', 'cancelled']
```

---

## Step 5: Validate Schema

**Before proceeding to dependency graphing**, check for schema issues:

### Validation Checks

1. **No contradictory constraints**:
   - ❌ `CHECK (age >= 18 AND age < 18)` → Impossible
   - ✅ `CHECK (age >= 18 AND age <= 100)` → Valid range

2. **Foreign key references existing table**:
   - ❌ `REFERENCES non_existent_table(id)` → Table doesn't exist
   - ✅ `REFERENCES users(id)` → Table exists

3. **Foreign key references existing column**:
   - ❌ `REFERENCES users(non_existent_column)` → Column doesn't exist
   - ✅ `REFERENCES users(id)` → Column exists

4. **Foreign key types match parent**:
   - ❌ Child: `VARCHAR`, Parent: `INT` → Type mismatch
   - ✅ Child: `INT`, Parent: `INT` → Types match

5. **Unique constraints on appropriate types**:
   - ⚠️ `UNIQUE` on `TEXT` column → May have performance issues
   - ✅ `UNIQUE` on `VARCHAR(255)` → Appropriate

### Error Handling

If validation fails:
- **STOP**: Do not proceed to data generation
- **Report**: Clear error message with table, column, constraint details
- **Suggest**: Correction (e.g., "Remove contradictory CHECK constraint")

---

## Output: Constraint Catalog

**Deliverable**: Structured catalog ready for [Dependency Graphing (Workflow 2)](02-dependency-graphing.md)

**Format**:
- Tables list
- For each table:
  - Column definitions with types and lengths
  - Primary key
  - Unique constraints
  - NOT NULL constraints
  - Check constraints
  - Foreign keys with cascade semantics
  - Default values

**Next Step**: Proceed to [Workflow 2: Dependency Graphing](02-dependency-graphing.md) to determine generation order

---

## Examples

See these examples for schema analysis in action:
- **[Users Table](../examples/basic/users-table.md)**: Simple single-table schema
- **[E-Commerce Schema](../examples/intermediate/ecommerce-schema.md)**: Multi-table schema with FK relationships

---

**Related**:
- **Pattern**: [Constraint Handling](../patterns/constraint-handling.md) - How to satisfy each constraint type during generation
- **Next Workflow**: [Dependency Graphing](02-dependency-graphing.md)

---

**Last Updated**: 2026-01-04
