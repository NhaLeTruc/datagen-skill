# Workflow 3: Data Generation

**Purpose**: Generate constraint-valid test data following topological order with realistic patterns and edge cases

**Input**:
- Constraint catalog from [Schema Analysis (Workflow 1)](01-schema-analysis.md)
- Generation plan from [Dependency Graphing (Workflow 2)](02-dependency-graphing.md)

**Output**: Generated dataset (in-memory) ready for validation

---

## Step 1: Initialize Generation Context

### Set Random Seed (for reproducibility)

```python
import random
seed = user_provided_seed or generate_random_seed()
random.seed(seed)

# Record seed for validation report
generation_metadata['seed'] = seed
```

**Constitutional Principle**: [Reproducibility pattern](../patterns/reproducibility.md) - same seed + same schema = identical output

### Prepare FK Pools

For each table in generation order, maintain pool of generated primary key IDs:

```python
pk_pools = {
    'users': [],      # Will store user IDs after generation
    'products': [],   # Will store product IDs after generation
    'orders': [],     # Will store order IDs after generation
}
```

**Purpose**: Child tables will select FK values from these pools

### Configure Edge Case Percentage

```python
edge_case_percentage = user_provided_percentage or 0.05  # Default: 5%
```

---

## Step 2: Generate Data Table-by-Table (Topological Order)

Follow generation order from dependency graph:

```text
For each table in [users, products, orders, order_items]:
  1. Generate records for this table
  2. Populate PK pool with generated IDs
  3. Continue to next table
```

---

## Step 3: Generate Records for Single Table

### For Each Record in Volume

```python
for i in range(1, volume + 1):
    record = {}

    # Step 3a: Generate primary key
    record['id'] = generate_primary_key(i, pk_strategy)

    # Step 3b: Generate foreign keys (if any)
    for fk in table.foreign_keys:
        record[fk.column] = select_from_fk_pool(fk)

    # Step 3c: Generate unique columns (track used values)
    for unique_col in table.unique_constraints:
        record[unique_col] = generate_unique_value(unique_col, used_values)

    # Step 3d: Generate NOT NULL columns
    for not_null_col in table.not_null_columns:
        if record[not_null_col] is None:  # If not already set by FK/unique
            record[not_null_col] = generate_value(not_null_col)

    # Step 3e: Generate nullable columns (with edge case NULL injection)
    for nullable_col in table.nullable_columns:
        record[nullable_col] = generate_value_with_nulls(nullable_col, edge_case_percentage)

    # Step 3f: Validate check constraints
    if not satisfies_check_constraints(record, table.check_constraints):
        regenerate_violating_values(record, table.check_constraints)

    # Add to dataset
    dataset.append(record)

    # Update PK pool
    pk_pools[table.name].append(record['id'])
```

---

## Step 3a: Generate Primary Key

**Strategy Selection** based on data type:

### Sequential IDs (INT, SERIAL)

```python
def generate_primary_key(index, strategy='sequential'):
    if strategy == 'sequential':
        return index  # 1, 2, 3, 4, ...
    elif strategy == 'uuid':
        return str(uuid.uuid4())
```

**Example**:
```sql
INSERT INTO users (id, ...) VALUES
  (1, ...),
  (2, ...),
  (3, ...);
```

**Constitutional Principle**: [Constraint Handling](../patterns/constraint-handling.md) - PK must be unique and non-null

---

## Step 3b: Generate Foreign Keys

**Select from Parent PK Pool**:

```python
def select_from_fk_pool(fk):
    parent_table = fk.references_table
    parent_pool = pk_pools[parent_table]

    if len(parent_pool) == 0:
        raise Error(f"FK pool empty: {parent_table} has no records")

    if fk.nullable and should_inject_null_edge_case():
        return NULL  # Edge case: orphan by design (nullable FK)

    return random.choice(parent_pool)  # Select random parent ID
```

**Example**:
```python
# orders.user_id references users.id
# pk_pools['users'] = [1, 2, 3, ..., 1000]
order.user_id = random.choice(pk_pools['users'])  # e.g., 42
```

**Distribution**: Uniform by default (can use Zipf for popularity - see [Distribution Strategies](../patterns/distribution-strategies.md))

### NOT NULL FK Constraint

```python
if fk.not_null:
    # Must select valid parent ID (cannot use NULL)
    return random.choice(parent_pool)
```

---

## Step 3c: Generate Unique Values

**Track Used Values to Prevent Duplicates**:

```python
used_values = {
    'users.email': set(),
    'products.sku': set(),
}

def generate_unique_value(column, used_values_set):
    max_attempts = 1000
    for attempt in range(max_attempts):
        value = generate_value(column)
        if value not in used_values_set:
            used_values_set.add(value)
            return value

    raise Error(f"Failed to generate unique value for {column} after {max_attempts} attempts")
```

**Example**:
```python
# users.email (UNIQUE constraint)
email = generate_realistic_email()  # "sarah.chen@example.com"
if email in used_values['users.email']:
    email = generate_realistic_email()  # Try again
used_values['users.email'].add(email)
```

**Constitutional Principle**: [Constraint Handling](../patterns/constraint-handling.md) - unique values must not duplicate

---

## Step 3d: Generate NOT NULL Values

**Always Generate Value** (no skip logic):

```python
def generate_value(column):
    if column.data_type == 'VARCHAR':
        return generate_realistic_string(column.max_length, column.name)
    elif column.data_type == 'INT':
        return generate_int_in_range(column)
    elif column.data_type == 'DECIMAL':
        return generate_decimal(column.precision, column.scale)
    elif column.data_type == 'DATE':
        return generate_date_in_range(column)
    elif column.data_type == 'TIMESTAMP':
        return generate_timestamp_in_range(column)
    elif column.data_type == 'BOOLEAN':
        return random.choice([True, False])
```

**Realistic Patterns** (see [Locale Patterns](../patterns/locale-patterns.md)):

### Name Generation from Distributions

```python
# US name distributions (weighted by frequency)
FIRST_NAMES_MALE = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Andrew', 'Paul', 'Joshua', 'Kenneth']
FIRST_NAMES_FEMALE = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle']
LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts']

def generate_realistic_name():
    # 50/50 male/female distribution
    if random.random() < 0.5:
        first = random.choice(FIRST_NAMES_MALE)
    else:
        first = random.choice(FIRST_NAMES_FEMALE)

    last = random.choice(LAST_NAMES)
    return f"{first} {last}"
```

### Email Generation with Realistic Domains

```python
EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'example.com', 'company.com', 'mail.com']

def generate_realistic_email(name=None):
    if name is None:
        name = generate_realistic_name()

    first, last = name.lower().split(' ')

    # Various email formats
    format_choice = random.randint(1, 5)
    if format_choice == 1:
        username = f"{first}.{last}"
    elif format_choice == 2:
        username = f"{first}{last}"
    elif format_choice == 3:
        username = f"{first[0]}{last}"
    elif format_choice == 4:
        username = f"{first}.{last}{random.randint(1, 999)}"
    else:
        username = f"{first}_{last}"

    domain = random.choice(EMAIL_DOMAINS)
    return f"{username}@{domain}"
```

### Address Generation with Locale Formatting

```python
# US address components
STREET_NAMES = ['Main', 'Oak', 'Maple', 'Cedar', 'Elm', 'Washington', 'Lake', 'Hill', 'Park', 'Pine', 'First', 'Second', 'Third', 'Broadway', 'Market', 'Church', 'Spring', 'Center', 'High', 'School']
STREET_TYPES = ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Rd', 'Ct', 'Way', 'Pl', 'Ter']
US_STATES = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
}

def generate_us_address():
    street_number = random.randint(1, 9999)
    street_name = random.choice(STREET_NAMES)
    street_type = random.choice(STREET_TYPES)
    return f"{street_number} {street_name} {street_type}"

def generate_us_city():
    CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
              'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
              'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle',
              'Denver', 'Boston', 'Portland', 'Nashville', 'Memphis', 'Detroit', 'Baltimore']
    return random.choice(CITIES)

def generate_us_state_code():
    return random.choice(list(US_STATES.keys()))

def generate_us_zip_code():
    return f"{random.randint(10000, 99999)}"

def generate_full_us_address():
    return {
        'street': generate_us_address(),
        'city': generate_us_city(),
        'state': generate_us_state_code(),
        'zip': generate_us_zip_code()
    }
```

### Phone Number Generation (US Format)

```python
def generate_us_phone():
    # (XXX) XXX-XXXX format
    area_code = random.randint(200, 999)  # Valid area codes 200-999
    exchange = random.randint(200, 999)   # Valid exchanges 200-999
    subscriber = random.randint(1000, 9999)
    return f"({area_code}) {exchange}-{subscriber}"
```

### Product and Content Generation

```python
# Product categories and realistic names
PRODUCT_CATEGORIES = {
    'Electronics': ['Wireless Headphones', 'USB-C Cable', 'Laptop Stand', 'Wireless Mouse',
                   'Mechanical Keyboard', 'Webcam', 'Monitor Arm', 'Cable Organizer',
                   'Power Bank', 'Phone Case', 'Screen Protector', 'Charging Dock'],
    'Accessories': ['Desk Mat', 'Blue Light Glasses', 'Notebook', 'Pen Set', 'Water Bottle',
                   'Backpack', 'Laptop Bag', 'Mousepad', 'Desk Organizer'],
    'Furniture': ['Office Chair', 'Standing Desk', 'Bookshelf', 'Filing Cabinet', 'Desk Lamp']
}

def generate_product_name():
    category = random.choice(list(PRODUCT_CATEGORIES.keys()))
    return random.choice(PRODUCT_CATEGORIES[category])

def generate_product_description(name):
    ADJECTIVES = ['high-quality', 'durable', 'premium', 'professional', 'ergonomic', 'compact', 'portable', 'versatile']
    FEATURES = ['with fast charging support', 'with noise cancellation', 'with adjustable height',
                'with RGB lighting', 'with wireless connectivity', 'with long battery life']

    adj = random.choice(ADJECTIVES)
    feature = random.choice(FEATURES) if random.random() < 0.7 else ''

    return f"{adj.capitalize()} {name.lower()} {feature}".strip() + '.'

# Blog/content generation
BLOG_TITLE_PATTERNS = [
    "How to {verb} {topic}",
    "{number} Ways to {verb} {topic}",
    "The Ultimate Guide to {topic}",
    "Why {topic} Matters in {year}",
    "{topic}: Best Practices and Tips"
]

VERBS = ['improve', 'optimize', 'master', 'understand', 'build', 'create', 'design', 'develop']
TOPICS = ['web development', 'data analysis', 'machine learning', 'cloud computing', 'cybersecurity',
          'mobile apps', 'database design', 'API development']

def generate_blog_title():
    pattern = random.choice(BLOG_TITLE_PATTERNS)
    return pattern.format(
        verb=random.choice(VERBS),
        topic=random.choice(TOPICS),
        number=random.choice([3, 5, 7, 10]),
        year=random.randint(2023, 2026)
    )
```

### Master Generator Function

```python
def generate_realistic_string(max_length, column_name):
    if 'email' in column_name.lower():
        value = generate_realistic_email()
    elif 'name' in column_name.lower() and 'first' in column_name.lower():
        value = random.choice(FIRST_NAMES_MALE + FIRST_NAMES_FEMALE)
    elif 'name' in column_name.lower() and 'last' in column_name.lower():
        value = random.choice(LAST_NAMES)
    elif 'name' in column_name.lower():
        value = generate_realistic_name()
    elif 'phone' in column_name.lower():
        value = generate_us_phone()
    elif 'address' in column_name.lower() or 'street' in column_name.lower():
        value = generate_us_address()
    elif 'city' in column_name.lower():
        value = generate_us_city()
    elif 'state' in column_name.lower():
        value = generate_us_state_code()
    elif 'zip' in column_name.lower() or 'postal' in column_name.lower():
        value = generate_us_zip_code()
    elif 'title' in column_name.lower():
        value = generate_blog_title()
    elif 'description' in column_name.lower():
        value = generate_product_description("product")
    elif 'sku' in column_name.lower():
        value = f"PROD-{random.randint(1000, 9999)}-{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{random.randint(1, 9)}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}"
    else:
        # Generic string
        value = random_string(max_length)

    # Truncate if exceeds max length
    if len(value) > max_length:
        value = value[:max_length]

    return value
```

**Example Output**:
```sql
-- Realistic patterns (US locale)
INSERT INTO users (name, email, phone, address, city, state, zip) VALUES
  ('Sarah Chen', 'sarah.chen@gmail.com', '(415) 555-1234', '123 Main St', 'San Francisco', 'CA', '94102'),
  ('James Wilson', 'james.wilson@outlook.com', '(212) 555-5678', '456 Oak Ave', 'New York', 'NY', '10001'),
  ('Maria Garcia', 'maria.garcia@yahoo.com', '(713) 555-9012', '789 Elm Blvd', 'Houston', 'TX', '77001');

-- NOT unrealistic patterns like:
-- ('User 1', 'test1@test.com', '1111111111', 'Address 1', 'City', 'XX', '00000')
```

**See**: [Locale Patterns](../patterns/locale-patterns.md) for full US English patterns and locale fallback strategy

---

## Step 3e: Generate Nullable Values (with NULL Edge Cases)

**Inject NULL for Edge Cases**:

```python
def generate_value_with_nulls(column, edge_case_percentage):
    if random.random() < edge_case_percentage:
        return NULL  # Edge case: NULL in optional field
    else:
        return generate_value(column)  # Normal value
```

**Example**:
```python
# orders.notes (VARCHAR nullable)
# 5% of orders have NULL notes (edge case)
# 95% of orders have realistic notes
if random.random() < 0.05:
    notes = NULL
else:
    notes = "Order placed by customer"
```

---

## Step 3f: Satisfy Check Constraints

**Parse Check Condition** and generate values satisfying it:

### Example 1: Range Check (`age >= 18`)

```python
def generate_int_with_check(column, check_constraint):
    # Parse: "age >= 18"
    operator = ">="
    value = 18

    if operator == ">=":
        return random.randint(value, 100)  # Range: [18, 100]
    elif operator == ">":
        return random.randint(value + 1, 100)
    elif operator == "<=":
        return random.randint(0, value)
    # ... other operators
```

### Example 2: Enum Check (`status IN ('pending', 'completed', 'cancelled')`)

```python
def generate_enum_value(check_constraint):
    # Parse: "status IN ('pending', 'completed', 'cancelled')"
    allowed_values = ['pending', 'completed', 'cancelled']
    return random.choice(allowed_values)
```

### Constraint-First Principle

**If edge case violates check constraint, SKIP edge case**:

```python
# Check: age >= 18
# Edge case: age = 0
if age_edge_case < 18:
    # SKIP: Constraint wins, edge case loses
    skipped_edge_cases.append("age = 0 violates CHECK age >= 18")
    age = random.randint(18, 100)  # Generate valid value instead
```

**Constitutional Principle**: Constraint compliance (Principle I) takes precedence over edge case coverage (Principle IV)

---

## Step 4: Edge Case Injection

**Inject Edge Cases at Configured Percentage** (default 5%):

### Determine Edge Case Records

```python
total_records = 1000
edge_case_count = int(total_records * 0.05)  # 50 edge case records

edge_case_indices = random.sample(range(1, total_records + 1), edge_case_count)
# e.g., [12, 47, 89, 123, ...] (50 random indices)
```

### Edge Case Types by Data Type

See [Edge Case Catalog](../patterns/edge-case-catalog.md) for full list:

**VARCHAR**:
- Min length: `""` (empty string)
- Max length: String of exactly max_length characters
- Special characters: `test+tag@example.com`, `O'Brien`, `"quoted"`
- Unicode: `名字`, `Ñoño`

**INT**:
- Zero: `0`
- Negative: `-1`, `-100`
- Max value: `2147483647` (INT max)

**DATE**:
- Epoch: `1970-01-01`
- 2038 problem: `2038-01-19`
- Far future: `2099-12-31`

**DECIMAL**:
- Zero: `0.00`
- Max precision: `99999999.99` (if DECIMAL(10,2))

**BOOLEAN**:
- Both `true` and `false` (ensure coverage)

**NULL** (for nullable columns):
- Inject NULL in edge case records

### Example Edge Case Record

```sql
-- Edge case record (5% of dataset)
INSERT INTO users (id, email, name, age, created_at) VALUES
  (948, 'edge+case@example.com',  -- Edge: special char +
        'Abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',  -- Edge: max length
        18,  -- Edge: minimum age (CHECK age >= 18)
        '1970-01-01 00:00:00');  -- Edge: epoch timestamp
```

---

## Step 5: Self-Referencing FK Handling (Tiered Generation)

### Scenario: Employee.managerId → Employee.id

**Strategy**: Generate in tiers

```python
def generate_employees_tiered(total=100, tiers=4):
    records = []
    tier_size = total // tiers

    # Tier 1: Root employees (no manager)
    for i in range(1, tier_size + 1):
        records.append({
            'id': i,
            'name': generate_realistic_name(),
            'manager_id': NULL  # Root tier has no manager
        })
        pk_pools['employees'].append(i)

    # Tiers 2-4: Employees with managers from previous tiers
    current_id = tier_size + 1
    for tier in range(2, tiers + 1):
        for i in range(tier_size):
            manager_id = random.choice(pk_pools['employees'])  # Select from existing employees
            records.append({
                'id': current_id,
                'name': generate_realistic_name(),
                'manager_id': manager_id
            })
            pk_pools['employees'].append(current_id)
            current_id += 1

    return records
```

**Example Output**:
```sql
-- Tier 1 (Root): 25 employees
INSERT INTO employees (id, name, manager_id) VALUES
  (1, 'Alice CEO', NULL),
  (2, 'Bob CTO', NULL),
  ...

-- Tier 2: 25 employees (managers from Tier 1)
INSERT INTO employees (id, name, manager_id) VALUES
  (26, 'Charlie VP', 1),  -- Reports to Alice
  (27, 'Diana VP', 2),    -- Reports to Bob
  ...

-- Tier 3: 25 employees (managers from Tier 1-2)
INSERT INTO employees (id, name, manager_id) VALUES
  (51, 'Eve Director', 26),  -- Reports to Charlie
  ...
```

**See**: [Self-Referencing Hierarchies example](../examples/advanced/self-referencing-hierarchies.md)

---

## Step 6: Realistic Data Patterns (Production-Like)

### Temporal Patterns

**More orders on weekdays than weekends**:

```python
def generate_order_timestamp():
    date = random_date_in_range('2024-01-01', '2024-12-31')

    # 70% weekday, 30% weekend
    if random.random() < 0.7:
        # Weekday (Monday-Friday)
        while date.weekday() >= 5:  # 5=Saturday, 6=Sunday
            date = random_date_in_range('2024-01-01', '2024-12-31')

    # More orders during business hours (9am-5pm)
    hour = random.choices(range(24), weights=[1]*9 + [3]*8 + [1]*7)[0]

    return datetime(date.year, date.month, date.day, hour, random.randint(0, 59))
```

### Distribution Strategies

**Zipf Distribution for Product Popularity**:

```python
# 20% of products account for 80% of order items
def select_popular_product(product_ids):
    # Zipf power-law distribution
    from scipy.stats import zipf
    idx = zipf.rvs(a=1.5, size=1)[0] - 1
    idx = min(idx, len(product_ids) - 1)  # Clamp to valid range
    return product_ids[idx]
```

**Normal Distribution for Measurements**:

```python
# Order totals follow normal distribution around mean
def generate_order_total():
    mean = 100.00
    std_dev = 30.00
    total = random.gauss(mean, std_dev)
    total = max(0.00, total)  # Clamp to non-negative (CHECK total >= 0)
    return round(total, 2)
```

**See**: [Distribution Strategies pattern](../patterns/distribution-strategies.md)

---

## Step 7: Cascade Semantics Handling

### ON DELETE CASCADE

**Generate child records that would survive parent deletion**:

```python
# If orders.user_id has ON DELETE CASCADE:
# Don't generate critical order data for temporary test users
# that might be deleted in test scenarios
```

### ON DELETE SET NULL

**Allow nullable FKs to be set NULL**:

```python
# If orders.shipping_address_id has ON DELETE SET NULL:
# Some orders can have NULL shipping_address_id (valid edge case)
if random.random() < edge_case_percentage:
    shipping_address_id = NULL  # Valid: address deleted, FK set NULL
```

### ON DELETE RESTRICT

**Ensure all generated data respects restriction**:

```python
# If products.category_id has ON DELETE RESTRICT:
# Don't generate orphan products (must have valid category)
# Category cannot be deleted while products reference it
```

**See**: [Constraint Handling pattern](../patterns/constraint-handling.md) - cascade semantics section

---

## Step 8: Streaming/Batching for Large Datasets

**If volume > 100,000 records**, use streaming approach:

```python
def generate_large_dataset(table, volume):
    batch_size = 10000
    batch_count = (volume // batch_size) + 1

    for batch_num in range(batch_count):
        batch_records = []
        start_id = batch_num * batch_size + 1
        end_id = min((batch_num + 1) * batch_size, volume)

        for i in range(start_id, end_id + 1):
            record = generate_record(table, i)
            batch_records.append(record)

        # Write batch to file progressively
        write_batch_to_file(batch_records, batch_num)

        # Report progress
        progress = (batch_num + 1) / batch_count * 100
        print(f"Progress: {progress:.1f}% ({end_id}/{volume} records)")

        # Clear batch from memory
        batch_records.clear()
```

**Constitutional Principle**: FR-018 - automatic streaming for large datasets with progress reporting

---

## Output: Generated Dataset

**Deliverable**: In-memory dataset (or streamed batches) ready for [Validation (Workflow 4)](04-validation.md)

**Format**:
```python
dataset = {
    'users': [
        {'id': 1, 'email': 'sarah.chen@example.com', 'name': 'Sarah Chen', 'age': 34},
        {'id': 2, 'email': 'james.wilson@example.com', 'name': 'James Wilson', 'age': 28},
        ...
    ],
    'products': [...],
    'orders': [...],
    'order_items': [...]
}

generation_metadata = {
    'seed': 42,
    'edge_case_percentage': 0.05,
    'locale': 'US English',
    'distributions': {'products': 'Zipf', 'order_totals': 'Normal'},
    'timestamp': '2026-01-04T10:30:00Z'
}
```

**Next Step**: Proceed to [Workflow 4: Validation](04-validation.md) for pre-delivery validation

---

## Examples

See these examples for data generation in action:
- **[Users Table](../examples/basic/users-table.md)**: Simple single-table generation
- **[E-Commerce Schema](../examples/intermediate/ecommerce-schema.md)**: Multi-table generation with FK relationships
- **[Self-Referencing Hierarchies](../examples/advanced/self-referencing-hierarchies.md)**: Tiered generation for Employee.managerId

---

**Related**:
- **Previous Workflow**: [Dependency Graphing](02-dependency-graphing.md)
- **Next Workflow**: [Validation](04-validation.md)
- **Patterns**: [Constraint Handling](../patterns/constraint-handling.md), [Edge Case Catalog](../patterns/edge-case-catalog.md), [Distribution Strategies](../patterns/distribution-strategies.md), [Locale Patterns](../patterns/locale-patterns.md)

---

**Last Updated**: 2026-01-04
