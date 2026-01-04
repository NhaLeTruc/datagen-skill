# Pattern: Constraint Handling

**Purpose**: How to handle each database constraint type during data generation

**Constitutional Principle**: Principle I - Database Constraint Compliance (NON-NEGOTIABLE)

---

## Overview

Generated data MUST satisfy ALL database constraints with zero violations. This pattern documents specific strategies for each constraint type.

---

## Primary Key (PK) Constraints

**Rule**: PK values MUST be unique and non-null

### Strategy 1: Sequential IDs (for INT, SERIAL, BIGINT)

```python
def generate_sequential_pk(current_index):
    return current_index  # 1, 2, 3, 4, ...
```

**Example**:
```sql
INSERT INTO users (id, name) VALUES
  (1, 'Alice'),
  (2, 'Bob'),
  (3, 'Charlie');
```

**Advantages**:
- ✅ Simple and predictable
- ✅ Guaranteed unique
- ✅ Easy to debug (IDs correspond to generation order)

**Disadvantages**:
- ⚠️ Not realistic for distributed systems (would use UUIDs)

---

### Strategy 2: UUID Generation (for UUID, CHAR(36), VARCHAR(36))

```python
import uuid

def generate_uuid_pk():
    return str(uuid.uuid4())  # e.g., "550e8400-e29b-41d4-a716-446655440000"
```

**Example**:
```sql
INSERT INTO users (id, name) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Alice'),
  ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Bob');
```

**Advantages**:
- ✅ Realistic for distributed systems
- ✅ Guaranteed unique (collision probability negligible)

**Disadvantages**:
- ⚠️ Longer strings (36 chars vs integers)
- ⚠️ Less human-readable

---

### Uniqueness Tracking

**CRITICAL**: Track generated PKs to prevent duplicates

```python
used_pks = set()

def generate_unique_pk(generator_func):
    max_attempts = 1000
    for attempt in range(max_attempts):
        pk = generator_func()
        if pk not in used_pks:
            used_pks.add(pk)
            return pk

    raise Error("Failed to generate unique PK after 1000 attempts")
```

---

## Foreign Key (FK) Constraints

**Rule**: FK values MUST reference existing parent records (or be NULL if nullable)

### Strategy: FK Pool Selection

```python
# Parent table PKs (populated after parent generation)
parent_pk_pool = [1, 2, 3, 4, 5, ..., 1000]

def generate_fk(fk_constraint):
    if fk_constraint.nullable and should_inject_null_edge_case():
        return NULL  # Edge case: orphan by design

    if len(parent_pk_pool) == 0:
        raise Error(f"FK pool empty: {fk_constraint.parent_table} has no records")

    return random.choice(parent_pk_pool)
```

**Example**:
```python
# After generating users (PKs: 1-1000):
pk_pools['users'] = [1, 2, 3, ..., 1000]

# Generate orders referencing users:
order.user_id = random.choice(pk_pools['users'])  # e.g., 42
```

**Result**:
```sql
INSERT INTO users (id, name) VALUES (1, 'Alice'), (2, 'Bob'), ..., (1000, 'Zara');

INSERT INTO orders (id, user_id, total) VALUES
  (1, 42, 100.00),   -- References user 42 (exists)
  (2, 137, 75.50),   -- References user 137 (exists)
  (3, 891, 200.00);  -- References user 891 (exists)
```

---

### Distribution: Uniform vs Zipf

**Uniform Distribution** (default):
```python
fk_value = random.choice(parent_pk_pool)  # Equal probability for all parents
```

**Zipf Distribution** (for popularity):
```python
from scipy.stats import zipf

def select_popular_parent(parent_pk_pool):
    # Power-law: 20% of parents get 80% of references
    idx = zipf.rvs(a=1.5, size=1)[0] - 1
    idx = min(idx, len(parent_pk_pool) - 1)
    return parent_pk_pool[idx]
```

**Use Case**: Product popularity in e-commerce (some products ordered much more frequently)

**See**: [Distribution Strategies pattern](distribution-strategies.md)

---

## Unique Constraints

**Rule**: No duplicate values in constrained columns (NULL allowed if column is nullable)

### Strategy: Track Used Values

```python
used_values = {
    'users.email': set(),
    'products.sku': set(),
}

def generate_unique_value(table, column, generator_func):
    max_attempts = 1000
    key = f"{table}.{column}"

    for attempt in range(max_attempts):
        value = generator_func()

        if value not in used_values[key]:
            used_values[key].add(value)
            return value

    raise Error(f"Failed to generate unique value for {table}.{column} after {max_attempts} attempts")
```

**Example**:
```python
# Generate unique emails
email = generate_realistic_email()  # "sarah.chen@example.com"
if email in used_values['users.email']:
    email = generate_realistic_email()  # Try again
used_values['users.email'].add(email)
```

**Result**:
```sql
INSERT INTO users (id, email) VALUES
  (1, 'sarah.chen@example.com'),      -- Unique
  (2, 'james.wilson@example.com'),    -- Unique
  (3, 'maria.garcia@example.com');    -- Unique
-- No duplicates
```

---

### Edge Case: NULL in Unique Columns

**SQL Behavior**: Multiple NULLs are allowed in UNIQUE columns (NULL != NULL)

```python
if column.nullable and should_inject_null_edge_case():
    return NULL  # Multiple NULLs allowed in UNIQUE column
```

**Example**:
```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(255) UNIQUE  -- Nullable and unique
);

INSERT INTO users (id, email) VALUES
  (1, 'alice@example.com'),  -- Unique non-null
  (2, NULL),                 -- NULL allowed
  (3, NULL),                 -- Multiple NULLs allowed
  (4, 'bob@example.com');    -- Unique non-null
```

---

## NOT NULL Constraints

**Rule**: Column MUST have a value (cannot be NULL)

### Strategy: Always Generate Value (No Skip Logic)

```python
def generate_value_for_not_null_column(column):
    value = generate_value_based_on_type(column)

    assert value is not None, f"Generated NULL for NOT NULL column: {column}"

    return value
```

**Example**:
```python
# users.name is NOT NULL
name = generate_realistic_name()  # "Sarah Chen"
assert name is not None
```

**Result**:
```sql
INSERT INTO users (id, name, email) VALUES
  (1, 'Sarah Chen', 'sarah.chen@example.com'),     -- NOT NULL satisfied
  (2, 'James Wilson', 'james.wilson@example.com'), -- NOT NULL satisfied
  (3, 'Maria Garcia', NULL);                       -- ERROR if email is NOT NULL
```

---

## Check Constraints

**Rule**: Generated values MUST satisfy check condition

### Strategy 1: Range Checks (>=, <=, BETWEEN)

```python
def generate_int_with_range_check(column, check_constraint):
    # Parse: "age >= 18"
    operator, value = parse_check_condition(check_constraint)

    if operator == ">=":
        return random.randint(value, 100)  # [18, 100]
    elif operator == "<=":
        return random.randint(0, value)    # [0, value]
    elif operator == "BETWEEN":
        low, high = value
        return random.randint(low, high)   # [low, high]
```

**Example**:
```sql
CREATE TABLE users (
    age INT CHECK (age >= 18 AND age <= 100)
);

-- Generated values:
INSERT INTO users (age) VALUES (34), (28), (45), (18), (99);
-- All satisfy: 18 <= age <= 100
```

---

### Strategy 2: Enum Checks (IN clause)

```python
def generate_enum_value(check_constraint):
    # Parse: "status IN ('pending', 'completed', 'cancelled')"
    allowed_values = extract_enum_values(check_constraint)
    return random.choice(allowed_values)
```

**Example**:
```sql
CREATE TABLE orders (
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'cancelled'))
);

-- Generated values:
INSERT INTO orders (status) VALUES
  ('pending'),    -- Valid
  ('completed'),  -- Valid
  ('cancelled');  -- Valid
-- All values from allowed set
```

---

### Constraint-First Principle

**CRITICAL**: If edge case violates check constraint, **SKIP edge case**

```python
# Check: age >= 18
# Edge case: age = 0

if edge_case_value < 18:
    # Constraint wins, edge case loses
    skipped_edge_cases.append("age = 0 violates CHECK (age >= 18)")
    value = random.randint(18, 100)  # Generate valid value instead
```

**Constitutional Principle**: Principle I (Constraint Compliance) takes precedence over Principle IV (Edge Case Coverage)

**See**: [Constitution Alignment](../guidelines/constitution-alignment.md)

---

## Data Type Constraints

**Rule**: Values MUST match declared data type, precision, scale, and length

### VARCHAR / CHAR

```python
def generate_varchar(column):
    max_length = column.max_length  # e.g., VARCHAR(255)
    value = generate_realistic_string(column.name)

    # Truncate if exceeds max length
    if len(value) > max_length:
        value = value[:max_length]

    return value
```

**Example**:
```sql
CREATE TABLE users (
    email VARCHAR(255)
);

-- Generated values (all ≤ 255 chars):
INSERT INTO users (email) VALUES
  ('sarah.chen@example.com'),  -- 23 chars ✓
  ('very.long.email.address.that.is.still.valid@example-domain.com');  -- ≤ 255 chars ✓
```

---

### DECIMAL / NUMERIC

```python
def generate_decimal(column):
    precision = column.precision  # Total digits
    scale = column.scale          # Decimal places

    # DECIMAL(10, 2): max 10 total digits, 2 after decimal
    # Range: -99999999.99 to 99999999.99
    max_value = 10 ** (precision - scale) - 1

    value = random.uniform(-max_value, max_value)
    return round(value, scale)
```

**Example**:
```sql
CREATE TABLE orders (
    total DECIMAL(10, 2)  -- Max: 99999999.99
);

-- Generated values:
INSERT INTO orders (total) VALUES
  (100.25),     -- 10 total digits, 2 decimal places ✓
  (9999.99),    -- ✓
  (99999999.99); -- Max value ✓
```

---

### INT / BIGINT

```python
def generate_int(column):
    if column.data_type == 'INT':
        # 32-bit signed: -2,147,483,648 to 2,147,483,647
        return random.randint(-2**31, 2**31 - 1)
    elif column.data_type == 'BIGINT':
        # 64-bit signed: -2^63 to 2^63-1
        return random.randint(-2**63, 2**63 - 1)
```

**Constraint-Aware**: If check constraint narrows range, respect it:
```python
# CHECK (age >= 0) → only generate non-negative
return random.randint(0, 2**31 - 1)
```

---

### DATE / TIMESTAMP

```python
from datetime import datetime, timedelta

def generate_date_in_range(start='2020-01-01', end=None):
    if end is None:
        end = datetime.now()

    start_date = datetime.strptime(start, '%Y-%m-%d')
    end_date = datetime.strptime(end, '%Y-%m-%d') if isinstance(end, str) else end

    delta = (end_date - start_date).days
    random_days = random.randint(0, delta)

    return start_date + timedelta(days=random_days)
```

**Example**:
```sql
CREATE TABLE orders (
    created_at TIMESTAMP
);

-- Generated values (within range):
INSERT INTO orders (created_at) VALUES
  ('2024-03-15 10:23:45'),
  ('2024-06-22 14:30:12'),
  ('2023-11-08 09:15:33');
```

---

## Cascade Semantics

**Rule**: Respect ON DELETE and ON UPDATE behaviors

### ON DELETE CASCADE

**Meaning**: When parent deleted, child records are automatically deleted

**Generation Strategy**: Generate child records that would survive parent deletion

```python
# If orders.user_id has ON DELETE CASCADE:
# Don't generate critical test data for users that might be deleted

# OR: Be aware that deleting user will cascade delete all their orders
```

**Example**:
```sql
CREATE TABLE orders (
    user_id INT REFERENCES users(id) ON DELETE CASCADE
);

-- If user 1 is deleted, all orders with user_id=1 are cascade deleted
```

---

### ON DELETE SET NULL

**Meaning**: When parent deleted, FK in child is set to NULL

**Generation Strategy**: Allow nullable FKs to have NULL

```python
if fk_constraint.on_delete == 'SET NULL':
    # FK must be nullable for SET NULL to work
    assert fk_constraint.nullable, "FK must be nullable for ON DELETE SET NULL"

    # Edge case: Some records can have NULL FK (parent was deleted)
    if should_inject_null_edge_case():
        return NULL
```

**Example**:
```sql
CREATE TABLE orders (
    shipping_address_id INT REFERENCES addresses(id) ON DELETE SET NULL
);

-- Some orders have NULL shipping_address_id (address was deleted)
INSERT INTO orders (id, shipping_address_id) VALUES
  (1, 100),  -- Valid address
  (2, NULL), -- Address was deleted, FK set NULL
  (3, 101);  -- Valid address
```

---

### ON DELETE RESTRICT

**Meaning**: Cannot delete parent if children exist

**Generation Strategy**: Ensure referential integrity (children always reference valid parents)

```python
# No special handling needed - normal FK generation ensures integrity
# Parent cannot be deleted while children reference it
```

**Example**:
```sql
CREATE TABLE products (
    category_id INT REFERENCES categories(id) ON DELETE RESTRICT
);

-- Cannot delete category if products reference it
-- This is default behavior - no special generation needed
```

---

### ON UPDATE CASCADE

**Meaning**: When parent PK changes, FK in children is updated

**Generation Strategy**: Maintain FK references even if parent PK changes

```python
# During generation, this is transparent (FKs select current parent PKs)
# If parent PK is updated after generation, children are auto-updated
```

---

## Composite Constraints

### Composite Primary Key

**Example**:
```sql
CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    PRIMARY KEY (order_id, product_id)
);
```

**Strategy**: Track combinations, not individual values

```python
used_composite_pks = set()  # Set of tuples

def generate_composite_pk(order_id_pool, product_id_pool):
    max_attempts = 1000
    for attempt in range(max_attempts):
        order_id = random.choice(order_id_pool)
        product_id = random.choice(product_id_pool)

        composite_pk = (order_id, product_id)
        if composite_pk not in used_composite_pks:
            used_composite_pks.add(composite_pk)
            return order_id, product_id

    raise Error("Failed to generate unique composite PK")
```

---

### Composite Unique Constraint

**Example**:
```sql
CREATE TABLE user_permissions (
    user_id INT,
    permission_id INT,
    UNIQUE (user_id, permission_id)
);
```

**Strategy**: Same as composite PK - track combinations

---

## Summary Table

| Constraint Type | Generation Strategy | Validation Check |
|-----------------|-------------------|------------------|
| **Primary Key** | Sequential IDs or UUID | All unique, non-null |
| **Foreign Key** | Select from parent PK pool | All resolve to existing parents |
| **Unique** | Track used values in set | No duplicates (NULLs allowed if nullable) |
| **NOT NULL** | Always generate value | No NULLs |
| **Check** | Parse condition, generate satisfying value | All values satisfy condition |
| **Data Type** | Match precision/scale/length | All values fit type constraints |
| **Cascade Semantics** | Respect ON DELETE/UPDATE behavior | Relationships respect cascade rules |

---

## Examples

See constraint handling in action:
- **[Users Table](../examples/basic/users-table.md)**: PK, unique, NOT NULL, check constraints
- **[E-Commerce Schema](../examples/intermediate/ecommerce-schema.md)**: FK relationships with cascade semantics
- **[Self-Referencing Hierarchies](../examples/advanced/self-referencing-hierarchies.md)**: Self-referencing FK (Employee.managerId)

---

**Related**:
- **Workflows**: [Schema Analysis](../workflows/01-schema-analysis.md), [Data Generation](../workflows/03-data-generation.md), [Validation](../workflows/04-validation.md)
- **Guideline**: [Constitution Alignment](../guidelines/constitution-alignment.md) - Principle I

---

**Last Updated**: 2026-01-04
