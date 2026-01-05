# Test Data Generation Skill

A comprehensive Claude Code skill that generates realistic, constraint-valid test data for relational databases.

## Overview

This skill teaches Claude how to generate production-quality test data that respects **all** database constraints while following realistic patterns. When you request test data, Claude analyzes your schema, generates constraint-valid records, validates the output, and delivers SQL/JSON/CSV files with a validation report proving 100% constraint satisfaction.

### Key Features

- ✅ **100% Constraint Compliance**: Primary keys, foreign keys, unique, NOT NULL, check constraints, data types
- ✅ **Production-Like Patterns**: Realistic US names, addresses, emails, phone numbers, temporal distributions
- ✅ **Referential Integrity**: Topological generation (parent entities before children), no orphan records
- ✅ **Edge Case Coverage**: Boundary values, special characters, min/max lengths at configurable percentage (default 5%)
- ✅ **Pre-Delivery Validation**: Comprehensive validation report, zero violations guarantee
- ✅ **Multi-Format Export**: SQL INSERT, JSON array, CSV with consistency validation across formats

## Quick Start

### Installation

This is a Claude Code skill - no installation needed! Just use it with Claude Code CLI or VSCode extension.

### Basic Usage

Simply ask Claude naturally:

```text
"Generate 100 users for this schema"
"I need test data for an e-commerce database"
"Create realistic sample data with edge cases"
```

### Example Interaction

**You provide a schema:**

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INT CHECK (age >= 18)
);
```

**You ask:**

```text
"Generate 10 users for this schema"
```

**Claude delivers:**

1. **Generated SQL** with constraint-valid data:

   ```sql
   INSERT INTO users (id, email, age) VALUES
     (1, 'sarah.chen@example.com', 34),
     (2, 'james.wilson@example.com', 28),
     (3, 'maria.garcia@example.com', 45),
     (4, 'robert.johnson@example.com', 52),
     (5, 'linda.martinez@example.com', 29),
     (6, 'michael.brown@example.com', 41),
     (7, 'jennifer.davis@example.com', 36),
     (8, 'william.miller@example.com', 38),
     (9, 'edge+case@example.com', 18),  -- Edge: min age boundary
     (10, 'final.user@example.com', 30);
   ```

2. **Validation Report** confirming:

   - ✅ All emails unique (10/10)
   - ✅ All ages >= 18 (10/10)
   - ✅ No NULL values in required fields (10/10)
   - ✅ Edge case coverage: 10% (1 record with age=18)

## How It Works

### 1. Schema Analysis

Claude parses your SQL DDL to extract all constraints:

- Primary keys (PK)
- Foreign keys (FK) with cascade semantics
- Unique constraints
- NOT NULL constraints
- CHECK constraints (range checks, enums)
- Data types with precision/scale/length

### 2. Dependency Graphing

Claude builds a dependency graph from foreign keys and performs topological sort:

```text
users (no deps) → orders (depends on users) → order_items (depends on orders + products)
```

This ensures referential integrity by generating parent entities before children.

### 3. Data Generation

Claude generates data table-by-table in topological order:

**Constraint Satisfaction:**

- **Primary Keys**: Sequential (1, 2, 3...) or UUIDs
- **Foreign Keys**: Select from parent PK pool
- **Unique Values**: Track used values to prevent duplicates
- **NOT NULL**: Always generate values (no skip logic)
- **CHECK Constraints**: Parse conditions and satisfy them

**Realistic Patterns:**

- Names from US distributions (Martinez, Wilson, Garcia, Nguyen, Taylor)
- Emails with realistic domains (gmail, yahoo, outlook, icloud)
- Phone numbers in (XXX) XXX-XXXX format
- Addresses with US state codes and ZIP codes
- Temporal patterns (more orders on weekdays)
- Statistical distributions (Zipf for popularity, Normal for measurements)

**Edge Cases:**

- Boundary values (age=18 for CHECK age >= 18)
- Max length strings (255-char names for VARCHAR(255))
- Special characters (O'Brien, test+tag@example.com)
- Epoch timestamps (1970-01-01)
- NULL values for nullable fields

### 4. Validation

Before delivery, Claude validates:

- ✅ All primary keys unique
- ✅ All foreign keys resolve to existing parents
- ✅ All unique constraints satisfied
- ✅ All NOT NULL fields populated
- ✅ All CHECK constraints satisfied
- ✅ All data types match schema
- ✅ Referential integrity 100% (no orphans)

**Data that fails validation is never delivered.**

### 5. Export Formats

Claude can export to multiple formats with guaranteed consistency:

**SQL INSERT:**

```sql
INSERT INTO users (id, name, email) VALUES (1, 'Sarah Chen', 'sarah.chen@example.com');
```

**JSON:**

```json
{
  "metadata": {"seed": 42, "record_count": 1},
  "users": [{"id": 1, "name": "Sarah Chen", "email": "sarah.chen@example.com"}]
}
```

**CSV:**

```csv
id,name,email
1,Sarah Chen,sarah.chen@example.com
```

All formats contain **identical data** (single generation pass → multiple serializations).

## Advanced Features

### Multi-Table Schemas

```sql
CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE
);
```

**Request:** "Generate 5 users and 20 orders"

Claude automatically:

1. Generates users first (no dependencies)
2. Generates orders second (depends on users)
3. Ensures all orders.user_id reference valid users
4. Respects ON DELETE CASCADE semantics

### Self-Referencing Foreign Keys

```sql
CREATE TABLE employees (
    id INT PRIMARY KEY,
    manager_id INT REFERENCES employees(id)
);
```

Claude uses **tiered generation**:

1. Tier 1: Root employees (manager_id = NULL)
2. Tier 2-4: Employees with managers from previous tiers

Result: Valid organizational hierarchy with no orphans.

### Circular Dependencies

```sql
CREATE TABLE users (primary_org_id INT REFERENCES organizations(id));
CREATE TABLE organizations (owner_id INT REFERENCES users(id) NOT NULL);
```

Claude breaks the cycle using nullable FKs:

1. Generate users with primary_org_id = NULL
2. Generate organizations with valid owner_id
3. Update users to set primary_org_id

### Multi-Tenant Systems

```sql
CREATE TABLE tenants (id INT PRIMARY KEY);
CREATE TABLE users (
    tenant_id INT REFERENCES tenants(id),
    UNIQUE (tenant_id, email)  -- Scoped uniqueness
);
```

Claude maintains tenant isolation with cross-tenant CHECK constraints.

### Realistic Distributions

**Zipf Distribution** (for popularity):

```text
Product popularity: USB-C Cable (47%), Headphones (20%), Keyboard (7%)
```

**Normal Distribution** (for measurements):

```text
Order totals: mean=$102.64, clustered around $100 ± $35
```

**Temporal Patterns**:

```text
75% weekday orders, 25% weekend orders
```

## Usage Examples

### Example 1: E-Commerce Database

```sql
CREATE TABLE users (id INT PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL);
CREATE TABLE products (id INT PRIMARY KEY, price DECIMAL(10,2) CHECK (price >= 0));
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    total DECIMAL(10,2) CHECK (total >= 0)
);
CREATE TABLE order_items (
    order_id INT REFERENCES orders(id),
    product_id INT REFERENCES products(id),
    quantity INT CHECK (quantity > 0),
    PRIMARY KEY (order_id, product_id)
);
```

**Request:**

```text
"Generate realistic e-commerce data: 100 users, 50 products, 200 orders with
realistic product popularity (Zipf distribution) and order totals (Normal distribution)"
```

**Claude delivers:**

- 100 users with realistic US names and emails
- 50 products with realistic prices
- 200 orders with Zipf-distributed product popularity
- Order totals following normal distribution (mean=$100)
- Validation report confirming 100% constraint satisfaction
- Export in SQL, JSON, and CSV formats

### Example 2: Blog Platform

```sql
CREATE TABLE users (id INT PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL);
CREATE TABLE posts (
    id INT PRIMARY KEY,
    author_id INT REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP
);
CREATE TABLE comments (
    id INT PRIMARY KEY,
    post_id INT REFERENCES posts(id),
    user_id INT REFERENCES users(id),
    created_at TIMESTAMP
);
```

**Request:**

```text
"Generate blog data with realistic patterns: 50 users, 200 posts (with power law
distribution - 20% of users write 80% of posts), 500 comments"
```

**Claude delivers:**

- Power authors who write many posts
- Regular users who write few posts
- Temporal patterns (posts over time)
- Comments correlated with post popularity

## Configuration Options

### Record Volume

```text
"Generate 1000 users"
"I need 50-100 records per table"
```

### Output Format

```text
"Export to SQL"
"Generate in JSON format"
"I need CSV files"
"Export to all formats (SQL, JSON, CSV)"
```

### Edge Case Coverage

```text
"Include 10% edge cases"
"No edge cases please"
"Default edge case coverage" (5%)
```

### Seed for Reproducibility

```text
"Use seed 42 for reproducibility"
"Same seed as last time"
```

### Locale

```text
"Use US English patterns" (default)
"Generate UK addresses"
```

### Distribution Types

```text
"Use Zipf distribution for product popularity"
"Normal distribution for measurements"
"Uniform distribution" (default)
```

## Documentation

### For Users

- **[SKILL.md](.claude/skills/test-data-generation/SKILL.md)**: Main entry point - skill overview and quick start
- **[Examples](.claude/skills/test-data-generation/examples/)**: Working examples by complexity
  - **Basic**: Single-table schemas
  - **Intermediate**: Multi-table with FK relationships
  - **Advanced**: Complex scenarios (circular FKs, self-referencing, multi-tenant)

### For Developers

- **[README.md](.claude/skills/test-data-generation/README.md)**: Developer guide - extending the skill
- **[Workflows](.claude/skills/test-data-generation/workflows/)**: Step-by-step generation processes
- **[Patterns](.claude/skills/test-data-generation/patterns/)**: Reusable generation patterns
- **[Templates](.claude/skills/test-data-generation/templates/)**: Output format specifications

## Troubleshooting

### "Invalid DDL syntax"

**Solution**: Provide standard SQL DDL (PostgreSQL or MySQL dialect). Avoid database-specific extensions.

### "Unable to satisfy CHECK constraint"

**Solution**: Verify CHECK constraints are satisfiable (e.g., not `age > 100 AND age < 18`).

### "Unable to generate unique value"

**Solution**: Increase record volume or check if requested volume exceeds unique value space.

### "Post-generation constraint violation"

**Solution**: This should never happen (indicates a bug). Report with schema and seed for reproducibility.

For more help, see [Troubleshooting Guide](.claude/skills/test-data-generation/guidelines/troubleshooting.md).

## Constitutional Principles

All generated data must satisfy these **non-negotiable** principles:

1. **Database Constraint Compliance** (MANDATORY): All constraints satisfied, zero violations
2. **Production-Like Data Patterns**: Realistic names, addresses, emails, temporal patterns
3. **Referential Integrity Maintenance**: All FKs resolve, no orphans, topological generation
4. **Edge Case Coverage**: Boundary values at configurable percentage (default 5%)
5. **Validation Before Delivery** (MANDATORY): Pre-delivery validation report required

**Constraint-first principle**: If an edge case violates a constraint, skip the edge case (constraints always win).

## Project Structure

```text
.claude/skills/test-data-generation/
├── SKILL.md                    # Main entry point
├── README.md                   # Developer guide
├── workflows/                  # 5 step-by-step workflows
├── patterns/                   # 5 reusable patterns
├── examples/                   # 8 working examples
│   ├── basic/                  # 2 basic examples
│   ├── intermediate/           # 3 intermediate examples
│   └── advanced/               # 3 advanced examples
├── templates/                  # 4 output format specs
└── guidelines/                 # 3 quality standards

Total: 26 markdown files, 13,433 lines of documentation
```

## Contributing

To improve this skill:

1. **Add Examples**: Cover new schema patterns (geospatial, JSON columns, arrays)
2. **Add Patterns**: Document new generation strategies (time-series, hierarchical data)
3. **Add Locales**: Extend beyond US English (UK, EU, Asia-Pacific)
4. **Improve Validation**: Add statistical tests, distribution verification

See [Developer Guide](.claude/skills/test-data-generation/README.md) for details.

## License

Open for use with Claude Code.

## Support

- **Quick Start**: [SKILL.md](.claude/skills/test-data-generation/SKILL.md)
- **Examples**: Browse [examples/](.claude/skills/test-data-generation/examples/)
- **Troubleshooting**: [guidelines/troubleshooting.md](.claude/skills/test-data-generation/guidelines/troubleshooting.md)
- **Common Issues**: [guidelines/common-pitfalls.md](.claude/skills/test-data-generation/guidelines/common-pitfalls.md)

---

**Built with ❤️ for Claude Code**
