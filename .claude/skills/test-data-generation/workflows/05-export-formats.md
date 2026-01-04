# Workflow 5: Export Formats

**Purpose**: Serialize generated dataset to multiple output formats with guaranteed consistency

**Input**:
- Generated dataset (in-memory) from [Data Generation (Workflow 3)](03-data-generation.md)
- Validated dataset from [Validation (Workflow 4)](04-validation.md)

**Output**: Dataset exported in multiple formats (SQL, JSON, CSV) with consistency guarantees

---

## Overview

After generating and validating constraint-valid test data, export the dataset to multiple formats for different use cases:

- **SQL INSERT**: For direct database loading
- **JSON**: For API testing, fixtures, configuration
- **CSV**: For spreadsheet analysis, bulk imports, data exchange

**Critical Requirement**: All formats must contain identical data - same record counts, same values, same relationships.

---

## Step 1: Generate Once, Serialize Many

### Single Source of Truth

```python
# Generate data ONCE in memory
dataset = generate_data(schema, seed=42, volume=1000)

# Validate ONCE
validation_report = validate_dataset(dataset, schema)

# Serialize to EACH format from the SAME in-memory dataset
sql_output = serialize_to_sql(dataset)
json_output = serialize_to_json(dataset)
csv_output = serialize_to_csv(dataset)
```

**Constitutional Principle**: Single generation pass ensures consistency across all formats

**Anti-Pattern**: ❌ Regenerating data separately for each format (introduces inconsistencies)

---

## Step 2: SQL INSERT Format

### Standard SQL INSERT Syntax

```sql
-- Format: One INSERT statement per record
INSERT INTO table_name (col1, col2, col3) VALUES (val1, val2, val3);
INSERT INTO table_name (col1, col2, col3) VALUES (val1, val2, val3);
...
```

**Alternative**: Multi-row INSERT (more efficient but less portable)

```sql
-- Format: Multiple values in single INSERT statement
INSERT INTO table_name (col1, col2, col3) VALUES
  (val1, val2, val3),
  (val1, val2, val3),
  (val1, val2, val3);
```

### SQL Value Escaping Rules

**Strings** (VARCHAR, TEXT):

```python
def escape_sql_string(value):
    # Escape single quotes by doubling them
    escaped = value.replace("'", "''")
    return f"'{escaped}'"

# Examples:
"O'Brien" → 'O''Brien'
"Test" → 'Test'
"It's a test" → 'It''s a test'
```

**Numbers** (INT, DECIMAL):

```python
def format_sql_number(value):
    # No quotes, direct value
    return str(value)

# Examples:
42 → 42
3.14 → 3.14
-100 → -100
```

**Booleans** (BOOLEAN):

```python
def format_sql_boolean(value):
    # Database-specific (PostgreSQL uses TRUE/FALSE, MySQL uses 1/0)
    return 'TRUE' if value else 'FALSE'  # PostgreSQL
    # OR
    return '1' if value else '0'  # MySQL

# Examples:
True → TRUE (or 1)
False → FALSE (or 0)
```

**Dates and Timestamps** (DATE, TIMESTAMP):

```python
def format_sql_date(value):
    # ISO 8601 format in quotes
    return f"'{value.strftime('%Y-%m-%d')}'"

def format_sql_timestamp(value):
    # ISO 8601 format in quotes
    return f"'{value.strftime('%Y-%m-%d %H:%M:%S')}'"

# Examples:
date(2024, 1, 15) → '2024-01-15'
datetime(2024, 1, 15, 10, 30, 0) → '2024-01-15 10:30:00'
```

**NULL Values**:

```python
def format_sql_null():
    # No quotes, keyword NULL
    return 'NULL'

# Example:
None → NULL
```

### Complete SQL Serialization

```python
def serialize_to_sql(dataset):
    sql_statements = []

    # Add metadata as SQL comments
    sql_statements.append(f"-- Seed: {dataset.metadata['seed']}")
    sql_statements.append(f"-- Record Count: {len(dataset.records)}")
    sql_statements.append(f"-- Generated: {dataset.metadata['timestamp']}")
    sql_statements.append("")

    # Generate INSERT statements for each table
    for table_name, records in dataset.tables.items():
        columns = dataset.schema[table_name].columns

        for record in records:
            # Build column list
            col_names = ', '.join(columns)

            # Build value list with proper escaping
            values = []
            for col in columns:
                value = record[col]
                values.append(format_sql_value(value, col.data_type))

            values_str = ', '.join(values)

            # Generate INSERT statement
            sql_statements.append(
                f"INSERT INTO {table_name} ({col_names}) VALUES ({values_str});"
            )

    return '\n'.join(sql_statements)
```

**Output Example**:

```sql
-- Seed: 42
-- Record Count: 10
-- Generated: 2024-01-04 10:30:00 UTC

INSERT INTO users (id, name, email, age, created_at) VALUES (1, 'Sarah Chen', 'sarah.chen@example.com', 34, '2022-07-15 10:23:45');
INSERT INTO users (id, name, email, age, created_at) VALUES (2, 'James Wilson', 'james.wilson@example.com', 28, '2021-03-22 14:30:12');
INSERT INTO users (id, name, email, age, created_at) VALUES (3, 'Maria Garcia', 'maria.garcia@example.com', 45, '2023-11-08 09:15:33');
```

**See**: [SQL Insert Format Template](../templates/sql-insert-format.md) for detailed format specification

---

## Step 3: JSON Format

### JSON Structure Options

**Option 1: Flat Array per Table**

```json
{
  "metadata": {
    "seed": 42,
    "timestamp": "2024-01-04T10:30:00Z",
    "record_count": 10
  },
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
    }
  ]
}
```

**Option 2: Nested Relationships** (denormalized for API consumption)

```json
{
  "metadata": {
    "seed": 42,
    "timestamp": "2024-01-04T10:30:00Z"
  },
  "users": [
    {
      "id": 1,
      "name": "Sarah Chen",
      "email": "sarah.chen@example.com",
      "orders": [
        {
          "id": 101,
          "total": 150.00,
          "order_items": [
            {"product_id": 1, "quantity": 2, "price": 50.00},
            {"product_id": 2, "quantity": 1, "price": 50.00}
          ]
        }
      ]
    }
  ]
}
```

**Recommendation**: Use Option 1 (flat arrays) for consistency with relational structure. Use Option 2 for API fixtures when denormalized data is needed.

### JSON Value Serialization

**Strings**:

```python
import json

def serialize_json_string(value):
    # json.dumps handles all escaping (quotes, newlines, unicode)
    return json.dumps(value)

# Examples:
"O'Brien" → "O'Brien"
"Line 1\nLine 2" → "Line 1\\nLine 2"
"Test \"quoted\"" → "Test \\\"quoted\\\""
```

**Numbers**:

```python
def serialize_json_number(value):
    # Direct numeric values (no quotes)
    return value

# Examples:
42 → 42
3.14 → 3.14
-100 → -100
```

**Booleans**:

```python
def serialize_json_boolean(value):
    # Lowercase true/false (JSON standard)
    return 'true' if value else 'false'

# Examples:
True → true
False → false
```

**Dates and Timestamps**:

```python
def serialize_json_datetime(value):
    # ISO 8601 format as string
    return value.isoformat()

# Examples:
date(2024, 1, 15) → "2024-01-15"
datetime(2024, 1, 15, 10, 30, 0) → "2024-01-15T10:30:00"
```

**NULL Values**:

```python
def serialize_json_null():
    # JSON null keyword
    return None  # Python None → JSON null

# Example:
None → null
```

### Complete JSON Serialization

```python
import json

def serialize_to_json(dataset):
    output = {
        "metadata": {
            "seed": dataset.metadata['seed'],
            "timestamp": dataset.metadata['timestamp'],
            "record_count": sum(len(records) for records in dataset.tables.values())
        }
    }

    # Add each table as an array
    for table_name, records in dataset.tables.items():
        output[table_name] = []

        for record in records:
            # Convert record to JSON-serializable dict
            json_record = {}
            for col, value in record.items():
                if isinstance(value, datetime):
                    json_record[col] = value.isoformat()
                else:
                    json_record[col] = value

            output[table_name].append(json_record)

    # Serialize with pretty printing
    return json.dumps(output, indent=2, ensure_ascii=False)
```

**See**: [JSON Export Format Template](../templates/json-export-format.md) for detailed format specification

---

## Step 4: CSV Format

### CSV Structure

**One CSV File per Table**:

```text
users.csv:
id,name,email,age,created_at
1,"Sarah Chen","sarah.chen@example.com",34,"2022-07-15 10:23:45"
2,"James Wilson","james.wilson@example.com",28,"2021-03-22 14:30:12"
3,"Maria Garcia","maria.garcia@example.com",45,"2023-11-08 09:15:33"

orders.csv:
id,user_id,total,created_at
101,1,150.00,"2024-01-10 14:30:00"
102,2,75.50,"2024-01-11 09:15:00"
```

**Alternative**: Single CSV with table_name column (not recommended - loses type information)

### CSV Escaping and Quoting Rules

**Rule 1: Quote fields containing special characters**

```python
# Quote if field contains: comma, quote, newline, or carriage return
def needs_quoting(value):
    return any(char in str(value) for char in [',', '"', '\n', '\r'])
```

**Rule 2: Escape quotes by doubling them**

```python
def escape_csv_value(value):
    if needs_quoting(value):
        # Double all quotes and wrap in quotes
        escaped = str(value).replace('"', '""')
        return f'"{escaped}"'
    else:
        return str(value)

# Examples:
"O'Brien" → "O'Brien"  (contains apostrophe, no quote needed unless has comma)
"Test, Inc." → "Test, Inc."  (contains comma, needs quotes)
'He said "hello"' → "He said ""hello"""  (contains quotes, double them)
"Line 1\nLine 2" → "Line 1\nLine 2"  (contains newline, needs quotes)
```

**Rule 3: Empty strings vs NULL**

```python
def format_csv_null():
    # Empty field for NULL (no quotes)
    return ''

def format_csv_empty_string():
    # Quoted empty string for VARCHAR('')
    return '""'

# Examples:
NULL → (empty field)
'' → ""
```

### Complete CSV Serialization

```python
import csv
from io import StringIO

def serialize_to_csv(dataset):
    csv_files = {}

    for table_name, records in dataset.tables.items():
        if not records:
            continue

        # Create CSV for this table
        output = StringIO()
        columns = list(records[0].keys())

        writer = csv.DictWriter(
            output,
            fieldnames=columns,
            quoting=csv.QUOTE_MINIMAL,
            escapechar=None,
            doublequote=True,
            lineterminator='\n'
        )

        # Write header row
        writer.writeheader()

        # Write data rows
        for record in records:
            # Convert values to CSV-safe format
            csv_record = {}
            for col, value in record.items():
                if value is None:
                    csv_record[col] = ''  # NULL as empty field
                elif isinstance(value, datetime):
                    csv_record[col] = value.strftime('%Y-%m-%d %H:%M:%S')
                elif isinstance(value, date):
                    csv_record[col] = value.strftime('%Y-%m-%d')
                elif isinstance(value, bool):
                    csv_record[col] = '1' if value else '0'
                else:
                    csv_record[col] = value

            writer.writerow(csv_record)

        csv_files[f"{table_name}.csv"] = output.getvalue()

    return csv_files
```

**Output Example**:

```csv
id,name,email,age,created_at
1,Sarah Chen,sarah.chen@example.com,34,2022-07-15 10:23:45
2,James Wilson,james.wilson@example.com,28,2021-03-22 14:30:12
3,Maria Garcia,maria.garcia@example.com,45,2023-11-08 09:15:33
```

**See**: [CSV Export Format Template](../templates/csv-export-format.md) for detailed format specification

---

## Step 5: Consistency Validation

### Pre-Delivery Consistency Check

**Critical**: Before delivering any format, validate that all formats contain identical data.

```python
def validate_format_consistency(sql_output, json_output, csv_files, dataset):
    issues = []

    # 1. Record Count Validation
    sql_count = count_sql_inserts(sql_output)
    json_count = sum(len(records) for records in json_output.values() if isinstance(records, list))
    csv_count = sum(count_csv_rows(csv) for csv in csv_files.values())
    expected_count = sum(len(records) for records in dataset.tables.values())

    if sql_count != expected_count:
        issues.append(f"SQL record count mismatch: {sql_count} != {expected_count}")
    if json_count != expected_count:
        issues.append(f"JSON record count mismatch: {json_count} != {expected_count}")
    if csv_count != expected_count:
        issues.append(f"CSV record count mismatch: {csv_count} != {expected_count}")

    # 2. Primary Key Validation (spot check)
    for table_name, records in dataset.tables.items():
        if not records:
            continue

        pk_column = dataset.schema[table_name].primary_key
        expected_pks = {record[pk_column] for record in records}

        # Extract PKs from SQL
        sql_pks = extract_pks_from_sql(sql_output, table_name, pk_column)
        if sql_pks != expected_pks:
            issues.append(f"SQL PK mismatch in {table_name}: {sql_pks - expected_pks} missing")

        # Extract PKs from JSON
        json_pks = {rec[pk_column] for rec in json_output.get(table_name, [])}
        if json_pks != expected_pks:
            issues.append(f"JSON PK mismatch in {table_name}: {json_pks - expected_pks} missing")

        # Extract PKs from CSV
        csv_pks = extract_pks_from_csv(csv_files.get(f"{table_name}.csv"), pk_column)
        if csv_pks != expected_pks:
            issues.append(f"CSV PK mismatch in {table_name}: {csv_pks - expected_pks} missing")

    # 3. Foreign Key Validation (spot check)
    for table_name, records in dataset.tables.items():
        for fk in dataset.schema[table_name].foreign_keys:
            fk_column = fk.column
            expected_fks = {record[fk_column] for record in records if record[fk_column] is not None}

            # Validate FKs present in all formats
            sql_fks = extract_fks_from_sql(sql_output, table_name, fk_column)
            if sql_fks != expected_fks:
                issues.append(f"SQL FK mismatch in {table_name}.{fk_column}")

    return issues
```

### Consistency Report

```python
def generate_consistency_report(issues):
    if not issues:
        return """
## Format Consistency Validation

✅ All formats validated successfully:
- Record counts match across SQL, JSON, CSV
- Primary key values identical in all formats
- Foreign key values identical in all formats
- No data loss during serialization

**Consistency Status**: PASS
"""
    else:
        report = "## Format Consistency Validation\n\n"
        report += "❌ Consistency issues detected:\n\n"
        for issue in issues:
            report += f"- {issue}\n"
        report += "\n**Consistency Status**: FAIL\n"
        return report
```

**Constitutional Principle**: Never deliver inconsistent formats - validate before output

---

## Step 6: Multi-Format Delivery

### Organized Output Structure

**Option 1: Separate Files**

```text
output/
  users.sql
  users.json
  users.csv
  validation-report.md
  consistency-report.md
```

**Option 2: Combined Output**

```text
output/
  data.sql       # All tables in SQL
  data.json      # All tables in JSON
  users.csv      # One CSV per table
  orders.csv
  products.csv
  validation-report.md
  consistency-report.md
```

### Delivery Format

**Interactive Delivery** (Claude returns all formats):

```markdown
I've generated test data in multiple formats. Here are the outputs:

### SQL Format (users.sql)
```sql
INSERT INTO users (id, name, email) VALUES (1, 'Sarah Chen', 'sarah.chen@example.com');
...
```

### JSON Format (users.json)
```json
{
  "metadata": {...},
  "users": [...]
}
```

### CSV Format (users.csv)
```csv
id,name,email
1,Sarah Chen,sarah.chen@example.com
...
```

### Consistency Validation
✅ All formats validated successfully (see consistency report below)
```

**File-Based Delivery** (when dataset is large):

```markdown
I've generated test data in multiple formats. Files created:

- `output/users.sql` (SQL INSERT statements)
- `output/users.json` (JSON array format)
- `output/users.csv` (CSV with headers)
- `output/validation-report.md` (constraint validation)
- `output/consistency-report.md` (format consistency check)

All formats contain identical data (1,000 records, validated for consistency).
```

---

## Complete Workflow Example

### End-to-End Multi-Format Generation

```python
def generate_multi_format_data(schema, seed=42, volume=1000):
    # Step 1: Generate data ONCE
    dataset = generate_data(schema, seed=seed, volume=volume)

    # Step 2: Validate ONCE
    validation_report = validate_dataset(dataset, schema)

    # Step 3: Serialize to each format
    sql_output = serialize_to_sql(dataset)
    json_output = serialize_to_json(dataset)
    csv_files = serialize_to_csv(dataset)

    # Step 4: Validate consistency
    consistency_issues = validate_format_consistency(
        sql_output, json_output, csv_files, dataset
    )

    if consistency_issues:
        raise ConsistencyError(f"Format validation failed: {consistency_issues}")

    # Step 5: Generate consistency report
    consistency_report = generate_consistency_report(consistency_issues)

    # Step 6: Return all outputs
    return {
        'sql': sql_output,
        'json': json_output,
        'csv': csv_files,
        'validation_report': validation_report,
        'consistency_report': consistency_report,
        'metadata': dataset.metadata
    }
```

---

## Format-Specific Considerations

### SQL Format

**Pros**:
- ✅ Direct database loading
- ✅ Preserves exact data types
- ✅ Maintains referential integrity

**Cons**:
- ❌ Less readable for humans
- ❌ Requires database to execute
- ❌ Dialect-specific (PostgreSQL vs MySQL syntax differences)

**When to Use**: Loading test data into databases, database migrations, seeding

---

### JSON Format

**Pros**:
- ✅ Highly readable
- ✅ Native to JavaScript/TypeScript
- ✅ Easy to parse in any language
- ✅ Supports nested relationships

**Cons**:
- ❌ No native date/timestamp type (uses strings)
- ❌ Can be verbose for large datasets
- ❌ Floating point precision issues

**When to Use**: API fixtures, configuration files, frontend test data, mock responses

---

### CSV Format

**Pros**:
- ✅ Universal compatibility (Excel, Google Sheets, databases)
- ✅ Compact file size
- ✅ Easy to inspect and edit
- ✅ Streaming-friendly for large datasets

**Cons**:
- ❌ No type information (all values are strings)
- ❌ Limited relationship representation (one table per file)
- ❌ Escaping complexity for special characters
- ❌ No standardized NULL representation

**When to Use**: Data analysis, bulk imports, spreadsheet seeding, data exchange

---

## Examples

See multi-format exports in action:

- **[E-Commerce Schema](../examples/intermediate/ecommerce-schema.md)**: Same dataset exported to SQL, JSON, and CSV with consistency validation

---

**Related**:

- **Previous Workflow**: [Validation](04-validation.md)
- **Templates**: [SQL Insert Format](../templates/sql-insert-format.md), [JSON Export Format](../templates/json-export-format.md), [CSV Export Format](../templates/csv-export-format.md)
- **Patterns**: [Reproducibility](../patterns/reproducibility.md) - Same seed → identical output in all formats

---

**Last Updated**: 2026-01-04
