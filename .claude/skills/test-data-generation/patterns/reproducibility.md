# Pattern: Reproducibility

**Purpose**: How to ensure deterministic data generation using seeds

**Constitutional Principle**: Principle III - Realistic Data Patterns (Production-Like Quality)

---

## Overview

Reproducibility ensures that the **same seed + same schema = identical output**. This is critical for:
- **Testing**: Reproduce exact dataset for debugging
- **Collaboration**: Team members generate identical test data
- **Version control**: Track expected output changes over time

---

## Seed Initialization

### Seed Selection

```python
import random

def initialize_seed(seed=None):
    if seed is None:
        seed = generate_default_seed()  # e.g., timestamp-based

    random.seed(seed)
    return seed
```

**Explicit Seed** (user-provided):
```python
seed = 42
random.seed(seed)
# All subsequent random.choice(), random.randint() calls are deterministic
```

**Implicit Seed** (auto-generated):
```python
import time
seed = int(time.time())  # e.g., 1704380000
random.seed(seed)
```

---

## Deterministic RNG Usage

### Core Principle

**ALL random values MUST use seeded RNG**

```python
# ✅ CORRECT: Uses seeded random
name = random.choice(['Alice', 'Bob', 'Charlie'])
age = random.randint(18, 100)

# ❌ WRONG: Non-deterministic
import uuid
user_id = uuid.uuid4()  # Different every time, even with same seed
```

---

### Deterministic UUID Generation

```python
import uuid

def generate_deterministic_uuid(seed_value):
    # Use seed to create deterministic UUID
    namespace = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')  # Fixed namespace
    return str(uuid.uuid5(namespace, str(seed_value)))

# Example:
user_id = generate_deterministic_uuid(1)  # Always: "886313e1-3b8a-5372-9b90-0c9aee199e5d"
```

**Guarantee**: Same seed_value → same UUID

---

### Deterministic Name Generation

```python
FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', ...]
LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', ...]

def generate_realistic_name(rng=random):
    first = rng.choice(FIRST_NAMES)
    last = rng.choice(LAST_NAMES)
    return f"{first} {last}"

# With seed=42:
name1 = generate_realistic_name()  # "Charlie Johnson"
name2 = generate_realistic_name()  # "Alice Brown"

# With seed=42 again:
random.seed(42)
name1 = generate_realistic_name()  # "Charlie Johnson" (identical)
name2 = generate_realistic_name()  # "Alice Brown" (identical)
```

---

### Deterministic Date Generation

```python
from datetime import datetime, timedelta

def generate_random_date(start_date, end_date, rng=random):
    delta = (end_date - start_date).days
    random_days = rng.randint(0, delta)
    return start_date + timedelta(days=random_days)

# With seed=42:
random.seed(42)
date1 = generate_random_date(datetime(2020, 1, 1), datetime(2024, 12, 31))
# Always: 2022-07-15

# With seed=42 again:
random.seed(42)
date2 = generate_random_date(datetime(2020, 1, 1), datetime(2024, 12, 31))
# Always: 2022-07-15 (identical)
```

---

### Deterministic Distribution Sampling

```python
import numpy as np

def generate_zipf_samples(size, alpha=1.5, seed=42):
    np.random.seed(seed)
    return np.random.zipf(alpha, size)

# With seed=42:
samples1 = generate_zipf_samples(100, seed=42)
# Always: [1, 3, 1, 1, 2, 7, 1, ...]

# With seed=42 again:
samples2 = generate_zipf_samples(100, seed=42)
# Always: [1, 3, 1, 1, 2, 7, 1, ...] (identical)
```

**See**: [Distribution Strategies pattern](distribution-strategies.md) for Zipf, Normal, Uniform distributions

---

## Seed Recording

### Validation Report

**CRITICAL**: Always record seed in validation report

```markdown
# Validation Report

## Generation Metadata

- **Seed**: 42
- **Timestamp**: 2024-01-04 15:30:00 UTC
- **Record Count**: 1000
- **Schema Version**: ecommerce-v1

## Reproducibility

To regenerate this exact dataset:
\`\`\`bash
generate_data --schema ecommerce.sql --seed 42 --count 1000
\`\`\`
```

**See**: [Validation Report Template](../templates/validation-report.md)

---

## Reproducibility Guarantee

### Same Seed + Same Schema = Identical Output

**Test**:
```python
# Run 1: seed=42, schema=users.sql, count=100
output1 = generate_data(schema='users.sql', seed=42, count=100)

# Run 2: seed=42, schema=users.sql, count=100
output2 = generate_data(schema='users.sql', seed=42, count=100)

# Assertion:
assert output1 == output2  # Byte-for-byte identical
```

**Validation**:
- Same PKs: `[1, 2, 3, ..., 100]`
- Same names: `["Alice Smith", "Bob Johnson", ...]`
- Same emails: `["alice.smith@example.com", "bob.johnson@example.com", ...]`
- Same ages: `[34, 28, 45, ...]`

---

## Edge Cases and Limitations

### Non-Deterministic Operations to Avoid

```python
# ❌ AVOID: System time
import time
timestamp = time.time()  # Different every run

# ✅ USE: Seeded timestamp generation
def generate_timestamp_in_range(start, end, rng=random):
    delta = (end - start).total_seconds()
    random_seconds = rng.uniform(0, delta)
    return start + timedelta(seconds=random_seconds)
```

```python
# ❌ AVOID: OS randomness
import os
random_bytes = os.urandom(16)  # Non-deterministic

# ✅ USE: Seeded byte generation
def generate_random_bytes(length, rng=random):
    return bytes([rng.randint(0, 255) for _ in range(length)])
```

---

### Database Auto-Increment

**Challenge**: Database SERIAL/AUTO_INCREMENT may not be deterministic

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,  -- Database controls ID assignment
    name VARCHAR(255)
);
```

**Solution**: Generate explicit IDs in test data

```sql
-- Don't rely on AUTO_INCREMENT:
INSERT INTO users (name) VALUES ('Alice');  -- id=? (non-deterministic)

-- Specify explicit IDs:
INSERT INTO users (id, name) VALUES (1, 'Alice');  -- id=1 (deterministic)
```

---

## Seed Management Strategies

### Strategy 1: Fixed Seed for Tests

```python
# Use same seed for all test runs
FIXED_SEED = 42

def generate_test_data():
    random.seed(FIXED_SEED)
    return generate_data()
```

**Advantages**:
- ✅ Reproducible across runs
- ✅ Easy to debug (always same data)
- ✅ Version control friendly (no diff noise)

**Use Case**: Unit tests, CI/CD pipelines

---

### Strategy 2: Random Seed with Recording

```python
import time

def generate_production_like_data():
    seed = int(time.time())
    random.seed(seed)

    data = generate_data()

    # Record seed for reproducibility
    write_validation_report(data, seed=seed)

    return data
```

**Advantages**:
- ✅ Different data each run (more diverse testing)
- ✅ Still reproducible (seed recorded in report)

**Use Case**: Exploratory testing, finding edge case bugs

---

### Strategy 3: Seed from User Input

```python
def generate_data_with_seed(seed=None):
    if seed is None:
        seed = int(time.time())  # Auto-generate if not provided

    random.seed(seed)
    print(f"Using seed: {seed}")

    return generate_data()

# User specifies seed:
generate_data_with_seed(seed=42)

# Auto-generated seed:
generate_data_with_seed()  # Prints: "Using seed: 1704380000"
```

---

## Validation Checks

### Pre-Delivery Reproducibility Test

```python
def validate_reproducibility(schema, seed, count):
    # Generate twice with same seed
    random.seed(seed)
    output1 = generate_data(schema, count)

    random.seed(seed)
    output2 = generate_data(schema, count)

    # Verify identical output
    assert output1 == output2, "REPRODUCIBILITY FAILURE: Different outputs with same seed"

    print(f"✅ Reproducibility validated: seed={seed}, count={count}")
```

**Include in Validation Report**:
```markdown
## Reproducibility Validation

- ✅ Reproducibility test passed
- Seed: 42
- Verification: Generated dataset twice with same seed - outputs identical
```

---

## Example: Full Reproducible Generation

```python
import random
from datetime import datetime

def generate_reproducible_users(count=100, seed=42):
    random.seed(seed)

    users = []
    for i in range(1, count + 1):
        user = {
            'id': i,
            'name': generate_realistic_name(),
            'email': f"{generate_email_prefix()}@example.com",
            'age': random.randint(18, 100),
            'created_at': generate_random_date(
                datetime(2020, 1, 1),
                datetime(2024, 12, 31)
            )
        }
        users.append(user)

    return users, seed

# Run 1:
users1, seed1 = generate_reproducible_users(count=100, seed=42)

# Run 2:
users2, seed2 = generate_reproducible_users(count=100, seed=42)

# Validation:
assert users1 == users2  # Identical output
assert seed1 == seed2 == 42
```

**Output (always identical with seed=42)**:
```sql
INSERT INTO users (id, name, email, age, created_at) VALUES
  (1, 'Charlie Johnson', 'charlie.johnson@example.com', 34, '2022-07-15'),
  (2, 'Alice Brown', 'alice.brown@example.com', 28, '2021-03-22'),
  (3, 'Diana Smith', 'diana.smith@example.com', 45, '2023-11-08'),
  ...
```

---

## Summary

| Aspect | Requirement | Validation |
|--------|-------------|------------|
| **Seed Initialization** | Record seed for all generations | Seed present in validation report |
| **Deterministic RNG** | All random values use seeded RNG | Reproducibility test passes |
| **UUID Generation** | Use uuid.uuid5() with namespace | Same seed → same UUIDs |
| **Recording** | Include seed in validation report | Report contains seed + reproduction command |
| **Guarantee** | Same seed + schema = identical output | Generate twice, assert equality |

---

## Examples

See reproducibility in action:
- **[Users Table](../examples/basic/users-table.md)**: Basic reproducibility with fixed seed
- **[E-Commerce Schema](../examples/intermediate/ecommerce-schema.md)**: Multi-table reproducibility with FK dependencies

---

**Related**:
- **Workflows**: [Data Generation](../workflows/03-data-generation.md), [Validation](../workflows/04-validation.md)
- **Templates**: [Validation Report](../templates/validation-report.md)
- **Patterns**: [Distribution Strategies](distribution-strategies.md)

---

**Last Updated**: 2026-01-04
