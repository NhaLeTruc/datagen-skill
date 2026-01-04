# Common Pitfalls: Test Data Generation

**Purpose**: Anti-patterns to avoid when generating test data

---

## Anti-Pattern 1: Generating Children Before Parents

### ❌ Bad Practice

```sql
-- Generate orders BEFORE users exist
INSERT INTO orders (id, user_id, total) VALUES (1, 1, 100.00);
INSERT INTO orders (id, user_id, total) VALUES (2, 2, 75.50);

-- Generate users AFTER orders (too late!)
INSERT INTO users (id, email) VALUES (1, 'alice@example.com');
INSERT INTO users (id, email) VALUES (2, 'bob@example.com');
```

**Problem**: Foreign key violations - orders reference users that don't exist yet

### ✅ Good Practice

```sql
-- Generate users FIRST (parents)
INSERT INTO users (id, email) VALUES (1, 'alice@example.com');
INSERT INTO users (id, email) VALUES (2, 'bob@example.com');

-- Generate orders SECOND (children reference existing users)
INSERT INTO orders (id, user_id, total) VALUES (1, 1, 100.00);
INSERT INTO orders (id, user_id, total) VALUES (2, 2, 75.50);
```

**Solution**: Use [Dependency Graphing workflow](../workflows/02-dependency-graphing.md) to determine correct generation order via topological sort.

---

## Anti-Pattern 2: Unrealistic Data Patterns

### ❌ Bad Practice

```sql
INSERT INTO users (id, email, name, phone) VALUES
  (1, 'test1@test.com', 'User 1', '1111111111'),
  (2, 'test2@test.com', 'User 2', '2222222222'),
  (3, 'test3@test.com', 'User 3', '3333333333');
```

**Problems**:
- Names like "User 1" don't reflect production data
- Emails like "test1@test.com" are unrealistic
- Phone numbers like "1111111111" don't match real formats
- Sequential patterns don't test edge cases

### ✅ Good Practice

```sql
INSERT INTO users (id, email, name, phone) VALUES
  (1, 'sarah.chen@example.com', 'Sarah Chen', '(415) 555-1234'),
  (2, 'james.wilson@example.com', 'James Wilson', '(415) 555-5678'),
  (3, 'maria.garcia@example.com', 'Maria Garcia', '(212) 555-9012');
```

**Solution**: Use [Locale Patterns](../patterns/locale-patterns.md) for realistic names, addresses, emails, and phone numbers.

---

## Anti-Pattern 3: Ignoring Constraint Violations

### ❌ Bad Practice

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL
);

-- Generate duplicate emails (violates UNIQUE constraint)
INSERT INTO users (id, email) VALUES (1, 'test@example.com');
INSERT INTO users (id, email) VALUES (2, 'test@example.com');  -- ERROR!
```

**Problem**: Constraint violation prevents data loading

### ✅ Good Practice

```sql
-- Track used emails to ensure uniqueness
INSERT INTO users (id, email) VALUES (1, 'alice@example.com');  -- Unique
INSERT INTO users (id, email) VALUES (2, 'bob@example.com');    -- Unique
INSERT INTO users (id, email) VALUES (3, 'charlie@example.com'); -- Unique
```

**Solution**: Use [Constraint Handling pattern](../patterns/constraint-handling.md) - track used values in set to prevent duplicates.

---

## Anti-Pattern 4: Delivering Data Without Validation

### ❌ Bad Practice

```text
1. Generate data
2. Deliver to user immediately (no validation)
3. User discovers constraint violations during loading
```

**Problem**: Wastes user time debugging data issues

### ✅ Good Practice

```text
1. Generate data
2. Run pre-delivery validation (MANDATORY)
3. Produce validation report
4. ONLY deliver if ALL validations pass
5. Include validation report with data
```

**Solution**: Always use [Validation workflow](../workflows/04-validation.md) before delivery. **Constitutional Principle V is NON-NEGOTIABLE**.

---

## Anti-Pattern 5: Skipping Edge Cases

### ❌ Bad Practice

```sql
-- All "happy path" data - no edge cases
INSERT INTO users (id, name, age) VALUES
  (1, 'Alice Johnson', 30),
  (2, 'Bob Smith', 35),
  (3, 'Charlie Brown', 40);
-- All ages in safe middle range, no boundary testing
```

**Problem**: Misses bugs that occur at boundaries (age = 18, age = 100, empty strings, etc.)

### ✅ Good Practice

```sql
-- Mix of normal data + edge cases (5%)
INSERT INTO users (id, name, age) VALUES
  (1, 'Alice Johnson', 30),  -- Normal
  (2, 'Bob Smith', 35),       -- Normal
  (3, 'Charlie Brown', 40),   -- Normal
  (4, 'Diana Prince', 18),    -- Edge: Minimum age
  (5, 'Eve Anderson', 99),    -- Edge: Near maximum
  (6, 'Frank Miller', 25),    -- Normal
  (7, 'Grace Lee', 28),       -- Normal
  (8, 'Henry Davis', 32),     -- Normal
  (9, 'Ivy Chen', 45),        -- Normal
  (10, 'Jack Wilson', 18);    -- Edge: Minimum age again
-- ~10% edge cases (2/20 records = 10%)
```

**Solution**: Use [Edge Case Catalog](../patterns/edge-case-catalog.md) and configure edge case percentage (default 5%).

---

## Anti-Pattern 6: Ignoring Self-Referencing Foreign Keys

### ❌ Bad Practice

```sql
CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    manager_id INT NOT NULL REFERENCES employees(id)
);

-- Try to generate all employees at once
INSERT INTO employees (id, name, manager_id) VALUES
  (1, 'Alice', 2),  -- References employee 2 (doesn't exist yet!)
  (2, 'Bob', 1);    -- References employee 1 (circular!)
```

**Problem**: Chicken-and-egg problem - cannot satisfy NOT NULL manager_id if no employees exist yet

### ✅ Good Practice

```sql
-- Tiered generation: First employees have NULL manager_id, subsequent reference earlier employees
INSERT INTO employees (id, name, manager_id) VALUES
  (1, 'Alice CEO', NULL),       -- Tier 1: Root employee (no manager)
  (2, 'Bob VP', 1),             -- Tier 2: References tier 1
  (3, 'Charlie Director', 2),   -- Tier 3: References tier 2
  (4, 'Diana Manager', 2),      -- Tier 3: References tier 2
  (5, 'Eve Employee', 3);       -- Tier 4: References tier 3
```

**Solution**: Use [Self-Referencing Hierarchies example](../examples/advanced/self-referencing-hierarchies.md) for tiered generation strategy.

---

## Anti-Pattern 7: Inconsistent Multi-Format Export

### ❌ Bad Practice

```text
SQL:   3 users generated
JSON:  2 users generated (missing one!)
CSV:   3 users but different names than SQL/JSON
```

**Problem**: Formats don't match - cannot trust data consistency

### ✅ Good Practice

```text
1. Generate data ONCE in memory
2. Serialize to each format (SQL, JSON, CSV)
3. Validate consistency: Compare record counts and key values
4. Deliver only if ALL formats match

SQL:   3 users (IDs: 1, 2, 3)
JSON:  3 users (IDs: 1, 2, 3) ✓ Match
CSV:   3 users (IDs: 1, 2, 3) ✓ Match
```

**Solution**: Use [Export Formats workflow](../workflows/05-export-formats.md) with consistency validation.

---

## Anti-Pattern 8: Hardcoding Instead of Using Seeds

### ❌ Bad Practice

```python
# Always generates same data (not reproducible with different seeds)
users = [
    {"id": 1, "name": "Alice"},
    {"id": 2, "name": "Bob"}
]
```

**Problem**: Cannot reproduce exact dataset, cannot vary data for different test scenarios

### ✅ Good Practice

```python
# Use seed for deterministic reproducibility
import random
random.seed(42)  # Same seed = same output

users = [
    {"id": i, "name": random.choice(["Alice", "Bob", "Charlie", "Diana"])}
    for i in range(1, 11)
]

# Seed 42 always generates same sequence
# Seed 43 generates different sequence
```

**Solution**: Use [Reproducibility pattern](../patterns/reproducibility.md) - seed all RNGs, document seed in validation report.

---

## Anti-Pattern 9: Generating More Data Than Constraint Allows

### ❌ Bad Practice

```sql
CREATE TABLE statuses (
    id INT PRIMARY KEY,
    name VARCHAR(10) UNIQUE  -- Only ~10 possible unique values
);

-- Request 1000 unique statuses (impossible!)
-- Generation fails after exhausting value space
```

**Problem**: Cannot satisfy UNIQUE constraint with limited value space

### ✅ Good Practice

**Option 1**: Remove UNIQUE constraint if not required
```sql
CREATE TABLE statuses (
    id INT PRIMARY KEY,
    name VARCHAR(10)  -- Allow duplicates
);
```

**Option 2**: Reduce requested volume
```sql
-- Request only 10 statuses (within value space)
INSERT INTO statuses (id, name) VALUES
  (1, 'pending'), (2, 'active'), (3, 'completed'), ...
```

**Option 3**: Increase value space
```sql
CREATE TABLE statuses (
    id INT PRIMARY KEY,
    name VARCHAR(50) UNIQUE  -- Larger space allows more unique values
);
```

**Solution**: Analyze constraints before generation to avoid impossible requests.

---

## Anti-Pattern 10: Violating Cascade Semantics

### ❌ Bad Practice

```sql
CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE
);

-- Generate order for user that would be deleted
INSERT INTO users (id, name) VALUES (1, 'Temporary User');
INSERT INTO orders (id, user_id) VALUES (1, 1);
-- If user 1 is deleted, order 1 is CASCADE deleted
-- This might not reflect intended test scenario
```

**Problem**: Test data doesn't reflect realistic state after cascade operations

### ✅ Good Practice

```sql
-- Generate orders for users that would survive deletion
INSERT INTO users (id, name) VALUES (1, 'Permanent User');
INSERT INTO orders (id, user_id) VALUES (1, 1);
-- User 1 won't be deleted in test scenarios, order 1 is safe
```

**Solution**: Use [Constraint Handling pattern](../patterns/constraint-handling.md) - cascade semantics section.

---

## Anti-Pattern 11: Missing Validation Reports

### ❌ Bad Practice

```sql
-- Just deliver raw SQL with no validation documentation
INSERT INTO users (id, email) VALUES (1, 'test@example.com');
INSERT INTO users (id, email) VALUES (2, 'test@example.com');  -- Duplicate!
-- User discovers constraint violation during loading
```

**Problem**: No proof of data quality, user wastes time debugging

### ✅ Good Practice

```sql
-- Validation Report: 10 users generated
-- Seed: 42 (reproducible)
-- Edge cases: 5% (5/10 records)
--
-- Constraint Satisfaction:
-- ✓ Primary keys: All unique (10/10)
-- ✓ Emails: All unique (10/10)
-- ✓ NOT NULL: No nulls in required fields (10/10)
--
-- Edge Case Coverage:
-- ✓ Target: 5% | Actual: 5.0% (5/10)
--
-- VALIDATION RESULT: ✓ PASS

INSERT INTO users (id, email) VALUES ...
```

**Solution**: Always include [Validation Report](../templates/validation-report.md) with generated data.

---

## Anti-Pattern 12: Ignoring Locale Requirements

### ❌ Bad Practice

```sql
-- Generate US addresses for Finnish users
INSERT INTO users (country, address, postal_code) VALUES
  ('Finland', '123 Main St', '94102');  -- US format in Finland!
```

**Problem**: Data doesn't reflect realistic locale patterns

### ✅ Good Practice

```sql
-- Use locale-appropriate patterns (or fallback to US English with warning)
INSERT INTO users (country, address, postal_code) VALUES
  ('US', '123 Main St, San Francisco, CA', '94102');  -- US format for US

-- OR if Finnish locale not supported:
-- WARNING: Finnish locale not supported, falling back to US English
INSERT INTO users (country, address, postal_code) VALUES
  ('Finland', '123 Main St, San Francisco, CA', '94102');  -- With warning
```

**Solution**: Use [Locale Patterns](../patterns/locale-patterns.md) with fallback strategy.

---

## Summary: Key Principles

1. **Always generate parents before children** (topological sort)
2. **Use realistic data patterns** (names, emails, phones from locale patterns)
3. **Track unique values** to prevent constraint violations
4. **Validate before delivery** (mandatory pre-delivery validation)
5. **Include edge cases** (5% default, configurable)
6. **Handle self-referencing FKs** with tiered generation
7. **Ensure multi-format consistency** (generate once, serialize to all formats)
8. **Use seeds for reproducibility** (same seed = same output)
9. **Respect constraint value space** (don't request more unique values than possible)
10. **Honor cascade semantics** (generate data that survives cascade operations)
11. **Always include validation reports** (proof of data quality)
12. **Respect locale requirements** (or fallback with warning)

**Violating these principles leads to**:
- ❌ Constraint violations during data loading
- ❌ Unrealistic test scenarios
- ❌ False sense of quality (missing edge case bugs)
- ❌ Wasted debugging time
- ❌ Eroded trust in test data

---

**Last Updated**: 2026-01-04
