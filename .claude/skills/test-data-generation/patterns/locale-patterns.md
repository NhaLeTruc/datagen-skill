# Pattern: Locale Patterns

**Purpose**: Locale-specific data formatting for production-like test data

**Constitutional Principle**: Principle III - Realistic Data Patterns (Production-Like Quality)

---

## Overview

Real-world data follows locale-specific formatting conventions. This pattern documents how to generate realistic, locale-appropriate data for different regions, with initial focus on **US English** patterns.

---

## Supported Locales

| Locale | Status | Coverage |
|--------|--------|----------|
| **US English** | ✅ Full Support | Names, addresses, phones, dates, numbers |
| **Other locales** | ⚠️ Fallback | Falls back to US English with warning |

**Default Locale**: US English (en_US)

**Fallback Strategy**: Unsupported locales → US English with warning in validation report

---

## US English Patterns (en_US)

### Names

#### Name Distributions

```python
# US name frequencies (top 20 most common)
FIRST_NAMES_MALE = [
    'James', 'John', 'Robert', 'Michael', 'William',
    'David', 'Richard', 'Joseph', 'Thomas', 'Christopher',
    'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald',
    'Steven', 'Andrew', 'Paul', 'Joshua', 'Kenneth'
]

FIRST_NAMES_FEMALE = [
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara',
    'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen',
    'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra',
    'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle'
]

LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
    'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris',
    'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright',
    'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall',
    'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
]
```

#### Name Generation

```python
def generate_us_name():
    # 50/50 male/female distribution
    if random.random() < 0.5:
        first = random.choice(FIRST_NAMES_MALE)
    else:
        first = random.choice(FIRST_NAMES_FEMALE)

    last = random.choice(LAST_NAMES)
    return f"{first} {last}"
```

**Examples**:
- Sarah Chen
- James Wilson
- Maria Garcia
- David Kim
- Jennifer Taylor

---

### Email Addresses

#### Email Domains (Realistic)

```python
EMAIL_DOMAINS = [
    'gmail.com',      # Most common
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'example.com',    # Fallback/test
    'company.com',    # Corporate
    'mail.com'
]
```

#### Email Generation

```python
def generate_us_email(name=None):
    if name is None:
        name = generate_us_name()

    first, last = name.lower().split(' ')

    # Common email formats
    format_choice = random.randint(1, 6)

    if format_choice == 1:
        username = f"{first}.{last}"           # sarah.chen
    elif format_choice == 2:
        username = f"{first}{last}"            # sarahchen
    elif format_choice == 3:
        username = f"{first[0]}{last}"         # schen
    elif format_choice == 4:
        username = f"{first}.{last}{random.randint(1, 999)}"  # sarah.chen42
    elif format_choice == 5:
        username = f"{first}_{last}"           # sarah_chen
    else:
        username = f"{last}.{first}"           # chen.sarah

    domain = random.choice(EMAIL_DOMAINS)
    return f"{username}@{domain}"
```

**Examples**:
- sarah.chen@gmail.com
- james.wilson@outlook.com
- maria.garcia@yahoo.com
- david.kim42@hotmail.com
- jennifer_taylor@icloud.com

---

### Phone Numbers (US Format)

#### Format: (XXX) XXX-XXXX

```python
def generate_us_phone():
    # Valid US phone number format
    area_code = random.randint(200, 999)    # 200-999 (avoid 0XX, 1XX)
    exchange = random.randint(200, 999)     # 200-999 (avoid special codes)
    subscriber = random.randint(1000, 9999) # 1000-9999

    return f"({area_code}) {exchange}-{subscriber}"
```

**Examples**:
- (415) 555-1234
- (212) 867-5309
- (713) 234-5678
- (310) 987-6543

**Note**: Avoid reserved numbers (555-0100 to 555-0199 are reserved for fictional use)

---

### Addresses

#### Street Addresses

```python
STREET_NAMES = [
    'Main', 'Oak', 'Maple', 'Cedar', 'Elm',
    'Washington', 'Lake', 'Hill', 'Park', 'Pine',
    'First', 'Second', 'Third', 'Fourth', 'Fifth',
    'Broadway', 'Market', 'Church', 'Spring', 'Center',
    'High', 'School', 'Walnut', 'Chestnut', 'Willow'
]

STREET_TYPES = [
    'St',    # Street
    'Ave',   # Avenue
    'Blvd',  # Boulevard
    'Dr',    # Drive
    'Ln',    # Lane
    'Rd',    # Road
    'Ct',    # Court
    'Way',   # Way
    'Pl',    # Place
    'Ter'    # Terrace
]

def generate_us_street_address():
    street_number = random.randint(1, 9999)
    street_name = random.choice(STREET_NAMES)
    street_type = random.choice(STREET_TYPES)
    return f"{street_number} {street_name} {street_type}"
```

**Examples**:
- 123 Main St
- 456 Oak Ave
- 789 Elm Blvd
- 1234 Washington Dr

---

#### Cities (Top 25 US Cities)

```python
US_CITIES = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
    'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
    'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte',
    'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Boston',
    'Portland', 'Nashville', 'Memphis', 'Detroit', 'Baltimore'
]

def generate_us_city():
    return random.choice(US_CITIES)
```

---

#### States (All 50 US States)

```python
US_STATES = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming'
}

def generate_us_state_code():
    return random.choice(list(US_STATES.keys()))

def generate_us_state_name():
    code = generate_us_state_code()
    return US_STATES[code]
```

---

#### ZIP Codes

```python
def generate_us_zip_code():
    # 5-digit ZIP code (10000-99999)
    return f"{random.randint(10000, 99999)}"

def generate_us_zip_plus_4():
    # ZIP+4 format (XXXXX-XXXX)
    zip5 = generate_us_zip_code()
    plus4 = f"{random.randint(0, 9999):04d}"
    return f"{zip5}-{plus4}"
```

**Examples**:
- 94102 (5-digit)
- 10001-1234 (ZIP+4)

---

#### Full Address

```python
def generate_full_us_address():
    return {
        'street': generate_us_street_address(),
        'city': generate_us_city(),
        'state': generate_us_state_code(),
        'zip': generate_us_zip_code()
    }

# Format as single line
def format_us_address_single_line(address):
    return f"{address['street']}, {address['city']}, {address['state']} {address['zip']}"
```

**Examples**:
- 123 Main St, San Francisco, CA 94102
- 456 Oak Ave, New York, NY 10001
- 789 Elm Blvd, Chicago, IL 60601

---

### Dates and Times

#### Date Formats (US Standard)

```python
# US date format: MM/DD/YYYY (month first)
def format_us_date(date):
    return date.strftime('%m/%d/%Y')

# Examples:
# 01/15/2024
# 12/31/2023
```

#### Time Formats (12-Hour with AM/PM)

```python
def format_us_time(time):
    return time.strftime('%I:%M %p')  # 12-hour with AM/PM

# Examples:
# 09:30 AM
# 02:45 PM
# 11:59 PM
```

#### Datetime Formats

```python
def format_us_datetime(datetime):
    return datetime.strftime('%m/%d/%Y %I:%M %p')

# Examples:
# 01/15/2024 09:30 AM
# 12/31/2023 11:59 PM
```

---

### Numbers and Currency

#### Currency Formatting

```python
def format_us_currency(amount):
    return f"${amount:,.2f}"

# Examples:
# $1,234.56
# $10,000.00
# $99.99
```

#### Number Formatting (Thousands Separator)

```python
def format_us_number(number):
    return f"{number:,}"

# Examples:
# 1,234
# 10,000
# 1,234,567
```

---

## Locale Fallback Strategy

### Unsupported Locale Warning

```python
SUPPORTED_LOCALES = ['en_US', 'US', 'en-US']

def generate_data_with_locale(locale='en_US'):
    if locale not in SUPPORTED_LOCALES:
        warnings.append(f"Locale '{locale}' not supported. Falling back to US English (en_US).")
        locale = 'en_US'

    # Generate data using US English patterns
    return generate_us_data()
```

**Validation Report Entry**:
```markdown
## Warnings

- ⚠️ Locale 'fr_FR' not supported. Fell back to US English (en_US).
```

---

## Locale Detection (Column Name Heuristics)

### Automatic Pattern Selection

```python
def detect_data_type_from_column_name(column_name):
    name_lower = column_name.lower()

    if 'email' in name_lower:
        return 'email'
    elif 'phone' in name_lower or 'tel' in name_lower:
        return 'phone'
    elif 'name' in name_lower and 'first' in name_lower:
        return 'first_name'
    elif 'name' in name_lower and 'last' in name_lower:
        return 'last_name'
    elif 'name' in name_lower:
        return 'full_name'
    elif 'address' in name_lower or 'street' in name_lower:
        return 'street_address'
    elif 'city' in name_lower:
        return 'city'
    elif 'state' in name_lower:
        return 'state'
    elif 'zip' in name_lower or 'postal' in name_lower:
        return 'zip_code'
    elif 'price' in name_lower or 'cost' in name_lower or 'amount' in name_lower:
        return 'currency'
    else:
        return 'generic_string'
```

---

## Complete Example: User Table with US Locale

```python
def generate_us_user():
    name = generate_us_name()
    address = generate_full_us_address()

    return {
        'name': name,
        'email': generate_us_email(name),
        'phone': generate_us_phone(),
        'street': address['street'],
        'city': address['city'],
        'state': address['state'],
        'zip': address['zip']
    }
```

**Output**:
```sql
INSERT INTO users (name, email, phone, street, city, state, zip) VALUES
  ('Sarah Chen', 'sarah.chen@gmail.com', '(415) 555-1234', '123 Main St', 'San Francisco', 'CA', '94102'),
  ('James Wilson', 'james.wilson@outlook.com', '(212) 555-5678', '456 Oak Ave', 'New York', 'NY', '10001'),
  ('Maria Garcia', 'maria.garcia@yahoo.com', '(713) 555-9012', '789 Elm Blvd', 'Houston', 'TX', '77001');
```

---

## Validation Checks

### Locale Pattern Validation

```python
def validate_us_patterns(data):
    issues = []

    # Check phone format
    phone_pattern = r'^\(\d{3}\) \d{3}-\d{4}$'
    if not re.match(phone_pattern, data['phone']):
        issues.append(f"Phone format invalid: {data['phone']}")

    # Check email format
    email_pattern = r'^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$'
    if not re.match(email_pattern, data['email'].lower()):
        issues.append(f"Email format invalid: {data['email']}")

    # Check state code
    if data['state'] not in US_STATES:
        issues.append(f"Invalid US state code: {data['state']}")

    # Check ZIP code
    if not re.match(r'^\d{5}(-\d{4})?$', data['zip']):
        issues.append(f"Invalid ZIP code: {data['zip']}")

    return issues
```

---

## Future Locale Support

### Planned Locales (Future Versions)

| Locale | Patterns | Priority |
|--------|----------|----------|
| **UK English (en_GB)** | UK addresses, phone +44, postcodes | Medium |
| **Canadian English (en_CA)** | Canadian addresses, postal codes | Medium |
| **Australian English (en_AU)** | Australian addresses, phone +61 | Low |
| **German (de_DE)** | German addresses, phone +49 | Low |
| **French (fr_FR)** | French addresses, phone +33 | Low |

**Current Approach**: Use US English with warning until additional locales are implemented

---

## Anti-Patterns

### ❌ DON'T: Use Generic Patterns Instead of Locale-Specific

```python
# BAD: Generic, unrealistic
email = f"user{id}@test.com"
phone = "1111111111"
address = "123 Street"

# GOOD: Locale-specific, realistic
email = generate_us_email()  # "sarah.chen@gmail.com"
phone = generate_us_phone()   # "(415) 555-1234"
address = generate_us_street_address()  # "123 Main St"
```

### ❌ DON'T: Mix Locale Formats

```python
# BAD: US name with UK phone format
name = "Sarah Chen"  # US name
phone = "+44 20 7946 0958"  # UK phone

# GOOD: Consistent US locale
name = "Sarah Chen"  # US name
phone = "(415) 555-1234"  # US phone
```

### ❌ DON'T: Use Invalid State Codes

```python
# BAD: Invalid state codes
state = "XX"  # Not a valid US state

# GOOD: Valid US state code
state = generate_us_state_code()  # "CA", "NY", "TX", etc.
```

---

## Examples

See locale patterns in action:
- **[Users Table](../examples/basic/users-table.md)**: US names, emails, phones
- **[E-Commerce Schema](../examples/intermediate/ecommerce-schema.md)**: US addresses with full city/state/ZIP
- **[Blog Platform](../examples/intermediate/blog-platform.md)**: US user profiles with realistic contact info

---

**Related**:
- **Workflows**: [Data Generation](../workflows/03-data-generation.md)
- **Patterns**: [Distribution Strategies](distribution-strategies.md), [Reproducibility](reproducibility.md)
- **Guidelines**: [Constitution Alignment](../guidelines/constitution-alignment.md) - Principle III

---

**Last Updated**: 2026-01-04
