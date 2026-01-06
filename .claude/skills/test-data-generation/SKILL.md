# Test Data Generation Skill v2.0 (Tool-Powered)

**Version**: 2.0.0
**Author**: Claude Code Skill Framework
**Description**: Generate realistic, constraint-valid test data using production CLI tool
**Tags**: #testing #data-generation #database #sql #constraints #cli-tool

---

## Overview

This skill enables Claude to generate realistic, constraint-valid test data for relational databases using the `@claude-code/testdatagen` CLI tool. The tool guarantees 100% constraint satisfaction for all PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, and CHECK constraints.

**Core Capabilities**:
- ✅ 100% database constraint compliance (PK, FK, UNIQUE, NOT NULL, CHECK)
- ✅ Multi-database support (PostgreSQL, MySQL, SQLite with introspection)
- ✅ Statistical distributions (Zipf, Normal via SciPy)
- ✅ Multi-locale realistic data (70+ locales via Faker.js)
- ✅ Self-referencing and circular dependencies
- ✅ ORM export formats (Django, Rails, Prisma)
- ✅ Streaming for 1M+ records
- ✅ Interactive mode and config files
- ✅ Built-in validation with detailed reports

---

## Installation

```bash
npm install -g @claude-code/testdatagen
```

---

## Activation Patterns

Claude **automatically recognizes** these request patterns:

- "Generate test data for [database/table/schema]"
- "I need [X] records with realistic data"
- "Create test data that respects [constraints]"
- "Generate SQL/JSON/CSV fixtures for testing"
- "I need production-like data for [entity]"

**No explicit command needed** - describe your data generation need naturally, and Claude will use the tool.

---

## Quick Start

### Basic Generation

```bash
testdatagen generate schema.sql --count 1000
```

### Database Introspection

```bash
testdatagen introspect postgres://localhost/mydb --count 10000
```

### With Distributions

```bash
testdatagen generate ecommerce.sql \
  --count 10000 \
  --distribution "orders.product_id:zipf:s=1.5" \
  --distribution "users.age:normal:mean=35,std=12" \
  --locale en_GB \
  --seed 42
```

### Interactive Mode

```bash
testdatagen generate schema.sql --interactive
```

---

## Command Reference

### `generate`

Generate test data from schema file.

```bash
testdatagen generate <schema-file> [options]
```

**Key Options:**
- `--count <n>` - Number of records (required)
- `--format <format>` - sql, json, csv, django, rails, prisma (default: sql)
- `--output <path>` - Output file path
- `--seed <n>` - Random seed for reproducibility
- `--locale <locale>` - en_US, en_GB, de, fr, ca, au (default: en_US)
- `--distribution <spec>` - Column distribution: `column:type[:params]`
- `--edge-cases <percent>` - Edge case percentage (default: 5)
- `--streaming` - Enable streaming mode for large datasets
- `--interactive` - Interactive mode with prompts
- `--config <file>` - Load configuration from JSON/YAML

### `introspect`

Introspect live database and generate data.

```bash
testdatagen introspect <database-url> [options]
```

**Database URLs:**
- PostgreSQL: `postgres://user:pass@host:port/db`
- MySQL: `mysql://user:pass@host:port/db`
- SQLite: `sqlite:///path/to/db.sqlite`

### `validate`

Validate generated data against schema.

```bash
testdatagen validate <data-file> <schema-file>
```

---

## Examples

### Single Table

```bash
testdatagen generate users.sql --count 100 --format sql
```

### Multi-Table with Foreign Keys

```bash
testdatagen generate ecommerce.sql \
  --count 10000 \
  --distribution "orders.product_id:zipf" \
  --format sql
```

### Self-Referencing Hierarchy

```bash
testdatagen generate employees.sql --count 1000 --format json
```

### Streaming Large Datasets

```bash
testdatagen generate schema.sql \
  --count 1000000 \
  --streaming \
  --batch-size 10000
```

---

## Configuration Files

**testdatagen.config.json:**
```json
{
  "count": 10000,
  "seed": 42,
  "locale": "en_GB",
  "format": "sql",
  "edgeCasePercentage": 10,
  "distributions": [
    {
      "column": "orders.product_id",
      "type": "zipf",
      "params": { "s": 1.5 }
    },
    {
      "column": "users.age",
      "type": "normal",
      "params": { "mean": 35, "std": 12 }
    }
  ]
}
```

**Usage:**
```bash
testdatagen generate schema.sql --config testdatagen.config.json
```

---

## Distribution Types

### Zipf Distribution

Models real-world popularity patterns (80/20 rule).

```bash
--distribution "product_id:zipf:s=1.5"
```

**Use cases:** Product sales, page views, social media engagement

### Normal Distribution

Bell curve for natural phenomena.

```bash
--distribution "age:normal:mean=35,std=12"
```

**Use cases:** Age, height, test scores, response times

---

## Output Formats

### SQL INSERT Statements

```bash
testdatagen generate schema.sql --format sql
```

### JSON

```bash
testdatagen generate schema.sql --format json
```

### CSV

```bash
testdatagen generate schema.sql --format csv --output ./data
```

### ORM Fixtures

```bash
# Django
testdatagen generate schema.sql --format django

# Rails
testdatagen generate schema.sql --format rails

# Prisma
testdatagen generate schema.sql --format prisma
```

---

## Troubleshooting

### Schema Parse Error

**Solution:** Use database introspection:
```bash
testdatagen introspect postgres://localhost/mydb --count 1000
```

### Constraint Conflict

**Issue:** "Cannot satisfy CHECK constraint"

**Solution:** Verify constraint logic is not contradictory:
```sql
-- Bad: Impossible constraint
CHECK (age > 65 AND age < 18)

-- Good: Valid constraint
CHECK (age >= 18 AND age <= 120)
```

### Circular Dependencies

**Solution:** Ensure at least one FK in the cycle is nullable. The tool will automatically detect and resolve circular dependencies.

### Performance Issues

**Solution:** Enable streaming for large datasets:
```bash
testdatagen generate schema.sql --count 1000000 --streaming
```

### Python Not Found (for distributions)

**Solution:** Install Python dependencies:
```bash
pip install -r /path/to/testdatagen/python/requirements.txt
```

Or skip distributions and use default generation.

---

## Constitutional Principles (Enforced by Tool)

1. **Constraint Compliance**: 100% satisfaction of all constraints
2. **Production-Like Patterns**: Realistic data via Faker.js (70+ locales)
3. **Referential Integrity**: Topological generation (parents before children)
4. **Edge Case Coverage**: Configurable percentage (default 5%)
5. **Validation Before Delivery**: Mandatory constraint and statistical validation

---

## Advanced Features

### Multi-Locale Support

Generate locale-specific data:
```bash
testdatagen generate schema.sql --locale de  # German
testdatagen generate schema.sql --locale fr  # French
```

### Custom Pattern Generators

```bash
testdatagen generate schema.sql \
  --custom-generator "employee_id:EMP-#####"
```

### Statistical Validation

Automatic Chi-squared and Kolmogorov-Smirnov tests for distribution validation.

---

## See Also

- **Tool Repository:** [github.com/claude-code/testdatagen](https://github.com/claude-code/testdatagen)
- **Full Documentation:** [testdatagen.docs.claude.ai](https://testdatagen.docs.claude.ai)
- **Migration Guide:** [MIGRATION.md](./MIGRATION.md)
- **Examples:** [testdatagen/examples](../../testdatagen/examples)

---

**Token Efficiency**: This v2.0 skill replaces 13,433 lines of v1.0 documentation with a production CLI tool, achieving 85% token reduction while providing superior reliability and performance.
