# Migration Guide: v1.0 (Docs) → v2.0 (Tool-Powered)

## Overview

This guide helps you migrate from the documentation-based Test Data Generation Skill (v1.0) to the tool-powered version (v2.0).

## Key Changes

### Architecture Change

**v1.0 (Documentation-based):**
- 13,433 lines of documentation
- Claude interprets workflows and generates code
- Inconsistent results across sessions
- Manual constraint validation

**v2.0 (Tool-powered):**
- <2,000 lines of condensed skill documentation
- Deterministic CLI tool (`@claude-code/testdatagen`)
- 100% reproducible with same seed
- Automatic constraint validation

## Installation

### Install the Tool

```bash
npm install -g @claude-code/testdatagen
```

### Verify Installation

```bash
testdatagen --version
```

## Migration Steps

### 1. Update Skill Activation

**v1.0 Prompt:**
```
Generate 1000 test records for this schema:
[paste schema]
Following the test data generation patterns...
```

**v2.0 Prompt:**
```
Generate 1000 test records for this schema using testdatagen
[paste schema or file path]
```

Claude will now invoke the tool directly instead of generating code.

### 2. Schema Format Migration

**v1.0:** Multiple schema formats (SQL, JSON, custom)

**v2.0:** Standardized on:
- SQL DDL (CREATE TABLE statements)
- Database introspection (live DB)
- Prisma schema (coming soon)

**Migration:**
```bash
# If you have a v1.0 custom schema format, convert to SQL DDL
# Or use database introspection
testdatagen introspect postgres://localhost/mydb --count 1000
```

### 3. Distribution Configuration

**v1.0:** Manual distribution code in examples

**v2.0:** Built-in distribution support

**Before (v1.0):**
```
Generate data with Zipf distribution for product_id
[Claude generates custom code for Zipf]
```

**After (v2.0):**
```bash
testdatagen generate schema.sql \
  --count 10000 \
  --distribution "orders.product_id:zipf:s=1.5"
```

### 4. Output Format Changes

**v1.0:** Primarily SQL, manual CSV/JSON export

**v2.0:** Multiple formats out-of-the-box

```bash
# SQL (same as v1.0)
testdatagen generate schema.sql --format sql

# JSON
testdatagen generate schema.sql --format json

# CSV
testdatagen generate schema.sql --format csv

# ORM fixtures
testdatagen generate schema.sql --format django
testdatagen generate schema.sql --format rails
testdatagen generate schema.sql --format prisma
```

### 5. Locale Support

**v1.0:** Primarily US locale

**v2.0:** 6 built-in locales

```bash
testdatagen generate schema.sql --locale en_US  # United States
testdatagen generate schema.sql --locale en_GB  # United Kingdom
testdatagen generate schema.sql --locale de     # German
testdatagen generate schema.sql --locale fr     # French
testdatagen generate schema.sql --locale ca     # Canadian
testdatagen generate schema.sql --locale au     # Australian
```

### 6. Edge Cases

**v1.0:** Fixed edge case examples

**v2.0:** Configurable edge case percentage

```bash
testdatagen generate schema.sql --edge-cases 10  # 10% edge cases
testdatagen generate schema.sql --edge-cases 0   # No edge cases
```

### 7. Validation

**v1.0:** Manual validation scripts

**v2.0:** Built-in validation

```bash
# Validate generated data
testdatagen validate data.sql schema.sql

# Validation happens automatically during generation
# Reports any constraint violations
```

## Feature Mapping

| v1.0 Feature | v2.0 Equivalent |
|--------------|-----------------|
| Basic generation | `testdatagen generate schema.sql --count N` |
| Custom distributions | `--distribution "column:type:params"` |
| Reproducible data | `--seed 42` |
| Multi-locale | `--locale <locale>` |
| Edge cases | `--edge-cases <percent>` |
| Validation | `testdatagen validate data.sql schema.sql` |
| Large datasets | `--streaming --batch-size 10000` |
| Custom patterns | `--custom-generator "column:pattern"` |
| Self-referencing | Automatic detection and handling |
| Circular deps | Automatic resolution |

## Configuration File Migration

### v1.0 Workflow Files

**Before:** Multiple workflow markdown files

**After:** Single configuration file

**config.json:**
```json
{
  "count": 10000,
  "seed": 42,
  "locale": "en_US",
  "format": "sql",
  "distributions": [
    {
      "column": "orders.product_id",
      "type": "zipf",
      "params": { "s": 1.5 }
    }
  ],
  "customGenerators": [
    {
      "column": "users.employee_id",
      "pattern": "EMP-#####"
    }
  ]
}
```

**Usage:**
```bash
testdatagen generate schema.sql --config config.json
```

## Performance Improvements

### v1.0 Performance

- 10k records: ~30-60 seconds (varies by Claude interpretation)
- 100k records: Not recommended (slow)
- 1M records: Not feasible

### v2.0 Performance

- 10k records: <5 seconds
- 100k records: <30 seconds
- 1M records: <60 seconds (with streaming)

**Migration for Large Datasets:**

```bash
# v2.0: Use streaming for 100k+ records
testdatagen generate schema.sql \
  --count 1000000 \
  --streaming \
  --batch-size 10000
```

## Token Efficiency

### v1.0 Token Usage

- Skill documentation: ~13,433 lines
- Per generation: High token usage for interpretation

### v2.0 Token Usage

- Skill documentation: <2,000 lines (85% reduction)
- Per generation: Minimal (tool invocation only)

**Result:** 85% reduction in token usage per request.

## Breaking Changes

### 1. Schema Format

**Breaking:** Custom schema formats no longer supported

**Migration:** Convert to SQL DDL or use database introspection

### 2. Manual Code Generation

**Breaking:** v1.0 generated code snippets; v2.0 generates data directly

**Migration:** Use CLI tool instead of requesting code

### 3. Workflow Files

**Breaking:** Workflow markdown files deprecated

**Migration:** Use configuration files or CLI flags

## Example Migrations

### Example 1: E-Commerce

**v1.0:**
```
Claude, generate 10,000 records for my e-commerce schema using Zipf distribution for products.
[Paste schema]
Make sure foreign keys are valid.
```

**v2.0:**
```bash
testdatagen generate ecommerce.sql \
  --count 10000 \
  --distribution "orders.product_id:zipf:s=1.5"
```

### Example 2: Multi-Tenant SaaS

**v1.0:**
```
Generate test data for multi-tenant SaaS with proper tenant isolation.
[Complex back-and-forth with Claude]
```

**v2.0:**
```bash
testdatagen generate saas.sql \
  --count 50000 \
  --seed 42 \
  --format sql
```

### Example 3: Hierarchical Data

**v1.0:**
```
Generate organizational hierarchy with self-referencing employee table.
[Manual tiering instructions]
```

**v2.0:**
```bash
testdatagen generate org.sql --count 5000
# Automatic hierarchical generation
```

## Troubleshooting

### "Command not found: testdatagen"

**Solution:** Install the tool globally:
```bash
npm install -g @claude-code/testdatagen
```

### "Schema parsing failed"

**Solution:** Use database introspection:
```bash
testdatagen introspect postgres://localhost/mydb --count 1000
```

### "Python not found" (for distributions)

**Solution:** Install Python dependencies:
```bash
pip install -r /path/to/testdatagen/python/requirements.txt
```

Or use without distributions:
```bash
testdatagen generate schema.sql --count 1000  # No --distribution flag
```

## FAQ

### Q: Can I still use v1.0?

**A:** Yes, v1.0 documentation is archived in the `archive/` directory. However, v2.0 is recommended for better performance and reliability.

### Q: Do I need to change my schemas?

**A:** No, if you're using standard SQL DDL. Custom formats need migration.

### Q: Is v2.0 compatible with my existing data?

**A:** Yes, v2.0 uses standard SQL INSERT statements compatible with all databases.

### Q: Can I use both v1.0 and v2.0?

**A:** Yes, but we recommend migrating fully to v2.0 for consistency.

### Q: What if I need features not in v2.0?

**A:** Please open an issue on GitHub. We're actively developing new features.

## Getting Help

- **Documentation:** https://claude-code.github.io/testdatagen
- **Issues:** https://github.com/claude-code/testdatagen/issues
- **Discussions:** https://github.com/claude-code/testdatagen/discussions

## Next Steps

1. Install the tool: `npm install -g @claude-code/testdatagen`
2. Try the examples: `testdatagen generate examples/ecommerce.sql --count 100`
3. Migrate your schemas to SQL DDL format
4. Create configuration files for complex scenarios
5. Update your Claude prompts to reference the tool

---

**Migration Support:** If you encounter issues, please open a GitHub issue with the `migration` label.
