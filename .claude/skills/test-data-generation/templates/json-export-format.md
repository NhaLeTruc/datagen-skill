# Template: JSON Export Format

**Purpose**: Standard JSON structure for exporting generated test data

**Use Case**: API fixtures, frontend mocks, configuration files, cross-language data exchange

---

## Format Specification

### Top-Level Structure

```json
{
  "metadata": {
    "seed": <integer>,
    "timestamp": "<ISO 8601 datetime>",
    "record_count": <integer>,
    "schema_version": "<string>",
    "generator_version": "<string>"
  },
  "<table_name>": [
    { "col1": value1, "col2": value2, ... },
    { "col1": value1, "col2": value2, ... }
  ],
  "<table_name2>": [
    { "col1": value1, "col2": value2, ... }
  ]
}
```

**Key Points**:
- Root object contains `metadata` + one array per table
- Table names are keys at root level
- Each table is an array of record objects
- All records in same table have identical field structure

---

## Metadata Section

### Required Fields

```json
{
  "metadata": {
    "seed": 42,
    "timestamp": "2024-01-04T10:30:00Z",
    "record_count": 1000,
    "schema_version": "1.0",
    "generator_version": "1.0"
  }
}
```

| Field | Type | Description | Example |
| ----- | ---- | ----------- | ------- |
| `seed` | integer | Random seed for reproducibility | `42` |
| `timestamp` | string | ISO 8601 generation timestamp (UTC) | `"2024-01-04T10:30:00Z"` |
| `record_count` | integer | Total records across all tables | `1000` |
| `schema_version` | string | Schema version identifier | `"1.0"` |
| `generator_version` | string | Tool version that generated data | `"1.0"` |

**Purpose**: Enable reproducibility, auditability, and version tracking

---

## Data Type Mapping

### SQL Type → JSON Type

| SQL Type | JSON Type | Example SQL Value | Example JSON Value |
| -------- | --------- | ----------------- | ------------------ |
| **INT, BIGINT** | number | `42` | `42` |
| **DECIMAL, NUMERIC** | number | `99.99` | `99.99` |
| **BOOLEAN** | boolean | `TRUE` | `true` |
| **VARCHAR, TEXT** | string | `'Sarah Chen'` | `"Sarah Chen"` |
| **DATE** | string (ISO 8601) | `'2024-01-15'` | `"2024-01-15"` |
| **TIMESTAMP** | string (ISO 8601) | `'2024-01-15 10:30:00'` | `"2024-01-15T10:30:00Z"` |
| **NULL** | null | `NULL` | `null` |
| **ARRAY** (PostgreSQL) | array | `ARRAY[1,2,3]` | `[1, 2, 3]` |
| **JSON/JSONB** | object/array | `'{"key": "value"}'` | `{"key": "value"}` |

---

## Value Serialization Rules

### Strings (VARCHAR, TEXT)

```json
{
  "name": "Sarah Chen",
  "bio": "Software engineer specializing in \"data\" systems",
  "notes": "Line 1\nLine 2"
}
```

**Escaping**:
- Quotes: `"` → `\"`
- Backslashes: `\` → `\\`
- Newlines: `\n` → `\\n`
- Tabs: `\t` → `\\t`
- Unicode: `😀` → `"\ud83d\ude00"` (or direct UTF-8 if `ensure_ascii=False`)

**Implementation**:
```python
import json
escaped_string = json.dumps(value)  # Handles all escaping automatically
```

---

### Numbers (INT, DECIMAL)

```json
{
  "id": 1,
  "age": 34,
  "price": 99.99,
  "balance": -150.50,
  "score": 0
}
```

**Rules**:
- No quotes (direct numeric values)
- Negative numbers allowed
- Decimals use period `.` (not comma)
- No thousands separators

**Edge Cases**:
```json
{
  "zero": 0,
  "negative": -100,
  "max_int": 2147483647,
  "max_decimal": 99999999.99
}
```

---

### Booleans

```json
{
  "is_active": true,
  "is_deleted": false
}
```

**Rules**:
- Lowercase `true` and `false` (JSON standard)
- No quotes

**SQL Conversion**:
```python
# SQL: TRUE → JSON: true
# SQL: FALSE → JSON: false
json_value = True  # Python bool → JSON boolean
```

---

### Dates and Timestamps

**Date** (YYYY-MM-DD):
```json
{
  "birth_date": "1990-05-15",
  "hire_date": "2020-01-10"
}
```

**Timestamp** (ISO 8601 with timezone):
```json
{
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T14:45:30Z"
}
```

**Implementation**:
```python
from datetime import date, datetime

# Date
date_value = date(2024, 1, 15)
json_date = date_value.isoformat()  # "2024-01-15"

# Timestamp (UTC)
timestamp_value = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
json_timestamp = timestamp_value.isoformat()  # "2024-01-15T10:30:00+00:00"
```

**Edge Cases**:
```json
{
  "epoch": "1970-01-01T00:00:00Z",
  "y2k38": "2038-01-19T03:14:07Z",
  "far_future": "2099-12-31T23:59:59Z"
}
```

---

### NULL Values

```json
{
  "middle_name": null,
  "phone": null,
  "notes": null
}
```

**Rules**:
- Lowercase `null` (JSON standard)
- No quotes
- Represents SQL `NULL`

**Distinction from Empty String**:
```json
{
  "nullable_field": null,        // SQL: NULL
  "empty_string_field": ""      // SQL: ''
}
```

---

## Array Structure (Table Records)

### Single Table Export

```json
{
  "metadata": { ... },
  "users": [
    {
      "id": 1,
      "name": "Sarah Chen",
      "email": "sarah.chen@example.com",
      "age": 34,
      "created_at": "2022-07-15T10:23:45Z"
    },
    {
      "id": 2,
      "name": "James Wilson",
      "email": "james.wilson@example.com",
      "age": 28,
      "created_at": "2021-03-22T14:30:12Z"
    },
    {
      "id": 3,
      "name": "Maria Garcia",
      "email": "maria.garcia@example.com",
      "age": 45,
      "created_at": "2023-11-08T09:15:33Z"
    }
  ]
}
```

---

### Multi-Table Export (Flat Structure)

```json
{
  "metadata": {
    "seed": 42,
    "timestamp": "2024-01-04T10:30:00Z",
    "record_count": 13
  },
  "users": [
    {"id": 1, "name": "Sarah Chen", "email": "sarah.chen@example.com"},
    {"id": 2, "name": "James Wilson", "email": "james.wilson@example.com"}
  ],
  "products": [
    {"id": 1, "name": "Wireless Headphones", "price": 79.99},
    {"id": 2, "name": "USB-C Cable", "price": 12.99}
  ],
  "orders": [
    {"id": 101, "user_id": 1, "total": 150.00, "created_at": "2024-01-10T14:30:00Z"},
    {"id": 102, "user_id": 2, "total": 75.50, "created_at": "2024-01-11T09:15:00Z"}
  ],
  "order_items": [
    {"id": 1, "order_id": 101, "product_id": 1, "quantity": 2, "price": 79.99},
    {"id": 2, "order_id": 101, "product_id": 2, "quantity": 1, "price": 12.99},
    {"id": 3, "order_id": 102, "product_id": 1, "quantity": 1, "price": 79.99}
  ]
}
```

**Key Points**:
- Each table is a separate array at root level
- Foreign keys represented as ID values (not nested objects)
- Maintains relational structure (not denormalized)

---

## Nested Relationships (Alternative Format)

### Denormalized Export (for API Fixtures)

```json
{
  "metadata": { ... },
  "users": [
    {
      "id": 1,
      "name": "Sarah Chen",
      "email": "sarah.chen@example.com",
      "orders": [
        {
          "id": 101,
          "total": 150.00,
          "created_at": "2024-01-10T14:30:00Z",
          "items": [
            {
              "product_id": 1,
              "product_name": "Wireless Headphones",
              "quantity": 2,
              "price": 79.99
            },
            {
              "product_id": 2,
              "product_name": "USB-C Cable",
              "quantity": 1,
              "price": 12.99
            }
          ]
        }
      ]
    }
  ]
}
```

**When to Use**:
- API response mocks
- Frontend fixtures
- GraphQL-like nested data

**Trade-offs**:
- ✅ Easier to consume in frontend
- ✅ Matches API response structure
- ❌ Data duplication
- ❌ Harder to validate referential integrity

**Recommendation**: Use flat structure by default, nested only when specifically needed for API mocking

---

## Formatting and Pretty-Printing

### Compact Format (Production)

```json
{"metadata":{"seed":42,"timestamp":"2024-01-04T10:30:00Z"},"users":[{"id":1,"name":"Sarah Chen"}]}
```

**When to Use**: Minimizing file size for production fixtures

---

### Pretty-Printed Format (Development)

```json
{
  "metadata": {
    "seed": 42,
    "timestamp": "2024-01-04T10:30:00Z"
  },
  "users": [
    {
      "id": 1,
      "name": "Sarah Chen"
    }
  ]
}
```

**When to Use**: Development, debugging, human inspection

**Implementation**:
```python
import json

# Pretty-printed (2-space indent)
json.dumps(data, indent=2, ensure_ascii=False)

# Compact
json.dumps(data, separators=(',', ':'))
```

**Recommendation**: Use pretty-printed format for generated test data (readability > size)

---

## Complete Example

### E-Commerce Dataset (3 Users, 2 Products, 2 Orders, 3 Order Items)

```json
{
  "metadata": {
    "seed": 42,
    "timestamp": "2024-01-04T10:30:00Z",
    "record_count": 10,
    "schema_version": "1.0",
    "generator_version": "1.0"
  },
  "users": [
    {
      "id": 1,
      "name": "Sarah Martinez",
      "email": "sarah.martinez@example.com",
      "created_at": "2022-03-15T10:00:00Z"
    },
    {
      "id": 2,
      "name": "James Wilson",
      "email": "james.wilson@example.com",
      "created_at": "2022-06-22T14:30:00Z"
    },
    {
      "id": 3,
      "name": "Maria Garcia",
      "email": "maria.garcia@example.com",
      "created_at": "2023-01-10T09:15:00Z"
    }
  ],
  "products": [
    {
      "id": 1,
      "name": "Wireless Headphones",
      "sku": "PROD-1234-A5B",
      "price": 79.99,
      "stock": 150,
      "created_at": "2023-05-01T12:00:00Z"
    },
    {
      "id": 2,
      "name": "USB-C Cable",
      "sku": "PROD-5678-C2D",
      "price": 12.99,
      "stock": 500,
      "created_at": "2023-05-15T15:30:00Z"
    }
  ],
  "orders": [
    {
      "id": 101,
      "user_id": 1,
      "total": 172.97,
      "status": "completed",
      "created_at": "2024-01-10T14:30:00Z"
    },
    {
      "id": 102,
      "user_id": 2,
      "total": 79.99,
      "status": "pending",
      "created_at": "2024-01-11T09:15:00Z"
    }
  ],
  "order_items": [
    {
      "id": 1,
      "order_id": 101,
      "product_id": 1,
      "quantity": 2,
      "price": 79.99
    },
    {
      "id": 2,
      "order_id": 101,
      "product_id": 2,
      "quantity": 1,
      "price": 12.99
    },
    {
      "id": 3,
      "order_id": 102,
      "product_id": 1,
      "quantity": 1,
      "price": 79.99
    }
  ]
}
```

---

## Validation

### JSON Schema Validation (Optional)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["metadata", "users"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["seed", "timestamp", "record_count"],
      "properties": {
        "seed": {"type": "integer"},
        "timestamp": {"type": "string", "format": "date-time"},
        "record_count": {"type": "integer", "minimum": 0}
      }
    },
    "users": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "email"],
        "properties": {
          "id": {"type": "integer"},
          "name": {"type": "string"},
          "email": {"type": "string", "format": "email"}
        }
      }
    }
  }
}
```

---

## Common Pitfalls

### ❌ DON'T: Mix Data Types

```json
// BAD: Inconsistent types for same field
{
  "users": [
    {"id": 1, "age": 34},       // age as number
    {"id": 2, "age": "28"}      // age as string
  ]
}

// GOOD: Consistent types
{
  "users": [
    {"id": 1, "age": 34},
    {"id": 2, "age": 28}
  ]
}
```

---

### ❌ DON'T: Use Non-Standard Date Formats

```json
// BAD: Various date formats
{
  "birth_date": "05/15/1990",           // US format
  "hire_date": "15-05-2020",            // EU format
  "updated": "2024-01-15 10:30:00"      // SQL format
}

// GOOD: ISO 8601 only
{
  "birth_date": "1990-05-15",
  "hire_date": "2020-05-15",
  "updated": "2024-01-15T10:30:00Z"
}
```

---

### ❌ DON'T: Nest Relationships Inconsistently

```json
// BAD: Mixing flat and nested
{
  "users": [
    {"id": 1, "orders": [...]},         // Nested
    {"id": 2, "order_ids": [101, 102]}  // Flat reference
  ]
}

// GOOD: Consistent flat structure
{
  "users": [{"id": 1}, {"id": 2}],
  "orders": [{"id": 101, "user_id": 1}, {"id": 102, "user_id": 2}]
}
```

---

## Best Practices

### ✅ DO: Use Consistent Field Ordering

```json
// All records in same table have same field order
{
  "users": [
    {"id": 1, "name": "Sarah", "email": "sarah@example.com"},
    {"id": 2, "name": "James", "email": "james@example.com"}
  ]
}
```

**Why**: Easier to read, diff, and validate

---

### ✅ DO: Include Metadata for Reproducibility

```json
{
  "metadata": {
    "seed": 42,
    "timestamp": "2024-01-04T10:30:00Z"
  }
}
```

**Why**: Enables regeneration of exact same dataset

---

### ✅ DO: Use UTF-8 Encoding

```python
# Python: ensure_ascii=False preserves Unicode
json.dumps(data, indent=2, ensure_ascii=False)
```

**Why**: Supports international characters, emojis, special symbols

---

## Related

- **Workflow**: [Export Formats](../workflows/05-export-formats.md)
- **Templates**: [SQL Insert Format](sql-insert-format.md), [CSV Export Format](csv-export-format.md)
- **Examples**: [E-Commerce Schema](../examples/intermediate/ecommerce-schema.md) - Multi-format export

---

**Last Updated**: 2026-01-04
