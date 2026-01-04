# Troubleshooting Guide: Test Data Generation

**Purpose**: Common issues and solutions when generating test data

---

## Schema Parsing Errors

### Issue: Invalid DDL Syntax

**Symptoms**:
- Error: "Unable to parse CREATE TABLE statement"
- Error: "Unexpected token at line X"

**Common Causes**:
1. Non-standard SQL syntax (database-specific extensions)
2. Missing semicolons or unbalanced parentheses
3. Comments in unsupported format

**Solutions**:
```sql
❌ BAD (PostgreSQL-specific syntax):
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    data JSONB  -- PostgreSQL-specific type
);

✅ GOOD (Standard SQL):
CREATE TABLE users (
    id INT PRIMARY KEY,
    data TEXT  -- Use TEXT for cross-database compatibility
);
```

**Workaround**: Convert database-specific syntax to standard SQL DDL before providing to Claude.

---

### Issue: Unsupported Database Features

**Symptoms**:
- Error: "Unsupported constraint type: EXCLUDE"
- Warning: "Database feature 'ARRAY' not supported, using TEXT"

**Unsupported Features**:
- PostgreSQL: ARRAY types, EXCLUDE constraints, custom ENUM types
- MySQL: ENUM (limited support), SET types
- SQL Server: computed columns, indexed views

**Solutions**:
1. **Arrays**: Convert to separate junction table with one-to-many relationship
   ```sql
   ❌ CREATE TABLE posts (tags TEXT[]);
   ✅ CREATE TABLE posts (id INT PRIMARY KEY);
      CREATE TABLE post_tags (post_id INT REFERENCES posts(id), tag TEXT);
   ```

2. **ENUM**: Convert to VARCHAR with check constraint
   ```sql
   ❌ CREATE TYPE status AS ENUM ('pending', 'completed');
   ✅ CREATE TABLE orders (
        status VARCHAR(20) CHECK (status IN ('pending', 'completed'))
      );
   ```

---

## Constraint Conflicts

### Issue: Impossible Check Constraints

**Symptoms**:
- Error: "Cannot satisfy check constraint: age >= 18 AND age < 18"
- Error: "Contradictory constraints detected"

**Example**:
```sql
CREATE TABLE users (
    age INT CHECK (age >= 18),
    status VARCHAR(10) CHECK (status = 'minor')  -- Contradicts age >= 18
);
```

**Solution**: Review schema for logical contradictions, remove or correct conflicting constraints.

---

### Issue: Circular Foreign Keys Without NULL Path

**Symptoms**:
- Error: "Circular dependency detected: Department ↔ Employee with no nullable FK"
- Error: "Cannot generate data: chicken-and-egg problem"

**Example**:
```sql
CREATE TABLE departments (
    id INT PRIMARY KEY,
    manager_id INT NOT NULL REFERENCES employees(id)  -- NOT NULL blocks tiered generation
);
CREATE TABLE employees (
    id INT PRIMARY KEY,
    department_id INT NOT NULL REFERENCES departments(id)
);
```

**Solution**: Make at least ONE FK in the cycle nullable:
```sql
✅ GOOD:
CREATE TABLE departments (
    id INT PRIMARY KEY,
    manager_id INT REFERENCES employees(id)  -- Nullable allows NULL for initial departments
);
```

**Pattern**: [Circular Dependencies example](../examples/advanced/circular-dependencies.md)

---

### Issue: Check Constraint Conflicts with Edge Cases

**Symptoms**:
- Warning: "Skipped edge case: age = 0 violates check constraint age >= 18"
- Edge case coverage lower than requested

**Example**:
```sql
CREATE TABLE users (
    age INT CHECK (age >= 18)
);
-- Edge case age = 0 cannot be generated due to constraint
```

**Expected Behavior**: This is NOT an error - constraint compliance takes precedence.
- Edge case is skipped
- Skipped case documented in validation report
- Edge case percentage may be slightly lower than requested

**Constitutional Principle**: **Constraint always wins** (Principle I overrides Principle IV)

---

## Generation Failures

### Issue: Unable to Satisfy Unique Constraint After N Attempts

**Symptoms**:
- Error: "Failed to generate unique value for column 'email' after 1000 attempts"
- Occurs when generating large datasets with unique constraints

**Common Causes**:
1. Unique constraint on field with limited value space
2. Requesting more records than possible unique values

**Example**:
```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    status VARCHAR(10) UNIQUE  -- Only ~10 possible unique values
);
-- Requesting 1000 records fails: cannot generate 1000 unique statuses
```

**Solutions**:
1. **Remove UNIQUE** if not truly required:
   ```sql
   ✅ status VARCHAR(10)  -- Allow duplicates
   ```

2. **Reduce requested volume**:
   - Request fewer records (e.g., 10 users instead of 1000)

3. **Increase value space**:
   ```sql
   ✅ status VARCHAR(50)  -- Larger value space allows more unique values
   ```

---

### Issue: Foreign Key References Non-Existent Parent

**Symptoms**:
- Error: "FK violation: orders.user_id references non-existent user"
- Occurs during validation (before delivery)

**Common Causes**:
1. Parent table has zero records
2. Generation order incorrect (child before parent)

**Solution**: This should NOT happen if using [Dependency Graphing workflow](../workflows/02-dependency-graphing.md).

**Debugging Steps**:
1. Verify topological sort was performed
2. Check that parent table has records: `SELECT COUNT(*) FROM users;`
3. Verify FK pool contains valid parent IDs

**Prevention**: Always use [Dependency Graphing](../workflows/02-dependency-graphing.md) to determine generation order.

---

## Validation Failures

### Issue: Post-Generation Constraint Violations

**Symptoms**:
- Validation report shows: "✗ Primary keys: 995/1000 unique (5 duplicates)"
- Data NOT delivered due to validation failure

**Common Causes**:
1. Bug in PK generation logic (UUID collision or sequential ID reset)
2. Race condition in parallel generation (if implemented)

**Solutions**:
1. **Use deterministic PK generation**:
   - Sequential IDs: Start at 1, increment by 1 for each record
   - UUIDs: Use proper UUID v4 generation (not random strings)

2. **Verify PK uniqueness** during generation (not just at validation):
   ```python
   used_ids = set()
   for record in records:
       assert record.id not in used_ids, f"Duplicate PK: {record.id}"
       used_ids.add(record.id)
   ```

---

### Issue: Referential Integrity Breaks

**Symptoms**:
- Validation report shows: "✗ Orphan check: 50/1000 records are orphans"
- FK values don't resolve to existing parent records

**Common Causes**:
1. Parent records deleted after child generation (if using mutable data structures)
2. FK value selected from wrong pool (e.g., product IDs used for user IDs)

**Solutions**:
1. **Immutable parent records**: Don't modify parent records after children reference them
2. **Correct FK pools**: Maintain separate pools per parent table
   ```python
   user_ids = [1, 2, 3, 4, 5]  # Pool for users table
   product_ids = [101, 102, 103]  # Pool for products table
   order.user_id = random.choice(user_ids)  # Correct pool
   ```

3. **Validate FK pools before generation**:
   ```python
   assert len(user_ids) > 0, "Cannot generate orders: no users exist"
   ```

---

## Performance Issues

### Issue: Generation Takes Too Long (>5 seconds for 1000 records)

**Symptoms**:
- Generation exceeds SC-002 performance target (1000 records in <5 seconds)

**Common Causes**:
1. Inefficient unique value generation (checking entire dataset for duplicates)
2. Complex check constraints requiring expensive validation
3. Large number of foreign key relationships

**Solutions**:
1. **Use set for uniqueness tracking** (O(1) lookup):
   ```python
   ✅ used_emails = set()  # Fast
   if email not in used_emails:
       used_emails.add(email)

   ❌ used_emails = []  # Slow (O(n) lookup)
   if email not in used_emails:
       used_emails.append(email)
   ```

2. **Pre-compute check constraint ranges**:
   ```sql
   CHECK (age >= 18 AND age <= 100)
   ```
   ```python
   ✅ age = random.randint(18, 100)  # Pre-computed range
   ❌ age = random.randint(0, 120)
       while age < 18 or age > 100:  # Rejection sampling (slow)
           age = random.randint(0, 120)
   ```

---

### Issue: Memory Overflow with Large Datasets

**Symptoms**:
- Error: "MemoryError: cannot allocate array"
- Occurs when generating >100k records

**Expected Behavior**: Claude should automatically use streaming/batching for large datasets.

**Solution**: Implement [streaming/batching](../workflows/03-data-generation.md):
1. Generate data in chunks (e.g., 10k records per batch)
2. Write each chunk to file progressively
3. Never load entire dataset in memory

**FR-018**: Automatic streaming for >100k records with progress reporting

---

## Data Quality Issues

### Issue: Unrealistic Data Patterns

**Symptoms**:
- Names like "User1", "User2" instead of "Sarah Chen", "James Wilson"
- Emails like "test1@test.com" instead of realistic domains

**Solution**: Use [Locale Patterns](../patterns/locale-patterns.md) for realistic generation:
```python
❌ name = f"User{id}"  # Unrealistic
✅ name = random.choice(["Sarah Chen", "James Wilson", "Maria Garcia"])  # Realistic
```

---

### Issue: Distribution Doesn't Match Specification

**Symptoms**:
- Zipf distribution requested, but validation shows uniform distribution
- 20% of products should account for 80% of orders, but analysis shows 50/50

**Solution**: Implement [Distribution Strategies](../patterns/distribution-strategies.md):
```python
❌ product_id = random.choice(all_product_ids)  # Uniform

✅ # Zipf distribution (power-law)
from scipy.stats import zipf
product_id = zipf.rvs(a=1.5, size=1)[0]
```

---

## Getting Help

If issue persists after trying solutions above:

1. **Check examples**: [Basic](../examples/basic/), [Intermediate](../examples/intermediate/), [Advanced](../examples/advanced/)
2. **Review workflows**: [Schema Analysis](../workflows/01-schema-analysis.md) → [Dependency Graphing](../workflows/02-dependency-graphing.md) → [Data Generation](../workflows/03-data-generation.md) → [Validation](../workflows/04-validation.md)
3. **Review patterns**: [Constraint Handling](../patterns/constraint-handling.md), [Edge Case Catalog](../patterns/edge-case-catalog.md)
4. **Provide context**: Schema DDL, error message, validation report, generation parameters (volume, seed, edge case %)

---

**Last Updated**: 2026-01-04
