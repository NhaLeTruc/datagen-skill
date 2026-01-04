# Template: CSV Export Format

**Purpose**: Standard CSV structure for exporting generated test data

**Use Case**: Spreadsheet analysis, bulk imports, data exchange, database seeding

---

## Format Specification

### File Structure

**One CSV File per Table**:

```text
users.csv:
id,name,email,age,created_at
1,Sarah Chen,sarah.chen@example.com,34,2022-07-15 10:23:45
2,James Wilson,james.wilson@example.com,28,2021-03-22 14:30:12
3,Maria Garcia,maria.garcia@example.com,45,2023-11-08 09:15:33

products.csv:
id,name,sku,price,stock
1,Wireless Headphones,PROD-1234-A5B,79.99,150
2,USB-C Cable,PROD-5678-C2D,12.99,500

orders.csv:
id,user_id,total,status,created_at
101,1,172.97,completed,2024-01-10 14:30:00
102,2,79.99,pending,2024-01-11 09:15:00
```

**Key Points**:
- First row: header with column names
- Subsequent rows: data records
- One row per record
- Columns separated by commas
- No type information (all values are text)

---

## Header Row

### Column Name Format

```csv
id,name,email,age,created_at
```

**Rules**:
- Column names exactly match schema column names
- No quotes around column names (unless names contain special chars)
- Same order as schema definition (or alphabetical)
- No spaces around commas

**Special Characters in Column Names**:

```csv
"user id","user,name","user email"
```

If column names contain commas, quotes, or newlines, quote the header field.

---

## Data Rows

### Basic Format

```csv
id,name,email
1,Sarah Chen,sarah.chen@example.com
2,James Wilson,james.wilson@example.com
3,Maria Garcia,maria.garcia@example.com
```

**Rules**:
- One record per line
- Fields separated by commas
- No spaces around commas (unless part of the value)
- Line ending: `\n` (LF) or `\r\n` (CRLF)

---

## Quoting and Escaping Rules

### Rule 1: Quote Fields Containing Special Characters

**Special characters requiring quotes**:
- Comma (`,`)
- Double quote (`"`)
- Newline (`\n` or `\r\n`)

```csv
id,name,company
1,Sarah Chen,"Tech, Inc."
2,James Wilson,DataCorp
3,Maria Garcia,"Garcia & Associates, LLC"
```

**Why**: Comma inside field would break parsing without quotes

---

### Rule 2: Escape Quotes by Doubling Them

```csv
id,name,bio
1,Sarah Chen,"She said ""hello"" to everyone"
2,James Wilson,Software engineer
3,Maria Garcia,"Expert in ""data science"" and AI"
```

**Rule**: Inside quoted field, `"` becomes `""`

**Examples**:
- `He said "hello"` → `"He said ""hello"""`
- `It's a "test"` → `"It's a ""test"""`
- `"quoted"` → `"""quoted"""`

---

### Rule 3: Preserve Newlines in Quoted Fields

```csv
id,name,notes
1,Sarah Chen,"Line 1
Line 2
Line 3"
2,James Wilson,"Single line note"
```

**Rule**: Newlines inside quoted fields are preserved literally

---

## Data Type Serialization

### Strings (VARCHAR, TEXT)

```csv
id,name,bio
1,Sarah Chen,Software engineer
2,James Wilson,"Works at Tech, Inc."
3,Maria Garcia,"Expert in ""data science"""
```

**Rules**:
- Quote if contains: comma, quote, newline
- Escape quotes by doubling them
- No maximum length enforcement (CSV has no type system)

---

### Numbers (INT, DECIMAL)

```csv
id,age,price,balance
1,34,79.99,-150.50
2,28,12.99,0.00
3,45,99.00,1000000.00
```

**Rules**:
- No quotes (unless required by special chars)
- Negative numbers: use `-` prefix
- Decimals: use period `.` (not comma)
- No thousands separators
- Scientific notation allowed: `1.5e6` (but not recommended)

**Edge Cases**:
```csv
zero,negative,max_int,max_decimal
0,-100,2147483647,99999999.99
```

---

### Booleans

**Option 1: 1/0 (Recommended)**

```csv
id,is_active,is_deleted
1,1,0
2,1,0
3,0,1
```

**Option 2: true/false**

```csv
id,is_active,is_deleted
1,true,false
2,true,false
3,false,true
```

**Option 3: TRUE/FALSE**

```csv
id,is_active,is_deleted
1,TRUE,FALSE
2,TRUE,FALSE
3,FALSE,TRUE
```

**Recommendation**: Use `1/0` for compatibility with spreadsheets and databases

---

### Dates and Timestamps

**Date Format**: `YYYY-MM-DD` (ISO 8601)

```csv
id,birth_date,hire_date
1,1990-05-15,2020-01-10
2,1985-03-22,2018-06-15
3,1992-11-08,2021-09-01
```

**Timestamp Format**: `YYYY-MM-DD HH:MM:SS` (no timezone)

```csv
id,created_at,updated_at
1,2022-07-15 10:23:45,2024-01-04 14:30:00
2,2021-03-22 14:30:12,2024-01-05 09:15:00
3,2023-11-08 09:15:33,2024-01-06 16:45:00
```

**Alternative**: ISO 8601 with timezone

```csv
id,created_at
1,2022-07-15T10:23:45Z
2,2021-03-22T14:30:12Z
```

**Recommendation**: Use `YYYY-MM-DD HH:MM:SS` for simplicity, `YYYY-MM-DDTHH:MM:SSZ` for precision

**Edge Cases**:
```csv
epoch,y2k38,far_future
1970-01-01 00:00:00,2038-01-19 03:14:07,2099-12-31 23:59:59
```

---

### NULL Values

**Option 1: Empty Field (Recommended)**

```csv
id,middle_name,phone,notes
1,,,
2,Marie,555-1234,
3,,555-5678,Some notes
```

**Option 2: Literal "NULL" String**

```csv
id,middle_name,phone,notes
1,NULL,NULL,NULL
2,Marie,555-1234,NULL
3,NULL,555-5678,Some notes
```

**Option 3: Backslash-N (PostgreSQL COPY format)**

```csv
id,middle_name,phone,notes
1,\N,\N,\N
2,Marie,555-1234,\N
3,\N,555-5678,Some notes
```

**Recommendation**: Use empty fields (Option 1) for standard CSV, `\N` for PostgreSQL COPY compatibility

**Distinction from Empty String**:

```csv
id,nullable_field,empty_string_field
1,,""
2,Marie,""
```

- Empty field (no characters) = `NULL`
- Quoted empty string (`""`) = empty string `''`

**Note**: Most CSV parsers treat both as empty, losing NULL distinction. Document NULL strategy in metadata.

---

## Multi-Table Export

### Directory Structure

```text
output/
  users.csv
  products.csv
  orders.csv
  order_items.csv
  _metadata.txt
```

### Metadata File (_metadata.txt)

```text
Generated: 2024-01-04 10:30:00 UTC
Seed: 42
Record Count: 13
Tables: users, products, orders, order_items
Generator Version: 1.0
NULL Representation: empty field
Boolean Format: 1/0
Date Format: YYYY-MM-DD
Timestamp Format: YYYY-MM-DD HH:MM:SS
```

**Purpose**: Document format conventions, enable reproducibility

---

## Complete Example

### users.csv

```csv
id,name,email,created_at
1,Sarah Martinez,sarah.martinez@example.com,2022-03-15 10:00:00
2,James Wilson,james.wilson@example.com,2022-06-22 14:30:00
3,Maria Garcia,maria.garcia@example.com,2023-01-10 09:15:00
```

### products.csv

```csv
id,name,sku,price,stock,created_at
1,Wireless Headphones,PROD-1234-A5B,79.99,150,2023-05-01 12:00:00
2,USB-C Cable,PROD-5678-C2D,12.99,500,2023-05-15 15:30:00
```

### orders.csv

```csv
id,user_id,total,status,created_at
101,1,172.97,completed,2024-01-10 14:30:00
102,2,79.99,pending,2024-01-11 09:15:00
```

### order_items.csv

```csv
id,order_id,product_id,quantity,price
1,101,1,2,79.99
2,101,2,1,12.99
3,102,1,1,79.99
```

---

## Foreign Key Representation

### FK as ID Reference

```csv
order_id,user_id,product_id
101,1,1
102,2,1
```

**Key Points**:
- Foreign keys represented as ID values (same as in relational DB)
- No nested structures (CSV is flat)
- Cross-reference by matching ID values across files
- Referential integrity not enforced by format (validate separately)

---

## Special Characters Examples

### Commas

```csv
id,name,address
1,Sarah Chen,"123 Main St, Apt 4B"
2,James Wilson,"456 Oak Ave, Suite 200"
```

**Rule**: Quote field if contains comma

---

### Quotes

```csv
id,name,bio
1,Sarah Chen,"She said ""hello"" yesterday"
2,James Wilson,Software engineer
```

**Rule**: Double all quotes inside quoted field

---

### Newlines

```csv
id,name,notes
1,Sarah Chen,"Line 1
Line 2
Line 3"
2,James Wilson,Single line
```

**Rule**: Quote field if contains newline, preserve newline literally

---

### Unicode and Special Characters

```csv
id,name,bio
1,María García,Española
2,李明,中文名字
3,Владимир,Русский текст
4,😀 Emoji,"User with emoji in name"
```

**Encoding**: Always use UTF-8 with BOM for Excel compatibility

**File Encoding Declaration** (for Excel):
```csv
ï»¿id,name,bio
1,María García,Española
```

**BOM**: `\xEF\xBB\xBF` (UTF-8 Byte Order Mark) at file start

---

## Line Endings

### Unix (LF)

```text
id,name\n
1,Sarah\n
2,James\n
```

**Character**: `\n` (0x0A)

---

### Windows (CRLF)

```text
id,name\r\n
1,Sarah\r\n
2,James\r\n
```

**Characters**: `\r\n` (0x0D 0x0A)

---

**Recommendation**: Use LF (`\n`) for consistency across platforms. Windows tools handle both.

---

## CSV Dialect Specification

### Python csv Module Settings

```python
import csv

# Recommended settings for standard CSV
csv.writer(
    file,
    delimiter=',',           # Field separator
    quotechar='"',           # Quote character
    quoting=csv.QUOTE_MINIMAL,  # Quote only when needed
    doublequote=True,        # Escape quotes by doubling
    lineterminator='\n',     # Line ending
    escapechar=None          # No escape character (use doubling)
)
```

### RFC 4180 Compliance

Standard CSV format defined by RFC 4180:

1. Each record on separate line
2. Last record may or may not have line ending
3. Optional header line
4. Fields separated by comma
5. Fields may be quoted with double quotes
6. If field contains comma, quote, or newline → must quote
7. If field contains quote → escape by doubling (`"` → `""`)

---

## Common Pitfalls

### ❌ DON'T: Use Commas in Unquoted Fields

```csv
// BAD: Comma breaks parsing
id,company
1,Tech, Inc.
2,Data Corp

// GOOD: Quote fields with commas
id,company
1,"Tech, Inc."
2,Data Corp
```

---

### ❌ DON'T: Forget to Escape Quotes

```csv
// BAD: Unescaped quotes
id,bio
1,"She said "hello""

// GOOD: Double the quotes
id,bio
1,"She said ""hello"""
```

---

### ❌ DON'T: Mix Quote Styles

```csv
// BAD: Inconsistent quoting
id,name
1,Sarah Chen
2,"James Wilson"
3,Maria Garcia

// GOOD: Consistent (quote only when needed)
id,name
1,Sarah Chen
2,James Wilson
3,Maria Garcia
```

---

### ❌ DON'T: Use Non-Standard Delimiters Without Documentation

```csv
// BAD: Using semicolon without metadata
id;name;email
1;Sarah;sarah@example.com

// GOOD: Use standard comma
id,name,email
1,Sarah,sarah@example.com
```

---

## Best Practices

### ✅ DO: Include Header Row

```csv
id,name,email
1,Sarah,sarah@example.com
```

**Why**: Column identification, tool compatibility

---

### ✅ DO: Use UTF-8 Encoding with BOM (for Excel)

```python
with open('output.csv', 'w', encoding='utf-8-sig') as f:
    # utf-8-sig adds BOM for Excel compatibility
    writer = csv.writer(f)
```

**Why**: Excel correctly detects UTF-8 encoding

---

### ✅ DO: Document Format Conventions

Create `_metadata.txt` file documenting:
- NULL representation
- Boolean format
- Date/timestamp format
- Encoding
- Line endings

---

### ✅ DO: Validate After Generation

```python
# Validate row count matches expected
with open('users.csv', 'r') as f:
    reader = csv.reader(f)
    header = next(reader)
    row_count = sum(1 for row in reader)
    assert row_count == expected_count
```

---

## Tool-Specific Formats

### PostgreSQL COPY Format

```csv
id	name	email	created_at
1	Sarah Chen	sarah.chen@example.com	2022-07-15 10:23:45
2	James Wilson	james.wilson@example.com	2021-03-22 14:30:12
\N	\N	\N	\N
```

**Differences**:
- Tab-separated (not comma)
- `\N` for NULL
- No quoting or escaping

---

### MySQL LOAD DATA Format

```csv
id,name,email,created_at
1,"Sarah Chen","sarah.chen@example.com","2022-07-15 10:23:45"
2,"James Wilson","james.wilson@example.com","2021-03-22 14:30:12"
```

**Settings**:
```sql
LOAD DATA LOCAL INFILE 'users.csv'
INTO TABLE users
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

---

### Excel CSV Format

```csv
ï»¿id,name,email
1,Sarah Chen,sarah.chen@example.com
```

**Requirements**:
- UTF-8 with BOM (`\xEF\xBB\xBF`)
- Quote fields with commas
- CRLF line endings (optional)

---

## Related

- **Workflow**: [Export Formats](../workflows/05-export-formats.md)
- **Templates**: [SQL Insert Format](sql-insert-format.md), [JSON Export Format](json-export-format.md)
- **Examples**: [E-Commerce Schema](../examples/intermediate/ecommerce-schema.md) - Multi-format export

---

**Last Updated**: 2026-01-04
