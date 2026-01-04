# Pattern: Edge Case Catalog

**Purpose**: Comprehensive catalog of edge cases for each SQL data type to ensure thorough test coverage

**Constitutional Principle**: Principle IV - Edge Case Coverage (Boundary Condition Testing)

---

## Overview

Edge cases test boundary conditions and special values that often reveal bugs in production systems. This catalog documents specific edge cases for each SQL data type, organized by category.

**Default Coverage**: 5% of generated records should include edge cases

**Constraint-First Principle**: If an edge case violates a database constraint, **SKIP** the edge case and document it in the validation report.

---

## Edge Case Categories

### Quick Reference

| Data Type | Edge Cases | Examples |
|-----------|------------|----------|
| **VARCHAR/CHAR** | Min/max length, special chars, unicode | `""`, 255-char string, `test+tag@example.com`, `名字` |
| **TEXT** | Empty, very long, special chars | `""`, 10,000 chars, multiline with newlines |
| **INT** | Zero, negative, min/max | `0`, `-1`, `-2147483648`, `2147483647` |
| **BIGINT** | Zero, negative, min/max | `0`, `-1`, `-9223372036854775808`, `9223372036854775807` |
| **DECIMAL** | Zero, max precision, small values | `0.00`, `99999999.99`, `0.01` |
| **DATE** | Epoch, Y2K38, far future/past | `1970-01-01`, `2038-01-19`, `2099-12-31`, `1900-01-01` |
| **TIMESTAMP** | Epoch, Y2K38, far future | `1970-01-01 00:00:00`, `2038-01-19 03:14:07` |
| **BOOLEAN** | Both values | `true`, `false` (ensure both represented) |
| **NULL** | Nullable columns | `NULL` (for optional fields) |

---

## VARCHAR / CHAR Edge Cases

### Min Length (Empty String or Single Character)

```sql
-- Empty string (if allowed by constraints)
name VARCHAR(255) → ''

-- Single character
name VARCHAR(255) → 'A'
```

**Use Case**: Tests minimum boundary, empty string handling

**Constraint Check**: If column is NOT NULL and CHECK length > 0, skip empty string

---

### Max Length (Boundary Testing)

```sql
-- Exactly at max length
name VARCHAR(255) → 'A' * 255  -- 255 characters

email VARCHAR(100) → 'a' * 89 + '@example.com'  -- Exactly 100 chars
```

**Use Case**: Tests boundary limits, buffer overflow protection

**Example**:
```python
def generate_max_length_string(max_length):
    # Generate string of exactly max_length
    return 'A' * max_length
```

---

### Special Characters (SQL Injection, Email Plus Addressing)

```sql
-- SQL special characters
name VARCHAR(255) → 'O''Brien'           -- Apostrophe
name VARCHAR(255) → 'Test "Quote" Name'  -- Double quotes
name VARCHAR(255) → 'Drop; Table;'       -- Semicolons

-- Email plus addressing
email VARCHAR(255) → 'test+tag@example.com'
email VARCHAR(255) → 'user+filter@domain.com'

-- Special symbols
name VARCHAR(255) → 'User@#$%^&*()'
```

**Use Case**: Tests SQL injection protection, email validation, special character handling

---

### Unicode Characters (Internationalization)

```sql
-- Chinese characters
name VARCHAR(255) → '李明'

-- Spanish accents
name VARCHAR(255) → 'José García'

-- French accents
name VARCHAR(255) → 'Françoise Dubois'

-- Emoji (if supported)
name VARCHAR(255) → 'User 😀'

-- Mixed
name VARCHAR(255) → 'Ñoño María José'
```

**Use Case**: Tests UTF-8 encoding, international character support

---

### Newlines and Whitespace

```sql
-- Leading/trailing whitespace
name VARCHAR(255) → '  John  '

-- Newlines (for TEXT fields)
description TEXT → 'Line 1\nLine 2\nLine 3'

-- Tabs
description TEXT → 'Column1\tColumn2\tColumn3'
```

**Use Case**: Tests whitespace trimming, multiline handling

---

## TEXT Edge Cases

### Empty Text

```sql
description TEXT → ''
```

**Use Case**: Tests empty large text handling

---

### Very Long Text (Stress Testing)

```sql
-- 10,000 characters
description TEXT → 'A' * 10000

-- 100,000 characters (if no length limit)
description TEXT → 'Lorem ipsum...' * 1000
```

**Use Case**: Tests large text storage, memory handling

---

### Multiline Text

```sql
description TEXT → '''
This is line 1
This is line 2
This is line 3
'''
```

**Use Case**: Tests newline handling in TEXT fields

---

## INT Edge Cases

### Zero

```sql
quantity INT → 0
```

**Use Case**: Tests zero handling, off-by-one errors

**Constraint Check**: If CHECK quantity > 0, skip this edge case

---

### Negative Values

```sql
balance INT → -1
balance INT → -100
balance INT → -2147483648  -- INT min (32-bit signed)
```

**Use Case**: Tests negative number handling, sign bugs

**Constraint Check**: If CHECK >= 0, skip negative values

---

### Maximum Value (Boundary)

```sql
-- 32-bit signed INT max
count INT → 2147483647

-- Near max (off-by-one)
count INT → 2147483646
```

**Use Case**: Tests integer overflow, boundary limits

---

### Minimum Value (Boundary)

```sql
-- 32-bit signed INT min
temperature INT → -2147483648
```

**Use Case**: Tests minimum boundary, underflow

---

## BIGINT Edge Cases

### Zero and Negative

```sql
user_count BIGINT → 0
balance BIGINT → -1
```

---

### Maximum Value (64-bit)

```sql
-- 64-bit signed BIGINT max
large_count BIGINT → 9223372036854775807

-- Near max
large_count BIGINT → 9223372036854775806
```

**Use Case**: Tests very large integer handling

---

### Minimum Value (64-bit)

```sql
-- 64-bit signed BIGINT min
large_negative BIGINT → -9223372036854775808
```

---

## DECIMAL / NUMERIC Edge Cases

### Zero

```sql
price DECIMAL(10, 2) → 0.00
amount DECIMAL(10, 2) → 0.0
```

**Use Case**: Tests zero decimal handling

**Constraint Check**: If CHECK price >= 0.01, skip 0.00

---

### Maximum Precision

```sql
-- DECIMAL(10, 2): max 10 total digits, 2 decimal places
price DECIMAL(10, 2) → 99999999.99

-- DECIMAL(15, 4): max 15 total digits, 4 decimal places
amount DECIMAL(15, 4) → 99999999999.9999
```

**Use Case**: Tests precision limits, rounding

---

### Minimum Non-Zero Value

```sql
-- Smallest positive value
price DECIMAL(10, 2) → 0.01

-- Smallest negative value
balance DECIMAL(10, 2) → -0.01
```

**Use Case**: Tests precision rounding, small value handling

---

### Negative Decimals

```sql
balance DECIMAL(10, 2) → -100.50
balance DECIMAL(10, 2) → -99999999.99  -- Max negative
```

**Constraint Check**: If CHECK >= 0, skip negative values

---

## DATE Edge Cases

### Epoch (Unix Timestamp Start)

```sql
birth_date DATE → '1970-01-01'
```

**Use Case**: Tests epoch handling, historical date support

---

### Y2K38 Problem (32-bit Timestamp Overflow)

```sql
event_date DATE → '2038-01-19'  -- Last day before overflow
event_date DATE → '2038-01-20'  -- First day after overflow (if supported)
```

**Use Case**: Tests Y2K38 bug, timestamp overflow

---

### Far Future

```sql
expiration_date DATE → '2099-12-31'
expiration_date DATE → '2100-01-01'  -- Turn of century
```

**Use Case**: Tests future date handling, century calculations

---

### Far Past

```sql
historical_date DATE → '1900-01-01'
historical_date DATE → '1800-01-01'  -- 19th century
```

**Use Case**: Tests historical date handling

---

### Leap Year Dates

```sql
-- Leap day
birth_date DATE → '2020-02-29'
birth_date DATE → '2024-02-29'
```

**Use Case**: Tests leap year calculations

---

### End of Month Boundaries

```sql
-- Last day of month (different lengths)
date DATE → '2024-01-31'  -- 31 days
date DATE → '2024-02-29'  -- Leap year (29 days)
date DATE → '2024-02-28'  -- Non-leap year (28 days)
date DATE → '2024-04-30'  -- 30 days
```

**Use Case**: Tests end-of-month edge cases

---

## TIMESTAMP Edge Cases

### Epoch Timestamp

```sql
created_at TIMESTAMP → '1970-01-01 00:00:00'
```

---

### Y2K38 Problem

```sql
event_timestamp TIMESTAMP → '2038-01-19 03:14:07'  -- Last second before overflow (32-bit)
```

**Use Case**: Tests 32-bit timestamp overflow (2^31 - 1 seconds after epoch)

---

### Midnight (Boundary)

```sql
event_timestamp TIMESTAMP → '2024-01-01 00:00:00'
```

**Use Case**: Tests midnight boundary, day transitions

---

### End of Day (23:59:59)

```sql
event_timestamp TIMESTAMP → '2024-12-31 23:59:59'
```

**Use Case**: Tests end-of-day boundary

---

### Timezone Edge Cases

```sql
-- UTC midnight
timestamp TIMESTAMP → '2024-01-01 00:00:00+00'

-- Daylight saving time transition
timestamp TIMESTAMP → '2024-03-10 02:00:00'  -- DST start (US)
timestamp TIMESTAMP → '2024-11-03 02:00:00'  -- DST end (US)
```

**Use Case**: Tests timezone handling, DST transitions

---

## BOOLEAN Edge Cases

### Both Values (Coverage)

```sql
is_active BOOLEAN → true
is_active BOOLEAN → false
```

**Use Case**: Ensure both true and false are represented in dataset

**Coverage**: Aim for ~50/50 split, or match expected distribution

---

### NULL for Nullable Boolean

```sql
is_verified BOOLEAN → NULL  -- If column is nullable
```

**Use Case**: Tests three-state logic (true/false/NULL)

---

## NULL Edge Cases (Nullable Columns)

### NULL in Optional Fields

```sql
-- Nullable columns
middle_name VARCHAR(255) → NULL
phone VARCHAR(20) → NULL
notes TEXT → NULL
```

**Use Case**: Tests NULL handling, optional field logic

**Constraint Check**: Only for nullable columns (NOT NULL columns cannot be NULL)

---

### NULL in Nullable Foreign Keys

```sql
-- Self-referencing FK (root nodes)
manager_id INT → NULL  -- Employee with no manager

-- Optional relationships
shipping_address_id INT → NULL  -- Order without shipping address
```

**Use Case**: Tests NULL FK handling, optional relationships

---

### NULL in Unique Columns

```sql
-- Multiple NULLs allowed in UNIQUE columns
email VARCHAR(255) UNIQUE → NULL  -- Multiple NULLs allowed
email VARCHAR(255) UNIQUE → NULL  -- SQL: NULL != NULL
```

**Use Case**: Tests UNIQUE + NULL behavior (multiple NULLs allowed)

---

## Edge Case Injection Strategy

### Percentage-Based Injection

```python
def should_inject_edge_case(edge_case_percentage=0.05, current_index=None, total_records=None):
    """
    Determine if current record should be an edge case.

    Args:
        edge_case_percentage: Target percentage (default 5%)
        current_index: Current record index (0-based)
        total_records: Total number of records to generate

    Returns:
        True if this record should be an edge case
    """
    if edge_case_percentage <= 0:
        return False

    # Random selection with target percentage
    import random
    return random.random() < edge_case_percentage
```

**Example**:
```python
# Generate 1000 records with 5% edge cases
edge_case_count = int(1000 * 0.05)  # 50 edge cases

for i in range(1000):
    if should_inject_edge_case(edge_case_percentage=0.05):
        # Generate edge case record
        record = generate_edge_case_record()
    else:
        # Generate normal record
        record = generate_normal_record()
```

---

### Edge Case Selection

```python
def select_edge_case_for_column(column):
    """
    Select appropriate edge case for column data type.

    Returns random edge case from catalog for this type.
    """
    edge_cases = {
        'VARCHAR': ['', max_length_string, 'test+tag@example.com', '名字', 'O\'Brien'],
        'INT': [0, -1, 2147483647, -2147483648],
        'DECIMAL': [0.00, 99999999.99, 0.01, -0.01],
        'DATE': ['1970-01-01', '2038-01-19', '2099-12-31', '2020-02-29'],
        'BOOLEAN': [True, False],
        'NULL': [None]  # For nullable columns
    }

    data_type = column.data_type
    if data_type in edge_cases:
        return random.choice(edge_cases[data_type])

    return None  # No edge case available for this type
```

---

### Constraint-First Principle

```python
def generate_edge_case_value(column, edge_case_value, constraints):
    """
    Generate edge case value, respecting constraints.

    If edge case violates constraint, return None and log skip.
    """
    # Check if edge case violates constraints
    if violates_constraint(edge_case_value, constraints):
        # Skip edge case, document in validation report
        skipped_edge_cases.append({
            'column': column.name,
            'edge_case': edge_case_value,
            'reason': f'Violates constraint: {constraints}',
            'constraint': str(constraints)
        })
        return None  # Will use normal value instead

    return edge_case_value
```

**Example**:
```python
# Check: age >= 18
# Edge case: age = 0

if 0 < 18:  # Violates constraint
    skipped_edge_cases.append({
        'column': 'age',
        'edge_case': 0,
        'reason': 'Violates CHECK constraint: age >= 18',
        'constraint': 'age >= 18'
    })
    # Generate valid value instead
    age = random.randint(18, 100)
```

---

## Edge Case Validation

### Coverage Reporting

```markdown
## Edge Case Coverage

### Edge Cases Integrated

| Data Type | Edge Case | Count | Percentage | Example Record |
|-----------|-----------|-------|------------|----------------|
| VARCHAR | Max length (255 chars) | 3 | 0.3% | Record #45 |
| VARCHAR | Special chars (apostrophe) | 2 | 0.2% | Record #89 |
| VARCHAR | Unicode (Chinese) | 1 | 0.1% | Record #123 |
| INT | Zero | 5 | 0.5% | Record #12 |
| INT | Negative | 4 | 0.4% | Record #67 |
| INT | Max value | 2 | 0.2% | Record #234 |
| DATE | Epoch (1970-01-01) | 3 | 0.3% | Record #34 |
| DATE | Y2K38 (2038-01-19) | 2 | 0.2% | Record #156 |
| DECIMAL | Zero (0.00) | 4 | 0.4% | Record #78 |
| BOOLEAN | true | 520 | 52% | N/A (distribution) |
| BOOLEAN | false | 480 | 48% | N/A (distribution) |
| NULL | Nullable fields | 15 | 1.5% | Multiple |

**Total Edge Cases**: 50 / 1000 (5.0%)
**Target**: 5%
**Status**: ✅ Met target
```

---

### Edge Cases Skipped (Constraint Conflicts)

```markdown
### Edge Cases Skipped

| Edge Case | Column | Reason | Constraint |
|-----------|--------|--------|------------|
| age = 0 | users.age | Violates CHECK constraint | age >= 18 |
| price = -1.00 | products.price | Violates CHECK constraint | price >= 0 |
| quantity = 0 | order_items.quantity | Violates CHECK constraint | quantity > 0 |
| email = '' | users.email | Violates NOT NULL + length > 0 | NOT NULL |

**Total Skipped**: 4 edge cases

**Note**: Constraint compliance (Principle I) takes precedence over edge case coverage (Principle IV).
```

---

## Edge Case Examples by Use Case

### User Authentication Testing

```sql
-- Edge case: Email with plus addressing
INSERT INTO users (email, name) VALUES
  ('admin+test@company.com', 'Test Admin');

-- Edge case: Very long email (max length)
INSERT INTO users (email, name) VALUES
  ('a' * 89 + '@example.com', 'Long Email User');

-- Edge case: Unicode name
INSERT INTO users (email, name) VALUES
  ('user@example.com', '李明');
```

---

### E-Commerce Order Testing

```sql
-- Edge case: Order total = $0.00
INSERT INTO orders (total, status) VALUES
  (0.00, 'completed');

-- Edge case: Order total at max precision
INSERT INTO orders (total, status) VALUES
  (99999999.99, 'pending');

-- Edge case: Order quantity = 1 (minimum valid)
INSERT INTO order_items (quantity, price) VALUES
  (1, 12.49);
```

---

### Date Range Testing

```sql
-- Edge case: Event on epoch
INSERT INTO events (event_date, name) VALUES
  ('1970-01-01', 'Epoch Event');

-- Edge case: Event on Y2K38
INSERT INTO events (event_date, name) VALUES
  ('2038-01-19', 'Y2K38 Test');

-- Edge case: Leap day
INSERT INTO events (event_date, name) VALUES
  ('2020-02-29', 'Leap Day Event');
```

---

## Anti-Patterns

### ❌ DON'T: Ignore Constraints for Edge Cases

```python
# BAD: Force edge case that violates constraint
age = 0  # Violates CHECK age >= 18 - will cause INSERT failure

# GOOD: Skip edge case if it violates constraint
if age_edge_case < 18:
    skipped_edge_cases.append("age = 0 violates CHECK age >= 18")
    age = random.randint(18, 100)  # Use valid value
```

---

### ❌ DON'T: Apply Same Edge Case to All Records

```python
# BAD: All edge case records have same value
for i in range(50):  # 5% of 1000
    email = 'test+tag@example.com'  # Same edge case repeated

# GOOD: Vary edge cases
edge_case_types = ['max_length', 'special_chars', 'unicode', 'empty']
for i in range(50):
    edge_type = random.choice(edge_case_types)
    email = generate_edge_case_email(edge_type)
```

---

### ❌ DON'T: Exceed Target Percentage

```python
# BAD: 50% edge cases (too many, obscures normal patterns)
edge_case_percentage = 0.50

# GOOD: 5% edge cases (default, balanced)
edge_case_percentage = 0.05
```

---

### ❌ DON'T: Forget to Document Skipped Edge Cases

```python
# BAD: Skip silently
if edge_case_violates_constraint:
    use_normal_value()  # No documentation

# GOOD: Document skipped edge cases
if edge_case_violates_constraint:
    skipped_edge_cases.append({
        'edge_case': value,
        'reason': 'Violates constraint X',
        'constraint': constraint_rule
    })
    use_normal_value()
```

---

## Summary

| Category | Edge Cases | Priority |
|----------|------------|----------|
| **VARCHAR/CHAR** | Empty, max length, special chars, unicode | High |
| **INT/BIGINT** | Zero, negative, min/max | High |
| **DECIMAL** | Zero, max precision, small values | Medium |
| **DATE/TIMESTAMP** | Epoch, Y2K38, far future/past, leap days | High |
| **BOOLEAN** | Both true and false | Medium |
| **NULL** | Nullable columns | High |

**Default Target**: 5% edge case coverage

**Constraint-First**: Skip edge cases that violate constraints

---

## Examples

See edge cases in action:
- **[Users Table](../examples/basic/users-table.md)**: Basic edge cases (age=18, max length name, special chars email)
- **[Circular Dependencies](../examples/advanced/circular-dependencies.md)**: NULL foreign keys
- **[Multi-Tenant System](../examples/advanced/multi-tenant-system.md)**: Tenant with 0 users, max users

---

**Related**:
- **Workflows**: [Data Generation](../workflows/03-data-generation.md) - Step 4 (Edge Case Injection)
- **Patterns**: [Constraint Handling](constraint-handling.md)
- **Templates**: [Validation Report](../templates/validation-report.md)
- **Guidelines**: [Constitution Alignment](../guidelines/constitution-alignment.md) - Principle IV

---

**Last Updated**: 2026-01-04
