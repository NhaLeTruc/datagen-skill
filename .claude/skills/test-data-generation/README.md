# Test Data Generation Skill

A comprehensive Claude Code skill for generating realistic, constraint-valid test data for relational databases.

## Overview

This skill enables Claude to generate production-quality test data that:
- ✅ Respects ALL database constraints (PK, FK, unique, NOT NULL, check constraints, data types)
- ✅ Follows realistic patterns (US locale names, addresses, emails, temporal distributions)
- ✅ Maintains referential integrity (parent entities generated before children)
- ✅ Includes edge cases (boundary values, special characters, min/max lengths)
- ✅ Validates before delivery (100% constraint satisfaction guarantee)
- ✅ Exports to multiple formats (SQL INSERT, JSON, CSV) with consistency

## Quick Start

### Using the Skill

Just ask Claude naturally:

```text
"Generate 100 users for this schema"
"I need test data for an e-commerce database"
"Create realistic sample data with edge cases"
```

Provide your SQL DDL, and Claude will:
1. Parse the schema to extract all constraints
2. Build a dependency graph to determine generation order
3. Generate constraint-valid data with realistic patterns
4. Validate 100% constraint satisfaction
5. Export to your preferred format (SQL, JSON, or CSV)
6. Deliver with a comprehensive validation report

### Example Interaction

**You:**
```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INT CHECK (age >= 18)
);
```
"Generate 10 users"

**Claude Delivers:**
- ✅ 10 constraint-valid user records
- ✅ All emails unique
- ✅ All ages >= 18
- ✅ Realistic US names and emails
- ✅ 5% edge case coverage (age=18, special chars in email)
- ✅ Validation report confirming zero violations

## File Structure

```text
.claude/skills/test-data-generation/
├── SKILL.md                          # Main entry point - skill overview
├── README.md                         # This file - developer guide
│
├── workflows/                        # Step-by-step generation processes
│   ├── 01-schema-analysis.md         # Parse SQL DDL, extract constraints
│   ├── 02-dependency-graphing.md     # Build FK graph, topological sort
│   ├── 03-data-generation.md         # Generate constraint-valid data
│   ├── 04-validation.md              # Pre-delivery validation checklist
│   └── 05-export-formats.md          # Export to SQL/JSON/CSV
│
├── patterns/                         # Reusable generation patterns
│   ├── constraint-handling.md        # How to satisfy each constraint type
│   ├── reproducibility.md            # Seed-based deterministic generation
│   ├── distribution-strategies.md    # Zipf, Normal, Uniform distributions
│   ├── locale-patterns.md            # US English names, addresses, phones
│   └── edge-case-catalog.md          # Type-specific boundary values
│
├── examples/                         # Working examples by complexity
│   ├── basic/
│   │   ├── users-table.md            # Single table, simple constraints
│   │   └── products-table.md         # CHECK price >= 0
│   ├── intermediate/
│   │   ├── ecommerce-schema.md       # Multi-table FK relationships
│   │   └── blog-platform.md          # Realistic distributions
│   └── advanced/
│       ├── self-referencing-hierarchies.md  # Employee.managerId
│       ├── circular-dependencies.md         # Department ↔ Employee
│       └── multi-tenant-system.md           # Complex isolation
│
├── templates/                        # Output format specifications
│   ├── validation-report.md          # Validation report structure
│   ├── sql-insert-format.md          # SQL syntax, escaping rules
│   ├── json-export-format.md         # JSON array structure
│   └── csv-export-format.md          # CSV quoting/escaping rules
│
└── guidelines/                       # Quality standards
    ├── constitution-alignment.md     # 5 core principles
    ├── troubleshooting.md            # Common issues & solutions
    └── common-pitfalls.md            # Anti-patterns to avoid
```

## How It Works

### 1. Schema Analysis (Workflow 1)

Claude parses your SQL DDL to extract:
- Primary keys (PK)
- Foreign keys (FK) with cascade semantics
- Unique constraints
- NOT NULL constraints
- CHECK constraints (range checks, enums)
- Data types with precision/scale/length

### 2. Dependency Graphing (Workflow 2)

Claude builds a dependency graph from foreign keys and performs topological sort to determine generation order:

```text
users (no dependencies) → orders (depends on users) → order_items (depends on orders + products)
```

This ensures parent entities are generated before children, maintaining referential integrity.

### 3. Data Generation (Workflow 3)

Claude generates data table-by-table in topological order:

- **Primary Keys**: Sequential (1, 2, 3...) or UUIDs
- **Foreign Keys**: Select from parent PK pool (random or distribution-based)
- **Unique Values**: Track used values to prevent duplicates
- **NOT NULL**: Always generate values (no skip logic)
- **CHECK Constraints**: Parse conditions and satisfy them
- **Edge Cases**: Inject boundary values at configurable percentage (default 5%)

**Realistic Patterns**:
- Names from US distributions (Martinez, Wilson, Garcia, Nguyen, Taylor)
- Emails with realistic domains (gmail, yahoo, outlook, icloud)
- Phone numbers in (XXX) XXX-XXXX format
- Addresses with US state codes and ZIP codes
- Temporal patterns (more orders on weekdays)
- Statistical distributions (Zipf for popularity, Normal for measurements)

### 4. Validation (Workflow 4)

Before delivery, Claude validates:
- ✅ All primary keys unique
- ✅ All foreign keys resolve to existing parents
- ✅ All unique constraints satisfied
- ✅ All NOT NULL fields populated
- ✅ All CHECK constraints satisfied
- ✅ All data types match schema precision/scale/length
- ✅ Edge case coverage meets target percentage
- ✅ Referential integrity 100% (no orphans)

**Data that fails validation is never delivered.**

### 5. Export Formats (Workflow 5)

Claude exports the validated dataset to multiple formats:

**SQL INSERT**:
```sql
INSERT INTO users (id, name, email, age) VALUES
  (1, 'Sarah Chen', 'sarah.chen@example.com', 34),
  (2, 'James Wilson', 'james.wilson@example.com', 28);
```

**JSON**:
```json
{
  "metadata": {"seed": 42, "record_count": 2},
  "users": [
    {"id": 1, "name": "Sarah Chen", "email": "sarah.chen@example.com", "age": 34},
    {"id": 2, "name": "James Wilson", "email": "james.wilson@example.com", "age": 28}
  ]
}
```

**CSV** (one file per table):
```csv
id,name,email,age
1,Sarah Chen,sarah.chen@example.com,34
2,James Wilson,james.wilson@example.com,28
```

All formats contain **identical data** (single generation pass → multiple serializations).

## Extending the Skill

### Adding Custom Examples

To add a new example:

1. Create a file in the appropriate complexity level:
   - `examples/basic/` - Single table, simple constraints
   - `examples/intermediate/` - Multiple tables, FK relationships
   - `examples/advanced/` - Complex scenarios (circular FKs, self-referencing, multi-tenant)

2. Follow the template structure:
   ```markdown
   # Example: [Name] ([Complexity])

   **Demonstrates**: [List key features]
   **User Stories**: [US1, US2, etc.]

   ## Input Schema
   [SQL DDL]

   ## Generated Data
   [SQL/JSON/CSV output]

   ## Validation Report
   [Constraint satisfaction checks]

   ## Patterns Demonstrated
   [Table of patterns used]

   ## Related
   [Links to workflows, patterns, templates]
   ```

3. Reference your example in:
   - `SKILL.md` (Examples by Complexity section)
   - Relevant pattern files (as a usage example)
   - Relevant workflow files (as a demonstration)

### Adding Custom Patterns

To add a new reusable pattern:

1. Create `patterns/[pattern-name].md`

2. Document:
   - **Purpose**: What problem this pattern solves
   - **When to Use**: Scenarios where this pattern applies
   - **Implementation**: Step-by-step with code examples
   - **Examples**: Reference specific examples that use this pattern
   - **Related**: Links to workflows, other patterns, guidelines

3. Reference the pattern in:
   - `SKILL.md` (Pattern Catalog section)
   - Relevant workflow files (where the pattern is applied)
   - Relevant examples (that demonstrate the pattern)

### Adding Custom Workflows

To add a new workflow:

1. Create `workflows/[NN]-[workflow-name].md` (sequential numbering)

2. Structure:
   ```markdown
   # Workflow N: [Name]

   **Purpose**: [One-sentence description]
   **Input**: [What this workflow receives]
   **Output**: [What this workflow produces]

   ## Step 1: [First Step]
   [Detailed instructions with code examples]

   ## Step 2: [Second Step]
   [Detailed instructions with code examples]

   ## Related
   - **Previous Workflow**: [Link to previous]
   - **Next Workflow**: [Link to next]
   - **Patterns**: [Links to patterns used]
   - **Examples**: [Links to examples demonstrating this workflow]
   ```

3. Reference the workflow in:
   - `SKILL.md` (Core Workflows section)
   - Adjacent workflows (previous/next links)
   - Relevant patterns and examples

## Constitutional Principles

All generated data must satisfy these non-negotiable principles:

### I. Database Constraint Compliance (MANDATORY)
- All constraints satisfied
- Zero violations allowed
- Constraint-first: If edge case violates constraint, skip the edge case

### II. Production-Like Data Patterns
- Realistic names from US distributions
- Valid addresses with US state codes and ZIP codes
- Realistic emails with common domains
- Temporal patterns (weekday bias for orders)
- Statistical distributions (Zipf for popularity, Normal for measurements)

### III. Referential Integrity Maintenance
- All foreign keys resolve to existing parents
- No orphan records
- Topological generation order (parents before children)
- Cascade semantics respected (ON DELETE CASCADE, ON DELETE RESTRICT)

### IV. Edge Case Coverage
- Boundary values included (min/max age, max length strings, epoch timestamps)
- Special characters tested (O'Brien, test+tag@example.com)
- NULL values for nullable fields
- Configurable percentage (default 5%)
- Constraint-first principle applies

### V. Validation Before Delivery (MANDATORY)
- Pre-delivery validation report required
- 100% constraint satisfaction confirmed
- Referential integrity audit passed
- Edge case coverage verified
- Data that fails validation is never delivered

## Troubleshooting

### Schema Parsing Errors

**Problem**: "Invalid DDL syntax" or "Unsupported database feature"

**Solution**:
- Provide standard SQL DDL (PostgreSQL or MySQL dialect)
- Avoid database-specific extensions (unless documented in patterns)
- See [Troubleshooting Guide](guidelines/troubleshooting.md)

### Constraint Conflicts

**Problem**: "Unable to satisfy CHECK constraint after N attempts"

**Solution**:
- Check for impossible constraints (e.g., `age > 100 AND age < 18`)
- Verify CHECK constraints are satisfiable
- See [Constraint Handling Pattern](patterns/constraint-handling.md)

### Generation Failures

**Problem**: "Unable to generate unique value after N attempts"

**Solution**:
- Increase record volume (more room for unique values)
- Check if requested volume exceeds unique value space
- Example: Generating 1,000 emails with 50-char limit → plenty of space
- Example: Generating 1M records with 3-char unique field → not enough space

### Validation Failures

**Problem**: "Post-generation constraint violation detected"

**Solution**:
- This should never happen (indicates a bug in the skill)
- Report the issue with schema and seed for reproducibility
- See [Constitution Alignment](guidelines/constitution-alignment.md)

## Testing the Skill

To verify the skill works correctly:

1. **Basic Test** (single table):
   ```sql
   CREATE TABLE test_users (
       id SERIAL PRIMARY KEY,
       email VARCHAR(255) UNIQUE NOT NULL
   );
   ```
   Request: "Generate 10 users"

   ✅ Expect: 10 users, all emails unique, validation report

2. **Intermediate Test** (multi-table):
   ```sql
   CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));
   CREATE TABLE orders (
       id INT PRIMARY KEY,
       user_id INT REFERENCES users(id)
   );
   ```
   Request: "Generate 5 users and 10 orders"

   ✅ Expect: 5 users, 10 orders, all orders.user_id in [1..5]

3. **Advanced Test** (edge cases):
   Request: "Generate users with 10% edge case coverage"

   ✅ Expect: 10% of records have boundary values (age=18, max length name, etc.)

## Contributing

To improve this skill:

1. **Add More Examples**: Cover new schema patterns (geospatial data, JSON columns, arrays)
2. **Add More Patterns**: Document new generation strategies (time-series data, hierarchical data)
3. **Add More Locales**: Extend beyond US English (UK, EU, Asia-Pacific formats)
4. **Improve Validation**: Add more validation checks, statistical tests
5. **Performance**: Optimize for large datasets (streaming, batching)

## License

Open for use with Claude Code.

## Support

- **Documentation**: Start with [SKILL.md](SKILL.md)
- **Examples**: Browse [examples/](examples/) directory
- **Troubleshooting**: See [guidelines/troubleshooting.md](guidelines/troubleshooting.md)
- **Common Issues**: Check [guidelines/common-pitfalls.md](guidelines/common-pitfalls.md)

---

**Last Updated**: 2026-01-04
